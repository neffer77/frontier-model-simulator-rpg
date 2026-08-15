# Item 13.13 — Responsive Visual Sweep

## Goal

Make every simulator screen compose intentionally across phone portrait, phone landscape, tablet, desktop, and wide desktop without introducing page-level horizontal overflow, clipped controls, inaccessible fixed chrome, or oversized overlays.

This item is a cross-device composition pass. It does not replace the existing responsive gameplay shell or redesign individual modules. Earlier layers continue to own gameplay structure, shared surfaces, controls, empty states, locks, overlays, and accessibility. Item 13.13 is the final layout layer that reconciles those systems at real viewport sizes.

## Why this item exists

Before 13.13 the simulator had several responsive mechanisms:

- legacy feature-specific media queries
- the responsive gameplay shell
- page-level overflow guards from Item 13.8
- mobile touch/text accessibility rules from Item 13.12
- overlay containment from Item 13.11

Those systems handled many individual cases, but they did not share one definition of what constituted a phone, landscape phone, tablet, desktop, or wide desktop.

That created several risks:

1. A page could avoid document overflow at 390px and 1440px but break at 834px.
2. Phone landscape could inherit tablet-like width assumptions even though its height is only about 390px.
3. A wide planning table could widen the entire document instead of scrolling locally.
4. Fixed bottom navigation could fit portrait but collide with safe areas or viewport height after rotation.
5. Story, incident, and explainer overlays could be technically scrollable while still using too much vertical chrome in landscape.
6. Wide desktop could leave the simulator as an unnecessarily narrow island even when useful horizontal space existed.

## Canonical responsive modes

The runtime exposes five stable modes.

### `phone-portrait`

Classification:

- width <= 600px
- portrait orientation

Canonical QA viewport:

- 390 × 844

Design intent:

- one primary decision column
- two-column compact resource/telemetry metrics where useful
- single-column launcher/content grids
- fixed five-destination bottom navigation
- safe-area-aware horizontal and bottom spacing

### `phone-landscape`

Classification:

- landscape orientation
- height <= 600px
- width <= 1000px

Canonical QA viewport:

- 844 × 390

This is deliberately a separate mode from tablet.

The limiting resource is vertical height, not horizontal width. Therefore this mode:

- keeps one main work column
- uses four resource columns and three telemetry columns when width permits
- compacts bottom navigation
- hides the supplementary gameplay-guide copy while preserving the current objective
- reduces story art/avatar/dialogue chrome
- tightens incident and overlay spacing
- permits two Company system groups side by side

### `tablet`

Classification:

- width < 1100px after phone-specific rules

Canonical QA viewport:

- 834 × 1112

Design intent:

- one major work column
- two-column secondary Company grouping
- three-column More-sheet system grid
- preserve useful information density without forcing desktop dashboard geometry

### `desktop`

Classification:

- width >= 1100px and < 1600px

Canonical QA viewport:

- 1440 × 1000

Design intent:

- preserve the dense existing simulator layout
- ensure all grid children can shrink
- keep tables locally scrollable only when necessary

### `wide`

Classification:

- width >= 1600px

Canonical QA viewport:

- 1920 × 1080

Design intent:

- expand the main simulator shell to a maximum of 1680px
- use three Company system groups per row
- use four columns in the More-sheet system grid
- retain readable line lengths and avoid stretching controls across the full monitor

## Runtime contract

`responsive-visual-sweep.js` exposes:

- `frontierResponsiveSync()`
- `frontierResponsiveMode()`
- `frontierResponsiveRegistry()`
- `frontierResponsiveAudit()`

The runtime records:

- `data-fl-responsive-sweep="1"`
- `data-fl-responsive-mode`
- `data-fl-responsive-orientation`

on the document, and mirrors mode/orientation onto `#app` when present.

It also publishes the measured viewport through CSS custom properties:

- `--fl-viewport-width`
- `--fl-viewport-height`

## Live viewport changes

The responsive system responds to:

- `resize`
- `orientationchange`
- `visualViewport.resize`
- `ResizeObserver`
- dynamically inserted DOM through `MutationObserver`

This matters for:

- iPhone orientation changes
- iPad split-view resizing
- Scriptable WebView resizing
- desktop browser resizing
- PWA window changes

The page does not require a reload to change responsive mode.

## Local table containment

A table is left in its original DOM when it fits its available width. When it would overflow the page, the runtime temporarily moves it into `.fl-responsive-table-wrap`.

The overflow wrapper:

- remains inside the page width
- scrolls horizontally when necessary
- uses momentum scrolling on touch devices
- prevents the table from widening the document
- becomes `role="region"`
- becomes keyboard-focusable
- is labeled as a horizontally scrollable table region

When a resize or orientation change gives the table enough space again, the runtime restores the table to its original parent and removes the responsive wrapper entirely. This removes the extra scroll region, ARIA label, and keyboard stop rather than leaving permanent responsive markup behind.

This reversible behavior keeps narrow-screen table scrolling discoverable without changing the desktop DOM when no containment is needed.

## Other local scrolling surfaces

The runtime detects overflow for common horizontal surfaces including:

- engineering role navigation
- page tabs
- incident evidence tabs
- More-sheet system navigation
- campaign progress dots
- model lineage
- preformatted code/log blocks

When needed they receive `.fl-responsive-local-scroll` rather than causing document-level overflow.

## Phone portrait composition

The final CSS layer normalizes phone portrait around one primary work column.

It collapses page/content grids while intentionally preserving compact metric structures such as:

- resource strip
- telemetry grid
- campaign dots
- bottom navigation
- rack visualizations
- sparkline visualizations

This avoids the opposite failure mode where every two-column micro-layout becomes a long one-column list and the simulator loses useful information density.

## Phone landscape composition

Landscape phone rules prioritize usable vertical space.

The gameplay guidance area keeps the actionable objective but hides supplementary guidance copy.

Bottom navigation is compressed to a smaller safe-area-aware bar while retaining all five destinations and accessible target sizing.

Story scenes reduce:

- hero-art minimum height
- avatar size
- dialogue padding
- aside padding

Incidents reduce nonessential vertical padding while preserving evidence and decisions.

All overlays remain bounded to approximately the full dynamic viewport height using `100dvh`.

## Tablet composition

Tablet deliberately uses a hybrid layout:

- one major simulator work column
- two Company-system group columns
- one launcher column inside each Company group
- three More-sheet columns

This prevents desktop dashboard density from becoming cramped while avoiding the excessive vertical length of a fully phone-like layout.

## Wide desktop composition

At 1600px and above:

- game shell / guidance / campaign progress can expand to 1680px
- Company systems use three groups per row
- More uses four system columns

The design still caps the main content width instead of filling an ultrawide monitor edge to edge.

## Safe-area behavior

Phone/tablet fixed chrome uses:

- `env(safe-area-inset-left)`
- `env(safe-area-inset-right)`
- `env(safe-area-inset-bottom)`

This protects navigation and content from device cutouts and home-indicator regions.

## First-paint fallback

Runtime data attributes are the canonical responsive contract, but CSS also contains media-query fallbacks for:

- phone portrait
- short landscape phone
- wide desktop

This prevents an obviously incorrect desktop composition from flashing before the responsive runtime decorates the document.

## QA reproduction matrix

`visual-qa/responsive-matrix.json` is the machine-readable source for canonical responsive QA.

It defines:

- viewport ID
- human-readable name
- width / height
- mobile/touch context
- expected Company-system columns
- expected resource columns
- expected world-grid columns
- expected bottom-nav columns

Item 13.14 visual screenshot regression and Item 13.15 route crawling can reuse this same matrix rather than inventing new viewport definitions.

## Static regression

`tests/responsive-visual-static.mjs` verifies:

- all five modes exist in runtime and CSS
- runtime viewport definitions match the QA matrix
- breakpoint classifier contracts
- resize/orientation observers
- reversible table containment and conditional table-region semantics
- safe-area usage
- dynamic viewport-height usage
- local scrolling primitives
- first-paint fallbacks
- wide-screen maximum width
- Browser/Scriptable/PWA asset parity
- service-worker cache version
- RC package scripts

## Browser regression

`tests/responsive-visual-sweep.mjs` uses all five canonical viewports.

For each viewport it verifies:

1. correct runtime mode
2. intro story viewport containment
3. expected Company-system group columns
4. expected resource-strip columns
5. expected main world-grid columns
6. five-column bottom navigation
7. bottom-nav viewport containment
8. More-sheet containment
9. technical explainer containment
10. incident containment
11. wide-table local scrolling and accessibility semantics
12. no page-level horizontal overflow
13. page-shell containment
14. table-wrapper containment
15. no new runtime errors

It then opens every screen from the Item 13.1 visual inventory at that viewport and repeats document/page containment checks.

With 38 inventory screens, this produces 190 page/viewport route checks before the dedicated overlay/table/resize checks.

## Live resize regression

The browser suite also performs an in-place resize lifecycle without reloading:

1. start at desktop
2. insert a table that fits desktop and verify it remains unwrapped
3. resize to 390 × 844
4. verify responsive mode becomes `phone-portrait`
5. verify the table is wrapped, becomes locally scrollable, and gains region semantics
6. resize back to desktop
7. verify the wrapper is removed and the table returns to its original parent

This specifically protects orientation/split-view behavior and prevents responsive helper markup from becoming permanent after the viewport expands again.

## Platform integration

Browser/GitHub Pages:

- `responsive-visual-sweep.css` loads after Item 13.12
- `responsive-visual-sweep.js` runs after Item 13.12

Scriptable:

- both assets are mirrored in the launcher in identical order

PWA:

- both runtime assets are cached
- service-worker cache advances to `frontier-lab-v22`

Release gate:

- `test:responsive-static`
- `test:responsive`

are part of the Item 12 RC pipeline.

## Scope boundary

13.13 does not implement screenshot pixel-diffing. That is Item 13.14.

13.13 does not build the full route/page crawler release gate. That is Item 13.15.

13.13 does not define the final release gate policy around those visual checks. That is Item 13.16.

13.13 establishes the responsive layout contract those later systems will consume.
