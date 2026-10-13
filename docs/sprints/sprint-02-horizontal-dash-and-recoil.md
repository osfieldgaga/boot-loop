# Sprint 2 — Horizontal dash and recoil

**Target dates:** October 10–11, 2026

**Status:** Accepted by the product manager October 5, 2026; exit criteria marked by the product manager. Recoil and dash + jump refinements are deferred to the [polish backlog](../polish-backlog.md).

[All sprints](README.md) · [Product plan](../product-plan.md)

## Goal

Prove that horizontal dash and gunboot recoil are controllable and leave opportunities to attack.

## Dependencies

Sprint 1 movement feel explicitly approved. Weekend product-manager review should be short; reduce scope if it cannot fit.

## Planned work

- Dash: double tap left or right, Shoot: same as jump button when airborne, becomes jump again when landed. shooting follows the philosphy of Downwell, and this is to have the simplest controls, assuminig a mobile port later
- Add a feature-flagged left/right dash. Use held horizontal direction or facing when neither direction is held; normalize diagonal input to horizontal movement only.
- Implement one dash charge, cooldown, fixed horizontal dash velocity, disabled gravity during the dash and deliberate post-dash velocity behavior.
- Refill dash on ground contact. Provide a refill hook for stomps; real combat validation of that hook belongs in Sprint 3.
- Disable shooting while dashing. Resolve the proposed no-stomp-during-dash rule before Sprint 3 implements dash/combat interaction.
- Prototype one shared boot with airborne firing, finite ammo, cooldown, downward projectile visuals and non-stacking recoil.
- Refill ammo on ground contact and provide the stomp refill hook. No boot pickups or alternative boots.
- Expose a small set of dash/boot tuning constants and keep online configuration changes out of this offline experiment.
- Measure full-magazine vertical travel in an unwrapped test scenario and try repeated platform-assisted movement. Record whether ammo expenditure creates vulnerable moments.

## Handoff for review

Delivered offline dash / boot lab using the approved Heavy2 snappier movement baseline.

- Build / revision: Sprint 2 lab, October 5, 2026. Dependency versions unchanged.
- Demo: **[Open the public Sprint 2 lab](https://internal-copy-perspectives-growing.trycloudflare.com/)** or **[open locally](http://localhost:3000/)**. Both serve the same build. The public tunnel depends on this laptop remaining online; permanent hosting is pending.
- Run: `nvm use`, `npm run build`, `npm start`. Existing running server serves rebuilt client files; reload the page. Full instructions: [README](../../README.md).
- Controls: A/D or arrows move; double-tap the same direction within 220 ms to dash. Space/Z jumps on the ground and within remaining coyote grace, then a fresh airborne press fires downward. Hold for jump height; holding does not autofire. R resets player, ammo, dash, accepted-shot counter and bullets.
- Important control tradeoff: airborne shot presses do not also buffer a landing jump. JUMP_BUFFER remains in the movement system but has no effect on shot presses in this lab. A press on the exact landing tick may be rejected; press again after landing to jump. Test this simplicity tradeoff during review.
- Default dash: 240 px/s, 0.15 s, 160 px/s exit speed, 0.2 s between starts, one charge. Ground contact refills; cooldown persists. Walls end a dash. No shooting or stomp attack during dash; a future accepted stomp can refill resources.
- Shared boot: four shots, upward recoil set toward 120 px/s without adding impulses, 0.16 s shot cooldown, one downward bullet per accepted shot, 300 px/s, 0.5 s lifetime. Bullets wrap, collide with tiles and expire. Rejected actions do not spend ammo or increment the shot count. All players will share this boot in the MVP.
- Review tools: **Dash and boot tuning** exposes an enabled switch and editable bounds/units/explanations. **Movement tuning** retains Heavy2 comparison and movement-only import/export. Dash / boot adjustments are local to this visit and are not included in the movement export.
- Automated evidence: strict type checks, 56 simulation/input/clock/ability tests, production build, and reproducible [mobility measurements](../measurements/sprint-02-mobility.md). Public connection proof still compares the Sprint 1 baseline movement; dash and shots are local at this stage.
- Browser evidence: double-tapping D moved the player from x=56 to x=99 including the post-dash coast; dash off/on changed the visible status. Ground jump followed by an airborne press produced one accepted shot and reduced ammo to 3/4. Public server connection and baseline shared agreement displayed.
- Mobility: recoil-only peak rise from rest is 3 px in the tested firing search. A held jump plus four peak-timed shots reached 60 px versus 57 px without shooting, but airtime increased from 0.583 s to 1.133 s. This nearly doubles airtime and needs opponent assessment. A 60-second platform-assisted script produced 137 accepted shots and 36 refills.
- Known limitations: no synchronized players, damage, kills, real stomp validation or final art. The refill and no-stomp-during-dash hooks are prepared; real combat tests belong in Sprint 3. No claim of multiplayer balance is made.

## How to use this checklist

These are standard Markdown task-list checkboxes: change `[ ]` to `[x]` to mark one. For each review item, mark **Pass** or **Skip**, and leave a comment or skip reason. A failed or untested item stays unchecked with notes about what remains. Do not mark both options.

Testing and final acceptance boxes belong to the product manager; the assistant leaves them unchecked. A skip records your scope decision and does not claim that a test passed. Skipping a contest-related review cannot change the organizer's requirements. Feel approvals must be explicit; skipping their review requires an explicit decision to change that gate.

## Testing and review checklist

### T1 — Horizontal direction

Double-tap left and right. Hold up/down while double-tapping and release movement after the second tap. Confirm every dash remains horizontal and follows the tapped direction. Facing fallback for a neutral internal dash request is covered by automated checks; this build has no separate neutral dash button.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T2 — Charge and cooldown

Spend the charge in the air, try to dash again, land and dash again. Confirm the recharge and cooldown rules.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Dash should only recharge with landing. 

### T3 — Dash through wrap

Dash across both horizontal seams and near platforms. Confirm normal wrapping and no embedding in tiles.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: _Write here._

### T4 — Shooting and recoil

Fire airborne, grounded, while dashing and with empty ammo. Confirm valid shots consume ammo, invalid shots do not fire, and repeated recoil does not stack uncontrollably.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Pass but recoil could feel faster or snappier

### T5 — Mobility assessment

Use a full magazine and repeated platform refills. Review measured travel and record whether escape remains too easy. Real opponent assessment follows in Sprint 3.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Pass except for comment in T2 regarding reloading dashes on landing

### T6 — Explicit dash approval

Play with dash enabled and disabled. Explicitly approve its feel and record the chosen tuning/feature-flag state.

- [x] Pass
- [ ] Skip

Comments / evidence / skip reason: Passes here, but real feel will be measured later with an actual opponent
## Exit criteria

Dash feel is explicitly approved; one boot's ammo/recoil behavior is understandable; no uncontrolled movement exploit remains. Stomp-refill combat checks are carried explicitly into Sprint 3.

- [x] I have reviewed every applicable item above; each is passed or explicitly skipped with a reason.
- [x] Remaining issues and carried work are recorded below.
- [x] I accept this sprint's result and approve moving to the next applicable sprint.

Accepted by / date: 10/05/26

## Comments and changes

- Issue or requested change: Dash + jump should be possible for players who develop the skills for it. Dashing does not allow jumping, I think it makes sense to have the opportunity to jump slightly farther when dashing, and it just makes logical sense from a physics point of view

- Deferred or removed scope and reason: Snappier recoil and a skill-based dash + jump combination are deferred to polish, as requested by the product manager. Exact feedback and review checklists: [polish backlog](../polish-backlog.md).
- Carry into the next sprint: real stomp validation/refill, player-hit validation, online authoritative shot/ammo handling, public permanent hosting, and escape/counterplay assessment. Sprint 2 approval is recorded; evaluate real feel and escape/counterplay with opponents in Sprint 3.

## If time runs short

Keep one boot. Use simple bullet rectangles and reuse the debug controls. If dash hurts the game, record a scope decision rather than adding counter-mechanics.

