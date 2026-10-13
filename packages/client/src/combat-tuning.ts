import { BULLET_HIT_PADDING, MAX_BULLET_HIT_PADDING } from '@boot-loop/shared';
import { party } from './party';
let practicePadding = BULLET_HIT_PADDING;
export function activeBulletPadding(): number {
  return party.room ? party.snapshot?.bulletHitPaddingPx ?? BULLET_HIT_PADDING : practicePadding;
}
export function setupCombatTuning() {
  const number = document.querySelector<HTMLInputElement>('#bullet-padding')!;
  const slider = document.querySelector<HTMLInputElement>('#bullet-padding-slider')!;
  const feedback = document.querySelector('#bullet-padding-feedback')!;
  const inputs = [number, slider];
  const apply = (input: HTMLInputElement, commit: boolean) => {
    const value = Number(input.value);
    if (!input.value || !Number.isInteger(value) || value < 0 || value > MAX_BULLET_HIT_PADDING) {
      if (commit) input.value = String(activeBulletPadding());
      feedback.textContent = 'Choose a whole number from 0 to 8.'; return;
    }
    if (party.room) {
      if (party.snapshot?.host !== party.id || !['lobby', 'results'].includes(party.snapshot.phase)) return;
      if (commit) party.room.send('bullet-padding', value);
      feedback.textContent = 'Shared room tolerance — host changes apply to both players.';
    } else {
      practicePadding = value;
      feedback.textContent = 'Practice outline updated. Create a room to test real bullet hits.';
    }
    for (const other of inputs) if (other !== input) other.value = String(value);
  };
  for (const input of inputs) {
    input.addEventListener('input', () => apply(input, false));
    input.addEventListener('change', () => apply(input, true));
    input.addEventListener('blur', () => apply(input, true));
  }
  document.querySelector('#reset-bullet-padding')!.addEventListener('click', () => {
    number.value = String(BULLET_HIT_PADDING); apply(number, true);
  });
  let shownSettings = '';
  // Snapshot updates reflect the authoritative room setting, including for guests.
  document.addEventListener('party-settings', () => {
    const editable = !party.room || Boolean(party.snapshot && party.snapshot.host === party.id && ['lobby', 'results'].includes(party.snapshot.phase));
    const signature = `${party.room?.roomId ?? ''}:${activeBulletPadding()}:${editable}`;
    if (signature === shownSettings) return;
    shownSettings = signature;
    for (const input of inputs) {
      input.disabled = !editable;
      input.value = String(activeBulletPadding());
    }
    document.querySelector<HTMLButtonElement>('#reset-bullet-padding')!.disabled = !editable;
    if (party.room) feedback.textContent = editable ? 'Host: adjust between matches. Both players use this value.' : 'Shared room tolerance. Only the host can change it between matches.';
    else feedback.textContent = 'Practice outline preview. Online rooms start with the default 8 px.';
  });
}
