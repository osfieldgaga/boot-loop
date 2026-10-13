import type { AbilityState } from '@boot-loop/shared';

type Actor = { id: string; alive: boolean; shots: number; state: AbilityState };
export interface PlayerPose { width: number; height: number; bootLift: number; bootSpread: number; airborne: boolean }
export const IDLE_POSE: Readonly<PlayerPose> = { width: 0, height: 0, bootLift: 0, bootSpread: 0, airborne: false };
type Track = { shots: number; jumping: boolean; alive: boolean; jumpAt: number; shotAt: number };

/** Cosmetic pixel poses; accepted shot counts cannot replay after prediction corrections. */
export class PlayerAnimations {
  private tracks = new Map<string, Track>();
  clear() { this.tracks.clear(); }
  observe(actors: Actor[], now: number) {
    const present = new Set<string>();
    for (const actor of actors) {
      present.add(actor.id);
      const old = this.tracks.get(actor.id);
      const jumping = !actor.state.player.grounded && actor.state.player.variableJumpTimer > 0;
      this.tracks.set(actor.id, {
        shots: Math.max(old?.shots ?? actor.shots, actor.shots), jumping, alive: actor.alive,
        jumpAt: actor.alive && old?.alive && !old.jumping && jumping ? now : old?.jumpAt ?? -Infinity,
        shotAt: actor.alive && old?.alive && actor.shots > old.shots ? now : old?.shotAt ?? -Infinity,
      });
    }
    for (const id of this.tracks.keys()) if (!present.has(id)) this.tracks.delete(id);
  }
  pose(actor: Actor, now: number, reducedMotion = false): PlayerPose {
    const track = this.tracks.get(actor.id);
    if (!actor.alive || reducedMotion) return { ...IDLE_POSE };
    const p = actor.state.player;
    const airborne = !p.grounded;
    let pose: PlayerPose = airborne
      ? { width: p.vy < -25 ? -1 : p.vy > 25 ? 0 : 1, height: p.vy < -25 ? 1 : p.vy > 25 ? 1 : -1, bootLift: p.vy < 25 ? 1 : 0, bootSpread: p.vy > 25 ? 1 : 0, airborne }
      : { ...IDLE_POSE };
    if (track?.alive) {
      const jumpAge = now - track.jumpAt, shotAge = now - track.shotAt;
      if (airborne && jumpAge >= 0 && jumpAge < 65) pose = { width: 2, height: -2, bootLift: 1, bootSpread: 1, airborne };
      else if (airborne && jumpAge >= 65 && jumpAge < 180) pose = { width: -1, height: 2, bootLift: 1, bootSpread: 0, airborne };
      if (shotAge >= 0 && shotAge < 110) {
        const kick = shotAge < 55;
        pose = { width: kick ? 2 : 1, height: kick ? -1 : 0, bootLift: kick ? 2 : 1, bootSpread: kick ? 2 : 1, airborne };
      }
    }
    return pose;
  }
}
