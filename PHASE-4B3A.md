# Phase 4B.3A — Incident History + Postmortems

This phase makes incidents permanent organizational artifacts rather than transient gameplay events.

## Implemented

- Persistent incident records linked to models when possible.
- Investigation timeline capture for workstation tools, terminal commands, NPC consultations, evidence sharing, and final production actions.
- Persistent NPC participation records and belief-history snapshots.
- Incident grades across technical correctness, diagnostic efficiency, evidence quality, and team coordination.
- Generated postmortems with root cause, contributing factors, what went well, what went poorly, team participation, and simulated impact.
- Corrective action generation with owners, priority, engineering-day estimates, and reliability effects.
- Corrective-action completion and employee memory updates.
- Dedicated Postmortems screen.
- Model Lab history extension showing incidents linked to each model.
- Browser/mobile and Scriptable WebView integration.

## Design principles

- Being correct is not enough; the investigation process is preserved.
- NPCs receive credit for participation and evidence-driven updating, not merely first guesses.
- Postmortems are generated from actual actions taken during the incident.
- Corrective actions are persistent game objects so later phases can alter detection and recurrence risk.

## Next PR

Phase 4B.3B should build the Organizational Knowledge system on these records:

- knowledge entries derived from incidents and experiments
- provenance and confidence levels
- related-knowledge retrieval during future incidents
- institutional standards
- stale/superseded knowledge
- corrective actions affecting detection and recurrence probability
