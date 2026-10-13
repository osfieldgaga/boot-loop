import { ScatterBoots, activeBoot } from './scatter-boots';
import type { ScatterBootsState } from './scatter-boots';
import heavy2 from '../../../tuning/boot-loop-movement-heavy2-snappy-10.05.26.json';
import { advanceProjectile, createAbilityState, DEFAULT_ABILITIES, refillResources, stepAbilities } from './abilities';
import type { AbilityState, Projectile } from './abilities';
import { FIXED_DT, PLAYER_HEIGHT, PLAYER_WIDTH, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { interpolateWrapped, wrap, wrapDx, wrapDy } from './math';
import { isSolid } from './world';
import { ARENAS, getArena, TOYBOX_ARENA } from './arena';
import { NEUTRAL_INPUT } from './types';
import type { PlayerInput, WorldMap } from './types';
export const MATCH_MOVEMENT = Object.freeze({ ...heavy2.constants });
// Eight world pixels of forgiveness on each side; tiles still block the shot.
export const BULLET_HIT_PADDING = 8;
export const MAX_BULLET_HIT_PADDING = 8;
export const RESPAWN_TICKS = 90;
export const PROTECTION_TICKS = 90;
export const COUNTDOWN_TICKS = 180;
export const PLAYER_IDENTITIES = [{ name: 'Gold', color: 0xffc857 }, { name: 'Blue', color: 0x75bfff }, { name: 'Mint', color: 0x70dfc5 }, { name: 'Pink', color: 0xff85bc }] as const;
export type MatchMode = 'timed' | 'stock';
export interface MatchPlayer {
  id: string; slot: number; state: AbilityState; alive: boolean; respawnAt: number;
  protectedUntil: number; kills: number; deaths: number; shots: number; stocks: number; ack: number;
}
export interface MatchBullet extends Projectile { owner: string }
export interface MatchResult { winners: string[]; mode: MatchMode; reason: 'kills' | 'shots' | 'shared' | 'draw' | 'survivor' | 'stocks'; standings: { id: string; slot: number; kills: number; shots: number; deaths: number; stocks: number }[] }
export interface MatchSnapshot {
  tick: number; phase: 'lobby' | 'countdown' | 'running' | 'results'; host: string; duration: number; bulletHitPaddingPx: number; mode: MatchMode; startingStocks: number;
  arenaId: string;
  scatter: ScatterBootsState;
  phaseEnds: number; players: MatchPlayer[]; bullets: MatchBullet[]; result: MatchResult | null;
  impacts: { key: string; tick: number; x: number; y: number }[];
  bounces: { key: string; tick: number; x: number; y: number }[];
  events: { tick: number; text: string; death?: { player: string; slot: number; x: number; y: number } }[];
}
export interface InputPacket { seq: number; input: PlayerInput }
export function parseInput(value: unknown): InputPacket | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>; const i = v.input;
  if (!Number.isSafeInteger(v.seq) || (v.seq as number) < 1 || !i || typeof i !== 'object') return null;
  const input = i as Record<string, unknown>;
  if (![-1, 0, 1].includes(input.x as number) || typeof input.jumpHeld !== 'boolean' || typeof input.jumpPressed !== 'boolean') return null;
  if (input.dashDirection !== undefined && ![-1, 0, 1].includes(input.dashDirection as number)) return null;
  return { seq: v.seq as number, input: { x: input.x as -1 | 0 | 1, jumpHeld: input.jumpHeld, jumpPressed: input.jumpPressed,
    ...(input.dashDirection === undefined ? {} : { dashDirection: input.dashDirection as -1 | 0 | 1 }) } };
}
export function timedResult(players: readonly MatchPlayer[]): MatchResult {
  const standings = players.map(({ id, slot, kills, shots, deaths, stocks }) => ({ id, slot, kills, shots, deaths, stocks })).sort((a, b) => b.kills - a.kills || a.shots - b.shots || a.id.localeCompare(b.id));
  const best = standings[0];
  if (!best || best.kills === 0) return { mode: 'timed', winners: [], reason: 'draw', standings };
  const leaders = standings.filter(p => p.kills === best.kills);
  if (leaders.length === 1) return { mode: 'timed', winners: [best.id], reason: 'kills', standings };
  const efficient = leaders.filter(p => p.shots === best.shots);
  return { mode: 'timed', winners: efficient.map(p => p.id), reason: efficient.length === 1 ? 'shots' : 'shared', standings };
}
export function stockResult(players: readonly MatchPlayer[], timeout = false): MatchResult {
  const standings = players.map(({ id, slot, kills, shots, deaths, stocks }) => ({ id, slot, kills, shots, deaths, stocks }))
    .sort((a, b) => b.stocks - a.stocks || b.kills - a.kills || a.shots - b.shots || a.id.localeCompare(b.id));
  const survivors = standings.filter(p => p.stocks > 0);
  if (!survivors.length) return { mode: 'stock', winners: [], reason: 'draw', standings };
  if (!timeout && survivors.length === 1) return { mode: 'stock', winners: [survivors[0]!.id], reason: 'survivor', standings };
  const stockLeaders = survivors.filter(p => p.stocks === survivors[0]!.stocks);
  if (stockLeaders.length === 1) return { mode: 'stock', winners: [stockLeaders[0]!.id], reason: 'stocks', standings };
  const killLeaders = stockLeaders.filter(p => p.kills === stockLeaders[0]!.kills);
  if (killLeaders.length === 1) return { mode: 'stock', winners: [killLeaders[0]!.id], reason: 'kills', standings };
  const efficient = killLeaders.filter(p => p.shots === killLeaders[0]!.shots);
  return { mode: 'stock', winners: efficient.map(p => p.id), reason: efficient.length === 1 ? 'shots' : 'shared', standings };
}
export function bodiesOverlap(ax: number, ay: number, bx: number, by: number, width = PLAYER_WIDTH, height = PLAYER_HEIGHT): boolean {
  // ax/ay is the top-left of the first rectangle; second is a player box.
  const dx = wrapDx(ax, bx); const dy = wrapDy(ay, by);
  return dx < width && dx > -PLAYER_WIDTH && dy < height && dy > -PLAYER_HEIGHT;
}
/** Bullet-only forgiveness, with a short visibility check to keep cover reliable. */
export function bulletHitsPlayer(world: WorldMap, x: number, y: number, px: number, py: number, padding = BULLET_HIT_PADDING): boolean {
  if (!bodiesOverlap(x - padding, y - padding, px, py,
    2 + padding * 2, 4 + padding * 2)) return false;
  const cx = x + 1, cy = y + 2;
  const left = wrapDx(cx, px), top = wrapDy(cy, py);
  const dx = Math.max(left, Math.min(0, left + PLAYER_WIDTH - 0.01));
  const dy = Math.max(top, Math.min(0, top + PLAYER_HEIGHT - 0.01));
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 2));
  for (let i = 0; i <= steps; i++) {
    if (isSolid(world, Math.floor((cx + dx * i / steps) / TILE_SIZE), Math.floor((cy + dy * i / steps) / TILE_SIZE))) return false;
  }
  return true;
}
export function stompCrossing(a: MatchPlayer, beforeA: MatchPlayer, b: MatchPlayer, beforeB: MatchPlayer): boolean {
  if (a.state.dashTimer > 0 || beforeA.state.dashTimer > 0 || a.state.dashThisTick || a.state.player.vy <= 0) return false;
  const ap = a.state.player, bp = b.state.player, oldA = beforeA.state.player, oldB = beforeB.state.player;
  const gap = wrapDy(oldB.y, oldA.y) + PLAYER_HEIGHT;
  const relative = wrapDy(oldA.y, ap.y) - wrapDy(oldB.y, bp.y);
  if (gap > 1 || relative <= 0 || gap + relative < 0) return false;
  const t = Math.min(1, Math.max(0, -gap / relative));
  const ax = interpolateWrapped(oldA.x, ap.x, t, WORLD_WIDTH), bx = interpolateWrapped(oldB.x, bp.x, t, WORLD_WIDTH);
  return Math.abs(wrapDx(ax, bx)) < PLAYER_WIDTH;
}
export class MatchEngine {
  readonly players = new Map<string, MatchPlayer>();
  tick = 0; phase: MatchSnapshot['phase'] = 'lobby'; host = ''; duration = 120; bulletHitPaddingPx = BULLET_HIT_PADDING; phaseEnds = 0;
  mode: MatchMode = 'timed'; startingStocks = 3;
  readonly scatterBoots = new ScatterBoots();
  bullets: MatchBullet[] = []; result: MatchResult | null = null;
  events: MatchSnapshot['events'] = [];
  bounces: MatchSnapshot['bounces'] = [];
  impacts: MatchSnapshot['impacts'] = [];
  private queues = new Map<string, InputPacket[]>();
  private held = new Map<string, PlayerInput>();
  private received = new Map<string, number>();
  private lastInputAt = new Map<string, number>();
  constructor(public world: WorldMap = TOYBOX_ARENA) { this.scatterBoots.setSpots(getArena(world.id).pickupSpots, 0); }
  configureArena(id: string, value: unknown): boolean {
    if (id !== this.host || !['lobby', 'results'].includes(this.phase) || typeof value !== 'string' || !ARENAS.some(a => a.id === value)) return false;
    if (this.world.id === value) return true;
    this.world = getArena(value).world;
    this.scatterBoots.setSpots(getArena(value).pickupSpots, this.tick);
    this.bullets = []; this.bounces = []; this.impacts = [];
    // Preserve the finished standings while relocating only the visible player bodies.
    for (const p of this.players.values()) {
      p.state = createAbilityState(this.world.spawns[p.slot]!);
      p.ack = this.received.get(p.id) ?? 0;
      this.queues.set(p.id, []); this.held.set(p.id, { ...NEUTRAL_INPUT });
    }
    return true;
  }
  add(id: string): boolean {
    if (!['lobby', 'results'].includes(this.phase) || this.players.size >= 4 || this.players.has(id)) return false;
    const slot = [0, 1, 2, 3].find(slot => ![...this.players.values()].some(p => p.slot === slot))!;
    const spawn = this.world.spawns[slot] ?? { x: 40, y: 40 };
    this.players.set(id, { id, slot, state: createAbilityState(spawn), alive: true, respawnAt: 0, protectedUntil: 0, kills: 0, deaths: 0, shots: 0, stocks: this.startingStocks, ack: 0 });
    this.queues.set(id, []); this.held.set(id, { ...NEUTRAL_INPUT }); this.received.set(id, 0); this.lastInputAt.set(id, this.tick);
    if (!this.host) this.host = id; return true;
  }
  remove(id: string) {
    const departing = this.players.get(id);
    if (!departing) return;
    this.players.delete(id); this.queues.delete(id); this.held.delete(id); this.received.delete(id); this.lastInputAt.delete(id); this.bullets = this.bullets.filter(b => b.owner !== id);
    const hostLeft = this.host === id;
    if (hostLeft) this.host = this.players.keys().next().value ?? '';
    const name = PLAYER_IDENTITIES[departing.slot]!.name;
    const hostNotice = hostLeft && this.host ? ` ${PLAYER_IDENTITIES[this.players.get(this.host)!.slot]!.name} is now the host.` : '';
    if ((this.phase === 'countdown' || this.phase === 'running') && this.players.size < 2) {
      this.phase = 'lobby'; this.result = null; this.phaseEnds = 0; this.bullets = []; this.bounces = []; this.impacts = []; this.events = [];
      this.scatterBoots.reset(this.tick); this.resetPlayers(); this.note(`${name} left. Match cancelled — no winner.${hostNotice} Invite another player to start a new match.`);
    } else {
      // Finished standings belong to the completed match, even if its players leave.
      this.note(`${name} left.${hostNotice}` + (this.phase === 'results' ? ' Final result preserved; invite a replacement for the next match.' : ['countdown', 'running'].includes(this.phase) ? ' Match continues.' : ' Invite another player when ready.'));
    }
    if (this.phase === 'running' && this.mode === 'stock' && [...this.players.values()].filter(p => p.stocks > 0).length <= 1) this.finish(stockResult([...this.players.values()]));
  }
  configure(id: string, duration: unknown): boolean {
    if (id !== this.host || (this.phase !== 'lobby' && this.phase !== 'results') || ![30, 60, 120].includes(duration as number)) return false;
    this.duration = duration as number; return true;
  }
  configureBulletPadding(id: string, value: unknown): boolean {
    if (id !== this.host || !['lobby', 'results'].includes(this.phase) || typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_BULLET_HIT_PADDING) return false;
    this.bulletHitPaddingPx = value; return true;
  }
  configureMode(id: string, value: unknown): boolean {
    if (id !== this.host || !['lobby', 'results'].includes(this.phase) || (value !== 'timed' && value !== 'stock')) return false;
    this.mode = value; return true;
  }
  configureStocks(id: string, value: unknown): boolean {
    if (id !== this.host || !['lobby', 'results'].includes(this.phase) || ![1, 3, 5].includes(value as number)) return false;
    this.startingStocks = value as number; return true;
  }
  private finish(result: MatchResult) {
    this.scatterBoots.reset(this.tick);
    this.phase = 'results'; this.result = result; this.bullets = []; this.bounces = []; this.impacts = [];
    for (const p of this.players.values()) this.queues.set(p.id, []);
  }
  start(id: string): boolean {
    if (id !== this.host || this.players.size < 2 || !['lobby', 'results'].includes(this.phase)) return false;
    this.scatterBoots.reset(this.tick + COUNTDOWN_TICKS);
    this.resetPlayers(); this.bullets = []; this.bounces = []; this.impacts = []; this.result = null; this.events = [];
    this.phase = 'countdown'; this.phaseEnds = this.tick + COUNTDOWN_TICKS; return true;
  }
  submit(id: string, value: unknown): boolean {
    const packet = parseInput(value), player = this.players.get(id), queue = this.queues.get(id);
    const last = this.received.get(id) ?? 0;
    if (!packet || !player || !queue || packet.seq <= last || packet.seq > last + 120 || queue.length >= 12) return false;
    this.received.set(id, packet.seq);
    if (this.phase !== 'running' || !player.alive) { player.ack = packet.seq; return true; }
    queue.push(packet); return true;
  }
  private resetPlayers() {
    for (const p of this.players.values()) {
      p.state = createAbilityState(this.world.spawns[p.slot] ?? { x: 40, y: 40 });
      p.alive = true; p.respawnAt = 0; p.protectedUntil = 0; p.kills = 0; p.deaths = 0; p.shots = 0; p.stocks = this.startingStocks;
      p.ack = this.received.get(p.id) ?? 0; this.lastInputAt.set(p.id, this.tick); this.queues.set(p.id, []); this.held.set(p.id, { ...NEUTRAL_INPUT });
    }
  }
  private note(text: string, death?: MatchSnapshot['events'][number]['death']) { this.events.push({ tick: this.tick, text, ...(death ? { death } : {}) }); this.events = this.events.slice(-5); }
  private spawn(p: MatchPlayer) {
    const opponents = [...this.players.values()].filter(other => other.id !== p.id && other.alive);
    const spawns = [...this.world.spawns];
    spawns.sort((a, b) => {
      const distance = (s: typeof a) => Math.min(...opponents.map(o => Math.hypot(wrapDx(s.x, o.state.player.x), wrapDy(s.y, o.state.player.y))), Infinity);
      return distance(b) - distance(a);
    });
    const { dashCooldown, dashReadyRemaining } = p.state;
    p.state = { ...createAbilityState(spawns[0] ?? { x: 40, y: 40 }), dashCooldown, dashReadyRemaining, dashCharge: dashCooldown === 0 }; p.alive = true; p.respawnAt = 0;
    p.protectedUntil = this.tick + PROTECTION_TICKS; p.ack = this.received.get(p.id) ?? p.ack;
    this.queues.set(p.id, []); this.held.set(p.id, { ...NEUTRAL_INPUT });
  }
  advance() {
    this.tick++;
    if (this.phase === 'countdown' && this.tick >= this.phaseEnds) {
      this.phase = 'running'; this.phaseEnds = this.tick + this.duration * 60;
      for (const p of this.players.values()) p.protectedUntil = this.tick + PROTECTION_TICKS;
      this.note('Go!');
    }
    if (this.phase !== 'running') return;
    // Expiry is exclusive: no movement, firing or contacts resolve at/after this tick.
    if (this.tick >= this.phaseEnds) {
      this.finish(this.mode === 'stock' ? stockResult([...this.players.values()], true) : timedResult([...this.players.values()]));
      return;
    }
    this.scatterBoots.advance(this.tick);
    for (const p of this.players.values()) if (!p.alive && this.tick < p.respawnAt) {
      p.state.dashCooldown = Math.max(0, p.state.dashCooldown - FIXED_DT);
      if (p.state.dashCooldown < 1e-9) p.state.dashCooldown = 0;
      if (!p.state.dashCharge && p.state.dashCooldown === 0) p.state.dashReadyRemaining = 1.5;
      p.state.dashCharge = p.state.dashCooldown === 0;
    }
    for (const p of this.players.values()) if (!p.alive && (this.mode !== 'stock' || p.stocks > 0) && this.tick >= p.respawnAt) this.spawn(p);
    const before = new Map([...this.players].map(([id, p]) => [id, structuredClone(p)]));
    for (const p of this.players.values()) {
      if (!p.alive) continue;
      const packet = this.queues.get(p.id)!.shift();
      let input = { ...NEUTRAL_INPUT };
      if (packet) {
        input = packet.input; p.ack = packet.seq; this.lastInputAt.set(p.id, this.tick);
        this.held.set(p.id, { x: input.x, jumpHeld: input.jumpHeld, jumpPressed: false });
      }
      // No arrivals: stop after 200 ms rather than run or hold a jump forever on a lost connection.
      else if (this.tick - (this.lastInputAt.get(p.id) ?? 0) < 12) input = this.held.get(p.id)!;
      const protectedNow = p.protectedUntil > this.tick;
      const next = stepAbilities({ ...p.state, projectiles: [] }, input, this.world, MATCH_MOVEMENT, DEFAULT_ABILITIES, true, !protectedNow, activeBoot(this.scatterBoots.state, this.tick));
      next.player.tick = this.tick;
      if (next.shotThisTick) {
        p.shots++;
        for (const b of next.projectiles) this.bullets.push({ ...b, owner: p.id });
      }
      next.projectiles = []; p.state = next;
    }
    const hits: { attacker: string; victim: string; stomp: boolean }[] = [];
    const eligible = (p: MatchPlayer) => p.alive && p.protectedUntil <= this.tick;
    for (const a of this.players.values()) for (const b of this.players.values()) {
      if (a.id !== b.id && eligible(a) && eligible(b) && stompCrossing(a, before.get(a.id)!, b, before.get(b.id)!)) hits.push({ attacker: a.id, victim: b.id, stomp: true });
    }
    const survivors: MatchBullet[] = [];
    for (const bullet of this.bullets) {
      const owner = this.players.get(bullet.owner); if (!owner || !eligible(owner)) continue;
      const next = advanceProjectile(bullet, this.world, DEFAULT_ABILITIES, (x, y, t) => {
        for (const victim of this.players.values()) {
          if (victim.id === owner.id || !eligible(victim)) continue;
          const old = before.get(victim.id)!.state.player, current = victim.state.player;
          if (bulletHitsPlayer(this.world, x, y, interpolateWrapped(old.x, current.x, t, WORLD_WIDTH), interpolateWrapped(old.y, current.y, t, WORLD_HEIGHT), this.bulletHitPaddingPx)) {
            hits.push({ attacker: owner.id, victim: victim.id, stomp: false }); return true;
          }
        }
        return false;
      }, (x, y) => {
        this.impacts.push({ key: `${this.tick}:${bullet.owner}:${bullet.id}`, tick: this.tick, x, y });
        this.impacts = this.impacts.filter(i => i.tick > this.tick - 120).slice(-32);
      });
      if (next) {
        survivors.push(next);
        if (next.bounced && !bullet.bounced) {
          this.bounces.push({ key: `${this.tick}:${bullet.owner}:${bullet.id}`, tick: this.tick, x: next.x, y: next.y });
          this.bounces = this.bounces.filter(b => b.tick > this.tick - 120).slice(-32);
        }
      }
    }
    this.bullets = survivors;
    // Gather contacts first, then resolve once per victim; mutual hits remain possible.
    hits.sort((a, b) => Number(b.stomp) - Number(a.stomp) || a.attacker.localeCompare(b.attacker) || a.victim.localeCompare(b.victim));
    const killed = new Set<string>();
    for (const hit of hits) {
      if (killed.has(hit.victim)) continue;
      const attacker = this.players.get(hit.attacker)!, victim = this.players.get(hit.victim)!;
      attacker.kills++; victim.deaths++; victim.alive = false; victim.respawnAt = this.tick + RESPAWN_TICKS;
      if (this.mode === 'stock') { victim.stocks = Math.max(0, victim.stocks - 1); if (!victim.stocks) victim.respawnAt = 0; }
      killed.add(victim.id); this.queues.set(victim.id, []);
      if (hit.stomp) {
        attacker.state = refillResources(attacker.state); attacker.state.player.vy = -150;
        attacker.state.player.variableJumpTimer = 0; attacker.state.player.grounded = false;
      }
      this.note(`Player ${attacker.slot + 1} ${hit.stomp ? 'stomped' : 'shot'} Player ${victim.slot + 1}.`,
        { player: victim.id, slot: victim.slot, x: victim.state.player.x, y: victim.state.player.y });
    }
    this.bullets = this.bullets.filter(b => !killed.has(b.owner));
    const collector = this.scatterBoots.collect([...this.players.values()].map(p => ({ id: p.id, alive: p.alive, x: p.state.player.x, y: p.state.player.y })), this.tick);
    if (collector) this.note(`${PLAYER_IDENTITIES[this.players.get(collector)!.slot]!.name} grabbed ${this.scatterBoots.state.mode} boots — everyone switches for 8 seconds!`);
    if (this.mode === 'stock' && [...this.players.values()].filter(p => p.stocks > 0).length <= 1) this.finish(stockResult([...this.players.values()]));
  }
  snapshot(): MatchSnapshot { return structuredClone({ tick: this.tick, phase: this.phase, host: this.host, duration: this.duration, bulletHitPaddingPx: this.bulletHitPaddingPx, mode: this.mode, startingStocks: this.startingStocks,
    arenaId: this.world.id, scatter: this.scatterBoots.state, phaseEnds: this.phaseEnds, players: [...this.players.values()], bullets: this.bullets, result: this.result, impacts: this.impacts, bounces: this.bounces, events: this.events }); }
}
