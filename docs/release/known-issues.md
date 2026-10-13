# Release scope and known limits — updated October 12

Current polished scope: Toybox, Crossfire and Switchback arenas, 2–4 players, Timed/Stock, shared Scatter/Turbo/Ricochet pickups, horizontal dash, gunboot recoil, full wrap, solo practice, game-contained room/results/rematch UI, instructions, touch buttons, audio and developer tuning.

Recorded follow-ups and submission checks after PM approval:

- Repeated public-tunnel multiplayer tests intermittently disconnected; cause remains unconfirmed. Render match/result/rematch assertions passed, but test-client cleanup after intentional leave triggered SDK reconnection retries and the runner was stopped. Investigate disconnect/cleanup behavior before claiming complete lifecycle verification.

- Permanent Render deployment completed October 13; HTTPS/build agreement and hosted multiplayer assertions passed. Idle cold-start and longer stability review remain pending.
- PM marked supported-browser review passed in Sprint 6; specific browser versions were not recorded. Safari support is not independently claimed.
- PM marked separate-network/friend and deferred three/four-player checks passed in Sprint 6, then approved the sprint October 13. Preserve those human results separately from automated evidence.
- PM approved Sprints 5/6 globally; existing detailed power-up/impact review selections remain preserved. No unchecked individual box is silently marked passed.
- Work-mode/mission evidence and user-supplied shooting audio provenance review.

Accepted architecture limits: rooms/results live in memory; restarts lose them and invitations expire. No match reconnection/resume, accounts, global matchmaking, bots or persistent scores. `/dev` is public and unauthenticated but cannot privately override online simulation. Touch controls exist; full phone support is unverified. Simulated SDK clients are not human browser/device playtests.

Authorized polish now includes the revised result reveal, closed-menu in-game notices and two additional arenas. PM acceptance and layout balance are recorded in the polish backlog. Random obstacles remain deferred. Freeze features after the arena review, then resolve release blockers during Sprint 6.

Render Free sleeps after 15 idle minutes, with about a minute to wake up; quotas may affect availability. The PM chose free hosting; prompt availability throughout judging remains unproven.

October 13: PM approved and closed Sprints 5/6. This document records remaining technical observations and hosting limits rather than reopening sprint acceptance. Submission evidence/credits and judging availability are handled in Sprint 7.
