# Item 13.4 — Shared Panel/Card System

## Goal

Give Frontier Lab one reusable visual grammar for recurring UI surfaces instead of letting every feature module invent its own card, KPI, launcher, row, empty state, and badge treatment.

This builds on:

- Item 13.1 visual inventory
- Item 13.2 semantic theme tokens
- Item 13.3 browser-default styling firewall

## Canonical primitives

New UI should use these classes directly:

| Primitive | Purpose |
| --- | --- |
| `fl-panel` | large application panel / primary surface |
| `fl-card` | ordinary card or contained domain object |
| `fl-kpi-grid` | metric/summary group |
| `fl-kpi` | individual KPI / metric tile |
| `fl-launch` | dashboard launcher / system entry row |
| `fl-row` | recurring list or status row |
| `fl-actions` | button/action group |
| `fl-empty` | intentional zero-data state |
| `fl-badge` | compact status/counter/chip |
| `fl-section-head` | page/section header treatment |

All shared primitives consume Item 13.2 `--fl-*` semantic tokens.

## Legacy compatibility adapter

Rewriting every Phase 4/5 module in one PR would be risky and would make future maintenance worse. `shared-surface-system.js` therefore decorates existing DOM after every render.

Stable naming conventions are mapped automatically:

- `*-launch` → `fl-launch`
- `*-card` → `fl-card`
- `*-summary` → `fl-kpi-grid`, with direct children → `fl-kpi`
- `*-row` → `fl-row`
- `*-actions` → `fl-actions`
- `*-head` → `fl-section-head` except incident/progress headers
- `*-badge`, `*-pill`, `*-tag`, core `status`, and core `counter` → `fl-badge`
- classes containing `empty` → `fl-empty`

The adapter also covers legacy structures that predate those naming conventions, including Operations rotations/incidents, Maintenance family/event cards, Roadmap grid articles, and dependency cards.

A `MutationObserver` decorates newly inserted views, so late render wrappers and future modules participate automatically.

## Specialized cards intentionally excluded

These remain visually specialized because they serve cinematic or meta-product roles rather than ordinary application surfaces:

- founder setup
- story scenes
- milestone celebrations
- Technical Realism Audit cards
- Replay / Run Archive cards

Those surfaces are handled by later Item 13 passes.

## Launcher color behavior

Shared launchers normalize:

- radius
- spacing
- text hierarchy
- shadow/elevation
- hover behavior
- keyboard focus
- minimum touch/visual size

They do **not** erase intentional domain color. Before a legacy launcher receives `fl-launch`, the adapter captures its computed background and border into `--fl-launch-bg` and `--fl-launch-border`.

That allows, for example, Technical Debt to keep danger tinting and Data + Evals to keep its own semantic accent while still sharing one launcher structure.

## Platform parity

The shared system is included in:

- normal browser / GitHub Pages
- Scriptable WebView
- PWA/offline cache

The service-worker cache advances to `frontier-lab-v13`.

## Regression coverage

### Static

`tests/shared-surface-static.mjs` verifies:

- all ten primitives exist
- semantic theme tokens are consumed
- stylesheet layering occurs after the browser-default firewall
- the compatibility adapter runs after feature render layers
- Browser, Scriptable, and PWA contain both assets
- structural suffix rules and specialized-card exclusions remain present
- the MutationObserver and public QA decorator remain available

### Browser

`tests/shared-surface-system.mjs` runs on desktop and mobile and verifies:

- core panels become `fl-panel`
- dashboard launchers become `fl-launch`
- launcher radius is consistent
- Critical Path and Roadmap cards become `fl-card`
- Roadmap summary metrics become shared KPI tiles
- dynamically inserted future `*-card`, `*-launch`, `*-summary`, `*-row`, `*-actions`, `*-empty`, and `*-badge` elements are normalized automatically
- story-scene cards remain specialized
- no runtime errors are introduced

## Scope boundary

13.4 establishes and adopts the shared surface system. It does not yet perform the dedicated progressive-disclosure cleanup (13.5), complete button/control normalization (13.6), or the exhaustive page-by-page visual polish pass (13.7–13.11).
