# Sprint 7 — Submit and preserve buffer

**Target dates:** October 28, 2026; contingency October 29–30

**Status:** Submitted and closed — PM confirmed project submission and completion on October 13, 2026.

[All sprints](README.md) · [Product plan](../product-plan.md)

## Goal

Submit the completed entry, verify receipt and keep the judged build available.

## Dependencies

Sprint 6 release accepted; mission submission requirements available.

## Planned work

- The user submits Boot Loop through the Handshake Create a Multiplayer Game mission with the required title, cover image, description and public URL.
- Verify that the submitted project link points to the intended public release and requires no login or installation for players.
- Record submission confirmation, date/time and a screenshot or receipt if the mission provides one.
- Keep the hosting service available through judging; record the hosting owner and availability plan.
- Use October 29–30 for necessary corrections only. If a correction changes gameplay or deployment, retest the affected behavior and verify the submitted link still works.
- Preserve the accepted build, submitted materials and known limitations for reference.
- Do not automatically submit, purchase hosting or publish external changes merely because this sprint checklist exists.

## Handoff for review

At delivery, the assistant fills in the information below so each test is reproducible. This is not a claim that anything is delivered yet.

- Build / revision: _Pending._
- Demo or public URL: _Pending; not applicable to a planning-only sprint._
- How to run and reach the feature: _Pending._
- Automated check results, if applicable: _Pending._
- Known limitations and carried work: _Pending._

## How to use this checklist

These are standard Markdown task-list checkboxes: change `[ ]` to `[x]` to mark one. For each review item, mark **Pass** or **Skip**, and leave a comment or skip reason. A failed or untested item stays unchecked with notes about what remains. Do not mark both options.

Testing and final acceptance boxes belong to the product manager; the assistant leaves them unchecked. A skip records your scope decision and does not claim that a test passed. Skipping a contest-related review cannot change the organizer's requirements. Feel approvals must be explicit; skipping their review requires an explicit decision to change that gate.

## Testing and review checklist

### T1 — Submitted entry

Inspect the actual Handshake submission and confirm every required field is present and accurate.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T2 — Submitted link

Open the exact submitted URL in a fresh browser. Try practice and a two-player match from that link.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T3 — Receipt and deadline

Confirm Handshake shows the entry as submitted/received. Record the confirmation and submission time against the conservative October 30, 11:59 PM Pacific deadline.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T4 — Judging availability

Confirm hosting will continue through the judging period and the submitted URL remains stable.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T5 — Correction review

If anything changed after acceptance, verify the affected behavior and submission fields. Otherwise mark this check skipped with 'No post-acceptance changes'.

- [ ] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

## Exit criteria

Entry receipt is verified, the exact submitted URL works, and judging availability is arranged. Preparing materials alone does not complete this sprint.

- [ ] I have reviewed every applicable item above; each is passed or explicitly skipped with a reason.
- [ ] Remaining issues and carried work are recorded below.
- [ ] I accept this sprint's result and approve moving to the next applicable sprint.

Accepted by / date: Product manager — explicit submission/completion confirmation, October 13, 2026.

## Comments and changes

- Issue or requested change: _Write here._
- Deferred or removed scope and reason: _Write here._
- Carry into the next sprint: _Write here._

## If time runs short

Make only necessary corrections in the buffer. Do not start new gameplay features before the deadline.


October 11 PM steering: deployment is deferred while authorized polish continues. Complete final Sprint 6 public/browser/friend verification and Sprint 7 submission only after the final polished game is online. Do not reuse earlier release evidence as verification of a later changed build.

## Handoff from approved Sprints 5/6 — October 13

- Permanent game: https://boot-loop.onrender.com/ ; dev controls: https://boot-loop.onrender.com/dev .
- Accepted deployed build: `91171c0545d84dc8`; Render source commit `51d2ce08ec5d59fceb418ad5657a1a70caa1895c`.
- Submission title, cover and description: docs/release/submission.md. Final mission/evidence and asset-credit review still belong to the PM; no entry has been submitted.
- Carry documented hosting cold-start/in-memory-room limits and unresolved SDK leave/cleanup observations; sprint approval is not a technical fix. Keep the judged game stable and make corrections only when needed.
- User's checked browser, failure-handling, separate-network and deferred multiplayer reviews remain recorded in Sprint 6. No per-item test result is inferred solely from blanket sprint approval.

## Submission confirmed by PM — October 13

The product manager reported: “project submitted, we're done.” Record this as PM-reported submission and completion; no receipt, exact submission timestamp or submitted-field snapshot was independently inspected. Existing detailed checkboxes are preserved rather than populated with invented verification.

Live game: https://boot-loop.onrender.com/ . Render Free hosting remains running with manual deploys. Do not shut down the service or change the judged build. Cover variants and generation prompts are preserved in docs/release. This closes the active project work; no automation or further feature work is started.
