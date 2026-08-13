# Phase 4D.34 — Integrated Company Simulation, Emergent Event Chains, Final Scorecards & Replayable Endgame Scenarios

Phase 4D.34 turns the accumulated company systems into one integrated simulation layer.

## Integrated scorecard

The simulator now computes a company-wide score across seven dimensions:

- research
- execution
- people
- trust
- resilience
- safety
- strategy

The overall score is difficulty-adjusted by the selected replay scenario and receives an S/A/B/C/D/F grade.

## Emergent event chains

Cross-system conditions can now generate weighted emergent events. Competitive pressure can create capability-race events, regulatory pressure can trigger inquiries, privileged-access risk can create insider warning signals, weak controls can compound enterprise risk, safety residual risk can surface late eval findings, and low public trust can produce narrative spirals.

These are conditional on the state of the company rather than uniformly random events.

Events can also create follow-up pressure in adjacent systems, making existing mechanics interact rather than remain isolated dashboards.

## Replayable scenarios

Five scenario presets provide different starting pressure:

- Balanced Frontier Lab
- Capability Race
- Capital Squeeze
- Regulatory Scrutiny
- Resilience Test

Each scenario modifies company conditions and applies a difficulty multiplier to the final integrated score.

## Deterministic replay seeds

Each run receives a replay seed. The emergent event picker uses the saved seed, so comparable company states can reproduce the same event sequence. A new seed can be generated for a fresh run.

## Final score history

Players can record a final run score. Completed runs preserve the scenario, seed, scorecard, overall grade, day, and any executive-endgame outcome for comparison across replays.

## Cross-system integration

The integrated layer reads from research/model performance, competitive intelligence, program learning, execution capacity, employee health, public/customer/government trust, operational resilience, security governance, enterprise risk, AI safety governance, platform power, and executive legacy.

This makes the final score reward a durable institution rather than optimizing a single metric.

## Platform integration

Scriptable explicitly loads the new integrated simulation module and stylesheet. The browser module files are present on the branch. The direct `index.html` wiring change may need to be applied during the Phase 5 integration pass if GitHub rejects the large index replacement through the connector.

## Next

Phase 5 is the final integration, balancing, UX/graphics, test, fact-check, and gameplay-polish pass.