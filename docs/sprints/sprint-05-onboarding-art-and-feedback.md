# Sprint 5 — Onboarding, art and feedback

**Target dates:** October 21–24, 2026

**Status:** Approved and closed by the product manager on October 13, 2026.

[All sprints](README.md) · [Product plan](../product-plan.md)

## Goal

Make Boot Loop understandable without coaching and enjoyable for a lone visitor or a group of friends.

## Dependencies

Sprint 4 closed under the product manager’s October 7 scope decision. Remaining human edge-case and combined friend review is carried into Sprint 6. Art may use a fallback if the final character is unavailable.

## Planned work

- Review the [polish backlog](../polish-backlog.md), including deferred recoil feel and dash + jump feedback, before changing effects or controls.

- Make create/join/copy-link and rematch flows clear. Show movement, jump, dash, shooting, ammo refill, stomps and wrap rules with concise instructions.
- Add a solo demo using the same arena, movement and boots, without bots or scoring. Keep practice visibly distinct from an online match.
- Load the user's original Aseprite character sheet and JSON if available; recolor distinct player ramps and preserve hand-edited assets. Retain readable fallback art if needed.
- Create original floating toybox platforms with a restrained background. Keep art independent of collision geometry.
- Show ammo and player identity clearly, and preserve seam cues/copies with final sprites and effects.
- Add small shot/stomp/death/respawn/dash effects and a short skippable tiebreak reveal. Avoid excessive shake or effects obscuring combat.
- Add essential procedural sounds, a mute control and audio initialization after user input.
- Produce a simple asset review view only if it helps review actual assets. Do not build a full generator/preview toolchain unnecessarily.
- Add maps, boots or fuller animation only after required onboarding and readability checks pass; schedule added gameplay for real regression testing.

## Stretch goals — user requested

Consider these after the core MVP and required onboarding/readability checks pass. They are optional additions, not required sprint exit gates.

- **Proper splash screen with instructions:** give the game a welcoming title screen with a clear route to practice or online play. Explain the objective, movement, jump/airborne shooting, dash, landing refill, stomps and wrap in a compact, readable layout. Allow players to reopen instructions and skip them on repeat visits.
- **Downwell-inspired on-screen controls:** explore a simple visible button layout for left/right movement and jump/airborne shooting, with a clear way to dash using the existing rules. Support touch and pointer input, allow movement and actions together, and keep the arena readable. Retain keyboard controls. This goal does not by itself commit the release to full mobile support.

## Handoff for review

At delivery, the assistant fills in the information below so each test is reproducible. The final delivery below is ready for review; human test boxes remain unchecked.

- Build / revision: October 10 production build; shared simulation plus Sprint 5 presentation.
- Demo or public URL: [Boot Loop](https://findarticles-hiv-educated-cycles.trycloudflare.com/) (replaces expired previous tunnel).
- How to run and reach the feature: open the preview; welcome screen offers practice or online. **How to play** reopens it. Practice offers **Try tiebreak reveal** and **Try death effect**. Create a room, copy the invite, choose Timed/Stock and start with 2–4 players.
- Automated checks: 101 tests, strict type checks and production build passed. Three-client Timed/four-client Stock rounds and rematch checks passed. Public-server dash + jump check passed.
- Known limitations: original fallback pixel characters are the final Sprint 5 art; no Aseprite sheet is available. Original-character integration is optional later. On-screen buttons are available, but full mobile-device compatibility is not claimed. Music, pickups, extra maps/boots and a separate asset tool are outside this delivery. Deferred Sprint 4 edge cases remain in Sprint 6.

## One consolidated review session

Use T1–T11 below to record Pass/Skip and comments. You can review everything in this order without requesting another build:

1. Open the link with a new friend: review welcome instructions and choose practice (T1, T2, T8).
2. In practice, move/jump/wrap and use the visible controls; compare keyboard play. Double-tap a grounded direction then immediately jump (within 100 ms). Try the same jump in an airborne dash: no extra jump (T9, T10).
3. Fire in the air: look for the tiny boot muzzle flash; holding or dry firing must not create accepted-shot feedback. Check landing refill, death preview/tuning, sound/mute, and exported JSON (T3–T5, T11).
4. Press **Try tiebreak reveal** once and let it finish, then repeat and press **Skip reveal**. This is explicitly a presentation preview: Gold/Blue both have 3 kills; 10 shots beats 24 (T6).
5. Create a room and invite friends. Play one Timed round, one Stock round and rematch. Watch readability across seams, shared deaths/stomps/respawns, four-color identity and eliminated-player viewing (T3–T7, T10–T11). Use 30-second matches to keep the session short.
6. Record problems and accept/skip applicable items. These human checks are not replaced by automated clients.

## How to use this checklist

These are standard Markdown task-list checkboxes: change `[ ]` to `[x]` to mark one. For each review item, mark **Pass** or **Skip**, and leave a comment or skip reason. A failed or untested item stays unchecked with notes about what remains. Do not mark both options.

Testing and final acceptance boxes belong to the product manager; the assistant leaves them unchecked. A skip records your scope decision and does not claim that a test passed. Skipping a contest-related review cannot change the organizer's requirements. Feel approvals must be explicit; skipping their review requires an explicit decision to change that gate.

## Testing and review checklist

### T1 — Uncoached onboarding

Ask a friend who has not seen the instructions to open the link and explain the controls and objective after reading the game UI. Record any coaching needed.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Only needed to say how to move and jump/shoot, they figured the rest themselves

### T2 — Solo visitor

Open the public URL alone and enter practice. Confirm immediate access to real jump/dash/wrap/boot behavior without needing another player or implying bots/scoring.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T3 — Character and environment

Review the toybox setting, sprite alignment, recolors and player identity. Confirm the art does not change collision behavior or hide bullets.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: we need 1 or 2 more arenas
### T4 — Ammo and seam readability

Play during wrap crossings and combat. Confirm ammo, protection, characters and incoming shots remain easy to read.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T5 — Audio

Test first load before input, after input, and with mute enabled. Confirm sounds start appropriately and do not overwhelm play.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T6 — Result reveal

Trigger a score tie. Confirm the reveal explains the deciding statistic, remains brief and can be skipped; shared victory and draws are clear.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: Reveal is clunky, needs sone work
### T7 — Party-game experience

Play with friends and record confusing moments, enjoyable surprises, frustration and desire to rematch. Confirm effects do not obscure the action.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: with gun reloading delay and dash every 10 seconds only, much better, yet to try to the chaos power up

### T8 — Optional splash screen and instructions

The splash is delivered. Ask a new player to explain the objective and controls from the splash screen, then reach practice or an online room without coaching. Confirm instructions can be reopened and repeat visits do not force a long introduction.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here; skip if this stretch goal is not selected._

### T9 — Optional on-screen controls

The visible controls are delivered. Test left/right movement, jump, airborne shooting and dash with the displayed controls, including simultaneous movement and actions. Confirm buttons do not hide combat, releasing input stops movement, and keyboard play still works. Record the devices/browsers tested before making any mobile-support claim.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here; skip if this stretch goal is not selected._

### T10 — Dash + jump and recoil feel

While grounded, double-tap left/right and press jump within the first 100 ms. Jump ends the dash and carries a bounded speed boost. Try left and right, a late jump during dash, and an airborne dash: no free air jump or shot during active dash. Land to refill; repeated grounded dashes must still consume the charge. Compare normal running jumps and the combination; approved Heavy2 measurements show about 10 extra world pixels of jump travel, excluding the dash approach. Recoil strength is unchanged; muzzle flash/audio should make an accepted shot easier to feel.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here; approve or change the feel explicitly._

### T11 — Action feedback and config export

Check brief muzzle flashes on accepted shots, dash trails, landing refill puffs, stomp impacts, death particles/taunts and respawn rings on both clients. Effects must remain small enough to read opponents and bullets. Try death tuning, mute and **Export all configs as JSON**; confirm the file/copyable backup includes the active settings. Review touch/pointer simultaneous movement + jump if using those controls.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

## Exit criteria

A new player can understand and join without explanation; a solo visitor can try the game; essential art/audio/feedback support readability. Decorative content and the splash-screen/on-screen-control stretch goals remain conditional.

- [x] I have reviewed every applicable item above; each is passed or explicitly skipped with a reason.
- [ ] Remaining issues and carried work are recorded below.
- [x] I accept this sprint's result and approve moving to the next applicable sprint.

Accepted by / date: Product manager — explicit chat approval, October 13, 2026.

## Comments and changes

- Issue or requested change: _Write here._
- Deferred or removed scope and reason: _Write here._
- Carry into the next sprint: _Write here._

## If time runs short

Reduce animations and decorative effects; reuse poses. Keep onboarding, ammo visibility, seam cues and solo access. Music and pickups remain deferred.

## First delivery — October 7

- Public preview: [Boot Loop](https://thomson-penalty-mentioned-attempting.trycloudflare.com/).
- Added reopenable **How to play** dialog and **Try solo practice** route, using the same movement/arena and no bots/scoring. Solo button is hidden while online; leave the room to practice.
- Added original procedural shot/death/dash/respawn cues, created only after a pointer or keyboard gesture, with **Sound: on/off** mute control. Audio is cosmetic and cannot decide combat.
- Refined the original fallback character face and toybox platform detail. Four player color variants use the same unchanged collision box. No Aseprite character assets are present in the workspace yet; hand-authored character integration remains pending.
- Reviewed the polish backlog: immediate shot audio is a first recoil-feedback improvement; recoil physics remains approved baseline. Dash + jump needs a bounded design/review and remains pending. More visual feedback/result-reveal polish is still to do. Full splash and on-screen controls remain stretch goals.
- All manual boxes remain yours; Sprint 5 is not closed.

- First-pass verification: strict type checks and production build passed. Instructions opened/closed, solo access focused the practice arena, and mute changed on/off with no browser errors. Listening/feel review remains T5; no human audio acceptance is claimed. The multiplayer foundation passed 99 unit tests and actual three/four-client rounds.

- Four browser clients displayed Gold/Blue/Mint/Pink at four separate spawns, all four HUD entries and shared countdown, with no browser errors. [Four-player view](</home/osfield/.codex/visualizations/2026/10/05/01a10c07-bdce-79c3-b1f8-c82c24d0bd28/sprint-05-four-player.png>). Combined JSON now also includes the local sound preference.

## Final implementation delivery — October 10

- Welcome splash/instructions, solo and online routes, reopen/skip controls; invite links join directly. The welcome auto-opens only once per browser session.
- Visible left/right, jump/fire and dedicated left/right dash buttons; pointer capture, cancellation and separate keyboard/pointer state. Keyboard remains supported. Human device review belongs to T9.
- Short server-result reveal (1.5 seconds for shot/shared ties; 0.7 seconds otherwise), **Skip reveal**, and a clearly labeled practice preview. Reduced-motion preference reveals immediately. Rematch/disconnect cancels the previous reveal; outcome/statistics remain server-owned.
- Original fallback pixel characters/toybox platform detail accepted as the implementation fallback; distinct Gold/Blue/Mint/Pink, ammo dots, protection outline and wrap copies retained. No external art/music added.
- Small accepted-shot flashes, landing puffs, stomp impact and respawn rings, plus existing dash/death feedback; all cosmetic and bounded. Original procedural stomp cue added alongside shot/dash/death/respawn sounds and mute.
- Grounded dash + jump now cancels dash within its first 100 ms, retains the spent charge/cooldown, applies capped carry and grants no airborne jump. Heavy2 comparison: ordinary running jump 97 world px, combo jump 107 world px, both 35 ticks; combo launch 208.33 px/s, capped at run speed + 60. Dash approach excluded. Actual public server confirmed spent charge, upward jump and zero shots.
- Recoil velocity remains 120 px/s and cannot stack. Muzzle flash/audio are the completed recoil-feedback pass; human feel acceptance remains T10.
- Extra maps/boots/music and asset tooling are not needed for this exit. Original Aseprite character remains an optional later swap, not an outstanding required implementation.
- Manual acceptance and listening/game-feel claims remain unchecked. Deferred release edge cases stay in Sprint 6.

Final browser checks: invite bypassed the welcome and joined the room, both clients displayed the same completed draw explanation, rematch started immediately, and no browser errors were recorded. Splash starts at the heading, practice tiebreak skip worked, and on-screen click inputs released. [Delivery view](</home/osfield/.codex/visualizations/2026/10/05/01a10c07-bdce-79c3-b1f8-c82c24d0bd28/sprint-05-splash-final.png>).

October 10 audio addition: distinct original square-wave chiptune cues for jump (rising notes), shoot (quick falling zap), and landing (low short thud). Jump/land use state transitions rather than held input; accepted-shot counts drive shooting. Local online cues follow prediction for immediate feedback; remote cues follow server snapshots. Resetting practice or entering a fresh lobby/countdown clears cue history. Existing mute covers every cue. Human sound/volume acceptance remains T5.

Shooting sample update: `assets/sounds/shoot.mp3`, supplied by the PM, replaces the procedural shot zap once decoded. Sample is bundled in the production build, preloaded, unlocked after user input, and supports overlapping accepted shots. Sound-off stops active shooting samples and blocks new playback. Other chiptune cues remain unchanged; procedural shot is a loading/failure fallback.

## Player/developer routes

The root `/` is now the clean player view: arena, welcome/help, audio, visible controls and necessary create/join/lobby/result actions. Active play reduces room UI to leaving/status. Tuning, previews, diagnostics, export and development copy live at `/dev` (also `/dev/`). Both use the same game/simulation. Copy invite from either route always generates `/?room=...` so guests see the player view. `/dev` is a review route, not authenticated/private access. For T6’s preview, tuning and JSON tests use `/dev`; for onboarding and party experience use `/`.

Player arena sizing update: root view now uses available screen height and full page width with reduced chrome, preserving the arena aspect ratio. Player scaling fills fractional available space rather than rounding down to an integer; `/dev` retains integer scaling. Verified narrow 414×248 arena (previously 320×192) and desktop match arena 837×502, with controls visible and no page overflow at the tested 720 px viewport. Type checks/build passed; no browser errors. Current temporary preview: https://radio-locale-treated-agent.trycloudflare.com/ (replaces expired prior tunnel).

On-screen control revision: exactly three buttons. Left/right grouped for the left thumb; Space · Jump / fire aligned to the right for the right thumb. Dedicated dash buttons removed. Double-tapping either direction within 220 ms uses the existing shared dash input rules; instructions now explain keyboard and on-screen dashes. Simultaneous movement/action and pointer capture remain supported.

Audio feel revision: jump now uses a louder original retro square-wave rising boing (180→720 Hz, falling tail), and server-confirmed local kill count increases trigger a short low punch/rising victory chirp for the killer. Victim death audio stays separate. Repeated snapshots cannot repeat the kill cue; mute applies to both.

## Developer background-music audition

Added three earlier ominous candidates (the PM allowed the shortlisted subset): Infinite Darkness — HydroGene, Foreboding Pixels — Sorth, and Hallow Quest 8-bit — Zane Little Music. Source pages list CC0; sources/license records are in `assets/music/README.md` and `credits.json`. `/dev` has a sticky track selector, previous/next, Play/Pause, Restart and a separate 0–100% music volume (default 18%). Change tracks while playing to audition against effects; one audio instance prevents overlap. Sound-off mutes music and effects. Music is local to this browser, works in practice/online, and starts only after explicit input. Player `/` has no music yet. Combined JSON exports the chosen track/volume/play state. Human listening/loop-boundary approval is pending; no final soundtrack selected.

Music audition verification: type checks/build passed; all three bundled tracks reached Playing in the browser, switching and pause/restart worked, volume changed from 18% to 19%, master mute showed Sound is off, and combined JSON contained Hallow Quest/0.19/paused. Player route music panel is hidden and no music starts there. No browser errors recorded. Human taste/loop-seam listening remains yours.


### Music playback correction and expanded audition — October 10

Music now works on the player route after the first click/key press. A separate Music toggle pauses/resumes it; Sound still mutes everything. `/dev` offers ten tracks, including seven new chiptune/action/ambient options. Track, volume, and enabled state persist in this browser and carry to the main game; these preferences also remain in the combined config export. This supersedes the earlier developer-only playback scope.

- [x] PM: choose a track in `/dev`, open `/`, interact with the game, and confirm music plays.
- [x] PM: compare all ten options and note the preferred track/volume.
- [x] PM: verify Music and Sound toggles feel clear and the chosen loop sounds acceptable.

Comments / skips:


### Default soundtrack approved — October 10

PM selected **8-Bit Battle Loop — Wolfgang_** as the default music for both the player route and developer audition. Existing saved browser track choices still override the default. All ten options remain available in `/dev`.

### Audio balance adjustment — October 10

Background music default reduced from 18% to 8%, with a one-time proportional reduction of existing saved volumes. Jump sound gain doubled from 0.06 to 0.12.

- [x] PM: confirm the quieter music and louder jump feel balanced during play.

### Friend-playtest ammo change — October 10

Empty boots now reload automatically over 3 seconds. Partial magazines do not refill on landing or stomping; those actions restore dash only. Players can move, jump, dash, and stomp during reload, but cannot shoot. A pixel RELOADING... label and progress bar follow each reloading player, including opponents. Respawn starts with a full magazine.

- [x] PM: spend all four shots and confirm the 3-second firing lockout feels right.
- [x] PM: land or stomp with partial/empty ammo; verify neither gives instant ammo.
- [x] PM: check both players can see each other’s reload label/progress.

Comments / skips:


### Player layout — room sidebar and larger arena

Desktop player route places room controls, invite/copy link, match status and result text in a narrow scrolling left sidebar. The arena fills the remaining space on the right. Invite copying stays available during a match. Narrow phone screens retain a stacked layout.

- [x] PM: check room controls/results on the left and the larger game on the right.

### Friend playtest: escape dash

PM reports multiple enjoyable matches with a friend. Dash now travels up to 100 px at 400 px/s over 0.25 seconds, with a 10-second automatic recharge. Landing, stomping, and respawning cannot shorten that wait. Walls still stop dash; dash is vulnerable and cannot shoot or stomp. A charging arrow sits beside ammo both above the player and in the resource display, flashing while ready (static with reduced-motion preferences). Early grounded dash-jump remains supported with capped launch speed. This supersedes landing/stomp dash-refill rules recorded earlier.

- [x] PM: check dash feels dramatic and useful for dodging bullets.
- [x] PM: check the 10-second wait and charging/ready icon are readable.

Power-ups, random obstacles and additional stages are recorded in the polish backlog.

Dash readiness feedback: a mint pixel **DASH READY** label follows a player for 1.5 seconds when their cooldown reaches zero. The message disappears on reuse and does not display on initial spawn/reset; the blinking charged icon remains afterward.

Dash-ready reliability fix: the 1.5-second notice is now carried in shared simulation state instead of relying on a render-time transition. It appears above the player and briefly emphasizes **DASH READY!** beside the ammo meter. Prediction/snapshot replacement carries the timer with it; reuse cancels the message.

Local-player dash-ready correction: online notifications now read the confirmed player state, matching opponent rendering, instead of consuming their duration during prediction replay. A regression check covers a pending-input replay that exhausts the predicted timer while the server notice is still active. Solo practice keeps its local timer.

### Standalone in-game match UI

The player route now contains the entire room/match flow within the game card, replacing the sidebar. A central room panel provides Create/Join, invite copying, match settings and Start Match. It automatically clears for countdown/gameplay, then returns with final results and Rematch. Guests see host-controlled buttons disabled. A compact in-game toolbar reopens Room/menu or help and controls audio. The developer route keeps its full workspace.

- [x] PM: create/join and start entirely inside the game.
- [x] PM: check final results, rematch and room/menu while playing.

Standalone UI verification: two browser players completed Start Match → final draw results → Rematch entirely inside the arena UI. The panel hides during countdown/play, returns for results, and guests cannot start/rematch. Type checks and production build passed.

### Jump and shoot character animations

Added original pixel character poses: compressed takeoff (65 ms), stretched launch (through 180 ms), tucked apex and extended descent. Accepted shots kick the boots outward/upward with a two-step 110 ms recovery and bright boot accents, complementing the existing muzzle flash. Local poses follow predicted actions; opponents follow their snapshot state. All four colors and wrap copies share the same animation system. Collision boxes, jump physics, ammo, recoil and match rules are unchanged. Reduced-motion preference retains the neutral sprite. Animation state resets on practice reset, room changes and new matches; repeated or corrected shot counts cannot replay the same kick.

- [x] PM: review jump and shooting animation feel in practice and with a friend.
- [x] PM: confirm opponents/bullets remain readable during animation and wrapping.

Verification: 111 tests passed, including pose-only movement invariance, duplicate/prediction-corrected shot suppression, opponent isolation and reduced motion. Strict type checks and production build passed.

### Shared scatter-boots pickup — first gameplay addition

Every 18 seconds after a pickup is collected (first spawn 18 seconds into play), pink boots appear above the exposed center platform. A two-second notice warns of arrival. Touching the pickup switches ALL players to three-pellet downward volleys for exactly 8 seconds. Pink boots and the shared countdown show the active modifier. One accepted volley costs one ammo and counts as one shot for efficiency; existing recoil, three-second empty reload, ten-second dash, protection and cover rules stay in place. Pellets sweep diagonally, wrap and stop at cover. The pickup waits until someone collects it; it is not privately owned. Death does not reset the global effect, and rematch/cancellation/results clear it. Practice runs the same pickup rules.

- [x] PM: collect the center pickup and confirm both players get scatter shots and the timer is clear.
- [x] PM: check the spread, eight-second duration and 18-second appearance cadence feel fun rather than overwhelming.
- [x] PM: verify one ammo per volley, normal reload/dash, and normal boots returning.

Verification: 116 unit tests pass; strict type checks and production build pass. Two real SDK clients verified host collection, the guest's three-pellet shot costing one ammo/one statistic, and shared expiry. Turbo boots remain a possible later addition.

Existing real-client multiplayer checks also passed after scatter integration: combat/death feedback, empty-ammo reload, dash recharge, identical results, replacement/rematch, cancellation and host transfer. Browser pickup/HUD visual review recorded no console errors.

### Scatter pickup pacing and random locations

Supersedes the fixed center/18-second spawn rule. First appearance and subsequent waits after collection now vary from 30 to 45 seconds. Each pickup chooses one of eight clear locations above exposed platforms; consecutive pickups cannot reuse the previous location. Online selection and timing are server-owned, shared through snapshots. The two-second arrival warning and eight-second shared effect remain. Short 30-second review matches can finish before a pickup appears; use 60/120 seconds to test this mechanic.

- [x] PM: review the rarer 30–45 second cadence and varied locations with a friend.

Random pickup verification: all 117 tests, strict type checks and build passed. Two real clients confirmed the same server-selected 30–45 second initial delay and random position. Browser visual review recorded no console errors.

### Uncollected pickup expiry

Uncollected scatter boots now disappear after 10 seconds, with the remaining collection window shown in the pink HUD prompt. An expired pickup grants no effect and starts a new random 30–45 second wait. Collection still gives everyone eight seconds of scatter shots. Expiry is server-owned and exclusive: touching on the expiry tick cannot collect it. Practice uses the same rule.

- [x] PM: leave a pickup untouched; check its countdown, disappearance after 10 seconds and delay before the next one.

Pickup expiry verification: 119 tests, type checks and production build passed. Two real clients observed the same expiry deadline, disappearance after ten seconds, no awarded effect, and a fresh 30–45 second delay.

### Approved shared Turbo and Ricochet additions — October 11

Implemented sequentially: Turbo first, verified before Ricochet. The random boot pool now contains Scatter, Turbo and Ricochet with equal selection chances. Turbo boosts everyone's running speed, acceleration and braking by 25% for eight seconds. Jump height, dash speed/cooldown and ammo/reload rules remain unchanged. Ricochet gives everyone purple bullets that bounce upward from their first platform contact, then disappear at the next platform contact. A purple burst confirms the bounce on every client. Ricochet bullets live up to 0.9 seconds; existing shots retain their behavior after the shared effect expires. No effects stack.

The established 30–45 second waits, varied safe pickup locations, ten-second uncollected expiry, and eight-second shared effect remain. HUD identifies each boot type and its remaining time. Solo `/dev` has clearly labeled eight-second previews for all three; online rooms use server-selected pickups only.

- [x] PM: try Turbo; review speed/control and the return to normal after eight seconds.
- [x] PM: try Ricochet; review upward shots, bounce readability and cover counterplay.
- [x] PM: confirm both players receive the same pickup effect and countdown in a friend match.
- [x] PM: approve these additions or record changes/skips below.

Comments / requested changes / skip reason: _Write here._

Verification: 126 tests passed, strict type checks and production build passed. Four-player shared effects, exact expiry, normal ammo/reload, unchanged vertical jump/dash, platform bounce/second collision, upward kills and shared bounce events are covered. Real SDK multiplayer regression passed. Browser previews displayed both effects with no console errors. These are approved Sprint 5 additions; Sprint 6 has not begun.

### Dramatic shared power-up text — October 11

Activation now announces the selected boots with larger pixel text for the first three seconds: EVERYONE GOES TURBO!, RICOCHET RULES!, or SCATTER MADNESS! Only the lettering jitters; no camera shake is added. The text punches in, shrinks and fades, with small colored sparks and no opaque banner. The middle two seconds keep only the compact status. The final three seconds show a pulsing 3 → 2 → 1 above center, followed by a brief BACK TO NORMAL cue. Animation timing follows the shared effect deadline; reduced-motion users see static text and numbers. Gameplay remains unchanged.

- [x] PM: review announcement size/shake, countdown pressure and combat readability for all three boots.

Verification: type checks and production build passed; browser captures confirmed the announcement and final three-second countdown, with no console errors. Sprint 6 still awaits permission.

### Subtle normal bullet impacts — October 11

Normal bullets now show a small, faint gold four-pixel spark on platform/player collision, lasting 90 ms. Ricochet retains its larger purple bounce effect. Impacts add no sound, shake, damage or physics changes, and lifetime expiry creates no spark. Online impact positions are server-confirmed and shared, with duplicate suppression; practice uses the same collision path. Solo `/dev` includes Try small bullet impact for cosmetic review.

- [x] PM: review normal impact subtlety against Ricochet and combat readability.

Verification: 128 tests passed, type checks and production build passed, including shared cover/player-hit events and no expiry flash.

## Final PM approval — October 13

The product manager explicitly approved Sprints 5 and 6 in chat: “ok s5 and 6 are all good and aapproved.” This closes the sprint and supersedes earlier pending-acceptance status. Existing checkbox selections and comments are preserved; unchecked individual items are not converted into invented passes or skips. Remaining documented technical limitations and submission-specific checks carry into Sprint 7. Approval does not claim the previously observed SDK cleanup retries were technically resolved.
