# Phase 4D.4 — Parallel Model Families, Compatibility & Lifecycle

This phase extends architecture lock-in into explicit portfolio governance.

## What it adds

- Parallel architecture forks without destroying the source lineage.
- Compatibility matrices across checkpoints, serving, tokenizer, data pipeline, evals, and post-training.
- NPC architecture design reviews with approve / conditional / block outcomes.
- Bounded migration canaries with explicit risk, cost, and pass/fail metrics.
- Promotion of successful canaries into independent model families.
- Rollback paths for failed or abandoned forks.
- Family lifecycle controls: active, deprecated, and end-of-life.
- EOL decisions preserve historical debt instead of pretending it was repaid.
- Browser/mobile and Scriptable WebView support.

## Gameplay loop

1. Select an existing model family.
2. Fork it into another architecture, such as MoE, long-context, or FP8-optimized dense.
3. Inspect compatibility across operational surfaces.
4. Request an NPC architecture review.
5. Run a bounded canary if the proposal is not blocked.
6. Promote the fork or roll it back.
7. Keep both families active, deprecate an older family, or mark it EOL.

## Design intent

Architecture migration should not be a free menu choice. The player now has to preserve compatibility, manage operational risk, and decide whether maintaining multiple model families is worth the cost.

A family can remain technically viable while becoming strategically obsolete. Deprecation and EOL therefore become explicit engineering-management decisions rather than automatic cleanup.

## Next

The next Phase 4D slice should add:

- per-family maintenance budgets and on-call load
- shared-component dependency graphs between model families
- forced migration events from hardware/framework/vendor changes
- deprecation deadlines and customer/product dependencies
- NPC ownership of architecture programs
- canary comparison dashboards with richer quality, cost, latency, and reliability deltas
