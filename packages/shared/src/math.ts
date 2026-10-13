import { WORLD_WIDTH, WORLD_HEIGHT } from './constants';
export function approach(current: number, target: number, maxDelta: number): number {
  return current < target ? Math.min(current + maxDelta, target) : Math.max(current - maxDelta, target);
}
export function wrap(value: number, size: number): number { return ((value % size) + size) % size; }
// The half-world tie is always negative, so the result is stable.
export function wrappedDelta(from: number, to: number, size: number): number { return wrap(to - from + size / 2, size) - size / 2; }
export function wrapDx(from: number, to: number): number { return wrappedDelta(from, to, WORLD_WIDTH); }
export function wrapDy(from: number, to: number): number { return wrappedDelta(from, to, WORLD_HEIGHT); }
export function wrapDelta(from: { x: number; y: number }, to: { x: number; y: number }) { return { x: wrapDx(from.x, to.x), y: wrapDy(from.y, to.y) }; }
export function interpolateWrapped(from: number, to: number, alpha: number, size: number): number { return wrap(from + wrappedDelta(from, to, size) * alpha, size); }
// Odd rounding avoids a systematic bias between left and right pixel movement.
export function roundMovement(value: number): number { return Math.sign(value) * Math.round(Math.abs(value)); }
export function seamOffsets(x: number, y: number, width: number, height: number): { x: number; y: number }[] {
  const xs = [0]; const ys = [0];
  if (x + width > WORLD_WIDTH) xs.push(-WORLD_WIDTH);
  if (x < 0) xs.push(WORLD_WIDTH);
  if (y + height > WORLD_HEIGHT) ys.push(-WORLD_HEIGHT);
  if (y < 0) ys.push(WORLD_HEIGHT);
  return xs.flatMap((dx) => ys.map((dy) => ({ x: dx, y: dy })));
}


