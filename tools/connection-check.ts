import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import { createPlayer, step, TOYBOX_ARENA } from '@boot-loop/shared';
import type { PlayerState } from '@boot-loop/shared';

const endpoint = process.env.BOOT_LOOP_URL ?? 'http://localhost:3000';
const response = await fetch(endpoint + '/health', { signal: AbortSignal.timeout(10000) });
assert.equal(response.status, 200);
const health = await response.json() as { status: string; reference: PlayerState };
assert.equal(health.status, 'ok');
let reference = createPlayer(TOYBOX_ARENA.spawns[0]!);
for (let i = 0; i < 60; i++) reference = step(reference, { x: 1, jumpHeld: i < 12, jumpPressed: i === 0 }, TOYBOX_ARENA);
assert.deepEqual(health.reference, reference);
const client = new Client(endpoint);
const room = await client.create('movement_lab');
try {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('No reply from the room')), 10000);
    room.onMessage('pong', (message: { sentAt: number; tick: number; reference: PlayerState }) => {
      try {
        assert.equal(message.sentAt, 1234); assert.ok(message.tick >= 0); assert.deepEqual(message.reference, reference);
        clearTimeout(timeout); resolve();
      } catch (error) { clearTimeout(timeout); reject(error); }
    });
    room.send('ping', 1234);
  });
  console.log('PASS: HTTP health, Colyseus room join, WebSocket round trip and shared simulation agreement.');
} finally { await room.leave(); }
