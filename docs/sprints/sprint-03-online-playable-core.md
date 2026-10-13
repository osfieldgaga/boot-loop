# Sprint 3 — Online playable core

**Target dates:** October 12–16, 2026

**Status:** Approved and closed by the product manager October 6, 2026. T9 friend playtest explicitly skipped for now and carried into Sprint 4; it is not claimed completed. Sprint 4 implementation awaits a separate go-ahead.

[All sprints](README.md) · [Product plan](../product-plan.md)

## Goal

Deliver a complete two-player match at a public link and evaluate combat fairness on real networks.

## Dependencies

Movement and dash review gates completed; prototype boot and dash/combat rules settled.

## Planned work

- Create Colyseus rooms, shareable join links, a visible lobby and a simple match countdown. Make full/missing-room errors understandable.
- Use immediate local prediction, server replay of sequenced input and wrapped remote interpolation. Reject invalid, duplicate and excessively queued input.
- Evaluate latency and combat fairness on actual networks. The implementation adjusts the original Model A prototype: the server runs movement as well as combat, so clients never submit authoritative positions. Historical position rewind is not implemented; reconsider it only if repeatable unfairness appears in playtests.
- Implement deterministic stomp detection across seams, stomp bounce, ammo/dash refill, simultaneous-contact handling and the chosen dash/stomp rule.
- Let the server accept firing actions, consume ammo, enforce cooldowns, simulate projectiles and resolve kills. Use swept checks or substeps for fast projectile hits.
- Implement one-hit death, 1.5-second respawn, safe wrapped-distance spawn selection and 1.5-second protection that prevents dealing and receiving kills.
- Implement Timed mode, default two-minute matches, server-owned scores/timer, accepted-shot counts and the approved tiebreak. Freeze results when the match ends.
- Implement basic rematches with settings preserved and match statistics reset.
- Validate and rate-limit incoming messages; reject stale/duplicate combat actions. Clear empty rooms and handle basic disconnects.
- Provide a lightweight remote playtest brief and request testing through the user. Record confusing deaths, lag disputes, camping and reasons to rematch.

## Handoff for review

Delivered October 5, 2026. These results describe assistant verification; the review boxes below remain yours.

- Build: Sprint 3 two-player online core, using approved Heavy2 snappier movement and one shared boot.
- Public preview: [Open Boot Loop](https://thomson-penalty-mentioned-attempting.trycloudflare.com/). Local alternative: [localhost:3000](http://localhost:3000/).
- Start: **Create room → Copy invite link → friend opens link → host starts**. Gold is Player 1; blue is Player 2. Default matches are two minutes. The host can choose 30 or 60 seconds for focused review.
- Controls: A/D or arrows move; double-tap left/right within 220 ms dashes; Space/Z jumps on ground/coyote grace and fires on a fresh airborne press. Click the arena before playing. Tuning and practice resets are disabled online so both players share the same rules.
- Combat: stomps bounce/refill; dash cannot stomp or shoot but remains vulnerable. Ammo and dash refill together on landing or an accepted stomp. Death takes 1.5 seconds to respawn, followed by 1.5 seconds of protection that blocks dealing and receiving kills. White outline indicates protection.
- Results: server-owned timer, kills and accepted-shot counts; most kills, then fewest accepted shots, then shared victory. Zero kills is a draw. The score appears before the deciding result. Rematch preserves duration and clears match state.
- Automated verification: `npm run check` passes strict type checks, **86 tests** and a production build. Tests cover movement/resources, sequenced validation, wrapped stomps/shots, tile blocking, dash eligibility, simultaneous kills, protection, respawn, ties and rematches.
- Public network verification: two clients completed a 30-second match with **100 ms of added delay each direction and 0–30 ms jitter**, identical results after the HUD/quip update (4–1 kills; 42–25 accepted shots) and identical confirmed death events (5). The production client feedback queue emitted all five bursts with identical quips on both clients, including each surviving killer, bounded ammo, duplicate-action rejection, host-only settings, rematch reset, disconnect cancellation, host transfer and a replacement player. This is automated traffic, not evidence that human combat feels fair.
- Follow-up checks: near-miss limits, both wrap seams, cover visibility and authoritative death positions pass. Practice effect preview produces particles without browser errors. The old tunnel stopped during the first public rerun; after restoring it, the full public check passed.
- HUD/quip browser review: pixel scores and the live countdown/timer displayed in a two-tab match; practice preview displayed “GOLD GOT CRUSHED!” without browser errors. [Pixel HUD](</home/osfield/.codex/visualizations/2026/10/05/01a10c07-bdce-79c3-b1f8-c82c24d0bd28/sprint-03-pixel-hud.jpg>) · [Death quip](</home/osfield/.codex/visualizations/2026/10/05/01a10c07-bdce-79c3-b1f8-c82c24d0bd28/sprint-03-death-quip.jpg>).
- Browser screenshot: [two-player match](</home/osfield/.codex/visualizations/2026/10/05/01a10c07-bdce-79c3-b1f8-c82c24d0bd28/sprint-03-online.jpg>).
- Browser verification: two tabs joined by invite, shared countdown/settings, displayed distinguishable players and completed a match with matching results. The guest cannot start/rematch. Leaving returns to practice.
- Friend review: deferred by the product manager to Sprint 4 T8. Use the [three-match playtest brief](../playtests/sprint-03-friend-playtest.md); at least one friend must play from a different network. This was skipped, not passed.
- Hosting limitation: this temporary URL depends on the laptop, server and tunnel staying running. Restarting the tunnel changes it. Permanent hosting is still pending.
- Scope: two players, Timed mode, one arena/boot; no reconnect, accounts, matchmaking, Stock mode, extra content or final art/audio. Recoil and dash + jump remain in the [polish backlog](../polish-backlog.md).

### Network model and remaining risk

The client predicts your own movement immediately and reconciles against server acknowledgments; other players interpolate between snapshots. The server advances at 60 Hz and sends snapshots at 20 Hz. Incoming input is strictly validated, at most one queued action is consumed per simulation tick, and held input expires after 200 ms without processed arrivals. Stale or duplicate actions do not fire twice. A stalled client leaves instead of accumulating an unlimited replay backlog.

This is a deliberate adjustment to the planned client-authoritative prototype. It prevents position submission from deciding movement or hits and keeps one consistent ruleset. It does not eliminate latency: prediction corrections and combat that looks different from the server may still occur. Record repeatable confusing deaths in T8/T9; do not treat successful automated agreement as a fairness approval.

## How to use this checklist

These are standard Markdown task-list checkboxes: change `[ ]` to `[x]` to mark one. For each review item, mark **Pass** or **Skip**, and leave a comment or skip reason. A failed or untested item stays unchecked with notes about what remains. Do not mark both options.

Testing and final acceptance boxes belong to the product manager; the assistant leaves them unchecked. A skip records your scope decision and does not claim that a test passed. Skipping a contest-related review cannot change the organizer's requirements. Feel approvals must be explicit; skipping their review requires an explicit decision to change that gate.

## Testing and review checklist

### T1 — Join and start

[Open the current preview](https://thomson-penalty-mentioned-attempting.trycloudflare.com/). Create a room and have a friend join from a separate device/network using the copied link. Confirm both see the same lobby, countdown and match settings.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T2 — Movement synchronization

Move and wrap repeatedly on both clients. Confirm smooth remote movement and distinguishable players without persistent disagreement.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T3 — Stomps and dash interaction

Stomp normally and across a seam; attempt side contact and the agreed dash cases. Confirm exactly one outcome, bounce and ammo/dash refill.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T4 — Shots and fast hits

Shoot normally and across seams, into tiles and past moving opponents. Review the new 3 px bullet tolerance: near misses should be forgiving without hitting through cover. Confirm ammo, cooldowns, hit outcomes and no self-hits.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T5 — Death and protection

Review the short player-colored particle burst and tiny camera shake on death on **both screens**, including the player who scored the kill. Confirm the same short colored death quip appears on both screens, then clears without covering the arena for long. Use **Try death effect** or the death tuning panel’s preview button to compare particles, shake and joke duration. Confirm slider/number synchronization, limits, restore defaults, and the combined JSON export in practice and online. Check respawn delay, spawn location, protection display and inability to kill or be killed while protected. Check existing projectiles do not bypass the agreed rule.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Pretty smooth
### T6 — Timer and results

Complete a normal match and controlled tie scenarios: different shot counts, identical statistics and no kills. Confirm shared results and one shot per accepted volley. Check the pixel HUD shows gold/blue scores, countdown and remaining time consistently; the final ten seconds turn red.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T7 — Rematch

Play several matches in the same room. Confirm settings persist while scores, shot counts, projectiles and player state reset appropriately.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T8 — Lag and server validation

Review delay/jitter tests and invalid/duplicate-message checks. Confirm no repeated visibly unfair kill pattern; record the test conditions and mitigation.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Some tiny lag but honestly, much better than i imagined

### T9 — Friend playtest

Complete at least three matches with a friend on a different network. Record whether the game feels chaotic and fun, which deaths were confusing, and whether players want another round.

- [ ] Pass
- [x] Skip

Comments / evidence / skip reason: Will do that

### T10 — Bullet-hit tolerance tuning

Compare 0, 3 and 8 extra world pixels per side. Confirm slider/number synchronization, invalid-value rejection and reset; inspect the gold outline in diagnostics. In a room, check the host's setting appears on both screens, guests cannot change it, and it locks during countdown/play. Playtest fairness and cover, confirm rematch preservation, and check the combined JSON contains the active value. Record your preferred value; Product-manager review selected 8 px; applying it as the default is carried into Sprint 4.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: 8 pixels works perfectly. Otherwise the user needs to be extremely precise. 

## Exit criteria

Two remote players can complete repeat matches with consistent outcomes. Recurring unacceptable combat disputes must be resolved or addressed by an explicit scope/architecture decision before content expansion.

- [x] I have reviewed every applicable item above; each is passed or explicitly skipped with a reason.
- [x] Remaining issues and carried work are recorded below.
- [x] I accept this sprint's result and approve moving to the next applicable sprint.

Accepted by / date: 10.06.25

## Comments and changes

- October 5 follow-up requested by the product manager: bullets felt too precise. Added 3 px tolerance on every side (14 × 17 px bullet target around the 8 × 11 px body), retaining cover checks, protection and normal stomp/body dimensions. Also added a 350 ms, 16-particle death burst and 100 ms tiny camera shake; reduced-motion preference disables shake. Cosmetic effects follow server-confirmed death positions and do not change respawn timing.
- Follow-up fix: the product manager reported death feedback only appearing for the victim. Each client now queues all confirmed victim deaths at snapshot receipt, independent of local life state, using durable death counters and authoritative positions. Rendering drains the queue once; repeated snapshots do not repeat bursts and skipped events cannot suppress killer feedback. Recheck T5 from both roles.
- October 5 experiment requested by the product manager: added an in-arena pixel HUD for gold/blue kills and remaining time, with a countdown and red final-ten-second timer. Added rotating victim-colored death quips for 1.6 seconds (for example, “GOLD GOT CRUSHED!” and “BLUE IS FLATTENED!”). Both clients derive the same quip from the confirmed death; mutual kills can show two short lines. Practice’s death-effect button previews the joke too. All gameplay rules remain unchanged.
- October 5 tuning request: death feedback now has eight sliders with synchronized number fields, min/max/step descriptions, preview and reset. Settings apply locally during practice or online play. A version 2 JSON bundle exports active movement, dash/boot, dash enabled, death settings, and match duration/bullet margin; online exports use the actual shared rules. The existing version 1 movement importer remains movement-only. No combined importer is claimed.
- Tuning/export verification: generated and parsed the combined JSON in practice (15 movement values, 9 boot/dash values, 8 death values, dash toggle and match metadata). A practice run speed of 100 correctly exported as the shared 150 while online, retaining the local particle setting. Browser sliders and numeric controls synchronized, defaults restored, and the preview returned to the arena. JSON copying is available as a fallback to browser downloads.
- Issue or requested change: 
- Deferred or removed scope and reason: _Write here._
- Carry into the next sprint: Let's carry friend playtest to next sprint
  
## If time runs short

Keep one arena and one boot. Improve combat reliability before presentation. If the current prediction/server replay model produces recurring unfair hits, reassess validation, mechanics or architecture before content expansion.


- October 6 tuning follow-up: added bullet-hit padding as a 0–8 world-pixel slider/number field (default 3) with minimum/maximum effects, reset and a matching gold diagnostics outline. Practice previews the box; the online host sets the authoritative shared value between matches. Guests and active matches cannot change it. The setting persists on rematch, retains solid-cover checks, and the combined JSON exports the active value as `match.bulletHitPaddingPx`.
- October 6 verification: strict type checks, 86 unit tests and production build passed. Two automated clients on the public preview received the same 5 px setting, rejected guest/active-match changes, completed a 30-second match with identical results/death feedback, and preserved tolerance on rematch. Browser review verified slider/number sync, invalid 9 px rejection, reset, and practice/confirmed-online JSON values. The product manager subsequently passed T10 and selected 8 px; independent friend fairness review is carried into Sprint 4.

## Closure review — October 6, 2026

The product manager explicitly approved and closed Sprint 3 in chat. All marked testing and acceptance boxes and original comments above are preserved. The handwritten acceptance date reads `10.06.25`; this closure record uses the current session date, October 6, 2026, without altering that annotation.

- T5: “Pretty smooth” — death feedback accepted; no additional change requested.
- T8: “Some tiny lag but honestly, much better than i imagined” — accepted for this sprint. Monitor corrections and repeatable unfair hits during the deferred friend playtest; no new networking work is implied by this comment.
- T9: “Will do that” and “Let's carry friend playtest to next sprint” — moved to Sprint 4 T8 with the existing three-match brief. No friend test result is claimed.
- T10: “8 pixels works perfectly. Otherwise the user needs to be extremely precise.” — record 8 world pixels per side as the selected bullet-tolerance baseline. The shipped default is still 3; applying 8, updating default descriptions/reset behavior, and checking online consistency are planned Sprint 4 work.

Sprint 3 is closed with this explicit carryover. Sprint 4 has not started.
