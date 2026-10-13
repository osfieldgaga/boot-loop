import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import type { Room } from '@colyseus/sdk';
import type { MatchSnapshot } from '../packages/shared/src';
import { DeathEffectQueue } from '../packages/client/src/death-effects';
const mode = process.env.BOOT_LOOP_MODE === 'stock' ? 'stock' : 'timed';
const startingStocks = mode === 'stock' ? Number(process.env.BOOT_LOOP_STOCKS ?? 3) : 3;
assert.ok([1, 3, 5].includes(startingStocks));
const endpoint = process.env.BOOT_LOOP_URL ?? 'http://localhost:3000';
const client = new Client(endpoint);
const delay = Number(process.env.BOOT_LOOP_DELAY_MS ?? 0);
assert.ok(Number.isFinite(delay) && delay >= 0 && delay <= 300);
const deliveryTimes = [0, 0];
const deliveries: ReturnType<typeof setTimeout>[] = [];
const snapshots = new Map<string, MatchSnapshot>();
const feedback = new Map<string, { queue: DeathEffectQueue; bursts: unknown[] }>();
const deaths = new Map<string, Map<string, unknown>>();
const reloadSeenBy = new Set<string>();
const dashSeenBy = new Set<string>();
const timers: ReturnType<typeof setInterval>[] = [];
const rooms: Room[] = [];
async function attach(room: Room) {
  rooms.push(room); feedback.set(room.sessionId, { queue: new DeathEffectQueue(), bursts: [] }); deaths.set(room.sessionId, new Map()); room.onMessage('snapshot', (s: MatchSnapshot) => {
    const apply = () => {
      if (s.tick < (snapshots.get(room.sessionId)?.tick ?? -1)) return;
      snapshots.set(room.sessionId, s);
      for (const player of s.players) if (player.alive && player.state.dashCooldown > 0) {
        assert.ok(player.state.dashCooldown <= 10, 'dash cooldown is bounded to ten seconds');
        assert.equal(player.state.dashCharge, false, 'dash cannot recharge early');
        dashSeenBy.add(room.sessionId);
      }
      for (const player of s.players) if (player.alive && player.state.reloadRemaining > 0) {
        assert.equal(player.state.ammo, 0, 'reload keeps ammo empty');
        assert.ok(player.state.reloadRemaining <= 3, 'reload is bounded to three seconds');
        reloadSeenBy.add(room.sessionId);
      }
      const effects = feedback.get(room.sessionId)!; effects.queue.accept(s); effects.bursts.push(...effects.queue.drain());
      for (const event of s.events) if (event.death) deaths.get(room.sessionId)!.set(`${event.tick}:${event.death.player}`, event.death);
    };
    if (delay) deliveries.push(setTimeout(apply, delay + s.tick % 4 * 10)); else apply();
  });
  room.onMessage('notice', () => {}); room.onMessage('pong', () => {}); room.send('snapshot');
  await until(() => Boolean(snapshots.get(room.sessionId)), 'initial snapshot'); return room;
}
async function until(check: () => boolean, description: string, timeout = 6000) {
  const started = Date.now();
  while (!check()) { if (Date.now() - started > timeout) throw new Error(`Timed out: ${description}; snapshots=${JSON.stringify([...snapshots.values()].map(s => ({ tick: s.tick, phase: s.phase, ends: s.phaseEnds, players: s.players.length })))}`); await new Promise(resolve => setTimeout(resolve, 20)); }
}
try {
  const a = await attach(await client.create('party'));
  const b = await attach(await client.joinById(a.roomId));
  await until(() => snapshots.get(a.sessionId)?.players.length === 2, 'two-player lobby');
  const extra1 = await client.joinById(a.roomId), extra2 = await client.joinById(a.roomId);
  extra1.onMessage('snapshot', () => {}); extra2.onMessage('snapshot', () => {});
  await assert.rejects(client.joinById(a.roomId));
  await extra1.leave(); await extra2.leave();
  await until(() => snapshots.get(a.sessionId)?.players.length === 2, 'back to two players');
  b.send('mode', 'stock'); b.send('stocks', 1); b.send('bullet-padding', 0); b.send('duration', 60); b.send('start');
  await new Promise(resolve => setTimeout(resolve, 100)); assert.equal(snapshots.get(a.sessionId)!.phase, 'lobby'); assert.equal(snapshots.get(a.sessionId)!.duration, 120);
  assert.equal(snapshots.get(a.sessionId)!.bulletHitPaddingPx, 8);
  assert.equal(snapshots.get(a.sessionId)!.mode, 'timed'); assert.equal(snapshots.get(a.sessionId)!.startingStocks, 3);
  a.send('mode', mode); a.send('stocks', startingStocks);
  a.send('bullet-padding', 5);
  await until(() => [a, b].every(room => snapshots.get(room.sessionId)?.bulletHitPaddingPx === 5), 'shared bullet tolerance');
  a.send('duration', 30); a.send('start');
  await until(() => snapshots.get(a.sessionId)?.phase === 'countdown', 'countdown');
  a.send('mode', mode === 'stock' ? 'timed' : 'stock'); a.send('stocks', 5); a.send('bullet-padding', 0);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok([a, b].every(room => snapshots.get(room.sessionId)?.bulletHitPaddingPx === 5));
  assert.equal(snapshots.get(a.sessionId)!.mode, mode); assert.equal(snapshots.get(a.sessionId)!.startingStocks, startingStocks);
  console.log('PASS: shared host-only bullet tolerance, locked during match.');
  console.log('PASS: create/join, four-player capacity, host-only settings/start, countdown.');
  let step = 0; const sequences = [0, 0];
  timers.push(setInterval(() => {
    step++;
    for (const [i, room] of [a, b].entries()) {
      if (snapshots.get(room.sessionId)?.phase !== 'running') continue;
      const seq = ++sequences[i]!;
      const input = {
        x: (step % 120 < 60 ? 1 : -1) * (i ? -1 : 1),
        jumpHeld: step % 40 < 8,
        jumpPressed: step % 15 === 0,
        ...(step % 100 === 0 ? { dashDirection: step % 120 < 60 ? 1 : -1 } : {}),
      };
      const send = () => { room.send('input', { seq, input }); if (seq % 100 === 0) room.send('input', { seq, input }); };
      if (delay) {
        deliveryTimes[i] = Math.max(Date.now() + delay + seq % 4 * 10, deliveryTimes[i]! + 1);
        deliveries.push(setTimeout(send, deliveryTimes[i]! - Date.now()));
      } else send(); // Deliberate duplicate: must not become an extra action.
    }
  }, 1000 / 60));
  await until(() => snapshots.get(a.sessionId)?.phase === 'results' && snapshots.get(b.sessionId)?.phase === 'results', 'complete 30-second match', 40000);
  assert.equal(snapshots.get(a.sessionId)!.result!.mode, mode);
  assert.ok([a, b].every(room => reloadSeenBy.has(room.sessionId)), 'both clients receive reload timers');
  console.log('PASS: both clients observe server-owned three-second empty-ammo reloads.');
  assert.ok([a, b].every(room => dashSeenBy.has(room.sessionId)), 'both clients receive dash cooldowns');
  console.log('PASS: both clients observe escape dash cooldowns and unavailable charges.');
  if (mode === 'stock') assert.ok(snapshots.get(a.sessionId)!.players.every(p => p.stocks >= 0 && p.stocks <= startingStocks));
  assert.deepEqual(snapshots.get(a.sessionId)!.result, snapshots.get(b.sessionId)!.result);
  assert.deepEqual([...deaths.get(a.sessionId)!].sort(), [...deaths.get(b.sessionId)!].sort());
  console.log(`PASS: both clients received identical confirmed death events (${deaths.get(a.sessionId)!.size}).`);
  assert.deepEqual(feedback.get(a.sessionId)!.bursts, feedback.get(b.sessionId)!.bursts);
  assert.equal(feedback.get(a.sessionId)!.bursts.length, snapshots.get(a.sessionId)!.players.reduce((sum, p) => sum + p.deaths, 0));
  console.log(`PASS: production client feedback queued every death on both clients (${feedback.get(a.sessionId)!.bursts.length} bursts each).`);
  assert.ok(snapshots.get(a.sessionId)!.players.every(p => p.state.ammo >= 0 && p.state.ammo <= 4 && p.shots >= 0));
  console.log(`Test network delay: ${delay} ms each direction, plus 0–30 ms jitter.`);
  console.log(`PASS: two network clients completed a ${mode} match with identical results and bounded ammo.`);
  console.log(JSON.stringify(snapshots.get(a.sessionId)!.result));
  for (const timer of timers) clearInterval(timer);
  for (const delivery of deliveries) clearTimeout(delivery);
  const finalResult = structuredClone(snapshots.get(b.sessionId)!.result);
  await a.leave();
  await until(() => snapshots.get(b.sessionId)?.host === b.sessionId && snapshots.get(b.sessionId)?.players.length === 1, 'results host transfer');
  assert.equal(snapshots.get(b.sessionId)!.phase, 'results'); assert.deepEqual(snapshots.get(b.sessionId)!.result, finalResult);
  const c = await attach(await client.joinById(b.roomId));
  await until(() => snapshots.get(b.sessionId)?.players.length === 2, 'results replacement join');
  assert.deepEqual(snapshots.get(c.sessionId)!.result, finalResult);
  b.send('start');
  await until(() => snapshots.get(c.sessionId)?.phase === 'countdown', 'replacement rematch');
  const rematch = snapshots.get(c.sessionId)!; assert.equal(rematch.mode, mode); assert.equal(rematch.startingStocks, startingStocks); assert.ok(rematch.players.every(p => p.stocks === startingStocks)); assert.equal(rematch.duration, 30); assert.equal(rematch.bulletHitPaddingPx, 5);
  assert.ok(rematch.players.every(p => p.kills === 0 && p.shots === 0 && p.deaths === 0)); assert.equal(rematch.bullets.length, 0);
  await assert.rejects(client.joinById(b.roomId));
  await b.leave();
  await until(() => snapshots.get(c.sessionId)?.phase === 'lobby' && snapshots.get(c.sessionId)?.host === c.sessionId, 'countdown cancellation/host transfer');
  assert.equal(snapshots.get(c.sessionId)!.result, null);
  assert.ok(snapshots.get(c.sessionId)!.events.some(e => e.text.includes('no winner')));
  const d = await attach(await client.joinById(c.roomId));
  await until(() => snapshots.get(c.sessionId)?.players.length === 2, 'new replacement');
  c.send('start'); await until(() => snapshots.get(d.sessionId)?.phase === 'running', 'replacement running match');
  await assert.rejects(client.joinById(c.roomId));
  await d.leave();
  await until(() => snapshots.get(c.sessionId)?.phase === 'lobby' && snapshots.get(c.sessionId)?.players.length === 1, 'active cancellation');
  assert.equal(snapshots.get(c.sessionId)!.result, null); assert.equal(snapshots.get(c.sessionId)!.host, c.sessionId);
  const expired = c.roomId; await c.leave();
  await new Promise(resolve => setTimeout(resolve, 200));
  await assert.rejects(client.joinById(expired));
  console.log('PASS: empty room cleanup and expired invite rejection.');
  console.log('PASS: finished result preservation, replacement/rematch, countdown/active cancellation and host transfer.');

} finally { for (const timer of timers) clearInterval(timer); for (const delivery of deliveries) clearTimeout(delivery); await Promise.allSettled(rooms.filter(room => room.connection.isOpen).map(room => room.leave())); }
