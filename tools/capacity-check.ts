import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import type { Room } from '@colyseus/sdk';
import type { MatchSnapshot } from '../packages/shared/src';
const endpoint = process.env.BOOT_LOOP_URL ?? 'http://localhost:3000';
const rooms: Room[] = [], snapshots = new Map<string, MatchSnapshot>();
let timer: ReturnType<typeof setInterval> | undefined;
let bytes = 0, messages = 0;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function until(check: () => boolean) { const start = Date.now(); while (!check()) { assert.ok(Date.now() - start < 10000, 'capacity setup timed out'); await sleep(20); } }
try {
  const client = new Client(endpoint);
  for (let group = 0; group < 10; group++) {
    const host = await client.create('party');
    for (let slot = 0; slot < 4; slot++) {
      const room = slot ? await client.joinById(host.roomId) : host; rooms.push(room);
      room.onMessage('snapshot', (s: MatchSnapshot) => { snapshots.set(room.sessionId, s); bytes += Buffer.byteLength(JSON.stringify(s)); messages++; });
      room.onMessage('notice', () => {}); room.send('snapshot');
    }
    await until(() => snapshots.get(host.sessionId)?.players.length === 4);
    host.send('start');
  }
  await until(() => rooms.every(r => snapshots.get(r.sessionId)?.phase === 'running'));
  const ticks = rooms.map(r => snapshots.get(r.sessionId)!.tick), seq = rooms.map(() => 0);
  bytes = 0; messages = 0; const started = Date.now(); let frame = 0;
  timer = setInterval(() => { frame++; rooms.forEach((r, index) => r.send('input', { seq: ++seq[index]!, input: { x: frame % 120 < 60 ? 1 : -1, jumpHeld: frame % 40 < 8, jumpPressed: frame % 15 === 0 } })); }, 1000 / 60);
  await sleep(12000); clearInterval(timer); timer = undefined;
  const seconds = (Date.now() - started) / 1000;
  const rates = rooms.map((r, i) => (snapshots.get(r.sessionId)!.tick - ticks[i]!) / seconds);
  assert.ok(rooms.every(r => r.connection.isOpen), 'client disconnected under load');
  assert.ok(Math.min(...rates) >= 55, 'server simulation dropped below 55 Hz');
  console.log(JSON.stringify({ rooms: 10, players: 40, seconds, minimumSimulationHz: Math.min(...rates), snapshotsPerSecond: messages / seconds, snapshotJsonMBPerSecond: bytes / seconds / 1e6, limitation: 'local test; serialized JSON size is an estimate, not measured wire bytes or cloud-host capacity' }, null, 2));
} finally { if (timer) clearInterval(timer); await Promise.allSettled(rooms.filter(r => r.connection.isOpen).map(r => r.leave())); }
