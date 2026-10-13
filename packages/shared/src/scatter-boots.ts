import type { MovementConstants } from './constants';
import { PLAYER_HEIGHT, PLAYER_WIDTH } from './constants';
import { wrapDx, wrapDy } from './math';
export const SCATTER_MIN_INTERVAL_TICKS = 30 * 60;
export const SCATTER_MAX_INTERVAL_TICKS = 45 * 60;
// Free air over exposed platforms; avoid the four home/spawn platforms.
export const SCATTER_SPAWN_SPOTS = [
  { x: 120, y: 52 }, { x: 192, y: 52 }, { x: 156, y: 68 },
  { x: 112, y: 84 }, { x: 208, y: 84 },
  { x: 96, y: 132 }, { x: 208, y: 132 }, { x: 156, y: 156 },
] as const;
export const SCATTER_DURATION_TICKS = 8 * 60;
export const SCATTER_PICKUP_SIZE = 8;
export const SCATTER_PICKUP_LIFETIME_TICKS = 10 * 60;
export type BootMode = 'scatter' | 'turbo' | 'ricochet';
export const BOOT_NAMES = { scatter: 'Scatter', turbo: 'Turbo', ricochet: 'Ricochet' } as const;
export function activeBoot(state: ScatterBootsState, tick: number): BootMode | false { return scatterActive(state, tick) ? state.mode : false; }
export function bootMovement(base: MovementConstants, mode: BootMode | boolean): MovementConstants {
  return mode === 'turbo' ? { ...base, MAX_RUN: base.MAX_RUN * 1.25, RUN_ACCEL: base.RUN_ACCEL * 1.25, RUN_REDUCE: base.RUN_REDUCE * 1.25 } : base;
}
export interface ScatterBootsState {
  mode: BootMode;
  pickup: { x: number; y: number } | null;
  pickupExpiresAt: number; nextSpawnTick: number; activeUntil: number; collector: string | null;
}
export function scatterActive(state: ScatterBootsState, tick: number) { return tick < state.activeUntil; }
/** Shared match-wide modifier: collection never grants private boots or extra ammo. */
export class ScatterBoots {
  state!: ScatterBootsState;
  private lastSpot = -1;
  constructor(private random: () => number = Math.random, private spots: readonly { x: number; y: number }[] = SCATTER_SPAWN_SPOTS) { this.reset(0); }
  setSpots(spots: readonly { x: number; y: number }[], tick: number) { this.spots = spots; this.reset(tick); }
  private delay() { return SCATTER_MIN_INTERVAL_TICKS + Math.floor(this.random() * (SCATTER_MAX_INTERVAL_TICKS - SCATTER_MIN_INTERVAL_TICKS + 1)); }
  reset(tick: number) {
    this.lastSpot = -1;
    this.state = { mode: 'scatter', pickup: null, pickupExpiresAt: 0, nextSpawnTick: tick + this.delay(), activeUntil: 0, collector: null };
  }
  private expirePickup(tick: number) {
    if (this.state.pickup && tick >= this.state.pickupExpiresAt) {
      this.state.pickup = null; this.state.pickupExpiresAt = 0;
      this.state.nextSpawnTick = tick + this.delay();
    }
  }
  advance(tick: number) {
    this.expirePickup(tick);
    if (this.state.activeUntil && tick >= this.state.activeUntil) { this.state.activeUntil = 0; this.state.collector = null; }
    if (!this.state.pickup && !scatterActive(this.state, tick) && tick >= this.state.nextSpawnTick) {
      const candidates = this.spots.map((_, index) => index).filter(index => index !== this.lastSpot);
      this.lastSpot = candidates[Math.floor(this.random() * candidates.length)]!;
      this.state.mode = (['scatter', 'turbo', 'ricochet'] as const)[Math.floor(this.random() * 3)]!;
      this.state.pickup = { ...this.spots[this.lastSpot]! };
      this.state.pickupExpiresAt = tick + SCATTER_PICKUP_LIFETIME_TICKS;
    }
  }
  collect(players: readonly { id: string; alive: boolean; x: number; y: number }[], tick: number): string | null {
    this.expirePickup(tick);
    const pickup = this.state.pickup; if (!pickup) return null;
    const collector = [...players].sort((a, b) => a.id.localeCompare(b.id)).find(p => {
      const dx = wrapDx(pickup.x, p.x), dy = wrapDy(pickup.y, p.y);
      return p.alive && dx < SCATTER_PICKUP_SIZE && dx > -PLAYER_WIDTH && dy < SCATTER_PICKUP_SIZE && dy > -PLAYER_HEIGHT;
    });
    if (!collector) return null;
    this.state.pickup = null; this.state.pickupExpiresAt = 0; this.state.collector = collector.id;
    this.state.activeUntil = tick + SCATTER_DURATION_TICKS;
    this.state.nextSpawnTick = tick + this.delay();
    return collector.id;
  }
}
