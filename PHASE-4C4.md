# Phase 4C.4 — Data + Evals Engineering Lab

Phase 4C.4 turns dataset construction and model evaluation into first-class engineering gameplay.

## Implemented

- Dataset provenance graph with source, token volume, license/provenance class, temporal cutoff, quality, and duplicate pressure.
- Adjustable training-mixture controls with projected capability tradeoffs.
- Deduplication threshold tuning with explicit duplicate-removal versus rare-pattern-loss tradeoffs.
- Tokenizer fertility diagnostics across English, Spanish, Japanese, Arabic, and Python/code.
- Slice-level evaluation dashboard with private/temporal/public benchmark distinctions.
- Contamination/overlap detection and automatic quarantine of suspicious benchmark slices.
- Temporal-holdout control.
- Release gates that operate on trusted slices rather than one aggregate score.
- Dataset experiments for mixture ablations, dedup sweeps, and temporal-holdout validation.
- Model Lab linkage for eval history and dataset discoveries.
- NPC evidence sharing for eval findings.
- Incident/postmortem timeline hooks for data/eval actions when an incident is active.
- Browser/mobile UI and Scriptable WebView integration.

## Design principle

The player should learn that data quality and evaluation validity are engineering systems, not leaderboard decorations. A benchmark improvement only counts when provenance, temporal separation, contamination risk, and relevant regression slices support the conclusion.

## Current gameplay questions

- How much code should enter the next pretraining mixture before reasoning regresses?
- How aggressively should near-duplicate documents be removed before rare examples disappear?
- Which languages or code domains are expensive under the current tokenizer?
- Is a benchmark jump capability, contamination, or distribution overlap?
- Should a model ship when public benchmarks look strong but a trusted private slice fails?
- Does a temporal holdout remain clean relative to the training-data cutoff?

## Next phase

Phase 4D should make old technical decisions persist as system constraints: technical debt, architecture debt, reliability debt, data debt, recurring incident risk, cost pressure, and long-term model-lineage consequences.
