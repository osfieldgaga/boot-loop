import { InputState } from './input';
/** Separate pointer state lets a finger release without releasing a held keyboard key. */
export function setupScreenControls() {
  const state = new InputState();
  const active = new Map<HTMLElement, Set<string>>();
  const clear = () => { active.clear(); state.clear(); document.querySelectorAll<HTMLElement>('[data-control]').forEach(b => b.dataset.held = 'false'); };
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-control]')) {
    const code = button.dataset.control!;
    const press = (id: string) => {
      const sources = active.get(button) ?? new Set<string>();
      if (!sources.size) {
        state.press(code);
      }
      sources.add(id); active.set(button, sources); button.dataset.held = 'true';
    };
    const release = (id: string) => {
      const sources = active.get(button); sources?.delete(id);
      if (!sources?.size) { active.delete(button); state.release(code); button.dataset.held = 'false'; }
    };
    button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); press(`p${e.pointerId}`); });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(name, e => release(`p${e.pointerId}`));
    button.addEventListener('keydown', e => { if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); if (!e.repeat) press(e.code); } });
    button.addEventListener('keyup', e => release(e.code));
    button.addEventListener('blur', () => { release('Space'); release('Enter'); });
  }
  window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
  return { state, clear };
}
