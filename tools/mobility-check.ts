import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAbilityState, DEFAULT_ABILITIES, FIXED_DT, stepAbilities, TOYBOX_ARENA, wrapDy } from '../packages/shared/src';
import type { MovementConstants, WorldMap } from '../packages/shared/src';
const movement: MovementConstants = JSON.parse(readFileSync(new URL('../tuning/boot-loop-movement-heavy2-snappy-10.05.26.json', import.meta.url), 'utf8')).constants;
const empty: WorldMap = { id: 'mobility-measurement', width: 40, height: 24, spawns: [], rows: Array(24).fill('.'.repeat(40)) };
// Accumulate signed travel before modulo hides it. Each tick is far below half the world height.
for (const held of [false, true]) {
  let state = createAbilityState({ x: 100, y: 100 }); let travel = 0; let peak = 0; let emptyTick = 0;
  for (let tick = 0; tick < 120; tick++) {
    const y = state.player.y;
    const press = state.ammo > 0 && state.shotCooldown <= FIXED_DT + 1e-9;
    state = stepAbilities(state, { x: 0, jumpHeld: held, jumpPressed: press }, empty, movement);
    travel += wrapDy(y, state.player.y); peak = Math.max(peak, -travel);
    if (state.ammo === 0 && !emptyTick) emptyTick = tick + 1;
  }
  assert.equal(state.shots, DEFAULT_ABILITIES.AMMO); assert.equal(state.ammo, 0);
  assert.equal(state.player.vy, movement.MAX_FALL);
  console.log(JSON.stringify({ scenario: `rest; earliest accepted shots; jumpHeld=${held}`, peakRisePx: peak, emptyAtSeconds: emptyTick / 60, shots: state.shots, finalDownwardSpeed: state.player.vy }));
}
// Compare a fully held approved jump with shots near the peak; ground exists only for launch.
const launchWorld: WorldMap = { ...empty, rows: empty.rows.map((row, y) => y === 15 ? '#'.repeat(40) : row) };
for (const shooting of [false, true]) {
  let state = createAbilityState({ x: 100, y: 109 }); let travel = 0; let peak = 0; let returnTick = 0;
  for (let tick = 0; tick < 180; tick++) {
    const y = state.player.y;
    const pressed = tick === 0 || (shooting && state.player.vy >= 0 && state.ammo > 0 && state.shotCooldown <= FIXED_DT + 1e-9);
    state = stepAbilities(state, { x: 0, jumpHeld: true, jumpPressed: pressed }, tick === 0 ? launchWorld : empty, movement);
    travel += wrapDy(y, state.player.y); peak = Math.max(peak, -travel);
    if (tick > 0 && travel >= 0 && !returnTick) returnTick = tick + 1;
  }
  console.log(JSON.stringify({ scenario: shooting ? 'held jump + peak-timed full magazine' : 'held jump without shots', peakRisePx: peak, returnToLaunchHeightSeconds: returnTick / 60, shots: state.shots }));
}
// Search every legal firing/holding decision through two seconds from rest. With four shots,
// coalesce equivalent velocity/resource states and retain their highest unwrapped position.
let frontier = new Map<string, { state: ReturnType<typeof createAbilityState>; travel: number }>();
frontier.set('start', { state: createAbilityState({ x: 100, y: 100 }), travel: 0 }); let maxRise = 0;
for (let tick = 0; tick < 120; tick++) {
  const next = new Map<string, { state: ReturnType<typeof createAbilityState>; travel: number }>();
  for (const { state, travel } of frontier.values()) for (const held of [false, true]) for (const pressed of [false, true]) {
    const after = stepAbilities(state, { x: 0, jumpHeld: held, jumpPressed: pressed }, empty, movement);
    after.projectiles = []; // They do not feed back into the local player's movement.
    const distance = travel + wrapDy(state.player.y, after.player.y); maxRise = Math.max(maxRise, -distance);
    const key = [after.player.vy.toFixed(8), after.player.remainderY.toFixed(8), after.ammo, after.shotCooldown.toFixed(8)].join(':');
    const existing = next.get(key); if (!existing || distance < existing.travel) next.set(key, { state: after, travel: distance });
  }
  frontier = next;
}
console.log(JSON.stringify({ scenario: 'all shoot/hold timings from rest; no dash/refills; 2-second horizon', maxRisePx: maxRise }));
assert.ok(maxRise < 16, 'Default boot alone must not climb two whole tiles from rest.');
let state = createAbilityState(TOYBOX_ARENA.spawns[0]!); let lastAmmo = state.ammo; let refills = 0;
for (let tick = 0; tick < 3600; tick++) {
  state = stepAbilities(state, { x: tick % 120 < 60 ? 1 : -1, jumpHeld: tick % 36 < 9, jumpPressed: tick % 12 === 0, ...(tick % 60 === 0 ? { dashDirection: tick % 120 < 60 ? 1 as const : -1 as const } : {}) }, TOYBOX_ARENA, movement);
  if (state.ammo > lastAmmo) refills++; lastAmmo = state.ammo;
  assert.ok(state.ammo >= 0 && state.ammo <= DEFAULT_ABILITIES.AMMO);
  assert.ok(Number.isFinite(state.player.x) && Number.isFinite(state.player.y));
}
console.log(JSON.stringify({ scenario: '60-second scripted arena run with timed reloads, escape dash and shots', shots: state.shots, refills }));
