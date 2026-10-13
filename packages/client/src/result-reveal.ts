import { PLAYER_IDENTITIES } from '@boot-loop/shared';
import type { MatchResult } from '@boot-loop/shared';
/** Presentation only: never delay rematch or alter the server's frozen result. */
export class ResultReveal {
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private target: HTMLElement) {}
  clear() { clearTimeout(this.timer); this.timer = undefined; this.target.replaceChildren(); delete this.target.dataset.stage; }
  show(result: MatchResult, preview = false) {
    this.clear(); this.target.hidden = false; this.target.classList.add('result-card');
    const identity = (id: string) => PLAYER_IDENTITIES[result.standings.find(p => p.id === id)!.slot]!;
    const tied = result.reason === 'shots' || result.reason === 'shared';
    const eyebrow = document.createElement('span'); eyebrow.className = 'result-eyebrow';
    eyebrow.textContent = preview ? 'PRACTICE PREVIEW / FINAL SCORES' : 'MATCH COMPLETE / FINAL SCORES';
    const heading = document.createElement('strong'); heading.className = 'result-heading'; heading.setAttribute('role', 'status'); heading.tabIndex = -1;
    heading.textContent = tied ? 'SCORE TIED…' : 'BOOTS DOWN.';
    const detail = document.createElement('p'); detail.className = 'result-explanation';
    detail.textContent = tied ? 'Checking the deciding statistics…' : 'The final standings are locked.';
    const table = document.createElement('table'); table.className = 'result-standings'; table.setAttribute('aria-label', 'Final standings');
    const row = document.createElement('tr');
    for (const label of ['Player', ...(result.mode === 'stock' ? ['Lives'] : []), 'Kills', 'Shots']) {
      const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = label; row.append(cell);
    }
    const head = document.createElement('thead'); head.append(row); table.append(head);
    const body = document.createElement('tbody');
    const shotCells: HTMLElement[] = [];
    for (const p of result.standings) {
      const tr = document.createElement('tr'); tr.dataset.player = p.id;
      const who = document.createElement('th'); who.scope = 'row';
      const swatch = document.createElement('span'); swatch.className = 'result-swatch'; swatch.style.backgroundColor = `#${identity(p.id).color.toString(16).padStart(6, '0')}`; swatch.setAttribute('aria-hidden', 'true');
      who.append(swatch, identity(p.id).name); tr.append(who);
      for (const value of [...(result.mode === 'stock' ? [p.stocks] : []), p.kills]) { const cell = document.createElement('td'); cell.textContent = String(value); tr.append(cell); }
      const shots = document.createElement('td'); shots.textContent = tied ? '—' : String(p.shots); tr.append(shots); shotCells.push(shots); body.append(tr);
    }
    table.append(body);
    const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'result-skip'; skip.textContent = 'Reveal now';
    let finished = false;
    const finish = () => {
      if (finished) return; finished = true;
      clearTimeout(this.timer); this.timer = undefined;
      const focused = document.activeElement === skip;
      heading.textContent = result.reason === 'draw' ? 'DRAW — NO CROWN THIS TIME' : `${result.winners.map(id => identity(id).name).join(' & ').toUpperCase()} ${result.winners.length > 1 ? 'SHARE THE CROWN!' : 'WINS!'}`;
      if (result.winners.length === 1) this.target.style.setProperty('--winner-color', `#${identity(result.winners[0]!).color.toString(16).padStart(6, '0')}`);
      else this.target.style.setProperty('--winner-color', '#e6ede4');
      detail.textContent = { shots: `${result.mode === 'stock' ? 'Lives and kills' : 'Kills'} tied. Fewer accepted shots decided it.`, shared: 'All deciding statistics tied. Share the crown.', survivor: 'Last player with lives remaining.', stocks: 'Time ran out. Most remaining lives wins.', kills: result.mode === 'stock' ? 'Time ran out. Lives tied; most kills wins.' : 'Most kills wins.', draw: result.mode === 'stock' ? 'All remaining players lost their final life together.' : 'Nobody scored a kill. No winner this round.' }[result.reason];
      result.standings.forEach((p, i) => { shotCells[i]!.textContent = String(p.shots); body.rows[i]!.classList.toggle('result-winner', result.winners.includes(p.id)); });
      this.target.dataset.stage = 'complete'; skip.hidden = true;
      if (focused) heading.focus({ preventScroll: true });
    };
    skip.addEventListener('click', finish);
    this.target.style.setProperty('--winner-color', '#e6ede4'); this.target.dataset.stage = 'pending';
    this.target.append(eyebrow, heading, detail, table, skip);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else this.timer = setTimeout(finish, tied ? 1300 : 400);
  }
}
export const TIE_PREVIEW: MatchResult = { mode: 'timed', reason: 'shots', winners: ['gold'], standings: [
  { id: 'gold', slot: 0, kills: 3, shots: 10, deaths: 3, stocks: 3 },
  { id: 'blue', slot: 1, kills: 3, shots: 24, deaths: 3, stocks: 3 },
] };
