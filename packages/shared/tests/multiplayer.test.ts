import { describe, expect, it } from 'vitest';
import { MatchEngine, TOYBOX_ARENA, NEUTRAL_INPUT } from '../src';
function four() { const game = new MatchEngine(); for (const id of ['a', 'b', 'c', 'd']) game.add(id); return game; }
describe('three/four players', () => {
  it('assigns four unique slots/spawns, rejects a fifth, and starts with three', () => {
    const game = four(); expect(game.add('e')).toBe(false);
    expect([...game.players.values()].map(p => p.slot)).toEqual([0, 1, 2, 3]);
    expect(new Set([...game.players.values()].map(p => `${p.state.player.x},${p.state.player.y}`)).size).toBe(4);
    expect(TOYBOX_ARENA.spawns).toHaveLength(4); game.remove('d'); expect(game.start('a')).toBe(true);
  });
  it('continues with at least two, transfers host, then cancels below two', () => {
    const game = four(); game.start('a'); game.remove('a'); expect(game.host).toBe('b'); expect(game.phase).toBe('countdown');
    game.remove('c'); expect(game.phase).toBe('countdown'); game.remove('d'); expect(game.phase).toBe('lobby'); expect(game.result).toBeNull();
  });
  it('keeps zero-stock players watching without accepting attacks or respawning', () => {
    const game = four(); game.configureMode('a', 'stock'); game.configureStocks('a', 1); game.start('a');
    game.phase = 'running'; game.phaseEnds = 10000;
    const b = game.players.get('b')!; b.alive = false; b.stocks = 0; b.respawnAt = 0;
    game.submit('b', { seq: 1, input: { ...NEUTRAL_INPUT, jumpPressed: true, x: 1 } });
    for (let n = 0; n < 100; n++) game.advance(); expect(b.alive).toBe(false); expect(b.shots).toBe(0); expect(game.phase).toBe('running');
    game.players.get('c')!.stocks = 0; game.players.get('c')!.alive = false;
    game.players.get('d')!.stocks = 0; game.players.get('d')!.alive = false;
    game.advance(); expect(game.result!.winners).toEqual(['a']);
  });
});
