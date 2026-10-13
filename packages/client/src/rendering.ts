import type { BootMode } from '@boot-loop/shared';
const bootColor = (mode: BootMode | boolean) => mode === 'ricochet' ? 0xc19aff : mode === 'turbo' ? 0xffce56 : mode ? 0xff85bc : 0x70dfc5;
import Phaser from 'phaser';
import { drawWorkshopBackdrop } from './workshop-backdrops';
import { drawToyboxBackdrop } from './toybox-backdrop';
import { IDLE_POSE } from './player-animation';
import type { PlayerPose } from './player-animation';
import { text, width } from './match-hud';
import { RELOAD_SECONDS, getArena } from '@boot-loop/shared';
import { deathConfig } from './death-config';
import { BULLET_HIT_PADDING, PLAYER_HEIGHT, PLAYER_WIDTH, wrap, seamOffsets, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '@boot-loop/shared';
import type { PlayerState, WorldMap, Projectile } from '@boot-loop/shared';

/** Renderer contract stays independent of simulation and future atlas details. */
export interface SpriteProvider { drawPlayer(graphics: Phaser.GameObjects.Graphics, state: PlayerState, x: number, y: number, pose?: PlayerPose, scatter?: BootMode | boolean): void }
export class RectangleProvider implements SpriteProvider {
  constructor(private color = 0xffc857) {}
  drawPlayer(g: Phaser.GameObjects.Graphics, state: PlayerState, x: number, y: number, pose: PlayerPose = IDLE_POSE, scatter: BootMode | boolean = false) {
    // Anchor poses at the feet. Every rectangle remains on whole logical pixels.
    const w = PLAYER_WIDTH + pose.width, h = 9 + pose.height;
    const left = x - Math.floor(pose.width / 2), top = y + 9 - h;
    if (!pose.airborne) g.fillStyle(0x101c32, 0.35).fillRect(x - 1, y + PLAYER_HEIGHT, 10, 2);
    g.fillStyle(this.color).fillRect(left + 1, top, w - 2, 1).fillRect(left, top + 1, w, h - 1);
    g.fillStyle(0x101c32).fillRect(left + 1, top + 2, w - 2, 3);
    g.fillStyle(0xf39d50).fillRect(left, top + h - 3, w, 3);
    g.fillStyle(0xe6ede4).fillRect(left + (state.facing === 1 ? w - 3 : 1), top + 2, 2, 2);
    const bootY = y + 9 - pose.bootLift;
    g.fillStyle(bootColor(scatter)).fillRect(x - 1 - pose.bootSpread, bootY, 4, 2)
      .fillRect(x + 5 + pose.bootSpread, bootY, 4, 2);
    if (pose.bootSpread === 2) g.fillStyle(0xe6ede4).fillRect(x - pose.bootSpread, bootY + 1, 2, 1)
      .fillRect(x + 6 + pose.bootSpread, bootY + 1, 2, 1);
  }
}
export function drawArena(g: Phaser.GameObjects.Graphics, world: WorldMap) {
  const palette = getArena(world.id).palette;
  g.clear(); g.fillStyle(palette.background).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  // Static sparse grid anchors the toybox without competing with the player.
  g.fillStyle(palette.grid, 0.6);
  for (let x = 8; x < WORLD_WIDTH; x += 16) for (let y = 8; y < WORLD_HEIGHT; y += 16) g.fillRect(x, y, 1, 1);
  if (world.id === 'toybox-01') drawToyboxBackdrop(g);
  else if (world.id === 'crossfire' || world.id === 'switchback') drawWorkshopBackdrop(g, world.id);
  world.rows.forEach((row, ty) => [...row].forEach((tile, tx) => {
    if (tile !== '#') return;
    const x = tx * TILE_SIZE; const y = ty * TILE_SIZE;
    const color = palette.tiles[(tx * 17 + ty * 31) % 3]!;
    g.fillStyle(color).fillRect(x, y, 8, 8);
    if (world.rows[ty - 1]?.[tx] !== '#') g.fillStyle(palette.edge).fillRect(x, y, 8, 2);
    g.fillStyle(palette.grid).fillRect(x, y + 7, 8, 1);
    g.fillStyle(palette.accent, 0.25).fillRect(x + 2, y + 4, 1, 1).fillRect(x + 6, y + 4, 1, 1);
  }));
  g.lineStyle(1, palette.accent, 0.35).strokeRect(0.5, 0.5, WORLD_WIDTH - 1, WORLD_HEIGHT - 1);
  g.fillStyle(palette.accent, 0.8);
  for (let x = 16; x < WORLD_WIDTH; x += 32) { g.fillRect(x, 0, 4, 1); g.fillRect(x, WORLD_HEIGHT - 1, 4, 1); }
  for (let y = 16; y < WORLD_HEIGHT; y += 32) { g.fillRect(0, y, 1, 4); g.fillRect(WORLD_WIDTH - 1, y, 1, 4); }
  // Directional seams hint at the destination in the opposite edge.
  for (const x of [WORLD_WIDTH / 2 - 2]) {
    g.fillStyle(0x70dfc5, 0.7).fillRect(x, 2, 5, 1).fillRect(x + 1, 3, 3, 1).fillRect(x + 2, 4, 1, 1);
    g.fillRect(x, WORLD_HEIGHT - 3, 5, 1).fillRect(x + 1, WORLD_HEIGHT - 4, 3, 1).fillRect(x + 2, WORLD_HEIGHT - 5, 1, 1);
  }
}
export function drawPlayerCopies(g: Phaser.GameObjects.Graphics, provider: SpriteProvider, state: PlayerState, x: number, y: number, debug: boolean, dashing = false, ammo = 0, capacity = 0, protectedNow = false, padding = BULLET_HIT_PADDING, reloadRemaining = 0, dashCooldown = 0, dashCooldownTotal = 10, time = 0, dashEnabled = true, dashReadyNotice = false, pose: PlayerPose = IDLE_POSE, scatter: BootMode | boolean = false) {
  g.clear();
  // Include overhanging boots/shadow in the seam bounds, not just the hitbox.
  const margin = Math.max(reloadRemaining > 0 || dashReadyNotice ? 28 : 10, debug ? Math.max(4, padding) : 2);
  for (const offset of seamOffsets(x - (dashing ? 32 : margin), y - (reloadRemaining > 0 || dashReadyNotice ? 18 : debug ? margin : 5), PLAYER_WIDTH + (dashing ? 64 : margin * 2), PLAYER_HEIGHT + (reloadRemaining > 0 || dashReadyNotice ? 64 : debug ? margin * 2 : 10))) {
    const px = Math.round(x + offset.x); const py = Math.round(y + offset.y);
    if (dashing) {
      for (const distance of [6, 12, 20, 30]) g.fillStyle(0x70dfc5, 0.5 * (1 - distance / 38)).fillRect(px - state.facing * distance, py, PLAYER_WIDTH, PLAYER_HEIGHT);
    }
    provider.drawPlayer(g, state, px, py, pose, scatter);
    if (protectedNow) g.lineStyle(1, 0xe6ede4, 0.9).strokeRect(px - 2, py - 2, PLAYER_WIDTH + 4, PLAYER_HEIGHT + 4);
    for (let i = 0; i < capacity; i++) g.fillStyle(i < ammo ? 0xffc857 : 0x365575).fillRect(px - 2 + i * 2, py - 3, 1, 1);
    if (dashEnabled) {
      const iconX = px + capacity * 2 + 1, iconY = py - 6;
      const progress = Math.max(0, Math.min(1, 1 - dashCooldown / dashCooldownTotal));
      const blink = dashCooldown === 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const iconAlpha = blink && time % 1000 >= 500 ? 0.2 : 1;
      const glyph = ['00100','00010','11111','00010','00100'];
      for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) if (glyph[row]![col] === '1')
        g.fillStyle(row >= 5 - Math.ceil(progress * 5) ? 0x70dfc5 : 0x365575, iconAlpha).fillRect(iconX + col, iconY + row, 1, 1);
    }
    if (reloadRemaining > 0) {
      const label = 'RELOADING...';
      const labelX = Math.round(px + PLAYER_WIDTH / 2 - width(label) / 2);
      // Near the top edge, place the indicator below the player so the score HUD cannot hide it.
      const labelY = py >= 0 && py - 17 < 26 ? py + PLAYER_HEIGHT + 5 : py - 17;
      g.fillStyle(0x101c32, 0.92).fillRect(labelX - 2, labelY, width(label) + 4, 8);
      text(g, label, labelX, labelY + 2, 0xffc857);
      const progress = Math.max(0, Math.min(1, 1 - reloadRemaining / RELOAD_SECONDS));
      g.fillStyle(0x365575).fillRect(px - 5, labelY + 10, 18, 2);
      g.fillStyle(0xffc857).fillRect(px - 5, labelY + 10, Math.round(18 * progress), 2);
    }
    if (dashReadyNotice) {
      const label = 'DASH READY';
      const labelX = Math.round(px + PLAYER_WIDTH / 2 - width(label) / 2);
      const baseY = py >= 0 && py - 17 < 26 ? py + PLAYER_HEIGHT + 5 : py - 17;
      const labelY = baseY + (reloadRemaining > 0 ? 14 : 0);
      g.fillStyle(0x101c32, 0.94).fillRect(labelX - 2, labelY, width(label) + 4, 8);
      text(g, label, labelX, labelY + 2, 0x70dfc5);
    }
    if (debug) {
      g.lineStyle(1, 0xe66b62, 0.9).strokeRect(px + 0.5, py + 0.5, PLAYER_WIDTH - 1, PLAYER_HEIGHT - 1);
      g.lineStyle(1, 0xffc857, 0.5).strokeRect(px - padding, py - padding,
        PLAYER_WIDTH + padding * 2, PLAYER_HEIGHT + padding * 2);
    }
  }
}


export function drawProjectiles(g: Phaser.GameObjects.Graphics, projectiles: readonly Projectile[]) {
  g.clear();
  for (const bullet of projectiles) for (const offset of seamOffsets(bullet.x, bullet.y, 2, 4)) {
    g.fillStyle(bullet.ricochet ? 0xc19aff : bullet.vx ? 0xff85bc : 0xffc857).fillRect(Math.round(bullet.x + offset.x), Math.round(bullet.y + offset.y), 2, 4);
  }
}

interface DeathBurst { x: number; y: number; color: number; age: number }
/** Cosmetic only. Wrap the sparks just like the arena; use the local death-feedback settings. */
export class DeathEffects {
  private bursts: DeathBurst[] = [];
  constructor(private graphics: Phaser.GameObjects.Graphics) {}
  burst(x: number, y: number, color: number) {
    this.bursts.push({ x: x + PLAYER_WIDTH / 2, y: y + PLAYER_HEIGHT / 2, color, age: 0 });
    this.bursts = this.bursts.slice(-8);
  }
  clear() { this.bursts = []; this.graphics.clear(); }
  draw(delta: number) {
    this.graphics.clear();
    for (const burst of this.bursts) {
      burst.age += Math.min(delta / 1000, 0.05);
      const fade = Math.max(0, 1 - burst.age / (deathConfig.PARTICLE_LIFETIME / 1000));
      for (let i = 0; i < deathConfig.PARTICLE_COUNT; i++) {
        const angle = i * Math.PI * 2 / deathConfig.PARTICLE_COUNT;
        const speed = deathConfig.PARTICLE_SPEED * (0.6 + (i % 4) * 0.2);
        const x = wrap(burst.x + Math.cos(angle) * speed * burst.age, WORLD_WIDTH);
        const y = wrap(burst.y + Math.sin(angle) * speed * burst.age + 0.5 * deathConfig.PARTICLE_GRAVITY * burst.age ** 2, WORLD_HEIGHT);
        const size = i % 3 === 0 ? deathConfig.PARTICLE_SIZE : 1;
        for (const offset of seamOffsets(x, y, size, size)) this.graphics
          .fillStyle(i % 4 === 0 ? 0xe6ede4 : i % 4 === 1 ? 0x70dfc5 : burst.color, fade)
          .fillRect(Math.round(x + offset.x), Math.round(y + offset.y), size, size);
      }
    }
    this.bursts = this.bursts.filter(b => b.age < deathConfig.PARTICLE_LIFETIME / 1000);
  }
}

/** Pickup bobs cosmetically; its shared collection box stays fixed. */
export function drawScatterPickup(g: Phaser.GameObjects.Graphics, pickup: { x: number; y: number } | null, time: number, reducedMotion: boolean, mode: BootMode = 'scatter') {
  g.clear(); if (!pickup) return;
  const x = pickup.x, y = pickup.y + (reducedMotion ? 0 : Math.round(Math.sin(time / 180)));
  g.lineStyle(1, bootColor(mode), 0.6).strokeRect(x - 3, y - 3, 14, 14);
  g.fillStyle(0x101c32, 0.9).fillRect(x - 2, y - 2, 12, 12);
  g.fillStyle(bootColor(mode)).fillRect(x, y + 2, 3, 5).fillRect(x + 5, y + 2, 3, 5)
    .fillRect(x - 1, y + 6, 4, 2).fillRect(x + 4, y + 6, 4, 2);
  g.fillStyle(0xe6ede4).fillRect(x + 3, y - 1, 2, 1).fillRect(x + 1, y, 1, 1).fillRect(x + 6, y, 1, 1);
}
