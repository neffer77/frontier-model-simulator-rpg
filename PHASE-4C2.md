# Phase 4C.2 — Incident-Linked Engineering Workflows

This slice connects the Engineering Lab to the rest of the simulator instead of leaving it as a standalone sandbox.

## Implemented

- Active incidents automatically drive the Engineering Lab challenge.
- Engineering artifacts can be shared directly with NPC employees during incidents.
- Shared artifacts feed existing NPC evidence/belief systems when compatible evidence IDs exist.
- Engineering actions are appended to persistent incident timelines through the postmortem event hooks.
- Structured train.yaml diffs show before/after values.
- Controlled before/after benchmark runs persist configuration and metric deltas.
- Rank-focused profiler traces expose pipeline stage, TP rank, DP replica, compute, idle, send, and receive context.
- Checkpoint timeline with verification, corruption detection, restore, and deterministic replay behavior.
- Recovery actions are recorded in incident history.
- Browser/mobile and Scriptable integration.

## Learning goals

The player should learn to:

1. Treat artifacts as evidence that can be communicated to teammates, not just viewed privately.
2. Form and update hypotheses from rank/stage-specific distributed traces.
3. Compare configuration changes against a baseline instead of relying on intuition alone.
4. Separate checkpoint verification from checkpoint recovery.
5. Record engineering actions as part of the incident/postmortem history.

## Next Phase 4C increments

- Editable Python/PyTorch code exercises with deterministic tests.
- Simulated Slurm/Kubernetes job surfaces and distributed launch commands.
- Checkpoint corruption at file/shard granularity and deeper replay tooling.
- More detailed TP/PP/DP topology mapping and per-rank profiler playback.
- Richer data provenance, deduplication, tokenizer, and mixture analysis.
- Progressive difficulty / expert mode with less explanatory labeling and noisier evidence.
- Animated war-room and cluster transitions.
