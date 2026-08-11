# Phase 4B — NPC Engineering Team

Phase 4B turns the lab from a solo simulator into a persistent engineering organization.

## Implemented first slice

- Eight persistent core employees with distinct roles, specialties, skill profiles, personalities, and professional traits.
- Dedicated Engineering Team screen with roster, technical profile, workload, trust, respect, alignment, and shared memory.
- Incident `Ask Team` panel inside the Engineering Workstation.
- Confidence-scored technical advice based on the NPC's specialty, incident domain, shared history, and deterministic variation.
- Non-experts explicitly qualify their advice rather than pretending to know the answer.
- NPC memories persist when the player asks for help or accepts/saves an idea.
- NPC-generated engineering ideas based on employee specialty.
- Accepted NPC ideas feed directly into Phase 4A Model Lab experiments.
- Responsive browser and Scriptable WebView integration.

## Core team

- Maya Chen — Distributed Systems Engineer
- Rafael Ortiz — Data Engineer
- Priya Shah — Post-Training Researcher
- Noah Williams — Inference Engineer
- Elena Kovacs — Research Scientist
- Marcus Lee — Infrastructure Engineer
- Zoe Patel — Evals Engineer
- Sam Brooks — AI Safety Engineer

## Design rules

1. NPCs are collaborators, not hint buttons.
2. Confidence is not correctness.
3. Specialty affects the quality and framing of advice.
4. Non-specialists can still be useful, but should signal uncertainty.
5. Memories should reflect actual player/NPC interactions rather than generic relationship grinding.
6. NPC ideas should create real experiments or future work, not cosmetic dialogue.
7. The structured simulation determines what an NPC believes; later LLM dialogue should only express that state.

## Next Phase 4B increments

1. Evidence visibility: NPC opinions should change based on which workstation evidence has been shared with them.
2. Explicit competing hypotheses and disagreements between multiple NPCs.
3. Track which employees participated in each model, experiment, incident, and discovery.
4. Give NPCs skill growth and learned specialties from repeated work.
5. Add mentoring and junior-engineer teaching moments.
6. Add workload consequences, project assignment, and team capacity constraints.
7. Add NPC-initiated interruptions such as `Got a minute?` when a relevant idea or concern appears.
8. Add promotions, role changes, recruiting, retention, and career events.
9. Add design-review scenes where multiple NPCs argue technical tradeoffs.
10. Add optional portrait art and richer character presentation after the simulation logic is stable.
