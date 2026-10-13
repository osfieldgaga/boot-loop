import { describe, expect, it } from 'vitest';
import { MatchEngine } from '@boot-loop/shared';
import { deathTaunt, DeathEffectQueue } from '../src/death-effects';
function match() { const game = new MatchEngine(); game.add('killer'); game.add('victim'); game.phase = 'running'; return game; }
describe('confirmed death feedback on every client', () => {
  it('uses the victim color and the same rotating quip for both clients', () => {
    expect(deathTaunt(0, 1, true)).toBe('GOLD GOT CRUSHED!');
    expect(deathTaunt(1, 1, true)).toBe('BLUE IS FLATTENED!');
    expect(deathTaunt(0, 1, false)).toBe('GOLD GOT BOOTED!');
    expect(deathTaunt(0, 2, true)).not.toBe(deathTaunt(0, 1, true));
  });
  it('queues the same burst for the surviving killer and dying victim, exactly once', () => {
    const game = match(), killer = new DeathEffectQueue(), victim = new DeathEffectQueue();
    for (const queue of [killer, victim]) queue.accept(game.snapshot());
    const dead = game.players.get('victim')!; dead.deaths++; dead.alive = false;
    game.events = [{ tick: game.tick, text: 'kill', death: { player: dead.id, slot: dead.slot, x: 90, y: 40 } }];
    const snapshot = game.snapshot();
    for (const queue of [killer, victim]) { queue.accept(snapshot); queue.accept(snapshot); }
    const expected = [{ player: 'victim', slot: 1, x: 90, y: 40, message: 'BLUE FORGOT TO DODGE!' }];
    expect(killer.drain()).toEqual(expected); expect(victim.drain()).toEqual(expected);
    expect(killer.drain()).toEqual([]); expect(victim.drain()).toEqual([]);
  });
  it('retains a kill across newer snapshots before a render and falls back when the event is missing', () => {
    const game = match(), queue = new DeathEffectQueue(); queue.accept(game.snapshot());
    const dead = game.players.get('victim')!; dead.deaths++; dead.alive = false;
    queue.accept(game.snapshot()); game.tick += 30; queue.accept(game.snapshot());
    expect(queue.drain()).toEqual([{ player: dead.id, slot: 1, x: dead.state.player.x, y: dead.state.player.y, message: 'BLUE FORGOT TO DODGE!' }]);
  });
  it('queues both victims of a mutual kill without requiring a local death', () => {
    const game = match(), queue = new DeathEffectQueue(); queue.accept(game.snapshot());
    for (const p of game.players.values()) { p.deaths++; p.alive = false; }
    queue.accept(game.snapshot()); expect(queue.drain().map(d => d.player)).toEqual(['killer', 'victim']);
  });
  it('resets on rematch/disconnect and does not replay preexisting deaths on entry', () => {
    const game = match(), queue = new DeathEffectQueue(); game.players.get('victim')!.deaths = 1;
    queue.accept(game.snapshot()); expect(queue.drain()).toEqual([]);
    game.phase = 'countdown'; game.players.get('victim')!.deaths = 0; queue.accept(game.snapshot());
    game.phase = 'running'; game.players.get('victim')!.deaths = 1; queue.accept(game.snapshot()); expect(queue.drain()).toHaveLength(1);
    queue.reset(); queue.accept(game.snapshot()); expect(queue.drain()).toEqual([]);
  });
});
