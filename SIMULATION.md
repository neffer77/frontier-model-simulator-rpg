# Frontier Lab V3 — simulation and factual model

Frontier Lab is designed to teach realistic engineering reasoning without pretending that a browser game is a production capacity planner. The game separates **technical claims**, **derived invariants**, and **game-balance abstractions**.

## Derived invariants

The simulator derives related values from common primitives instead of independently hand-writing them.

- `tokens_seen = optimizer_steps × global_batch_tokens`
- Dense-transformer teaching compute uses `training_FLOPs ≈ 6 × parameters × training_tokens`.
- Displayed optimizer-step counts are calculated from the selected token budget and global batch.
- Model history stores the derived token, step, and batch values used by the run.

This removes the previous scenario inconsistency where 441,198 steps at 4.19M tokens/update was described as 5.8T tokens. Those values actually imply roughly 1.85T tokens.

## H100-hour abstraction

The game converts estimated training FLOPs to **simulated H100-hours** using a fixed effective-throughput teaching constant. This is deliberately not advertised as the peak specification or a universal real-world throughput number. Real throughput depends on model architecture, sequence length, kernels, precision, topology, parallelism, recomputation, communication, dataloading, checkpointing, and software stack.

The purpose of the abstraction is to make compute a scarce strategic resource while preserving correct scaling relationships.

## Technology-tree bonuses

Effects such as “FlashAttention: +8% training throughput” or “FP8: +14% training throughput” are **game-balance bonuses**, not claims that those technologies universally produce those exact speedups. The magnitude of real gains is workload- and implementation-dependent.

The technical concepts behind them are source-backed:

- FlashAttention is an exact IO-aware attention algorithm designed to reduce memory reads/writes between GPU memory hierarchy levels: https://arxiv.org/abs/2205.14135
- PyTorch FSDP FULL_SHARD shards parameters, gradients, and optimizer state and uses collectives during execution: https://docs.pytorch.org/docs/stable/fsdp.html
- NVIDIA Transformer Engine documents FP8 formats and scaling recipes and explicitly notes that not every operation is safe in FP8: https://docs.nvidia.com/deeplearning/transformer-engine/user-guide/examples/fp8_primer.html
- DPO preference optimization: https://arxiv.org/abs/2305.18290
- Chinchilla compute-optimal scaling work: https://arxiv.org/abs/2203.15556
- vLLM / PagedAttention serving work: https://arxiv.org/abs/2309.06180

## DPO beta correction

The previous DPO scenario implied that lowering beta moved behavior closer to the reference policy. In common DPO parameterizations that direction is backwards: larger beta applies a stronger reference-policy constraint. V3 therefore describes a **higher-beta pilot** recovering some tool behavior and explicitly tells the learner to verify the semantics of the implementation they are using.

## Scenario philosophy

Evidence should increasingly be discovered by the player rather than handed to them. V3 starts this transition by separating metrics, systems, and data views. Future versions should make investigation actions cost simulated time/compute and should hide the decisive evidence until the player chooses an appropriate diagnostic.

## What remains intentionally simplified

- Optimizer dynamics and loss curves are stylized rather than numerically simulated from model training.
- Model capability scores are fictional game indices, not benchmark predictions.
- Funding, cash, employees, and competitor scores are strategy-game systems rather than forecasts of real AI-company economics.
- Dense-model FLOP approximation is not directly valid for all sparse/MoE accounting; future MoE runs should distinguish total parameters, active parameters, routing/communication, and expert parallelism.
- Safety, eval, data licensing, post-training, and serving outcomes require richer multi-objective simulation before they should be treated as high-fidelity models.

The design rule is: **when a number is presented as engineering physics, derive or source it; when it is a gameplay number, label it as gameplay.**
