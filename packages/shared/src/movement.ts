import { DEFAULT_CONSTANTS, FIXED_DT, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import type { MovementConstants } from './constants';
import { approach, roundMovement, wrap } from './math';
import type { PlayerInput, PlayerState, SpawnPoint, WorldMap } from './types';
import { overlapsSolid } from './world';

export function createPlayer(spawn: SpawnPoint): PlayerState {
  return { x: spawn.x, y: spawn.y, vx: 0, vy: 0, remainderX: 0, remainderY: 0,
    facing: 1, grounded: false, coyoteTimer: 0, jumpBufferTimer: 0,
    variableJumpTimer: 0, variableJumpSpeed: 0, tick: 0 };
}
function canShift(world: WorldMap, player: PlayerState, dx: number, dy: number): boolean {
  const count = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i <= count; i++) {
    if (overlapsSolid(world, player.x + Math.sign(dx) * Math.min(i, Math.abs(dx)), player.y + Math.sign(dy) * Math.min(i, Math.abs(dy)))) return false;
  }
  return true;
}
function moveX(player: PlayerState, world: WorldMap, constants: MovementConstants): void {
  const pixels = roundMovement(player.remainderX);
  player.remainderX -= pixels;
  const direction = Math.sign(pixels);
  for (let i = 0; i < Math.abs(pixels); i++) {
    if (!overlapsSolid(world, player.x + direction, player.y)) { player.x += direction; continue; }
    let stepped = false;
    if (player.grounded && player.vy >= 0) {
      for (let lift = 1; lift <= constants.STEP_UP; lift++) {
        if (canShift(world, player, 0, -lift) && !overlapsSolid(world, player.x + direction, player.y - lift)) {
          player.y -= lift; player.x += direction; stepped = true; break;
        }
      }
    }
    if (!stepped) { player.vx = 0; player.remainderX = 0; break; }
  }
}
function moveY(player: PlayerState, world: WorldMap, constants: MovementConstants): void {
  const pixels = roundMovement(player.remainderY);
  player.remainderY -= pixels;
  const direction = Math.sign(pixels);
  for (let i = 0; i < Math.abs(pixels); i++) {
    if (!overlapsSolid(world, player.x, player.y + direction)) { player.y += direction; continue; }
    let corrected = false;
    if (direction < 0) {
      const preferred = Math.sign(player.vx) || player.facing;
      for (let nudge = 1; nudge <= constants.CORNER_CORRECTION && !corrected; nudge++) {
        for (const sign of [preferred, -preferred]) {
          const shift = nudge * sign;
          if (canShift(world, player, shift, 0) && !overlapsSolid(world, player.x + shift, player.y - 1)) {
            player.x += shift; player.y--; corrected = true; break;
          }
        }
      }
    }
    if (!corrected) { player.vy = 0; player.remainderY = 0; player.variableJumpTimer = 0; break; }
  }
}
function jump(player: PlayerState, input: PlayerInput, constants: MovementConstants): void {
  player.vy = constants.JUMP_SPEED;
  player.vx += input.x * constants.JUMP_H_BOOST;
  player.variableJumpSpeed = constants.JUMP_SPEED;
  player.variableJumpTimer = constants.VAR_JUMP_TIME;
  player.jumpBufferTimer = 0; player.coyoteTimer = 0;
  player.grounded = false; player.remainderY = 0;
}
/** Pure 60 Hz update. Returned state is new; input, world and constants are never mutated. */
export function step(state: PlayerState, input: PlayerInput, world: WorldMap, dt = FIXED_DT, constants: MovementConstants = DEFAULT_CONSTANTS, horizontalDash?: number): PlayerState {
  if (dt !== FIXED_DT) throw new Error('Movement must use the fixed 1/60 second timestep.');
  const player = { ...state, tick: state.tick + 1 };
  player.grounded = player.vy >= 0 && overlapsSolid(world, player.x, player.y + 1);
  player.coyoteTimer = player.grounded ? constants.COYOTE_TIME : Math.max(0, player.coyoteTimer - dt);
  player.jumpBufferTimer = input.jumpPressed ? constants.JUMP_BUFFER : Math.max(0, player.jumpBufferTimer - dt);
  player.variableJumpTimer = Math.max(0, player.variableJumpTimer - dt);

  if (horizontalDash !== undefined) {
    player.vx = horizontalDash; player.vy = 0;
    player.variableJumpTimer = 0; player.jumpBufferTimer = 0; player.coyoteTimer = 0;
    player.remainderY = 0;
    player.remainderX += player.vx * dt;
    moveX(player, world, constants);
    player.x = wrap(player.x, WORLD_WIDTH); player.y = wrap(player.y, WORLD_HEIGHT);
    player.grounded = overlapsSolid(world, player.x, player.y + 1);
    return player;
  }
  if (input.x !== 0) player.facing = input.x;
  const target = input.x * constants.MAX_RUN;
  const reducing = Math.abs(player.vx) > constants.MAX_RUN && Math.sign(player.vx) === input.x;
  const acceleration = (reducing ? constants.RUN_REDUCE : constants.RUN_ACCEL) * (player.grounded ? 1 : constants.AIR_MULT);
  player.vx = approach(player.vx, target, acceleration * dt);

  const startedJump = (input.jumpPressed || player.jumpBufferTimer > 0) && (player.grounded || player.coyoteTimer > 0);
  if (startedJump) jump(player, input, constants);
  if (!player.grounded) {
    const gravity = input.jumpHeld && Math.abs(player.vy) < constants.HALF_GRAV_THRESHOLD ? constants.GRAVITY / 2 : constants.GRAVITY;
    player.vy = approach(player.vy, constants.MAX_FALL, gravity * dt);
    if (player.variableJumpTimer > 0) {
      if (input.jumpHeld || startedJump) player.vy = Math.min(player.vy, player.variableJumpSpeed);
      else { player.vy = Math.max(player.vy, constants.JUMP_CUT_SPEED); player.variableJumpTimer = 0; }
    }
  } else { player.vy = 0; player.remainderY = 0; }

  player.remainderX += player.vx * dt;
  moveX(player, world, constants);
  player.remainderY += player.vy * dt;
  moveY(player, world, constants);
  player.x = wrap(player.x, WORLD_WIDTH);
  player.y = wrap(player.y, WORLD_HEIGHT);
  player.grounded = player.vy >= 0 && overlapsSolid(world, player.x, player.y + 1);
  // Buffered landing jumps fire immediately, rather than one extra tick later.
  if (player.grounded) {
    player.vy = 0; player.remainderY = 0;
    player.coyoteTimer = constants.COYOTE_TIME;
    if (player.jumpBufferTimer > 0) jump(player, input, constants);
  }
  return player;
}
