# Phase 4D.3 — Architecture Lock-In + Migration Projects

Phase 4D.3 turns long-lived model families into strategic assets with architectural inertia.

## Implemented

- persistent architecture portfolios keyed by model-family root
- automatic architecture classification for dense, MoE, long-context, and FP8-optimized lineages
- lock-in that grows with generations and unresolved technical debt
- lineage-level debt portfolios and pressure scoring
- training-cost, reliability, and migration-friction multipliers per family
- debt-targeted migration projects for checkpoints, schedulers, provenance, parallelism guardrails, precision recipes, and eval infrastructure
- multi-day migration execution with explicit cash cost
- migration completion that retires matching debt and reduces lock-in
- architecture escape hatches with migration days, cash cost, and transition risk
- architecture history persisted at both family and company level
- current-model lock-in metadata written onto Model Lab model records
- dedicated Architecture Portfolio UI
- responsive browser/mobile UI
- Scriptable WebView integration

## Gameplay intent

A model family can become increasingly efficient to continue but increasingly expensive to change. The player must choose between exploiting a mature architecture, paying down the debt that makes it fragile, or funding a migration before the next model generation makes the lock-in worse.

Examples:

- keeping a sparse MoE lineage lowers active compute but raises routing and serving complexity
- an FP8-optimized lineage can be economical until hardware or precision assumptions change
- weak provenance in a long-lived family increases both debt pressure and migration friction
- completing a provenance or scheduler migration permanently improves the family rather than merely clearing a warning

## Next Phase 4D increment

1. Make active migrations temporarily affect staffing/workload and model launch schedules.
2. Add parallel model-family forks so a lab can maintain a stable production lineage and an experimental lineage simultaneously.
3. Add explicit compatibility matrices for hardware generation, serving stack, tokenizer, checkpoint format, and post-training recipe.
4. Add deprecation/end-of-life decisions for old model families.
5. Add migration failure/rollback scenarios and staged canaries.
6. Tie architecture economics more directly into real training-run cost and runtime rather than advisory multipliers only.
7. Add executive design reviews where NPC specialists argue for continuing, forking, or migrating a lineage.
