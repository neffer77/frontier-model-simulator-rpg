# Phase 4D.32 — AI Safety Governance, Frontier Risk, Evaluations & Deployment Decisions

Phase 4D.32 adds a deployment-governance layer for increasingly capable models.

## Capability-risk tiers

The proposed frontier model receives a dynamic capability score and a corresponding Standard, Elevated, Frontier, or Critical risk tier. Competitive pressure can increase effective capability pressure, representing the temptation to race faster as rivals improve.

## Evaluation suites

Five safety-evaluation suites are available: misuse/dangerous capability, cyber capability, bio-risk capability, autonomy/agentic behavior, and instruction-following/alignment.

Each evaluation generates a risk signal and a coverage score. Results are deliberately noisy. Re-running evaluations can change the observed signal, and stronger evaluator skill, red-team maturity, and safety maturity increase coverage.

## Uncertainty

Evaluation evidence reduces uncertainty but never eliminates it. This prevents a single passing benchmark from being treated as proof of safety.

The deployment gate therefore depends on both measured signals and remaining uncertainty.

## Mitigation work

Players can invest in safety mitigations. Mitigation work lowers residual risk and improves safety maturity, but it consumes cash and slightly reduces short-term execution capacity.

This makes mitigation a real schedule/resource decision instead of a free checklist action.

## Safety review board

The company can strengthen an independent safety-review function. Review-board maturity contributes to the deployment gate and can improve board confidence.

## Residual risk

Residual risk combines model capability, evaluation signals, uncertainty, evaluation coverage, mitigations, safety maturity, and review-board strength.

No single factor is sufficient on its own.

## Deployment gate

A full deployment requires substantial evaluation completeness and coverage, residual risk below the configured threshold, and a sufficiently mature review board.

The player can instead choose to delay for more evidence or use a limited deployment when risk is lower but the full gate is not yet satisfied.

## Executive override

The player can override the safety gate and deploy anyway. This preserves agency but raises residual risk, regulatory pressure, communications pressure, and board concern.

The mechanic is intentionally modeled as a consequential governance failure rather than a shortcut with only upside.

## Integration

Phase 4D.32 integrates with competitive pressure, evaluator skills, red-team maturity, execution capacity, customer trust, public communications, regulatory risk, and board confidence.

Browser/mobile and Scriptable builds both load the AI-safety-governance module.

## Next

Phase 4D.33 should add executive endgames: CEO succession, founder/board control, IPO readiness, acquisition offers, leadership legacy, and long-term company outcomes.