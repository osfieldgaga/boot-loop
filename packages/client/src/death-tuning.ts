import { musicSettings } from './music-lab';
import { DEFAULT_ABILITIES, MATCH_MOVEMENT } from '@boot-loop/shared';
import { activeBulletPadding } from './combat-tuning';
import { abilities, dashEnabled } from './abilities-tuning';
import { constants } from './tuning';
import { currentArena, party } from './party';
import { deathConfig, DEFAULT_DEATH_EFFECTS } from './death-config';
import type { DeathConfig } from './death-config';
const settings: Record<keyof DeathConfig, { title: string; min: number; max: number; step: number; unit: string; description: string; low: string; high: string }> = {
  PARTICLE_COUNT: { title: 'Particle count', min: 4, max: 64, step: 1, unit: 'sparks', description: 'Number of sparks in each death burst.', low: 'Small, sparse pop.', high: 'Dense, messy explosion.' },
  PARTICLE_LIFETIME: { title: 'Particle duration', min: 100, max: 1500, step: 10, unit: 'ms', description: 'How long sparks spread and fade. 1000 ms is one second.', low: 'Very quick pop.', high: 'Long trails that linger for 1.5 seconds.' },
  PARTICLE_SPEED: { title: 'Burst spread speed', min: 10, max: 160, step: 1, unit: 'px/s', description: 'How fast sparks travel away from the player. Sparks wrap at arena edges.', low: 'Tight burst near the player.', high: 'Wide burst crossing more of the arena.' },
  PARTICLE_GRAVITY: { title: 'Spark downward pull', min: 0, max: 400, step: 10, unit: 'px/s²', description: 'Pulls sparks downward as the burst ages; this never changes player gravity.', low: 'Sparks fly in straight lines.', high: 'Sparks curve downward quickly.' },
  PARTICLE_SIZE: { title: 'Largest spark size', min: 1, max: 4, step: 1, unit: 'px', description: 'Maximum square size of sparks. Smaller sparks remain mixed into the burst.', low: 'All sparks are tiny single pixels.', high: 'Chunky sparks that are easier to see.' },
  SHAKE_DURATION: { title: 'Camera shake duration', min: 0, max: 400, step: 10, unit: 'ms', description: 'How long the arena shakes after a death. Reduced-motion preference always disables shake.', low: '0 turns shake off.', high: 'Longer, more noticeable shake.' },
  SHAKE_STRENGTH: { title: 'Camera shake strength', min: 0, max: 4, step: 0.1, unit: 'world px', description: 'Maximum shake distance in game-world pixels, enlarged by the display scale.', low: '0 turns shake off.', high: 'Strong wobble of up to 4 world pixels.' },
  MESSAGE_DURATION: { title: 'Death joke duration', min: 300, max: 4000, step: 100, unit: 'ms', description: 'How long the teasing death message stays on screen.', low: 'Quick flash; easy to miss.', high: 'Joke stays for four seconds.' },
};
export function setupDeathTuning(preview: () => void) {
  const fields = document.querySelector('#death-fields')!;
  const feedback = document.querySelector('#death-feedback')!;
  const controls = new Map<keyof DeathConfig, HTMLInputElement[]>();
  for (const key of Object.keys(settings) as (keyof DeathConfig)[]) {
    const info = settings[key], card = document.createElement('div'); card.className = 'tuning-field';
    const heading = document.createElement('div'); heading.className = 'tuning-heading';
    const label = document.createElement('label'); label.htmlFor = `death-${key}`;
    const title = document.createElement('strong'); title.textContent = info.title; label.append(title);
    const number = document.createElement('input'); number.type = 'number'; number.id = label.htmlFor;
    const slider = document.createElement('input'); slider.type = 'range'; slider.className = 'death-slider'; slider.id = `death-slider-${key}`;
    const help = document.createElement('div'); help.className = 'tuning-help'; help.id = `death-help-${key}`;
    const range = document.createElement('p'); range.className = 'tuning-range'; range.textContent = `Min ${info.min} · Max ${info.max} ${info.unit} · Step ${info.step} · Default ${DEFAULT_DEATH_EFFECTS[key]}`;
    const explanation = document.createElement('p'); explanation.textContent = info.description;
    const effects = document.createElement('dl'); effects.className = 'tuning-effects';
    for (const [term, effect] of [['Minimum', info.low], ['Maximum', info.high]]) {
      const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = term!; dd.textContent = effect!; row.append(dt, dd); effects.append(row);
    }
    help.append(range, explanation, effects);
    for (const input of [number, slider]) {
      input.min = String(info.min); input.max = String(info.max); input.step = String(info.step); input.value = String(deathConfig[key]);
      input.setAttribute('aria-label', info.title + (input === slider ? ' slider' : ''));
      input.setAttribute('aria-describedby', help.id);
      const apply = (commit: boolean) => {
        const value = Number(input.value);
        if (!input.value || !Number.isFinite(value) || value < info.min || value > info.max || Math.abs((value - info.min) / info.step - Math.round((value - info.min) / info.step)) > 1e-7) {
          if (commit) input.value = String(deathConfig[key]); feedback.textContent = 'Choose a value within the displayed range and step.'; return;
        }
        deathConfig[key] = value;
        for (const other of [number, slider]) if (other !== input) other.value = String(value);
        feedback.textContent = 'Death effect updated for this browser. Try the preview to compare.';
      };
      input.addEventListener('input', () => apply(false)); input.addEventListener('change', () => apply(true));
      input.addEventListener('blur', () => apply(true));
    }
    heading.append(label, number); card.append(heading, slider, help); fields.append(card); controls.set(key, [number, slider]);
  }
  document.querySelector('#preview-death-tuning')!.addEventListener('click', preview);
  document.querySelector('#reset-death')!.addEventListener('click', () => {
    Object.assign(deathConfig, DEFAULT_DEATH_EFFECTS);
    for (const [key, inputs] of controls) for (const input of inputs) input.value = String(deathConfig[key]);
    feedback.textContent = 'Default death feedback restored.';
  });
  document.querySelector('#export-all-configs')!.addEventListener('click', () => {
    const online = Boolean(party.room);
    const data = { version: 2, scope: online ? 'online' : 'practice',
      movement: { ...(online ? MATCH_MOVEMENT : constants) },
      abilities: { ...(online ? DEFAULT_ABILITIES : abilities) }, dashEnabled: online ? true : dashEnabled,
      deathEffects: { ...deathConfig }, presentation: { music: { ...musicSettings }, soundEnabled: document.querySelector('#mute-audio')?.getAttribute('aria-pressed') !== 'true' },
      match: { arenaId: currentArena().id, mode: party.snapshot?.mode ?? 'timed', startingStocks: party.snapshot?.startingStocks ?? 3, durationSeconds: party.snapshot?.duration ?? 120, bulletHitPaddingPx: activeBulletPadding() },
    };
    const json = JSON.stringify(data, null, 2);
    document.querySelector<HTMLTextAreaElement>('#all-config-json')!.value = json;
    document.querySelector<HTMLElement>('#all-config-copy')!.hidden = false;
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'boot-loop-all-configs.json'; link.hidden = true; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.querySelector('#all-config-feedback')!.textContent = 'All settings exported in one JSON. Online exports include the actual shared movement and boot settings.';
  });
}
