import Phaser from 'phaser';
import { ScatterBoots, activeBoot, PLAYER_IDENTITIES, createAbilityState, canStomp, interpolateWrapped, stepAbilities, TOYBOX_ARENA, WORLD_HEIGHT, WORLD_WIDTH } from '@boot-loop/shared';
import { KeyboardController } from './input';
import { FixedClock } from './clock';
import { DeathEffects, drawArena, drawPlayerCopies, RectangleProvider } from './rendering';
import { connect, connection } from './network';
import { constants, setupTuning } from './tuning';
import { abilities, dashEnabled, setupAbilityTuning } from './abilities-tuning';
import { drawScatterPickup, drawProjectiles } from './rendering';
import { setupDeathTuning } from './death-tuning';
import { deathConfig } from './death-config';
import { MatchHud } from './match-hud';
import { deathTaunt } from './death-effects';
import { currentArena, estimatedMatchTick, confirmedDeaths, onlineTick, party, setupParty, updatePartyClock } from './party';
import { activeBulletPadding, setupCombatTuning } from './combat-tuning';
import { FeedbackAudio } from './feedback-audio';
import { setupOnboarding } from './onboarding';
import { setupScreenControls } from './screen-controls';
import { PlayerAnimations } from './player-animation';
import { ActionEffects } from './action-effects';
import { setupMusicLab } from './music-lab';
import { setupGameUI } from './game-ui';
import { dashReadyNoticeVisible } from './dash-feedback';
import './style.css';

const developerView = document.documentElement.dataset.view === 'dev';
const debug = document.querySelector<HTMLDetailsElement>('#debug')!;
const showHitboxes = document.querySelector<HTMLInputElement>('#show-hitboxes')!;
const telemetry = document.querySelector<HTMLPreElement>('#telemetry')!;
const motion = document.querySelector<HTMLSpanElement>('#motion-status')!;
const frameClock = new FixedClock();

class Playground extends Phaser.Scene {
  private state = createAbilityState(TOYBOX_ARENA.spawns[0]!, abilities);
  private get player() { return this.state.player; }
  private previous = { ...this.player };
  private keyboard!: KeyboardController;
  private playerGraphics!: Phaser.GameObjects.Graphics;
  private remoteGraphics: Phaser.GameObjects.Graphics[] = [];
  private providers = PLAYER_IDENTITIES.map(p => new RectangleProvider(p.color));
  private practiceScatter = new ScatterBoots();
  private practiceTick = 0;
  private drawnArena = '';
  private refreshArena() {
    const arena = currentArena();
    if (!this.arenaGraphics || this.drawnArena === arena.id) return;
    this.drawnArena = arena.id; drawArena(this.arenaGraphics, arena.world);
    this.practiceScatter.setSpots(arena.pickupSpots, this.practiceTick);
    this.actionEffects?.clear(); this.deathEffects?.clear(); this.matchHud?.clear();
  }
  private pickupGraphics!: Phaser.GameObjects.Graphics;
  private bulletGraphics!: Phaser.GameObjects.Graphics;
  private arenaGraphics!: Phaser.GameObjects.Graphics;
  private lastTelemetry = 0;
  private deathEffects!: DeathEffects;
  private actionEffects!: ActionEffects;
  private animations = new PlayerAnimations();
  private animationGeneration = '';
  private matchHud!: MatchHud;
  private previewDeaths = 0;
  private effectsRoom = '';
  private hudPhase = '';
  private audio!: FeedbackAudio;
  private screenControls!: ReturnType<typeof setupScreenControls>;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  constructor() { super('playground'); }
  create() {
    setupGameUI(); this.audio = new FeedbackAudio(); setupOnboarding(); this.screenControls = setupScreenControls(); setupMusicLab(developerView);
    this.arenaGraphics = this.add.graphics(); drawArena(this.arenaGraphics, TOYBOX_ARENA);
    this.pickupGraphics = this.add.graphics();
    this.bulletGraphics = this.add.graphics();
    this.remoteGraphics = PLAYER_IDENTITIES.map(() => this.add.graphics());
    this.playerGraphics = this.add.graphics();
    this.actionEffects = new ActionEffects(this.add.graphics());
    this.deathEffects = new DeathEffects(this.add.graphics());
    this.matchHud = new MatchHud(this.add.graphics());
    this.keyboard = new KeyboardController(() => this.resetPlayer(), () => { if (developerView) debug.open = !debug.open; });
    document.querySelector('#reset-player')!.addEventListener('click', () => { this.resetPlayer(); document.querySelector<HTMLElement>('#game')!.focus(); });
    document.querySelector('#game')!.addEventListener('pointerdown', () => document.querySelector<HTMLElement>('#game')!.focus());
    if (developerView) {
      setupTuning(() => this.resetPlayer());
      setupAbilityTuning(() => this.resetPlayer());
      setupCombatTuning();
    }
    setupParty(() => this.resetPlayer());
    const previewDeath = () => {
      document.querySelector('#game')!.scrollIntoView({ block: 'center', behavior: 'auto' });
      requestAnimationFrame(() => {
      if (!party.room) this.deathBurst(this.player.x, this.player.y, 0xffc857);
      else this.deathBurst(this.player.x, this.player.y, PLAYER_IDENTITIES[party.snapshot?.players.find(p => p.id === party.id)?.slot ?? 0]!.color);
      const slot = party.snapshot?.players.find(p => p.id === party.id)?.slot ?? 0;
      this.matchHud.taunt(deathTaunt(slot, ++this.previewDeaths, true), slot, this.time.now);
      });
    };
    document.querySelector('#preview-death')!.addEventListener('click', previewDeath);
    if (developerView) document.querySelector('#preview-impact')!.addEventListener('click', () => {
      if (party.room) return;
      document.querySelector('#game')!.scrollIntoView({ block: 'center' });
      document.querySelector<HTMLElement>('#game')!.focus();
      this.actionEffects.impact(156, 178);
    });
    if (developerView) for (const mode of ['scatter', 'turbo', 'ricochet'] as const) {
      document.querySelector(`#preview-${mode}`)!.addEventListener('click', () => {
        if (party.room) return;
        this.resetPlayer();
        Object.assign(this.practiceScatter.state, { mode, pickup: null, activeUntil: 480, collector: 'practice', nextSpawnTick: 1800 });
        document.querySelector('#game')!.scrollIntoView({ block: 'center' });
        document.querySelector<HTMLElement>('#game')!.focus();
      });
    }

    if (developerView) setupDeathTuning(previewDeath);
    document.addEventListener('visibilitychange', () => { frameClock.reset(); this.previous = { ...this.player }; });
    window.addEventListener('blur', () => { frameClock.reset(); this.previous = { ...this.player }; });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.keyboard.destroy());
    // Read-only snapshot for repeatable browser verification and diagnostics.
    Object.defineProperty(window, 'bootLoop', { configurable: true, value: {
      snapshot: () => ({ player: { ...this.player }, ammo: this.state.ammo, dashTimer: this.state.dashTimer, shots: this.state.shots, abilities: { ...abilities }, dashEnabled, constants: { ...constants }, connection: { ...connection } }),
    } });
  }
  private deathBurst(x: number, y: number, color: number) {
    this.deathEffects.burst(x, y, color); this.audio.play('death');
    if (!this.reducedMotion.matches && deathConfig.SHAKE_DURATION > 0 && deathConfig.SHAKE_STRENGTH > 0)
      this.cameras.main.shake(deathConfig.SHAKE_DURATION, new Phaser.Math.Vector2(deathConfig.SHAKE_STRENGTH / WORLD_WIDTH, deathConfig.SHAKE_STRENGTH / WORLD_HEIGHT), false);
  }
  resetPlayer() { this.state = party.room && party.predicted ? party.predicted : createAbilityState(currentArena().world.spawns[0]!, abilities); this.refreshArena(); this.previous = { ...this.player }; this.keyboard?.state.clear(); this.screenControls?.clear(); this.actionEffects?.clear(); this.animations.clear(); this.practiceTick = 0; this.practiceScatter.reset(0); if (!party.room) this.audio?.reset(); frameClock.reset(); }
  update(time: number, delta: number) {
    this.refreshArena();
    const alpha = document.hidden ? 0 : frameClock.advance(delta / 1000, () => {
      this.previous = this.player;
      const keyboard = this.keyboard.state.sample(), pointer = this.screenControls.state.sample();
      const input = { x: Math.sign(keyboard.x + pointer.x) as -1 | 0 | 1,
        jumpPressed: keyboard.jumpPressed || pointer.jumpPressed, jumpHeld: keyboard.jumpHeld || pointer.jumpHeld,
        ...((keyboard.dashDirection ?? pointer.dashDirection) !== undefined ? { dashDirection: (keyboard.dashDirection ?? pointer.dashDirection)! } : {}) };
      if (party.room) this.state = onlineTick(input) ?? this.state;
      else {
        this.practiceScatter.advance(++this.practiceTick);
        this.state = stepAbilities(this.state, input, currentArena().world, constants, abilities, dashEnabled, true, activeBoot(this.practiceScatter.state, this.practiceTick), (x, y) => this.actionEffects.impact(x, y));
        this.practiceScatter.collect([{ id: 'practice', alive: true, x: this.player.x, y: this.player.y }], this.practiceTick);
      }
    });
    const x = Math.round(interpolateWrapped(this.previous.x, this.player.x, alpha, WORLD_WIDTH));
    const y = Math.round(interpolateWrapped(this.previous.y, this.player.y, alpha, WORLD_HEIGHT));
    this.audio.observe(party.snapshot ? party.snapshot.players.map(p => p.id === party.id ? { ...p, shots: this.state.shots, state: this.state } : p) : [{ id: 'practice', shots: this.state.shots, alive: true, state: this.state }], party.id);
    const snapshot = party.snapshot, mine = snapshot?.players.find(p => p.id === party.id);
    const generation = snapshot ? `${party.room?.roomId}:${snapshot.phase === 'lobby' || snapshot.phase === 'countdown' ? snapshot.phase : 'match'}` : 'practice';
    if (generation !== this.animationGeneration) { this.animations.clear(); this.animationGeneration = generation; }
    const actors = snapshot ? snapshot.players.map(p => p.id === party.id ? { ...p, shots: this.state.shots, state: this.state } : p)
      : [{ id: 'practice', shots: this.state.shots, alive: true, state: this.state }];
    this.animations.observe(actors, time);
    const localActor = actors.find(p => p.id === (snapshot ? party.id : 'practice'));
    const scatterState = snapshot?.scatter ?? this.practiceScatter.state;
    const scatterTick = snapshot ? estimatedMatchTick() : this.practiceTick;
    const scatter = (!snapshot || snapshot.phase === 'running') && activeBoot(scatterState, scatterTick);
    drawScatterPickup(this.pickupGraphics, scatterState.pickup, time, this.reducedMotion.matches, scatterState.mode);
    const localDashReadyNotice = dashReadyNoticeVisible(this.state, mine?.state);
    for (const graphics of this.remoteGraphics) graphics.clear();
    drawProjectiles(this.bulletGraphics, snapshot ? snapshot.bullets : this.state.projectiles);
    if (!mine || mine.alive) drawPlayerCopies(this.playerGraphics, this.providers[mine?.slot ?? 0]!, this.player, x, y,
      debug.open && showHitboxes.checked, this.state.dashTimer > 0, this.state.ammo, party.room ? 4 : abilities.AMMO, Boolean(mine && mine.protectedUntil > snapshot!.tick), activeBulletPadding(), this.state.reloadRemaining, this.state.dashCooldown, party.room ? 10 : abilities.DASH_COOLDOWN, time, dashEnabled || Boolean(party.room), (dashEnabled || Boolean(party.room)) && localDashReadyNotice, localActor ? this.animations.pose(localActor, time, this.reducedMotion.matches) : undefined, scatter);
    else this.playerGraphics.clear();
    if (snapshot) for (const remote of snapshot.players) {
      if (remote.id === party.id || !remote.alive) continue;
      const previous = party.previous?.players.find(p => p.id === remote.id);
      const amount = Math.min(1, Math.max(0, (performance.now() - party.receivedAt) / Math.max(16, party.receivedAt - party.previousAt)));
      const interpolate = party.previous?.arenaId === snapshot.arenaId && previous?.alive && previous.deaths === remote.deaths;
      const px = interpolate ? Math.round(interpolateWrapped(previous.state.player.x, remote.state.player.x, amount, WORLD_WIDTH)) : remote.state.player.x;
      const py = interpolate ? Math.round(interpolateWrapped(previous.state.player.y, remote.state.player.y, amount, WORLD_HEIGHT)) : remote.state.player.y;
      drawPlayerCopies(this.remoteGraphics[remote.slot]!, this.providers[remote.slot]!, remote.state.player, px, py, debug.open && showHitboxes.checked,
        remote.state.dashTimer > 0, remote.state.ammo, 4, remote.protectedUntil > snapshot.tick, activeBulletPadding(), remote.state.reloadRemaining, remote.state.dashCooldown, 10, time, true, remote.state.dashReadyRemaining > 0, this.animations.pose(remote, time, this.reducedMotion.matches), scatter);
    }
    const effectsRoom = party.room?.roomId ?? '';
    if (effectsRoom !== this.effectsRoom) {
      this.effectsRoom = effectsRoom;
      this.deathEffects.clear(); this.actionEffects.clear(); this.matchHud.clear(); this.cameras.main.shakeEffect.reset();
    }
    // Both clients consume the same confirmed victim deaths, including the killer.
    // Keep feedback queued across snapshots rather than gate it on a render tick.
    for (const death of confirmedDeaths.drain()) {
      if (death.message.includes('CRUSHED') || death.message.includes('FLATTENED') || death.message.includes('PANCAKE') || death.message.includes('HEIGHT WAR')) {
        this.actionEffects.stomp(death.x, death.y); this.audio.play('stomp');
      }
      this.deathBurst(death.x, death.y, PLAYER_IDENTITIES[death.slot]!.color);
      this.matchHud.taunt(death.message, death.slot, time);
    }
    this.actionEffects.observe(snapshot ? snapshot.players.map(p => p.id === party.id ? { ...p, shots: this.state.shots, state: this.state } : p) : [{ id: 'practice', shots: this.state.shots, alive: true, state: this.state }]);
    this.actionEffects.observeBounces(snapshot?.bounces ?? this.state.projectiles.filter(b => b.bounced).map(b => ({ key: `practice:${b.id}`, x: b.bounceX!, y: b.bounceY! })));
    this.actionEffects.observeImpacts(snapshot?.impacts.filter(i => i.tick >= snapshot.tick - 12) ?? []);
    this.actionEffects.draw(delta);
    this.deathEffects.draw(delta);
    if (snapshot?.phase !== this.hudPhase) {
      if (snapshot?.phase === 'countdown' || snapshot?.phase === 'lobby') { this.matchHud.clear(); this.audio.reset(); }
      this.hudPhase = snapshot?.phase ?? '';
    }
    this.matchHud.draw(snapshot, estimatedMatchTick(), time, snapshot ? undefined : this.practiceScatter.state, this.practiceTick, this.reducedMotion.matches);
    updatePartyClock();
    if (time - this.lastTelemetry > 100) {
      this.lastTelemetry = time;
      const dashOn = Boolean(party.room) || dashEnabled;
      const cooldownTotal = party.room ? 10 : abilities.DASH_COOLDOWN;
      document.querySelector('#ammo-status')!.textContent = `Ammo ${this.state.ammo}/${party.room ? 4 : abilities.AMMO}${this.state.reloadRemaining > 0 ? ` · Reloading ${this.state.reloadRemaining.toFixed(1)}s` : ''}`;
      const dashText = !dashOn ? 'Dash off' : localDashReadyNotice ? 'DASH READY!' : this.state.dashTimer > 0 ? 'Dashing' : this.state.dashCooldown > 0 ? `Dash ${this.state.dashCooldown.toFixed(1)}s` : 'Dash ready';
      document.querySelector('#resources')!.textContent = dashText;
      const dashIcon = document.querySelector<HTMLElement>('#dash-charge')!;
      dashIcon.style.setProperty('--charge', `${dashOn ? Math.max(0, 1 - this.state.dashCooldown / cooldownTotal) * 100 : 0}%`);
      dashIcon.classList.toggle('ready', dashOn && this.state.dashCooldown === 0);
      dashIcon.dataset.readyNotice = String(dashOn && localDashReadyNotice);
      dashIcon.setAttribute('aria-label', dashText); dashIcon.title = dashText;

      motion.textContent = snapshot && snapshot.phase !== 'running' ? snapshot.phase === 'lobby' ? 'Room ready' : snapshot.phase === 'countdown' ? 'Get ready' : 'Match finished' : mine && !mine.alive ? snapshot?.mode === 'stock' && mine.stocks === 0 ? 'Eliminated — watching' : 'Respawning' : this.state.dashTimer > 0 ? 'Dashing ↔' : this.state.shotThisTick ? 'Boot shot ↓' : this.player.grounded ? 'On your feet' : this.player.vy < 0 ? 'Going up ↑' : 'Looping down ↓';
      if (scatter) motion.textContent += ` · Everyone: ${scatterState.mode} boots ${Math.ceil(Math.max(0, scatterState.activeUntil - scatterTick) / 60)}s`;
      telemetry.textContent = [
        'position       ' + this.player.x + ', ' + this.player.y,
        'velocity       ' + this.player.vx.toFixed(1) + ', ' + this.player.vy.toFixed(1) + ' px/s',
        'grounded       ' + this.player.grounded,
        'coyote         ' + this.player.coyoteTimer.toFixed(3) + ' s',
        'jump buffer    ' + this.player.jumpBufferTimer.toFixed(3) + ' s',
        'variable jump  ' + this.player.variableJumpTimer.toFixed(3) + ' s',
        'local tick     ' + this.player.tick + ' / 60 Hz',
        'server tick    ' + (snapshot?.tick ?? connection.serverTick),
        'ping           ' + ((party.room ? party.ping : connection.ping) ?? '—') + ' ms',
        'prediction     ' + party.pending.length + ' unacknowledged inputs',
        'shared check   ' + (connection.sharedAgreement === null ? 'waiting' : connection.sharedAgreement ? 'client/server agree' : 'MISMATCH'),
        'render rate    ' + Math.round(this.game.loop.actualFps) + ' fps',
        'ammo           ' + this.state.ammo + ' / ' + abilities.AMMO,
        'accepted shots ' + (mine?.shots ?? this.state.shots),
        'shot cooldown  ' + this.state.shotCooldown.toFixed(3) + ' s',
        'dash active    ' + this.state.dashTimer.toFixed(3) + ' s',
        'dash charge    ' + this.state.dashCharge,
        'dash cooldown  ' + this.state.dashCooldown.toFixed(3) + ' s',
        'stomp eligible ' + canStomp(this.state),
        'projectiles    ' + this.state.projectiles.length,
        'bullet padding ' + activeBulletPadding() + ' px per side (gold outline)',
        '',
        'CURRENT CONSTANTS',
        ...Object.entries(constants).map(([key, value]) => key.padEnd(19) + value),
        '', 'DASH / BOOT', ...Object.entries(abilities).map(([key, value]) => key.padEnd(19) + value),
      ].join('\n');
    }
  }
}
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: WORLD_WIDTH, height: WORLD_HEIGHT,
  backgroundColor: '#101c32', pixelArt: true, roundPixels: true, antialias: false,
  scale: { mode: Phaser.Scale.NONE }, scene: [Playground],
  input: { keyboard: false }, fps: { target: 60, forceSetTimeOut: false },
});
const viewport = document.querySelector<HTMLElement>('#arena-viewport')!;
const host = document.querySelector<HTMLElement>('#game')!;
function fit() {
  const padding = developerView && innerWidth > 760 ? 32 : 0;
  const width = viewport.clientWidth - padding;
  const height = viewport.clientHeight - padding;
  const available = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
  // Player view fills the available space; developer view keeps integer review scaling.
  const scale = developerView ? Math.max(1, Math.floor(available)) : Math.max(0.1, available);
  host.style.width = WORLD_WIDTH * scale + 'px'; host.style.height = WORLD_HEIGHT * scale + 'px';
  if (game.canvas) { game.canvas.style.width = host.style.width; game.canvas.style.height = host.style.height; game.scale.refresh(); }
}
new ResizeObserver(fit).observe(viewport);
game.events.on(Phaser.Core.Events.READY, fit);
fit(); void connect();
