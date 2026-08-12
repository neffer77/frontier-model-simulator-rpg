# Phase 4D.5 — Family Maintenance Economics & Dependency Graphs

## Goal

Make architecture portfolios costly to operate, not just costly to build. A family now consumes ongoing maintenance budget, engineering attention, shared platform capacity, and migration work as the infrastructure beneath it changes.

## Implemented

- Per-family annual maintenance budgets and modeled required spend.
- Funding ratios that translate underfunding into reliability drag and on-call burden.
- NPC architecture ownership for each model family.
- Shared-component dependency graph for training runtime, checkpoints, tokenizer, data, evals, and serving.
- Blast-radius summaries showing how many active model families depend on each shared component.
- Forced platform-change events with explicit migration deadlines.
- Platform migrations whose cost and calendar time scale with architecture migration friction.
- Late migrations that cost more and increase lineage lock-in / deadline risk.
- EOL families are removed from active migration obligations while preserving history.
- Monthly maintenance funding cycle that consumes cash and adds owner workload.
- Browser/mobile UI and Scriptable WebView support.

## Core gameplay loop

1. Operate multiple model families.
2. Allocate enough maintenance budget to the families worth keeping alive.
3. Assign senior NPCs to architecture ownership.
4. Watch shared dependencies create organizational blast radius.
5. Respond to CUDA, checkpoint, tokenizer, provenance, eval-schema, and serving API changes.
6. Migrate important families before deadlines.
7. Deprecate or EOL families whose maintenance burden no longer justifies their value.

## Important design rule

Missed migration deadlines escalate once per simulated day, not once per UI render. `maintenance-deadline-guard.js` prevents screen navigation from changing game economics.

## Next slice

Phase 4D.6 should connect these economics directly to strategic portfolio value: model-family revenue / research value, SLOs and customer dependencies, explicit sunset plans, shared-component incidents with cross-family blast radius, and architecture-owner performance / succession decisions.
