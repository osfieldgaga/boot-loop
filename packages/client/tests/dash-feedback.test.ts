import { describe, expect, it } from 'vitest';
import { createAbilityState, FIXED_DT, NEUTRAL_INPUT, stepAbilities } from '@boot-loop/shared';
import type { WorldMap } from '@boot-loop/shared';
import { dashReadyNoticeVisible } from '../src/dash-feedback';
const empty: WorldMap = { id: 'feedback', rows: Array(24).fill('.'.repeat(40)), width: 40, height: 24, spawns: [] };
describe('local dash-ready notification', () => {
  it('still shows server readiness when replay has consumed the predicted notification timer', () => {
    const waiting = createAbilityState({ x: 30, y: 50 }); waiting.dashCooldown = FIXED_DT;
    const confirmed = stepAbilities(waiting, NEUTRAL_INPUT, empty);
    let predicted = structuredClone(confirmed);
    for (let i = 0; i < 90; i++) predicted = stepAbilities(predicted, NEUTRAL_INPUT, empty);
    expect(predicted.dashReadyRemaining).toBe(0);
    expect(dashReadyNoticeVisible(predicted, confirmed)).toBe(true);
    expect(confirmed.dashReadyRemaining).toBe(1.5);
  });
  it('expires on server confirmation and uses local timing in solo practice', () => {
    const local = createAbilityState({ x: 30, y: 50 }); local.dashReadyRemaining = 1.5;
    expect(dashReadyNoticeVisible(local)).toBe(true);
    expect(dashReadyNoticeVisible(local, { ...local, dashReadyRemaining: 0 })).toBe(false);
  });
});
