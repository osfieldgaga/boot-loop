import { bootMovement } from './scatter-boots';
import type { BootMode } from './scatter-boots';
import { DEFAULT_CONSTANTS, FIXED_DT, PLAYER_HEIGHT, PLAYER_WIDTH, WORLD_HEIGHT, WORLD_WIDTH, TILE_SIZE } from './constants';
import type { MovementConstants } from './constants';
import { createPlayer, step } from './movement';
import { isSolid, overlapsSolid } from './world';
import { wrap } from './math';
import type { PlayerInput, PlayerState, SpawnPoint, WorldMap } from './types';

export const DEFAULT_ABILITIES = Object.freeze({
  DASH_SPEED: 400, DASH_TIME: 0.25, END_DASH_SPEED: 180, DASH_COOLDOWN: 10,
  AMMO: 4, RECOIL_SPEED: 120, SHOT_COOLDOWN: 0.16, BULLET_SPEED: 300, BULLET_LIFETIME: 0.5,
});
export const RELOAD_SECONDS = 3;
export type AbilityConstants = { -readonly [K in keyof typeof DEFAULT_ABILITIES]: number };
export interface Projectile { id: number; x: number; y: number; remaining: number; vx?: number; vy?: number; ricochet?: boolean; bounced?: boolean; bounceFlash?: number; bounceX?: number; bounceY?: number }
export interface AbilityState {
  player: PlayerState; ammo: number; reloadRemaining: number; dashCharge: boolean; dashTimer: number; dashCooldown: number; dashReadyRemaining: number;
  dashDirection: -1 | 1; shotCooldown: number; shots: number; projectiles: Projectile[];
  shotThisTick: boolean; dashThisTick: boolean;
}
export function createAbilityState(spawn: SpawnPoint, config: AbilityConstants = DEFAULT_ABILITIES): AbilityState {
  return { player: createPlayer(spawn), ammo: config.AMMO, reloadRemaining: 0, dashCharge: true, dashTimer: 0,
    dashCooldown: 0, dashReadyRemaining: 0, dashDirection: 1, shotCooldown: 0, shots: 0, projectiles: [], shotThisTick: false, dashThisTick: false };
}
/** Legacy landing/stomp hook: neither resource bypasses its automatic recharge timer. */
export function refillResources(state: AbilityState, _config: AbilityConstants = DEFAULT_ABILITIES): AbilityState {
  return { ...state };
}
/** Dash is never a stomp attack, regardless of vertical speed before it started. */
export function canStomp(state: AbilityState): boolean { return state.dashTimer <= 0 && state.player.vy > 0; }
function bulletBlocked(world: WorldMap, x: number, y: number): boolean {
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 4; dy++) {
    if (isSolid(world, Math.floor((x + dx) / TILE_SIZE), Math.floor((y + dy) / TILE_SIZE))) return true;
  }
  return false;
}
/** Shared swept projectile path for practice and authoritative player-hit checks. */
export type ProjectileImpact = (x: number, y: number) => void;
export function advanceProjectile<T extends Projectile>(previous: T, world: WorldMap, config: AbilityConstants,
  hit: (x: number, y: number, progress: number) => boolean = () => false, impact?: ProjectileImpact): T | null {
  const bullet = { ...previous, remaining: previous.remaining - FIXED_DT, bounceFlash: Math.max(0, (previous.bounceFlash ?? 0) - FIXED_DT) };
  if (bullet.remaining <= 0) return null;
  if (bulletBlocked(world, bullet.x, bullet.y)) { if (!bullet.ricochet) impact?.(bullet.x + 1, bullet.y + 3); return null; }
  const moveX = (bullet.vx ?? 0) * FIXED_DT, moveY = (bullet.vy ?? config.BULLET_SPEED) * FIXED_DT;
  const steps = Math.max(1, Math.ceil(Math.hypot(moveX, moveY)));
  for (let sample = 0; sample <= steps; sample++) {
    const x = wrap(previous.x + moveX * sample / steps, WORLD_WIDTH);
    const y = wrap(previous.y + moveY * sample / steps, WORLD_HEIGHT);
    if (bulletBlocked(world, x, y)) {
      if (bullet.ricochet && !bullet.bounced && moveY > 0) {
        bullet.vy = -config.BULLET_SPEED; bullet.bounced = true;
        bullet.bounceFlash = 0.15; bullet.bounceX = bullet.x; bullet.bounceY = bullet.y;
        return bullet;
      }
      if (!bullet.ricochet) impact?.(bullet.x + 1, bullet.y + 3);
      return null;
    }
    if (hit(x, y, sample / steps)) { if (!bullet.ricochet) impact?.(x + 1, y + 2); return null; }
    bullet.x = x; bullet.y = y;
  }
  return bullet;
}
function tickProjectiles(projectiles: readonly Projectile[], world: WorldMap, config: AbilityConstants, impact?: ProjectileImpact): Projectile[] {
  return projectiles.map(p => advanceProjectile(p, world, config, undefined, impact)).filter((p): p is Projectile => p !== null);
}
function decay(timer: number): number { const remaining = timer - FIXED_DT; return remaining < 1e-9 ? 0 : remaining; }
export function stepAbilities(previous: AbilityState, input: PlayerInput, world: WorldMap,
  movement: MovementConstants = DEFAULT_CONSTANTS, config: AbilityConstants = DEFAULT_ABILITIES, dashEnabled = true, shootingEnabled = true, scatter: BootMode | boolean = false, impact?: ProjectileImpact): AbilityState {
  movement = bootMovement(movement, scatter);
  let next: AbilityState = { ...previous, player: { ...previous.player },
    projectiles: tickProjectiles(previous.projectiles, world, config, impact), shotThisTick: false, dashThisTick: false,
    dashCooldown: decay(previous.dashCooldown), dashReadyRemaining: decay(previous.dashReadyRemaining), shotCooldown: decay(previous.shotCooldown) };
  next.dashCharge = next.dashCooldown === 0;
  if (previous.dashCooldown > 0 && next.dashCooldown === 0) next.dashReadyRemaining = 1.5;
  // Finish only an already-running reload; the last shot starts a fresh full duration below.
  if (previous.reloadRemaining > 0) {
    next.reloadRemaining = decay(previous.reloadRemaining);
    if (next.reloadRemaining === 0) next.ammo = config.AMMO;
  }
  // Support-ground detection happens before interpreting the shared jump/shoot button.
  next.player.grounded = next.player.vy >= 0 && overlapsSolid(world, next.player.x, next.player.y + 1);
  const wasGrounded = next.player.grounded;
  if (!dashEnabled) next.dashTimer = 0;
  if (dashEnabled && input.dashDirection !== undefined && next.dashTimer <= 0 && next.dashCharge && next.dashCooldown <= 0) {
    next.dashDirection = input.dashDirection || input.x || next.player.facing;
    next.player.facing = next.dashDirection;
    next.dashTimer = config.DASH_TIME; next.dashCooldown = config.DASH_COOLDOWN;
  next.dashCharge = false; next.dashReadyRemaining = 0; next.dashThisTick = true;
  }
  // A fresh grounded jump in the first 100 ms cancels dash. Never grant an air jump.
  const dashJump = next.dashTimer > 0 && next.player.grounded && input.jumpPressed
    && next.dashTimer + 1e-9 >= Math.max(FIXED_DT, config.DASH_TIME - 0.1);
  if (dashJump) {
    next.dashTimer = 0;
    // Normal jump boost is applied below; cap the total launch to run speed + 60.
    const launch = Math.min(config.DASH_SPEED, Math.max(config.END_DASH_SPEED, movement.MAX_RUN + movement.JUMP_H_BOOST + 20), movement.MAX_RUN + 60);
    next.player.vx = next.dashDirection * Math.max(0, launch - movement.JUMP_H_BOOST);
  }
  if (next.dashTimer > 0) {
    next.player = step(next.player, { ...input, jumpPressed: false, jumpHeld: false }, world, FIXED_DT, movement, next.dashDirection * config.DASH_SPEED);
    next.dashTimer = Math.max(0, next.dashTimer - FIXED_DT);
    if (next.player.vx === 0) next.dashTimer = 0; // A wall ends the dash instead of pinning it against the tile.
    if (next.dashTimer < 1e-9) {
      next.dashTimer = 0;
      if (next.player.vx !== 0) next.player.vx = next.dashDirection * config.END_DASH_SPEED;
    }
  } else {
    const jumping = next.player.grounded || next.player.coyoteTimer > FIXED_DT;
    const firing = input.jumpPressed && !jumping;
    next.player = step(next.player, { ...input, x: dashJump ? next.dashDirection : input.x, jumpPressed: input.jumpPressed && jumping }, world, FIXED_DT, movement);
    if (shootingEnabled && firing && !next.player.grounded && next.ammo > 0 && next.shotCooldown <= 0) {
      next.ammo--; next.shots++; next.shotCooldown = config.SHOT_COOLDOWN; next.shotThisTick = true;
      // Set toward up, never add: repeated shots cannot stack velocity into a rocket.
      next.player.vy = Math.min(next.player.vy, -config.RECOIL_SPEED);
      next.player.variableJumpTimer = 0; next.player.jumpBufferTimer = 0;
      for (const [pellet, vx] of (scatter === true || scatter === 'scatter' ? [-120, 0, 120] : [0]).entries()) next.projectiles.push({
        id: next.shots * 3 + pellet, vx, x: wrap(next.player.x + PLAYER_WIDTH / 2 - 1, WORLD_WIDTH),
        y: wrap(next.player.y + PLAYER_HEIGHT, WORLD_HEIGHT), remaining: scatter === 'ricochet' ? Math.max(config.BULLET_LIFETIME, 0.9) : config.BULLET_LIFETIME, ricochet: scatter === 'ricochet' });
    }
  }
  // Landing cannot top up ammo or reset dash cooldown.
  if (!wasGrounded && next.player.grounded) next = refillResources(next, config);
  if (next.ammo === 0 && next.reloadRemaining === 0) next.reloadRemaining = RELOAD_SECONDS;
  return next;
}
