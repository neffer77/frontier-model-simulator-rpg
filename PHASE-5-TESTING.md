# Phase 5 Testing Checklist

## Smoke test

1. Start a fresh game in the browser.
2. Confirm the company view renders without console errors.
3. Open Programs, Portfolio, Investment Committee, Competition, Policy, Legal, Risk, Resilience, Security, AI Safety, Endgame, and Integrated Simulation.
4. Confirm returning to the company view preserves state.
5. Open the Phase 5 Command Center and verify company health stays between 0 and 100.
6. Confirm the three priorities are the lowest current health dimensions.
7. Run the same flow in Scriptable.

## Save compatibility

- Load a save created before Phase 5.
- Confirm `state.phase5` is created lazily.
- Confirm no existing phase state is reset.
- Make a decision, save, reload, and verify the decision persists.

## Balance probes

- Maximize speed while neglecting security/safety and verify risk systems worsen.
- Maximize controls/security/safety and verify execution or cash tradeoffs remain visible.
- Overreact to competitive pressure and verify company health can deteriorate elsewhere.
- Build a balanced institution and verify endgame readiness improves across multiple paths.

## Replay probes

- Use the same integrated-simulation seed and scenario twice and compare event order.
- Change scenario preset and confirm difficulty-adjusted grade changes appropriately.
- Record a final score and verify the scorecard and endgame outcome are preserved.

## Mobile UX

- Test narrow portrait width.
- Confirm command-center grids collapse cleanly.
- Confirm buttons remain tappable and text does not overflow cards.
- Confirm long system names remain readable.

## Known browser-shell item

`integrated-simulation.js`, `integrated-simulation.css`, `phase5-integration.js`, and `phase5-integration.css` must be explicitly linked by `index.html` for the browser build. The GitHub connector blocked the large shell replacement during this implementation. Scriptable does include these assets explicitly.
