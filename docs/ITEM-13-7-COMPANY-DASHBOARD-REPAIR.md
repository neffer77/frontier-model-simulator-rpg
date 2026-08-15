# Item 13.7 — Main / Company Dashboard Repair

## Goal

Repair Company/Home as a composed application dashboard rather than a growing stack of feature-owned launcher strips.

Item 13.3 removed native white browser controls. Item 13.4 normalized launcher surfaces. Item 13.6 normalized ordinary controls. Those foundations make each individual element safe, but they do not solve the structural problem created by dozens of feature modules independently inserting full-width `*-launch` buttons directly under `.game-shell`.

Item 13.7 fixes that composition problem.

## Root cause

Many Phase 4/5 modules wrap `render()` and insert their launcher directly into the Company/Home shell. Examples include:

- `.data-evals-launch`
- `.debt-launch`
- `.arch-launch`
- `.fork-launch`
- `.maint-launch`
- `.ops-launch`
- `.slo-launch`
- `.rg-launch`
- `.rp-launch`

Individually these controls can be valid, but together they form a long sequence of unrelated horizontal strips. Before Items 13.2–13.4 some of those strips also inherited browser-native light surfaces, producing VIS-001.

## Company Systems hub

`company-dashboard.js` collects top-level Company/Home launchers and moves the same button elements into one `company-system-hub` before the main `world-grid`.

No feature click handler is replaced. The organizer moves the existing DOM node, preserving:

- `onclick` behavior
- lock / disabled state
- feature-specific semantic tint
- labels and metrics
- existing module ownership
- Item 13.4 `fl-launch` behavior

The hub is a composition layer, not a replacement launcher implementation.

## Canonical groups

### Model & Engineering

Data + Evals, Model Families, Architecture, Technical Debt and Maintenance Economics.

### Operations & Releases

Operations ownership, Reliability / SLOs and Release Governance.

### Execution & People

Executive Roadmap, Workforce Planning, Project Portfolio, Critical Path, Program Management, Program Learning, organization management and related execution systems.

### Leadership & Capital

Quarterly Board, Financing / Capital, Macro / Restructuring, Governance, Executive Politics, Talent Memory, Portfolio Strategy and Investment Committee.

### External Environment

Competitive Intelligence, Ecosystem Strategy, Policy / Regulation and Public Communications.

### Other Lab Systems

A forward-compatible fallback for a future module that inserts a launcher but does not yet match a known domain signal.

## Stable ordering

The previous visible launcher order was largely an artifact of JavaScript load order and which module inserted at the same shell position last.

13.7 assigns a canonical ordering inside the groups. The organizer identifies launchers through a combination of:

- stable launcher class
- inline click handler when present
- DOM `onclick` function representation
- visible launcher text

The known VIS-001 launcher families are matched by exact class signals as well as semantic text/handler signals.

## Idempotency and dynamic modules

The organizer calculates a dashboard signature from launcher identity, group and ordering.

If the hub already contains the correct launcher set and no orphan top-level launcher exists, synchronization is a no-op. This prevents MutationObserver-driven DOM churn.

If a later feature module appends a new top-level launcher, the observer schedules another pass and absorbs it into the appropriate group or `Other Lab Systems`.

`window.frontierCompanyDashboardSync()` is exposed for QA and integrations.

## Visual behavior

`company-dashboard.css` layers after the shared Item 13 control system and uses the semantic `--fl-*` theme tokens.

Desktop behavior:

- two-column group layout
- two-column launcher grids inside populated groups
- compact card-like launchers instead of full-width strips
- consistent group headers, counts, spacing and elevation

Tablet behavior:

- group layout collapses to one column
- launcher grids retain two columns while space permits

Mobile behavior:

- one group per row
- one launcher per row
- compact launcher height and spacing
- no horizontal overflow

Existing launcher tinting remains intact through Item 13.4. The dashboard supplies layout and hierarchy rather than flattening all domains into the same color.

## VIS-001 regression protection

VIS-001 remains in `visual-qa/inventory.json` as the historical reproduction fixture.

`tests/company-dashboard.mjs` now makes its expected outcome executable on both desktop and mobile:

- exactly one Company Systems hub
- no `*-launch` / `fl-launch` controls directly under `.game-shell`
- at least eight launchers on the graduated Company/Home state
- known launcher families grouped into the expected domains
- at least seven of the nine named VIS-001-era launcher families present in the regression state
- no opaque near-white surface inside the dashboard hub
- no horizontal dashboard overflow
- desktop multi-column launcher layout
- mobile single-column launcher layout
- future launcher automatically absorbed by the fallback group
- repeated synchronization remains idempotent
- Data + Evals navigation still works after its DOM node is moved
- no page runtime errors

`tests/company-dashboard-static.mjs` verifies the grouping contract, theme-token usage, asset ordering, Scriptable parity, PWA cache parity and continued connection to the VIS-001 inventory fixture.

Both tests are part of the Item 12 release-candidate gate.

## Platform parity

The dashboard runtime and stylesheet are included in:

- browser / GitHub Pages
- Scriptable WebView
- PWA / offline cache

The service-worker cache advances from `frontier-lab-v15` to `frontier-lab-v16`.

## Scope boundary

13.7 repairs the Company/Home dashboard composition and the launcher stack that produced the original main-page regression.

It does **not** perform the full per-page module polish sweep. Individual screen interiors are handled by Item 13.8. Empty-state semantics, locked-state semantics, modal/story cleanup, accessibility contrast and broad responsive validation remain Items 13.9–13.13.