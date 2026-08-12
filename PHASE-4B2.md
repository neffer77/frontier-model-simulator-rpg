# Phase 4B.2 — Evidence-Aware NPC Beliefs

This increment turns NPC advice into a stateful engineering collaboration system.

## Implemented

- Each employee maintains a persistent hypothesis distribution for every incident they participate in.
- Initial beliefs depend on specialty, technical skill, and professional bias.
- NPCs do not automatically receive workstation evidence.
- The player can share individual evidence records with a selected employee.
- Shared evidence updates that employee's hypothesis probabilities independently.
- Employees remember evidence-sharing interactions and gain small trust increments.
- Advice UI now exposes the employee's current leading hypothesis and confidence.
- Incident roundtable shows every core employee's current belief distribution side by side.
- The roundtable explicitly surfaces disagreement when employees lead on different hypotheses.
- Evidence access is visible per employee, making it clear why two smart engineers can disagree.
- Browser and Scriptable builds both load the belief system.

## Design principle

NPCs should never function as omniscient hint dispensers. A strong engineer can still be wrong if they have incomplete evidence, and two specialists can rationally disagree because they saw different logs or traces.

The simulation engine determines what each employee knows and believes. Future optional LLM dialogue should only express this structured state rather than inventing hidden information.

## Next increments

1. Track employee involvement directly on incident postmortems and Model Lab history.
2. Reward or penalize professional trust based on whether the player shares evidence, ignores strong evidence, or repeatedly follows weak advice.
3. Allow NPCs to proactively request specific missing evidence.
4. Add engineer-to-engineer evidence sharing and belief convergence during war rooms.
5. Add technical disagreements during architecture/design reviews, not just incidents.
6. Add mentorship, promotion, workload, and career-event systems.
7. Add hiring and organizational structure.
