# Phase 4D.8 — Release Governance & Reliability Investment

## Goal
Make reliability a business constraint rather than a dashboard metric. Releases, customer trust, revenue, and engineering investment now respond to operational reliability.

## Implemented

- Release requests for model and platform rollouts.
- Automatic release freeze when any component exhausts its error budget.
- High-risk release warnings when budgets are stressed but not exhausted.
- Leadership override path that increases release risk and reduces customer trust.
- Reliability investment portfolio covering observability, redundancy, data/eval reliability, and responder health.
- Reliability investments consume cash and simulated calendar time while restoring budget headroom, response quality, fatigue, or trust.
- NPC-backed SLO negotiation for stricter or looser objectives.
- Conditional SLO negotiation when responder fatigue makes stricter targets operationally unrealistic.
- Customer trust, active-account context, modeled revenue, lost revenue, and service-credit tracking.
- Resolved operational incidents now create customer/revenue consequences based on severity, duration, and family blast radius.
- Dedicated Release Governance board for release queue, freezes, investment choices, SLO negotiations, and customer impact.
- Browser/mobile and Scriptable support.

## Gameplay loop

1. Operational incidents burn component error budgets.
2. Low budgets increase governance pressure; exhausted budgets freeze releases.
3. The player chooses whether to invest in reliability, renegotiate SLOs, wait, or accept an override.
4. Outages reduce customer trust and modeled revenue.
5. Reliability work consumes resources that could have gone toward model/feature progress.
6. Better reliability creates more release headroom and lowers the long-run business cost of incidents.

## Next

Phase 4D.9 should connect governance to roadmap planning and executive pressure: quarterly reliability objectives, launch commitments, enterprise SLAs, customer escalations, support load, reliability staffing plans, and board/investor pressure around delayed frontier-model launches.
