import { describe, expect, it } from 'vitest';
import { ARENAS, MatchEngine, ScatterBoots, overlapsSolid, isSolid, stepAbilities, createAbilityState, MATCH_MOVEMENT, DEFAULT_ABILITIES, NEUTRAL_INPUT, bulletHitsPlayer } from '../src';

describe.each(ARENAS)('$name arena', arena => {
  it('provides four grounded, separated spawn pads and open wrap borders', () => {
    const world = arena.world;
    expect(world.spawns).toHaveLength(4);
    for (const spawn of world.spawns) {
      expect(overlapsSolid(world, spawn.x, spawn.y)).toBe(false);
      expect(overlapsSolid(world, spawn.x, spawn.y + 1)).toBe(true);
      for (const other of world.spawns.filter(s => s !== spawn)) expect(Math.hypot(spawn.x - other.x, spawn.y - other.y)).toBeGreaterThan(48);
    }
    world.rows.forEach((row, i) => {
      expect(row.slice(0, 2) + row.slice(-2)).toBe('....');
      if (i < 2 || i > 21) expect(row).toBe('.'.repeat(40));
    });
  });
  it('keeps every pickup visual clear, supported and away from spawns', () => {
    expect(arena.pickupSpots.length).toBeGreaterThanOrEqual(4);
    for (const spot of arena.pickupSpots) {
      expect(overlapsSolid(arena.world, spot.x - 3, spot.y - 4, 14, 16)).toBe(false);
      expect(isSolid(arena.world, Math.floor((spot.x + 4) / 8), (spot.y + 12) / 8)).toBe(true);
      expect(arena.world.spawns.every(s => Math.hypot(s.x - spot.x, s.y - spot.y) > 20)).toBe(true);
    }
    const boots = new ScatterBoots(() => 0.5, arena.pickupSpots);
    boots.advance(boots.state.nextSpawnTick);
    const first = boots.state.pickup!; expect(arena.pickupSpots).toContainEqual(first);
    boots.collect([{ id: 'a', alive: true, ...first }], boots.state.nextSpawnTick);
    boots.advance(boots.state.nextSpawnTick); expect(boots.state.pickup).not.toEqual(first);
  });
  it('allows jump/dash scripts with all boots without penetrating cover', () => {
    for (const mode of [false, 'scatter', 'turbo', 'ricochet'] as const) for (const spawn of arena.world.spawns) {
      let state = createAbilityState(spawn);
      for (let tick = 0; tick < 900; tick++) {
        const direction = tick % 180 < 90 ? 1 : -1;
        state = stepAbilities(state, { x: direction, jumpHeld: tick % 45 < 10, jumpPressed: tick % 45 === 0, dashDirection: tick % 240 === 12 ? direction : 0 }, arena.world, MATCH_MOVEMENT, DEFAULT_ABILITIES, true, true, mode);
        expect(overlapsSolid(arena.world, state.player.x, state.player.y)).toBe(false);
        expect(Number.isFinite(state.player.x + state.player.y)).toBe(true);
      }
    }
  });
  it('runs four-player timed and stock matches and preserves the arena on rematch', () => {
    for (const mode of ['timed', 'stock'] as const) {
      const game = new MatchEngine(arena.world);
      for (const id of ['a', 'b', 'c', 'd']) game.add(id);
      game.configureMode('a', mode); game.configure('a', 30); game.start('a');
      for (let tick = 0; tick < 2100 && game.phase !== 'results'; tick++) {
        for (const p of game.players.values()) game.submit(p.id, { seq: tick + 1, input: NEUTRAL_INPUT });
        game.advance();
      }
      expect(game.phase).toBe('results'); expect(game.result?.standings).toHaveLength(4);
      expect(game.snapshot().arenaId).toBe(arena.id);
      expect(game.start('a')).toBe(true);
      for (const p of game.players.values()) expect(p.state.player.x).toBe(arena.world.spawns[p.slot]!.x);
    }
  });
});
describe('shared arena selection', () => {
  it('requires the host and a valid arena; locks selection during countdown and play', () => {
    const game = new MatchEngine(); game.add('a'); game.add('b');
    expect(game.configureArena('b', 'crossfire')).toBe(false);
    for (const value of ['unknown', '__proto__', {}, null]) expect(game.configureArena('a', value)).toBe(false);
    expect(game.configureArena('a', 'crossfire')).toBe(true);
    expect(game.snapshot().arenaId).toBe('crossfire');
    for (const p of game.players.values()) expect(p.state.player.x).toBe(game.world.spawns[p.slot]!.x);
    game.start('a'); expect(game.configureArena('a', 'switchback')).toBe(false);
    game.phase = 'running'; expect(game.configureArena('a', 'switchback')).toBe(false);
  });
  it('clears pickup/projectile state on selection while retaining completed results', () => {
    const game = new MatchEngine(); game.add('a'); game.add('b');
    game.phase = 'results'; game.result = { mode: 'timed', reason: 'kills', winners: ['a'], standings: [{ id: 'a', slot: 0, kills: 2, deaths: 0, shots: 3, stocks: 3 }] };
    const result = structuredClone(game.result);
    game.players.get('a')!.kills = 2;
    game.scatterBoots.state.activeUntil = 500;
    game.impacts = [{ key: 'old', tick: 0, x: 20, y: 20 }];
    game.configureArena('a', 'switchback');
    expect(game.result).toEqual(result); expect(game.players.get('a')!.kills).toBe(2);
    expect(game.impacts).toEqual([]); expect(game.scatterBoots.state.activeUntil).toBe(0);
    game.scatterBoots.advance(game.scatterBoots.state.nextSpawnTick);
    expect(ARENAS[2].pickupSpots).toContainEqual(game.scatterBoots.state.pickup);
  });
  it('Switchback walls block padded shots through cover', () => {
    const world = ARENAS[2].world;
    const open = { ...world, rows: Array(24).fill('.'.repeat(40)) };
    expect(bulletHitsPlayer(open, 120, 80, 120, 62, 8)).toBe(true);
    expect(bulletHitsPlayer(world, 120, 80, 120, 62, 8)).toBe(false);
  });
});
