import { describe, expect, it } from 'vitest';
import { MatchEngine, stockResult, NEUTRAL_INPUT, RESPAWN_TICKS, PROTECTION_TICKS } from '../src';
import type { WorldMap } from '../src';
const world: WorldMap = { id: 'stock-test', width: 40, height: 24, rows: Array(24).fill('.'.repeat(40)), spawns: [{ x: 40, y: 50 }, { x: 180, y: 50 }] };
function match(stocks = 3) {
  const game = new MatchEngine(world); game.add('a'); game.add('b'); game.configureMode('a', 'stock'); game.configureStocks('a', stocks); game.start('a');
  game.phase = 'running'; game.phaseEnds = 10000; return game;
}
function shootContact(game: MatchEngine, mutual = false) {
  const a = game.players.get('a')!, b = game.players.get('b')!;
  Object.assign(a.state.player, { x: 100, y: 50, vy: 0, vx: 0 }); Object.assign(b.state.player, { x: 100, y: 90, vy: 0, vx: 0 });
  a.protectedUntil = 0; b.protectedUntil = 0;
  game.bullets = [{ owner: 'a', id: 1, x: 100, y: 87, remaining: 0.5 }, ...(mutual ? [{ owner: 'b', id: 1, x: 100, y: 47, remaining: 0.5 }] : [])];
  game.advance();
}
describe('Stock mode', () => {
  it('restricts mode/stocks to the host between matches, validates settings and preserves rematches', () => {
    const game = new MatchEngine(world); game.add('a'); game.add('b');
    expect(game.configureMode('b', 'stock')).toBe(false); expect(game.configureMode('a', 'oops')).toBe(false);
    expect(game.configureStocks('b', 1)).toBe(false);
    for (const n of [0, 2, 6, 1.5, NaN, '3', null]) expect(game.configureStocks('a', n)).toBe(false);
    game.configureMode('a', 'stock'); game.configureStocks('a', 5); game.start('a');
    expect(game.configureMode('a', 'timed')).toBe(false); expect(game.configureStocks('a', 1)).toBe(false);
    expect(game.snapshot().players.map(p => p.stocks)).toEqual([5, 5]);
    game.phase = 'results'; game.start('a'); expect(game.mode).toBe('stock'); expect(game.startingStocks).toBe(5);
  });
  it('loses one stock per confirmed death and respawns with existing protection/resources', () => {
    const game = match(); shootContact(game); const b = game.players.get('b')!;
    expect(b.stocks).toBe(2); expect(b.deaths).toBe(1); expect(b.alive).toBe(false); expect(game.phase).toBe('running');
    const deathTick = game.tick;
    for (let i = 0; i < RESPAWN_TICKS; i++) game.advance();
    expect(b.alive).toBe(true); expect(b.stocks).toBe(2); expect(b.protectedUntil).toBe(deathTick + RESPAWN_TICKS + PROTECTION_TICKS);
    expect(b.state.ammo).toBe(4); expect(b.state.dashCharge).toBe(true);
  });
  it('finishes on final stock, freezes the eliminated player, and resets on rematch', () => {
    const game = match(1); shootContact(game); const b = game.players.get('b')!;
    expect(b.stocks).toBe(0); expect(b.respawnAt).toBe(0); expect(game.phase).toBe('results');
    expect(game.result!.reason).toBe('survivor'); expect(game.result!.winners).toEqual(['a']);
    const frozen = game.snapshot().result, position = { ...b.state.player };
    game.submit('b', { seq: 1, input: { ...NEUTRAL_INPUT, x: 1, jumpPressed: true } });
    for (let i = 0; i < 200; i++) game.advance();
    expect(b.alive).toBe(false); expect(b.state.player).toEqual(position); expect(game.result).toEqual(frozen);
    game.configureMode('a', 'timed'); expect(game.result!.mode).toBe('stock');
    game.start('a'); expect(b.alive).toBe(true); expect(b.stocks).toBe(1); expect(b.deaths).toBe(0); expect(game.result).toBeNull();
  });
  it('resolves both simultaneous final-stock deaths before declaring a draw', () => {
    const game = match(1); shootContact(game, true);
    expect(game.result!.reason).toBe('draw'); expect(game.result!.winners).toEqual([]);
    expect(game.result!.standings.map(p => p.stocks)).toEqual([0, 0]); expect(game.players.get('a')!.kills).toBe(1); expect(game.players.get('b')!.kills).toBe(1);
  });
  it('ranks timeout by stocks, then kills, then shots, then shared victory, including no-kill ties', () => {
    const game = match(); const a = game.players.get('a')!, b = game.players.get('b')!;
    expect(stockResult([a, b], true).reason).toBe('shared');
    a.stocks = 2; b.kills = 5; expect(stockResult([a, b], true).winners).toEqual(['b']);
    a.stocks = 3; a.kills = 6; expect(stockResult([a, b], true).reason).toBe('kills');
    a.kills = 5; a.shots = 10; b.shots = 100; expect(stockResult([a, b], true).reason).toBe('shots');
    b.shots = 10; expect(stockResult([a, b], true).reason).toBe('shared');
    game.phaseEnds = game.tick + 1; game.advance(); expect(game.result!.mode).toBe('stock'); expect(game.result!.reason).toBe('shared');
  });
  it('cancels a disconnected Stock match without awarding a win and preserves settings', () => {
    const game = match(5); game.remove('a'); expect(game.phase).toBe('lobby'); expect(game.result).toBeNull();
    expect(game.mode).toBe('stock'); expect(game.startingStocks).toBe(5); expect(game.players.get('b')!.stocks).toBe(5);
  });
});
