# Polish backlog

Product-manager feedback carried forward for the polishing phase (Sprint 5). Review this file before polishing movement, effects or controls. These items are deferred; they do not authorize changing the approved gameplay now.

Use `[x]` to mark completed reviews and add notes or an explicit skip reason. Keep the original feedback when recording a decision.

## P1 — Make recoil feel faster or snappier

**Source:** Sprint 2, T4. Original feedback: “Pass but recoil could feel faster or snappier”.

**Decision:** The product manager agreed to keep recoil refinement for polish. Preserve the current approved recoil physics in the meantime.

Start by reviewing shot feedback: muzzle flash, a short boot kick/pose, and a distinct shot sound. These are proposed ways to make an accepted shot feel immediate, not a chosen implementation. Recoil already changes velocity on the accepted-shot tick. Increasing its strength changes lift and airtime, so assess that separately with opponents before changing it.

Baseline: upward recoil 120 px/s, four shots, 0.16 s shot cooldown. In the recorded heavy-movement scenario, peak-timed shots extended airtime from 0.583 s to 1.133 s. See [mobility measurements](measurements/sprint-02-mobility.md).

- [ ] Review recoil feel and choose the polish change.
- [ ] Test that accepted shots read clearly and rejected shots do not imply a successful shot.
- [ ] If physics changes, rerun mobility checks and review escape/counterplay with opponents.
- [ ] Product manager approves the result, or records a skip with a reason.

Comments / decision / skip reason: _Write here._

## P2 — Dash + jump interaction

**Source:** Sprint 2, Comments and changes; exact wording supplied by the product manager in chat.

**Original comment:**

> Dash + jump should be possible for players who develop the skills for it. Dashing does not allow jumping, I think it makes sense to have the opportunity to jump slightly farther when dashing, and it just makes logical sense from a physics point of view

**Decision:** Carry this request into polish alongside recoil. The intended benefit is a skill-based dash + jump combination that travels slightly farther. Preserve the approved implementation until the combination is designed and reviewed.

Current behavior: dash suspends gravity, clears variable jump, and ignores jump/fire presses while active. This blocks the requested combination.

Proposed starting point for review: a precisely timed grounded dash-to-jump transition that carries a bounded amount of horizontal momentum. This is a proposal, not the final rule. Define eligibility, timing, whether jumping ends the dash, and the intended extra distance before implementing it. Do not accidentally add a free airborne jump, an extra charge, or unlimited momentum. Retain landing-only resource refills and cooldowns; shooting remains blocked while the dash is active.

The mechanic is a sensible game-feel choice. Real-world physics does not determine its behavior because the current dash fixes velocity and suspends gravity. It needs deliberate, understandable rules. Unlike visual recoil feedback, this item changes gameplay: budget for shared simulation changes, online consistency and opponent testing during polish.

- [ ] Record reproducible grounded, airborne and dash-end cases.
- [ ] Agree on jump eligibility, timing window, dash cancellation and maximum extra distance.
- [ ] Compare ordinary jumps with the skill-based combination; confirm the benefit is modest and consistent.
- [ ] Test landing, ceilings, walls and wrap seams, plus shooting and resource refill interactions.
- [ ] Rerun mobility checks and test escape/counterplay with opponents using the same online rules.
- [ ] Product manager approves the result, or records a skip with a reason.

Comments / decision / skip reason: _Write here._

## Early death feedback — implemented for Sprint 3 review

The product manager explicitly requested this during Sprint 3: a small particle explosion and tiny camera shake, to assess whether deaths feel more interesting. This exception is implemented now: 16 particles over 350 ms, colored for the victim, plus 100 ms of subtle shake. Shake respects reduced-motion preferences. Both clients receive the burst and shake, including the killer; confirmed death feedback is queued independently of local life state. It follows server-confirmed kills, supports wrap seams and changes no movement or respawn rules. **Try death effect** previews it in practice.

- [ ] Review the death burst and shake in actual combat; record strength/readability feedback in Sprint 3 T5.

Recoil and dash + jump above remain deferred.

Sprint 5 began October 7: original procedural shot audio is a first P1 feedback candidate; recoil physics is unchanged. P2 dash + jump remains a design/review item. Human feel boxes above are not claimed completed.

## Sprint 5 implementation — October 10

P1 implemented as accepted-shot muzzle flash and procedural shot cue; approved recoil strength unchanged. P2 implemented as a fresh grounded jump in the first 100 ms of dash, cancelling dash with bounded carry and spent charge. Heavy2 jump travel is 107 vs 97 world px (35 ticks each, dash approach excluded); launch capped at run speed + 60. Late/airborne active-dash presses cannot jump or shoot. Shared tests and actual public-server check passed. Human feel approval remains pending in Sprint 5 T10; original comments and review boxes above remain preserved.

## P3 — Temporary power-up objects

**Source:** PM friend playtest, October 10. Objects grant temporary effects such as extra speed or more bullets. Deferred polish idea. Define durations, stacking limits, pickup fairness, and effects on the shared boot before implementation.

- [ ] Review power-up types, duration, and counterplay.
- [ ] PM approves implementation or records a skip.

Comments / decision / skip reason: _Write here._

## P4 — Randomly appearing stage obstacles

**Source:** PM friend playtest, October 10. Deferred polish idea. Telegraph placement before an obstacle appears, prevent spawning inside a player, and keep escape routes open. Random unavoidable deaths would undermine the skill-based dodge mechanic. Changes must be synchronized by the server.

- [ ] Review warning, placement and safe-spawn rules.
- [ ] PM approves implementation or records a skip.

Comments / decision / skip reason: _Write here._

## P5 — More stages

**Source:** PM friend playtest, October 10. Deferred polish idea. Add arenas with distinct movement routes and cover, then check spawn safety, wrap seams, and the longer dash.

- [ ] Choose stage themes/layouts and playtest each.
- [ ] PM approves implementation or records a skip.

Comments / decision / skip reason: _Write here._

**Latest dash rule (October 10):** The implemented early grounded dash-jump remains available. Dash now recharges automatically in 10 seconds; landing/stomp refill references in older P2 notes are historical and superseded.

Shared power-up first pass delivered: scatter-boots pickup changes every player for 8 seconds, with one ammo per three-pellet volley. Spawn cadence 18 seconds; human balance review is in Sprint 5. Speed/turbo boots, other pickups, random obstacles and new stages remain deferred.

Scatter pacing revised: server chooses one of eight exposed platform spots without consecutive repeats. Initial/subsequent waits are randomized to 30–45 seconds; effect remains eight seconds. Supersedes the original center/18-second pacing.

## PM feedback carried forward from Sprint 4/5 review — October 11

- [ ] Show room/error/status messages inside the game screen consistently (Sprint 4 T2).
- [ ] Smooth out the final results reveal; PM reported it is clunky (Sprint 5 T6).
- [ ] Add one or two more arenas (Sprint 5 T3; extends P5 above).

The PM reports move/jump instructions were enough for friends to discover the rest, and the revised reload/dash felt better. Preserve that simplicity while refining onboarding. Sprint 6 work awaits explicit permission.

P3 update: approved Turbo and Ricochet delivered after Scatter. The shared pool now chooses among all three, with eight-second effects, ten-second pickup expiry and 30–45 second waits. Turbo adds 25% running speed/acceleration/braking; Ricochet bounces upward once, with purple bullets and shared bounce flash. These supersede earlier notes deferring Turbo and the original 18-second cadence. PM feel review is recorded in Sprint 5's new checkboxes.

## Polish phase authorized — October 11

PM requested polishing before deployment, with Sprints 6/7 to finish after the game is online. First pass: smoother results reveal and visible in-game room/error messages. New arenas and random obstacles remain in the authorized polish discussion; prioritize them with the PM. Preserve existing gameplay approvals and leave PM acceptance boxes unchanged. The previous release build/archive is a baseline; rerun verification for the final polished build.

## First polish pass delivered — October 11

Results now show the score table immediately, hold only the deciding shot figures during a 1.3-second tiebreak reveal, and highlight the winner in their player color. Ordinary results reveal in 0.4 seconds; **Reveal now** skips the wait. Reduced-motion users receive the complete result immediately. Server standings and rematch availability remain unchanged.

Room/status messages appear in a dismissible arena notice when the room menu is closed. Informational messages expire after seven seconds; errors remain until dismissed or replaced. Opening the menu shows the original message without a duplicate arena notice.

Verification: type checking, 128 automated tests, and production build passed. Browser review on the temporary preview confirmed visible scores before the tiebreak, automatic and manual reveal, and a real failed join message remaining visible with the menu closed; dismiss returned focus to the game. No browser console errors observed in the dev preview. This is a polish check, not final Sprint 6 release acceptance.

PM review (mark yourself):
- [ ] Results reveal feels smooth and the winning reason is clear.
- [ ] Room/error notices are readable inside the game and dismiss correctly.
- [ ] Review the actual two-to-four-player result card in a match.

Comments / decision / skip reason: _Write here._

October 12 PM decision: add two arenas next. Random obstacles remain deferred.

## Two additional arenas — October 12

PM approved Crossfire and Switchback. Toybox remains the default.

- **Crossfire:** copper/orange arena with a long center ledge, broad outer lanes, and exposed drops. Longer horizontal approaches give the dramatic dash room to work.
- **Switchback:** violet arena with staggered shorter ledges and two hanging cover walls. More interruptions to shooting lanes and more opportunities to jump around cover or use Ricochet.

Select an arena through **Play / menu → Practice arena** in solo play, or **Room → Arena / match settings** online. Only the host can change the shared arena in the lobby or after results; it is locked during countdown/play. Both modes support all three arenas with 2–4 players. Selection moves visible bodies to the selected arena's spawn pads, clears old pickup/effect/projectile state, and preserves completed results. Rematch starts fresh in the selected arena. Prediction and rendering follow the authoritative arena ID; exports include it.

Each arena has four grounded spawn pads, two-tile open wrap borders, and its own exposed pickup positions away from spawn pads. Shared boot duration, pacing, expiry, reload, movement, and dash rules are unchanged.

Verification: 143 tests, type checking and build passed. Added checks cover safe spawns/pickup visuals, wrapped borders, jump/dash scripts with all three boot effects, both match modes, host/phase selection restrictions, preserved results and cover blocking. Separate real SDK tests passed four-player Crossfire Timed and Switchback Stock matches, shared standings, guest/countdown rejection, arena swaps and rematches. Browser verification passed practice selection, host/guest synchronization and lock, actual match results, arena swap/rematch and a 390px selector without horizontal overflow. No page errors observed. Human balance review remains open.

PM playtest / acceptance:
- [ ] Crossfire: routes and dash escapes feel good; cover and pickups are readable.
- [ ] Switchback: routes, hanging cover and Ricochet feel good; no awkward traps.
- [ ] Both arenas: spawn fairness and shared pickups feel balanced with friends.
- [ ] Choose whether to keep both layouts as delivered or record requested changes.

Comments / decision / skip reason: _Write here._

Deployment and final Sprint 6/7 acceptance remain deferred. Random obstacles have not been added.

Public preview note: individual Crossfire Timed and Switchback Stock checks passed, but repeated simultaneous public tests exposed intermittent socket disconnects/timeouts. This is tracked in release verification/known issues for final-host investigation; it is not claimed resolved or accepted by the PM. Local arena checks and browser UI checks passed.

## Toybox workshop dressing — October 12

PM requested a first visual-personality pass for Toybox before dressing other arenas. Added original canvas pixel artwork: recessed wall panels/pegboard, framed gunboot blueprint, toy shelves with alphabet blocks, duck, wind-up robot, ball and books, rocket poster, gears, toy train mural, scuffs and inventory label. Static, muted artwork draws behind the original platforms and all actors/effects. No map tiles, collision boxes, spawn pads, pickup positions or gameplay rules changed. Crossfire and Switchback remain visually unchanged.

Type checking and production build passed. Browser screenshot review confirmed clear platform/player foreground and no page errors. No new gameplay tests were added for this cosmetic change.

PM visual review:
- [ ] Toybox has enough personality; wall details remain readable during play.
- [ ] Players, bullets, pickup effects and walkable platforms remain easy to distinguish.
- [ ] Approve this style or record changes before applying personality passes to other arenas.

Comments / decision / skip reason: _Write here._

## Crossfire / Switchback workshop dressing — October 12

PM approved Toybox's workshop style and authorized matching personality passes on both other arenas.

- Crossfire: copper test-range workshop, recessed panels/pegboard, toy duck and robot target posters, copper conduits, test-range/boot-lab plates, pressure gauges, spare alphabet blocks and prototype tool drawer.
- Switchback: violet clockwork workshop, matching recessed wall panels, spring-lab gear diagram, clock/key/spool cabinet, spring collection, large muted wall gears, pendulum displays and a wind-up locomotive.

Original static pixel artwork draws behind physical ledges and all actors/effects. Toybox art remains unchanged. No layouts, collision geometry, spawns, pickups, movement or multiplayer rules changed. No animation or new camera shake was added. Build/type checks passed; both backdrops were screenshot-reviewed on the public preview, with no browser page errors. No new gameplay tests needed for this cosmetic-only change.

PM visual review:
- [ ] Crossfire dressing fits the Toybox theme and leaves combat readable.
- [ ] Switchback dressing fits the Toybox theme and leaves combat readable.
- [ ] Approve both personality passes or record refinements.

Comments / decision / skip reason: _Write here._
