export interface PlayerState {
  /** Top-left of the collision box, in logical pixels. */
  x: number; y: number; vx: number; vy: number;
  remainderX: number; remainderY: number;
  facing: -1 | 1; grounded: boolean;
  coyoteTimer: number; jumpBufferTimer: number; variableJumpTimer: number;
  variableJumpSpeed: number; tick: number;
}
export interface PlayerInput { x: -1 | 0 | 1; jumpHeld: boolean; jumpPressed: boolean; dashDirection?: -1 | 0 | 1 }
export const NEUTRAL_INPUT: Readonly<PlayerInput> = Object.freeze({ x: 0, jumpHeld: false, jumpPressed: false });
export interface SpawnPoint { x: number; y: number }
export interface WorldMap { id: string; rows: readonly string[]; width: number; height: number; spawns: readonly SpawnPoint[] }


