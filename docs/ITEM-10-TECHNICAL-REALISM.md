# Item 10 — Technical Realism + Fact-Check Pass

## Goal
Preserve the game’s accessibility while making it explicit which mechanics are grounded in primary sources, which are teaching approximations, which values are synthetic gameplay abstractions, and which requested domains are not yet present in the live runtime.

## Audit standard

- **Grounded** — the concept and direction of the mechanic match a primary source or official technical documentation.
- **Corrected** — the previous simulator mechanic materially misrepresented the technical concept and has been changed.
- **Approximation** — useful for reasoning, but intentionally omits implementation details or uses an effective proxy.
- **Synthetic** — the scenario, metric value, experiment outcome, or score is authored for gameplay.
- **Game abstraction** — organizational, legal, policy, communications, or financial mechanics compress reality to create meaningful decisions.
- **Coverage gap** — the current live `main` runtime does not contain a dedicated system that can be meaningfully fact-checked yet.

## Corrections

### Sparse MoE training compute
The original `trainingPhysics()` used total parameter count for all model tiers. That substantially overstates the arithmetic implied by a sparsely activated MoE tier because not all expert parameters participate in every token.

Item 10 uses:

- dense model: `6 × total parameters × training tokens`
- sparse MoE: `6 × active-parameter proxy × training tokens`

For the simulator’s 8×22B tier this means 176B total parameters but a 44B active-parameter proxy per token. Routing, shared layers, communication, load balancing, auxiliary losses, recomputation, and optimizer costs remain omitted, so this is still a teaching approximation.

An active MoE run created before Item 10 is migrated once: its physics is recomputed and excess simulated H100-hours are refunded.

### Research-tree dependencies
The simulator previously displayed relationships such as FlashAttention → FP8 or FSDP → 3D parallelism as plain `Requires` edges. Those are not universal technical dependencies.

Item 10 relabels them **Lab prerequisite**. The research tree represents the fictional lab’s progression/maturity path, not a dependency graph of the underlying technologies.

## Verified concepts

| Area | Audit result | Primary source basis |
| --- | --- | --- |
| Compute scaling | Approximation | Hoffmann et al., *Training Compute-Optimal Large Language Models* |
| Sparse MoE | Corrected | Fedus et al., *Switch Transformers*; routed/sparse-model literature |
| H100 throughput | Approximation | NVIDIA H100 product specifications |
| FSDP FULL_SHARD | Grounded | PyTorch FSDP documentation |
| Multi-process / multi-node torchrun concepts | Grounded concept / illustrative launcher | PyTorch torchrun documentation |
| FP8 training | Grounded | NVIDIA Transformer Engine FP8 documentation |
| FlashAttention | Grounded | Dao et al., *FlashAttention* |
| DP/TP/PP/CP/EP composition | Grounded | NVIDIA Megatron Core parallelism guide |
| Paged KV cache | Grounded | Kwon et al., *PagedAttention / vLLM* |
| DPO | Grounded | Rafailov et al., *Direct Preference Optimization* |
| Eval contamination | Grounded concept / synthetic thresholds | Singh et al., *Evaluation data contamination in LLMs* |
| SLO/error budget | Grounded concept / synthetic targets | Google SRE Workbook error-budget policy |

## Important teaching approximations

### 6ND FLOP estimate
The simulator’s dense-transformer training arithmetic is an order-of-magnitude teaching model, not a full FLOP accounting. Real training cost depends on architecture, context length, attention implementation, activation recomputation, optimizer work, precision, sparsity, and other details.

### H100-hours
The game converts model FLOPs to simulated H100-hours using a fixed **330 TFLOP/s effective throughput** baseline. That number is intentionally not presented as NVIDIA peak throughput. Real achieved throughput depends on precision, sparsity, model FLOP utilization, parallelism topology, collectives, kernels, and workload shape.

### Technology bonuses
The fixed `+8% FlashAttention`, `+14% FP8`, and `+5% 3D parallelism` training bonuses are synthetic game balancing values. The technologies can improve efficiency, but no universal percentage applies across workloads.

### Batch-size rules
The global-batch values chosen by model tier are simulator heuristics. Real batch-size selection depends on optimization stability, data distribution, learning-rate schedule, hardware topology, sequence length, and the critical-batch regime.

### Distributed launcher
The Code Lab’s rank concepts are useful teaching abstractions, but its Slurm/Kubernetes commands are intentionally illustrative. Real multi-node `torchrun` requires a consistent job/node configuration and rendezvous setup such as `--nnodes`, `--rdzv-id`, `--rdzv-backend`, and `--rdzv-endpoint`, whether those are supplied explicitly or derived through a cluster scheduler.

The AMP, OOM, and synchronization fixes are scenario-specific. For example, switching FP16 → BF16 may improve numerical range in a given workload, but it is not a universal cure for training instability; disabling cache can reduce memory pressure in the constructed training example, but real OOM diagnosis also considers sequence length, activation checkpointing, microbatching, sharding, fragmentation, and model architecture.

## Synthetic-but-plausible scenarios

The incident system is intentionally constructed. Gradient explosions, pipeline bubbles, benchmark contamination, prefill queueing, and DPO regressions are plausible failure classes, but the exact numbers and answer choices are authored educational scenarios rather than records of real production incidents.

The simulator preserves evidence-first reasoning: the correct action should fit the telemetry better than distractor actions.

## Evals and experiment scores

The following values are explicitly synthetic gameplay signals:

- Frontier Capability Suite migration scores
- capability index
- data-mixture projected capability pressure
- dedup response curves
- contamination percentages in the fictional datasets
- the game’s 5% quarantine threshold
- experiment success rates and percentage deltas

The contamination mechanic is grounded in the fact that overlap can invalidate or inflate evaluation evidence; the exact threshold must be calibrated to the benchmark, matching method, corpus, and model rather than copied from this game.

## Reliability

The SLO/error-budget layer is conceptually grounded: error budgets can be used to balance change velocity with reliability. The simulator’s exact SLOs, severity multipliers, 30-day burn arithmetic, paging-fatigue values, review thresholds, and consequences are game parameters, not production prescriptions.

## Architecture portfolio

Dense, MoE, long-context, and low-precision systems do create different compute, memory, communication, serving, and operational tradeoffs. However the Architecture Portfolio’s exact lock-in scores, reliability percentages, migration durations, cash costs, and risk values are synthetic. They are intended to make architectural decisions persist across a model lineage, not predict the cost of a real migration.

## Company, governance, policy, and communications simulation

Funding rounds, valuation, dilution, compute grants, headcount burn, board confidence, and investor patience are deliberate abstractions. Board-vote probabilities, founder-control scores, veto rules, and CEO confidence-review outcomes are also game mechanics rather than a representation of a particular company charter or legal regime.

The Policy & Regulation screen is explicitly fictional: **Atlantic Union, Pacific Federation, and Growth Bloc are invented jurisdictions**. Its compliance, export, licensing, trust, and market-access values do not encode current law and should not be used for legal or export-control decisions.

Likewise, media sentiment, public trust, transparency-report effects, and testimony outcomes are narrative variables rather than empirical predictions about communications strategy.

## Coverage boundary: dedicated AI safety and security

The current live `main` runtime does not include dedicated AI-safety or security gameplay modules. Item 10 therefore marks those domains as a **coverage gap** rather than claiming they have been fact-checked.

When those modules are integrated into the live runtime, they should receive a separate primary-source audit covering their actual mechanics, scenarios, thresholds, and terminology before the realism badge is extended to them.

## Primary sources

- https://arxiv.org/abs/2203.15556 — Training Compute-Optimal Large Language Models
- https://arxiv.org/abs/2101.03961 — Switch Transformers
- https://www.nvidia.com/en-us/data-center/h100/ — NVIDIA H100 specifications
- https://docs.pytorch.org/docs/stable/fsdp.html — PyTorch FSDP
- https://docs.pytorch.org/docs/stable/elastic/run — PyTorch torchrun / Elastic Launch
- https://docs.nvidia.com/deeplearning/transformer-engine/user-guide/examples/fp8_primer.html — Transformer Engine FP8
- https://arxiv.org/abs/2205.14135 — FlashAttention
- https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html — Megatron Core parallelism
- https://arxiv.org/abs/2309.06180 — PagedAttention / vLLM
- https://arxiv.org/abs/2305.18290 — Direct Preference Optimization
- https://arxiv.org/abs/2411.03923 — Evaluation data contamination in LLMs
- https://sre.google/workbook/error-budget-policy/ — Google SRE error-budget policy

## UI behavior

The new **REALISM AUDIT** screen is available from the simulator and gives players a per-mechanic grounded/corrected/approximation/synthetic/game/gap classification plus direct primary-source links where appropriate.

Inline labels appear in high-risk areas where a player could otherwise mistake a game value for an empirical or legal claim: research prerequisites, MoE compute, model/eval scores, dataset projections, dedup curves, distributed launcher commands, architecture economics, finance, governance, policy, public communications, and SLO views.
