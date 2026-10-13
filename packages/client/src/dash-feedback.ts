import type { AbilityState } from '@boot-loop/shared';

/** Online feedback follows confirmation, rather than replaying its lifetime with pending inputs. */
export function dashReadyNoticeVisible(predicted: AbilityState, confirmed?: AbilityState): boolean {
  return (confirmed ?? predicted).dashReadyRemaining > 0;
}
