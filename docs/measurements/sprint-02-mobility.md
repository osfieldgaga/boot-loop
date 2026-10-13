# Sprint 2 mobility check — October 5, 2026

Reproduce with `npm run test:mobility`. This uses the Heavy2 snappier preset, a four-shot boot, recoil 120 px/s, shot cooldown 0.16 s, and dash 240 px/s for 0.15 s. Changing tuning invalidates these measurements.

## Empty arena, unwrapped vertical travel

The arena has no platforms or refills. Signed travel is accumulated across wrap seams, so a screen wrap is not mistaken for altitude gain. Fixed timestep: 1/60 second. Results are logical pixels.

| Scenario | Maximum rise | Other result |
| --- | --- | --- |
| Rest, fire at the first valid opportunity, jump released | 3 px | Four shots consumed by 0.517 s; then fall reaches 350 px/s. |
| Rest, fire at the first valid opportunity, jump held | 3 px | Same finite-ammo result. |
| Rest, all shoot/hold choices searched through 2 seconds, no dash/refills | 3 px | Search merges equivalent velocity, subpixel remainder, ammo and cooldown states, preserving the highest travel. This is a bounded search, not a claim about every starting velocity or tuning. |
| Fully held jump, no shots | 57 px | Returns to launch height at 0.583 s. |
| Fully held jump, four shots when falling and cooldown permits | 60 px | Returns to launch height at 1.133 s. |

The boot adds little height with this heavy gravity, but almost doubles airtime in the tested held-jump scenario. That is a real mobility advantage; low altitude gain alone does not prove balanced escape. Finite ammo creates a period without firing until landing, and dash blocks shots for its full duration. Opponent pressure and counterplay must be evaluated in Sprint 3.

An unobstructed default dash travels 36 px over nine ticks, then keeps 160 px/s horizontally. Gravity resumes on the next tick; blocked dashes stop without an exit-speed kick.

## Repeated platform-assisted script

A deterministic 60-second arena run alternates movement, jump/shoot presses, and dash requests. It produced 146 accepted shots and 40 ammo refills without invalid resource counts or non-finite positions. The script proves repeated refills and local movement can coexist; it is not a human escape or combat test.

## Limits and next review

- No player hits, deaths, stomp collision, online synchronization or scoring in Sprint 2.
- The accepted-stomp refill hook is tested as a resource operation; combat authorization comes in Sprint 3.
- Faster-rise velocity is preserved by recoil rather than increased. Repeated shots never add impulses together.
- Ammo and dash refill together only on an airborne-to-ground landing. Standing or dashing along the ground cannot replenish the charge; the persistent cooldown still applies after landing. Updated after the product manager’s T2 feedback.
- Controls use fresh airborne presses for shots, so there is no automatic firing on held jump and no landing-jump buffer from a shot press.
- Product-manager dash and boot feel approval is pending. Keep the on/off switch available if dash hurts the game.
