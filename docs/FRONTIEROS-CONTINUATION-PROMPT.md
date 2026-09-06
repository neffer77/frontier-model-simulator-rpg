# FrontierOS continuation prompt — after PR #117 / P5.3.1

Paste the following into the development agent with access to this repository.

---

## Verified continuation checkpoint

- PR #117 merged on September 6, 2026. Its tested head was `00792bbba0725000eb0e8d07e6255f7272c789ea`; current `main` after the merge is `1af1de86eef85e2a4169ead8a809388584e9a212`.
- The release-workflow repair is complete. Do not recreate or reopen `fix/pr116-release-workflows`.
- P5.3.1 implements the bounded **NPC → Mail → linked Run Monitor → same Mail thread** journey on `feature/frontieros-npc-mail-journey`. Read `P5.3.1-NPC-MAIL-JOURNEY.md` and verify its PR/check status before treating it as merged.
- P5.3.1 advances the intended release policy to v15 and PWA cache to v49 while retaining 190 route visits and 255 screenshot captures.
- The next single evidenced slice after P5.3.1 is **P5.3.2 — one typed decision request in Mail with approve/reject/delegate outcomes through an existing domain owner**. Do not generalize to every workflow in one PR.

---

Continue development of https://github.com/neffer77/frontier-model-simulator-rpg using the FrontierOS implementation plan. Implement and validate a bounded vertical slice; do not stop at a proposed plan. Keep existing gameplay and save data intact.

## Reconstruct the actual starting point

1. Read repository instructions, latest `main`, open PRs, their actual base/head branches, Actions results, and the latest successful Pages deployment. Record exact SHAs. Do not confuse this repository with `neffer77/l33t-interview-code` (Codeopolis).
2. PR #116, **P5.2.12 — Native FrontierOS Knowledge + Engineering**, was merged on August 22, 2026. Its merge SHA was `5a43ee199ded9e047a40f5e89e5f93103422ef34`; its head was `7371c57064a3fafc66d8b8ef091b30314fbee92d`. These are historical anchors, not a claim about the current HEAD. Do not reopen or force-push the merged branch.
3. Inspect the follow-up branch `fix/pr116-release-workflows` and its PR. If still open, finish its validation first. Avoid duplicating its changes. It repairs Pages using the canonical mode-aware release gate, and repairs invalid YAML/shell quoting in Run Monitor and Terminal workflows.
4. Check the original failures: Pages run `32605661350`, job `97110239430`, failed at `tests/browser-smoke.mjs:25` with `mobile: app not visible`; Run Monitor run `32605660848` and Terminal run `32605660517` created no jobs. Cross-device run `32605661344` passed at the same merge SHA. The Pages job used raw `test:qa`, bypassing the release policy's per-test legacy/native modes. Do not fix this by disabling the new OS, skipping smoke tests, or relaxing screenshot thresholds.
5. Read `P5.2.12-KNOWLEDGE-ENGINEERING.md`, the P5.0/P5.1 documents in `docs/`, current native app modules, `frontier-app-registry.js`, `command-adapters.js`, the command/event bus, `release-gate-policy.json`, and related browser tests.

## Reconcile the original plan with implemented work

The authoritative original design is **FrontierOS_Mega_Implementation_Manual.docx**, version 1.0, August 16, 2026. If Library access is available, retrieve its current contents. This prompt preserves the relevant requirements so you can continue without inventing missing chat history.

Design law: **Desktop = windows. Mobile = apps. Same simulation; different presentation.** Keep core gameplay browser/PWA/Scriptable-compatible and offline-capable, with no backend requirement. Separate simulation, domain services, app state, navigation, presentation, and telemetry. Existing domain systems own mutations; app adapters must not duplicate them. Every primary surface has one registry owner. Mobile has one foreground task, safe-area support, no unintended horizontal scrolling, and at least 44px touch targets.

The manual's broad phases were: 5.0 telemetry foundation; 5.1 shell; 5.2 Pager/Run Monitor; 5.3 Mail/NPC communication; 5.4 Data/Evals; 5.5 research; 5.6 People; 5.7 Projects; 5.8 Company; 5.9 Knowledge/Code Lab/artifacts; 5.10 desktop immersion; 5.11 mobile hardening; 5.12 migration cleanup; 5.13 observability/replay hardening; 5.14 visual sign-off.

Implementation subsequently used P5.2.1–P5.2.12 for native app migrations. Do not interpret the old numbering as instructions to recreate apps. Mail already shipped in PR #111/P5.2.7; People, Projects, Finance and Company also shipped. PR #116 added native Knowledge, Code Lab and Artifacts. At the historical baseline, policy v14 protects 15 registered apps, 190 route visits and 255 screenshot captures, with PWA cache v48. Verify current values before editing them.

Create a compact gap matrix: original requirement → implementation → test/evidence → remaining gap. App presence is not proof of complete gameplay integration.

## Next proposed slice: Mail-linked NPC advice and a real cross-app journey

After the release repair is green, audit and implement the smallest missing part of the manual's J03 journey: **NPC advice → Mail thread → related Run Monitor view → return to the same thread**. This is the proposed next slice based on the recovered plan and inspected code, not a claim that an unseen prior chat selected it.

Inspect `frontier-mail-frontieros.js`, its command adapter and tests, NPC advice entry points, Run Monitor, navigation, notifications and persistence. The baseline Mail implementation has seeded threads, read/unread, search, star/archive, replies and `frontierMailReceive`; it does not establish completion of entity-linked advice, typed decisions or deterministic replay. Locate all callers before designing an adapter. If J03 already exists in a newer commit, prove it and select the next evidenced gap instead.

Requirements for this slice:

- Reuse canonical NPC advice generation and run identities. Route native Ask Team/NPC actions into a persistent Mail conversation; do not create another mailbox or NPC simulation.
- Preserve origin app, run/incident ID and thread ID. Store serializable linked-entity data and render an explicit Open Run action through the existing navigation API.
- Return to the original thread on phone Back and desktop app switching. Preserve thread history/read status across reload and resumed sessions. Handle missing/deleted entities gracefully without opening the wrong run.
- Avoid duplicate threads/messages when an action is retried. Use stable identifiers and the existing command/event boundary.
- Keep legacy entry points only where existing compatibility contracts require them; do not remove wrappers wholesale before route ownership is proven.
- Keep mutations observable. Record command IDs, app/route, entity IDs, revisions and before/after hashes where the existing contract supports them. Mail-only UI state must not falsely advance simulation progression.
- Use deterministic clock/RNG inputs for replayable actions. Include mailbox state in the existing replay/debug contract where needed; do not present a localStorage-only mailbox as automatically replayable from a simulation snapshot.
- Defer broader approve/reject/delegate and executive-policy workflows to later slices unless needed for this exact journey. Document those gaps instead of pretending the entire original phase is complete.

## Verification and release rules

Reproduce the missing/broken journey first with a failing regression. Fix the owning layer, then prove it on desktop 1440×1000 and phone 390×844 using actual UI clicks and assertions. Do not use only direct global-function calls as evidence of user interaction. Cover thread reuse, correct entity deep link, return navigation, persistence and missing-entity behavior. Capture screenshots, trace, page errors and relevant event/state evidence. Add landscape/tablet/wide coverage when layout changes affect them.

Use the pinned Playwright version. Run targeted tests, `npm run test:static`, `npm run build:site`, then the canonical `npm run test:rc` and `npm run test:signoff`. The canonical runner assigns `?frontieros=0` only to legacy gates; native gates retain the default shell. Do not globally force all tests into legacy mode. Preserve release blockers, the route/capture contracts, reviewed finite visual variants, performance budgets and browser/PWA/Scriptable asset parity. Never rebaseline screenshots just to make CI green.

Verify deterministic replay from a snapshot/seed with serialized commands and first-divergence reporting for the added state-changing flow. If the current replay infrastructure cannot support it yet, explicitly document that gap rather than inventing a successful replay test. The manual requires no new runtime errors and relevant cross-app evidence. P0/P1 mobile issues need actual iPhone verification before final closure; emulation is not a physical-device sign-off.

Work on a new branch from verified current `main`, or the existing follow-up branch only when finishing its own scope. Open a reviewable PR with the problem, behavioral changes, regression evidence and remaining limitations. Do not merge or publish just because tests passed; leave that final action to the user's requested scope. If dependencies or CI access are blocked, preserve the work and report exact unperformed checks.

End with: PR URL and SHAs, what changed, actual test results, deployment state, remaining manual verification, and the next single slice. Update this handoff with verified progress so another agent can resume without reconstructing everything again.
