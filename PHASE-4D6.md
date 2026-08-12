# Phase 4D.6 — Organizational Ownership & Operational Incidents

This phase connects architecture ownership, maintenance economics, and shared dependencies to live operational consequences.

## Goals

- Make on-call coverage and staffing decisions affect outage risk.
- Give shared runtime/checkpoint/tokenizer/data/eval/serving components explicit operational ownership.
- Model blast radius when one shared component affects multiple model families.
- Let players assign primary, secondary, and incident-commander roles.
- Make workload reduce effective coverage and increase recovery risk.
- Add operational incident mitigation choices: isolate, rollback, fail over, escalate, resolve.
- Feed operational incidents into workload, leadership experience, and organizational postmortems.

## Operational model

Each shared component has a rotation. Coverage is derived from the presence of primary/secondary responders and their workload. Low coverage and maintenance reliability drag increase modeled outage risk.

Operational incidents record severity, affected families, assigned responders, mitigation history, elapsed time, and final recovery quality. Shared-component blast radius makes central platforms valuable but dangerous.

## Initial incident catalog

- training runtime outage
- checkpoint recovery/corruption incident
- tokenizer contract mismatch
- data-pipeline degradation
- evaluation platform outage
- serving scheduler outage

## Career and organization effects

Responders gain workload during incidents. Incident commanders can gain incident-leadership experience where the career system supports it. Resolved incidents generate operational postmortem records with coverage and blast-radius contributing factors.

## Next

Phase 4D.7 should add multi-stage escalation policies, incident paging fatigue, follow-the-sun rotations, service-level objectives/error budgets, operational drills/game-days, and reliability investment choices that compete directly with frontier-model research budgets.
