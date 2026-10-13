# PROJECT BRIEF: Online multiplayer arena platformer ("gunboots arena")

> Paste this whole document as your first message to ChatGPT. It is written to ChatGPT as the reader.

---

## 0. How I want you to work (read first)

You are my pair-programmer for a ~4-week project. I have old game-dev experience (Unity), strong C/embedded/control-systems background, and little current web-game experience. Treat me as technically strong but new to this stack.

Rules for this conversation:

1. **Do NOT write game code in your first reply.** In your first reply: (a) restate the game in your own words, (b) list anything ambiguous or any concern you have, (c) propose the repo/file structure, (d) state the exact library versions you intend to use. Then wait for my answers.
2. **Work in phases** (Section 12). Finish and test one phase before starting the next. At the end of each phase, tell me exactly how to run and verify it.
3. **Give complete files**, not fragments, unless I ask for a diff. Say the file path above every code block.
4. **State library versions** and check your API usage against them. Your knowledge of Phaser, Colyseus, and Vite APIs may be outdated. If you are unsure of an API, say so rather than guessing.
5. **Be blunt.** If one of my decisions is a bad idea, say so and propose an alternative. I prefer honest assessments over diplomatic ones, and realistic scope over optimistic scope.
6. **Cut scope before adding scope.** If something risks the deadline, tell me.

---

## 1. Context

- This is an entry for an OpenAI challenge: "Build a multiplayer game with ChatGPT." Requirements as I understand them: the game must be multiplayer, playable by friends via a shareable link, and built with ChatGPT writing the code. Deadline: **October 31, 11:59 PM PT.**
- **Unknown, I will verify:** whether external engines or frameworks are allowed, and how submissions are judged. Until I confirm, assume a web-based game with a public URL is safest.
- I have roughly four weeks, part-time. Shipping a finished, joinable, fun game beats a big unfinished one.

---

## 2. Game concept

A fast, small-arena, 2-4 player competitive platformer in the spirit of **TowerFall** (arena kills, short rounds), with the **movement feel of Celeste** (tight, hand-tuned, responsive), and a signature mechanic borrowed from **Downwell: gunboots**.

**Core loop:** Move and jump around a single-screen arena. Kill other players by either **stomping** on them from above or **shooting downward** from your boots. Shooting downward is limited by ammo. Ammo refills when you touch the ground or stomp someone. The match ends according to the mode the players choose in the lobby, Smash Bros-style: **Stock mode** (finite lives, last player standing wins) or **Timed mode** (most points when the timer ends wins). See Section 6.12.

**Signature physics quirk:** Shooting downward applies **recoil**, which slows your fall or boosts you upward. This is the "quirky physics" of the game. It is implemented as a velocity impulse in my own movement code, not by a physics engine.

**Different boots:** Each pair of boots is a data-driven config (ammo count, recoil strength, projectile type, fire rate). Planned: 3 types at launch, not more.

**Wrap-around on both axes:** The arena is a torus with no walls and no death zone. Fall below the bottom edge and you reappear at the top at the **same x coordinate**; run off the right edge and you appear on the left at the same y. Velocity is preserved, like an infinite scroller in place. Same for projectiles. Falling is a tactic (you can loop around and stomp someone from above), not a death.

---

## 3. Hard constraints and non-goals

**Constraints**
- **No rigid-body physics and no physics engine.** No Phaser Arcade Physics, no Matter.js, no Planck/Box2D. All movement and collision is my own code.
- Movement must feel like Celeste: tight, deterministic, tuned by hand.
- Single-screen fixed arena. No scrolling camera. Every client sees the whole arena.
- Playable by joining a link in a desktop browser (keyboard first, gamepad optional later).
- Must work reliably with 2 players and ideally up to 4.

**Non-goals (do not build unless I ask)**
- Rigid bodies, ragdolls, destructible terrain, physics-simulated crates
- Accounts, login, matchmaking, ranked ladder, anti-cheat beyond basic sanity checks
- Mobile touch controls
- A level editor (use ASCII or simple tilemap arrays)
- Fancy art. Placeholder rectangles first. Art and audio come last.

---

## 4. Tech stack (my decision, challenge me if you disagree)

- **Client:** Phaser 3 (latest stable 3.x) + TypeScript (strict) + Vite. Phaser is used **only for rendering, input, scenes, and audio.** Do not use its physics.
- **Server:** Node.js + TypeScript + **Colyseus** (rooms, state sync, join-by-room-id).
- **Shared package:** pure TypeScript with the simulation (`step` function), constants, boot configs, wrap math. No Phaser, no Node-only imports. It must run identically in the browser and on the server.
- **Tests:** Vitest for the shared package.
- **Deploy:** single deployable (server serves the built client as static files), so one public URL. Candidate hosts: Railway, Render, Fly.io. Tell me the tradeoffs, especially around free tiers sleeping (see Section 11).
- Monorepo with workspaces: `packages/shared`, `packages/server`, `packages/client`.

---

## 5. Architecture principle: one pure simulation function

The most important design rule:

```
step(state: PlayerState, input: PlayerInput, world: WorldMap, dt: number): PlayerState
```

- **Pure and deterministic.** Same inputs produce the same outputs on client and server. No `Math.random()`, no Date, no Phaser objects inside it.
- **Fixed timestep: 60 Hz** (dt = 1/60). The client uses an accumulator so rendering framerate never changes physics. Clamp the max accumulated time (e.g. 0.25 s) so a backgrounded tab doesn't cause a spiral of catch-up steps.
- Use integer or fixed-precision positions if you think determinism requires it, and tell me the tradeoff. Celeste itself uses float positions with subpixel remainders and moves in whole pixels.
- Rendering reads from state and interpolates. It never mutates simulation state.

---

## 6. Physics specification (the heart of this document)

### 6.1 Units and world

- Logical resolution **320 x 192** px, scaled up with nearest-neighbor filtering (crisp pixels).
- Tile size **8 px**. Arena = 40 x 24 tiles.
- Tile types: empty, solid. (One-way platforms are a possible later addition. Ask me before adding.)
- Player hitbox: **8 x 11 px** (Celeste-like). Hitbox is an AABB.
- Velocities in px/second, accelerations in px/second^2, times in seconds. Positions are floats, but **movement is applied in whole-pixel steps with a stored subpixel remainder** (this is how Celeste avoids jitter and tunneling).

### 6.2 Collision: move-and-slide, axis separated

Never use a physics engine. Implement:

1. Accumulate `remainderX += vx * dt`. Compute `moveX = round(remainderX)`; subtract from the remainder.
2. Move **one pixel at a time** along X, checking the AABB against solid tiles each step. If blocked: zero `vx`, zero the X remainder, stop.
3. Repeat for Y separately (resolve X first, then Y).
4. "On ground" = a solid tile exists immediately below the hitbox bottom edge (and `vy >= 0`).
5. One-pixel stepping makes tunneling impossible at the speeds in this spec. If you propose bigger steps for performance, justify it.

### 6.3 Horizontal movement

Starting values (these are close to Celeste's; **expose all in one `constants.ts` and a live-tuning debug panel**):

| Constant | Value | Meaning |
|---|---|---|
| MAX_RUN | 90 | max horizontal speed on ground |
| RUN_ACCEL | 1000 | accel toward target speed |
| RUN_REDUCE | 400 | decel when over MAX_RUN |
| AIR_MULT | 0.65 | multiplier on accel while airborne |

Each tick: `target = input.x * MAX_RUN`. If `|vx| > MAX_RUN` and the input is in the same direction, decelerate with `RUN_REDUCE`, else accelerate with `RUN_ACCEL`. Multiply by `AIR_MULT` when airborne. Use an `approach(current, target, maxDelta)` helper.

### 6.4 Gravity and falling

| Constant | Value | Meaning |
|---|---|---|
| GRAVITY | 900 | downward accel |
| MAX_FALL | 160 | terminal fall speed |
| HALF_GRAV_THRESHOLD | 40 | while jump is held and `abs(vy)` is below this, gravity is halved (floaty apex) |

Each tick: apply gravity (halved at the apex when jump is held), then approach `MAX_FALL` as a cap on downward `vy`. Do **not** implement Celeste's "hold down to fall faster" initially. It conflicts with fall-based tactics. Ask me if you think it should be added.

### 6.5 Jumping (this is where the feel lives)

| Constant | Value |
|---|---|
| JUMP_SPEED | -105 (upward) |
| JUMP_H_BOOST | 40 (extra horizontal speed in held direction at jump start) |
| VAR_JUMP_TIME | 0.2 s |
| COYOTE_TIME | 0.1 s |
| JUMP_BUFFER | 0.1 s |

- **Coyote time:** you can still jump for 0.1 s after walking off a ledge.
- **Jump buffering:** a jump press up to 0.1 s before landing still triggers the jump on landing.
- **Variable jump height:** after jumping, while the jump button stays held for up to `VAR_JUMP_TIME`, `vy` is held at no less than the jump speed. Releasing early cuts the jump short (set `vy` toward 0 / apply the short-hop rule).
- **Corner correction:** when moving up and clipping a ceiling corner by <= 4 px horizontally, nudge the player sideways instead of stopping the jump. Same for walking into the lip of a ledge by <= 2 px (step up).
- Input must be edge-detected (pressed this frame) and held-state both available to `step`.

### 6.6 Dash (IN: build after base movement feels good)

Decided: dash is included. Build it as Phase 1b, after run/jump feel is approved, behind a feature flag so it can be disabled if it wrecks balance.

- **Direction:** 8-way from the held direction. If no direction is held, dash horizontally in the facing direction.
- **Constants (start here, tune):** `DASH_SPEED 240`, `DASH_TIME 0.15`, `END_DASH_SPEED 160` (speed kept when the dash ends), `DASH_COOLDOWN 0.2`.
- **Charges:** 1 dash. Refilled on ground contact and on landing a stomp.
- **During a dash:** gravity is off, velocity is fixed to the dash vector, no variable jump, **no shooting**, and recoil does not apply.
- **Interactions:** dashing does **not** kill anyone. Stomps still require the falling condition in 6.9. A dashing player can be stomped or shot normally. Dashing across a wrap seam works like any other movement.
- **Not in v1:** wall jumps, climbing, and Celeste "hyper/super" dash-jump tech. There are no walls to cling to in a toroidal arena.
- **Concern:** dash + recoil + wrap is a lot of mobility in a small arena. Tune so nobody can evade forever, and tell me if the combination looks unplayable.

### 6.7 Wrap-around on both axes (toroidal arena)

Let `W = 320`, `H = 192`. Leaving any edge returns you on the opposite edge with velocity preserved. No edge is a wall or a death zone.

- **Position wrap:** after movement, `x = ((x % W) + W) % W` and `y = ((y % H) + H) % H`. Positions always live in `[0, W) x [0, H)`.
- **Wrapped distance helpers:** `wrapDx(a, b)`, `wrapDy(a, b)` and `wrapDelta(a, b)` return the shortest signed distance on each axis. **Every** entity-vs-entity and projectile-vs-entity check must use them: stomps, bullet hits, spawn-point selection, everything. Otherwise a player at one edge cannot interact with one who just wrapped to the other.
- **Collision lookups:** tile lookups use modulo indices on both axes.
- **Map margin rule (v1 simplification):** the outer 2 tile rows (top and bottom) and 2 tile columns (left and right) of every map must be empty, so a hitbox crossing a seam never touches tiles on the other side. Platforms float in the interior. We can relax this later once tests prove the modulo lookup correct.
- **Rendering at seams:** draw an entity or projectile up to 4 times when it is near an edge or corner (offsets of 0 or +/-W, 0 or +/-H, only where the sprite actually crosses), so nothing pops in or out. Applies to players, bullets, and effects.
- **Interpolation:** per axis, if two consecutive remote positions differ by more than half the arena size on that axis, snap instead of lerping.
- **Tunneling:** one-pixel stepping plus `MAX_FALL` and the dash speed (at most 4 px/frame) make tunneling impossible. Platforms must be at least 1 tile (8 px) thick.
- **Readability:** with no visible walls, add subtle edge cues (faint glow or ticks on the border, a short ghost of the entity at the opposite edge) so players can read the loop. A fully toroidal arena is disorienting without them.

### 6.8 Gunboots: shooting downward

- Input: a shoot button (e.g. key `K` or `X`). Aim is **always straight down** in the first version. (Ask before adding aim directions.)
- Each boot type has config:

```ts
interface BootConfig {
  id: string;
  maxAmmo: number;
  fireCooldown: number;      // seconds between shots
  recoilSpeed: number;       // upward vy set on shot, px/s
  projectile: {
    speed: number;           // px/s, downward
    count: number;           // bullets per shot
    spreadDeg: number;       // total spread
    lifetime: number;        // seconds before despawn
    pierce: boolean;
    bounces: number;         // ricochets off tiles
    width: number; height: number;
  };
}
```

- **Firing rules:** can fire only if `ammo > 0`, `cooldown <= 0`, and the player is **airborne** (not on ground). Firing decrements ammo.
- **Recoil:** on each shot, `vy = min(vy, -recoilSpeed)`. This is a *set-toward-up* rather than an *add*, so spamming doesn't stack into unlimited rocket flight. It slows your fall and can give a small lift, Downwell-style.
- **Anti-flight rule:** finite ammo is the only thing that bounds recoil. If your tuning allows a player to gain altitude indefinitely with the ammo they have, that is a bug. Tell me the max altitude gain per full magazine in the tuning notes.
- **Ammo refill:** to `maxAmmo` when touching the ground, and when landing a stomp. Never refilled mid-air otherwise.
- **Starting boot set (placeholder numbers, to be tuned):**
  1. **Shotgun boots:** ammo 4, 3 pellets, 25 deg spread, strong recoil, short lifetime.
  2. **Laser boots:** ammo 2, 1 piercing bullet, fast, weak recoil.
  3. **Bouncy boots:** ammo 3, 1 bullet that ricochets once, medium recoil.
- Players start with one default boot per round. **Boot pickups are a stretch goal**, not part of v1.

### 6.9 Stomping

- A **stomp** occurs when, in the same tick:
  - the attacker's `vy > 0` (moving downward) at the moment of contact,
  - the attacker's previous-frame bottom edge was **at or above** the victim's top edge plus a small tolerance (4 px) using `wrapDy`,
  - the hitboxes now overlap horizontally (using `wrapDx`) by at least 1 px and the attacker's feet are within the victim's upper half.
- **Result:** the victim dies. The attacker bounces: `vy = -STOMP_BOUNCE` (start at 150, higher if jump is held), and their ammo is refilled.
- **Simultaneous / mutual stomps:** if both players qualify, the one whose feet are higher relative to the other's body center wins. On an exact tie, **both bounce apart and nobody dies.** Must be deterministic.
- Horizontal contact with no stomp condition does nothing (players pass through or slightly push each other? **Default: players do not collide with each other**, no pushing, only stomps and bullets interact).

### 6.10 Projectiles

- Projectiles move in straight lines (plus ricochet where configured), are not affected by gravity, and are **not** rigid bodies.
- They wrap on both axes like everything else and despawn after `lifetime`.
- They cannot hit their owner for the first 0.15 s, and cannot hit them at all if the owner's identity makes self-hit feel unfair (**default: no self-hit ever**).
- Projectile vs tile: despawn (or ricochet if `bounces > 0`).
- Projectile vs player: kills the player (one-hit) unless they are in spawn protection. Pierce projectiles continue through.
- Ricochet reflection must be deterministic and tested.

### 6.11 Death, respawn, and spawn protection

- On death: short death effect, the player is out for **1.5 s**, then respawns at a spawn point.
- Choose the spawn point **farthest (wrapped distance) from living players** among a fixed list of spawn points per map.
- **Spawn protection: 1.5 s** during which the player cannot be stomped or shot and cannot kill. Render it clearly (flashing).
- This protects against chain-stomping at spawn and against wrap-around camping.

### 6.12 Match modes (chosen by the players in the lobby, like Smash Bros)

The room creator picks the mode and its settings before the match starts, and everyone sees them. Both modes use the same one-hit kills, respawn rules, and spawn protection.

**Stock mode:** each player starts with N lives (default 3, range 1-5). A kill costs the victim one life. At 0 lives a player is eliminated and spectates. Last player alive wins. A hard time cap (default 5 minutes) prevents endless chases on a wrapping arena: at the cap, most lives remaining wins, ties broken by most kills, then sudden death.

**Timed mode:** a fixed timer (default 2 minutes, range 1-5). Each kill gives the killer +1 point. Players respawn as many times as needed. Most points when the timer ends wins. A tie goes to sudden death: next kill wins, with a clear on-screen announcement.

Stomp kills and bullet kills are worth the same in v1. Dying has no point penalty in v1 (there are no self-destructs, since there are no hazards). The server owns timers, lives, and scores, and the settings are part of the synced room state.

---

## 7. Multiplayer model

Platformers feel terrible if movement waits on the server. Use this model for v1:

**Model A (build this first): client-authoritative movement, server-authoritative outcomes.**

- Each client runs `step()` locally for its own player, so movement is instant.
- The client sends its state to the server at ~30 Hz: `{ seq, x, y, vx, vy, facing, ammo, bootId, flags }`.
- The server **sanity-checks** (reject or clamp teleports and impossible speeds, e.g. displacement larger than `maxSpeed * elapsed * tolerance`) and relays state to other clients.
- Remote players are **interpolated** using a ~100 ms render delay. When consecutive positions differ by more than half the arena size on either axis (a wrap), **snap instead of lerping on that axis.**
- **Kills and scoring are decided by the server.**
  - Shooting: the client sends a `fire` event; the server spawns and simulates the projectile at 60 Hz and resolves hits against last-known player positions.
  - Stomps: the attacker's client sends a `stompClaim { victimId }`. The server validates against last-known positions using an expanded hitbox (latency tolerance, favor the attacker) and applies the death.
- Round state (countdown, running, round over, scores, spawns, boot assignment) lives on the server.

**Model B (stretch, probably skip): full server-authoritative with client-side prediction and reconciliation.** More correct, much more work. Only attempt it if everything else is done and polished. Tell me honestly if you think Model A will feel bad.

**Colyseus details**
- One `Room` = one match, joinable by a short room code or URL (`/?room=ABCD`). A "Create game" button creates a room and shows a copyable link.
- Max 4 clients per room. Spectators out of scope.
- Use Colyseus schema for synced room state (scores, round phase, player metadata). Use direct messages for high-frequency position and fire events if the schema overhead is a problem. Tell me which you recommend and why.
- Clean up empty rooms. Handle a player disconnecting mid-round (their player is removed, round continues; reconnect is a nice-to-have, not v1).

---

## 8. Input

- Keyboard: arrows or WASD to move, `Space` or `Z` = jump, `K` or `X` = shoot, `L` or `C` = dash.
- Gamepad support via the browser Gamepad API as a later polish item.
- `step()` receives `{ x: -1|0|1, y: -1|0|1, jumpHeld, jumpPressed, shootHeld, shootPressed, dashPressed }`. Input sampling happens once per fixed tick, not per render frame.

---

## 9. Maps

- Maps are plain arrays of strings (ASCII), e.g. `#` solid, `.` empty, `S` spawn point. No Tiled dependency in v1.
- A loader validates: dimensions 40x24, the outer 2 rows and 2 columns on every side are empty, at least 4 spawn points, no 1-tile-thick pocket that could trap a player, no platform thinner than 1 tile.
- Ship **3 maps** by the end, with staggered platforms so there's no single safe camping spot. Design for vertical layering, since falling and down-shooting are the core of the game.

---

## 10. Visual, UX, and debug requirements

- Placeholder visuals first: colored rectangles for players (different color per player), small rectangles for bullets, a simple tile fill for walls.
- Draw an **ammo indicator** under or beside the player so shooting resources are readable.
- Screen shake and small particles on stomp and death, but only after the core loop works.
- **Debug overlay (toggle with a key):** show hitboxes, tile collision, `vx/vy`, on-ground, coyote/buffer timers, ammo, ping, server tick, and current constants. Include a **live tuning panel** to edit constants without a rebuild. Tuning the feel is most of the work, so make it fast.
- **Replay-free testing aid:** a way to run the simulation headless (in Vitest) with a scripted input sequence and assert resulting positions.

---

## 10A. Art and audio pipeline

**Decisions:** pixel art. You (ChatGPT) generate the sprites as code. I may hand-edit any sprite in **Aseprite**, so the pipeline must let my edited files replace generated ones cleanly.

### Rendering rules (set up in Phase 0, never break them)
- Internal resolution **320 x 192**, scaled up by **integer multiples only** (letterbox the remainder), canvas centered.
- Phaser config: `pixelArt: true`, `roundPixels: true`, antialiasing off. Handle high-DPI screens without blurring.
- Render every sprite at **whole-pixel positions** (`Math.round`). Simulation positions have subpixel remainders, rendering does not.
- No rotation and no non-integer scaling on pixel sprites. Face left/right with a horizontal flip.
- Rendering only **reads** simulation state. Animation is chosen from state, never the other way around.

### Asset pipeline (built to be Aseprite-friendly)
- Final assets are **PNG sprite sheets + JSON atlases** in the format Aseprite exports (Phaser can load it directly). Hand-made assets go in `assets/hand/`. Generated assets go in `assets/generated/`.
- **Loader rule:** if a sprite exists in `assets/hand/`, it is used and the generator must never overwrite it. Otherwise use the generated one.
- Generated art lives as **palette-indexed text grids** in `art-src/` (one character per pixel, mapped to palette indices), for example `..1221..` rows. A Node script `tools/build-sprites.ts` converts them to a PNG sheet and a matching JSON atlas.
- One shared palette in `palette.json`, **16-32 colors**. Propose 2-3 candidate palettes (hex lists) in your first art message, and I will choose.
- **Player colors:** reserve palette indices for the player's primary and secondary color ramps. Bake **one texture per player color at load time** (4 colors). No shaders.
- Build a **sprite preview page** (`/art-preview.html`) that shows every sprite and animation at 4x on a neutral background, with frame numbers. I need to review art without launching a match.

### Before art exists
Phases 0-4 use colored rectangles, but **through a `SpriteProvider` / renderer abstraction** so swapping in real art touches no simulation code.

### Sprite sizes
- **Player:** 16 x 16 canvas, anchored bottom-center. The collision hitbox stays 8 x 11, and the art may overhang it. Art never affects collision.
- **Tiles:** 8 x 8, with 2-3 fill variants chosen by a deterministic hash of tile coordinates, plus a distinct platform-top tile. No auto-tiling in v1.
- **Bullets:** around 4 x 4 to 8 x 4. Each boot type needs a distinct bullet shape **and** a distinct boot color, so players can read the threat at a glance.
- **Effects:** stomp puff, death burst, dash afterimage (tinted copies of the current frame), muzzle flash under the boots, spawn-protection flash, faint edge glow for the wrap seams.

### Animation list (state to animation)

| State | Frames | Notes |
|---|---|---|
| idle | 2 | slow loop |
| run | 4 | fast loop |
| jump rising | 1 | |
| apex | 1 | while `abs(vy)` is small |
| falling | 1 | |
| dash | 1 | plus afterimage trail |
| shoot down | 1 | boot flash, overlay on current pose |
| stomp bounce | 1 | |
| death | 4 | one-shot |
| spawn / protected | 3 | flashing |

### Audio
- Sound effects are **procedural WebAudio** written in code (no audio files): jump, land, dash, shot (per boot type), stomp, death, respawn, round start and end. Keep it a small module with a function per sound.
- Initialize audio **only after the first user input** (browser autoplay policy).
- Music is optional and last. If used, a short original loop only.

### Rules and cautions
- **Originality:** do not reproduce sprites, characters, or distinctive designs from Celeste, TowerFall, Downwell, or any other game. Same for audio.
- **Work in small batches:** one asset group at a time (player first, then tiles, then bullets and effects), each reviewed in the preview page before the next. Show me the text grid and describe what it should look like.
- **Phase placement:** the rendering rules and `SpriteProvider` go in Phase 0-1. Art production happens in Phase 5, character first.
- **Fallback:** if generated sprites look bad after one revision, say so and suggest what I should hand-edit in Aseprite instead of burning more time on it.

---

## 11. Concerns I want you to address (and add your own)

Please treat each of these as something to design for, not just acknowledge:

1. **Scope.** Four weeks is short. Everything beyond "stomp + one boot type online" is a stretch. Warn me whenever scope grows.
2. **Latency vs. tight movement.** Model A trades correctness for feel. Describe where it will visibly break (e.g. stomp disputes) and the mitigation (attacker-favoring tolerance).
3. **Wrap bugs.** The wrapped distance math, seam collision, seam rendering, and interpolation snap are each a classic bug source. Write unit tests for `wrapDy`, wrapped stomp detection, and wrapped projectile hits.
4. **Recoil exploits.** Any way to hover or gain unbounded altitude is a bug. Any boot that kills too reliably is a balance bug.
5. **Camping the loop.** A player circling the wrap and stomping from above repeatedly. Mitigations: map design, spawn protection, `MAX_FALL`, possibly a brief post-stomp-bounce window.
6. **Determinism.** Client and server must agree. No floats that drift differently, no Date or random inside `step`. Seeded RNG if randomness is ever needed (e.g. pellet spread).
7. **Tab backgrounding / dt spikes.** Clamp the accumulator. Handle `visibilitychange`.
8. **Hosting and cold starts.** Many free tiers sleep after inactivity. If a judge opens my link and the server is cold, it must wake gracefully or I must use a tier that stays awake through judging. Tell me what you recommend.
9. **A lone visitor.** A judge may open the link with nobody else online. Provide a **solo physics-demo mode**: one player in the real arena with the real movement, dash, wrap, and boots, no bots, no scoring. Keep it cheap, since it is only there so the feel can be experienced alone.
10. **Security basics.** Rate-limit messages, validate every client message, never trust client claims about kills.
11. **Version drift.** Pin exact dependency versions.
12. **Browser quirks.** Audio autoplay policy (audio only after first user input), pixel-perfect scaling, high-DPI screens, key repeat and focus loss (release all keys on blur).

13. **Full torus readability.** No walls means no visual anchor. Edge cues and seam ghosts are required, not polish.
14. **Mobility creep.** Dash + recoil + wrap in a small arena can make players impossible to catch. Tune it, and tell me if the combination looks unworkable for the timeline.
15. **Stalemates.** Two players chasing around a torus forever. The Stock-mode time cap and Timed-mode scoring address it. Tell me if you see a better breaker.
16. **Dash and stomp priority.** Dashing into a stomp, or being stomped mid-dash, must resolve deterministically. Write tests for it.

17. **Art scope.** Art is the easiest place to burn a week. Keep to the sprite list in Section 10A, review in small batches, and tell me when to stop polishing.

Add anything I missed.

---

## 12. Build phases (do them in order, verify each)

**Phase 0 (setup):** monorepo, TypeScript strict, Vite client, Colyseus server, shared package, Vitest working, "hello" scene on screen, client connects to server. Also set up the pixel-perfect render config, integer scaling, and `palette.json` (Section 10A).

**Phase 1 (movement feel, offline):** one player on a tilemap. Run, jump (coyote, buffer, variable height, corner correction), gravity, wrap-around on both axes with seam rendering. Debug overlay and live tuning panel. Unit tests for `approach`, collision, `wrapDy`. **Do not proceed until I say the movement feels good.**

**Phase 1b (dash, offline):** add dash with its flag, constants in the tuning panel, refill rules, and tests, including dashing across a wrap seam. **Do not proceed until I say it feels good.**

**Phase 2 (two tabs):** Colyseus room, join by link, two players moving, interpolation, wrap-snap. Sanity checks on server.

**Phase 3 (combat):** stomp (with server validation), death, respawn, spawn protection, scoring, round flow.

**Phase 4 (gunboots):** ammo, recoil, one boot type, projectile simulation on the server, hits. Then the other two boots.

**Phase 5 (modes and polish):** solo physics-demo mode (no bots), 3 maps, ammo UI, art and audio production (Section 10A), particles, screen shake, sound, menu and "create game / copy link" flow.

**Phase 6 (ship):** deploy, test with real friends on real networks, fix lag and bugs, write the submission, submit **at least 2 days before the deadline.**

Stretch only if everything above is done: boot pickups, gamepad, reconnect.

---

## 13. Decisions made, and remaining open questions

**Decided (do not re-litigate unless you see a real problem, then say so bluntly):**
1. Match modes are Smash-style: **Stock** (finite lives) or **Timed** (most points), chosen by the players in the lobby (6.12).
2. The arena wraps on **both axes** (6.7).
3. **Dash is included** (6.6), built after base movement feels good.
4. Solo mode exists **only as a physics demo**: one player, real movement, dash, wrap, and boots, no bots, no scoring.

**Still open (defaults in brackets; propose changes in your first reply):**
1. Kill model: one-hit kills. [default: one-hit]
2. Player-vs-player collision. [default: none, only stomps and bullets interact]
3. Player count. [default: 2-4]
4. Dash vs other players. [default: dash deals no damage; stomp still needs the falling condition]
5. Dash refill on stomp. [default: yes]
6. Stalemate breakers beyond the Stock-mode time cap. [default: none]

I specifically want your honest view on whether dash + gunboots + full wrap is too much for a 4-week build, and what you would cut first.

---

## 14. Your first reply (do exactly this)

1. Restate the game in 5-8 sentences.
2. List the questions and concerns you have, including any problems you see with this spec. Be blunt.
3. Propose the repo structure and the exact dependency versions.
4. Tell me what you'd need from me to start Phase 0.
5. **Write no game code yet.**
