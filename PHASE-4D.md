# Phase 4D — Persistent Consequences & Technical Debt

Phase 4D makes earlier engineering choices materially shape later gameplay. Technical debt is now a persistent causal system rather than a flavor label.

## Implemented in this slice

- Persistent technical-debt records with severity, domain, age, interest, source, and model linkage.
- Debt pressure that compounds as unresolved items age.
- Incident-risk modifiers for pipeline bubbles, NaNs, bad shards, contamination, TTFT, eval regressions, checkpoint failures, and related reliability issues.
- Detection penalties that make weak observability matter in future investigations.
- Engineering and compute-cost drag caused by unresolved debt.
- Debt repayment that consumes simulated engineering time and company money.
- Explicit accepted-risk state for consciously deferred debt.
- Automatic debt seeding from existing model/config/data/eval history.
- Model-lineage inheritance so descendants can carry unresolved parent-model debt.
- Model discoveries when debt is retired.
- Dedicated Technical Debt Board with risk, age, interest, cost, and lineage context.
- Browser/mobile UI and Scriptable WebView integration.

## Core debt categories

- Legacy checkpoint compatibility
- Mixed scheduler / launch-stack sprawl
- Weak dataset provenance
- Missing pipeline-parallelism guardrails
- Fragile mixed-precision recipes
- Sparse evaluation coverage
- Serving cache fragmentation
- Coupled post-training objectives

## Design principle

Debt should never be a generic punishment meter. Each debt item must explain what shortcut or deferred investment created it and change specific future probabilities, observability, costs, or architectural options.

## Next Phase 4D increments

1. Apply debt modifiers directly when the incident generator selects and reveals incidents.
2. Connect corrective actions and organizational standards to automatic debt retirement or risk reduction.
3. Add architecture constraints: some model designs should become expensive or blocked until infrastructure debt is addressed.
4. Add debt-aware model planning with forecasted training cost, incident exposure, and schedule risk.
5. Add recurring-failure attribution that cites ignored debt and prior postmortems.
6. Add build-vs-fix decisions during launches and research races.
7. Add executive/technical review meetings where NPCs argue about debt priorities.
8. Add inherited-debt cleanup projects during new-model kickoff.
9. Track reliability reputation and team confidence as debt outcomes compound.
10. Add richer visual history showing which generation introduced, inherited, and retired each debt item.
