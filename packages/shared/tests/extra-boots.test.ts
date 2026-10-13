import { describe, expect, it } from 'vitest';
import { activeBoot, bootMovement, createAbilityState, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, NEUTRAL_INPUT, MatchEngine, MATCH_MOVEMENT, ScatterBoots, stepAbilities } from '../src';
import type { WorldMap } from '../src';
const empty: WorldMap = { id: 'boots', width: 40, height: 24, spawns: [{ x: 30, y: 50 }], rows: Array(24).fill('.'.repeat(40)) };
describe('Turbo boots', () => {
  it('boosts running and acceleration without changing jump or dash settings', () => {
    const movement = bootMovement(DEFAULT_CONSTANTS, 'turbo');
    expect(movement.MAX_RUN).toBe(DEFAULT_CONSTANTS.MAX_RUN * 1.25);
    expect(movement.RUN_ACCEL).toBe(DEFAULT_CONSTANTS.RUN_ACCEL * 1.25);
    expect(movement.JUMP_SPEED).toBe(DEFAULT_CONSTANTS.JUMP_SPEED);
    const state = createAbilityState({ x: 30, y: 50 });
    const normal = stepAbilities(state, { ...NEUTRAL_INPUT, x: 1 }, empty);
    const turbo = stepAbilities(state, { ...NEUTRAL_INPUT, x: 1 }, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, true, true, 'turbo');
    expect(turbo.player.vx).toBeCloseTo(normal.player.vx * 1.25);
    expect(turbo.player.vy).toBe(normal.player.vy);
    const dash = stepAbilities(state, { ...NEUTRAL_INPUT, dashDirection: 1 }, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, true, true, 'turbo');
    expect(dash.player.vx).toBe(DEFAULT_ABILITIES.DASH_SPEED);
    expect(dash.dashCooldown).toBe(10);
    const shot = stepAbilities(state, { ...NEUTRAL_INPUT, jumpPressed: true }, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, true, true, 'turbo');
    expect(shot.projectiles).toHaveLength(1);
  });
  it('selects Turbo randomly, gives a timed shared effect and restores base movement', () => {
    const boots = new ScatterBoots(() => 0.5); boots.advance(boots.state.nextSpawnTick);
    expect(boots.state.mode).toBe('turbo');
    const tick = boots.state.nextSpawnTick;
    boots.collect([{ id: 'player', alive: true, ...boots.state.pickup! }], tick);
    expect(activeBoot(boots.state, tick + 479)).toBe('turbo');
    expect(activeBoot(boots.state, tick + 480)).toBe(false);
    expect(bootMovement(DEFAULT_CONSTANTS, activeBoot(boots.state, tick + 480))).toBe(DEFAULT_CONSTANTS);
  });
});

describe('Ricochet boots', () => {
  it('bounces once from cover, travels upward and disappears on the next collision', () => {
    const rows = [...empty.rows]; rows[5] = '#'.repeat(40); rows[10] = '#'.repeat(40);
    const world = { ...empty, rows };
    const state = createAbilityState({ x: 30, y: 50 });
    state.projectiles = [{ id: 1, x: 30, y: 74, remaining: 0.9, ricochet: true }];
    let next = stepAbilities(state, NEUTRAL_INPUT, world);
    expect(next.projectiles).toHaveLength(1);
    expect(next.projectiles[0]!.bounced).toBe(true);
    expect(next.projectiles[0]!.vy).toBe(-300);
    expect(next.projectiles[0]!.y).toBeLessThan(77);
    const bouncedY = next.projectiles[0]!.y;
    next = stepAbilities(next, NEUTRAL_INPUT, world);
    expect(next.projectiles[0]!.y).toBeLessThan(bouncedY);
    for (let i = 0; i < 12; i++) next = stepAbilities(next, NEUTRAL_INPUT, world);
    expect(next.projectiles).toHaveLength(0);
    const normal = stepAbilities({ ...state, projectiles: [{ ...state.projectiles[0]!, ricochet: false }] }, NEUTRAL_INPUT, world);
    expect(normal.projectiles).toHaveLength(0);
  });
  it('costs normal ammo and starts the same three-second reload on the final shot', () => {
    const state = { ...createAbilityState({ x: 30, y: 50 }), ammo: 1 };
    const shot = stepAbilities(state, { ...NEUTRAL_INPUT, jumpPressed: true }, empty, DEFAULT_CONSTANTS, DEFAULT_ABILITIES, true, true, 'ricochet');
    expect(shot.projectiles).toHaveLength(1); expect(shot.projectiles[0]!.ricochet).toBe(true);
    expect(shot.shots).toBe(1); expect(shot.ammo).toBe(0); expect(shot.reloadRemaining).toBe(3);
  });
});

describe('shared multiplayer boot effects', () => {
  for (const mode of ['turbo', 'ricochet'] as const) it(`gives ${mode} to all four players and clears it on rematch`, () => {
    const game = new MatchEngine(empty);
    for (const id of ['a', 'b', 'c', 'd']) game.add(id);
    game.start('a'); game.phase = 'running'; game.phaseEnds = 10000;
    Object.assign(game.scatterBoots.state, { mode, pickup: { x: 30, y: 50 }, pickupExpiresAt: 600 });
    game.advance(); expect(game.snapshot().scatter.collector).toBe('a');
    for (const p of game.players.values()) {
      Object.assign(p.state.player, { x: 20 + p.slot * 70, y: 20, vx: 0, vy: 0, coyoteTimer: 0 });
      game.submit(p.id, { seq: 1, input: { ...NEUTRAL_INPUT, x: 1, jumpPressed: mode === 'ricochet' } });
    }
    game.advance();
    if (mode === 'turbo') for (const p of game.players.values()) expect(p.state.player.vx).toBeCloseTo(MATCH_MOVEMENT.RUN_ACCEL * MATCH_MOVEMENT.AIR_MULT * 1.25 / 60);
    else { expect(game.bullets).toHaveLength(4); expect(game.bullets.every(b => b.ricochet)).toBe(true); }
    game.phase = 'results'; game.start('a'); expect(activeBoot(game.snapshot().scatter, game.tick)).toBe(false);
  });
  it('confirms bounce feedback for every client and allows an upward hit without hitting the owner', () => {
    const rows = [...empty.rows]; rows[10] = '#'.repeat(40);
    const game = new MatchEngine({ ...empty, rows }); game.add('a'); game.add('b'); game.phase = 'running'; game.phaseEnds = 10000;
    Object.assign(game.players.get('b')!.state.player, { x: 30, y: 52, vy: 0 });
    game.bullets = [{ owner: 'a', id: 1, x: 30, y: 74, remaining: 0.9, ricochet: true }];
    game.advance(); expect(game.snapshot().bounces).toHaveLength(1);
    expect(game.bullets[0]!.vy).toBe(-300);
    for (let i = 0; i < 6; i++) game.advance();
    expect(game.players.get('b')!.alive).toBe(false); expect(game.players.get('a')!.alive).toBe(true);
  });
});

describe('normal bullet impact feedback', () => {
  it('records shared cover impacts without changing collision behavior or creating expiry flashes', () => {
    const rows = [...empty.rows]; rows[10] = '#'.repeat(40);
    const game = new MatchEngine({ ...empty, rows }); game.add('a'); game.add('b'); game.phase = 'running'; game.phaseEnds = 10000;
    game.bullets = [{ owner: 'a', id: 1, x: 30, y: 74, remaining: 0.5 }];
    game.advance(); expect(game.bullets).toHaveLength(0); expect(game.snapshot().impacts).toHaveLength(1);
    expect(game.players.get('b')!.alive).toBe(true);
    game.bullets = [{ owner: 'a', id: 2, x: 30, y: 50, remaining: 0.001 }];
    game.advance(); expect(game.snapshot().impacts).toHaveLength(1);
  });
  it('records a player-hit spark alongside the existing confirmed death', () => {
    const game = new MatchEngine(empty); game.add('a'); game.add('b'); game.phase = 'running'; game.phaseEnds = 10000;
    Object.assign(game.players.get('b')!.state.player, { x: 30, y: 60, vy: 0 });
    game.bullets = [{ owner: 'a', id: 1, x: 30, y: 57, remaining: 0.5 }];
    game.advance(); expect(game.players.get('b')!.alive).toBe(false); expect(game.snapshot().impacts).toHaveLength(1);
    expect(game.snapshot().events.some(e => e.death)).toBe(true);
  });
});
