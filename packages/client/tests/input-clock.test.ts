import { expect, it } from 'vitest';
import { FixedClock } from '../src/clock';
import { InputState } from '../src/input';

it('latches a short jump press until a simulation tick', () => {
  const input = new InputState(); input.press('Space'); input.release('Space');
  expect(input.sample()).toEqual({ x: 0, jumpHeld: false, jumpPressed: true });
  expect(input.sample().jumpPressed).toBe(false);
});
it('does not repeat held jumps and treats opposite directions as neutral', () => {
  const input = new InputState(); input.press('Space'); input.sample(); input.press('Space');
  expect(input.sample()).toEqual({ x: 0, jumpHeld: true, jumpPressed: false });
  input.press('KeyA'); input.press('ArrowRight'); expect(input.sample().x).toBe(0);
  input.release('KeyA'); expect(input.sample().x).toBe(1);
});
it('clears held keys and pending jump on focus loss', () => {
  const input = new InputState(); input.press('KeyA'); input.press('Space'); input.clear();
  expect(input.sample()).toEqual({ x: 0, jumpHeld: false, jumpPressed: false });
});
it('runs the same number of fixed ticks at 30, 60 and 144 render Hz', () => {
  for (const hz of [30, 60, 144]) {
    const clock = new FixedClock(); let ticks = 0;
    for (let i = 0; i < hz; i++) clock.advance(1 / hz, () => ticks++);
    expect(ticks).toBe(60);
  }
});
it('bounds catch-up after a long frame and resets the accumulator', () => {
  const clock = new FixedClock(); let ticks = 0;
  clock.advance(30, () => ticks++); expect(ticks).toBe(15);
  clock.advance(1 / 120, () => ticks++); clock.reset();
  clock.advance(1 / 120, () => ticks++); expect(ticks).toBe(15);
});

it('latches a released double-tap direction for one tick, with a 220 ms window', () => {
  const input = new InputState(); input.press('KeyD', 0); input.release('KeyD'); input.press('KeyD', 200); input.release('KeyD');
  expect(input.sample().dashDirection).toBe(1); expect(input.sample().dashDirection).toBeUndefined();
  input.press('KeyA', 1000); input.release('KeyA'); input.press('KeyA', 1230); expect(input.sample().dashDirection).toBeUndefined();
});
it('does not mistake held repeats, alternate aliases or opposite taps for a double tap', () => {
  const input = new InputState(); input.press('KeyD', 0); input.press('KeyD', 100); input.press('ArrowRight', 150);
  expect(input.sample().dashDirection).toBeUndefined(); input.clear();
  input.press('KeyD', 0); input.release('KeyD'); input.press('KeyA', 100); expect(input.sample().dashDirection).toBeUndefined();
});
it('clears pending dash and tap history on focus loss', () => {
  const input = new InputState(); input.press('KeyD', 0); input.release('KeyD'); input.clear(); input.press('KeyD', 100); expect(input.sample().dashDirection).toBeUndefined();
  input.release('KeyD'); input.press('KeyD', 200); input.clear(); expect(input.sample().dashDirection).toBeUndefined();
});
