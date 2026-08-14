# Item 9 — Simulation Balance + Pacing

## Goal
Create one canonical, testable economy where technical progress, company scale, compute, time, incidents, and technical debt create meaningful tradeoffs instead of independent counters.

## Resource loop

### Compute progression
The model-training physics consumes simulated H100-hours, so company-scale systems must replenish the same `state.compute` pool.

- Seed round: +20,000 H100h
- Series A: +120,000 H100h
- Frontier growth round: +650,000 H100h
- Strategic compute round: +3,200,000 H100h
- Infrastructure level 2: +15,000 H100h
- Infrastructure level 3: +100,000 H100h
- Infrastructure level 4: +600,000 H100h
- Infrastructure level 5: +3,000,000 H100h
- Infrastructure level 6: +7,000,000 H100h
- Quarterly compute allocation: 45,000 H100h per $1M before infrastructure-efficiency scaling
- GPU supply deal: +400,000 H100h
- Cloud strategic partnership: +125,000 H100h

Funding grants are idempotent. Infrastructure/capex/deal grants are recorded so a reload cannot award them twice.

### Funding pacing
The seed milestone moves to reputation 2 so shipping the first small model stabilizes the company rather than forcing the player to finish the guided campaign with an immediate cash cliff.

Funding eligibility also uses **scale-weighted credibility**. The first completed run at a model tier contributes its full reputation toward fundraising, the second contributes 35%, and later repeats contribute 10%. Non-model reputation still counts normally. This prevents repeatedly training the cheapest tier from farming Series A/growth funding while preserving repeated experiments for technical learning and the public model-race score.

A natural unique-scale path — small model → 1.3B → 7B → larger tiers — therefore unlocks capital substantially faster than repeating the same cheap run.

### Operating burn
Time now has a real cash consequence. Each simulated day accrues a fraction of monthly operating burn based on:

- baseline lab operations
- effective headcount
- infrastructure scale
- enterprise contract load
- debt service

This makes delays, repeated mistakes, hiring, infrastructure, and financing interact with runway.

## Incident pacing
The guided first incident remains guaranteed. After incidents are solved:

- ordinary/debt incidents receive a 5-day cooldown
- a single run is capped at two resolved incidents

This keeps failures educational and consequential rather than turning long runs into repeated interruption spam.

## Technical-debt tradeoff
`Accept risk` no longer eliminates technical-debt consequences. Accepted debt carries 65% of normal incident/cost/observability pressure and continues aging at a slower rate. Paying debt down therefore has a real advantage while acceptance remains a legitimate short-term schedule tradeoff.

## Player-facing tempo
The responsive gameplay shell now shows a compact `LAB TEMPO` strip with:

- estimated cash runway
- monthly operating burn
- available H100-hours
- resource requirement for the next model tier
- open and accepted technical debt
- incidents resolved

The intent is to expose the tradeoffs needed for a decision without forcing the player into finance/debug dashboards every turn.

## Playtest telemetry
`balanceReport()` returns a local playthrough snapshot including resources, raw reputation, scale-weighted funding reputation, milestone days, target/fast/slow pacing classification, campaign stage, debt counts, and action statistics.

Initial target windows are intentionally broad and are calibration targets rather than win conditions:

| Milestone | Target simulated day |
| --- | --- |
| First model | 18–50 |
| First deliberate hire | 20–58 |
| Early-game graduation | 22–65 |

These ranges should be tightened only after multiple complete playthroughs.

## Automated QA
`tests/balance-pacing.mjs` verifies:

- seed funding adds compute exactly once
- repeated cheapest-tier models cannot farm later funding eligibility
- infrastructure expansion grants usable compute
- quarterly compute investment changes the real compute pool
- simulated time consumes operating cash
- accepted technical debt retains reduced consequences
- incident cooldown/cap prevents incident spam without stopping training progress
- no uncaught browser runtime errors occur

The cross-device smoke test also requires the `LAB TEMPO` strip and a valid balance telemetry report on both mobile and desktop.
