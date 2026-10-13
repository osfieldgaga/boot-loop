import { DEFAULT_CONSTANTS } from '@boot-loop/shared';
import type { MovementConstants } from '@boot-loop/shared';
import heavy2 from '../../../tuning/boot-loop-movement-heavy2-10.05.26.json';
import heavy2Snappy from '../../../tuning/boot-loop-movement-heavy2-snappy-10.05.26.json';
export const constants: MovementConstants = { ...heavy2Snappy.constants };
const limits: Record<keyof MovementConstants, [number, number, number]> = {
  MAX_RUN: [10, 200, 1], RUN_ACCEL: [100, 2500, 10], RUN_REDUCE: [50, 1500, 10], AIR_MULT: [0.1, 1, 0.05],
  GRAVITY: [200, 1800, 10], MAX_FALL: [50, 350, 1], HALF_GRAV_THRESHOLD: [0, 100, 1],
  JUMP_SPEED: [-250, -30, 1], JUMP_H_BOOST: [0, 100, 1], VAR_JUMP_TIME: [0, 0.35, 0.01],
  COYOTE_TIME: [0, 0.2, 0.01], JUMP_BUFFER: [0, 0.2, 0.01], JUMP_CUT_SPEED: [-100, 0, 1],
  CORNER_CORRECTION: [0, 4, 1], STEP_UP: [0, 2, 1],
};
type TuningHelp = { title: string; unit: string; description: string; minimum: string; maximum: string; note?: string };
const help: Record<keyof MovementConstants, TuningHelp> = {
  MAX_RUN: { title: 'Running speed', unit: 'px/s', description: 'The horizontal speed you aim for while holding left or right. A jump boost can briefly exceed it.', minimum: 'Slow movement across the arena.', maximum: 'Fast movement across the arena.' },
  RUN_ACCEL: { title: 'Acceleration and braking', unit: 'px/s²', description: 'How quickly you reach running speed, stop when you release movement, or reverse direction.', minimum: 'Slow starts, long stops, and wide turns.', maximum: 'Quick starts, short stops, and sharp turns.' },
  RUN_REDUCE: { title: 'Jump boost slowdown', unit: 'px/s²', description: 'How quickly extra horizontal speed fades while you keep moving in the same direction above running speed.', minimum: 'Extra speed carries you farther.', maximum: 'Extra speed fades quickly.', note: 'Regular stopping and reversing use Acceleration and braking instead.' },
  AIR_MULT: { title: 'Air steering', unit: '×', description: 'Multiplies acceleration, braking, and boost slowdown while airborne. 1 means the same response as on the ground.', minimum: '10% of the ground response: sluggish steering and more momentum.', maximum: '100% of the ground response: quick steering and braking.' },
  GRAVITY: { title: 'Gravity', unit: 'px/s²', description: 'How quickly downward speed builds once the initial jump hold ends. Also pulls you out of your upward motion.', minimum: 'Gentle pull: floatier, longer jumps.', maximum: 'Strong pull: shorter airtime and quicker drops.' },
  MAX_FALL: { title: 'Maximum falling speed', unit: 'px/s', description: 'The fastest downward speed gravity can build up to. Changes the speed of falling and vertical loops.', minimum: 'Slow descent, even after a long fall.', maximum: 'Fast descent once gravity has built up enough speed.' },
  HALF_GRAV_THRESHOLD: { title: 'Float near the jump peak', unit: 'px/s', description: 'While jump is held, gravity is halved when your vertical speed is below this amount, rising or falling.', minimum: '0 disables this extra float.', maximum: 'A wider part of the jump gets gentler gravity and more float.' },
  JUMP_SPEED: { title: 'Jump launch speed', unit: 'px/s', description: 'The upward speed at the start of a jump. Negative means upward: a more negative number makes a stronger jump.', minimum: '−250: strong launch, usually a much higher jump.', maximum: '−30: weak launch, usually a much lower jump.' },
  JUMP_H_BOOST: { title: 'Sideways jump boost', unit: 'px/s', description: 'Extra horizontal speed added when you jump while holding left or right.', minimum: '0 adds no sideways boost.', maximum: '100 adds a strong sideways kick.', note: 'Jump boost slowdown determines how quickly this extra speed fades.' },
  VAR_JUMP_TIME: { title: 'Jump hold duration', unit: 's', description: 'How long holding jump can maintain the initial upward speed. Release during this window to shorten the jump.', minimum: '0 disables the initial speed hold and early-release cut.', maximum: '0.35 seconds of upward speed hold: higher held jumps.', note: 'At 0, holding jump can still trigger the separate float near the peak.' },
  COYOTE_TIME: { title: 'Jump after leaving a ledge', unit: 's', description: 'How late you may press jump after walking off a platform and still jump.', minimum: '0: you must still be on the ground.', maximum: '0.2 seconds (200 ms) of forgiveness after leaving a ledge.' },
  JUMP_BUFFER: { title: 'Jump before landing', unit: 's', description: 'Landing-jump memory used by the Sprint 1 movement system. In this shared-button lab, airborne presses fire instead, so they do not buffer a landing jump.', minimum: 'No visible change in this lab: shot presses are not buffered.', maximum: 'No visible change in this lab: shot presses are not buffered.' },
  JUMP_CUT_SPEED: { title: 'Early-release upward speed', unit: 'px/s', description: 'Limits your remaining upward speed when you release jump during the jump hold window. Negative means upward.', minimum: '−100 preserves more upward motion: a gentler cut.', maximum: '0 cancels upward speed immediately: a sharper, shorter hop.', note: 'Only works during Jump hold duration. It never adds upward speed, so −100 does nothing if you are already rising slower than that.' },
  CORNER_CORRECTION: { title: 'Ceiling corner forgiveness', unit: 'px', description: 'The maximum sideways nudge allowed to clear a ceiling corner while rising, if there is clear space.', minimum: '0: no nudge; clipping a corner stops your rise.', maximum: 'Up to 4 pixels of sideways help to clear a corner.' },
  STEP_UP: { title: 'Small ledge step-up', unit: 'px', description: 'The maximum height you can step up automatically while moving along the ground.', minimum: '0: no automatic step-up.', maximum: 'Climb a lip up to 2 pixels high without jumping.', note: 'Usually little visible effect on this map: a full tile is 8 pixels high, beyond this 2-pixel limit.' },
};
const fields = document.querySelector<HTMLDivElement>('#tuning-fields')!;
const feedback = document.querySelector<HTMLParagraphElement>('#tuning-feedback')!;
const inputs = new Map<keyof MovementConstants, HTMLInputElement>();
function sync() { for (const [key, input] of inputs) input.value = String(constants[key]); }
export function setupTuning(resetPlayer: () => void) {
  for (const key of Object.keys(constants) as (keyof MovementConstants)[]) {
    const info = help[key];
    const card = document.createElement('div'); card.className = 'tuning-field';
    const heading = document.createElement('div'); heading.className = 'tuning-heading';
    const label = document.createElement('label'); label.htmlFor = `tuning-${key}`;
    const title = document.createElement('strong'); title.textContent = info.title;
    const code = document.createElement('span'); code.className = 'tuning-key'; code.textContent = key;
    label.append(title, code);
    const input = document.createElement('input'); input.type = 'number'; input.name = key; input.id = label.htmlFor; input.setAttribute('aria-label', key);
    const [min, max, increment] = limits[key]; input.min = String(min); input.max = String(max); input.step = String(increment); input.value = String(constants[key]);
    const description = document.createElement('div'); description.id = `help-${key}`; description.className = 'tuning-help';
    input.setAttribute('aria-describedby', description.id);
    const range = document.createElement('p'); range.className = 'tuning-range';
    range.textContent = `Min ${min} · Max ${max} ${info.unit} · Default ${DEFAULT_CONSTANTS[key]} ${info.unit}`;
    const explanation = document.createElement('p'); explanation.textContent = info.description;
    const effects = document.createElement('dl'); effects.className = 'tuning-effects';
    for (const [name, value, effect] of [['Minimum', min, info.minimum], ['Maximum', max, info.maximum]] as const) {
      const row = document.createElement('div');
      const term = document.createElement('dt'); term.textContent = `${name} (${value})`;
      const detail = document.createElement('dd'); detail.textContent = effect;
      row.append(term, detail); effects.append(row);
    }
    description.append(range, explanation, effects);
    if (info.note) { const note = document.createElement('p'); note.className = 'tuning-note'; note.textContent = info.note; description.append(note); }
    heading.append(label, input); card.append(heading, description);
    const applyValue = (commit: boolean) => {
      const value = Number(input.value);
      if (input.value === '' || !Number.isFinite(value) || value < min || value > max || ((key === 'CORNER_CORRECTION' || key === 'STEP_UP') && !Number.isInteger(value))) {
        if (commit) input.value = String(constants[key]);
        feedback.textContent = 'Choose a value within the displayed range.'; return;
      }
      if (constants[key] === value) return;
      constants[key] = value; feedback.textContent = 'Tuning updated.'; resetPlayer();
    };
    input.addEventListener('input', () => applyValue(false));
    input.addEventListener('change', () => applyValue(true));
    fields.append(card); inputs.set(key, input);
  }
  for (const [id, preset, name] of [['load-heavy2', heavy2, 'Heavy2 original'], ['load-heavy2-snappy', heavy2Snappy, 'Heavy2 snappier']] as const) {
    document.querySelector(`#${id}`)!.addEventListener('click', () => {
      Object.assign(constants, preset.constants); sync(); resetPlayer(); feedback.textContent = `${name} loaded.`;
    });
  }
  feedback.textContent = 'Heavy2 snappier loaded for review. Use the preset buttons to compare with Heavy2 original.';
  document.querySelector('#reset-tuning')!.addEventListener('click', () => { Object.assign(constants, DEFAULT_CONSTANTS); sync(); resetPlayer(); feedback.textContent = 'Default movement restored.'; });
  document.querySelector('#export-tuning')!.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, constants }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'boot-loop-movement.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); feedback.textContent = 'Preset exported. Share it with your movement feedback.';
  });
  document.querySelector<HTMLInputElement>('#import-tuning')!.addEventListener('change', async (event) => {
    const field = event.target as HTMLInputElement; const file = field.files?.[0]; if (!file) return;
    try {
      if (file.size > 16000) throw new Error('Too large');
      const data = JSON.parse(await file.text()) as { version?: number; constants?: Record<string, unknown> };
      if (data.version !== 1 || !data.constants) throw new Error('Invalid format');
      const next: MovementConstants = { ...DEFAULT_CONSTANTS };
      for (const key of Object.keys(next) as (keyof MovementConstants)[]) {
        const value = data.constants[key]; const [min, max] = limits[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || ((key === 'CORNER_CORRECTION' || key === 'STEP_UP') && !Number.isInteger(value))) throw new Error('Invalid value');
        next[key] = value;
      }
      Object.assign(constants, next); sync(); resetPlayer(); feedback.textContent = 'Preset imported.';
    } catch { feedback.textContent = 'Could not import this preset. Use an exported Boot Loop movement file.'; }
    field.value = '';
  });
}
