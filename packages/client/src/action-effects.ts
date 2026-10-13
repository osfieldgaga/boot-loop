import Phaser from 'phaser';
import { PLAYER_HEIGHT, PLAYER_WIDTH, WORLD_WIDTH, WORLD_HEIGHT, seamOffsets, wrap } from '@boot-loop/shared';
import type { AbilityState } from '@boot-loop/shared';
type Actor = { id: string; alive: boolean; shots: number; state: AbilityState };
type Spark = { x: number; y: number; kind: 'shot' | 'landing' | 'respawn' | 'stomp' | 'bounce' | 'impact'; age: number };
/** Small bounded cues. Counts prevent held/rejected fire from making a muzzle flash. */
export class ActionEffects {
  private previous = new Map<string, { shots: number; alive: boolean; grounded: boolean }>();
  private seenBounces = new Set<string>();
  observeBounces(bounces: { key: string; x: number; y: number }[]) {
    for (const b of bounces) if (!this.seenBounces.has(b.key)) { this.seenBounces.add(b.key); this.add(b.x, b.y, 'bounce'); }
    this.seenBounces = new Set([...this.seenBounces].slice(-64));
  }
  private seenImpacts = new Set<string>();
  observeImpacts(impacts: { key: string; x: number; y: number }[]) {
    for (const i of impacts) if (!this.seenImpacts.has(i.key)) { this.seenImpacts.add(i.key); this.impact(i.x, i.y); }
    this.seenImpacts = new Set([...this.seenImpacts].slice(-64));
  }
  impact(x: number, y: number) { this.add(x, y, 'impact'); }
  private sparks: Spark[] = [];
  constructor(private graphics: Phaser.GameObjects.Graphics) {}
  clear() { this.previous.clear(); this.seenBounces.clear(); this.seenImpacts.clear(); this.sparks = []; this.graphics.clear(); }
  stomp(x: number, y: number) { this.add(x + PLAYER_WIDTH / 2, y, 'stomp'); }
  private add(x: number, y: number, kind: Spark['kind']) { this.sparks.push({ x, y, kind, age: 0 }); this.sparks = this.sparks.slice(-24); }
  observe(players: Actor[]) {
    const next: typeof this.previous = new Map();
    for (const p of players) {
      const old = this.previous.get(p.id), { x, y, grounded } = p.state.player;
      if (old && p.alive) {
        if (p.shots > old.shots) this.add(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT, 'shot');
        if (!old.alive) this.add(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2, 'respawn');
        else if (!old.grounded && grounded) this.add(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT, 'landing');
      }
      next.set(p.id, { shots: p.shots, alive: p.alive, grounded });
    }
    this.previous = next;
  }
  draw(delta: number) {
    this.graphics.clear();
    for (const spark of this.sparks) {
      spark.age += Math.min(delta / 1000, 0.05);
      const duration = spark.kind === 'respawn' ? 0.25 : spark.kind === 'impact' ? 0.09 : 0.14;
      const fade = Math.max(0, 1 - spark.age / duration);
      const radius = spark.kind === 'impact' ? 1 + spark.age * 12 : spark.kind === 'shot' ? 2 + spark.age * 16 : 3 + spark.age * 28;
      const x = wrap(spark.x, WORLD_WIDTH), y = wrap(spark.y, WORLD_HEIGHT);
      for (const offset of seamOffsets(x - radius, y - radius, radius * 2 + 1, radius * 2 + 1)) {
        const px = Math.round(x + offset.x), py = Math.round(y + offset.y), r = Math.round(radius);
        if (spark.kind === 'impact') {
          this.graphics.fillStyle(0xffc857, fade * 0.65).fillRect(px - r, py, 1, 1).fillRect(px + r, py, 1, 1)
            .fillRect(px, py - r, 1, 1).fillRect(px, py + r, 1, 1);
        }
        else if (spark.kind === 'shot') this.graphics.fillStyle(0xffc857, fade).fillRect(px - r, py, 2 * r + 1, 2).fillRect(px - 1, py - 2, 2, 6);
        else this.graphics.lineStyle(1, spark.kind === 'bounce' ? 0xc19aff : spark.kind === 'stomp' ? 0xffc857 : 0x70dfc5, fade).strokeRect(px - r, py - (spark.kind === 'landing' ? 1 : r), r * 2, spark.kind === 'landing' ? 2 : r * 2);
      }
    }
    this.sparks = this.sparks.filter(s => s.age < (s.kind === 'respawn' ? 0.25 : s.kind === 'impact' ? 0.09 : 0.14));
  }
}
