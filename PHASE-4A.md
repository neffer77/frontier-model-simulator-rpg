# Phase 4A — Persistent Model Lab

Phase 4A changes models from disposable progression milestones into persistent engineering artifacts.

## Implemented foundation

- Model dossier UI with architecture, generation, context, precision, and creation history.
- Persistent model lineage with parent/descendant relationships.
- Version-tolerant enrichment of existing V3 model records rather than deleting old saves.
- Persistent checkpoint records.
- Evaluation history with per-capability scores instead of one aggregate model score.
- Experiment notebook attached to individual models.
- Controlled experiment planning, deterministic simulated outcomes, and adopt/follow-up/reject decisions.
- Adopted experiments create permanent model discoveries and research insight.
- Model memory counters for checkpoints, experiments, incidents, and discoveries.
- Responsive browser UI and Scriptable WebView integration.

## Architecture direction

The Model Lab deliberately wraps the existing V3 renderer instead of replacing training, workstation, momentum, economy, or engagement logic. This keeps Phase 4A incremental and gives later phases a stable persistent model object to attach richer systems to.

Each model is progressively enriched with:

- `id`
- `generation`
- `parentModelId`
- `architecture`
- `training`
- `checkpoints`
- `evals`
- `experiments`
- `postTraining`
- `launches`
- `incidents`
- `costs`
- `capabilities`
- `weaknesses`
- `technicalDebt`
- `discoveries`

## Next Phase 4A increments

1. Capture the exact training configuration and training metric timeline at model completion rather than only backfilling historical models.
2. Connect workstation incident resolutions and postmortems directly to the current model dossier.
3. Add explicit checkpoint creation/recovery events during training.
4. Expand evals into selectable suites, slices, contamination status, and regression gates.
5. Add experiment controls for actual simulation parameters rather than template-only experiments.
6. Add model comparison and parent-vs-child delta views.
7. Add post-training and production launch histories.
8. Add save-schema migration tests before moving the root save version from V3 to V4.

Phase 4B will attach persistent NPC employees and team collaboration to these model, experiment, incident, and discovery records.
