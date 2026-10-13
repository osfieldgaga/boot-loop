export const WORLD_WIDTH = 320;
export const WORLD_HEIGHT = 192;
export const TILE_SIZE = 8;
export const PLAYER_WIDTH = 8;
export const PLAYER_HEIGHT = 11;
export const FIXED_DT = 1 / 60;
export const MAX_ACCUMULATED_TIME = 0.25;

export const DEFAULT_CONSTANTS = Object.freeze({
  MAX_RUN: 90, RUN_ACCEL: 1000, RUN_REDUCE: 400, AIR_MULT: 0.65,
  GRAVITY: 900, MAX_FALL: 160, HALF_GRAV_THRESHOLD: 40,
  JUMP_SPEED: -105, JUMP_H_BOOST: 40, VAR_JUMP_TIME: 0.2,
  COYOTE_TIME: 0.1, JUMP_BUFFER: 0.1, JUMP_CUT_SPEED: -35,
  CORNER_CORRECTION: 4, STEP_UP: 2,
});
export type MovementConstants = { -readonly [K in keyof typeof DEFAULT_CONSTANTS]: number };


