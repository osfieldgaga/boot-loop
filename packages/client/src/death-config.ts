export const DEFAULT_DEATH_EFFECTS = Object.freeze({
  PARTICLE_COUNT: 16, PARTICLE_LIFETIME: 350, PARTICLE_SPEED: 50, PARTICLE_GRAVITY: 140,
  PARTICLE_SIZE: 2, SHAKE_DURATION: 100, SHAKE_STRENGTH: 0.8, MESSAGE_DURATION: 1600,
});
export type DeathConfig = { -readonly [K in keyof typeof DEFAULT_DEATH_EFFECTS]: number };
export const deathConfig: DeathConfig = { ...DEFAULT_DEATH_EFFECTS };
