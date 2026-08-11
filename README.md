# Frontier Model Engineer RPG

A browser-based career simulator where you roleplay inside a frontier AI lab and learn the actual disciplines involved in building modern foundation models.

## Play

Open `index.html` in a browser. No build step or dependencies are required. Progress is stored in `localStorage`.

For GitHub Pages, enable Pages for the repository and publish the `main` branch root.

## Roles

- Research Scientist
- Training Engineer
- Data Engineer
- Post-Training Engineer
- Evals Engineer
- Inference Engineer
- Safety Engineer
- Model Product Engineer
- Full-Stack Frontier Engineer

You can switch roles at any time. This is intentional: the long-term game is designed to teach both deep specialization and how disciplines interact across a frontier-model organization.

## Current game loop

1. Pick a role.
2. Choose company projects that match that role.
3. Spend daily focus to attempt projects.
4. Successful projects earn lab budget, reputation, and skill levels.
5. Failed experiments still produce learning and skill progression.
6. Spend budget on focused study.
7. Rotate roles to build a broader frontier-engineering skill tree.

Every project includes a career-translation lesson explaining the real engineering concepts behind the game action.

## Real-world skill tree

The simulator currently tracks research, math, training, distributed systems, systems engineering, data, post-training, evaluation, inference, safety, and model product engineering.

These levels are deliberately treated as exposure rather than proof of mastery. The intended next step is to connect levels to real exercises and evidence.

## Product direction

The target experience is closer to a technical management/RPG simulator than a quiz app. The player should eventually operate a frontier-model company across research, compute, data, training, evaluation, deployment, safety, reliability, and product tradeoffs while completing real technical exercises.

### Planned simulation systems

- **Company simulation:** runway, GPU fleet, researchers, engineers, clusters, model releases, competitors, research bets, incidents, technical debt, hiring, and deadlines.
- **Model lifecycle:** tokenizer -> data mixture -> architecture -> scaling experiments -> pretraining -> checkpoints -> post-training -> evals -> safety gates -> inference -> product deployment -> monitoring.
- **Compute simulator:** accelerator types, utilization, memory, interconnect, parallelism strategy, checkpoint cadence, MFU, failure rate, cost, throughput, and scheduling.
- **Experiment simulator:** hypotheses, baselines, ablations, seeds, metrics, dashboards, regressions, and experiment journals.
- **Incident simulator:** NaNs, bad data shards, dead workers, checkpoint corruption, eval leakage, reward hacking, latency regressions, jailbreak discoveries, and production outages.
- **Role careers:** junior -> engineer -> senior -> staff -> principal/research lead, with role-specific competency matrices.
- **Cross-functional mode:** control multiple engineers or the entire company and assign specialists to concurrent workstreams.

## Curriculum roadmap

### Phase 1 — Foundations

Real exercises should cover Python, PyTorch, Linux, Git, numerical computing, probability/statistics, linear algebra, optimization, transformers, attention, tokenization, profiling, and debugging.

### Phase 2 — Research engineering

- reproduce a small transformer paper or technique
- implement attention and normalization variants
- design controlled ablations
- reason about scaling curves and compute budgets
- read training/evaluation plots and diagnose confounders

### Phase 3 — Data engineering

- construct a dataset pipeline
- deduplicate and filter data
- create quality/domain classifiers
- reason about mixture weights
- detect benchmark contamination
- track provenance and dataset versions

### Phase 4 — Pretraining and distributed training

- implement a small language-model training loop
- mixed precision and numerical stability
- gradient accumulation/checkpointing
- data/tensor/pipeline/context parallelism
- sharding and collective communication
- checkpoint/resume design
- cluster observability and failure recovery

### Phase 5 — Post-training

- supervised fine-tuning
- preference datasets
- reward/preference modeling concepts
- DPO-style optimization
- RL-style post-training concepts
- reward hacking and overoptimization
- regression evaluation

### Phase 6 — Evals and safety

- construct eval suites and slices
- statistical confidence and variance
- capability vs behavior evaluation
- adversarial testing
- agent/tool-use evals
- threat modeling
- safeguards and release gates
- monitoring and incident response

### Phase 7 — Inference systems

- KV cache
- continuous batching
- quantization
- speculative decoding
- model parallel serving
- routing
- latency/throughput/cost tradeoffs
- profiling kernels and bottlenecks

### Phase 8 — Frontier lab capstone

The player receives a fixed compute budget and business/research objective and must ship a model release. They choose architecture, data mixture, scaling experiments, training strategy, post-training recipe, eval gates, safety mitigations, and serving strategy. The final score should explain both technical outcomes and what the player should learn next in real life.

## Architecture direction

The MVP is deliberately dependency-free:

- `index.html` — shell
- `styles.css` — responsive UI
- `game.js` — roles, projects, simulation state, progression, and persistence

As mechanics grow, split data and systems into modules such as `src/data/roles.js`, `src/data/projects.js`, `src/sim/training.js`, `src/sim/company.js`, `src/learning/curriculum.js`, and `src/state/save.js` before adopting a framework.

## Next implementation priorities

1. Add structured missions with prerequisite concepts, choices, technical questions, and debriefs.
2. Add a company/org view where the player controls multiple engineering roles simultaneously.
3. Add a realistic miniature training-run simulator with compute, loss, throughput, instability, and checkpoint decisions.
4. Add portfolio challenges whose completion produces real code or reports outside the game.
5. Add paper-reading and implementation quests with links, notes, and competency evidence.
6. Add career dashboards showing which real frontier-engineering competencies are weak or strong.

## Design principle

The game should reward the same behaviors a strong frontier-model engineer needs in real work: forming hypotheses, measuring carefully, debugging systematically, understanding systems constraints, documenting experiments, learning from failures, and collaborating across specialties.
