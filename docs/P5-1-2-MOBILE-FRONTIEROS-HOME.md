# P5.1.2 — Mobile FrontierOS Home

## Goal

Replace the dense all-at-once mobile simulator entry surface with a phone-native FrontierOS launcher. The simulation remains unchanged underneath; presentation and navigation become app-oriented.

## Activation

The shell activates automatically for actual touch-phone conditions (touch/coarse pointer + phone-sized display). Viewport-only desktop QA does not switch modes just because the window is narrow. `?frontieros=1` forces the shell for deterministic QA and `?frontieros=0` disables it for troubleshooting.

## Home contract

The launcher renders the 14 canonical P5.1.1 apps as a 3-column phone grid, with a compact FrontierOS status area and dock. Each tile uses registry state and badges rather than hard-coded availability.

Ready apps launch through `frontierLaunchApp()`. Planned and locked apps remain on Home and show a clear explanation. There is no silent fallback to a different legacy screen.

## One app at a time

When a ready app opens, the launcher hides and the existing application surface is shown beneath a compact FrontierOS app bar. The bar has an explicit Home control. Returning Home clears the current app presentation state without mutating simulation state.

This is the first migration step toward the rule: **desktop = windows; mobile = apps**.

## Runtime APIs

- `frontierMobileHomeOpen()`
- `frontierMobileAppOpen(appId)`
- `frontierMobileShellActivate()`
- `frontierMobileShellDeactivate()`
- `frontierMobileShellSnapshot()`

## Observability

The shell emits:

- `os.mobile.shell.ready`
- `os.mobile.home.opened`
- `os.mobile.app.opened`
- `os.mobile.app.blocked`

These flow into the P5.0.2 event journal and P5.0.3 debug bundle with build/session/state revision context.

## Responsive contract

Phone portrait source of truth: **390×844**. Phone landscape source of truth: **844×390**.

The UI uses safe-area insets and prevents page-level horizontal overflow in both orientations. Landscape changes to a denser five-column app grid to preserve vertical working room.

## QA evidence

`npm run test:mobile-os` performs the exact phone journey:

1. open on 390×844 touch mobile;
2. verify FrontierOS Home is the entry surface;
3. verify all 14 app tiles;
4. capture Home portrait;
5. open Run Monitor;
6. verify legacy app surface plus FrontierOS app bar;
7. capture Run Monitor;
8. press Home;
9. verify launcher returns;
10. tap planned Frontier Mail and verify it stays Home with an explanation;
11. resize to 844×390;
12. verify no horizontal overflow;
13. capture landscape;
14. verify shell/app/block events;
15. retain a Playwright trace.

Artifacts:

```text
artifacts/mobile-frontieros/
├── report.json
├── REPORT.md
├── home-portrait.png
├── run-monitor-app.png
├── home-landscape.png
└── trace.zip
```

A dedicated `FrontierOS mobile UI evidence` workflow uploads this evidence for 30 days. The cumulative release gate also runs `test:mobile-os` as a blocker and requires its report.

## Rollout boundary

P5.1.2 does not yet redesign the contents of Run Monitor, Evals, Model Lab, People, etc. It changes how a phone enters and moves between applications. Later app-specific phases progressively replace dense legacy screens with native FrontierOS app views.

## Next item

P5.1.3 builds the desktop FrontierOS shell: desktop wallpaper/workspace, app icons, taskbar/start surface, draggable application windows, window focus/minimize/restore, and the same P5.1.1 registry/deep-link contracts.
