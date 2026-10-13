import { describe, expect, it } from 'vitest';
import { createAbilityState } from '@boot-loop/shared';
import { IDLE_POSE, PlayerAnimations } from '../src/player-animation';
function actor(id = 'gold') {
  const state = createAbilityState({ x: 100, y: 60 }); state.player.grounded = true;
  return { id, alive: true, shots: 0, state };
}
describe('cosmetic player animations', () => {
  it('animates takeoff, ascent and descent without changing movement or hitboxes', () => {
    const animation = new PlayerAnimations(), p = actor(); animation.observe([p], 0);
    p.state.player.grounded = false; p.state.player.variableJumpTimer = 0.1; p.state.player.vy = -150;
    const before = structuredClone(p);
    animation.observe([p], 10);
    expect(animation.pose(p, 10).height).toBe(-2);
    expect(animation.pose(p, 90).height).toBe(2);
    expect(animation.pose(p, 220).width).toBe(-1);
    expect(p).toEqual(before);
    p.state.player.vy = 100;
    expect(animation.pose(p, 300).bootSpread).toBe(1);
    p.state.player.grounded = true;
    expect(animation.pose(p, 400)).toEqual(IDLE_POSE);
  });
  it('does not replay a shot on held fire, duplicate snapshots or prediction rollback', () => {
    const animation = new PlayerAnimations(), p = actor(); animation.observe([p], 0);
    p.shots = 1; animation.observe([p], 10);
    expect(animation.pose(p, 10).bootSpread).toBe(2);
    animation.observe([p], 50); expect(animation.pose(p, 80).bootSpread).toBe(1);
    p.shots = 0; animation.observe([p], 90);
    p.shots = 1; animation.observe([p], 120);
    expect(animation.pose(p, 120)).toEqual(IDLE_POSE);
    p.shots = 2; animation.observe([p], 130);
    expect(animation.pose(p, 130).bootSpread).toBe(2);
  });
  it('tracks opponents separately, resets on rematch, and respects reduced motion', () => {
    const animation = new PlayerAnimations(), local = actor(), remote = actor('blue');
    remote.shots = 10; animation.observe([local, remote], 0);
    expect(animation.pose(remote, 0)).toEqual(IDLE_POSE);
    remote.shots++; animation.observe([local, remote], 10);
    expect(animation.pose(remote, 10).bootLift).toBe(2);
    expect(animation.pose(local, 10)).toEqual(IDLE_POSE);
    expect(animation.pose(remote, 10, true)).toEqual(IDLE_POSE);
    remote.alive = false; expect(animation.pose(remote, 10)).toEqual(IDLE_POSE);
    animation.clear(); remote.alive = true; remote.shots = 0;
    animation.observe([remote], 20); remote.shots++; animation.observe([remote], 30);
    expect(animation.pose(remote, 30).bootLift).toBe(2);
  });
});
