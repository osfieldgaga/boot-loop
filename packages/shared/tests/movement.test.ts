import { describe, expect, it } from 'vitest';
import { approach, createPlayer, DEFAULT_CONSTANTS, FIXED_DT, interpolateWrapped, isSolid, loadMap, NEUTRAL_INPUT, overlapsSolid, roundMovement, seamOffsets, step, TOYBOX_ARENA, wrap, wrapDx, wrapDy } from '../src';
import type { PlayerInput, PlayerState, WorldMap } from '../src';

function world(platforms: [number, number, number][] = []): WorldMap {
  const rows = Array.from({ length: 24 }, () => Array<string>(40).fill('.'));
  for (const [x, y, length] of platforms) for (let i = x; i < x + length; i++) rows[y]![i] = '#';
  return { id: 'test', rows: rows.map((row) => row.join('')), width: 40, height: 24, spawns: [] };
}
const floor = world([[2, 15, 36]]);
const right: PlayerInput = { x: 1, jumpHeld: false, jumpPressed: false };
function run(initial: PlayerState, map: WorldMap, frames: number, input: PlayerInput = NEUTRAL_INPUT): PlayerState {
  let player = initial; for (let i = 0; i < frames; i++) player = step(player, input, map); return player;
}
describe('wrapped math', () => {
  it('wraps negative and multi-world positions', () => { expect(wrap(-1, 320)).toBe(319); expect(wrap(641, 320)).toBe(1); });
  it('uses shortest signed distance in both directions', () => { expect(wrapDx(319, 1)).toBe(2); expect(wrapDx(1, 319)).toBe(-2); expect(wrapDy(191, 1)).toBe(2); expect(wrapDy(1, 191)).toBe(-2); });
  it('makes half-world ties deterministic', () => { expect(wrapDx(0, 160)).toBe(-160); });
  it('interpolates through the seam rather than through the arena', () => { expect(interpolateWrapped(319, 1, 0.5, 320)).toBe(0); });
  it('draws four copies at the corner only when needed', () => { expect(seamOffsets(317, 190, 8, 11)).toHaveLength(4); expect(seamOffsets(20, 20, 8, 11)).toHaveLength(1); });
  it('looks up wrapped tiles', () => { expect(isSolid(floor, 42, 39)).toBe(true); });
});
describe('movement', () => {
  it('approaches without overshooting', () => { expect(approach(0, 10, 20)).toBe(10); expect(approach(20, 10, 2)).toBe(18); });
  it('rounds left and right symmetrically', () => { expect(roundMovement(0.5)).toBe(1); expect(roundMovement(-0.5)).toBe(-1); });
  it('does not mutate state, input or world', () => {
    const initial = Object.freeze(createPlayer({ x: 30, y: 109 })); const input = Object.freeze({ ...right });
    const result = step(initial, input, floor); expect(result).not.toBe(initial); expect(initial.tick).toBe(0); expect(result.tick).toBe(1);
  });
  it('accelerates to maximum speed and decelerates to rest', () => { const moving = run(createPlayer({ x: 30, y: 109 }), floor, 20, right); expect(moving.vx).toBe(90); expect(run(moving, floor, 10).vx).toBe(0); });
  it('is symmetric in an empty arena', () => { const initial = createPlayer({ x: 160, y: 20 }); const a = run(initial, world(), 20, right); const b = run(initial, world(), 20, { ...right, x: -1 }); expect(a.x - 160).toBe(160 - b.x); });
  it('lands without entering platforms', () => { const landed = run(createPlayer({ x: 30, y: 60 }), floor, 40); expect(landed.y).toBe(109); expect(landed.grounded).toBe(true); expect(overlapsSolid(floor, landed.x, landed.y)).toBe(false); });
  it('cannot tunnel through a wall at high speed', () => { const map = world([[15, 10, 1], [15, 11, 1]]); const player = step({ ...createPlayer({ x: 90, y: 80 }), vx: 3000 }, right, map); expect(player.x).toBe(112); expect(player.vx).toBe(0); });
  it('cannot tunnel downward through a platform', () => { const player = step({ ...createPlayer({ x: 30, y: 90 }), vy: 3000 }, NEUTRAL_INPUT, floor, FIXED_DT, { ...DEFAULT_CONSTANTS, MAX_FALL: 3000 }); expect(player.y).toBe(109); expect(player.grounded).toBe(true); });
  it('stops upward at a flat ceiling', () => { const map = world([[2, 5, 36]]); const player = step({ ...createPlayer({ x: 80, y: 48 }), vy: -200 }, NEUTRAL_INPUT, map); expect(player.y).toBe(48); expect(player.vy).toBe(0); });
  it('wraps position and preserves horizontal velocity', () => { const player = step({ ...createPlayer({ x: 319, y: 50 }), vx: 90 }, right, world()); expect(player.x).toBe(1); expect(player.vx).toBe(90); });
  it('wraps falling through the bottom without a death', () => { const player = step({ ...createPlayer({ x: 20, y: 191 }), vy: 160 }, NEUTRAL_INPUT, world()); expect(player.y).toBe(2); expect(player.vy).toBe(160); });
  it('caps falling speed', () => { expect(run(createPlayer({ x: 20, y: 20 }), world(), 180).vy).toBe(160); });
  it('rejects a variable timestep', () => { expect(() => step(createPlayer({ x: 0, y: 0 }), right, world(), 0.1)).toThrow('fixed'); });
  it('produces exactly repeatable scripted results', () => {
    function script() { let p = createPlayer({ x: 30, y: 109 }); for (let t = 0; t < 500; t++) p = step(p, { x: t % 90 < 45 ? 1 : -1, jumpPressed: t % 70 === 0, jumpHeld: t % 70 < 10 }, TOYBOX_ARENA); return p; }
    expect(script()).toEqual(script());
  });
});
describe('jump forgiveness', () => {
  const jumpInput: PlayerInput = { x: 0, jumpHeld: true, jumpPressed: true };
  it('starts from the ground and adds horizontal boost', () => { const p = step(createPlayer({ x: 30, y: 109 }), { ...jumpInput, x: 1 }, floor); expect(p.vy).toBe(-105); expect(p.vx).toBeCloseTo(1000 / 60 + 40); expect(p.grounded).toBe(false); });
  it('gives a held jump greater height than a tap', () => {
    const start = step(createPlayer({ x: 30, y: 109 }), jumpInput, floor);
    const held = run(start, floor, 10, { ...jumpInput, jumpPressed: false }); const tap = run(start, floor, 10);
    expect(held.y).toBeLessThan(tap.y - 10);
  });
  it('allows coyote jumps then expires forgiveness', () => {
    const initial = { ...createPlayer({ x: 30, y: 50 }), coyoteTimer: 0.1 };
    expect(step(run(initial, world(), 3), jumpInput, world()).vy).toBe(-105);
    expect(step(run(initial, world(), 8), jumpInput, world()).vy).toBeGreaterThan(0);
  });
  it('buffers a press until landing', () => {
    const p = step({ ...createPlayer({ x: 30, y: 107 }), vy: 160 }, jumpInput, floor);
    expect(p.y).toBe(109); expect(p.vy).toBe(-105); expect(p.grounded).toBe(false); expect(p.jumpBufferTimer).toBe(0);
  });
  it('does not repeat jumps when the key is merely held', () => {
    let p = step(createPlayer({ x: 30, y: 109 }), jumpInput, floor);
    p = run(p, floor, 150, { ...jumpInput, jumpPressed: false });
    expect(p.grounded).toBe(true); expect(p.vy).toBe(0);
  });
  it('corrects a small ceiling corner without stopping ascent', () => {
    const map = world([[10, 5, 1]]);
    const p = step({ ...createPlayer({ x: 76, y: 48 }), vy: -105 }, NEUTRAL_INPUT, map);
    expect(p.x).toBe(72); expect(p.vy).toBeLessThan(0); expect(overlapsSolid(map, p.x, p.y)).toBe(false);
  });
  it('does not treat a full tile as a two-pixel step', () => {
    const map = world([[2, 15, 8], [10, 14, 4]]);
    const p = step({ ...createPlayer({ x: 72, y: 109 }), vx: 90 }, right, map);
    expect(p.x).toBe(72); expect(p.vx).toBe(0);
    expect(overlapsSolid(map, p.x, p.y)).toBe(false);
  });
  it('still jumps from the ground with forgiveness disabled', () => {
    const p = step(createPlayer({ x: 30, y: 109 }), jumpInput, floor, FIXED_DT, { ...DEFAULT_CONSTANTS, COYOTE_TIME: 0, JUMP_BUFFER: 0 });
    expect(p.vy).toBe(-105); expect(p.grounded).toBe(false);
  });
  it('preserves a quick tap that presses and releases between ticks', () => {
    const p = step(createPlayer({ x: 30, y: 109 }), { ...jumpInput, jumpHeld: false }, floor);
    expect(p.vy).toBe(-105); expect(p.y).toBeLessThan(109);
  });
});
describe('arena validation', () => {
  it('loads four safe grounded spawns', () => { expect(TOYBOX_ARENA.spawns).toHaveLength(4); for (const s of TOYBOX_ARENA.spawns) expect(overlapsSolid(TOYBOX_ARENA, s.x, s.y)).toBe(false); });
  it('rejects dimensions and nonempty seams', () => {
    expect(() => loadMap('bad', ['.'])).toThrow('40');
    const rows = [...TOYBOX_ARENA.rows]; rows[0] = '#' + '.'.repeat(39); expect(() => loadMap('bad', rows)).toThrow('borders');
  });
  it('rejects missing or overlapping spawns', () => {
    expect(() => loadMap('bad', TOYBOX_ARENA.rows.map((row) => row.replaceAll('S', '.')))).toThrow('spawns');
  });
});
