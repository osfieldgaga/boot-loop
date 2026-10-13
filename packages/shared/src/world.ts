import { PLAYER_HEIGHT, PLAYER_WIDTH, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { wrap } from './math';
import type { WorldMap } from './types';

export function isSolid(world: WorldMap, column: number, row: number): boolean {
  return world.rows[wrap(row, world.height)]?.[wrap(column, world.width)] === '#';
}
export function overlapsSolid(world: WorldMap, x: number, y: number, width = PLAYER_WIDTH, height = PLAYER_HEIGHT): boolean {
  const left = Math.floor(x / TILE_SIZE); const right = Math.floor((x + width - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE); const bottom = Math.floor((y + height - 1) / TILE_SIZE);
  for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) if (isSolid(world, col, row)) return true;
  return false;
}
export function loadMap(id: string, rows: readonly string[]): WorldMap {
  const width = WORLD_WIDTH / TILE_SIZE; const height = WORLD_HEIGHT / TILE_SIZE;
  if (rows.length !== height || rows.some((row) => row.length !== width)) throw new Error('Map must be 40 × 24 tiles.');
  const spawns: { x: number; y: number }[] = [];
  rows.forEach((row, y) => [...row].forEach((tile, x) => {
    if (!'.#S'.includes(tile)) throw new Error('Unknown tile.');
    if ((x < 2 || x >= width - 2 || y < 2 || y >= height - 2) && tile !== '.') throw new Error('Two-tile map borders must be empty.');
    if (tile === 'S') spawns.push({ x: x * TILE_SIZE, y: (y + 1) * TILE_SIZE - PLAYER_HEIGHT });
  }));
  if (spawns.length < 4) throw new Error('Map needs at least four spawns.');
  const world: WorldMap = { id, rows: [...rows], width, height, spawns };
  for (const spawn of spawns) {
    if (overlapsSolid(world, spawn.x, spawn.y)) throw new Error('Spawn overlaps a platform.');
    if (!overlapsSolid(world, spawn.x, spawn.y + 1)) throw new Error('Spawn must sit on a platform.');
  }
  // Each traversable tile must fit a full standing player. This catches low pockets,
  // not arbitrary map reachability, which still needs a playtest.
  for (let row = 2; row < height - 2; row++) for (let col = 2; col < width - 2; col++) {
    if (isSolid(world, col, row)) continue;
    if (isSolid(world, col - 1, row) && isSolid(world, col + 1, row) && isSolid(world, col, row - 1) && isSolid(world, col, row + 1)) throw new Error('Map has a trapped single-tile pocket.');
  }
  return world;
}


