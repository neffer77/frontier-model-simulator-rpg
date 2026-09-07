# FrontierOS continuation prompt — P5.3.2 Mail decisions

Continue development of https://github.com/neffer77/frontier-model-simulator-rpg using the FrontierOS plan. Implement and validate one bounded vertical slice, preserving existing gameplay and saves. This is not `neffer77/l33t-interview-code` (Codeopolis).

## Verified checkpoint

- PR #116 (native Knowledge + Engineering) and PR #117 (release-workflow repairs) are merged. Do not reopen or force-push their branches.
- PR #118 / P5.3.1 **NPC → Mail → linked Run Monitor → same Mail thread** merged September 6, 2026. Tested PR head: `303472d999ea53301daab9de481f8f4db975256b`. Resulting `main`: `4efa51081e43dadc37ceddcc19fdb4b70b505215`. Cross-device run `34061713350` and Pages run `34061713333` passed at that main SHA.
- P5.3.2 is implemented on `feature/frontieros-mail-decisions`, based on that main SHA: **one typed Finance funding request with approve/reject/delegate through the existing investment committee owner**. Read `P5.3.2-MAIL-DECISIONS.md`; discover its PR and verify current head/checks before treating it as merged. The implementation does not authorize merge or deployment.
- P5.3.2 uses Mail schema v3, additive committee schema v2, release policy v16, PWA cache v50, 15 existing apps, 190 route visits, and 255 screenshot captures. Verify current values before editing.
- Local browser dependency setup was blocked. The user approved GitHub Actions for remaining validation. Use pinned Playwright 1.54.2 in CI, retain failure evidence, and fix owning code/tests rather than weakening gates.

## Reconstruct live state first

Read repository instructions, latest `main`, open PRs, their actual base/head branches, current-head Actions results and latest successful Pages deployment. Record exact SHAs. Finish an existing unmerged slice before creating another. Preserve unrelated dirty worktrees. Do not duplicate merged release-workflow changes.

Read the P5.0/P5.1 and relevant P5.2/P5.3 docs, `frontier-app-registry.js`, command/event bus, navigation/session owners, `release-gate-policy.json`, and associated browser tests. Current source and fresh Actions evidence override historical checkpoint claims.

## Original plan and boundaries

The authoritative original design is **FrontierOS_Mega_Implementation_Manual.docx**, version 1.0, August 16, 2026. Retrieve its contents if accessible. These requirements preserve enough context to continue without inventing previous chat history.

Design law: **Desktop = windows. Mobile = apps. Same simulation; different presentation.** Keep core gameplay browser/PWA/Scriptable-compatible and offline-capable with no backend requirement. Separate simulation, domain services, app state, navigation, presentation and telemetry. Existing domain systems own mutations; app adapters do not create competing simulation state. Every primary surface has one registry owner. Mobile has one foreground task, safe-area support, no unintended horizontal scrolling and at least 44px touch targets.

The manual's phases cover telemetry, shells, Pager/Run Monitor, Mail/NPC communication, Data/Evals, research, People, Projects, Company, Knowledge/engineering, desktop immersion, mobile hardening, migration cleanup, replay and visual sign-off. Later implementation used P5.2.1–P5.2.12 for native app migrations. App presence and changed numbering are not evidence that those entire gameplay phases are complete.

Maintain a compact gap matrix: original requirement → implementation → test/evidence → remaining gap.

## Next single slice after P5.3.2

Once P5.3.2 is validated and merged, audit and implement **typed ask-follow-up plus one deterministic committee response on the same Finance funding request**. This is the next evidenced gap from the manual, not a claim that unseen chat history selected additional scope. If newer work has already implemented it, prove that before selecting another gap.

Inspect `investment-committee.js`, `frontier-mail-command.js`, `frontier-mail-frontieros.js`, `finance-frontieros.js`, Mail persistence/replay and both decision tests. The baseline owns request/audit state in `state.investmentCommittee.mailRequests`; Mail stores typed references and projects canonical audit entries. Preserve this boundary and its recovery behavior.

Requirements:

- Request clarification without funding, rejecting, or silently resolving the pending/delegated decision. Keep the same initiative and thread context.
- Use canonical committee/person data and deterministic inputs for one bounded response; do not require a model backend or invent independent NPC state.
- Record serializable commands, revisions, actor/reviewer identity, response/audit content and stable message IDs. Make duplicate and stale submissions safe.
- Preserve approve/reject/delegate behavior, cash guards, exact-once receipts within one simulation state, source invalidation, old-save migration and interrupted Mail projection recovery.
- Keep the distinction between single-player roles and real authentication. No claim of multi-tab or cross-device transaction coordination without implementing and testing it.
- Do not broaden this PR into every request type, evidence attachment, executive policy, agent backend or phase cleanup. Document those gaps.

## Verification and release rules

First add a failing regression for the missing behavior. Fix the owning layer. Prove phone 390×844 and desktop 1440×1000 using real UI clicks, not only direct global calls. Cover unchanged money/gate state, persistent history, exact retry behavior, stale entities/revisions, cross-app return and reload. Use the canonical five-viewports matrix for layout changes. Capture screenshots, traces, runtime errors and relevant event/state evidence even when a test fails.

Replay from a starting simulation **and mailbox** snapshot with serialized commands and per-step hashes/first-divergence reporting. Do not claim general legacy simulation replay from a scoped domain harness. Preserve deterministic logical clock inputs; Mail-only rendering must not advance simulation progression.

Run targeted tests, `npm run test:static`, `npm run build:site`, canonical `npm run test:rc`, and `npm run test:signoff`. The release runner assigns `?frontieros=0` only to legacy gates; native gates retain their shell. Preserve all blockers, route/capture contracts, reviewed finite screenshot variants, performance budgets, and browser/PWA/Scriptable asset parity. Never rebaseline screenshots merely to turn CI green. Include **Cross-device browser QA**, all check runs, commit statuses and latest workflow attempts when verifying the current PR revision.

Physical iPhone touch, keyboard, scrolling and PWA sign-off remains manual. Emulation is not physical-device verification. Do not declare broad mobile/visual phases closed without their required evidence.

Work on a new branch from verified current main, or finish the existing slice's branch. Open a reviewable PR documenting behavior, actual validation and limitations. Do not merge or deploy without user authorization. If dependencies or CI access are blocked, preserve the work and report exactly what remains unperformed.

End with PR URL and tested SHA, changed behavior, actual checks, deployment state, remaining manual verification and the next single slice. Update this checkpoint so another agent can continue without reconstructing the work again.
