# Multiplayer game product plan

Updated: October 7, 2026. Sprints 0–4 closed under the product manager’s decisions. The build supports 2–4 players and Timed/Stock modes. Deferred manual edge-case and friend review is listed in Sprint 6; Sprint 5 presentation work is in progress.

This document records the user's approved scope and subsequent recommendations.
The original game spec remains a reference; approved decisions here supersede
conflicting features in that spec. Recommendations are explicitly marked below.

## Product direction — approved

- Chaotic party game with approachable controls and surprising interactions.
- Approved working title: Boot Loop. Initial setting: bright floating toybox
  platforms; the user may redirect the visual direction after reviewing it.
- Two-player reliability first; structure for up to four players.
- Custom movement and collision; no physics engine.
- Fixed single-screen arena wrapping on both axes.
- One-hit kills through stomps and downward gunboot shots.
- No player body collision or pushing.
- Horizontal dash only: left/right, no damage, one charge, ground/stomp refill.
- One shared boot type for everyone in the MVP.
- Desktop keyboard controls; Chrome/Edge and Firefox baseline. Safari depends
  on the audience. Mobile contest expectations are still unresolved.
- Public create/join links, no accounts, simple instructions and rematches.
- Solo mode is a movement/combat-controls demo, without bots or scoring.
- Host transfer on departure; no joining an active match; eliminated players
  watch their current match. No extra spectator clients.
- Rematches preserve settings.

## Approved release priorities

Protect: responsive movement, full wrap and seam readability, horizontal dash
subject to feel approval, stomps, one boot, one arena, Timed mode, reliable
two-player online play, solo demo, understandable visuals and essential sounds.

Implemented scope now includes Stock and 2–4-player rooms. Human four-player balance/release validation remains deferred to Sprint 6. Conditional additions: extra maps, extra boots, fuller art/animation tooling and polish.

User-requested stretch goals: a proper splash screen with instructions, and
Downwell-inspired on-screen controls. Plan these in [Sprint 5](sprints/sprint-05-onboarding-art-and-feedback.md)
after the core MVP is stable; they do not block release if time runs short.

Deferred: pickups, gamepad, reconnect, matchmaking, accounts, full mobile-device
support unless required by the mission, music and advanced movement tech.
On-screen controls are now a stretch goal; broader mobile compatibility still
needs separate validation and a scope decision.

Potential later pickup concept: a pickup changes the boot for every player.
This is a future idea, not MVP scope. If pursued, the change must be prominently
announced and consistently applied by the server.

## Approved Timed-mode tiebreak

User decision: avoid an extra sudden-death match. Resolve ties using statistics,
with fewer shots indicating greater efficiency, and give the result a short,
suspenseful reveal.

Exact MVP rules approved by the user:

- Timed: most kills, then fewest accepted shots, then shared victory among the
  remaining tied players.
- A shot is a server-accepted firing action that consumes ammo. A shotgun volley
  counts once, regardless of pellet count. Rejected actions do not count.
- Only shots fired during the running match count; reset on rematch.
- With no kills anywhere in a timed match, declare a draw rather than reward
  inactivity.
- Reveal the primary score first and the deciding statistic second. Avoid
  describing shot count as accuracy: it does not measure accuracy or stomp skill.
- Fewest shots favors stomp-focused play and can encourage tied leaders to stop
  shooting. Evaluate this in the first remote playtest.

Proposed Stock rules, if that mode is added: last surviving player wins. At the
time cap, compare stocks remaining, then kills, then fewest accepted shots,
then shared victory. A final-stock mutual elimination produces a draw.

## Availability and review

- Product manager: 4–5 hours each weekday, plus 1–2 hours on weekends.
- Use a conservative assumption of 1–2 hours total per weekend until clarified.
- Builds can be reviewed promptly on the product manager's laptop.
- Two friends are expected to playtest within a day of a request by the user.
- Movement and dash require explicit feel approval before dependent phases.

## Proposed sprint schedule

Detailed work and editable product-manager testing/exit checklists live in
[docs/sprints/README.md](sprints/README.md). Testing boxes remain unchecked until
the product manager reviews them; skipped items require a recorded reason.

| Sprint | Dates | Result and acceptance gate |
| --- | --- | --- |
| 0 | Oct 5 | Close product rules and collect missing mission requirements. |
| 1 | Oct 6–9 | Movement, jump, collision, wrap, seam cues, essential tuning; public connection proof. Tests pass and movement feel approved. |
| 2 | Oct 10–11 | Horizontal dash and one-boot recoil experiment. Dash feel approved and vulnerable moments remain. |
| 3 | Oct 12–16 | Public two-player core: links, movement sync, validated combat, death/respawn/protection, Timed mode and rematch. Friends complete matches on separate networks. |
| 4 | Oct 17–20 | Close lobby/disconnect/tiebreak edge cases. Add Stock mode and validate four players only if the core is stable. |
| 5 | Oct 21–24 | Solo demo, onboarding, character recolors, environment, essential audio and feedback. Add content only when ahead. |
| 6 | Oct 25–27 | Release fixes, real-network/browser verification, cover image, description and submission evidence. |
| 7 | Oct 28 | User submits and verifies receipt. Oct 29–30 remain contingency time. |

Implementation order intentionally brings public deployment and gunboots forward.
Schedule is a target; delayed gates remove later scope instead of consuming the
release buffer. Weekend milestones should require little product-manager time.

## Art division — approved direction and proposed simplification

The user creates one original character in Aseprite. The assistant adapts player
colors and creates the environment. Hand-edited assets must never be overwritten.

PNG sprite sheets hold animation images. Aseprite JSON describes frame locations,
timing and animation tags; JSON alone cannot generate missing poses.

Proposed MVP handoff: 16x16 frame canvas, consistent bottom-center alignment,
separable primary/secondary color ramps, PNG sheet plus JSON metadata. Suggested
initial frames: one idle, two run, one rising and one falling. Dash can reuse a
pose with an afterimage; shooting/protection/death can initially use effects.
Rectangle placeholders allow development to proceed before the art is ready.

Approved working title: Boot Loop. Approved initial environment: bright floating
toybox platforms with restrained backgrounds and obvious wrap-edge cues. The
direction remains flexible; use original designs rather than recognizable
reference-game art.

## Architecture and hosting recommendations

Retain TypeScript workspaces: shared, server and client. Phaser renders and handles
input/audio only; shared code owns movement and deterministic combat helpers.
Sprint 3 adjusts the original Model A proposal: the server replays sequenced inputs
and owns movement/combat; the client predicts locally and reconciles, with wrapped
interpolation for opponents. Combat fairness still requires remote playtests.
The server owns outcomes, accepted shots/ammo, scores, protection and match phases.
Historical hit rewind is not implemented; evaluate it only if reproducible latency
disputes justify the added complexity.
Horizontal dash has no stomp attack while active; ordinary falling can stomp
after the dash ends (accepted with Sprint 0 approval).

Prefer one persistent paid Node service in a US region, serving the built client
and Colyseus from one URL. Render is the provisional recommendation, not a
purchased or deployed service. Keep one instance initially; distributed rooms
and external state are unnecessary MVP work.

Vercel currently documents WebSocket support, but function lifetime and shared
room-state placement need assessment for Colyseus. Netlify frontend hosting is
possible; do not assume its functions provide the required persistent room
server. Neither preference has been made a project requirement by the user.

Sources checked October 5, 2026:
- https://render.com/docs/websocket
- https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections
- https://vercel.com/docs/functions/websockets
- https://docs.netlify.com/build/functions/overview/

## Contest constraints and outstanding information

The official PDF gives October 30, 2026, 11:59 PM Pacific as the deadline.
The saved mission page and original spec say October 31. Plan around October 30
until written organizer clarification is available; target submission October 28.

User understands the Work-mode requirement to be fulfilled. Record this as the
user's understanding, not independent organizer confirmation. Eligibility was
not separately confirmed in the answers and should be checked by the entrant.

Still needed from the user: mission Build-step instructions, desktop-only
eligibility clarification, and relevant Code of Conduct instructions.

Submission requires title, cover, description and public project URL through
Handshake. Execution, creativity, value and polish each carry 25% of judging.
Keep the game available during judging, rather than shutting it down at entry.

## Next planning decisions

1. Review mission requirements when supplied; revise device/build scope if needed.
2. Confirm Stock-specific tiebreak rules if that conditional mode is added.

The user accepted Sprint 1 and explicitly authorized Sprint 2 on October 5. Heavy2 snappier is the approved movement baseline for the lab; exact jump refinement can follow later. Sprint 2 dash-feel approval and completed exit criteria are now recorded by the product manager; opponent assessment remains part of Sprint 3.

Sprint 2 controls from the annotated sprint document: double-tap left/right within 220 ms to dash; Space/Z jumps while grounded or within coyote grace, then fires on a fresh airborne press. Holding does not autofire. Airborne shot presses do not also buffer a landing jump. This control tradeoff is documented for Sprint 2 review.

Sprint 2 T2 refinement approved by the product manager: dash and ammo refill together only on an airborne-to-ground landing (or future accepted stomp). Staying grounded does not refill resources; cooldowns remain in force.

Deferred polish requests from Sprint 2: snappier recoil feedback and a skill-based dash + jump combination with slightly greater jump distance. Exact feedback, design questions and review checklists live in the [polish backlog](polish-backlog.md). No gameplay changes are made by recording these requests.

The user authorized Sprint 3 on October 5 and approved/closed it on October 6. The friend playtest was explicitly skipped for now and moved to Sprint 4 T8 with its three-match brief; completion is not claimed. Death feedback was accepted, and minor lag is a monitoring item for that playtest. The user selected 8 world pixels per side as the bullet-tolerance baseline; Sprint 4 was authorized October 6 and applied the 8 px default, verified shared settings, and strengthened room/result handling. Its friend test and acceptance remain pending; Stock was subsequently authorized October 7 for combined testing; extra players stay conditional.

Sprint 4 departure/timer behavior: leaving during countdown or play cancels with no winner; leaving after the finish preserves final standings. Host transfers as needed and replacements may join between matches. Rematch resets statistics and preserves shared settings. Actions/contacts resolved before server timer expiry count; at/after expiry no new movement, shot or kill changes the result.

October 7: user requested Stock implementation ahead of the carried friend test to test both modes together. Stock is now delivered for review: default 3 lives, selectable 1/3/5; last survivor wins, simultaneous final-stock elimination draws. At the shared time cap rank stocks, kills, fewer accepted shots, then shared victory (including equal no-kill Stock rounds). Timed remains the initial room mode. Settings are host-only between matches and persist on rematch; finished results retain their original mode when the host selects a different next mode. Friend review and Sprint 4 acceptance remain pending.

October 7 follow-up: user authorized 3/4-player support and directed closing Sprint 4, deferring manual edge-case review to the final verification sprint, and proceeding to Sprint 5. The build now supports 2–4 players, Timed and Stock, with four distinct identities/spawns and eliminated-player viewing. Automated three/four-client matches passed; human reviews remain unclaimed and are listed in Sprint 6 before Sprint 7 submission. Sprint 4 is closed under this explicit scope decision. Sprint 5 is in progress with onboarding, procedural audio/mute and fallback-art refinements; final character assets and further polish remain pending.

## October 10 delivery update

Sprint 5 implementation is complete and awaiting consolidated human acceptance: splash/instructions, solo access, original fallback art, audio/mute, bounded action feedback, skippable result reveal, on-screen controls and grounded dash + jump. Human review remains in Sprint 5; deferred lifecycle/edge checks stay in Sprint 6 before submission.

## October 11 release freeze

Sprint 5 approved by PM; Sprint 6 authorized. Current release includes shared Scatter/Turbo/Ricochet, 3-second empty-only reload, 10-second dash recharge, early grounded dash-jump, pixel animations, music/effects, standalone game UI and on-screen controls. These supersede older refill/pickup/music deferral notes. One arena remains the release scope. Further arenas/obstacles are polish backlog items, not Sprint 6 features.

Selected hosting is one Render Free Node service. Free cold-start/availability limits require PM review; repository/account connection and permanent deployment remain pending. Sprint 6 T9 covers new power-up presentation and normal bullet impacts.
