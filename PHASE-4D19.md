# Phase 4D.19 — Dependency Graphs, Milestones, Blocked Work & Critical-Path Planning

Phase 4D.19 adds explicit sequencing and coordination constraints to the project portfolio.

## Project dependencies

Active projects can depend on other active projects. A dependent project is blocked until all upstream projects are delivered. Blocked projects no longer make portfolio progress even if engineers are staffed on them.

## Milestone gates

Every project gets design, integration, and release milestones. Milestones track progress thresholds and can be explicitly advanced to make project state easier to reason about during planning.

## Cross-team coordination cost

Projects staffed across multiple org teams accrue coordination overhead. Dependency edges add more overhead. That cost increases forecast duration instead of treating multi-team execution as free.

## Critical-path forecasting

The simulator recursively propagates upstream finish dates through dependency chains. Each project receives a dependency-aware forecast, and the projects determining the latest portfolio finish are highlighted as the critical path.

This makes upstream slippage visible before downstream deadlines are missed.

## Blocked-work risk

Blocked projects, dependency depth, and coordination overhead increase portfolio risk. The player can remove dependencies, sequence projects differently, or reallocate engineering capacity to unblock the critical chain.

## Integration

Phase 4D.19 builds directly on Phase 4D.18 staffing percentages, project forecasts, workload, key-person dependencies, and portfolio risk.

Browser/mobile and Scriptable builds both load the critical-path module.

## Next

Phase 4D.20 should add program management: cross-project objectives, launch trains, dependency owners, escalation meetings, scope cuts, schedule recovery plans, and scenario-based delivery reviews.