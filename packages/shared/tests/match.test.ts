import { describe, expect, it } from 'vitest';
import { BULLET_HIT_PADDING, bulletHitsPlayer, MatchEngine, NEUTRAL_INPUT, PROTECTION_TICKS, RESPAWN_TICKS, parseInput, timedResult } from '../src';
import type { MatchPlayer, WorldMap } from '../src';
const world: WorldMap = { id: 'combat', width: 40, height: 24, spawns: [{ x: 40, y: 50 }, { x: 100, y: 50 }, { x: 240, y: 150 }], rows: Array(24).fill('.'.repeat(40)) };
function ready(map = world) { const game = new MatchEngine(map); game.add('a'); game.add('b'); game.phase = 'running'; game.phaseEnds = 10000; return game; }
function player(game: MatchEngine, id: string) { return game.players.get(id)!; }
function packet(seq: number, jumpPressed = false) { return { seq, input: { ...NEUTRAL_INPUT, jumpPressed } }; }
function place(p: MatchPlayer, x: number, y: number, vy = 0) { Object.assign(p.state.player, { x, y, vy, vx: 0, grounded: false, coyoteTimer: 0, remainderX: 0, remainderY: 0 }); }
describe('lobby and match lifecycle', () => {
  it('shares bounded host-only bullet tolerance and locks it during play', () => {
    const game = new MatchEngine(world); game.add('a'); game.add('b');
    expect(game.snapshot().bulletHitPaddingPx).toBe(8);
    expect(game.configureBulletPadding('b', 8)).toBe(false);
    for (const invalid of [-1, 9, 1.5, NaN, Infinity, '4', null]) expect(game.configureBulletPadding('a', invalid)).toBe(false);
    expect(game.configureBulletPadding('a', 0)).toBe(true);
    expect(game.configureBulletPadding('a', 8)).toBe(true);
    expect(game.snapshot().bulletHitPaddingPx).toBe(8);
    game.start('a'); expect(game.configureBulletPadding('a', 2)).toBe(false);
    game.phase = 'running'; expect(game.configureBulletPadding('a', 2)).toBe(false);
    game.phase = 'results'; expect(game.configureBulletPadding('a', 5)).toBe(true);
    game.start('a'); expect(game.snapshot().bulletHitPaddingPx).toBe(5);
    game.remove('a'); expect(game.configureBulletPadding('b', 4)).toBe(true);
  });
  it('requires two players, host authority, and locks active matches', () => {
    const game = new MatchEngine(world); expect(game.add('a')).toBe(true); expect(game.start('a')).toBe(false);
    game.add('b'); game.add('c'); game.add('d'); expect(game.add('e')).toBe(false); expect(game.start('b')).toBe(false); expect(game.configure('b', 30)).toBe(false);
    expect(game.configure('a', 30)).toBe(true); expect(game.configure('a', -1)).toBe(false); expect(game.start('a')).toBe(true); expect(game.add('c')).toBe(false);
    for (let i = 0; i < 180; i++) game.advance();
    expect(game.phase).toBe('running'); expect(player(game, 'a').protectedUntil).toBe(game.tick + PROTECTION_TICKS);
    expect(game.phaseEnds - game.tick).toBe(1800);
  });
  it('cancels on departure, transfers host, and permits a replacement', () => {
    const game = ready(); game.remove('a'); expect(game.phase).toBe('lobby'); expect(game.host).toBe('b'); expect(game.add('c')).toBe(true);
    expect(game.start('b')).toBe(true);
  });
  it('cancels countdown without awarding a win, clears old feedback, and tolerates repeated leave', () => {
    const game = new MatchEngine(world); game.add('a'); game.add('b'); game.configure('a', 60); game.configureBulletPadding('a', 5); game.start('a');
    game.events.push({ tick: 0, text: 'old death', death: { player: 'b', slot: 1, x: 100, y: 50 } });
    game.remove('b'); expect(game.phase).toBe('lobby'); expect(game.result).toBeNull(); expect(game.host).toBe('a');
    expect(game.events).toHaveLength(1); expect(game.events[0]!.text).toContain('no winner');
    expect(game.events[0]!.death).toBeUndefined(); expect(game.duration).toBe(60); expect(game.bulletHitPaddingPx).toBe(5);
    const snapshot = game.snapshot(); game.remove('b'); expect(game.snapshot()).toEqual(snapshot);
    game.add('c'); expect(game.start('a')).toBe(true);
  });
  it('preserves final standings after host departure and replacement, then resets on rematch', () => {
    const game = ready(); player(game, 'a').kills = 2; game.phaseEnds = 1; game.advance();
    const final = game.snapshot().result; game.remove('a');
    expect(game.phase).toBe('results'); expect(game.host).toBe('b'); expect(game.result).toEqual(final);
    expect(game.start('b')).toBe(false); expect(game.add('c')).toBe(true); expect(game.result).toEqual(final);
    expect(game.result!.standings.find(p => p.id === 'a')!.slot).toBe(0);
    game.advance(); expect(game.result).toEqual(final); expect(game.start('b')).toBe(true);
    expect(game.result).toBeNull(); expect([...game.players.values()].every(p => p.kills === 0 && p.shots === 0 && p.deaths === 0)).toBe(true);
  });
  it('freezes results and resets state/statistics/projectiles while preserving duration on rematch', () => {
    const game = ready(); game.duration = 30; player(game, 'a').kills = 3; player(game, 'a').shots = 5;
    game.phaseEnds = 1; game.advance(); expect(game.phase).toBe('results'); const result = game.snapshot().result;
    for (let i = 0; i < 20; i++) game.advance(); expect(game.snapshot().result).toEqual(result);
    expect(game.start('a')).toBe(true); expect(game.duration).toBe(30); expect(game.bullets).toHaveLength(0);
    expect(player(game, 'a').kills).toBe(0); expect(player(game, 'a').shots).toBe(0); expect(player(game, 'a').state.ammo).toBe(4);
  });
});
describe('server inputs and shot acceptance', () => {
  it('rejects invalid, duplicate, stale, excessive sequence gaps and oversized queues', () => {
    const game = ready(); expect(parseInput({ seq: 1, input: { x: 0, jumpHeld: false, jumpPressed: 'yes' } })).toBeNull();
    expect(parseInput({ seq: NaN, input: NEUTRAL_INPUT })).toBeNull(); expect(parseInput({ seq: 1, input: { ...NEUTRAL_INPUT, dashDirection: 2 } })).toBeNull();
    expect(game.submit('a', packet(1, true))).toBe(true); expect(game.submit('a', packet(1, true))).toBe(false); expect(game.submit('a', packet(0))).toBe(false);
    expect(game.submit('a', packet(1000))).toBe(false); expect(game.submit('unknown', packet(1))).toBe(false);
    for (let seq = 2; seq <= 12; seq++) expect(game.submit('a', packet(seq))).toBe(true);
    expect(game.submit('a', packet(13))).toBe(false);
  });
  it('limits movement to one fixed step per server tick regardless of packet flood', () => {
    const game = ready(); for (let seq = 1; seq <= 12; seq++) game.submit('a', { seq, input: { ...NEUTRAL_INPUT, x: 1, dashDirection: 1 } });
    game.advance(); expect(player(game, 'a').state.player.x).toBe(47); expect(player(game, 'a').ack).toBe(1);
  });
  it('drops stale held controls after 200 ms without new packets', () => {
    const game = ready(); game.submit('a', { seq: 1, input: { ...NEUTRAL_INPUT, x: 1 } }); game.advance();
    for (let i = 0; i < 40; i++) game.advance(); expect(player(game, 'a').state.player.vx).toBe(0);
  });
  it('owns ammo, cooldown and accepted shot count and does not accept protected firing', () => {
    const game = ready(); game.submit('a', packet(1, true)); game.advance(); expect(player(game, 'a').shots).toBe(1); expect(player(game, 'a').state.ammo).toBe(3);
    game.submit('a', packet(2, true)); game.advance(); expect(player(game, 'a').shots).toBe(1);
    player(game, 'a').protectedUntil = game.tick + 100; player(game, 'a').state.shotCooldown = 0;
    game.submit('a', packet(3, true)); game.advance(); expect(player(game, 'a').shots).toBe(1);
  });
  it('processes delayed queues deterministically, with no duplicate actions', () => {
    const script = (batch: boolean) => {
      const game = ready();
      for (let tick = 0; tick < 60; tick++) {
        if (batch && tick % 3 === 0) for (let n = 0; n < 3; n++) game.submit('a', { seq: tick + n + 1, input: { x: 1, jumpHeld: false, jumpPressed: (tick + n) % 15 === 0 } });
        if (!batch) game.submit('a', { seq: tick + 1, input: { x: 1, jumpHeld: false, jumpPressed: tick % 15 === 0 } });
        game.advance();
      }
      return player(game, 'a');
    };
    expect(script(true)).toEqual(script(false));
  });
});
describe('stomps and protection', () => {
  it('resolves a top crossing once, bounces without instant ammo or dash recharge', () => {
    const game = ready(); place(player(game, 'a'), 100, 41, 120); place(player(game, 'b'), 100, 53);
    player(game, 'a').state.ammo = 0; player(game, 'a').state.dashCharge = false; player(game, 'a').state.dashCooldown = 8;
    game.advance(); expect(player(game, 'b').alive).toBe(false); expect(player(game, 'a').kills).toBe(1);
    expect(player(game, 'a').state.player.vy).toBe(-150); expect(player(game, 'a').state.ammo).toBe(0); expect(player(game, 'a').state.reloadRemaining).toBe(3); expect(player(game, 'a').state.dashCharge).toBe(false);
    game.advance(); expect(player(game, 'a').kills).toBe(1);
  });
  it('detects crossing both wrap seams without side-contact kills', () => {
    const game = ready(); place(player(game, 'a'), 319, 180, 120); place(player(game, 'b'), 0, 1); game.advance(); expect(player(game, 'a').kills).toBe(1);
    const side = ready(); place(player(side, 'a'), 100, 50, 120); place(player(side, 'b'), 104, 50); side.advance(); expect(player(side, 'a').kills).toBe(0);
  });
  it('disables a dash attack while allowing a dashing victim to be stomped', () => {
    const game = ready(); place(player(game, 'a'), 100, 41, 120); place(player(game, 'b'), 100, 53);
    game.submit('a', { seq: 1, input: { ...NEUTRAL_INPUT, dashDirection: 1 } }); game.advance(); expect(player(game, 'a').kills).toBe(0);
    const victim = ready(); place(player(victim, 'a'), 100, 41, 120); place(player(victim, 'b'), 96, 53);
    victim.submit('b', { seq: 1, input: { ...NEUTRAL_INPUT, dashDirection: 1 } }); victim.advance(); expect(player(victim, 'b').alive).toBe(false);
  });
  it('protects both sides and respawns after 90 ticks at a distant spawn', () => {
    const protectedGame = ready(); place(player(protectedGame, 'a'), 100, 41, 120); place(player(protectedGame, 'b'), 100, 53); player(protectedGame, 'a').protectedUntil = 100;
    protectedGame.advance(); expect(player(protectedGame, 'b').alive).toBe(true);
    const game = ready(); place(player(game, 'a'), 100, 41, 120); place(player(game, 'b'), 100, 53); game.advance(); const deathTick = game.tick;
    for (let i = 0; i < RESPAWN_TICKS - 1; i++) game.advance(); expect(player(game, 'b').alive).toBe(false);
    game.advance(); expect(player(game, 'b').alive).toBe(true); expect(player(game, 'b').protectedUntil).toBe(deathTick + RESPAWN_TICKS + PROTECTION_TICKS);
  });
});
describe('swept bullets and deterministic outcomes', () => {
  it('changes actual authoritative hits at zero and maximum tolerance, retaining cover', () => {
    const run = (padding: number, x: number) => {
      const game = new MatchEngine(world); game.add('a'); game.add('b');
      game.configureBulletPadding('a', padding); game.phase = 'running'; game.phaseEnds = 1000;
      place(player(game, 'b'), 100, 50);
      game.bullets = [{ owner: 'a', id: 1, x, y: 49, remaining: 0.5 }]; game.advance();
      return player(game, 'b').alive;
    };
    expect(run(0, 96)).toBe(true); expect(run(0, 102)).toBe(false);
    expect(run(3, 112)).toBe(true); expect(run(8, 112)).toBe(false);
    expect(bulletHitsPlayer(world, 317, 188, 1, 1, 0)).toBe(false);
    expect(bulletHitsPlayer(world, 317, 188, 1, 1, 8)).toBe(true);
    const rows = [...world.rows]; rows[7] = '.'.repeat(13) + '#' + '.'.repeat(26);
    expect(bulletHitsPlayer({ ...world, rows }, 102, 60, 105, 64, 8)).toBe(false);
  });
  it('accepts near misses on either side but rejects shots outside the tolerance', () => {
    expect(BULLET_HIT_PADDING).toBe(8);
    expect(bulletHitsPlayer(world, 96, 52, 100, 50, 3)).toBe(true);
    expect(bulletHitsPlayer(world, 110, 52, 100, 50, 3)).toBe(true);
    expect(bulletHitsPlayer(world, 94, 52, 100, 50, 3)).toBe(false);
    expect(bulletHitsPlayer(world, 112, 52, 100, 50, 3)).toBe(false);
    expect(bulletHitsPlayer(world, 102, 44, 100, 50, 3)).toBe(true);
    expect(bulletHitsPlayer(world, 102, 63, 100, 50, 3)).toBe(true);
    expect(bulletHitsPlayer(world, 102, 42, 100, 50, 3)).toBe(false);
    expect(bulletHitsPlayer(world, 102, 65, 100, 50, 3)).toBe(false);
  });
  it('wraps the tolerance through both seams', () => {
    expect(bulletHitsPlayer(world, 317, 188, 1, 1, 3)).toBe(true);
    expect(bulletHitsPlayer(world, 315, 188, 1, 1, 3)).toBe(false);
  });
  it('does not let the tolerance reach around solid cover', () => {
    const rows = [...world.rows]; rows[7] = '.'.repeat(13) + '#' + '.'.repeat(26);
    const cover = { ...world, rows };
    expect(bulletHitsPlayer(world, 102, 60, 105, 64)).toBe(true);
    expect(bulletHitsPlayer(cover, 102, 60, 105, 64)).toBe(false);
  });
  it('resolves a near-miss kill once and publishes its authoritative death position', () => {
    const game = ready(); place(player(game, 'b'), 100, 50);
    game.bullets = [{ owner: 'a', id: 1, x: 96, y: 49, remaining: 0.5 }];
    game.advance(); expect(player(game, 'b').alive).toBe(false); expect(player(game, 'a').kills).toBe(1);
    expect(game.snapshot().events.at(-1)?.death).toEqual({ player: 'b', slot: 1, x: 100, y: player(game, 'b').state.player.y });
    game.advance(); expect(player(game, 'a').kills).toBe(1);
    const protectedGame = ready(); place(player(protectedGame, 'b'), 100, 50); player(protectedGame, 'b').protectedUntil = 100;
    protectedGame.bullets = [{ owner: 'a', id: 1, x: 96, y: 49, remaining: 0.5 }];
    protectedGame.advance(); expect(player(protectedGame, 'b').alive).toBe(true); expect(protectedGame.snapshot().events).toHaveLength(0);
  });
  it('hits across the vertical seam, never hits its owner, and handles fast moving targets', () => {
    const game = ready(); place(player(game, 'a'), 10, 100); place(player(game, 'b'), 319, 0);
    game.bullets = [{ owner: 'a', id: 1, x: 0, y: 189, remaining: 0.5 }]; game.advance(); expect(player(game, 'b').alive).toBe(false);
    const own = ready(); own.bullets = [{ owner: 'a', id: 1, x: 40, y: 50, remaining: 0.5 }]; own.advance(); expect(player(own, 'a').alive).toBe(true);
  });
  it('stops at tiles before resolving a hit beyond them', () => {
    const tiled = { ...world, rows: world.rows.map((row, i) => i === 8 ? '#'.repeat(40) : row) };
    const game = ready(tiled); place(player(game, 'b'), 100, 72); game.bullets = [{ owner: 'a', id: 1, x: 100, y: 62, remaining: 0.5 }];
    game.advance(); expect(player(game, 'b').alive).toBe(true); expect(game.bullets).toHaveLength(0);
  });
  it('allows simultaneous projectile kills and clears dead owners’ lingering bullets', () => {
    const game = ready(); place(player(game, 'a'), 100, 50); place(player(game, 'b'), 100, 90);
    game.bullets = [{ owner: 'a', id: 1, x: 100, y: 87, remaining: 0.5 }, { owner: 'b', id: 1, x: 100, y: 47, remaining: 0.5 }];
    game.advance(); expect(player(game, 'a').alive).toBe(false); expect(player(game, 'b').alive).toBe(false);
    expect(player(game, 'a').kills).toBe(1); expect(player(game, 'b').kills).toBe(1); expect(game.bullets).toHaveLength(0);
  });
  it('does not let existing bullets bypass owner/victim protection', () => {
    const game = ready(); player(game, 'a').protectedUntil = 100;
    game.bullets = [{ owner: 'a', id: 1, x: 100, y: 47, remaining: 0.5 }]; game.advance(); expect(player(game, 'b').alive).toBe(true); expect(game.bullets).toHaveLength(0);
  });
});
describe('timed result rules', () => {
  it('counts a kill before expiry but blocks a queued shot and contact at expiry', () => {
    const game = ready(); game.phaseEnds = game.tick + 2;
    place(player(game, 'a'), 100, 41, 120); place(player(game, 'b'), 100, 53);
    game.advance(); expect(player(game, 'a').kills).toBe(1);
    game.submit('a', packet(1, true)); game.advance();
    expect(game.phase).toBe('results'); expect(game.result!.winners).toEqual(['a']); expect(player(game, 'a').shots).toBe(0);
    const frozen = game.snapshot().result; game.submit('a', packet(2, true)); game.advance(); expect(game.result).toEqual(frozen);
    const expiry = ready(); expiry.phaseEnds = expiry.tick + 1;
    place(player(expiry, 'a'), 100, 41, 120); place(player(expiry, 'b'), 100, 53);
    expiry.submit('a', packet(1, true)); expiry.advance();
    expect(expiry.result!.reason).toBe('draw'); expect(player(expiry, 'a').shots).toBe(0); expect(player(expiry, 'b').deaths).toBe(0);
  });
  it('includes simultaneous last-tick kills and resolves the accepted-shot tiebreak once', () => {
    const game = ready(); game.phaseEnds = game.tick + 2;
    place(player(game, 'a'), 100, 50); place(player(game, 'b'), 100, 90);
    player(game, 'a').shots = 10; player(game, 'b').shots = 20;
    game.bullets = [{ owner: 'a', id: 1, x: 100, y: 87, remaining: 0.5 }, { owner: 'b', id: 1, x: 100, y: 47, remaining: 0.5 }];
    game.advance(); game.advance();
    expect(game.result!.reason).toBe('shots'); expect(game.result!.winners).toEqual(['a']);
    expect(game.result!.standings.map(p => p.kills)).toEqual([1, 1]);
    const final = game.snapshot().result; game.remove('b'); game.advance(); expect(game.result).toEqual(final);
  });
  it('uses kills, then fewer accepted shots, then shared victory; no-kill matches draw', () => {
    const game = ready(); const a = player(game, 'a'), b = player(game, 'b');
    expect(timedResult([a, b]).reason).toBe('draw'); a.kills = 2; b.kills = 1; expect(timedResult([a, b]).winners).toEqual(['a']);
    b.kills = 2; a.shots = 10; b.shots = 100; expect(timedResult([a, b]).reason).toBe('shots'); expect(timedResult([a, b]).winners).toEqual(['a']);
    b.shots = 10; expect(timedResult([a, b]).winners).toEqual(['a', 'b']); expect(timedResult([a, b]).reason).toBe('shared');
  });
});

 describe('dash cooldown across respawn', () => {
  it('continues the cooldown through death instead of granting another dash', () => {
    const game = ready(), a = player(game, 'a');
    a.state.dashCooldown = 8; a.state.dashCharge = false;
    a.alive = false; a.respawnAt = game.tick + 90;
    for (let i = 0; i < 90; i++) game.advance();
    expect(a.alive).toBe(true); expect(a.state.dashCooldown).toBeCloseTo(6.5);
    expect(a.state.dashCharge).toBe(false); expect(a.state.ammo).toBe(4);
  });
});
