import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import { createAbilityState, DEFAULT_ABILITIES, MATCH_MOVEMENT, NEUTRAL_INPUT, stepAbilities, wrapDx } from '../packages/shared/src';
import type { MatchSnapshot, WorldMap } from '../packages/shared/src';
const floor: WorldMap = { id: 'measurement', width: 40, height: 24, spawns: [], rows: Array.from({length:24}, (_,y) => y === 15 ? '#'.repeat(40) : '.'.repeat(40)) };
function flight(combo: boolean) {
  let s = createAbilityState({ x: 50, y: 109 }); s.player.vx = MATCH_MOVEMENT.MAX_RUN;
  if (combo) s = stepAbilities(s, { ...NEUTRAL_INPUT, x: 1, dashDirection: 1 }, floor, MATCH_MOVEMENT);
  const start = s.player.x;
  s = stepAbilities(s, { x: 1, jumpPressed: true, jumpHeld: true }, floor, MATCH_MOVEMENT);
  const launchSpeed = s.player.vx;
  let distance = wrapDx(start, s.player.x), ticks = 1;
  while (!s.player.grounded && ticks < 120) {
    const old = s.player.x; s = stepAbilities(s, { x: 1, jumpPressed: false, jumpHeld: true }, floor, MATCH_MOVEMENT);
    distance += wrapDx(old, s.player.x); ticks++;
  }
  return { distance, launchSpeed, ticks };
}
const ordinary = flight(false), combo = flight(true);
assert.ok(combo.distance > ordinary.distance); assert.ok(combo.launchSpeed <= MATCH_MOVEMENT.MAX_RUN + 60);
console.log('PASS: bounded extra jump reach', JSON.stringify({ ordinary, combo, extraPx: combo.distance - ordinary.distance }));
const client = new Client(process.env.BOOT_LOOP_URL ?? 'http://localhost:3000');
const host = await client.create('party'), guest = await client.joinById(host.roomId);
let latest: MatchSnapshot | undefined;
host.onMessage('snapshot', (s: MatchSnapshot) => latest = s); host.onMessage('notice', () => {}); guest.onMessage('snapshot', () => {}); guest.onMessage('notice', () => {});
const wait = async (condition: () => boolean) => { const start = Date.now(); while (!condition()) { if (Date.now() - start > 8000) throw new Error('Timed out'); await new Promise(r => setTimeout(r, 10)); } };
try {
  host.send('start'); await wait(() => latest?.phase === 'running' && Boolean(latest.players.find(p => p.id === host.sessionId)?.state.player.grounded));
  host.send('input', {seq:1, input:{...NEUTRAL_INPUT,x:1,dashDirection:1}});
  host.send('input', {seq:2, input:{x:1,jumpPressed:true,jumpHeld:true}});
  await wait(() => (latest?.players.find(p => p.id === host.sessionId)?.ack ?? 0) >= 2);
  const me = latest!.players.find(p => p.id === host.sessionId)!;
  assert.equal(me.state.dashTimer, 0); assert.equal(me.state.dashCharge, false); assert.equal(me.shots, 0);
  assert.ok(me.state.player.vy < 0); assert.ok(me.state.player.vx <= MATCH_MOVEMENT.MAX_RUN + 60);
  console.log('PASS: real server accepted dash jump, spent charge, no shot/air jump', {vx:me.state.player.vx,vy:me.state.player.vy,ammo:me.state.ammo});
} finally { await guest.leave(); await host.leave(); }
