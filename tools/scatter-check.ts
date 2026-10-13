import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import type { Room } from '@colyseus/sdk';
import { SCATTER_MAX_INTERVAL_TICKS, SCATTER_MIN_INTERVAL_TICKS, SCATTER_SPAWN_SPOTS } from '@boot-loop/shared';
import type { MatchSnapshot } from '@boot-loop/shared';
const client = new Client(process.env.BOOT_LOOP_URL ?? 'http://localhost:3000');
const states = new Map<string, MatchSnapshot>(), rooms: Room[] = [];
async function attach(room: Room) {
  rooms.push(room); room.onMessage('snapshot', (s: MatchSnapshot) => states.set(room.sessionId, s));
  room.onMessage('notice', () => {}); room.send('snapshot'); return room;
}
async function until(predicate: () => boolean, label: string, timeout = 6000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeout) throw new Error(`Timed out: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
try {
  const host = await attach(await client.create('party'));
  await attach(await client.joinById(host.roomId));
  await until(() => states.get(host.sessionId)?.players.length === 2, 'lobby');
  host.send('duration', 120); host.send('start');
  await until(() => rooms.every(r => states.get(r.sessionId)?.phase === 'running'), 'running');
  const initial = states.get(host.sessionId)!;
  const startTick = initial.phaseEnds - initial.duration * 60;
  assert.ok(initial.scatter.nextSpawnTick - startTick >= SCATTER_MIN_INTERVAL_TICKS);
  assert.ok(initial.scatter.nextSpawnTick - startTick <= SCATTER_MAX_INTERVAL_TICKS);
  assert.ok(rooms.every(r => states.get(r.sessionId)?.scatter.nextSpawnTick === initial.scatter.nextSpawnTick));
  assert.ok(rooms.every(r => states.get(r.sessionId)?.scatter.pickup === null));
  await until(() => rooms.every(r => Boolean(states.get(r.sessionId)?.scatter.pickup)), 'random pickup on both clients', 48000);
  const pickup = states.get(host.sessionId)!.scatter.pickup!;
  assert.ok(SCATTER_SPAWN_SPOTS.some(p => p.x === pickup.x && p.y === pickup.y));
  for (const room of rooms) {
    const s = states.get(room.sessionId)!;
    assert.deepEqual(s.scatter.pickup, pickup);
    assert.ok(s.tick >= initial.scatter.nextSpawnTick);
  }
  const expiry = states.get(host.sessionId)!.scatter.pickupExpiresAt;
  assert.ok(rooms.every(r => states.get(r.sessionId)?.scatter.pickupExpiresAt === expiry));
  console.log('PASS: both clients share the server-selected 30–45 second delay and random pickup position.');
  await until(() => rooms.every(r => states.get(r.sessionId)?.scatter.pickup === null), 'shared ten-second pickup expiry', 13000);
  for (const room of rooms) {
    const s = states.get(room.sessionId)!;
    assert.ok(s.tick >= expiry); assert.equal(s.scatter.activeUntil, 0);
    assert.equal(s.scatter.pickupExpiresAt, 0);
    assert.ok(s.scatter.nextSpawnTick - expiry >= SCATTER_MIN_INTERVAL_TICKS);
    assert.ok(s.scatter.nextSpawnTick - expiry <= SCATTER_MAX_INTERVAL_TICKS);
  }
  console.log('PASS: uncollected pickup expires on both clients after ten seconds, then starts a new 30–45 second wait.');
} finally { await Promise.all(rooms.map(r => r.leave())); }
