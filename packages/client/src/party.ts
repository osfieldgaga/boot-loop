import { activeBoot } from '@boot-loop/shared';
import { Client } from '@colyseus/sdk';
import type { Room } from '@colyseus/sdk';
import { PLAYER_IDENTITIES, DEFAULT_ABILITIES, MATCH_MOVEMENT, stepAbilities, getArena } from '@boot-loop/shared';
import type { AbilityState, InputPacket, MatchSnapshot, PlayerInput } from '@boot-loop/shared';
import { DeathEffectQueue } from './death-effects';
import { updateGameUI } from './game-ui';
import { ResultReveal, TIE_PREVIEW } from './result-reveal';
export const confirmedDeaths = new DeathEffectQueue();
export const party = {
  room: undefined as Room | undefined, snapshot: undefined as MatchSnapshot | undefined,
  previous: undefined as MatchSnapshot | undefined, receivedAt: 0, previousAt: 0,
  id: '', seq: 0, generation: '', predicted: undefined as AbilityState | undefined,
  pending: [] as InputPacket[], ping: null as number | null, busy: false,
};
export let practiceArenaId = 'toybox-01';
export function currentArena() { return getArena(party.snapshot?.arenaId ?? practiceArenaId); }
const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const feedback = get('#party-feedback');
let timer: ReturnType<typeof setInterval> | undefined;
let changeHook = () => {};
const reveal = new ResultReveal(get('#match-result'));
let resultKey = '';
const previewReveal = new ResultReveal(get('#preview-result'));

function labelFor(id: string, snapshot = party.snapshot) { const p = snapshot?.result?.standings.find(p => p.id === id) ?? snapshot?.players.find(p => p.id === id); return p ? `Player ${p.slot + 1}` : 'Player'; }
function show() {
  document.dispatchEvent(new Event('party-settings'));
  const s = party.snapshot, inRoom = Boolean(party.room);
  document.body.dataset.phase = s?.phase ?? 'practice';
  updateGameUI(s?.phase ?? 'practice', inRoom);
  get<HTMLButtonElement>('#create-room').disabled = party.busy;
  get<HTMLButtonElement>('#join-room').disabled = party.busy;
  get('#create-room').hidden = inRoom; get('#join-controls').hidden = inRoom;
  get('#leave-room').hidden = !inRoom; get('#copy-link').hidden = !inRoom;
  get<HTMLDivElement>('#practice-label').hidden = inRoom;
  get<HTMLButtonElement>('#reset-player').disabled = inRoom;
  get('#preview-death').hidden = inRoom;
  get('#preview-impact').hidden = inRoom;
  for (const mode of ['scatter', 'turbo', 'ricochet']) get(`#preview-${mode}`).hidden = inRoom;
  get('#practice-now').hidden = inRoom;
  for (const field of document.querySelectorAll<HTMLInputElement | HTMLButtonElement>('#tuning input, #tuning button, #ability-tuning input, #ability-tuning button')) field.disabled = inRoom;
  get('#tuning-lock').hidden = !inRoom;
  get('#invite-wrap').hidden = !inRoom || !get<HTMLInputElement>('#invite-link').value;
  get<HTMLSelectElement>('#match-duration').disabled = !s || s.host !== party.id || !['lobby', 'results'].includes(s.phase);
  get<HTMLSelectElement>('#match-duration').value = String(s?.duration ?? 120);
  for (const selector of ['#match-mode', '#starting-stocks']) get<HTMLSelectElement>(selector).disabled = !s || s.host !== party.id || !['lobby', 'results'].includes(s.phase);
  get<HTMLSelectElement>('#match-mode').value = s?.mode ?? 'timed';
  get<HTMLSelectElement>('#starting-stocks').value = String(s?.startingStocks ?? 3);
  for (const selector of ['#stocks-label', '#starting-stocks']) get(selector).hidden = s?.mode !== 'stock';
  get<HTMLSelectElement>('#match-arena').disabled = party.busy || Boolean(inRoom && (!s || s.host !== party.id || !['lobby', 'results'].includes(s.phase)));
  get<HTMLSelectElement>('#match-arena').value = currentArena().id;
  get('#arena-description').textContent = currentArena().description;
  const start = get<HTMLButtonElement>('#start-match');
  start.hidden = !s || !['lobby', 'results'].includes(s.phase);
  start.disabled = !s || s.host !== party.id || s.players.length < 2;
  start.textContent = s?.phase === 'results' ? 'Rematch' : 'Start match';
  get('#roster').textContent = s ? s.players.map(p => `${labelFor(p.id, s)} · ${PLAYER_IDENTITIES[p.slot]!.name.toLowerCase()}${p.id === party.id ? ' (you)' : ''}${p.id === s.host ? ' · host' : ''}`).join(' / ') : 'Practice · no match or scoring';
  get('#room-code').textContent = party.room ? `Room ${party.room.roomId}` : '';
  get('#room-settings').textContent = s ? `Shared settings: ${getArena(s.arenaId).name} · ${s.mode === 'stock' ? `Stock · ${s.startingStocks} stocks` : 'Timed'} · ${s.duration}s · bullet tolerance ${s.bulletHitPaddingPx} px per side · ${['lobby', 'results'].includes(s.phase) ? 'host can edit' : 'locked during play'}` : '';
  get('#match-score').textContent = s && s.phase !== 'lobby' ? (s.phase === 'results' ? s.result?.standings ?? [] : s.players).map(p => `${labelFor(p.id, s)}: ${(s.phase === 'results' ? s.result?.mode : s.mode) === 'stock' ? `${p.stocks} stocks` : `${p.kills} kills`}`).join(' · ') : '';
  const result = get('#match-result'); result.hidden = s?.phase !== 'results';
  if (s?.phase !== 'results' && resultKey) { reveal.clear(); resultKey = ''; }
  if (s?.result && resultKey !== JSON.stringify(s.result)) {
    resultKey = JSON.stringify(s.result); reveal.show(s.result);
  }
  get('#preview-tie').hidden = inRoom;
  if (inRoom) { previewReveal.clear(); get('#preview-result').hidden = true; }

}
function receive(snapshot: MatchSnapshot) {
  if (party.snapshot && snapshot.tick < party.snapshot.tick) return;
  const old = party.snapshot;
  if (old && old.host !== snapshot.host) feedback.textContent = snapshot.host === party.id
    ? 'You are now the host. Invite a replacement, then start when at least two players are ready.'
    : 'Host control has transferred to the remaining player.';
  if (old && ['countdown', 'running'].includes(old.phase) && snapshot.phase === 'lobby')
    feedback.textContent = snapshot.events.at(-1)?.text ?? 'Match cancelled — no winner. Invite another player.';
  if (old && old.phase !== 'results' && snapshot.phase === 'results')
    feedback.textContent = 'Match finished. Final scores are locked; the host can rematch with at least two players present.';
  confirmedDeaths.accept(snapshot);
  party.previous = party.snapshot; party.previousAt = party.receivedAt;
  party.snapshot = snapshot; party.receivedAt = performance.now();
  const mine = snapshot.players.find(p => p.id === party.id);
  if (mine) {
    const generation = `${snapshot.arenaId}:${snapshot.phase}:${mine.deaths}:${mine.alive}`;
    if (generation !== party.generation) { party.pending = []; party.generation = generation; changeHook(); }
    party.pending = party.pending.filter(p => p.seq > mine.ack);
    party.predicted = structuredClone(mine.state);
    if (snapshot.phase === 'running' && mine.alive) for (const [index, p] of party.pending.entries()) party.predicted = stepAbilities(party.predicted, p.input, getArena(snapshot.arenaId).world, MATCH_MOVEMENT, DEFAULT_ABILITIES, true, mine.protectedUntil <= snapshot.tick, activeBoot(snapshot.scatter, snapshot.tick + index + 1));
  }
  show();
}
export function onlineTick(input: PlayerInput): AbilityState | undefined {
  const mine = party.snapshot?.players.find(p => p.id === party.id);
  if (!party.room || !party.snapshot || party.snapshot.phase !== 'running' || !mine?.alive || !party.predicted) return party.predicted;
  const packet: InputPacket = { seq: ++party.seq, input };
  party.pending.push(packet);
  // A long outage must not accumulate seconds of future movement for reconnect/replay.
  if (party.pending.length > 120) { feedback.textContent = 'Connection stalled. Leaving the room; practice is available.'; void leave(); return undefined; }
  party.room.send('input', packet);
  party.predicted = stepAbilities(party.predicted, input, currentArena().world, MATCH_MOVEMENT, DEFAULT_ABILITIES, true, mine.protectedUntil <= party.snapshot.tick, activeBoot(party.snapshot.scatter, party.snapshot.tick + party.pending.length));
  return party.predicted;
}
function disconnected() {
  confirmedDeaths.reset();
  if (timer) clearInterval(timer); timer = undefined;
  party.room = undefined; party.snapshot = undefined; party.previous = undefined; party.predicted = undefined; party.pending = [];
  get<HTMLInputElement>('#invite-link').value = '';
  party.id = ''; party.generation = ''; party.ping = null;
  document.querySelector('#game')?.removeAttribute('data-online');
  history.replaceState(null, '', location.pathname); show(); changeHook();
}
async function leave() { const room = party.room; disconnected(); feedback.textContent = 'Back in practice.'; try { await room?.leave(); } catch { /* Local leave is complete even if the socket is already lost. */ } }
async function enter(code?: string) {
  if (party.busy || party.room) return;
  party.busy = true; show(); feedback.textContent = code ? 'Joining room…' : 'Creating room…';
  try {
    const endpoint = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? `${location.protocol}//${location.hostname}:3000` : location.origin);
    const client = new Client(endpoint); const room = code ? await client.joinById(code) : await client.create('party');
    party.room = room; party.id = room.sessionId; party.seq = 0;
    room.onMessage('snapshot', (snapshot: MatchSnapshot) => { if (party.room === room) receive(snapshot); });
    room.onMessage('notice', (message: string) => { if (party.room === room) feedback.textContent = message; });
    room.onMessage('pong', (message: { sentAt: number }) => { if (party.room === room) party.ping = Math.round(performance.now() - message.sentAt); });
    room.onLeave(() => { if (party.room === room) { disconnected(); feedback.textContent = 'Room connection ended. You can create or join another room.'; } });
    room.onError(() => { if (party.room !== room) return; feedback.textContent = 'Connection interrupted. If it does not recover, leave and join a new room.'; });
    document.querySelector('#game')?.setAttribute('data-online', 'true');
    history.replaceState(null, '', `${location.pathname}?room=${encodeURIComponent(room.roomId)}`);
    room.send('snapshot'); room.send('ping', performance.now()); timer = setInterval(() => room.send('ping', performance.now()), 1000);
    feedback.textContent = code ? 'Joined. Wait for the host to start.' : 'Room created. Copy the invite link and send it to your friend.';
    show(); changeHook();
  } catch { disconnected(); feedback.textContent = 'Could not join: the room may be full, already playing, expired, or the server is unavailable. Create a new room or check the code.'; }
  finally { party.busy = false; show(); }
}
export function setupParty(onChange: () => void) {
  changeHook = onChange;
  get('#preview-tie').addEventListener('click', () => {
    previewReveal.show(TIE_PREVIEW, true); get('#preview-result').scrollIntoView({ block: 'center' });
  });
  get('#create-room').addEventListener('click', () => { void enter(); });
  get('#join-room').addEventListener('click', () => {
    const raw = get<HTMLInputElement>('#join-code').value.trim(); let code = raw;
    try { if (raw.includes('://')) code = new URL(raw).searchParams.get('room') ?? ''; } catch { code = ''; }
    if (!/^[a-zA-Z0-9_-]{4,32}$/.test(code)) { feedback.textContent = 'Enter a room code or a full invite link.'; return; }
    void enter(code);
  });
  get('#leave-room').addEventListener('click', () => { void leave(); });
  get('#start-match').addEventListener('click', () => party.room?.send('start'));
  get<HTMLSelectElement>('#match-arena').addEventListener('change', event => {
    const value = (event.target as HTMLSelectElement).value;
    if (party.room) party.room.send('arena', value);
    else { practiceArenaId = getArena(value).id; changeHook(); show(); }
  });
  get<HTMLSelectElement>('#match-duration').addEventListener('change', event => party.room?.send('duration', Number((event.target as HTMLSelectElement).value)));
  get<HTMLSelectElement>('#match-mode').addEventListener('change', event => party.room?.send('mode', (event.target as HTMLSelectElement).value));
  get<HTMLSelectElement>('#starting-stocks').addEventListener('change', event => party.room?.send('stocks', Number((event.target as HTMLSelectElement).value)));
  get('#copy-link').addEventListener('click', async () => {
    const link = `${location.origin}/?room=${encodeURIComponent(party.room!.roomId)}`;
    get<HTMLInputElement>('#invite-link').value = link; get('#invite-wrap').hidden = false;
    try { await navigator.clipboard.writeText(link); feedback.textContent = 'Invite link copied.'; } catch { feedback.textContent = 'Select and copy the invite link below.'; }
  });
  show(); const initial = new URLSearchParams(location.search).get('room');
  if (initial && /^[a-zA-Z0-9_-]{4,32}$/.test(initial)) void enter(initial);
  window.addEventListener('pagehide', () => { if (timer) clearInterval(timer); void party.room?.leave(); });
}
export function estimatedMatchTick(): number {
  const s = party.snapshot; if (!s) return 0;
  return s.tick + Math.min(12, Math.max(0, performance.now() - party.receivedAt) / (1000 / 60));
}
export function updatePartyClock() {
  const s = party.snapshot; if (!s) {
    for (const selector of ['#match-clock', '#life-status', '#match-events']) get(selector).textContent = '';
    return;
  }
  const nowTick = estimatedMatchTick();
  get('#match-clock').textContent = s.phase === 'lobby' ? (s.players.length >= 2 ? `${s.players.length}/4 players — host can start or wait for more` : 'Waiting for a second player') : s.phase === 'countdown' ? `Starting in ${Math.max(1, Math.ceil((s.phaseEnds - nowTick) / 60))}…` : s.phase === 'running' ? `${Math.max(0, Math.ceil((s.phaseEnds - nowTick) / 60))}s remaining` : 'Match finished';
  const mine = s.players.find(p => p.id === party.id);
  get('#life-status').textContent = s.phase !== 'running' ? '' : mine && !mine.alive && s.mode === 'stock' && mine.stocks === 0 ? 'Eliminated — watching the match' : mine && !mine.alive ? `Respawning in ${Math.max(0, (mine.respawnAt - nowTick) / 60).toFixed(1)}s` : mine && mine.protectedUntil > nowTick ? 'Protected — cannot deal or receive hits' : '';
  get('#match-events').textContent = s.events.slice(-2).map(e => e.text).join(' ');
}
