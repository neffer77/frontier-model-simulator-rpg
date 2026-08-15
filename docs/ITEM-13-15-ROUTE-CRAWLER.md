# Item 13.15 — Route / Page Crawler

## Goal

Turn the Item 13 visual inventory into a release-gated route contract. Every canonical simulator page must be openable, correctly identified, non-blank, responsive, recoverable to Company/Home, and free of uncaught runtime errors across all five canonical responsive modes.

Item 13.15 reuses the two sources of truth established earlier:

- `visual-qa/inventory.json` — canonical 38-screen page inventory and route entrypoint candidates
- `visual-qa/responsive-matrix.json` — canonical five-viewport responsive matrix

No second route list or viewport list is introduced.

## Canonical crawl matrix

The crawler visits every inventory page at:

- Phone portrait — 390 × 844
- Phone landscape — 844 × 390
- Tablet portrait — 834 × 1112
- Desktop — 1440 × 1000
- Wide desktop — 1920 × 1080

With 38 inventory screens this produces:

**38 pages × 5 viewports = 190 required route visits.**

A missing visit is a release failure.

## Per-route contract

For every route/viewport pair the crawler verifies:

1. At least one declared zero-argument entrypoint exists.
2. Invoking the route does not throw.
3. Item 13 page normalization resolves the expected `data-fl-page-id`.
4. The normalized category matches the inventory category.
5. The responsive runtime reports the canonical viewport mode being tested.
6. A visible `.fl-page-shell` exists and has non-zero dimensions.
7. The resulting page contains meaningful text and is not a blank render.
8. The page does not widen the document beyond the viewport tolerance.
9. No uncaught `pageerror` is emitted while opening the route.
10. Returning through the canonical Home navigation restores `company-home`.

The crawl therefore tests route execution and route identity rather than only checking that JavaScript functions exist.

## Runtime registry drift

At each viewport the crawler compares `frontierPageSweepRegistry()` against `visual-qa/inventory.json`.

It fails when:

- an inventory page is missing from the runtime registry
- the runtime registry contains an unknown page id

This prevents the QA inventory and runtime page-normalization layer from silently diverging.

## Runtime `*Open` discovery

The inventory already defines a runtime discovery pattern for zero-argument global functions whose names end in `Open`.

Item 13.15 executes that discovery once on canonical desktop and probes each discovered opener.

An opener may legitimately produce a modal, dialog, sheet, or other non-page surface. Those are recorded as non-page openers rather than treated as routes.

The crawler fails when a discovered opener:

- navigates to a page id that is not present in the inventory
- navigates to a known page but is not represented by the inventory's route-entrypoint mapping

This is the orphan-page safety net. Adding a new page without adding it to the canonical inventory can no longer silently bypass the release crawl.

## Navigation reference graph

The crawler also builds a diagnostic graph of visible route references found in:

- Company/Home
- the More sheet
- every canonical route after it opens

It inspects visible navigation controls for references to the inventory's declared route-entrypoint functions and records edges from the current page/surface to the target page.

The graph is intended to detect pages that still technically exist but have lost their user-facing launcher.

Because some UI layers may use JavaScript event listeners instead of inline/data-attribute references, graph reachability uses a confidence rule:

- when at least 75% of non-home pages are discoverable through route references, missing targets are treated as route-graph orphan failures
- below 75% discovery coverage, gaps remain warnings because the DOM inspection mechanism is not sufficiently representative of the navigation architecture

This lets the graph hard-fail isolated launcher regressions in an inline-navigation architecture without producing false failures if the app migrates to event-listener-based routing.

## Generated evidence

Every run writes:

- `artifacts/route-crawl/report.json`
- `artifacts/route-crawl/REPORT.md`

The JSON report includes:

- every route/viewport visit
- viewport summaries
- failure and warning records
- runtime `*Open` discovery results
- route-reference graph edges
- orphan runtime page findings

The Markdown report summarizes coverage and is optimized for GitHub Actions artifact review.

## Commands

Browser crawler:

```bash
npm run test:routes
```

Static contract:

```bash
npm run test:routes-static
```

The static contract verifies the canonical 38 × 5 matrix, inventory metadata, route-crawler safety markers, package scripts, and cumulative QA integration.

## CI integration

`test:routes-static` is part of `test:static`.

`test:routes` is part of `test:qa`.

The Cross-device browser QA workflow uploads `artifacts/route-crawl` with `if: always()` so failure diagnostics survive a red build.

The workflow timeout is increased to 30 minutes because the release candidate now includes the existing browser suites, a 190-visit route crawl, visual inventory generation, and the 255-capture Item 13.14 screenshot regression.

## Scope boundary

Item 13.15 does not decide the final policy for how screenshot regression, route crawling, responsive checks, accessibility, and other Item 13 signals combine into the final release decision. That policy is Item 13.16.

Item 13.15 provides the route/page evidence and hard route-integrity failures that Item 13.16 can consume.
