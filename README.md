# Boot Loop

Sprint 5 presentation work on the 2–4-player online core for the approved browser party game. Create a
room, invite a friend, stomp or shoot to score, then rematch in the same room.

## Play the current preview

- Local: [Open the local preview](http://localhost:3000/) while the server is running.
- Temporary public: [Open Boot Loop](https://ventures-continually-volumes-drama.trycloudflare.com/).

Choose **Create room**, then **Copy invite link**. Your friend opens the link;
the host starts once both players are present. Default matches last two minutes;
30/60-second settings are available for review. Gold, Blue, Mint and Pink identify Players 1–4. The host can start with 2–4 players.
The temporary URL depends on the laptop, server and tunnel staying running.
Restarting the tunnel changes it; permanent contest hosting remains pending.

Click the arena to play. **A/D** or arrows move. **Space/Z** jumps from the
ground/coyote grace; a fresh airborne press fires downward. Holding does not
autofire. Double-tap left/right within 220 ms to dash. Both axes wrap. Landing
and accepted stomps do not bypass resource cooldowns. Dash now travels up to 100 pixels at 400 px/s over 0.25 seconds and automatically recharges after 10 seconds, including across death/respawn. Ammo reloads automatically only when empty, taking 3 seconds; partial magazines are not topped up.
Dash cannot stomp or shoot and remains vulnerable. White outline means protected:
no dealing or receiving kills. Death has a 1.5-second respawn delay and then
1.5 seconds of protection. Bullets allow a 8-pixel near-miss margin around the
player; walls/platforms still block hits. Deaths show a brief particle burst and
tiny camera shake and a rotating colored death quip visible to both players.
The arena has a pixel score/timer HUD; the final ten seconds turn red. Use **Try death effect** to preview it. **Death animation tuning** adds sliders
and number inputs with min/max explanations for sparks, shake and joke duration.
Cosmetic tuning is local to your browser and works during online play.
**Export all configs as JSON** saves all editable groups together, with match
length and active bullet tolerance. A copyable JSON backup is shown too.
Online exports use actual shared movement/boot values. These version 2 bundles
are for saving/sharing; the existing movement importer accepts movement-only files. Movement
diagnostics show the bullet tolerance in gold and the body box in red.
**Bullet hit tolerance** offers a slider and number field from 0–8 extra world
pixels per side (default 8). Practice previews the outline; online, the host
sets the shared value in the lobby or results, locked throughout countdown and
play. It persists on rematch and is exported as `match.bulletHitPaddingPx`.
Movement and stomp collision remain unchanged; cover still blocks bullet hits.

Most kills wins, then fewest accepted shots, then shared victory. Zero kills is
a draw. Rematch preserves duration and bullet tolerance, and resets statistics/resources.
Leaving during countdown or play cancels the match with no winner and transfers
host control when needed. Leaving after results preserves the completed standings;
a replacement can join for the next match. Empty rooms disappear, and expired
invites return a clear error with practice available. Inputs and contacts resolved
before the expiry tick count; at expiry or later they cannot change final scores.
The host can choose **Mode → Stock — last survivor**, with 1/3/5 starting lives
(default 3) and the same time limit. Each death costs one life; respawn/protection
continue while lives remain. Final elimination ends a match once only one survivor remains. Mutual
final-life deaths draw. At timeout, rank remaining lives, kills, then fewer
shots; an exact tie shares victory. The HUD displays lives with **L**. Mode and
starting lives persist on rematch and are included in combined JSON exports.
Use **How to play** for instructions, **Try solo practice** outside rooms, and **Sound: on/off** to mute procedural feedback.
The carried three-match friend test is [Sprint 4 T8](docs/sprints/sprint-04-edge-cases-and-conditional-modes.md).
Stock is available for combined testing; rooms now support up to four players.

Practice is available outside rooms, with no opponent or scoring. **R** resets
practice. Movement and dash/boot tuning remain available there, including preset
import/export and explanations of limits. Online play locks tuning to approved
Heavy2 snappier movement and one shared boot. See [preset notes](tuning/README.md).
Airborne shot presses do not also buffer a landing jump.

Open **Movement diagnostics**, or press backtick, for velocity, hitboxes, ping
and ticks. Online movement predicts locally and reconciles against the server;
the server owns movement, combat, timer and results. Remote players interpolate
between snapshots. A diagnostic default-simulation check remains available.

## Run locally after a reboot

Requires Node.js **24.13.0**, the installed version used for this sprint. With nvm:

```sh
nvm use
npm ci
npm run build
npm start
```

Then open http://localhost:3000. Dependencies are already installed in this
workspace, so `npm ci` is needed only for a fresh install or to restore them.
Stop the server with Ctrl+C. If the port is occupied, stop the old preview or
choose a different port with `PORT=3001 npm start`.

For development with automatic reload:

```sh
npm run dev
```

Open http://localhost:5173. The development client talks to port 3000; production
serves the built client and WebSocket connection from a single origin.

To expose the built preview temporarily, start the production server, then run
the installed Cloudflare helper in another terminal:

```sh
cloudflared tunnel --config /dev/null --url http://localhost:3000 --protocol http2 --no-autoupdate
```

Use the new URL printed by that command. Only the built client and game service
are served; workspace documents are not served. This temporary tunnel has no
uptime guarantee and is for review, not the submission's long-term hosting.

## Verification

```sh
npm run check
npm run test:connection
npm run test:mobility
npm run test:online
```

`check` runs strict type checks, the simulation/input/clock tests, and a production
build. The connection check needs the server running and verifies HTTP health,
Colyseus room join, a WebSocket reply and shared simulation agreement.

To check a public endpoint instead:

```sh
BOOT_LOOP_URL=https://YOUR-PREVIEW-URL npm run test:connection
```

`test:online` requires a running server and takes roughly 35 seconds. It checks
a real two-client match, consistent results, rematch reset, capacity/host limits,
disconnects and replacement joins. Add `BOOT_LOOP_DELAY_MS=100` to simulate
100 ms each direction plus jitter; `BOOT_LOOP_URL` also works with this test.

Record human review in [Sprint 3](docs/sprints/sprint-03-online-playable-core.md).
Use the [friend playtest brief](docs/playtests/sprint-03-friend-playtest.md) for
three matches on separate networks. Automated agreement does not prove combat
feels fair or approve the next sprint. Recoil and dash + jump remain in the
[polish backlog](docs/polish-backlog.md).

## Pinned versions

| Component | Version |
| --- | --- |
| Node.js used locally | 24.13.0 |
| TypeScript | 5.9.3 |
| Phaser | 3.90.0 |
| Vite | 8.3.2 |
| Vitest | 4.1.11 |
| Colyseus core | 0.17.32 |
| Colyseus WebSocket transport | 0.17.9 |
| Colyseus schema | 4.0.8 |
| Colyseus client SDK | 0.17.26 |
| tsx | 4.23.15 |

Exact dependencies and their transitive resolutions live in `package-lock.json`.
No physics engine is configured or used. Phaser renders the custom shared
simulation; keyboard events are latched and sampled at fixed simulation ticks.

## Workspace

- `packages/shared`: fixed-step movement/abilities, wrapped combat, match engine and tests.
- `packages/client`: Phaser rendering, input, prediction, room UI, tuning and diagnostics.
- `packages/server`: Colyseus two-player match rooms and built-client hosting.
- `tools`: development launcher, mobility and network verification.
- `docs/sprints`: editable testing and acceptance checklists.
- `palette.json`: placeholder toybox colors; final art remains a later review.

The one-tile-pocket validator is a structural check, not a proof of all map
reachability. Whole-tile steps are eight pixels; the optional two-pixel step-up
does not climb a full tile. Corner correction is included and tested.

### Sprint 5 review build — October 10

Welcome splash offers solo or online play; **How to play** reopens it. Visible controls complement the keyboard. Jump in the first 100 ms of a grounded dash to end the dash with bounded extra reach (no air jump, charge recharges automatically after 10 seconds). Accepted shots flash at the boots; stomp/landing/respawn cues remain cosmetic. Results have a short skippable reveal; practice offers **Try tiebreak reveal**. Original fallback characters are the current art. Three/four-player matches continue after departure while at least two players remain; falling below two cancels active play. See Sprint 5 for the consolidated manual checklist.

Player view: `/`. Full developer review/tuning view: `/dev`. Invite links always use the player root. Direct `/dev` and `/dev/` are served by the game server.

Player `/` now contains the whole match flow inside the game: Room/menu opens create/join/invite/settings, Start Match launches play, and final results offer Rematch. The panel closes during countdown/play and returns for results. `/dev` retains the full review workspace.

Shared scatter boots: pink pickup at a random exposed platform, first appearing 30–45 seconds into play, then 30–45 seconds after each collection. Consecutive pickups use different locations. Uncollected pickups disappear after 10 seconds, then start a fresh 30–45 second wait. Whoever touches it switches everyone's shots to a three-bullet fan for 8 seconds. Each volley costs one ammo and counts as one shot; reload/dash/protection are unchanged. Practice includes the same pickup. Verify the live shared modifier with `node --import tsx tools/scatter-check.ts` while the server runs.

## Shared boot pool — October 11

Random pickups now choose Scatter (pink, three-way shots), Turbo (gold, +25% run speed/acceleration), or Ricochet (purple, one upward platform bounce per bullet). Everyone receives the selected effect for eight seconds. One effect at a time; existing 30–45 second spawn waits and ten-second uncollected expiry still apply. Ammo, reload, jump height and dash cooldown remain unchanged. Ricochet bullets live up to 0.9 seconds to allow the return path, and disappear on a second platform collision or a player hit. Bullets already fired keep their behavior when the effect ends.

Use **Try Turbo boots · 8s** and **Try Ricochet boots · 8s** in solo `/dev` to compare immediately. These practice previews are unavailable in online rooms. Sprint 6 awaits PM permission.

## Sprint 6 release preparation

Feature scope is frozen for release verification. See [deployment instructions](docs/release/deployment.md), [submission materials and cover](docs/release/submission.md), [known limits](docs/release/known-issues.md), and [PM review checklist](docs/sprints/sprint-06-release-verification.md).

Local run: install Node 24.13.0, run `npm ci --include=dev`, `npm run check`, then `npm start`. Open `http://localhost:3000/` or `/dev`. `npm run dev` provides separate development servers. Builds include `/release.json`; the running server's `/health` reports the same build ID after restart.

Selected permanent deployment: one Render **Free** Node web service, configured by `render.yaml`. Account/repository connection and actual deployment are pending. The free service may sleep; the temporary tunnel remains the working preview until the permanent URL is verified.

Release verification commands: `npm run check`, `npm run test:online`, `node --import tsx tools/multiplayer-check.ts`, `BOOT_LOOP_DELAY_MS=150 npm run test:online`, `node --import tsx tools/capacity-check.ts`, and `node --import tsx tools/release-smoke.ts`. Smoke uses an isolated server on an available temporary port. Set `BOOT_LOOP_URL` for network checks against the eventual public Render URL. Capacity tests create ten four-player rooms; run them between human playtests.

Create a recoverable source/build archive with `node tools/release-bundle.mjs` after checks/build pass. No Git history existed at the start of release preparation, so the checksum archive preserves the verified files until the hosting repository is connected.

### Arena playtesting

Toybox, Crossfire and Switchback are available in practice and online. Open **Play / menu → Practice arena** to try a layout alone. Online, the host chooses under **Room → Arena / match settings** before a match or rematch. Selection is locked during countdown and play. All three work with Timed/Stock and 2–4 players. All-config JSON exports include `match.arenaId`.

Run `node --import tsx tools/arenas-check.ts` against the running server for four-player Crossfire/Timed and Switchback/Stock lifecycle and synchronization checks. Set `BOOT_LOOP_URL` to check a public preview. Human layout acceptance lives in `docs/polish-backlog.md`.
