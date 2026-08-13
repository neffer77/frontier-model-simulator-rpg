# Phase 5 — Integration, Balance, UX Polish, Testing & Fact-Check Pass

Phase 5 turns the accumulated simulation systems into a more coherent playable product.

## Integrated command center

A new command center summarizes company health across execution, trust, security, safety, resilience, people, and strategy. It highlights the three weakest dimensions so the player has an immediate answer to “what should I care about next?”

The command center also provides direct navigation to the major company systems and flags missing runtime entry points.

## Runtime integration audit

The Phase 5 command center performs lightweight runtime checks for core functions and major system entry points. Missing navigation hooks are surfaced in-game rather than silently failing.

This is intentionally a sanity layer rather than a substitute for full browser automation or unit tests.

## Browser integration gap

Phase 4D.34 introduced `integrated-simulation.js` and `integrated-simulation.css`, but browser `index.html` wiring was not committed because the GitHub connector blocked the large replacement. Phase 5 attempts to close that gap by wiring both the integrated simulation and Phase 5 command-center assets into the browser shell.

If that replacement remains blocked by the connector, the remaining browser-shell edit is mechanical: add the two CSS links before `</head>` and the two JS scripts before `</body>`.

## Scriptable integration

The Scriptable launcher now targets the Phase 5 branch and explicitly includes both the integrated-simulation and Phase 5 command-center assets. Its loader also injects any listed assets that are absent from `index.html`, making Scriptable more resilient to browser-shell wiring drift.

## Balance philosophy

Phase 5 preserves tradeoffs rather than introducing broad buffs. Strong security, safety, controls, resilience, and governance should improve institutional durability while consuming cash, attention, or execution speed. Aggressive growth or competitive responses should create upside while increasing exposure elsewhere.

The command center does not change those systems; it makes their combined state legible.

## Fact-check posture

The simulator uses fictional companies, rivals, jurisdictions, and scenarios where current policy or market facts could become stale. Technical concepts such as safety evaluations, red teaming, staged investment, incident response, SLOs, portfolio governance, and organizational risk are represented as educational abstractions rather than claims that a specific real company operates this way.

A future external-source fact-check can tune terminology and numerical balance without requiring the game to hard-code fast-changing real-world rules.

## Verification checklist

- Browser loads all Phase 4D modules through the executive endgame.
- Integrated simulation is wired in browser or explicitly listed as a known shell edit.
- Scriptable loads all assets including Phase 4D.34 and Phase 5.
- Command center renders without replacing existing game state.
- Runtime audit surfaces missing system navigation entry points.
- Health score remains bounded to 0–100.
- Mobile layout collapses the command-center grids.
- Existing saves gain Phase 5 state lazily and remain compatible.

## Completion

After this phase, the simulator is feature-complete for the current v1 roadmap. Follow-up work should be driven by playtesting evidence: broken flows, balance exploits, confusing navigation, pacing, visual feedback, and learning effectiveness.