import { PLAYER_IDENTITIES } from '@boot-loop/shared';
import type { MatchSnapshot } from '@boot-loop/shared';
export interface ConfirmedDeath { player: string; slot: number; x: number; y: number; message: string }
export function deathTaunt(slot: number, deaths: number, stomp: boolean): string {
  const color = PLAYER_IDENTITIES[slot]!.name.toUpperCase();
  const lines = stomp ? ['GOT CRUSHED!', 'IS FLATTENED!', 'IS NOW A PANCAKE!', 'LOST THE HEIGHT WAR!']
    : ['GOT BOOTED!', 'FORGOT TO DODGE!', 'ATE A BOOT SHOT!', 'CAUGHT THAT. OOPS.'];
  return `${color} ${lines[(Math.max(1, deaths) - 1 + slot) % lines.length]}`;
}
/** Capture every victim's confirmed death on receipt, independently of local life state. */
export class DeathEffectQueue {
  private counts = new Map<string, number>();
  private pending: ConfirmedDeath[] = [];
  accept(snapshot: MatchSnapshot) {
    if (snapshot.phase === 'lobby' || snapshot.phase === 'countdown') {
      this.pending = [];
      this.counts = new Map(snapshot.players.map(p => [p.id, p.deaths]));
      return;
    }
    for (const player of snapshot.players) {
      const previous = this.counts.get(player.id);
      if (previous !== undefined && player.deaths > previous) {
        const event = [...snapshot.events].reverse().find(e => e.death?.player === player.id);
        // Death counters are the durable signal; event positions improve precision.
        // A skipped/trimmed event must not suppress feedback on the killer's client.
        this.pending.push({ ...(event?.death ?? { player: player.id, slot: player.slot, x: player.state.player.x, y: player.state.player.y }),
          message: deathTaunt(player.slot, player.deaths, Boolean(event?.text.includes('stomped'))) });
      }
      this.counts.set(player.id, player.deaths);
    }
    this.pending = this.pending.slice(-8);
  }
  drain(): ConfirmedDeath[] { const result = this.pending; this.pending = []; return result; }
  reset() { this.counts.clear(); this.pending = []; }
}
