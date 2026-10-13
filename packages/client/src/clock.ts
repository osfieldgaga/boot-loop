import { FIXED_DT, MAX_ACCUMULATED_TIME } from '@boot-loop/shared';
export class FixedClock {
  private remainder = 0;
  advance(seconds: number, tick: () => void): number {
    this.remainder = Math.min(MAX_ACCUMULATED_TIME, this.remainder + Math.max(0, seconds));
    while (this.remainder + Number.EPSILON >= FIXED_DT) { tick(); this.remainder = Math.max(0, this.remainder - FIXED_DT); }
    return this.remainder / FIXED_DT;
  }
  reset() { this.remainder = 0; }
}

