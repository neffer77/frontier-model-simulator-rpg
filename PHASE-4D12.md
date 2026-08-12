# Phase 4D.12 — Macro Shocks, Term-Sheet Negotiation & Distressed Restructuring

Phase 4D.12 adds external financing conditions and distressed-company decisions to the frontier-model company simulation.

## Macro shocks

Players can trigger capital-market tightening, GPU supply shocks, AI demand booms, and regulatory shocks. These conditions affect valuation, investor patience, and compute economics, changing the leverage available in later financing decisions.

## Term sheets

Financing now has visible terms rather than only cash and dilution. Clean preferred, control-heavy, and rescue term sheets differ in valuation, liquidation preference, covenant pressure, and board-seat rights.

Accepting a term sheet updates cash, dilution, investor ownership, board control, liquidation preferences, and covenant pressure. Poor market conditions and runway crises make the same amount of capital materially more expensive.

## Distressed restructuring

When runway is low, the company can restructure debt and equity. Restructuring reduces debt burden and debt service but also damages valuation, founder ownership, employee ownership, and board confidence.

This is intentionally a survival tool rather than a free optimization.

## Secondary liquidity

Founders can sell a limited amount of secondary stock. This provides liquidity without increasing company cash and shifts ownership toward investors.

## Strategic acquisition offers

The company can solicit acquisition offers from hyperscalers, rival frontier labs, or enterprise platform companies. Offer value is affected by valuation and distress. Accepting an offer records an acquired-company outcome while preserving the simulated state/history.

## Integration

Phase 4D.12 builds directly on Phase 4D.11 financing, Phase 4D.10 valuation/runway, and the existing board/investor systems. Browser/mobile and Scriptable WebView builds load the new module.

## Next

Phase 4D.13 should model post-financing governance and founder-control conflicts: protective provisions, board votes, CEO replacement risk, recapitalization proposals, employee retention packages, and acquisition integration outcomes.
