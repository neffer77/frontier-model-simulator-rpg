# Item 6 — Mobile + Desktop Gameplay QA

## Automated gate
`node tests/browser-smoke.mjs` runs the founder/startup path at 390×844 and 1440×1000, advances any opening story scene, verifies the persistent gameplay navigation, changes views after scrolling, verifies the new view resets to the top, returns Home, and fails on uncaught page errors.

GitHub Actions runs this gate on pull requests.

## Manual device matrix

### iPhone Safari / installed PWA
- Fresh save: Found the Lab opens the story sequence immediately.
- Story Continue/Skip controls stay inside the safe area and never sit behind bottom navigation.
- Home / Train / Team / Models / More are reachable one-handed and change views without refresh.
- Every destination begins near scroll position 0.
- Back/return buttons have dark high-contrast styling and at least 44px touch height.
- More sheet opens/closes without scrolling the page behind it.
- Dense screens expose a useful summary before collapsed secondary sections.
- Portrait → landscape → portrait does not strand overlays or hide controls.
- Add to Home Screen instructions appear when native install prompt is unavailable.
- Installed launch uses standalone presentation and retains the save.
- After one successful online load, airplane-mode relaunch loads the cached game shell/modules.

### Desktop Chromium/Safari/Firefox
- Gameplay guidance expands without covering the simulator.
- Bottom/mobile navigation presentation does not waste desktop space or obscure controls.
- Keyboard focus can reach objective CTA, major simulator controls, disclosure toggles, and story controls.
- More/system navigation works without refresh and resets scroll appropriately.
- Resize from desktop width to mobile width and back without duplicate shells/overlays.

### Existing saves
- Pre-PWA saves load without reset.
- Older string story objectives migrate to structured objectives.
- Existing active runs/incidents still become the recommended objective.
- Previously seen milestone scenes do not replay unexpectedly.

### Service worker/update behavior
- Normal online navigation prefers fresh documents.
- A newly deployed version replaces the old cache after service-worker activation.
- Missing/failed network assets do not produce a half-rendered silent UI.

## Exit criteria
Item 6 is complete when CI is green and the manual iPhone + desktop matrix has no P0/P1 issues. P2 visual defects may become follow-up issues, but navigation, save persistence, story progression, installability, and offline relaunch must work before Item 7 begins.
