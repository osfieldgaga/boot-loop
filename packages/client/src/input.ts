import type { PlayerInput } from '@boot-loop/shared';
export class InputState {
  private keys = new Set<string>();
  private jumpPending = false;
  private dashPending: -1 | 1 | undefined;
  private lastTap: { direction: -1 | 1; time: number } | undefined;
  private direction(code: string): -1 | 0 | 1 { return code === 'KeyA' || code === 'ArrowLeft' ? -1 : code === 'KeyD' || code === 'ArrowRight' ? 1 : 0; }
  private isJump(code: string) { return code === 'Space' || code === 'KeyZ'; }
  press(code: string, time = performance.now()) {
    const direction = this.direction(code);
    const alreadyHeld = direction !== 0 && [...this.keys].some((key) => this.direction(key) === direction);
    if (direction && !alreadyHeld) {
      if (this.lastTap?.direction === direction && time - this.lastTap.time <= 220 && time >= this.lastTap.time) {
        this.dashPending = direction; this.lastTap = undefined;
      } else this.lastTap = { direction, time };
    }
    if (this.isJump(code) && !this.keys.has('Space') && !this.keys.has('KeyZ')) this.jumpPending = true;
    this.keys.add(code);
  }
  release(code: string) { this.keys.delete(code); }
  clear() { this.keys.clear(); this.jumpPending = false; this.dashPending = undefined; this.lastTap = undefined; }
  sample(): PlayerInput {
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const result: PlayerInput = { x: left === right ? 0 : left ? -1 : 1, jumpHeld: this.keys.has('Space') || this.keys.has('KeyZ'), jumpPressed: this.jumpPending };
    if (this.dashPending !== undefined) result.dashDirection = this.dashPending;
    this.dashPending = undefined; this.jumpPending = false; return result;
  }
}
export class KeyboardController {
  readonly state = new InputState();
  private targetIsEditable(event: KeyboardEvent) { return event.target instanceof HTMLElement && (event.target.matches('input,textarea,select,button,summary') || event.target.isContentEditable); }
  private controlled = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'KeyZ', 'KeyR', 'Backquote']);
  constructor(private reset: () => void, private toggleDebug: () => void) {
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', this.visibility);
  }
  private keydown = (event: KeyboardEvent) => {
    if (this.targetIsEditable(event) || !this.controlled.has(event.code)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'KeyR') this.reset();
    else if (event.code === 'Backquote') this.toggleDebug();
    else this.state.press(event.code);
  };
  private keyup = (event: KeyboardEvent) => { this.state.release(event.code); if (!this.targetIsEditable(event) && this.controlled.has(event.code)) event.preventDefault(); };
  private clear = () => this.state.clear();
  private visibility = () => { if (document.hidden) this.clear(); };
  destroy() {
    window.removeEventListener('keydown', this.keydown); window.removeEventListener('keyup', this.keyup);
    window.removeEventListener('blur', this.clear); document.removeEventListener('visibilitychange', this.visibility);
  }
}

