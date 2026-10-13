# Sprint 1 — Movement foundation

**Target dates:** October 6–9, 2026

**Status:** Accepted by the product manager October 5, 2026. Explicit movement approval and permission to begin Sprint 2 recorded in chat. Existing review annotations and checkbox states are preserved.

[All sprints](README.md) · [Product plan](../product-plan.md)

## Goal

Deliver a responsive offline movement playground and prove that the client can reach a publicly hosted server.

## Dependencies

MVP scope is established. Resolve any mission requirement that would invalidate the chosen build approach before implementation.

## Planned work

- Set up the client, server and shared TypeScript packages, strict checking, shared simulation tests and exact dependency pins after compatibility verification.
- Configure a 320×192 logical canvas, integer scaling, nearest-neighbor rendering and a renderer abstraction that starts with colored rectangles.
- Build one 40×24 ASCII arena with solid/empty tiles, empty two-tile borders, valid spawn locations and no player-trapping geometry.
- Implement a pure fixed-60-Hz movement update with horizontal acceleration/deceleration, gravity, falling limits, pixel-step tile collision and subpixel remainders.
- Implement jump buffering, coyote time, variable jump height and horizontal jump boost. Evaluate corner correction and ledge stepping without delaying basic feel approval.
- Implement wrapping on both axes, wrapped math and seam copies/cues. Keep movement and rendering separate.
- Add essential debug information and local tuning for movement constants. Capture approved tuning values as a reproducible configuration.
- Handle held/pressed inputs, browser key defaults, focus loss, visibility changes and accumulated-time limits.
- Deploy an early connection proof: the hosted client opens and connects to the server. No online combat is required yet.

## Handoff for review

Delivered movement playground: run/jump, coyote/buffer/variable height, corner
correction, tile collision, two-axis wrap, seam copies/cues, local tuning with
preset import/export, diagnostics, input/focus handling and a Colyseus connection proof.

- Build / revision: Sprint 1 / 0.1.0, October 5, 2026; exact dependency lockfile saved. This folder is not an initialized Git repository.
- Local demo: [Open the local preview](http://localhost:3000/) while the preview server is running.
- Temporary public demo: [Open the public preview](https://internal-copy-perspectives-growing.trycloudflare.com)
- How to run: From the workspace, use `nvm use`, `npm run build`, then `npm start`. For a fresh install, run `npm ci` first. Open the local URL. Full instructions: [README](../../README.md).
- Controls: A/D or left/right arrows; Space/Z to jump; R to reset. Open Movement tuning to adjust constants or Movement diagnostics/backtick for hitboxes and telemetry.
- Automated evidence: strict type checks, 37 simulation/input/clock tests, and production build passed. Local and public HTTP/Colyseus/WebSocket checks passed, including shared scripted simulation agreement.
- Browser evidence: preview loaded, server connection and shared agreement displayed; keyboard jump/reset observed; changing MAX_RUN to 110 visibly updated the active simulation constants and restoring defaults returned it to 90. A 320×192 canvas displayed at 640×384 at a desktop breakpoint.
- Known limitations: public URL is a temporary tunnel to this laptop and stops if the laptop/server/tunnel stops. Permanent hosted deployment is still pending. No synchronized remote players, dash, ammunition, combat or final art yet.
- Review scope: these technical results do not tick your Pass/Skip boxes or approve movement feel. Separate-device, supported-browser and high-DPI review remain for you.

## How to use this checklist

These are standard Markdown task-list checkboxes: change `[ ]` to `[x]` to mark one. For each review item, mark **Pass** or **Skip**, and leave a comment or skip reason. A failed or untested item stays unchecked with notes about what remains. Do not mark both options.

Testing and final acceptance boxes belong to the product manager; the assistant leaves them unchecked. A skip records your scope decision and does not claim that a test passed. Skipping a contest-related review cannot change the organizer's requirements. Feel approvals must be explicit; skipping their review requires an explicit decision to change that gate.

## Testing and review checklist

### T1 — Startup and public connection

Follow the handoff instructions from a fresh launch. **[Open the public preview](https://internal-copy-perspectives-growing.trycloudflare.com)** on another device and confirm **Server connected**. On this laptop, use **[the local preview](http://localhost:3000/)**.

The previous public link expired. This replacement was verified October 5; it works while the laptop, server, and tunnel stay running. If it stops opening, leave T1 unchecked and report it. Permanent hosting remains pending.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T2 — Movement feel

Run, reverse direction and stop on the ground and in the air. Confirm responsive control without sticky movement.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: Have2 and heave2 snappy are good to go

The playground now starts with **Heavy2 snappier**, based on your preferred Heavy2 preset. Open Movement tuning to compare **Heavy2 original** and **Heavy2 snappier**. The candidate reduces jump hold from 0.20 to 0.15 seconds and peak-float threshold from 60 to 20 px/s; your original files are preserved in `tuning/`. Details: [preset notes](../../tuning/README.md). Heavy2 and Heavy2 snappier were approved by the product manager; Heavy2 snappier is the current playground baseline.

### T3 — Jump controls

Compare a tap with a held jump. Jump just after leaving a ledge and press jump just before landing. Confirm the expected coyote/buffer behavior.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Pass for now, i will work on jump later on to make it exactly like what i have in mind

### T4 — Tile collision

Land on platforms, run into their sides and hit ceilings. Check that the player does not tunnel, become embedded or remain stuck.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T5 — Wrap and seam readability

Cross each edge and a corner. Confirm preserved motion, no visible disappearance, and no false tile collision at a seam.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T6 — Display and input robustness

Resize the window, try a high-DPI display if available, switch tabs and release keys outside the game. Confirm crisp rendering and no stuck keys or catch-up burst.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T7 — Simulation evidence

Review reported automated checks for collision, jump timing, wrapped distance and repeated scripted inputs. Record any failure that affects the demo.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T8 — Explicit movement approval

Play the arena and explicitly approve the movement feel. A technical pass alone does not satisfy this gate.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Movement was tuned by myself, ok to proceed

## Exit criteria

The playground runs locally and publicly, required checks are passed or explicitly skipped by the product manager, and the product manager explicitly approves movement feel before Sprint 2.

- [x] I have reviewed every applicable item above; each is passed or explicitly skipped with a reason.
- [ ] Remaining issues and carried work are recorded below.
- [x] I accept this sprint's result and approve moving to the next applicable sprint.

Accepted by / date: Product manager, October 5, 2026 — “just checked sprint 1, i’m ok with it. We can go on with sprint 2”.

## Comments and changes

- Issue or requested change: _Write here._
- Deferred or removed scope and reason: _Write here._
- Carry into the next sprint: Movement tuning selected by the product manager; permanent hosting configuration. Movement-feel approval received October 5; Sprint 2 authorized. Further jump refinement remains a later product-manager tuning request.

## If time runs short

Reduce the tuning UI and debug presentation first. Corner/ledge refinements may be deferred if the basic movement is good; record the deviation. Keep full wrap and seam readability.
