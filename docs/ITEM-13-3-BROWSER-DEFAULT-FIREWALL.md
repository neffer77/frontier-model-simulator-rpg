# Item 13.3 — Browser-Default Styling Firewall

## Goal
Prevent partially styled or legacy simulator controls from falling back to light native browser UI inside the dark Frontier Lab interface.

## Root cause found
The white surfaces captured in the Item 13.1 inventory were not a single page-specific color bug. Several modules create `<button>` launchers and only define layout properties such as width, margin, padding, and text alignment. On desktop, the base stylesheet previously defined only `button{color:inherit}`, leaving background/border/appearance to the browser.

Concrete examples:
- `maintenance-economics.css` — `.maint-launch` has layout but no background/border
- `slo-reliability.css` — `.slo-launch` has layout but no background/border
- `release-governance.css` — `.rg-launch` has layout but no background/border
- `critical-path.js` — the page header emits an unclassed `Return to company` button

This explains the Item 13.1 defects:
- **VIS-001**: large pale horizontal Company/Home launcher bars
- **VIS-002**: pale orphan Critical Path header control

## Implementation
`browser-default-firewall.css` provides low-specificity `:where(...)` defaults for:
- buttons
- text-like inputs
- selects
- textareas
- checkboxes/radios/ranges via dark color scheme + accent color
- color inputs
- fieldsets/legends
- details/summary
- horizontal rules
- focus-visible states
- disabled states
- Safari/Chromium autofill

Buttons additionally reset native button appearance so desktop Chrome/Safari cannot paint a native light button face behind a partially styled launcher.

## Specificity rule
The firewall intentionally uses `:where(...)`, whose selectors contribute zero specificity. Existing module/page selectors therefore override the fallback without requiring `!important` or selector escalation.

This is a safety net, not the final component system. Item 13.4 will normalize panel/card components and Item 13.6 will normalize explicit button/control variants.

## Platform parity
The firewall is loaded by:
- browser `index.html`
- Scriptable `STYLE_FILES`
- PWA service worker cache (`frontier-lab-v12`)

## Regression protection
### Static contract
`tests/firewall-static.mjs` verifies:
- semantic Item 13.2 theme tokens are consumed
- low-specificity fallback selectors remain present
- native button appearance reset remains present
- keyboard focus and autofill rules remain present
- browser, Scriptable, and PWA all include the firewall

### Browser regression
`tests/browser-default-firewall.mjs` runs desktop and mobile Chromium and checks:
- `.maint-launch` is dark
- `.slo-launch` is dark
- `.rg-launch` is dark
- Company/Home contains no visible opaque near-white native-looking buttons
- Critical Path's unclassed header button is dark
- synthetic naked button/input/select/textarea/fieldset controls still render dark
- no uncaught runtime errors occur during the test

The browser regression is part of `test:qa`; the static contract is part of `test:static`.

## Scope boundary
This item prevents browser-native light fallbacks. It does not yet make all page surfaces aesthetically identical. Page/card hierarchy, progressive disclosure, explicit control variants, empty states, and page-by-page polish remain Items 13.4–13.17.
