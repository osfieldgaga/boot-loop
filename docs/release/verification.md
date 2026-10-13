# Release verification evidence — October 11, 2026

Game build: `23e1f6d488d62642`. Generated from source/assets/tuning and lockfile; `/release.json` records the build time, while `/health` reports the running server's build. This is a prepared release candidate, not a deployed or PM-accepted release.

| Check | Result | Scope/limit |
| --- | --- | --- |
| Type checks, simulation/feedback tests, production build | Passed; 128 tests | Current source and production assets |
| Two-client lifecycle/combat with delay | Passed | 150 ms synthetic delay each way plus 0–30 ms jitter; not a real WAN/device test |
| Three-player Timed | Passed | Real SDK connections; common results and rematch |
| Four-player Stock | Passed | Unique identities, elimination/results, common standings and rematch |
| Capacity sample | Passed | 10 rooms / 40 clients / 12 seconds locally; minimum observed simulation rate 61.5 ticks/s |
| Capacity traffic estimate | 822.8 snapshots/s, 2.70 MB/s serialized JSON | Not actual wire bytes or Render Free performance |
| Isolated startup/restart smoke | Passed | Player/dev routes, health/build agreement, HEAD/error responses, cross-origin matchmaking headers, disconnect, expired invite, new room |
| Render configuration | Prepared and reviewed against official Blueprint fields | Free plan; not submitted to Render yet |
| Container execution | Not run | Docker daemon unavailable; selected deployment is native Node |
| Human browser/device/friend review | Pending | PM checkboxes stay unchecked |

The first smoke attempt found port 3001 already occupied. The checker now reserves an available temporary port before launching its isolated server; the corrected run passed and cleaned up its process.

Server audit: payload limit 4096 bytes; party message limit 90/client/second; max four clients/room; host-only validated settings; monotonic validated input sequences, bounded queue and stale-input clearing; countdown/active room lock; empty-room disposal. No accounts, databases or multi-instance room routing. Browser keyboard/pointer input clears on focus/visibility loss. Full UI restart/focus behavior in supported browsers still belongs to PM T2/T4.

Test source utilities are in tools/. Reproduce the commands in the root README; rerun public network checks after Render deployment. Preserve the verified build with `node tools/release-bundle.mjs` and its SHA-256 sidecar. Release archives exclude local credentials, app state and dependency folders.

## Post-baseline polish — October 11

Client build `e315d5d07f12121e` adds the revised results presentation and closed-menu arena notices. Type checking, 128 tests, and build passed; temporary-preview UI checks passed for automatic/manual tiebreak reveal and failed-join notice/dismissal. The archived baseline above predates these changes. Deployment and final Sprint 6/7 verification are deferred by the PM until polishing is complete and the final build is online. Do not treat the old archive or earlier multiplayer/capacity evidence as final verification of the eventual release.

## Two additional arenas — October 12

Build `78158af0b1f5515a`: Toybox plus Crossfire and Switchback, with authoritative shared arena selection, matching client prediction/rendering, per-arena pickup locations and arena ID in config exports.

- Type checking, 143 tests and production build passed.
- Local real-SDK four-player Crossfire Timed and Switchback Stock matches passed shared results, guest/countdown selection rejection, preserved finished standings, selection swaps and rematches.
- Separate Chromium browser checks passed practice selection, guest synchronization/lock, actual results card, arena swap/rematch, no page errors and a phone-width (390px) arena selector without horizontal overflow. These do not prove actual touch-device playability.
- Both arenas passed individual public match checks on the temporary Cloudflare preview. However, repeated simultaneous public tests had intermittent disconnects/timeouts: initial Switchback run timed out; a later Crossfire run observed all four sockets closed and the room returning to lobby as players departed. Local tests and server/tunnel processes remained healthy. The underlying cause is unconfirmed; do not call repeated-room public testing fully verified. Diagnostic close-code reporting was added to `tools/arenas-check.ts`.

This build is ready for PM layout/balance playtesting, not final Sprint 6 acceptance. Reproduce and resolve the public disconnect behavior or demonstrate that it is confined to the temporary tunnel/test environment before final release. Permanent Render deployment remains deferred. The original archive predates arena polish; freeze/archive and rerun final release checks after PM acceptance.

## Toybox cosmetic pass — October 12

Client build `72773c0585a926f8` adds static original Toybox workshop wall art behind platforms/actors. Type checking, production build and browser rendering/screenshot checks passed; simulation/layouts are unchanged. This does not resolve the recorded public stress-test disconnects or replace final-host release verification. The running preview server was not restarted for static client artwork, preserving active rooms; startup health build ID will update on the next server restart.

## Crossfire / Switchback cosmetic pass — October 12

Client build `91171c0545d84dc8` adds static workshop-style wall dressing to Crossfire and Switchback. Toybox dressing and simulation are unchanged. Type checking and production build passed; public-preview browser checks and screenshot review passed on both arenas without page errors. Preview server was kept running to preserve rooms; startup health ID updates at its next restart. Previously recorded public multiplayer disconnects and final-host release gates remain open.

## Permanent Render deployment — October 13

- URL: https://boot-loop.onrender.com/ ; developer controls: https://boot-loop.onrender.com/dev .
- Free Node web service `srv-db74lu0m7kps73c12u30`, Ohio; manual deploys, no paid upgrades.
- Deploy `dep-db74luom7kps73c13010` reports Live. Source commit `51d2ce08ec5d59fceb418ad5657a1a70caa1895c`, build `91171c0545d84dc8`. Local 143 tests/type/build passed immediately before deployment; the Render build completed its configured check/build command successfully.
- HTTP 200 for player/dev routes, health and release manifest. Health/client build IDs agree.
- Browser rendering verified and two browser clients created/joined the same hosted room. Screenshot: render-live-game.png in the task's visualization folder. This does not claim a complete human browser/friend review.
- Automated hosted four-client Crossfire Timed and four-client Switchback Stock match/result/selection/rematch assertions passed in simultaneous rooms.
- **Open test cleanup issue:** after those assertions, intentional leaves triggered SDK reconnection retries; the runner remained alive and was interrupted. Do not report a clean runner exit or fully resolved disconnect behavior. Prior tunnel disconnect root cause also remains unconfirmed; investigate SDK/server/proxy closure handling in Sprint 6.
- Cold start after idle, supported-browser full-match matrix, human separate-network playtesting and PM acceptance remain open. Sprints 6/7 stay unclosed.

## PM release acceptance — October 13

PM explicitly approved and closed Sprints 5 and 6. Existing human checkbox selections (including supported-browser, separate-network, failure-handling and deferred multiplayer checks) and comments are preserved. This updates acceptance status, not automated evidence: SDK test cleanup was still interrupted after successful hosted assertions; no technical resolution is claimed. Sprint 7 submission, receipt and judging availability remain outstanding.
