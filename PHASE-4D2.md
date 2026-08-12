# Phase 4D.2 — Debt-Aware Incidents + Model Planning

Phase 4D.2 turns the technical-debt ledger into an active simulation input instead of a passive dashboard.

## Implemented

- Debt-weighted incident generation for NaNs, pipeline bubbles, contamination, TTFT regressions, and post-training regressions.
- Deterministic incident rolls tied to day, run progress, debt pressure, and run advancement count.
- Incident records now capture debt attribution, debt interest, recurring-failure status, and detection modifiers.
- Observability debt can add investigation time when telemetry is incomplete without hiding decisive evidence.
- Large-model launch plans receive debt-aware review gates based on debt pressure and critical unresolved debt.
- Frontier-scale dense and MoE plans explicitly surface weak provenance and scheduler fragility.
- The player can accept model-plan risk, but the accepted risk is auditable and attached to the active run.
- Corrective actions can automatically retire matching technical debt without charging a second engineering cost.
- Model Lab discoveries record debt retired through postmortem corrective actions.
- Postmortems show technical-debt causality and recurring-failure attribution.
- Browser/mobile and Scriptable builds include the same causal systems.

## Causal loop

The intended loop is now:

1. An engineering shortcut creates technical debt.
2. Debt ages and accumulates interest.
3. The debt changes future incident probability, detection quality, engineering drag, or compute drag.
4. A related incident can be explicitly attributed back to unresolved debt.
5. The postmortem creates corrective actions.
6. Completing the right corrective action retires the underlying debt.
7. If the debt remains, repeated incidents are marked as recurring failures.
8. Large future model plans can be blocked for technical review until debt is fixed or risk is explicitly accepted.

## Current model-planning review thresholds

- 30B dense: debt-pressure review begins at 7.
- 70B dense: debt-pressure review begins at 11.
- Sparse MoE: debt-pressure review begins at 14.
- Critical debt can block these plans even before the pressure threshold is exceeded.
- Weak data provenance receives extra scrutiny for 70B/MoE launches.
- Scheduler sprawl receives extra scrutiny for MoE launches.

## Next Phase 4D increments

1. Add architecture-specific debt beyond launch gating: e.g. MoE routing, long-context serving, multi-site checkpointing, and tokenizer/data-format lock-in.
2. Make accepted risk change model launch cost, schedule uncertainty, and executive/team reactions.
3. Add debt principal vs interest accounting and partial pay-down rather than only full retirement.
4. Add explicit prevention vs detection corrective-action effects.
5. Add model lineage views showing debt created, inherited, amplified, and retired across generations.
6. Let NPC Staff/Principal engineers propose debt-remediation programs and argue about sequencing.
7. Add quarterly reliability/technical-health reviews with debt budgets and roadmap tradeoffs.
8. Add rare compound incidents where multiple debt items interact instead of producing one isolated failure.
