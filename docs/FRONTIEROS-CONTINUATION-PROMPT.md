# FrontierOS continuation prompt — P5.3.8 Run Monitor return folders

Continue development of https://github.com/neffer77/frontier-model-simulator-rpg using the FrontierOS plan. Implement and validate one bounded vertical slice, preserving existing gameplay and saves. This is not `neffer77/l33t-interview-code` (Codeopolis).

## Verified checkpoint

- PR #116 (native Knowledge + Engineering) and PR #117 (release-workflow repairs) are merged. Do not reopen or force-push their branches.
- PR #118 / P5.3.1 **NPC → Mail → linked Run Monitor → same Mail thread** merged September 6, 2026. Tested PR head: `303472d999ea53301daab9de481f8f4db975256b`. Resulting `main`: `4efa51081e43dadc37ceddcc19fdb4b70b505215`. Cross-device run `34061713350` and Pages run `34061713333` passed at that main SHA.
- PR #119 / P5.3.2 merged into `main` at `fb17096ea029cad91878762cbd0ca4d6eead73fb`. Tested PR head `8e8cd9b97fc648434ba4c50dd38faa5be45944fc` passed all 17 workflows, including release QA/sign-off. Verify the merge's Pages deployment separately.
- PR #120 / P5.3.3 is merged into main at `594a0ada02fb4824a3c850c0652943d90c745f99`. Its tested head `a8a86d2009548b2fcc635297139048d80bcca89a` passed all 18 checks, including full release QA. One typed follow-up and its original committee explanation are already implemented.
- PR #121 / P5.3.4 merged at `03644df18544a349bd956f3d1c458cb8b630f0e0`. Tested head `20e1990c624334160c8c6f357bd9dbbc577c4ec9` passed all 19 workflows, 190 routes, 255 screenshots and release sign-off. Its immutable Finance evidence and founder initialization fix are implemented. Verify the merge deployment independently.
- PR #122 / P5.3.5 merged September 10, 2026 at `7b2ffc785c6830d488891c63483018d6e115a2e8`. Tested head `bcbc7fe2b95d4b2dceb51f742a0d46c22ac728a8` passed all 20 checks. Its canonical Needs decision Mail view includes archived actionable requests, search and exact-thread navigation. Policy v19 and PWA cache v55 retain 15 apps, 190 routes and 255 captures; Mail v3 and committee v2 remain compatible.
- Post-merge Cross-device run `34498423700`, attempt 1, failed in the technical-realism test's fixed-delay story click loop. Mail triage passed. Pages run `34498423693` passed its complete release gate and live verification on the same merge SHA. On September 11, attempt 2 passed with all eight current main checks green.
- PR #123 merged September 11, 2026 at `226e26bd8fa6b61a250234043f2da6442f3ecf26`. Tested head `616ebba43e3b2e732532602d9085dbda86bcd2b5` passed all 15 checks/workflows, including Cross-device run `34562848773` with 45 blockers, 190 routes, 255 captures and release sign-off ready. The merged tree matches the tested tree `07a27a6d0b3c8adc463ee0b393ba4469b079e425`. The fix uses a real Skip click and waits for canonical story closure plus DOM removal in balance/realism setup. Its extra phone startup scenario explicitly tests the legacy founder view (`frontieros=0`); native Mail and other native gates keep their native mode. Verify post-merge QA and Pages independently.
- PR #124 / P5.3.6 merged at `81bbb10fc60154b132f74afdf452e4fb3264ed33`. Tested head `3017a92df9af201a4d0b266c032028c476f29d68` passed all 19 checks, including Cross-device run `34610933552`, 190 routes, 255 captures and release sign-off ready. The merge has the same tree `400d0d5090551d84dc3a11fa38e603c811170a84`. Post-merge QA `34636882744` and Pages `34636882823` also passed. Canonical pending/delegated labels, current reviewer names, unavailable-reviewer handling, escaped wrapping and projection recovery are implemented. Historical names and money remain unchanged.
- P5.3.7 on `feature/frontieros-mail-return-folder` starts from that merged main. It carries the originating Mail folder through Finance and Artifacts routes so a destination reload still returns to the exact thread and folder. Old routes remain supported; approved requests stay closed and Archive stays Archive. The domain regression failed on the base before implementation. See `docs/P5.3.7-MAIL-RETURN-FOLDER.md` and the PR for actual current-head verification. Mail v3, committee v2, policy v19, 45 blockers, 15 apps, 190 routes and 255 captures remain; cache is v57. Verify this slice's merge status before starting another.
- Its reload regression also exposed portfolio progress advancing during initialization/render. `ensurePortfolioStrategy` now initializes without calling the mutating evaluator; explicit portfolio operations retain evaluation. Domain coverage verifies repeated reads/save restoration preserve funded progress and explicit Continue still works. Do not restore read-time progression or narrow the browser's financial-state comparison to hide it.
- Local browser dependency setup was blocked. The user approved GitHub Actions for remaining validation. Use pinned Playwright 1.54.2 in CI, retain failure evidence, and fix owning code/tests rather than weakening gates.

## Reconstruct live state first

Read repository instructions, latest `main`, open PRs, their actual base/head branches, current-head Actions results and latest successful Pages deployment. Record exact SHAs. Finish an existing unmerged slice before creating another. Preserve unrelated dirty worktrees. Do not duplicate merged release-workflow changes.

Read the P5.0/P5.1 and relevant P5.2/P5.3 docs, `frontier-app-registry.js`, command/event bus, navigation/session owners, `release-gate-policy.json`, and associated browser tests. Current source and fresh Actions evidence override historical checkpoint claims.

## Original plan and boundaries

The authoritative original design is **FrontierOS_Mega_Implementation_Manual.docx**, version 1.0, August 16, 2026. Retrieve its contents if accessible. These requirements preserve enough context to continue without inventing previous chat history.

Design law: **Desktop = windows. Mobile = apps. Same simulation; different presentation.** Keep core gameplay browser/PWA/Scriptable-compatible and offline-capable with no backend requirement. Separate simulation, domain services, app state, navigation, presentation and telemetry. Existing domain systems own mutations; app adapters do not create competing simulation state. Every primary surface has one registry owner. Mobile has one foreground task, safe-area support, no unintended horizontal scrolling and at least 44px touch targets.

The manual's phases cover telemetry, shells, Pager/Run Monitor, Mail/NPC communication, Data/Evals, research, People, Projects, Company, Knowledge/engineering, desktop immersion, mobile hardening, migration cleanup, replay and visual sign-off. Later implementation used P5.2.1–P5.2.12 for native app migrations. App presence and changed numbering are not evidence that those entire gameplay phases are complete.

Maintain a compact gap matrix: original requirement → implementation → test/evidence → remaining gap.

## Next single slice after P5.3.8

PR #125 / P5.3.7 merged September 12, 2026 at `e850c792199b2570a41a216214f9b0e5c5acc609`, with the same tree as tested head `b4f005cbd72570198c4a2c9f105a7dd35d53d84f`. All 19 PR checks passed, including 45 blockers, 190 routes and 255 screenshots. Verify post-merge QA and Pages independently.

P5.3.8 on `feature/frontieros-mail-run-folder` carries the originating Mail folder through the linked Run Monitor route and destination reload, preserving the original advice thread. Old links remain supported. The existing native render reconciliation preserves return context too. See `docs/P5.3.8-RUN-MONITOR-RETURN-FOLDER.md` and the PR for actual validation. Cache v58; no schema or release-policy change. Finish and verify this slice before starting another.

After it is validated and merged, preserve the selected Run Monitor view across a reload following an in-app tab change. Currently `setView` updates presentation but the session detail can still name the earlier view. Use the existing session owner; retain incident, advice thread and folder context. Prove actual tab clicks → reload → same view → Back to advice on phone and desktop, unchanged simulation and old-route compatibility. Search text and scroll restoration remain separate gaps.

P5.3.5 already filters pending/delegated requests using canonical Finance availability, including archived actionable threads. P5.3.6 adds **Awaiting your decision**, **Delegated review**, current reviewer names and **Reviewer unavailable** in those rows. Preserve read purity, missing/stale/closed exclusions, current reviewer identity, existing IDs and conversation search. Do not add row-level approvals, a second ledger, notifications or a general workflow engine.

P5.3.3 already saves one typed committee follow-up. P5.3.4 already saves one original Finance snapshot, projects a typed attachment into the same Mail thread, opens it read-only in Artifacts, and returns to the original request. Its historical content survives approval, changed assumptions, removed initiatives and reloads. Missing owner records remain explicitly unavailable. Do not recreate these flows or regenerate historical evidence from current data.

Preserve the owner ledger, monetary actions, revision conflicts, exact retries, recoverable Mail projection and deterministic snapshot/command replay. These are bounded local-first slices, not completion of the entire Mail phase or real multi-user authentication.

## Verification and release rules

First add a failing regression for the missing behavior. Fix the owning layer. Prove phone 390×844 and desktop 1440×1000 using real UI clicks, not only direct global calls. Cover unchanged money/gate state, persistent history, exact retry behavior, stale entities/revisions, cross-app return and reload. Use the canonical five-viewports matrix for layout changes. Capture screenshots, traces, runtime errors and relevant event/state evidence even when a test fails.

Replay from a starting simulation **and mailbox** snapshot with serialized commands and per-step hashes/first-divergence reporting. Do not claim general legacy simulation replay from a scoped domain harness. Preserve deterministic logical clock inputs; Mail-only rendering must not advance simulation progression.

Run targeted tests, `npm run test:static`, `npm run build:site`, canonical `npm run test:rc`, and `npm run test:signoff`. The release runner assigns `?frontieros=0` only to legacy gates; native gates retain their shell. Preserve all blockers, route/capture contracts, reviewed finite screenshot variants, performance budgets, and browser/PWA/Scriptable asset parity. Never rebaseline screenshots merely to turn CI green. Include **Cross-device browser QA**, all check runs, commit statuses and latest workflow attempts when verifying the current PR revision.

Physical iPhone touch, keyboard, scrolling and PWA sign-off remains manual. Emulation is not physical-device verification. Do not declare broad mobile/visual phases closed without their required evidence.

Work on a new branch from verified current main, or finish the existing slice's branch. Open a reviewable PR documenting behavior, actual validation and limitations. Do not merge or deploy without user authorization. If dependencies or CI access are blocked, preserve the work and report exactly what remains unperformed.

End with PR URL and tested SHA, changed behavior, actual checks, deployment state, remaining manual verification and the next single slice. Update this checkpoint so another agent can continue without reconstructing the work again.
