# Sprint 6 — Release verification

**Target dates:** October 25–27, 2026

**Status:** In progress — authorized October 11, 2026. Render deployed October 13; final verification and PM acceptance remain pending.

[All sprints](README.md) · [Product plan](../product-plan.md)

## Goal

Freeze a dependable release and prepare everything needed for submission.

## Dependencies

Onboarding and MVP complete; release scope explicitly recorded.

## Planned work

- Complete the manual lifecycle, result, Stock, three/four-player and friend-playtest checks carried from Sprint 4 on October 7. This is the final verification sprint, before Sprint 7 submission.

- Freeze feature scope. Fix release-blocking defects before adding anything new.
- Deploy the final configuration to a persistent service with public HTTPS/WebSocket access. Confirm the chosen service will remain available through judging.
- Verify from fresh browsers and separate networks; cover Chrome/Edge and Firefox. Add Safari only if retained as supported scope.
- Run appropriate shared simulation, combat and room-lifecycle checks, a production build and static type checking. Report failures and limits.
- Exercise network delay/jitter, focus loss, reconnect error messaging and server restart behavior without promising match reconnection support.
- Review practical server capacity for the expected launch, message validation/rate limits, error logs and a recoverable deployment process.
- Prepare original project cover art, final title, concise description, public URL and useful evidence of the AI-assisted build.
- Prepare exact local run instructions, public test instructions, a known-issues list and a short release summary.
- Have friends test the actual public release after the final material gameplay change.

## Handoff for review

At delivery, the assistant fills in the information below so each test is reproducible. This is not a claim that anything is delivered yet.

- Build / revision: `91171c0545d84dc8` — deployed October 13, source commit `51d2ce08ec5d59fceb418ad5657a1a70caa1895c`.
- Demo or public URL: [permanent Render game](https://boot-loop.onrender.com/) · [developer controls](https://boot-loop.onrender.com/dev).
- How to run and reach the feature: Node 24.13.0; `npm ci --include=dev`, `npm run check`, `npm start`; open localhost:3000 or `/dev`. T9 previews are on `/dev`.
- Automated check results, if applicable: latest 143 tests, type checks and build passed; hosted four-player Timed/Stock match/result/arena/rematch assertions passed. Test cleanup retried connections and required interruption; that follow-up and human acceptance remain open. Earlier local capacity/restart evidence predates polish. [Evidence](../release/verification.md).
- Known limitations and carried work: [Known issues](../release/known-issues.md); Render Free cold start, in-memory rooms, no resume, pending human/browser/device/public-host verification.

## How to use this checklist

These are standard Markdown task-list checkboxes: change `[ ]` to `[x]` to mark one. For each review item, mark **Pass** or **Skip**, and leave a comment or skip reason. A failed or untested item stays unchecked with notes about what remains. Do not mark both options.

Testing and final acceptance boxes belong to the product manager; the assistant leaves them unchecked. A skip records your scope decision and does not claim that a test passed. Skipping a contest-related review cannot change the organizer's requirements. Feel approvals must be explicit; skipping their review requires an explicit decision to change that gate.

## Testing and review checklist

### T1 — Fresh public visit

Open the release URL in a fresh browser session and after an idle period. Confirm prompt loading, understandable controls, solo demo and working create/join flow.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T2 — Supported browsers

Run a complete match in the supported Chrome/Edge and Firefox browsers. Record browser versions and any supported Safari result.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T3 — Separate-network match

Have friends join from separate devices/networks and complete matches plus rematches on the actual release URL.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T4 — Failure handling

Switch tabs, lose focus, disconnect a client and review server-restart behavior. Confirm no stuck input and clear errors rather than a permanently frozen interface.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T5 — Automated verification evidence

Review the build, type-check and relevant simulation/combat/room test results. Record the build identifier and unresolved failures.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T6 — Hosting and operational readiness

Confirm the selected service stays available as intended, capacity is acceptable for expected use and a previous working build can be restored.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T7 — Submission materials

Review title, cover image, description, project URL and any additional mission-required evidence. Confirm they describe the actual shipped scope.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T8 — Release acceptance

Review remaining issues. Confirm none prevent joining, understanding, completing or rematching a two-player game; document any accepted limitation.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T9 — Power-up presentation and normal bullet impacts

Use `/dev` boot previews and Try small bullet impact, then play a friend match. Check the first-three-second shaking text (camera stays steady), final 3 → 2 → 1 countdown, shared timing, and reduced-motion readability. Normal bullet impacts should be brief and smaller/fainter than purple Ricochet bursts. Confirm impacts appear for platform/player hits and no gameplay behavior changes.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

## Deferred Sprint 4 checks — complete before submission

Product-manager instruction October 7: defer edge-case review and move ahead with presentation. These checks remain unperformed by human testers; automated results do not mark them passed.

- [ ] Host transfer, countdown/active departures, below-two cancellation and empty/stale room links (Sprint 4 T1–T2).
- [ ] Late joins, host authority, settings locked during play, rematch settings, replacement players and frozen finished standings (Sprint 4 T3).
- [ ] Timer-expiry contacts, duplicate inputs, simultaneous kills, zero-kill Timed draw and all tiebreak paths (Sprint 4 T4).
- [ ] Stock loss/respawn/protection, eliminated-player viewing in 3/4-player rounds, final-stock mutual draw, time cap and reset (Sprint 4 T5).
- [ ] Three/four real players/devices: identities, readable combat, safe spawns, shared scores and resources (Sprint 4 T6). Four automated clients are not four human playtesters.
- [ ] At least three friend matches on separate networks, including Timed and Stock, recording fairness, lag, fun and desire to rematch (Sprint 4 T8; [brief](../playtests/sprint-03-friend-playtest.md)).

Comments / evidence / any explicit skip decision: _Write here._

## Exit criteria

The final public build passes required review, release-blocking defects are resolved, and submission materials are complete. Any skipped check has an explicit product-manager decision and known limitation.

- [ ] I have reviewed every applicable item above; each is passed or explicitly skipped with a reason.
- [ ] Remaining issues and carried work are recorded below.
- [ ] I accept this sprint's result and approve moving to the next applicable sprint.

Accepted by / date: _Write here._

## Comments and changes

- Issue or requested change: _Write here._
- Deferred or removed scope and reason: _Write here._
- Carry into the next sprint: _Write here._

## If time runs short

Drop incomplete extras. Preserve the release buffer. Avoid broad refactors and untested feature additions.


## Implementation progress — October 11

PM authorized Sprint 6 and added the normal-impact review to this sprint (T9). Current game scope is frozen. Render Free selected explicitly; no paid services authorized. Deployment uses one Node web service for client and room server. [Deployment instructions](../release/deployment.md), [submission draft/cover](../release/submission.md) and [verification evidence](../release/verification.md) are ready. A checksummed source/build archive is under artifacts/releases.

The permanent URL, account/repository connection, actual public cold start, supported-browser matches and PM/friend acceptance remain open. This sprint is in progress; none of these open gates is marked passed or implicitly skipped.

October 11 PM steering: deployment is deferred while authorized polish continues. Complete final Sprint 6 public/browser/friend verification and Sprint 7 submission only after the final polished game is online. Do not reuse earlier release evidence as verification of a later changed build.

## Arena polish carried into final online review — October 12

Crossfire and Switchback were added with shared host selection and arena-specific spawns/pickups. Final public verification must use the polished build and cover all three arenas; earlier Toybox-only evidence is not final acceptance. PM feel/fairness review checkboxes are in the polish backlog.

- [ ] T10: Play both new arenas with friends, check spawn fairness, dash escape routes, shared pickups and rematches; record comments or a skip.

Comments / decision / skip reason: _Write here._

- [ ] T11: Investigate/reproduce intermittent disconnects seen during simultaneous temporary-tunnel tests; verify reliable multi-room play on the final host before release acceptance. See release/verification.md for evidence.

Comments / decision / skip reason: _Write here._

## October 13 hosting handoff

PM authorized hosting and supplied the GitHub repository. Render Free is live; deployment and basic route/build/multiplayer checks completed. T11 stays open: hosted tests passed their game assertions, but test-client cleanup retried connections after intentional leave. Complete final failure-handling, cold-start, human browser/network review and PM acceptance before closing this sprint. No PM checkboxes have been marked automatically.
