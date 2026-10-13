import type { AbilityState } from '@boot-loop/shared';
/** User-supplied shooting sample plus original procedural cues. Audio is created only after a user gesture. */
export class FeedbackAudio {
  private context?: AudioContext;
  private muted = false;
  private shotBuffer?: AudioBuffer;
  private shotLoading = false;
  private shotData = fetch(new URL('../../../assets/sounds/shoot.mp3', import.meta.url))
    .then(response => { if (!response.ok) throw new Error('Shot sample unavailable'); return response.arrayBuffer(); })
    .catch(() => undefined);
  private activeShots = new Set<AudioBufferSourceNode>();
  private previous = new Map<string, { shots: number; alive: boolean; dashing: boolean; grounded: boolean; jumping: boolean; kills: number }>();
  constructor() {
    const unlock = () => { this.context ??= new AudioContext(); void this.context.resume().catch(() => {});
      if (!this.shotLoading) {
        this.shotLoading = true;
        void this.shotData.then(async data => { if (data) this.shotBuffer = await this.context!.decodeAudioData(data); }).catch(() => {});
      } };
    document.addEventListener('pointerdown', unlock); document.addEventListener('keydown', unlock);
    const button = document.querySelector<HTMLButtonElement>('#mute-audio')!;
    button.addEventListener('click', () => { this.muted = !this.muted; if (this.muted) for (const source of this.activeShots) source.stop(); button.textContent = this.muted ? 'Sound: off' : 'Sound: on'; button.setAttribute('aria-pressed', String(this.muted)); document.dispatchEvent(new CustomEvent('audio-mute', { detail: this.muted })); });
  }
  reset() { this.previous.clear(); }
  play(kind: 'shot' | 'death' | 'dash' | 'respawn' | 'stomp' | 'jump' | 'land' | 'kill') {
    const ctx = this.context; if (!ctx || ctx.state !== 'running' || this.muted) return;
    if (kind === 'shot' && this.shotBuffer) {
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = this.shotBuffer; gain.gain.value = 0.65;
      source.connect(gain); gain.connect(ctx.destination);
      this.activeShots.add(source);
      source.onended = () => { this.activeShots.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(); return;
    }
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    // Stepped square-wave pitches give the core actions a tiny console-style voice.
    const cues = {
      jump: { notes: [180, 720], step: 0.09, duration: 0.16, volume: 0.12 },
      kill: { notes: [110, 220, 880, 1175], step: 0.035, duration: 0.2, volume: 0.065 },
      shot: { notes: [1047, 523, 262, 131], step: 0.015, duration: 0.075, volume: 0.025 },
      land: { notes: [131, 98, 65], step: 0.015, duration: 0.065, volume: 0.018 },
      death: { notes: [140, 100, 70], step: 0.03, duration: 0.11, volume: 0.025 },
      dash: { notes: [300, 240, 150], step: 0.03, duration: 0.11, volume: 0.025 },
      respawn: { notes: [523, 659, 784], step: 0.03, duration: 0.11, volume: 0.025 },
      stomp: { notes: [90, 65, 45], step: 0.03, duration: 0.11, volume: 0.025 },
    }[kind];
    oscillator.type = 'square';
    if (kind === 'jump') {
      // Original arcade boing: quick rising sweep with a little falling tail.
      oscillator.frequency.setValueAtTime(180, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.09);
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    } else cues.notes.forEach((pitch, i) => oscillator.frequency.setValueAtTime(pitch, ctx.currentTime + i * cues.step));
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(cues.volume, ctx.currentTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cues.duration);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + cues.duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  observe(players: { id: string; shots: number; kills?: number; alive: boolean; state: AbilityState }[], localId = '') {
    const next = new Map<string, { shots: number; alive: boolean; dashing: boolean; grounded: boolean; jumping: boolean; kills: number }>();
    for (const p of players) {
      const before = this.previous.get(p.id), dashing = p.state.dashTimer > 0;
      const grounded = p.state.player.grounded, jumping = p.state.player.variableJumpTimer > 0;
      if (before && p.id === localId && (p.kills ?? 0) > before.kills) this.play('kill');
      if (before?.alive && p.alive && !before.jumping && jumping && !grounded) this.play('jump');
      if (before?.alive && p.alive && !before.grounded && grounded) this.play('land');
      if (before && p.shots > before.shots) this.play('shot');
      if (before && !before.dashing && dashing) this.play('dash');
      if (before && !before.alive && p.alive) this.play('respawn');
      next.set(p.id, { shots: p.shots, alive: p.alive, dashing, grounded, jumping, kills: p.kills ?? 0 });
    }
    this.previous = next;
  }
}
