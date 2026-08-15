# Item 13.9 — Empty / Zero-Data States

Item 13.9 makes valid zero-data conditions look intentional, educational, and actionable instead of unfinished.

## Problem

Earlier modules handled empty data independently. Some already had dark empty cards, while others rendered bare text such as:

- `No active projects.`
- `No operational incidents yet.`
- `No board votes yet.`
- `No projects yet.`
- repeated `Empty team` rows

That made empty screens visually inconsistent and often gave the player no explanation of why the state was empty or what action would make the system meaningful.

## Shared zero-data contract

`empty-state-system.js` adds a state-aware registry on top of the Item 13.8 page registry. A first-class zero-data card answers four questions:

1. **What is empty?**
2. **Why is that a valid state?**
3. **What signal causes data to appear?**
4. **What useful action can the player take next?**

The reusable card contains:

- domain icon
- contextual kicker
- descriptive title
- explanation
- `Next signal` guidance
- one or more contextual actions

The cards use Item 13 theme tokens and stay compact on desktop while turning their actions into full-width ~44px mobile targets.

## Registered zero-data states

### Model Lab — zero models

**Key:** `model-lab.no-models`

Explains that Model Lab records completed model artifacts rather than being populated manually. The action routes the player to training.

### Project Portfolio — zero projects

**Key:** `portfolio.no-projects`

Explains that zero projects means capacity has not yet been committed. The action moves focus to the project templates.

### Critical Path — zero active projects

**Key:** `critical-path.no-active-projects`

Explains why dependency analysis is undefined without active portfolio work. The action opens Project Portfolio, where the missing data is actually created.

### Operations — zero incidents

**Key:** `operations.no-incidents`

Treats a quiet incident queue as a healthy state rather than missing content. Actions direct the player to on-call coverage and incident drills.

### Hiring / Org — zero employees

**Key:** `hiring.no-employees`

Explains that ownership and management coverage remain unstaffed. Repeated per-team `Empty team` placeholder copy is hidden while the higher-level state is active. The action focuses the first real interview control.

### Governance — zero board votes

**Key:** `governance.no-votes`

Explains that governance history begins with a formal motion. The action focuses the actual board-motion controls.

### Program Management — zero launch trains

**Key:** `programs.no-trains`

Explains when program-management metrics become meaningful and directs the player to create the first launch train.

### Postmortems — zero postmortems

**Key:** `postmortems.none`

Explains that postmortems are generated from resolved incidents and routes the player back toward training/incident gameplay.

## Non-destructive integration

The zero-data layer does not replace module renderers or simulation logic.

When a registry rule is active:

1. the existing native placeholder is marked with `data-fl-zero-hidden-for`,
2. it is hidden using the HTML `hidden` state,
3. a `data-fl-zero-key` card is inserted into the relevant module surface.

When data appears, the card is removed and the original placeholder is restored if the same DOM is still present. A normal module re-render also naturally removes the old empty-state DOM.

The runtime is idempotent. Repeated synchronization cannot duplicate a card.

## Contextual actions

Zero-data actions use real simulator controls rather than explanatory dead ends.

Actions can either:

- call a real zero-argument route function, or
- scroll to and focus an existing control on the current page.

Examples:

- Critical Path → `portfolioOpen()`
- Model Lab → `gameplayGoTrain()`
- Governance → focus the first `Call vote` button
- Hiring → focus the first `Interview` button
- Portfolio → focus the first project template

## Existing empty fragments

Item 13.8 already tags many module-specific empty containers as `.fl-page-empty`. Item 13.9 additionally marks legacy `*-empty` / `.empty-state` fragments with `data-fl-zero-native="true"` so any empty content not covered by a first-class registry rule still inherits dark-theme empty-state treatment.

## Platform parity

The browser, GitHub Pages build, Scriptable WebView, and service worker all include:

- `empty-state-system.css`
- `empty-state-system.js`

The PWA cache advances to `frontier-lab-v18`.

## Regression coverage

### Static contract

`tests/empty-state-static.mjs` verifies:

- all eight registered state keys
- shared visual primitives
- canonical theme-token usage
- runtime lifecycle functions
- event-listener actions rather than inline generated handlers
- Item 13.1 empty-state inventory coverage
- Browser / Scriptable / PWA asset parity
- load order after Item 13.8
- cache version `frontier-lab-v18`

### Browser regression

`tests/empty-state-system.mjs` runs on desktop and an iPhone-sized viewport and explicitly creates:

- 0 models
- 0 projects
- 0 active critical-path projects
- 0 operational incidents
- 0 board votes
- 0 launch trains
- 0 postmortems
- 0 employees

For every state it verifies:

- exactly one zero-data card
- status semantics
- explanatory title
- `Next signal` guidance
- contextual actions
- dark surface treatment
- viewport containment
- mobile action target height
- repeated-sync idempotence

It also verifies lifecycle behavior:

- creating the first project removes the portfolio empty state
- creating the first operational incident removes the incident empty state
- Critical Path routes to Project Portfolio
- Governance focuses a real board-motion control
- Hiring focuses a real interview control

## Cumulative Item 13 static gates

13.9 also fixes a release-gate design problem exposed by adding another visual layer. Older Item 13 tests previously pinned their own historical cache version or asserted that their runtime must remain the final loaded script.

Those historical tests now enforce **monotonic contracts** instead:

- the older asset must remain present,
- it must remain after the layer it depends on,
- it must remain cached,
- the service worker must remain versioned.

Only the newest Item 13 layer pins the current cache version. This allows later visual passes to extend the stack without invalidating earlier contracts.

## RC integration

New scripts:

- `npm run test:empty-static`
- `npm run test:empty`

Both are included in `npm run test:rc` through the existing static and browser QA chains.

## Scope boundary

Item 13.9 handles **valid empty / zero-data conditions**.

It intentionally does not own:

- locked or unavailable systems — Item 13.10
- story scenes, modal overlays, incident overlays, milestones, Run Archive or Realism Audit — Item 13.11
- contrast/accessibility audit — Item 13.12
- full responsive sweep — Item 13.13
- screenshot-diff automation — Item 13.14
