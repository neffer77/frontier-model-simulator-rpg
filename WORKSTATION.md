# Engineering Workstation — V3 engagement/learning loop

The workstation makes incidents investigative rather than multiple-choice-first.

## Core loop

1. Notice an anomaly.
2. Choose a diagnostic surface (TensorBoard, profiler, GPU fleet, NCCL, data, checkpoints, config, terminal).
3. Pay simulated diagnostic time and, where appropriate, compute.
4. Pin discovered evidence to an evidence board.
5. Commit a hypothesis before taking a production action.
6. Receive immediate corrective feedback.
7. Earn an S/A/B/C Clean Diagnosis grade based on correctness and diagnostic efficiency.
8. Persist the incident, grade, tools used, compute spent, and mastery in model/company history.

## Engagement philosophy

The game rewards competence rather than attendance:

- no streak loss
- no expiring progress
- no loot-box reward loops
- no penalty for time away
- return briefing summarizes unfinished ambitions and the fastest path back into flow
- surprise comes from technically plausible incidents and experiments, not opaque gambling mechanics

The satisfying feedback moments are tied to learning events: finding a decisive signal, falsifying a hypothesis, making a clean diagnosis, resuming a costly run, shipping a model, and unlocking technology.

## Diagnostic grading

- **S**: correct hypothesis/action, no hint, no false production moves, near-minimal tool set
- **A**: correct hypothesis/action with modest extra investigation
- **B**: successful diagnosis after one meaningful false move or wider investigation
- **C**: eventual recovery after multiple false moves

The goal is to train efficient engineering reasoning without punishing exploration while the player is still learning.

## Terminal

The first shell supports teaching commands such as:

- `metrics`
- `run inspect 441198`
- `profile`
- `gpu stragglers`
- `nccl profile`
- `data current`
- `data replay`
- `checkpoint verify`
- `config show`
- `evidence`
- `hint`

Later versions should grow this into progressively more realistic PyTorch/distributed-training commands and code exercises.
