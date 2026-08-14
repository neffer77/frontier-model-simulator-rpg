# Item 13.1 — Visual Inventory + Reproduction Matrix

## Goal

Before changing theme colors or patching individual pages, establish a reproducible inventory of every visual surface that can drift away from the simulator's dark UI.

This item does **not** fix styling. It makes the styling work measurable so Items 13.2–13.8 can be applied systematically rather than one screenshot at a time.

## User-reported baseline defects

Two defects are explicitly registered in `visual-qa/inventory.json` from the screenshots supplied on 2026-08-14.

### VIS-001 — Company dashboard bright bars

Observed on the main Company/Home page in the early/empty campaign state.

Large bright white horizontal surfaces appear between otherwise dark dashboard launchers, including the region around:

- Executive Roadmap
- Operations
- Model Families
- Architecture / Tech Debt / Data + Evals launchers

Expected behavior: dashboard rows, disclosures, empty states and spacer surfaces stay within the simulator's dark surface system.

### VIS-002 — Critical Path orphan white control

Observed on the empty Critical Path screen.

A small bright white rectangle/control appears in the upper-right header area while the rest of the screen is dark.

Expected behavior: page-header controls use the same themed dark/outlined control styling as the rest of the simulator.

These are baseline reproduction targets. Item 13 styling work is not complete until both disappear from the generated atlas on desktop and mobile.

## Machine-readable inventory

`visual-qa/inventory.json` defines:

- desktop and phone viewport targets,
- the five state classes used during the sweep,
- the two known screenshot defects,
- 38 named application screens,
- cross-cutting overlays and transient UI,
- candidate entrypoint functions for each screen,
- required state coverage for later visual QA,
- runtime discovery rules so newly added `*Open` screens cannot silently escape the inventory.

### State classes

| State | Meaning |
| --- | --- |
| Locked | Visible before the guided campaign unlocks the system/action |
| Unlocked | Available after guided-campaign graduation |
| Empty | Valid page with zero domain records where supported |
| Populated | Representative records/models/projects/actions rendered |
| Error | Incident, warning, failed, blocked or destructive state where supported |

The matrix deliberately lists more states than Item 13.1 automatically synthesizes. That is intentional: the inventory is the contract for the later page/state sweeps, while 13.1 provides the baseline automation and representative fixtures.

## Explicit screen inventory

### Core + learning surfaces

- Company / Home
- Training Operations
- Hiring + Org
- Model Lab
- Engineer Workstation
- Code Lab
- Knowledge / Mastery
- Career
- Postmortems
- Engineering Artifacts
- Incident Artifacts

### Engineering systems

- Data + Evals
- Technical Debt
- Architecture Portfolio
- Model Families / Forks
- Maintenance Economics
- Operations
- Reliability / SLOs
- Release Governance

### Company / executive systems

- Executive Roadmap / Enterprise Pressure
- Quarterly Board
- Financing / Capital Strategy
- Macro / Restructuring
- Governance / Board
- Executive Politics
- People + Talent Memory
- Organization Management
- Workforce Planning
- Project Portfolio
- Critical Path
- Program Management
- Program Learning
- Portfolio Strategy
- Investment Committee

### External-world systems

- Competitive Intelligence
- Ecosystem Strategy
- Policy + Regulation
- Public Communications

### Cross-cutting surfaces

The screenshot collector also captures representative versions of:

- founder/run configuration,
- first story scene,
- early locked Company/Home,
- locked More sheet,
- empty Training Operations,
- graduated/unlocked Company/Home,
- unlocked More sheet,
- populated Company/Home,
- populated Model Lab,
- active incident investigation,
- technical explainer modal,
- milestone celebration,
- company-priority decision,
- Technical Realism Audit,
- Run Archive / New Game+.

PWA installation remains listed as a manual state because Chromium CI cannot faithfully reproduce the iOS Safari Add to Home Screen sheet.

## Screenshot collector

Run:

```bash
npm run visual:inventory
```

The collector expects the same local production artifact used by Item 12:

```bash
npm run build:site
python3 -m http.server 4173 --directory _site
npm run visual:inventory
```

Output is written to:

```text
artifacts/visual-inventory/
  desktop/
    001-founder.png
    ...
  mobile/
    001-founder.png
    ...
  report.json
  MATRIX.md
```

Generated artifacts are intentionally ignored by Git.

## What the collector records

For every captured state it stores:

- screenshot filename,
- viewport,
- current `state.view`,
- visible page heading,
- body dimensions,
- DOM node count,
- entrypoint used,
- page/runtime errors observed while opening the route,
- suspicious bright surfaces.

## Bright-surface discovery

The scanner records visible elements with a mostly opaque, near-white computed background and non-trivial area.

This is designed specifically to surface the failure class visible in the supplied screenshots: an old or unscoped button/card/disclosure silently falling back to a browser-light/default surface inside an otherwise dark application.

**13.1 does not fail because a bright surface exists.** The report is diagnostic at this stage. Items 13.2–13.6 will define the canonical colors/components, and a later Item 13 visual-regression gate can convert confirmed bad surfaces into blocking assertions.

## Runtime route discovery

The explicit matrix is not the only source of truth.

At runtime the collector also discovers zero-argument global functions matching:

```text
^[A-Za-z][A-Za-z0-9_]*Open$
```

Any opener not already represented by the explicit matrix is captured and written to the generated report. This is important because the simulator is built from many independently composed modules and new page entrypoints can otherwise be added without updating the visual checklist.

## CI integration

The pull-request browser workflow now runs:

```text
Item 12 RC regression → Item 13.1 visual inventory
```

The visual inventory is generated against the assembled `_site` production artifact, not the repository root.

GitHub Actions uploads the result as a `visual-inventory-*` artifact for 14 days. The artifact is uploaded even when a later step fails, so screenshots remain available for debugging.

## Item 13.1 completion criteria

Item 13.1 is complete when:

- the explicit screen/state matrix exists,
- the supplied Company/Home and Critical Path defects are registered as baseline reproductions,
- desktop and mobile screenshot capture is automated,
- representative locked, unlocked, empty, populated and error states exist in the atlas,
- all primary route entrypoints are checked,
- newly introduced zero-argument `*Open` pages are runtime-discovered,
- bright/default-looking surfaces are reported with element metadata,
- CI publishes the atlas as an artifact.

The next implementation item is **13.2 — Global theme tokens**. The findings from this atlas should drive those tokens rather than introducing more per-page color exceptions.
