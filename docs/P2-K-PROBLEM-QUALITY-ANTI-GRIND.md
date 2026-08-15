# P2-K — Problem Quality & Anti-Grind

P2-K makes the optimal progression strategy align with deliberate learning rather than repetition farming.

## Learning-value model

A successful workstation diagnosis receives a learning-value multiplier based on:

- **Novelty:** the first successful solve receives full novelty value; repeated successful solves decay at `1.00 → 0.72 → 0.42 → 0.20 → 0.08`.
- **Weak concepts:** low diagnostic mastery receives a larger multiplier so neglected concepts are more valuable than already-strong concepts.
- **Clean solves:** no-hint and no-false-move solves receive bonuses. S/A diagnostic grades add a smaller quality bonus.
- **Appropriate difficulty:** cases with more decisive evidence and/or more expensive decisive diagnostics receive a modest complexity bonus.
- **Anti-farm protection:** beginning with the fourth successful solve of the same incident, the solve is practice-only and grants zero mastery, research, and reputation.

Incorrect production actions never grant mastery or resources. They are recorded in problem-quality history so future learning systems can distinguish productive practice from guessing.

## Persistence

`state.problemQuality` stores per-problem attempts, successful/failed counts, concept practice metadata, recent quality history, and the number of practice-only solves. This state is intentionally structured so P2-L Knowledge Retention can consume practice recency and concept history without redefining the solve event format.

## Player feedback

The workstation debrief surfaces the learning-value multiplier and its reasons, including novelty, weak-concept, no-hint, clean-solve, difficulty, repeat decay, and anti-farm protection. Practice-only repeats explicitly state that they grant no progression.

## Runtime parity

`problem-quality.js` loads before `workstation.js` in the browser and Scriptable runtimes and is included in the PWA cache. The service-worker cache is bumped to `frontier-lab-v23`.

## Verification

- `npm run test:problem-quality` validates bonuses, hint penalties, diminishing repeat value, and practice-only protection.
- `npm run test:problem-quality-static` validates browser/Scriptable/PWA wiring and the no-progression anti-farm contracts.
- Both checks are integrated into the repository QA/static suites.
