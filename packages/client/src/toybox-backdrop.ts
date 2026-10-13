import type Phaser from 'phaser';
import { text } from './match-hud';

/** Static wall dressing only; drawn below all platforms, actors and effects. */
export function drawToyboxBackdrop(g: Phaser.GameObjects.Graphics) {
  const rect = (x: number, y: number, w: number, h: number, color: number, alpha = 1) => g.fillStyle(color, alpha).fillRect(x, y, w, h);
  const stamp = (rows: readonly string[], x: number, y: number, color: number, scale = 1) => {
    rows.forEach((row, dy) => [...row].forEach((pixel, dx) => {
      if (pixel === '#') rect(x + dx * scale, y + dy * scale, scale, scale, color);
    }));
  };

  // Recessed blue wall panels and a quiet pegboard: darker than playable ledges.
  rect(3, 25, 314, 164, 0x142238);
  for (let x = 6; x < 318; x += 52) {
    rect(x, 27, 48, 159, x % 104 === 6 ? 0x17283d : 0x192b40);
    rect(x, 27, 1, 159, 0x20344b);
    rect(x + 47, 27, 1, 159, 0x0e1c30);
    for (const y of [30, 181]) { rect(x + 3, y, 2, 2, 0x2b4055); rect(x + 43, y, 2, 2, 0x2b4055); }
  }
  for (let x = 12; x < 312; x += 8) for (let y = 34; y < 185; y += 8) rect(x, y, 1, 1, 0x0e1e31, 0.7);
  rect(4, 184, 312, 3, 0x263a4e); rect(4, 187, 312, 2, 0x0d192b);

  // A framed gunboot blueprint gives the room its own identity.
  rect(122, 28, 76, 31, 0x0f1d30); rect(124, 30, 72, 27, 0x243b50);
  for (let x = 128; x < 193; x += 6) rect(x, 32, 1, 23, 0x2b4257);
  for (let y = 32; y < 56; y += 6) rect(126, y, 68, 1, 0x2b4257);
  stamp(['###.....','###.....','###.....','###.....','######..','#######.','########','########'], 133, 34, 0x52647a, 2);
  rect(132, 52, 21, 1, 0x657184); rect(150, 37, 7, 1, 0x43596b);
  rect(159, 35, 1, 16, 0x43596b); rect(157, 35, 5, 1, 0x43596b); rect(157, 50, 5, 1, 0x43596b);
  text(g, 'BOOT', 169, 35, 0x526779); text(g, 'LAB', 170, 44, 0x526779);

  const cabinet = (x: number, y: number) => {
    rect(x, y, 42, 49, 0x0f1e31); rect(x + 2, y + 2, 38, 45, 0x213249);
    rect(x + 3, y + 3, 1, 43, 0x314358); rect(x + 38, y + 3, 1, 43, 0x111f33);
    for (const sy of [y + 22, y + 44]) {
      rect(x + 4, sy, 34, 2, 0x394354); rect(x + 4, sy + 2, 34, 1, 0x142136);
      rect(x + 7, sy + 3, 2, 2, 0x29394a); rect(x + 33, sy + 3, 2, 2, 0x29394a);
    }
  };
  cabinet(12, 57); cabinet(266, 57);

  // Alphabet blocks, a wooden duck and a wind-up robot on the wall shelves.
  for (const [x, y, color, letter] of [[19, 69, 0x594652, 'A'], [29, 68, 0x4b526a, 'B'], [39, 71, 0x596052, 'C']] as const) {
    rect(x, y, 9, 9, color); rect(x + 1, y + 1, 7, 1, 0x687080, 0.4); text(g, letter, x + 3, y + 2, 0x889094, 1, 0.55);
  }
  stamp(['..###....','..####...','..#####..','...###...','.#######.','#########','.#######.'], 20, 88, 0x645743);
  rect(25, 90, 1, 1, 0x1b283a); rect(27, 91, 3, 1, 0x76624b);
  rect(38, 93, 8, 6, 0x3d5261); rect(40, 89, 4, 4, 0x485e6b); rect(39, 96, 6, 1, 0x607075);
  stamp(['..#.#..','..###..','.#####.','.#####.','..###..','#######','##.#.##','##.#.##','..###..','.##.##.'], 280, 64, 0x53636b);
  rect(282, 67, 1, 1, 0x27364c); rect(284, 67, 1, 1, 0x27364c); rect(282, 71, 3, 1, 0x746056);
  rect(292, 65, 1, 9, 0x3e5264); rect(290, 65, 5, 1, 0x53606a);
  // An old ball and a stack of books below the robot.
  stamp(['..####..','.######.','########','########','########','.######.','..####..'], 275, 91, 0x4a576b);
  rect(278, 92, 2, 5, 0x605465); rect(276, 94, 6, 1, 0x605465);
  for (const [y, w, c] of [[97, 11, 0x5d4a52], [94, 13, 0x4c5866], [91, 10, 0x625c4d]] as const) {
    rect(289, y, w, 3, c); rect(290, y + 1, w - 2, 1, 0x798080, 0.3);
  }

  // Loose wall artifacts: rocket poster, winding gears and a model train.
  rect(18, 133, 35, 33, 0x102035); rect(20, 135, 31, 29, 0x26364b);
  stamp(['....#....','...###...','..#####..','..#####..','..#####..','.#######.','#########','##.###.##','...#.#...','....#....'], 27, 138, 0x655261, 2);
  rect(35, 145, 2, 3, 0x839091, 0.4);
  const gear = ['...###...','.#.###.#.','.#######.','###...###','###...###','###...###','.#######.','.#.###.#.','...###...'];
  stamp(gear, 279, 136, 0x465366, 2); stamp(gear, 296, 151, 0x504858);
  rect(274, 160, 29, 2, 0x334255);
  // Train silhouette is a mural, deliberately without a bright walkable edge.
  rect(129, 145, 62, 15, 0x16263b);
  rect(135, 149, 14, 7, 0x4c4557); rect(138, 145, 8, 4, 0x4c4557);
  rect(140, 146, 4, 2, 0x304257); rect(135, 146, 2, 3, 0x4c4557);
  for (const x of [154, 170]) { rect(x, 150, 12, 6, 0x435468); rect(x + 2, 147, 8, 3, 0x435468); }
  for (const x of [137, 144, 156, 163, 172, 179]) rect(x, 156, 3, 3, 0x697079, 0.65);
  rect(131, 160, 56, 1, 0x3e4c5d);
  // Tape, scuffs and an old inventory label complete the workshop wall.
  for (const [x, y] of [[76, 55], [237, 93], [101, 160], [221, 150]] as const) {
    rect(x, y, 6, 1, 0x3b4e60); rect(x + 2, y + 2, 3, 1, 0x304356);
  }
  rect(139, 109, 42, 17, 0x22364a); rect(141, 109, 3, 2, 0x52615e); rect(176, 123, 3, 2, 0x52615e);
  text(g, 'TOYBOX', 148, 113, 0x5d6d7c); text(g, '01', 156, 120, 0x455b6d);
}
