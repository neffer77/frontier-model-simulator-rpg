# Phase 4D.7 — SLOs, Error Budgets, Paging Fatigue & Game Days

## Goal
Turn operational reliability into a persistent planning resource rather than a binary outage state.

## Implemented

- Per-component SLO targets for training runtime, checkpoints, tokenizer, data, evals, and serving.
- 30-day-style error budgets with incident-driven budget burn.
- Error-budget stress surfaced in the company UI.
- Escalation-policy presets: Conservative, Balanced, and Quiet.
- Policy tradeoffs between detection speed and paging noise.
- Paging fatigue accumulated by primary/secondary responders.
- Fatigue reduces effective future coverage and increases workload.
- Recovery days reduce responder fatigue.
- Component-specific game-day drills.
- Drill results create persistent response-quality bonuses for the practiced failure mode.
- Game-day costs and calendar time.
- Operational incident hooks that create paging fatigue and consume error budget after resolution.
- Responsive browser/mobile dashboard.
- Scriptable WebView integration.

## Intended gameplay loop

1. Set realistic reliability objectives rather than maximizing every SLO.
2. Choose an escalation policy that matches the service risk.
3. Respond to operational incidents and watch the relevant error budget burn.
4. Avoid exhausting the same on-call engineers with noisy alerts.
5. Schedule recovery time or rotate staffing when fatigue becomes dangerous.
6. Run targeted game days before risky launches or platform migrations.
7. Use accumulated operational evidence to decide whether to ship, pause, migrate, or invest in reliability.

## Next

Phase 4D.8 should add release freezes driven by exhausted error budgets, reliability investment proposals, SLO negotiation between product/research/infrastructure NPCs, customer-impact/revenue consequences, and quarterly reliability reviews that compare model families and shared platforms.