import type Phaser from 'phaser';
import { text } from './match-hud';

/** Companion rooms to Toybox: original static pixel wall art, never collision geometry. */
export function drawWorkshopBackdrop(g: Phaser.GameObjects.Graphics, arena: 'crossfire' | 'switchback') {
  const copper = arena === 'crossfire';
  const colors = copper
    ? { wall: 0x2b2230, panel: 0x302737, seam: 0x412f3d, dark: 0x211b29, metal: 0x574653, light: 0x79665d, ink: 0x695b65, paper: 0x403442 }
    : { wall: 0x241f3b, panel: 0x2b2543, seam: 0x3b3251, dark: 0x1c1930, metal: 0x514564, light: 0x776583, ink: 0x62566f, paper: 0x39314f };
  const rect = (x: number, y: number, w: number, h: number, color = colors.metal, alpha = 1) => g.fillStyle(color, alpha).fillRect(x, y, w, h);
  const stamp = (rows: readonly string[], x: number, y: number, color = colors.ink, scale = 1) => {
    rows.forEach((row, dy) => [...row].forEach((pixel, dx) => { if (pixel === '#') rect(x + dx * scale, y + dy * scale, scale, scale, color); }));
  };
  const frame = (x: number, y: number, w: number, h: number) => {
    rect(x, y, w, h, colors.dark); rect(x + 2, y + 2, w - 4, h - 4, colors.paper);
    for (const sx of [x + 3, x + w - 5]) for (const sy of [y + 3, y + h - 5]) rect(sx, sy, 1, 1, colors.light, 0.5);
  };
  const gear = ['....###....','.#..###..#.','..#######..','..##...##..','####...####','###.....###','####...####','..##...##..','..#######..','.#..###..#.','....###....'];
  const wheel = (x: number, y: number, scale = 1) => { stamp(gear, x, y, colors.ink, scale); rect(x + 5 * scale, y + 5 * scale, scale, scale, colors.light); };
  const pipe = (x: number, y: number, height: number) => {
    rect(x, y, 3, height, colors.dark); rect(x + 1, y, 1, height, colors.metal);
    for (let sy = y + 4; sy < y + height; sy += 24) rect(x - 1, sy, 5, 2, colors.seam);
  };

  rect(3, 25, 314, 164, colors.wall);
  for (let x = 6; x < 318; x += 52) {
    rect(x, 27, 48, 159, colors.panel); rect(x, 27, 1, 159, colors.seam); rect(x + 47, 27, 1, 159, colors.dark);
    for (const y of [30, 181]) { rect(x + 3, y, 2, 2, colors.metal); rect(x + 43, y, 2, 2, colors.metal); }
  }
  for (let x = 12; x < 312; x += 8) for (let y = 34; y < 185; y += 8) rect(x, y, 1, 1, colors.dark, 0.7);
  rect(4, 184, 312, 3, colors.seam); rect(4, 187, 312, 2, colors.dark);
  for (const [x, y] of [[74, 49], [230, 91], [91, 151], [222, 175]] as const) {
    rect(x, y, 6, 1, colors.seam); rect(x + 2, y + 2, 3, 1, colors.seam);
  }

  if (copper) {
    // Old toy-testing range: bolted copper conduits, paper targets and workshop meters.
    pipe(64, 47, 127); pipe(252, 47, 127);
    rect(65, 101, 188, 3, colors.dark); rect(66, 102, 186, 1, colors.metal);
    for (const x of [72, 244]) { rect(x, 99, 4, 7, colors.seam); rect(x + 1, 100, 2, 5, colors.metal); }
    frame(127, 28, 66, 31);
    text(g, 'TEST RANGE', 140, 33, colors.light);
    stamp(['..#......','..##.....','..###....','########.','#########','########.','..###....','..##.....','..#......'], 137, 43, colors.ink);
    for (const x of [153, 166, 179]) { rect(x, 43, 1, 9, colors.ink); rect(x - 2, 47, 5, 1, colors.ink); }
    text(g, '02', 175, 53, colors.ink);
    // Pinned target posters feature toys rather than threatening imagery.
    frame(14, 57, 41, 46); frame(266, 57, 41, 46);
    for (const x of [22, 274]) {
      rect(x, 64, 25, 25, colors.dark); rect(x + 2, 66, 21, 21, colors.metal); rect(x + 4, 68, 17, 17, colors.paper);
      rect(x + 7, 71, 11, 11, colors.ink); rect(x + 9, 73, 7, 7, colors.paper);
    }
    stamp(['..###....','..####...','...###...','.#######.','#########','.#######.'], 30, 73, colors.light);
    stamp(['..#.#..','..###..','.#####.','.#####.','..###..','#######','##.#.##','..###..'], 283, 72, colors.light);
    text(g, 'DUCK', 26, 94, colors.ink); text(g, 'BOT', 281, 94, colors.ink);
    // Quiet identification plate beneath the central test lane.
    frame(130, 88, 60, 23); text(g, 'CROSSFIRE', 142, 93, colors.ink); text(g, 'BOOT LAB', 144, 102, colors.ink);
    // Pressure instruments and a labeled bench drawer with building blocks.
    frame(137, 148, 46, 16);
    for (const x of [143, 156, 169]) {
      stamp(['.#####.','##...##','#.....#','#.....#','#.....#','##...##','.#####.'], x, 152, colors.ink);
      rect(x + 3, 153, 1, 3, colors.light); rect(x + 3, 156, 2, 1, colors.light);
    }
    frame(17, 151, 39, 25); frame(264, 151, 39, 25);
    for (const [x, color] of [[24, 0x66534e], [34, 0x554963], [44, 0x58604f]] as const) {
      rect(x, 158, 8, 8, color); rect(x + 2, 160, 4, 1, colors.light, 0.5);
    }
    text(g, 'SPARES', 23, 169, colors.ink);
    // A wind-up blaster prototype hanging above the other drawer.
    stamp(['...#####.....','############.','#############','..####.......','..####.......','...##........'], 271, 158, colors.ink);
    wheel(288, 153); text(g, 'TOOLS', 272, 169, colors.ink);
    // Warm, faded workshop safety tape never shares the platform highlight color.
    for (const x of [17, 273]) for (let i = 0; i < 6; i++) rect(x + i * 5, 114 + i % 2, 3, 2, colors.light, 0.35);
  } else {
    // Toybox's clockwork annex: violet wall panels, gears and stored wind-up parts.
    pipe(65, 47, 124); pipe(253, 47, 124);
    frame(126, 28, 68, 32); text(g, 'SPRING LAB', 140, 33, colors.light);
    wheel(139, 43); wheel(152, 46); wheel(169, 42); rect(147, 48, 28, 1, colors.metal);
    frame(14, 56, 42, 50); frame(265, 56, 42, 50);
    // Key, clock face and spool in a recessed parts cabinet.
    wheel(22, 64, 2); rect(32, 70, 1, 7, colors.light); rect(32, 76, 6, 1, colors.light);
    rect(20, 89, 30, 2, colors.seam);
    stamp(['##...##','###.###','#######','..###..','...#...','...#...','...#...','..##...'], 24, 94, colors.ink);
    rect(40, 93, 8, 8, colors.ink); rect(38, 92, 12, 2, colors.metal); rect(38, 100, 12, 2, colors.metal);
    // Glass-front spring collection, backed by the same pegboard as Toybox.
    for (const x of [274, 285, 296]) {
      for (let y = 65; y < 82; y += 4) { rect(x, y, 5, 1, colors.ink); rect(x + 4, y + 1, 1, 2, colors.ink); rect(x, y + 3, 5, 1, colors.ink); }
      rect(x + 2, 83, 1, 3, colors.metal);
    }
    rect(270, 89, 31, 2, colors.seam);
    stamp(['...###...','...###...','..#####..','.#######.','.##...##.','..#####..','...#.#...','...#.#...'], 277, 94, colors.ink);
    rect(293, 95, 7, 6, colors.metal); rect(295, 96, 3, 3, colors.dark);
    // Large, muted wall gears sit behind the hanging physical cover walls.
    wheel(76, 98, 2); wheel(226, 98, 2);
    rect(87, 110, 146, 1, colors.seam);
    frame(130, 107, 60, 20); text(g, 'SWITCHBACK', 140, 112, colors.ink); text(g, '03', 156, 120, colors.ink);
    // Pendulum displays on both sides; static so they cannot compete with threats.
    for (const x of [24, 286]) {
      frame(x - 6, 134, 25, 36); rect(x + 5, 139, 1, 17, colors.ink);
      stamp(['..###..','.#####.','#######','#######','#######','.#####.','..###..'], x + 2, 154, colors.metal);
      rect(x + 4, 156, 3, 3, colors.ink);
    }
    // A wind-up toy locomotive shares Toybox's familiar sill and scale.
    frame(132, 147, 56, 22);
    rect(139, 153, 15, 8, colors.ink); rect(142, 150, 8, 3, colors.ink); rect(144, 151, 4, 2, colors.dark);
    rect(137, 149, 2, 5, colors.ink); rect(158, 154, 16, 7, colors.metal); rect(160, 151, 12, 3, colors.metal);
    for (const x of [141, 150, 160, 170]) rect(x, 161, 3, 3, colors.light, 0.7);
    wheel(175, 151); rect(136, 165, 48, 1, colors.seam);
  }
}
