# Phase 4C — Real Engineering Artifacts

Phase 4C moves technical gameplay from abstract buttons toward the artifacts frontier model engineers actually reason from.

## Implemented in this slice

- Editable `train.yaml` with simulated validation/application.
- Training configuration history linked back into the latest persistent Model Lab record.
- Simulated run filesystem under `/runs/atlas-next`.
- Terminal commands for `pwd`, `ls`, `cd`, `cat`, `grep`, `nvidia-smi`, `nccl-topo`, and `metrics`.
- Realistic trainer logs with scenario-dependent signals.
- NCCL/fabric logs and topology visualization.
- TensorBoard-like loss/gradient views and profiler timeline.
- GPU fleet visualization with utilization, memory, and rank context.
- Data pipeline visualization with shard metadata and eval slices.
- Artifact-driven debugging exercises with evidence-sensitive grading.
- Browser/mobile UI and Scriptable WebView integration.

## Design principle

The player should increasingly learn by inspecting evidence and changing technical artifacts rather than choosing a canned answer. The shell and files are deliberately simulated, deterministic, and safe, but use terminology and workflows that resemble real model-training and serving environments.

## Current debugging exercises

- Pipeline-parallelism / MFU regression
- Reproducible NaN at a shard boundary
- TTFT regression with stable decode latency
- Suspicious evaluation jump / contamination
- DPO multi-objective regression

## Next Phase 4C increments

1. Make the Engineering Lab automatically open the exact active incident case and share inspected artifacts with NPC beliefs.
2. Add structured config diffs and before/after benchmark runs.
3. Add richer profiler traces by rank/stage and explicit TP/PP/DP mapping.
4. Add checkpoint creation, corruption, replay, and recovery workflows.
5. Add editable Python/PyTorch debugging exercises with deterministic tests.
6. Add simulated Slurm/Kubernetes job surfaces and distributed launch commands.
7. Expand data provenance, dedup, tokenizer, and mixture-analysis artifacts.
8. Feed Engineering Lab actions directly into postmortem timelines and organizational knowledge.
9. Add progressive difficulty so expert mode removes explanatory labels and exposes noisier evidence.
10. Add more visual polish: animated rack activity, trace playback, incident war-room transitions, and launch-day cluster views.
