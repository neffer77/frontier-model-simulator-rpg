# Phase 4C.3 — Editable PyTorch Code + Distributed Job Simulation

Phase 4C.3 moves the simulator from configuration/log inspection into code-level debugging and distributed execution reasoning.

## Implemented

- Editable PyTorch training-step challenges.
- Deterministic test harness for code fixes.
- Mixed-precision instability exercise.
- Rank-local CUDA OOM exercise.
- Distributed gradient-sync / collective-stall exercise.
- Simulated `torchrun`-style multi-rank jobs.
- Slurm and Kubernetes launch surfaces.
- TP / PP / DP rank mapping across nodes.
- Rank-local logs and failure inspection.
- Controlled failure injection for NaN, OOM, and sync stalls.
- Checkpoint verification, restore, and replay workflow.
- NPC code review based on employee specialty.
- Distributed job and recovery actions linked into persistent incident timelines when available.
- Browser/mobile and Scriptable WebView integration.

## Design principle

The player should not be rewarded for merely recognizing a vocabulary term. The code must satisfy explicit invariants, the distributed validation job must survive the relevant failure mode, and recovery should be demonstrated rather than assumed.

All execution is deterministic simulation. The game does not execute user-written Python, shell commands, Kubernetes jobs, or Slurm jobs on a real host or cluster.

## Next 4C increments

1. Add optimizer-state / gradient-scaling debugging exercises.
2. Add FSDP and ZeRO sharding state visualizations.
3. Add elastic restart and node-preemption workflows.
4. Add simulated scheduler queues, pending reasons, quotas, and gang scheduling.
5. Add richer collective traces with bucket-level synchronization.
6. Add code/config diffs directly to Model Lab and postmortem records.
7. Add multi-file code challenges with small deterministic unit/integration suites.
8. Add Staff-level design reviews where several technically valid implementations have different throughput/reliability costs.
9. Expand NPC review into multi-reviewer disagreements and approval gates.
10. Follow with Phase 4C.4: deep Data + Evals Engineering Lab.
