# Item 13.11 — Modal / Overlay / Story Sweep

Item 13.11 normalizes Frontier Lab's cross-cutting modal and overlay surfaces into one deterministic presentation and accessibility system.

## Why this pass exists

The simulator accumulated overlays across multiple gameplay phases:

- responsive More sheet
- Chapter 7 company-priority decision
- live engineering incident overlay
- Item 8 milestone celebration
- Item 6/7 story scenes
- technical explainer modal

Each surface worked independently, but they used different z-indexes, backdrop rules, focus behavior, mobile sizing, and dismissal semantics.

That created stack-level bugs that page-by-page visual work cannot solve. The most important example is the first incident:

1. the incident UI can be rendered,
2. the first-incident story can start on the same render,
3. Item 8 can also create a milestone,
4. the player can open a technical explainer from the incident.

Before 13.11 those surfaces could compete at z-index 500, 1000, and 10000 with no shared contract.

## Shared overlay registry

`overlay-system.js` defines six managed overlay families.

| Priority | Overlay | Dismissible with Escape | Why |
| --- | --- | --- | --- |
| 10 | More sheet | Yes | navigation sheet, safe to close |
| 20 | Company priority | Yes | explicit `Not yet` path already exists |
| 30 | Live incident | **No** | Escape must not bypass an unresolved engineering decision |
| 40 | Milestone | Yes | celebration can continue/close safely |
| 50 | Story scene | Yes | existing Skip path is the semantic dismissal |
| 60 | Technical explainer | Yes | existing close/backdrop behavior is safe |

The corresponding first-paint z-indexes are 800, 900, 1000, 1100, 1200, and 1300. Toasts remain above the overlay stack at 1400.

This ordering fixes several concrete collisions:

- first-incident story appears before the incident decision UI
- milestone can resume after the story and before the incident decision
- an explainer opened from an incident always appears above that incident
- More/priority surfaces cannot cover urgent narrative or incident states

## Suspension instead of destruction

When multiple overlays are logically active, only the highest-priority one is interactive.

Lower overlays remain mounted so their underlying gameplay state is not lost, but they receive:

- `.fl-overlay-suspended`
- `visibility: hidden`
- `pointer-events: none`
- `aria-hidden="true"`
- `inert = true` when supported

When the top overlay closes, the next overlay resumes automatically.

The runtime explicitly treats manager-owned `visibility:hidden` as still logically active. This is important: otherwise a suspended overlay would disappear from the manager's next scan and could never resume.

## Shared accessibility contract

Every active overlay panel is normalized to:

- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` pointing at the first `h1`, `h2`, or `h3` when available
- a fallback `aria-label` when no heading exists
- `tabindex="-1"` so a panel can receive focus if it has no focusable children

Only the top overlay remains exposed as modal. Suspended overlays lose `aria-modal` and are hidden from assistive technology.

## Focus management

The manager records focus when the first overlay in a stack opens.

When a new top overlay appears it moves focus to an appropriate real control:

- More → close button
- Company Priority → first company-choice button
- Incident → active evidence tab / first decision
- Milestone → Continue
- Story → primary Continue action
- Technical Explainer → close button / source action

`Tab` and `Shift+Tab` are trapped inside the top dialog.

When the complete overlay stack closes, focus is restored to the element that opened the stack when that element still exists.

This is especially important for the More sheet: closing it with Escape returns keyboard focus to the More navigation control.

## Escape semantics

Escape is handled centrally.

Safe dismissals delegate to the overlay's existing gameplay action rather than directly mutating unrelated state:

- More → `gameplayCloseMenu()`
- Company Priority → `campaignClosePriority()`
- Story → `storySceneClose()`
- Milestone → existing Continue button
- Technical Explainer → clears `modalRoot`

The live incident overlay intentionally ignores Escape. The user must resolve the engineering decision through its existing incident flow.

## Scroll and mobile behavior

While any managed overlay is active:

- the document body receives `.fl-overlay-open`
- body scrolling is disabled
- overscroll is contained
- the fixed gameplay navigation is non-interactive underneath the overlay
- overlay panels own their internal scrolling

Mobile panels use safe-area-aware padding and `100dvh` bounds.

The More sheet remains a bottom sheet rather than being converted into a centered modal. Story, incident, milestone, and technical explainer keep their specialized layouts while inheriting shared size, border, shadow, backdrop, and overflow rules.

## Visual normalization

`overlay-system.css` is the final Item 13.11 visual layer.

It provides:

- one dark backdrop treatment
- theme-token borders and shadows
- safe panel max heights
- consistent close/continue touch targets
- dark technical-explainer source links
- dark incident evidence/tabs/decision surfaces
- story dialogue/aside surfaces based on global theme tokens
- warning identity for milestones
- danger identity for incidents

The system does not replace the specialized story art, incident information architecture, milestone copy, or company-priority choices.

## Class-driven lifecycle

Most overlays are inserted or removed from the DOM, so a subtree `MutationObserver` can detect them.

The More sheet is different: it stays mounted and opens when `body.gameplay-menu-open` changes.

13.11 therefore uses a second observer scoped only to the body's `class` attribute. Keeping this observer separate avoids feedback loops from the manager's own overlay classes elsewhere in the DOM.

## Public QA/runtime helpers

13.11 exposes:

- `window.frontierOverlaySync()`
- `window.frontierOverlayDismissTop()`
- `window.frontierOverlayTop()`
- `window.frontierOverlayRegistry()`

`frontierOverlayTop()` returns the current type, priority, and dismissibility.

## Regression coverage

### Static

`tests/overlay-system-static.mjs` verifies:

- all six overlay families exist
- priority order is stable
- incident remains non-dismissible
- dialog/ARIA/focus/inert contracts are present
- suspended overlays remain logically active
- body-class More-sheet lifecycle observation exists
- Item 13.11 loads after Item 13.10
- Browser, Scriptable, and PWA include the same overlay assets
- offline cache is `frontier-lab-v20`
- the original Item 13.1 special overlay captures remain in the inventory

### Browser

`tests/overlay-system.mjs` runs on desktop and 390×844 mobile.

It exercises real simulator surfaces:

1. founder intro story
2. More sheet
3. company-priority decision
4. milestone celebration
5. technical explainer
6. live incident
7. the multi-overlay collision stack

The collision regression creates incident + milestone + story + technical explainer simultaneously and verifies this unwind sequence:

`technical explainer → story → milestone → incident`

It also verifies:

- dialog semantics
- initial focus
- focus trapping
- focus restoration
- Escape rules
- incident non-dismissal
- lower-layer `aria-hidden`
- body scroll lock and cleanup
- mobile horizontal/vertical containment
- dark panel surfaces
- no runtime errors

## Release integration

New package scripts:

- `npm run test:overlay-static`
- `npm run test:overlay`

Both are included in `npm run test:rc` through the cumulative static and QA gates.

The Item 13.10 static test is updated to remain cumulative: it still requires its assets and ordering after Item 13.9, but no longer claims to be the final layer or freezes the cache at v19.

## Platform parity

The following load `overlay-system.css` and `overlay-system.js` after Item 13.10:

- browser / GitHub Pages
- Scriptable WebView wrapper
- PWA offline cache

Service-worker cache version: `frontier-lab-v20`.

## Scope boundary

13.11 owns modal, overlay, story, stacking, focus, dismissal, and backdrop consistency.

It does **not** perform the later dedicated work for:

- 13.12 contrast/accessibility sweep across all normal pages
- 13.13 responsive visual sweep across all breakpoints
- 13.14 automated visual-regression detector
- 13.15 route/page crawler QA

Those later items can now rely on a deterministic overlay system rather than treating each overlay as a special case.
