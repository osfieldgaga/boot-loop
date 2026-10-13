import Phaser from 'phaser';
import { deathConfig } from './death-config';
import { SCATTER_DURATION_TICKS, scatterActive, BOOT_NAMES, PLAYER_IDENTITIES, WORLD_WIDTH } from '@boot-loop/shared';
import type { ScatterBootsState, MatchSnapshot } from '@boot-loop/shared';
// Original 3x5 bitmap lettering: crisp at the arena's integer pixel scale.
const GLYPHS: Record<string, string> = {
  A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',
  E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',
  I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',
  M:'101111111101101',N:'101111111111101',O:'010101101101010',P:'110101110100100',
  Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',
  U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',
  Y:'101101010010010',Z:'111001010100111',
  '0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110',
  '4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010',
  '8':'111101111101111','9':'111101111001110',':':'000010000010000','!':'010010010000010',
  '.':'000000000000010','-':'000000111000000','/':'001001010100100',
};
export function width(text: string, scale = 1) { return (text.length * 4 - 1) * scale; }
export function text(g: Phaser.GameObjects.Graphics, value: string, x: number, y: number, color: number, scale = 1, alpha = 1) {
  g.fillStyle(color, alpha);
  [...value].forEach((letter, index) => {
    const glyph = GLYPHS[letter]; if (!glyph) return;
    for (let pixel = 0; pixel < 15; pixel++) if (glyph[pixel] === '1')
      g.fillRect(x + index * 4 * scale + pixel % 3 * scale, y + Math.floor(pixel / 3) * scale, scale, scale);
  });
}
export class MatchHud {
  private taunts: { message: string; color: number; until: number }[] = [];
  private bootDeadline = 0;
  constructor(private graphics: Phaser.GameObjects.Graphics) { graphics.setScrollFactor(0).setDepth(20); }
  taunt(message: string, slot: number, time: number) {
    this.taunts.push({ message, color: PLAYER_IDENTITIES[slot]!.color, until: time + deathConfig.MESSAGE_DURATION });
    this.taunts = this.taunts.slice(-2);
  }
  clear() { this.taunts = []; this.bootDeadline = 0; }
  draw(snapshot: MatchSnapshot | undefined, tick: number, time: number, practiceScatter?: ScatterBootsState, practiceTick = 0, reducedMotion = false) {
    const g = this.graphics; g.clear();
    g.fillStyle(0x101c32, 0.92).fillRect(5, 5, WORLD_WIDTH - 10, 19);
    g.lineStyle(1, 0x365575, 0.8).strokeRect(5.5, 5.5, WORLD_WIDTH - 11, 18);
    if (snapshot) {
      const scores = snapshot.phase === 'results' ? snapshot.result?.standings ?? [] : snapshot.players;
      const mode = snapshot.phase === 'results' ? snapshot.result?.mode : snapshot.mode;
      const value = (slot: number) => { const p = scores.find(p => p.slot === slot); return mode === 'stock' ? snapshot.phase === 'lobby' ? snapshot.startingStocks : p?.stocks ?? snapshot.startingStocks : p?.kills ?? 0; };
      PLAYER_IDENTITIES.forEach((identity, slot) => {
        if (!scores.some(p => p.slot === slot)) return;
        const label = `${identity.name.toUpperCase()} ${mode === 'stock' ? `${value(slot)}L` : value(slot)}`;
        const x = slot % 2 === 0 ? 12 : WORLD_WIDTH - width(label) - 12;
        text(g, label, x, slot < 2 ? 9 : 17, identity.color);
      });
      const seconds = snapshot.phase === 'running' ? Math.ceil(Math.max(0, snapshot.phaseEnds - tick) / 60)
        : snapshot.phase === 'results' ? 0 : snapshot.duration;
      const clock = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      const label = snapshot.phase === 'countdown' ? `GO IN ${Math.max(1, Math.ceil((snapshot.phaseEnds - tick) / 60))}` : clock;
      text(g, label, Math.round((WORLD_WIDTH - width(label, 2)) / 2), 9, seconds <= 10 && snapshot.phase === 'running' ? 0xe66b62 : 0xe6ede4, 2);
    } else {
      const label = 'PRACTICE / NO SCORE';
      text(g, label, Math.round((WORLD_WIDTH - width(label, 2)) / 2), 9, 0xa7bed0, 2);
    }
    const boots = snapshot?.scatter ?? practiceScatter;
    const bootsTick = snapshot ? tick : practiceTick;
    if (boots && (!snapshot || snapshot.phase === 'running')) {
      const wait = Math.ceil((boots.nextSpawnTick - bootsTick) / 60);
      const remaining = Math.ceil(Math.max(0, boots.activeUntil - bootsTick) / 60);
      const label = scatterActive(boots, bootsTick) ? `EVERYONE: ${BOOT_NAMES[boots.mode].toUpperCase()} BOOTS ${remaining}S`
        : boots.pickup ? `GRAB ${BOOT_NAMES[boots.mode].toUpperCase()} ${Math.ceil(Math.max(0, boots.pickupExpiresAt - bootsTick) / 60)}S - SWITCH EVERYONE` : wait > 0 && wait <= 2 ? `BOOT PICKUP IN ${wait}` : '';
      if (label) {
        const x = Math.round((WORLD_WIDTH - width(label)) / 2);
        g.fillStyle(0x101c32, 0.92).fillRect(x - 4, 26, width(label) + 8, 9);
        text(g, label, x, 28, boots.mode === 'turbo' ? 0xffce56 : boots.mode === 'ricochet' ? 0xc19aff : 0xff85bc);
      }
    }
    if (boots && (!snapshot || snapshot.phase === 'running')) {
      const active = scatterActive(boots, bootsTick);
      if (active) this.bootDeadline = boots.activeUntil;
      const remaining = Math.max(0, boots.activeUntil - bootsTick) / 60;
      const elapsed = (bootsTick - (boots.activeUntil - SCATTER_DURATION_TICKS)) / 60;
      const color = boots.mode === 'turbo' ? 0xffce56 : boots.mode === 'ricochet' ? 0xc19aff : 0xff85bc;
      if (active && elapsed >= 0 && elapsed < 3) {
        const message = boots.mode === 'turbo' ? 'EVERYONE GOES TURBO!' : boots.mode === 'ricochet' ? 'RICOCHET RULES!' : 'SCATTER MADNESS!';
        // Only lettering moves: no camera effect and no opaque banner over combat.
        const scale = reducedMotion ? 2 : elapsed < 0.25 ? 3.6 - elapsed * 2.4 : 3 - Math.min(1, elapsed / 3);
        const shake = reducedMotion ? 0 : Math.max(0.4, 2.4 - elapsed * 0.6);
        const dx = Math.round(Math.sin(bootsTick * 1.7) * shake), dy = Math.round(Math.cos(bootsTick * 2.3) * shake);
        const alpha = reducedMotion ? 1 : Math.min(1, (3 - elapsed) / 0.6);
        this.dramaticText(message, 60 + dy, color, scale, dx, alpha);
        this.dramaticText('EVERYONE GETS THE SAME BOOTS', 82, 0xe6ede4, 1, 0, alpha);
        if (!reducedMotion) this.bootSparks(bootsTick, 70, color);
      } else if (active && remaining <= 3) {
        const number = Math.max(1, Math.ceil(remaining));
        const beat = number - remaining;
        const scale = reducedMotion ? 4 : 4 + 1.5 * Math.max(0, 1 - beat * 4);
        const dx = reducedMotion ? 0 : Math.round(Math.sin(bootsTick * 1.9) * Math.max(0, 1 - beat * 3));
        this.dramaticText(String(number), 65, color, scale, dx);
        this.dramaticText('BOOTS RESET IN', 54, 0xe6ede4, 1);
        if (!reducedMotion) this.bootSparks(bootsTick, 78, color);
      } else if (!active && this.bootDeadline > 0 && bootsTick >= this.bootDeadline && bootsTick < this.bootDeadline + 45) {
        this.dramaticText('BACK TO NORMAL', 65, 0xe6ede4, 1.5, 0, reducedMotion ? 1 : 1 - (bootsTick - this.bootDeadline) / 45);
      }
    } else this.bootDeadline = 0;
    this.taunts = this.taunts.filter(t => t.until > time);
    this.taunts.forEach((taunt, index) => {
      const y = 177 - (this.taunts.length - 1 - index) * 16;
      const w = width(taunt.message, 2);
      g.fillStyle(0x101c32, 0.9).fillRect(Math.round((WORLD_WIDTH - w) / 2) - 5, y - 3, w + 10, 15);
      text(g, taunt.message, Math.round((WORLD_WIDTH - w) / 2), y, taunt.color, 2);
    });
  }
  private dramaticText(message: string, y: number, color: number, scale: number, dx = 0, alpha = 1) {
    const x = Math.round((WORLD_WIDTH - width(message, scale)) / 2) + dx;
    text(this.graphics, message, x + 1, y + 1, 0x101c32, scale, alpha);
    text(this.graphics, message, x, y, color, scale, alpha);
  }
  private bootSparks(tick: number, y: number, color: number) {
    const g = this.graphics;
    for (let i = 0; i < 6; i++) {
      const phase = ((tick + i * 9) % 36) / 36;
      const side = i % 2 ? 1 : -1;
      g.fillStyle(color, 1 - phase).fillRect(Math.round(WORLD_WIDTH / 2 + side * (24 + phase * 38)), Math.round(y + Math.sin(i * 2) * phase * 16), 2, 2);
    }
  }

}
