# Item 8 — Stronger Visual / Game Feel

## Goal
Make important simulator actions feel like game events without obscuring the technical learning content.

## Implemented
- tactile button feedback through supported browser vibration APIs
- animated screen entry and pressed-control feedback
- live training-progress visualization in the persistent guidance shell
- milestone toasts at 25% training boundaries
- full-screen celebration beats for first failure, first model, first hire/company growth, company inflection point, and early-game graduation
- stronger atmospheric background, glass-like guidance surfaces, and visual hierarchy
- reduced-motion support
- browser, PWA offline cache, and Scriptable integration

## Design rule
Feedback communicates simulation state; it must not replace technical evidence. Incident diagnosis, model lineage, hiring reasoning, and management consequences remain in their existing systems.

## QA
- milestone overlays must never trap the player or cover system controls after dismissal
- no milestone repeats on ordinary renders within the same session
- vibration is best-effort and gameplay never depends on it
- reduced-motion users receive state changes without required animation
- mobile safe areas remain usable
- offline/PWA launch includes the game-feel assets
