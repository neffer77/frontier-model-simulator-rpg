# Item 13.12 — Contrast / Accessibility Sweep

## Goal

Make Frontier Lab consistently operable and understandable when the player uses keyboard navigation, screen-reader semantics, text scaling, reduced motion, high-contrast preferences, touch input, or forced-colors rendering.

This item is a cross-cutting hardening layer. It does not redesign individual simulation modules and it does not claim formal accessibility certification from automated tests alone.

## Layering

13.12 loads after Item 13.11 so it sees the final page, control, lock, empty-state, and overlay DOM:

1. theme tokens
2. module CSS/runtime
3. Items 13.3–13.11 shared visual systems
4. `accessibility-system.css`
5. `accessibility-system.js`

That makes accessibility the final semantic/interaction guard rather than forcing every legacy module to be rewritten independently.

## Contrast floor

The accessibility stylesheet raises the previously weakest semantic text tokens:

- `--fl-text-subtle` → `#7487a7`
- `--fl-text-disabled` → `#7183a1`
- `--fl-disabled-text` → `#7183a1`

The static gate calculates relative luminance and contrast instead of checking color strings only. Current canonical ratios are approximately:

| Pair | Ratio |
|---|---:|
| Primary / surface 2 | 16.71:1 |
| Secondary / surface 2 | 10.87:1 |
| Muted / surface 2 | 7.02:1 |
| Subtle / surface 2 | 5.11:1 |
| Disabled / disabled surface | 4.84:1 |
| Accent / surface 2 | 12.23:1 |
| Warning / warning surface | 10.97:1 |
| Danger / danger surface | 8.13:1 |
| Success / success surface | 9.47:1 |

Known legacy microcopy classes that still carried raw colors are bridged back to the semantic palette, including `.sub`, `.sim-note`, `.incident-tip`, tier/technology helper copy, knowledge labels, and company-system helper text.

## Focus and keyboard navigation

13.12 establishes one keyboard-focus language across buttons, links, inputs, selects, textareas, summaries, and custom tabindex controls:

- 3px focus outline
- shared focus color token
- 3px outline offset
- shared focus halo
- scroll margin so focused controls are not pinned against viewport edges

A `Skip to current workspace` link is inserted as the first body control. Activating it explicitly focuses `#app`, avoiding browser/WebView differences in fragment-only focus behavior.

### Incident tabs

The existing Metrics / Systems / Data control becomes a real tab set:

- tablist role and label
- tab role
- `aria-selected`
- one tab in the sequential tab order
- Left/Right arrow navigation
- Home/End navigation
- keyboard activation uses the existing `inspectTab()` behavior

### Engineering role navigation

The role bar receives an accessible navigation label and each role button exposes `aria-pressed` so selection is not communicated by color alone.

## Progress semantics

Visual progress indicators are decorated with progressbar semantics and numeric values where the simulation already exposes the value:

- training progress
- Item 8 training progress strip
- story-scene progress
- campaign chapter progress
- locked-system unlock progress

The visual tracks also receive a structural outline so state is not communicated by fill color alone.

## Accessible names and forms

The adapter audits every visible button and form field.

For legacy controls where a safe name can be derived, it adds one automatically:

- symbol-only close buttons (`×`, `✕`, `✖`)
- More/options symbols
- add/remove symbols
- fields with an ID/name/placeholder but no associated label

Existing explicit labels and ARIA names always win.

External links opened in a new tab receive an accessible-name suffix that announces that behavior.

## Heading structure and live updates

Every rendered workspace has an H1. Existing module H1s are preserved; pages that only expose H2-level visual headings receive an offscreen page H1 derived from the current page title.

A polite live region is available through `frontierA11yAnnounce()`. Workspace-title changes announce `Opened <page>` without changing the visual UI.

Existing transient game feedback is also decorated:

- game-feel toast → polite status
- company ticker → polite status
- live incident panel → `alertdialog`
- decorative incident alarm glyph → hidden from assistive technology

## Tables

Legacy tables are normalized so header cells receive scope when absent:

- `thead th` → `scope="col"`
- `tbody th` → `scope="row"`

This is intentionally additive and does not replace explicit module-authored table semantics.

## Target sizing

Base interactive target floor: 24 CSS px.

Touch/mobile target floor: approximately 44 CSS px for ordinary controls.

Inline technical-term/help controls use a compact 32px exception to avoid destroying prose layout while remaining materially larger than the original inline hit area.

## Text scaling

Legacy 8–9px microcopy is raised to a responsive floor using `max(10px, .625rem)`. This means browser/root text scaling increases those labels rather than leaving them permanently fixed at tiny pixel sizes.

At narrow effective widths, dense layout groups collapse and header rows may wrap so increased text does not require page-level horizontal scrolling.

## User accessibility preferences

### Reduced motion

`prefers-reduced-motion: reduce` collapses animation and transition durations and disables smooth scrolling globally for the simulator UI.

### Increased contrast

`prefers-contrast: more` raises muted text and border contrast while removing decorative shadows that can reduce edge clarity.

### Forced colors

`forced-colors: active` replaces simulator gradients with system Canvas/Button colors, preserves visible control boundaries, and uses Highlight for selected/focused state.

## Runtime API

13.12 exposes:

- `frontierAccessibilitySync()` — re-run semantic decoration
- `frontierAccessibilityAudit()` — return unlabeled buttons/fields, duplicate IDs, progressbar count, tab count, and page title
- `frontierA11yAnnounce(message)` — send a polite live-region announcement

The adapter watches dynamic DOM insertions so future modules inherit these protections without being added to an allowlist.

## Regression coverage

### Static

`tests/accessibility-static.mjs` verifies:

- actual contrast math for canonical semantic pairs
- focus-ring contract
- 24px / 44px target-size rules
- legacy contrast bridge
- reduced-motion support
- increased-contrast support
- forced-colors support
- semantic runtime APIs
- skip-link focus behavior contract
- tab keyboard contract
- Browser/Scriptable/PWA asset parity
- cache version `frontier-lab-v21`

### Browser

`tests/accessibility-system.mjs` runs desktop and mobile Chromium coverage for:

- document language
- accessibility runtime startup
- skip navigation and focus movement
- unlabeled-control audit
- story dialog + progress semantics
- workspace H1
- engineering role selection semantics
- campaign progress semantics
- legacy muted-text bridge
- visible keyboard focus ring
- More-sheet close naming
- campaign locked-state semantics
- technical-explainer close/new-tab naming
- incident `alertdialog`
- incident tab arrow navigation
- decorative alarm hiding
- automatic future field/button/table decoration
- mobile target sizing
- root text scaling + horizontal containment
- reduced-motion behavior
- runtime errors

Both tests are part of `test:rc`.

## Scope boundary

13.12 intentionally does not perform a full manual screen-reader certification pass, external audit, or exhaustive assistive-technology matrix. Automated semantics and rendering tests catch regressions cheaply, but final human QA should still include keyboard-only play and representative VoiceOver/NVDA testing.

Item 13.13 remains responsible for the dedicated responsive visual sweep across viewport sizes and orientations.
