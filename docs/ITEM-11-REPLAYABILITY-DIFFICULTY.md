# Item 11 — Replayability + Difficulty Modes

## Goal
Create reasons to replay the simulator without changing the technical truths the player is supposed to learn.

Difficulty therefore changes **operating margin, challenge deadlines, fundraising yield, and the cost of wrong incident diagnoses**. It does not change formulas, evidence, correct incident answers, or the meaning of technical concepts.

## Difficulty modes

| Mode | Starting cash | Starting compute | Funding yield | Deadline | Wrong-diagnosis consequence | Career score |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Apprentice | 125% | 125% | 110% | 125% | none beyond base game | 0.75× |
| Standard | 100% | 100% | 100% | 100% | base game | 1.00× |
| Frontier | 90% | 90% | 90% | 90% | +1 day / -$0.08M | 1.35× |
| Redline | 75% | 75% | 80% | 80% | +2 days / -$0.18M | 1.75× |

Higher difficulties score more career points, but do not hide information or make technically correct actions become incorrect.

## Lab archetypes

### Research Lab
- 90% starting cash
- 105% starting compute
- +2 starting insight
- +1 extra insight for each newly shipped model

This favors controlled experiments and technical unlocks over early financial comfort.

### Systems Lab
- 95% starting cash
- 125% starting compute
- 15% refund after successful infrastructure expansion

This favors training systems, scale-up, and accelerator/infrastructure planning.

### Data & Evals Lab
- 100% starting cash
- 95% starting compute
- +1 starting insight
- first passing trusted release gate per model grants +1 insight and +1 reputation

This rewards measurement quality rather than raw compute.

### Product Lab
- 120% starting cash
- 85% starting compute
- +1 starting reputation
- newly shipped models return an additional 8% of their launch cost as commercial value

This creates stronger market pull but tighter accelerator supply.

## Run challenges

### Scale Race
Ship a **30B-or-larger** model before the run deadline.

Base deadline: Day 120.

### Capital Discipline
Before the deadline:
- ship a 7B-or-larger model
- maintain at least 3 months of runway
- keep unresolved + accepted technical debt at 2 items or fewer

Base deadline: Day 100.

### Incident Commander
Before the deadline:
- resolve 4 incidents
- make no more than 1 wrong diagnosis
- ship at least one model

Base deadline: Day 110.

### Frontier Generalist
Before the deadline:
- reach Applied-or-better knowledge in 4 concepts
- ship a 7B-or-larger model

Base deadline: Day 130.

Difficulty scales these deadlines explicitly.

## Medals

Challenge clears receive a medal from completion time:

- Gold: complete by 65% of the run deadline
- Silver: complete by 85%
- Bronze: complete later but before the deadline

Migrated legacy saves use an untimed compatibility challenge.

Career points combine medal quality and difficulty multiplier. Career data is stored separately from the company save so it survives New Game+ resets.

## New Game+

After the first challenge clear, future founder screens expose one optional legacy perk:

- **Carry One Lesson** — +1 starting insight
- **Supplier Relationship** — +8,000 starting H100-hours
- **Founder Network** — +$0.30M starting cash
- or no perk

The perk is deliberately small. New Game+ should encourage another strategic path rather than trivialize the canonical simulation.

## Persistent Run Archive

The Run Archive records up to 50 clears with:

- company name
- difficulty
- archetype
- challenge
- medal
- career points
- completion day
- largest shipped model
- number of models shipped

It also tracks best cleared difficulty, archetypes cleared, challenges cleared, and total career points.

## Existing-save migration

Existing companies created before Item 11 are **not retroactively rebalanced**.

They migrate to:
- Standard difficulty
- Legacy archetype
- untimed Legacy Company challenge

The compatibility challenge is to ship a 30B-or-larger model. This lets an existing company enter the career archive without rewriting its starting resources or history.

## Replay matrix

Fresh runs provide:

- 4 difficulty modes
- 4 archetypes
- 4 challenges

That creates **64 core run configurations** before company choices, hiring, model lineage, incidents, financing, technical debt, and other simulator systems cause further divergence.

## Automated QA

`tests/replayability.mjs` verifies:

- founder run configuration is visible
- difficulty/archetype/challenge selections persist into the run
- Redline × Systems starting resources are deterministic
- difficulty does not modify technical training FLOP formulas
- challenge deadline scaling works
- the Run Archive opens
- challenge completion writes a persistent career clear
- medal awarding works
- career metadata survives a company-save reset
- New Game+ perk selection appears after the first clear
- no uncaught browser runtime errors occur
