import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import type { Room } from '@colyseus/sdk';
import type { MatchSnapshot } from '../packages/shared/src';
const endpoint = process.env.BOOT_LOOP_URL ?? 'http://localhost:3000';
async function run(count: number, mode: 'timed' | 'stock', arenaId: string) {
  const client = new Client(endpoint), rooms: Room[] = [], snapshots = new Map<string, MatchSnapshot>();
  const closed = new Map<string, number>();
  let timer: ReturnType<typeof setInterval> | undefined;
  async function until(check: () => boolean, timeout = 6000) {
    const start = Date.now(); while (!check()) { if (closed.size) throw new Error(`${arenaId} test connection closed: ${JSON.stringify([...closed.values()])}`); if (Date.now() - start > timeout) throw new Error(`${arenaId} ${count}-player timeout: ${JSON.stringify(rooms.map(r => ({ open: r.connection.isOpen, phase: snapshots.get(r.sessionId)?.phase, tick: snapshots.get(r.sessionId)?.tick, phaseEnds: snapshots.get(r.sessionId)?.phaseEnds, mode: snapshots.get(r.sessionId)?.mode, duration: snapshots.get(r.sessionId)?.duration, stocks: snapshots.get(r.sessionId)?.players.map(p => p.stocks) })))}`); await new Promise(r => setTimeout(r, 20)); }
  }
  async function attach(room: Room) {
    rooms.push(room); room.onLeave(code => closed.set(room.sessionId, code)); room.onMessage('snapshot', (s: MatchSnapshot) => snapshots.set(room.sessionId, s)); room.onMessage('notice', () => {}); room.send('snapshot');
    await until(() => snapshots.has(room.sessionId)); return room;
  }
  try {
    const host = await attach(await client.create('party'));
    for (let i = 1; i < count; i++) await attach(await client.joinById(host.roomId));
    await until(() => snapshots.get(host.sessionId)?.players.length === count);
    assert.equal(new Set(snapshots.get(host.sessionId)!.players.map(p => p.slot)).size, count);
    if (count === 4) await assert.rejects(client.joinById(host.roomId));
    host.send('arena', arenaId);
    await until(() => rooms.every(r => snapshots.get(r.sessionId)?.arenaId === arenaId));
    rooms[1]!.send('arena', 'toybox-01');
    await new Promise(r => setTimeout(r, 100));
    assert.ok(rooms.every(r => snapshots.get(r.sessionId)?.arenaId === arenaId), 'non-host changed arena');
    host.send('duration', 30); host.send('mode', mode); host.send('stocks', 1); host.send('start');
    await until(() => snapshots.get(host.sessionId)?.phase === 'countdown');
    host.send('arena', 'toybox-01');
    await new Promise(r => setTimeout(r, 100));
    assert.equal(snapshots.get(host.sessionId)!.arenaId, arenaId, 'arena changed during countdown');
    const seq = rooms.map(() => 0); let tick = 0;
    timer = setInterval(() => { tick++; rooms.forEach((room, i) => {
      if (snapshots.get(room.sessionId)?.phase !== 'running') return;
      room.send('input', { seq: ++seq[i]!, input: { x: (tick % 120 < 60 ? 1 : -1) * (i % 2 ? -1 : 1), jumpHeld: tick % 40 < 8, jumpPressed: tick % 15 === 0 } });
    }); }, 1000 / 60);
    await until(() => rooms.every(r => snapshots.get(r.sessionId)?.phase === 'results'), 40000);
    const final = snapshots.get(host.sessionId)!.result;
    for (const room of rooms) { assert.deepEqual(snapshots.get(room.sessionId)!.result, final); assert.ok(snapshots.get(room.sessionId)!.players.every(p => p.stocks >= 0 && p.state.ammo >= 0)); }
    assert.equal(final!.standings.length, count);
    const nextArena = arenaId === 'crossfire' ? 'switchback' : 'crossfire';
    host.send('arena', nextArena);
    await until(() => rooms.every(r => snapshots.get(r.sessionId)?.arenaId === nextArena));
    assert.deepEqual(snapshots.get(host.sessionId)!.result, final, 'selection changed finished result');
    host.send('start'); await until(() => snapshots.get(host.sessionId)?.phase === 'countdown');
    assert.ok(snapshots.get(host.sessionId)!.players.every(p => p.kills === 0 && p.deaths === 0));
    console.log(`PASS: ${arenaId} ${count}-client ${mode} match, unique slots, shared final standings and rematch. ${JSON.stringify(final)}`);
  } finally { if (timer) clearInterval(timer); await Promise.allSettled(rooms.filter(r => r.connection.isOpen).map(r => r.leave())); }
}
const only = process.env.BOOT_LOOP_ARENA;
await Promise.all([...(only === 'switchback' ? [] : [run(4, 'timed', 'crossfire')]), ...(only === 'crossfire' ? [] : [run(4, 'stock', 'switchback')])]);
