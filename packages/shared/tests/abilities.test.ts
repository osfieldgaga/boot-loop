import { describe, expect, it } from 'vitest';
import { canStomp, createAbilityState, DEFAULT_ABILITIES, DEFAULT_CONSTANTS, FIXED_DT, NEUTRAL_INPUT, overlapsSolid, refillResources, stepAbilities } from '../src';
import type { AbilityState, PlayerInput, WorldMap } from '../src';
const empty: WorldMap = { id: 'empty', rows: Array(24).fill('.'.repeat(40)), width: 40, height: 24, spawns: [] };
const floor: WorldMap = { ...empty, rows: empty.rows.map((row, i) => i === 15 ? '#'.repeat(40) : row) };
const action: PlayerInput = { x: 0, jumpHeld: false, jumpPressed: true };
function advance(state: AbilityState, ticks: number, world = empty) {
  for (let i = 0; i < ticks; i++) state = stepAbilities(state, NEUTRAL_INPUT, world); return state;
}
describe('horizontal dash', () => {
  it('uses only horizontal motion, clears jump hold and prevents shooting/stomping', () => {
    const before = createAbilityState({ x: 100, y: 50 }); before.player.vy = 100; before.player.variableJumpTimer = 0.2;
    const after = stepAbilities(before, { ...action, jumpHeld: true, dashDirection: -1 }, empty);
    expect(after.player.x).toBe(93); expect(after.player.y).toBe(50); expect(after.player.vy).toBe(0);
    expect(after.player.variableJumpTimer).toBe(0); expect(after.ammo).toBe(4); expect(after.shots).toBe(0); expect(canStomp(after)).toBe(false);
  });
  it('falls back to facing for a neutral dash request', () => {
    const state = createAbilityState({ x: 100, y: 50 }); state.player.facing = -1;
    expect(stepAbilities(state, { ...NEUTRAL_INPUT, dashDirection: 0 }, empty).player.vx).toBe(-400);
  });
  it('wraps both directions and preserves horizontal motion', () => {
    expect(stepAbilities(createAbilityState({ x: 319, y: 50 }), { ...NEUTRAL_INPUT, dashDirection: 1 }, empty).player.x).toBe(6);
    expect(stepAbilities(createAbilityState({ x: 1, y: 50 }), { ...NEUTRAL_INPUT, dashDirection: -1 }, empty).player.x).toBe(314);
  });
  it('covers 100 pixels in fifteen fixed ticks and keeps deliberate exit speed', () => {
    const state = stepAbilities(createAbilityState({ x: 100, y: 50 }), { ...NEUTRAL_INPUT, dashDirection: 1 }, empty);
    const end = advance(state, 14); expect(end.dashTimer).toBe(0); expect(end.player.x).toBe(200); expect(end.player.vx).toBe(180);
    expect(advance(end, 1).player.vy).toBeGreaterThan(0);
  });
  it('does not recharge in air or reverse an active dash', () => {
    let state = stepAbilities(createAbilityState({ x: 100, y: 50 }), { ...NEUTRAL_INPUT, dashDirection: 1 }, empty);
    state = stepAbilities(state, { ...NEUTRAL_INPUT, dashDirection: -1 }, empty); expect(state.player.vx).toBe(400);
    state = advance(state, 30); const retried = stepAbilities(state, { ...NEUTRAL_INPUT, dashDirection: -1 }, empty);
    expect(retried.dashThisTick).toBe(false); expect(retried.dashCharge).toBe(false);
  });
  it('stops at a wall without embedding or exit-speed kick', () => {
    const wall: WorldMap = { ...empty, rows: empty.rows.map((row, i) => i === 6 || i === 7 ? row.slice(0, 15) + '#' + row.slice(16) : row) };
    const state = stepAbilities(createAbilityState({ x: 111, y: 48 }), { ...NEUTRAL_INPUT, dashDirection: 1 }, wall);
    expect(state.player.x).toBe(112); expect(state.player.vx).toBe(0); expect(state.dashTimer).toBe(0); expect(overlapsSolid(wall, state.player.x, state.player.y)).toBe(false);
  });
  it('recharges automatically after exactly ten seconds, even without landing', () => {
    const start = stepAbilities(createAbilityState({ x: 100, y: 50 }), { ...NEUTRAL_INPUT, dashDirection: 1 }, empty);
    expect(start.dashCooldown).toBe(10); expect(start.dashCharge).toBe(false);
    const early = stepAbilities(advance(start, 598), { ...NEUTRAL_INPUT, dashDirection: -1 }, empty);
    expect(early.dashCooldown).toBeCloseTo(FIXED_DT); expect(early.dashThisTick).toBe(false);
    const ready = stepAbilities(early, { ...NEUTRAL_INPUT, dashDirection: -1 }, empty);
    expect(ready.dashThisTick).toBe(true); expect(ready.dashCooldown).toBe(10);
  });
  it('keeps the ready announcement in simulation state for 1.5 seconds and clears it on reuse', () => {
    const spent = createAbilityState({ x: 100, y: 50 });
    spent.dashCooldown = FIXED_DT; spent.dashCharge = false;
    const ready = stepAbilities(spent, NEUTRAL_INPUT, empty);
    expect(ready.dashCooldown).toBe(0); expect(ready.dashReadyRemaining).toBe(1.5);
    expect(advance(structuredClone(ready), 89).dashReadyRemaining).toBeGreaterThan(0);
    expect(advance(ready, 90).dashReadyRemaining).toBe(0);
    expect(stepAbilities(ready, { ...NEUTRAL_INPUT, dashDirection: 1 }, empty).dashReadyRemaining).toBe(0);
    expect(createAbilityState({ x: 100, y: 50 }).dashReadyRemaining).toBe(0);
  });
  it('landing or a stomp cannot reset the ten-second wait', () => {
    const spent = createAbilityState({ x: 30, y: 108 });
    spent.player.vy = 160; spent.dashCooldown = 8; spent.dashCharge = false;
    const landed = stepAbilities(spent, NEUTRAL_INPUT, floor);
    expect(landed.player.grounded).toBe(true); expect(landed.dashCharge).toBe(false);
    const stomped = refillResources(landed);
    expect(stomped.dashCooldown).toBe(landed.dashCooldown); expect(stomped.dashCharge).toBe(false);
    expect(stepAbilities(stomped, { ...NEUTRAL_INPUT, dashDirection: 1 }, floor).dashThisTick).toBe(false);
  });
  it('allows an early grounded dash jump, spends charge, and keeps launch bounded', () => {
    let state = stepAbilities(createAbilityState({ x: 100, y: 109 }), { ...NEUTRAL_INPUT, dashDirection: 1 }, floor);
    state = advance(state, 2, floor);
    state = stepAbilities(state, { ...action, jumpHeld: true, x: 1 }, floor);
    expect(state.dashTimer).toBe(0); expect(state.player.vy).toBeLessThan(0);
    expect(state.player.vx).toBeGreaterThan(DEFAULT_CONSTANTS.MAX_RUN);
    expect(state.player.vx).toBeLessThanOrEqual(DEFAULT_CONSTANTS.MAX_RUN + 60);
    expect(state.dashCharge).toBe(false); expect(state.shots).toBe(0);
    expect(stepAbilities(state, { ...NEUTRAL_INPUT, dashDirection: -1 }, empty).dashThisTick).toBe(false);
  });
  it('rejects late grounded dash jumps and all airborne dash jumps', () => {
    let grounded = stepAbilities(createAbilityState({ x: 100, y: 109 }), { ...NEUTRAL_INPUT, dashDirection: 1 }, floor);
    grounded = advance(grounded, 7, floor);
    const late = stepAbilities(grounded, action, floor);
    expect(late.player.vy).toBe(0); expect(late.shots).toBe(0);
    const airborne = stepAbilities(createAbilityState({ x: 100, y: 50 }), { ...NEUTRAL_INPUT, dashDirection: 1 }, empty);
    const denied = stepAbilities(airborne, action, empty);
    expect(denied.dashTimer).toBeGreaterThan(0); expect(denied.player.vy).toBe(0); expect(denied.shots).toBe(0);
  });
  it('honors the feature flag', () => {
    const state = stepAbilities(createAbilityState({ x: 100, y: 50 }), { ...NEUTRAL_INPUT, dashDirection: 1 }, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, false);
    expect(state.dashThisTick).toBe(false); expect(state.dashCharge).toBe(true); expect(state.player.vy).toBeGreaterThan(0);
  });
});
describe('shared jump/fire action and resources', () => {
  it('jumps on the ground and during coyote grace without spending ammo', () => {
    const state = stepAbilities(createAbilityState({ x: 30, y: 109 }), { ...action, jumpHeld: true }, floor);
    expect(state.player.vy).toBe(-105); expect(state.ammo).toBe(4); expect(state.shots).toBe(0);
    const coyote = createAbilityState({ x: 30, y: 70 }); coyote.player.coyoteTimer = 0.1;
    expect(stepAbilities(coyote, action, empty).shots).toBe(0);
  });
  it('accepts airborne shots and never adds recoil to a faster existing rise', () => {
    const falling = createAbilityState({ x: 30, y: 50 }); falling.player.vy = 160;
    const shot = stepAbilities(falling, action, empty); expect(shot.player.vy).toBe(-120); expect(shot.ammo).toBe(3); expect(shot.shots).toBe(1); expect(shot.projectiles).toHaveLength(1);
    const rising = createAbilityState({ x: 30, y: 50 }); rising.player.vy = -200;
    expect(stepAbilities(rising, action, empty).player.vy).toBe(-185);
  });
  it('rejects cooldown and empty-ammo shots without incrementing the shot count', () => {
    const first = stepAbilities(createAbilityState({ x: 30, y: 50 }), action, empty);
    const repeat = stepAbilities(first, action, empty); expect(repeat.ammo).toBe(3); expect(repeat.shots).toBe(1);
    const dry = { ...first, ammo: 0, shotCooldown: 0 };
    expect(stepAbilities(dry, action, empty).shots).toBe(1);
  });
  it('does not autofire or turn an airborne shot into a buffered landing jump', () => {
    const shot = stepAbilities(createAbilityState({ x: 30, y: 50 }), action, empty);
    const held = stepAbilities(advance(shot, 12), { ...action, jumpPressed: false, jumpHeld: true }, empty); expect(held.shots).toBe(1);
    expect(shot.player.jumpBufferTimer).toBe(0);
    const landing = createAbilityState({ x: 30, y: 108 }); landing.player.vy = 160;
    const landed = stepAbilities(landing, action, floor); expect(landed.player.grounded).toBe(true); expect(landed.shots).toBe(0); expect(landed.player.vy).toBe(0);
  });
  it('landing and stomping preserve reload and dash cooldowns', () => {
    const state = createAbilityState({ x: 30, y: 108 }); state.player.vy = 160; state.ammo = 0; state.dashCharge = false; state.dashCooldown = 0.2; state.shotCooldown = 0.16;
    const landed = stepAbilities(state, NEUTRAL_INPUT, floor); expect(landed.ammo).toBe(0); expect(landed.reloadRemaining).toBe(3); expect(landed.dashCharge).toBe(false); expect(landed.dashCooldown).toBeCloseTo(0.2 - FIXED_DT);
    const refilled = refillResources(state); expect(refilled.ammo).toBe(0); expect(refilled.dashCooldown).toBe(0.2); expect(refilled.shotCooldown).toBe(0.16);
    expect(stepAbilities(refilled, { ...NEUTRAL_INPUT, dashDirection: 1 }, floor).dashThisTick).toBe(false);
  });
  it('landing does not top up a partial magazine', () => {
    const grounded = createAbilityState({ x: 30, y: 109 }); grounded.ammo = 1; grounded.dashCharge = false; grounded.dashCooldown = 10;
    const waiting = advance(grounded, 30, floor);
    expect(waiting.ammo).toBe(1); expect(waiting.dashCharge).toBe(false);
    const falling = { ...waiting, player: { ...waiting.player, y: 108, vy: 160 } };
    const landed = stepAbilities(falling, NEUTRAL_INPUT, floor);
    expect(landed.ammo).toBe(1); expect(landed.reloadRemaining).toBe(0); expect(landed.dashCharge).toBe(false);
  });
  it('starts a full three-second reload on the last shot and rejects spam until completion', () => {
    const ready = createAbilityState({ x: 30, y: 50 }); ready.ammo = 1;
    const emptied = stepAbilities(ready, action, empty);
    expect(emptied.ammo).toBe(0); expect(emptied.reloadRemaining).toBe(3);
    let waiting = emptied;
    for (let i = 0; i < 179; i++) waiting = stepAbilities(waiting, action, empty);
    expect(waiting.ammo).toBe(0); expect(waiting.shots).toBe(1);
    expect(waiting.reloadRemaining).toBeCloseTo(FIXED_DT);
    const loaded = stepAbilities(waiting, NEUTRAL_INPUT, empty);
    expect(loaded.ammo).toBe(4); expect(loaded.reloadRemaining).toBe(0);
    const fired = stepAbilities(loaded, action, empty);
    expect(fired.shots).toBe(2); expect(fired.ammo).toBe(3);
  });
  it('keeps reloading while moving or dashing and cannot accelerate it by landing or stomping', () => {
    const state = createAbilityState({ x: 30, y: 108 });
    state.ammo = 0; state.reloadRemaining = 2; state.player.vy = 160;
    const landed = stepAbilities(state, NEUTRAL_INPUT, floor);
    expect(landed.ammo).toBe(0); expect(landed.reloadRemaining).toBeCloseTo(2 - FIXED_DT);
    const stomped = refillResources(landed);
    expect(stomped.reloadRemaining).toBe(landed.reloadRemaining); expect(stomped.ammo).toBe(0);
    const dashed = stepAbilities(stomped, { ...NEUTRAL_INPUT, dashDirection: 1 }, floor);
    expect(dashed.dashThisTick).toBe(true); expect(dashed.reloadRemaining).toBeCloseTo(2 - FIXED_DT * 2);
  });
  it('respawns with a full magazine and no leftover reload', () => {
    const state = createAbilityState({ x: 30, y: 50 });
    expect(state.ammo).toBe(4); expect(state.reloadRemaining).toBe(0);
  });
  it('does not mutate the incoming state or projectile objects', () => {
    const state = stepAbilities(createAbilityState({ x: 30, y: 50 }), action, empty);
    const copy = structuredClone(state); stepAbilities(state, NEUTRAL_INPUT, empty); expect(state).toEqual(copy);
  });
});
describe('boot projectile visuals', () => {
  it('wraps downward and expires after a finite lifetime', () => {
    const state = createAbilityState({ x: 30, y: 50 }); state.projectiles = [{ id: 1, x: 30, y: 191, remaining: 0.5 }];
    const next = stepAbilities(state, NEUTRAL_INPUT, empty); expect(next.projectiles[0]!.y).toBe(4);
    expect(advance(next, 31).projectiles).toHaveLength(0);
  });
  it('does not tunnel through tiles at the maximum tuning speed', () => {
    const state = createAbilityState({ x: 30, y: 50 }); state.projectiles = [{ id: 1, x: 30, y: 119, remaining: 0.5 }];
    expect(stepAbilities(state, NEUTRAL_INPUT, floor, DEFAULT_CONSTANTS, { ...DEFAULT_ABILITIES, BULLET_SPEED: 500 }).projectiles).toHaveLength(0);
  });
});
