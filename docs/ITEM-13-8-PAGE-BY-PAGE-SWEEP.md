# Item 13.8 — Full Page-by-Page Module Sweep

## Goal

Apply the Item 13 visual system to every reachable simulator module, not just Company/Home, and turn the Item 13.1 route inventory into an executable release contract.

This item focuses on page-level visual consistency:

- page shell geometry,
- header geometry,
- layout/grid containment,
- horizontal overflow,
- tab-strip overflow,
- legacy empty surfaces,
- opaque near-white UI regressions,
- Browser / Scriptable / PWA parity.

It intentionally preserves each module's existing palette and information architecture.

## Inventory source

`visual-qa/inventory.json` remains the canonical screen inventory.

`page-visual-sweep.js` mirrors all 38 explicit screens and their categories/entrypoints. `tests/page-visual-sweep-static.mjs` fails if the runtime registry drifts from that inventory.

### Core

1. Company / Home
2. Training Operations
3. Hiring + Org
4. Model Lab

### Learning / engineering mastery

5. Engineer Workstation
6. Code Lab
7. Knowledge / Mastery
8. Career
9. Postmortems
10. Engineering Artifacts
11. Incident Artifacts

### Engineering organization

12. Data + Evals
13. Technical Debt
14. Architecture Portfolio
15. Model Families / Forks
16. Maintenance Economics
17. Operations
18. Reliability / SLOs
19. Release Governance

### Company execution / leadership

20. Executive Roadmap / Enterprise Pressure
21. Quarterly Board
22. Financing / Capital Strategy
23. Macro / Restructuring
24. Governance / Board
25. Executive Politics
26. People + Talent Memory
27. Organization Management
28. Workforce Planning
29. Project Portfolio
30. Critical Path
31. Program Management
32. Program Learning
33. Portfolio Strategy
34. Investment Committee

### External environment

35. Competitive Intelligence
36. Ecosystem Strategy
37. Policy + Regulation
38. Public Communications

## Runtime contract

`page-visual-sweep.js` runs after the shared surface/control systems and after the Item 13.7 Company dashboard organizer.

For the active page it sets:

- `#app[data-fl-page-id]`
- `#app[data-fl-page-category]`
- `.fl-page-shell`
- `.fl-page-head`
- `.fl-page-grid`
- `.fl-page-tabs`
- `.fl-page-empty`

The runtime exposes:

- `frontierPageSweepSync()`
- `frontierPageSweepRegistry()`
- `frontierPageSweepSet(id)`

A MutationObserver re-applies the page contract after module DOM replacement.

## Entrypoint safety

Only functions that were already zero-argument are wrapped.

This matters because Item 13.1 discovers route-like globals using both the `*Open` naming pattern and `function.length === 0`. Wrapping a record-specific function with a generic zero-argument wrapper would incorrectly make it look like a safe top-level route.

Argument-requiring functions therefore retain their original signature and implementation.

## Bright-surface repair

The page sweep includes a narrowly scoped runtime guard for legacy white surfaces.

A surface is repaired only when all of the following are true:

- it is a UI-surface/control element rather than media,
- it is visible,
- its background is at least 72% opaque,
- computed luminance is at least 0.86,
- rendered area is at least 500 square pixels,
- it is not explicitly marked `data-fl-allow-light-surface="true"`.

SVG, canvas, images, video, and color inputs are excluded.

Confirmed offenders receive `.fl-page-bright-repair`, which maps the element back onto Item 13 theme tokens.

The number of repairs on the current page is exposed as `#app[data-fl-bright-repairs]` for later visual-regression analysis.

## Overflow repair

Potentially scrollable page structures are inspected after render:

- `pre`
- `table`
- table-like classes
- grid-like classes
- row-like classes
- tab strips

If their content exceeds the available inline width and they do not already own scrolling, `.fl-page-overflow-guard` gives the element contained horizontal scrolling rather than allowing the entire document to widen.

The page shell also uses `min-width: 0` containment throughout layout descendants.

## Responsive behavior

Desktop keeps each module's existing grid structure.

On phone-sized layouts, only page-level grids are forced to one column. Nested KPI, telemetry, compatibility, and metric grids retain the module's own responsive rules.

Tab strips remain horizontally scrollable when necessary.

## Empty-state compatibility

Legacy `*-empty`, `.empty-state`, and `.fl-empty` elements are normalized into a dark dashed surface with shared spacing and text hierarchy.

This is a structural visual cleanup only. Item 13.9 remains responsible for the content and gameplay quality of zero-data states.

## Category accents

Each inventory category receives a shared accent variable without replacing module-specific colors:

- core → cyan
- learning → blue
- engineering → teal
- company → gold
- external → bright cyan

The category accent currently feeds shared focus behavior and is available to future page-level primitives.

## Browser regression

`tests/page-visual-sweep.mjs` opens every one of the 38 explicit inventory pages on:

- 1440 × 1000 desktop
- 390 × 844 mobile

For every page it verifies:

1. a zero-argument entrypoint exists,
2. the entrypoint does not throw,
3. the runtime assigns the correct inventory page ID,
4. the correct category is assigned,
5. a normalized page shell exists,
6. the primary shell carries the same page ID,
7. document width stays within the viewport tolerance,
8. no opaque near-white UI surfaces remain after the repair pass,
9. no new browser runtime error occurs.

This produces 76 explicit route/device checks per run before the existing release-candidate gate continues.

## Static regression

`tests/page-visual-sweep-static.mjs` verifies:

- exact inventory/registry coverage,
- category parity,
- entrypoint parity,
- runtime repair contracts,
- theme-token usage,
- Browser load ordering,
- Scriptable parity,
- PWA cache parity,
- service-worker version `frontier-lab-v17`.

## Platform integration

Browser:

- `page-visual-sweep.css` loads last.
- `page-visual-sweep.js` runs last.

Scriptable:

- both files are in the launcher asset arrays.

PWA:

- both files are cached.
- cache advances from `frontier-lab-v16` to `frontier-lab-v17`.

Release gate:

- `test:pages-static` is part of `test:static`.
- `test:pages` is part of `test:qa`.
- both therefore run through `test:rc`.

## Scope boundary

Item 13.8 does not absorb the remaining roadmap work:

- **13.9** — dedicated empty/zero-data state content and behavior
- **13.10** — locked/unavailable states
- **13.11** — modals, overlays, story scenes and special surfaces
- **13.12** — contrast/accessibility audit
- **13.13** — broader responsive/device sweep
- **13.14+** — automated screenshot regression, route crawler and release integration

The purpose of 13.8 is to ensure every normal module page now sits on the same visual foundation before those specialized state passes begin.
