import { describe, expect, it } from 'vitest';
import { createAbilityState, DEFAULT_ABILITIES, DEFAULT_CONSTANTS, FIXED_DT, MatchEngine, NEUTRAL_INPUT, scatterActive, ScatterBoots, SCATTER_DURATION_TICKS, SCATTER_PICKUP_LIFETIME_TICKS, SCATTER_MIN_INTERVAL_TICKS, SCATTER_MAX_INTERVAL_TICKS, SCATTER_SPAWN_SPOTS, stepAbilities, TOYBOX_ARENA } from '../src';
import type { WorldMap } from '../src';
const empty: WorldMap = { id: 'scatter', width: 40, height: 24, spawns: [{ x: 30, y: 50 }, { x: 250, y: 50 }], rows: Array(24).fill('.'.repeat(40)) };
const fire = { ...NEUTRAL_INPUT, jumpPressed: true };
describe('shared scatter boots', () => {
  it('warns/spawns on schedule, collects once and expires exactly after eight seconds', () => {
    const boots = new ScatterBoots(() => 0); boots.reset(200);
    boots.advance(200 + SCATTER_MIN_INTERVAL_TICKS - 1); expect(boots.state.pickup).toBeNull();
    boots.advance(200 + SCATTER_MIN_INTERVAL_TICKS); expect(boots.state.pickup).toEqual(SCATTER_SPAWN_SPOTS[0]);
    const tick = 200 + SCATTER_MIN_INTERVAL_TICKS;
    expect(boots.collect([{ id: 'dead', alive: false, ...SCATTER_SPAWN_SPOTS[0] }], tick)).toBeNull();
    expect(boots.collect([{ id: 'blue', alive: true, ...SCATTER_SPAWN_SPOTS[0] }, { id: 'gold', alive: true, ...SCATTER_SPAWN_SPOTS[0] }], tick)).toBe('blue');
    expect(boots.collect([{ id: 'gold', alive: true, ...SCATTER_SPAWN_SPOTS[0] }], tick)).toBeNull();
    expect(scatterActive(boots.state, tick + SCATTER_DURATION_TICKS - 1)).toBe(true);
    boots.advance(tick + SCATTER_DURATION_TICKS); expect(scatterActive(boots.state, tick + SCATTER_DURATION_TICKS)).toBe(false);
    expect(boots.state.pickup).toBeNull();
    boots.advance(tick + SCATTER_MIN_INTERVAL_TICKS); expect(boots.state.pickup).not.toBeNull();
  });
  it('despawns an uncollected pickup after ten seconds, then waits before another spawn', () => {
    const boots = new ScatterBoots(() => 0);
    const spawnTick = boots.state.nextSpawnTick;
    boots.advance(spawnTick); const first = { ...boots.state.pickup! };
    expect(boots.state.pickupExpiresAt).toBe(spawnTick + SCATTER_PICKUP_LIFETIME_TICKS);
    boots.advance(boots.state.pickupExpiresAt - 1); expect(boots.state.pickup).toEqual(first);
    const expiry = boots.state.pickupExpiresAt;
    boots.advance(expiry);
    expect(boots.state.pickup).toBeNull(); expect(boots.state.pickupExpiresAt).toBe(0);
    expect(boots.state.activeUntil).toBe(0); expect(boots.state.collector).toBeNull();
    expect(boots.state.nextSpawnTick).toBe(expiry + SCATTER_MIN_INTERVAL_TICKS);
    boots.advance(boots.state.nextSpawnTick - 1); expect(boots.state.pickup).toBeNull();
    boots.advance(boots.state.nextSpawnTick); expect(boots.state.pickup).not.toEqual(first);
  });
  it('accepts collection just before expiry but rejects it on the expiry tick', () => {
    const boots = new ScatterBoots(() => 0); boots.advance(boots.state.nextSpawnTick);
    const location = { ...boots.state.pickup! }, expiry = boots.state.pickupExpiresAt;
    expect(boots.collect([{ id: 'player', alive: true, ...location }], expiry - 1)).toBe('player');
    expect(boots.state.activeUntil).toBe(expiry - 1 + SCATTER_DURATION_TICKS);
    boots.reset(0); boots.advance(boots.state.nextSpawnTick);
    expect(boots.collect([{ id: 'player', alive: true, ...boots.state.pickup! }], boots.state.pickupExpiresAt)).toBeNull();
    expect(boots.state.pickup).toBeNull(); expect(boots.state.activeUntil).toBe(0);
    boots.reset(0); expect(boots.state.pickupExpiresAt).toBe(0);
  });
  it('creates three distinct pellets for one ammo, one shot statistic and one recoil impulse', () => {
    const state = createAbilityState({ x: 100, y: 50 });
    const normal = stepAbilities(state, fire, empty);
    const scatter = stepAbilities(state, fire, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, true, true, true);
    expect(scatter.ammo).toBe(3); expect(scatter.shots).toBe(1);
    expect(scatter.player).toEqual(normal.player);
    expect(scatter.projectiles.map(p => p.vx)).toEqual([-120, 0, 120]);
    expect(new Set(scatter.projectiles.map(p => p.id)).size).toBe(3);
    const held = stepAbilities(scatter, NEUTRAL_INPUT, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, true, true, true);
    expect(held.shots).toBe(1); expect(held.ammo).toBe(3);
    expect(held.projectiles[0]!.x).toBeLessThan(scatter.projectiles[0]!.x);
    expect(held.projectiles[2]!.x).toBeGreaterThan(scatter.projectiles[2]!.x);
    const last = stepAbilities({ ...state, ammo: 1 }, fire, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, true, true, true);
    expect(last.ammo).toBe(0); expect(last.reloadRemaining).toBe(3);
    expect(stepAbilities(last, fire, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, true, true, true).shots).toBe(1);
    expect(stepAbilities(state, fire, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, true, false, true).projectiles).toHaveLength(0);
  });
  it('switches every player on the server and resets on rematch and cancellation', () => {
    const game = new MatchEngine(empty); game.add('a'); game.add('b'); game.add('c'); game.add('d'); game.start('a');
    game.phase = 'running'; game.phaseEnds = 10000;
    game.scatterBoots.state.pickup = { x: 156, y: 68 };
    game.tick = game.scatterBoots.state.nextSpawnTick - 1;
    game.scatterBoots.state.pickupExpiresAt = game.tick + SCATTER_PICKUP_LIFETIME_TICKS;
    Object.assign(game.players.get('a')!.state.player, { x: 156, y: 68, vy: 0 });
    game.advance(); expect(game.snapshot().scatter.collector).toBe('a');
    for (const p of game.players.values()) { Object.assign(p.state.player, { x: p.slot * 70 + 10, y: 20, vy: 0, coyoteTimer: 0 }); game.submit(p.id, { seq: 1, input: fire }); }
    game.advance();
    expect(game.bullets).toHaveLength(12);
    expect([...game.players.values()].every(p => p.shots === 1 && p.state.ammo === 3)).toBe(true);
    game.phase = 'results'; game.start('a'); expect(game.snapshot().scatter.activeUntil).toBe(0);
    game.phase = 'running'; game.scatterBoots.state.activeUntil = game.tick + 480;
    game.remove('d'); game.remove('c'); game.remove('b'); expect(game.phase).toBe('lobby');
    expect(game.snapshot().scatter.activeUntil).toBe(0);
  });
  it('sweeps diagonal pellets against cover and wrapped player targets', () => {
    const rows = [...empty.rows]; rows[6] = '.'.repeat(5) + '#' + '.'.repeat(34);
    const world = { ...empty, rows };
    const game = new MatchEngine(world); game.add('a'); game.add('b'); game.phase = 'running'; game.phaseEnds = 10000;
    game.bullets = [{ owner: 'a', id: 1, x: 37, y: 47, vx: 120, remaining: 0.5 }];
    game.advance(); expect(game.bullets).toHaveLength(0);
    const seam = new MatchEngine(empty); seam.add('a'); seam.add('b'); seam.phase = 'running'; seam.phaseEnds = 10000;
    Object.assign(seam.players.get('b')!.state.player, { x: 0, y: 48 });
    seam.bullets = [{ owner: 'a', id: 1, x: 319, y: 47, vx: 120, remaining: 0.5 }];
    seam.advance(); expect(seam.players.get('b')!.alive).toBe(false);
    const state = createAbilityState({ x: 30, y: 10 }); state.projectiles = [{ id: 1, x: 319, y: 10, vx: 120, remaining: 0.5 }];
    const next = stepAbilities(state, NEUTRAL_INPUT, empty);
    expect(next.projectiles[0]!.x).toBeCloseTo(1); expect(next.projectiles[0]!.y).toBeCloseTo(10 + 300 * FIXED_DT);
  });
  it('varies timing within 30–45 seconds and never repeats the last spot', () => {
    let roll = 0;
    const boots = new ScatterBoots(() => roll);
    expect(boots.state.nextSpawnTick).toBe(SCATTER_MIN_INTERVAL_TICKS);
    roll = 0.999999; boots.reset(100);
    expect(boots.state.nextSpawnTick - 100).toBe(SCATTER_MAX_INTERVAL_TICKS);
    const visited = new Set<string>();
    for (let cycle = 0; cycle < 30; cycle++) {
      const tick = boots.state.nextSpawnTick;
      roll = (cycle % 8) / 8;
      boots.advance(tick);
      const spot = boots.state.pickup!;
      const key = `${spot.x},${spot.y}`;
      const old = [...visited].at(-1);
      if (cycle) expect(key).not.toBe(old);
      visited.delete(key); visited.add(key);
      boots.collect([{ id: 'player', alive: true, ...spot }], tick);
      expect(boots.state.nextSpawnTick - tick).toBeGreaterThanOrEqual(SCATTER_MIN_INTERVAL_TICKS);
      expect(boots.state.nextSpawnTick - tick).toBeLessThanOrEqual(SCATTER_MAX_INTERVAL_TICKS);
    }
    expect(visited.size).toBeGreaterThan(4);
  });
  it('keeps every random location in free air above a platform, away from spawns', () => {
    for (const pickup of SCATTER_SPAWN_SPOTS) {
      for (let x = pickup.x - 3; x < pickup.x + 11; x++) for (let y = pickup.y - 4; y < pickup.y + 12; y++)
        expect(TOYBOX_ARENA.rows[Math.floor(y / 8)]![Math.floor(x / 8)]).toBe('.');
      expect(TOYBOX_ARENA.rows[Math.floor((pickup.y + 12) / 8)]![Math.floor((pickup.x + 4) / 8)]).toBe('#');
      expect(TOYBOX_ARENA.spawns.every(spawn => Math.hypot(spawn.x - pickup.x, spawn.y - pickup.y) > 20)).toBe(true);
    }
  });
});
