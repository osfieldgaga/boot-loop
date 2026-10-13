# Sprint 4 — Edge cases and conditional modes

**Target dates:** October 17–20, 2026

**Status:** Closed October 7, 2026 under the product manager’s instruction to complete 3/4-player support and move to Sprint 5. Deferred human edge-case and combined playtest review is carried to Sprint 6; no skipped review is claimed passed.

[All sprints](README.md) · [Product plan](../product-plan.md)

## Goal

Make the MVP robust when players leave or rooms change; expand only if the online core is stable.

## Dependencies

Sprint 3 approved and closed. Its deferred three-match friend playtest is now required review work within Sprint 4, before extra-player expansion. On October 7 the product manager explicitly requested Stock implementation before that review so both modes can be tested together. Stock is now in this sprint’s review scope; a four-player release remains conditional.

## Planned work

- Apply the product manager’s selected bullet tolerance of **8 world pixels per side** as the default (24 × 27 px bullet target around the 8 × 11 px body). Update default/reset/help text together; retain the 0–8 tuning range, cover blocking and unchanged stomp/movement boxes. Confirm shared online settings and JSON export before friend review.
- Complete the deferred [three-match friend playtest](../playtests/sprint-03-friend-playtest.md) from Sprint 3 T9 on separate devices/networks. Record fun, confusing deaths, latency/corrections, tolerance fairness and desire to rematch. Address repeatable unacceptable combat disputes before optional content expansion.

- Close room lifecycle cases: host departure transfers control; empty rooms are removed; stale links show clear errors.
- Reject late joins to a running match with a clear explanation. Do not add extra spectator clients.
- Define and implement what happens when disconnects leave fewer than two active participants. Keep the result understandable and consistent.
- Lock settings at match start and preserve them on rematch. Make lobby authority and settings visible to everyone.
- Finish exact Timed tiebreak state and result handling, including simultaneous end-of-timer events and accepted-shot counting.
- October 7 scope change: implement Stock now for combined testing, using the previously proposed rules below. Friend review will cover both modes rather than block Stock implementation.
- If time and testers permit, test three/four-player matches for readable combat and consistent multi-hit outcomes. The user and two friends provide three testers; a fourth tester/device is needed for a genuine four-person playtest.
- Record optional items explicitly as deferred if they threaten the release buffer.

## Handoff for review

Delivered October 6, 2026. These are assistant verification results; the checkboxes below remain yours.

- Build: Sprint 4 room/result reliability, two players, Timed mode and the approved **8 px per-side default tolerance**.
- Preview: [Open Boot Loop](https://thomson-penalty-mentioned-attempting.trycloudflare.com/) · [local alternative](http://localhost:3000/). The temporary public URL depends on the laptop/server/tunnel staying running.
- Review flow: create a room, copy the invite, join with a second device, then start. Choose 30 seconds for focused lifecycle checks; use two minutes for the friend test. The room shows shared duration, tolerance and whether settings are locked.
- Departure rules: lobby departure transfers host when necessary. Leaving during countdown/play cancels the match with **no winner**, resets match statistics/resources and invites a replacement. Leaving after the finish preserves the final result and original player/color standings. Replacement players can join between matches; rematch clears the old result and resets stats while preserving room settings.
- Timer boundary: server actions/contacts resolved before expiry count; at/after expiry, movement, shots and kills no longer resolve. Final standings freeze, including simultaneous kills on the last eligible tick. Fewer accepted shots still breaks a kill tie; zero kills is a draw.
- Automated checks: strict type checks, **96 unit tests**, and production build passed. New cases cover countdown cancellation, repeated departures, final-result preservation across replacement/rematch, final-tick kills, expiry cutoff and simultaneous-hit tiebreaks.
- Public network check: two automated clients completed a 30-second match with **100 ms added delay each way plus 0–30 ms jitter**, identical results (4–1 kills; 46–35 accepted shots) and five matching death bursts. Verified host-only settings, active setting lock, late-join rejection, results replacement, rematch reset, countdown/active cancellation, host transfer, empty-room disposal and expired-invite rejection.
- Browser review: two tabs completed a 30-second draw with matching scores/settings. Host departure preserved final standings; a replacement joined and rematched. Closing the new host tab cancelled the active match, transferred control and displayed “no winner.” An expired invite returned to practice with an error; reset restored 8 px, and the online JSON exported 8 px. No human fairness result is claimed. [Preserved-result screenshot](</home/osfield/.codex/visualizations/2026/10/05/01a10c07-bdce-79c3-b1f8-c82c24d0bd28/sprint-04-preserved-result.png>).
- Stock verification (October 7): six new unit tests cover host validation/locks, life loss, respawn/protection, final elimination, mutual final-stock draw, timeout rankings, frozen results and mode changes/rematches. Public two-client checks passed for 3-stock timeout (both 2 stocks/1 kill; fewer shots decided), 1-stock final elimination (winner 1 life, loser 0), and Timed with 100 ms added delay each way. Final-life feedback reached both clients, and all runs checked reset, departures, replacement and stale-link handling. Browser review confirmed shared mode/lives, locked guest controls, countdown lock, 3L HUD and exported mode/stocks. [Stock controls](</home/osfield/.codex/visualizations/2026/10/05/01a10c07-bdce-79c3-b1f8-c82c24d0bd28/sprint-04-stock-mode.png>).
- Human review: [three-match friend brief](../playtests/sprint-03-friend-playtest.md), carried from Sprint 3. Complete T8 on different networks; automation does not establish fair or fun combat.
- Stock follow-up: choose **Mode → Stock — last survivor** in the room, select 1/3/5 starting stocks (default 3), and set the shared time limit (default two minutes). Losing a stock uses the existing death/respawn/protection rules while lives remain. Last survivor wins; simultaneous final-stock elimination draws. At the time limit rank stocks, kills, then fewer accepted shots; an exact tie shares victory, including untouched players with equal lives. Mode/stocks lock during play and persist on rematch; combined JSON includes both. The pixel HUD shows lives with **L**. With two players, final elimination ends the match immediately; there is no long spectator phase.
- Conditional scope: three/four-player support remains unimplemented pending review. No extra spectator clients, reconnect or matchmaking added. Review T7 after the combined playtest before expanding player count.
- Known limits: latency may still cause corrections; no historical hit rewind. Production bundle remains large because of Phaser. Permanent hosting remains pending. No friend test or PM acceptance claimed.

## How to use this checklist

These are standard Markdown task-list checkboxes: change `[ ]` to `[x]` to mark one. For each review item, mark **Pass** or **Skip**, and leave a comment or skip reason. A failed or untested item stays unchecked with notes about what remains. Do not mark both options.

Testing and final acceptance boxes belong to the product manager; the assistant leaves them unchecked. A skip records your scope decision and does not claim that a test passed. Skipping a contest-related review cannot change the organizer's requirements. Feel approvals must be explicit; skipping their review requires an explicit decision to change that gate.

## Testing and review checklist

### T1 — Host transfer

Have the host leave the lobby and an active match. Confirm remaining players see the correct host. Countdown/play departure cancels with no winner; a departure after the finish preserves the completed result. Invite a replacement and start/rematch.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Host now becomes the second player, which is ok

### T2 — Disconnect and room cleanup

Leave until one player remains, then until the room is empty. Reopen the old link and confirm understandable behavior without a broken screen.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Reusing an old link just creates a new room and cancels the old room altogether. acceptable, message "Could not join: the room may be full, already playing, expired, or the server is unavailable. Create a new room or check the code." shows up. add to the polishing doc that all these messages have to be added on the actual screen

### T3 — Late joins and settings

Attempt to join during a match and change settings after it starts. Confirm countdown and active-match joins are rejected, settings lock during play, and both players see the same duration/tolerance. A replacement may join after results, preserving the old standings until rematch.

- [ ] Pass
- [x] Skip

Comments / evidence / skip reason: _Write here._

### T4 — Timed result edge cases

Test a kill near timer expiry, duplicate actions and repeat matches. Confirm a single frozen result and consistent statistics on both screens.

- [ ] Pass
- [x] Skip

Comments / evidence / skip reason: _Write here._

### T5 — Stock mode

Create a room, choose Stock and 3 lives, then play. Check life loss, respawn/protection while lives remain, zero-stock elimination and the immediate last-survivor result. Use 1 life for quick rounds and try 5. Confirm mode/stocks are host-only and locked during play, reset on rematch, persist with room settings, and appear in the JSON. Review time-cap ranking (stocks, kills, fewer shots, shared victory) and simultaneous final-stock draw; switch back to Timed between matches. Rules are the recorded implementation baseline, subject to your combined playtest feedback.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T6 — Optional three/four-player play

If included, play on three/four separate devices. Check simultaneous hits, identity readability, spawn safety and stable scores. Record actual participant count.

- [ ] Pass
- [x] Skip

Comments / evidence / skip reason: _Write here._

### T7 — Scope review

Review optional features and decide which ship. Mark deferred optional checks as skipped with a reason rather than leaving release scope ambiguous.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T8 — Friend playtest carried from Sprint 3

Complete at least three two-minute matches with a friend on a different network using the [playtest brief](../playtests/sprint-03-friend-playtest.md). Include at least one Timed and one Stock match so both modes receive friend feedback. Use the selected 8 px tolerance baseline; verify the default, reset, gold target outline, shared setting and combined export. Confirm forgiving shots still respect cover. Record browsers, ping/network conditions, confusing deaths, repeatable corrections, fun/frustration, tiebreak incentives and desire to rematch. Investigate recurring unfair outcomes before adding optional modes or players.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Carried from Sprint 3 T9 by the product manager on October 6, 2026; not yet completed. Add findings here. Any further deferral requires an explicit product-manager decision._

## Exit criteria

Required lobby/disconnect/result behavior passes review. The carried friend playtest is completed and findings addressed, or the product manager explicitly records a further deferral; automated agreement alone does not establish human fairness. Stock mode meets its review checks or is explicitly deferred by the product manager. Optional four-player features meet their checks or are explicitly deferred; unfinished extras cannot block the two-player MVP.

- [x] I have reviewed every applicable item above; each is passed or explicitly skipped with a reason.
- [ ] Remaining issues and carried work are recorded below.
- [x] I accept this sprint's result and approve moving to the next applicable sprint.

Accepted by / date: _Write here._

## Comments and changes

- Sprint 3 carryover: friend playtest deferred to T8; selected bullet tolerance is 8 px per side. Death feedback accepted as “Pretty smooth”; minor lag accepted for Sprint 3 and monitored here.
- Implementation note: final results previously disappeared on departure; they now remain frozen through host transfer and replacement. Cancellation clears stale combat feedback, shows no winner, and preserves room settings.
- Issue or requested change: _Write here._
- Deferred or removed scope and reason: _Write here._
- Carry into the next sprint: _Write here._

## If time runs short

Drop Stock and four-player release support before weakening the two-player core. Do not add reconnect, public spectators or matchmaking.


- October 7 scope decision: product manager requested Stock before friend testing (“so i can test all at once”). Stock now included; no additional player-count expansion authorized by that request.

## Closure and carryover — October 7, 2026

The product manager authorized 3/4-player support, deferred remaining edge-case review, and instructed proceeding to Sprint 5. Room capacity is now four, the host can start with any 2–4 participants, and all players have distinct Gold/Blue/Mint/Pink rendering, HUD entries, death quips and colors. Each player has a unique spawn. Zero-stock players remain in-room watching; no extra spectator clients are added. Departures continue a match with at least two participants, transfer host as needed, and cancel without a winner below two. Stock survivor resolution still applies to remaining participants.

Verification: 99 unit tests, strict type checks and production build passed. Actual public three-client Timed and four-client Stock rounds completed with identical final standings on all clients; rematch resets passed. Human fun, balance and device/network review is still uncompleted.

Existing review annotations/checkboxes above are preserved. Closure is recorded from this chat instruction, rather than marking unperformed tests passed. T1–T4 manual lifecycle/result edge cases, T5 Stock review, T6 human 3/4-player review and T8 friend review are carried into Sprint 6’s final release checklist. T7 scope decision is now 2–4 players plus Timed and Stock. Sprint 5 is authorized and in progress. Sprint 7 remains submission day after release verification.
