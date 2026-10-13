import { DEFAULT_ABILITIES } from '@boot-loop/shared';
import type { AbilityConstants } from '@boot-loop/shared';
export const abilities: AbilityConstants = { ...DEFAULT_ABILITIES };
export let dashEnabled = true;
const settings: Record<keyof AbilityConstants, { title: string; unit: string; min: number; max: number; step: number; explanation: string; low: string; high: string }> = {
  DASH_SPEED: { title: 'Dash speed', unit: 'px/s', min: 150, max: 600, step: 1, explanation: 'Fixed horizontal speed during the dash. Walls still stop you.', low: 'Slower dash, less distance.', high: 'Faster dash, more distance.' },
  DASH_TIME: { title: 'Dash duration', unit: 's', min: 0.05, max: 0.4, step: 0.01, explanation: 'Time spent moving horizontally with gravity off. Shooting and stomping are disabled during it.', low: 'Short burst.', high: 'Long burst and longer shooting lockout.' },
  END_DASH_SPEED: { title: 'Speed after dash', unit: 'px/s', min: 0, max: 200, step: 1, explanation: 'Horizontal speed kept when an unobstructed dash ends; normal steering then resumes.', low: '0 stops horizontal motion at the end.', high: 'More momentum after the dash.' },
  DASH_COOLDOWN: { title: 'Dash cooldown', unit: 's', min: 3, max: 20, step: 0.01, explanation: 'Automatic dash recharge time after use. Landing, stomping and respawning cannot reset it.', low: '3 seconds: frequent escape bursts.', high: '20 seconds: use your escape carefully.' },
  AMMO: { title: 'Shots per magazine', unit: 'shots', min: 1, max: 6, step: 1, explanation: 'Magazine capacity. Each accepted shot consumes one; empty boots reload automatically in 3 seconds. Landing and stomping do not top up ammo.', low: 'One shot before a 3-second reload.', high: 'Six shots and more opportunities for recoil.' },
  RECOIL_SPEED: { title: 'Shot upward speed', unit: 'px/s', min: 0, max: 180, step: 1, explanation: 'A shot sets falling motion toward this upward speed. It preserves an already faster rise; it never adds speeds together.', low: '0 stops a fall without adding lift.', high: 'Stronger lift per shot; easier to stay airborne.' },
  SHOT_COOLDOWN: { title: 'Shot cooldown', unit: 's', min: 0.1, max: 0.4, step: 0.01, explanation: 'Minimum gap between accepted shots. Press Space/Z again for each shot; holding does not autofire.', low: 'Faster firing and recoil refresh.', high: 'Slower firing; rapid presses are rejected.' },
  BULLET_SPEED: { title: 'Bullet speed', unit: 'px/s', min: 100, max: 500, step: 1, explanation: 'Downward travel speed. Bullets wrap, stop at tiles, and expire; player hits arrive in Sprint 3.', low: 'Slow, easier-to-read bullets.', high: 'Fast bullets that cover more arena before expiry.' },
  BULLET_LIFETIME: { title: 'Bullet lifetime', unit: 's', min: 0.1, max: 0.8, step: 0.01, explanation: 'How long a bullet exists unless it hits a tile first.', low: 'Short-range shot.', high: 'Longer range; may cross the vertical seam more than once.' },
};
export function setupAbilityTuning(reset: () => void) {
  const fields = document.querySelector('#ability-fields')!;
  const feedback = document.querySelector('#ability-feedback')!;
  const inputs = new Map<keyof AbilityConstants, HTMLInputElement>();
  for (const key of Object.keys(settings) as (keyof AbilityConstants)[]) {
    const info = settings[key];
    const card = document.createElement('div'); card.className = 'tuning-field';
    const heading = document.createElement('div'); heading.className = 'tuning-heading';
    const label = document.createElement('label'); label.htmlFor = `ability-${key}`;
    const title = document.createElement('strong'); title.textContent = info.title;
    const name = document.createElement('span'); name.className = 'tuning-key'; name.textContent = key; label.append(title, name);
    const input = document.createElement('input'); input.id = label.htmlFor; input.type = 'number'; input.value = String(abilities[key]);
    input.min = String(info.min); input.max = String(info.max); input.step = String(info.step); input.setAttribute('aria-label', key);
    const help = document.createElement('div'); help.className = 'tuning-help'; help.id = `ability-help-${key}`; input.setAttribute('aria-describedby', help.id);
    const range = document.createElement('p'); range.className = 'tuning-range'; range.textContent = `Min ${info.min} · Max ${info.max} ${info.unit} · Default ${DEFAULT_ABILITIES[key]} ${info.unit}`;
    const explanation = document.createElement('p'); explanation.textContent = info.explanation;
    const effects = document.createElement('dl'); effects.className = 'tuning-effects';
    for (const [term, effect] of [[`Minimum (${info.min})`, info.low], [`Maximum (${info.max})`, info.high]]) {
      const row = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = term!;
      const dd = document.createElement('dd'); dd.textContent = effect!; row.append(dt, dd); effects.append(row);
    }
    help.append(range, explanation, effects); heading.append(label, input); card.append(heading, help); fields.append(card); inputs.set(key, input);
    const apply = (commit: boolean) => {
      const value = Number(input.value);
      if (!input.value || !Number.isFinite(value) || value < info.min || value > info.max || (key === 'AMMO' && !Number.isInteger(value))) {
        if (commit) input.value = String(abilities[key]); feedback.textContent = 'Choose a value within the displayed range.'; return;
      }
      if (abilities[key] === value) return;
      abilities[key] = value; reset(); feedback.textContent = 'Dash / boot tuning updated; resources reset.';
    };
    input.addEventListener('input', () => apply(false)); input.addEventListener('change', () => apply(true));
  }
  document.querySelector<HTMLInputElement>('#dash-enabled')!.addEventListener('change', (event) => {
    dashEnabled = (event.target as HTMLInputElement).checked; reset(); feedback.textContent = dashEnabled ? 'Dash enabled.' : 'Dash disabled for comparison.';
  });
  document.querySelector('#reset-abilities')!.addEventListener('click', () => {
    Object.assign(abilities, DEFAULT_ABILITIES); dashEnabled = true;
    document.querySelector<HTMLInputElement>('#dash-enabled')!.checked = true;
    for (const [key, input] of inputs) input.value = String(abilities[key]); reset(); feedback.textContent = 'Default dash and boot restored.';
  });
}
