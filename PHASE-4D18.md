# Phase 4D.18 — Project Staffing, Portfolio Capacity & Key-Person Dependencies

Phase 4D.18 makes engineering capacity an explicit portfolio-allocation problem.

## Named projects

Players can launch simultaneous frontier training, inference efficiency, safety evaluation, and data-quality projects. Projects have different technical skill requirements, priorities, target dates, progress, and strategic value.

## Percentage staffing

NPC engineers can be allocated to projects in percentage increments. The simulator tracks each person's total allocation across the portfolio instead of assuming every employee is fully available to every initiative.

Allocations above 100% create visible conflicts. Severe over-allocation increases workload and attrition pressure.

## Delivery forecasts

Each active project's forecast is calculated from allocated capacity, relevant technical skill, over-allocation, current progress, and the target date. The portfolio UI shows a projected delivery day and flags projects expected to miss their deadline.

## Key-person dependencies

Projects can become dependent on a single heavily allocated engineer. These situations are surfaced as key-person risk and contribute to the portfolio risk score.

This connects project planning to the critical-role and organizational-memory systems from Phase 4D.17.

## Rebalancing

Overallocated engineers can be rebalanced back to 100% total capacity. This removes hidden staffing conflicts but can reduce capacity on lower-allocation projects, forcing explicit prioritization.

## Portfolio consequences

Project risk aggregates late forecasts, insufficient staffing, over-allocation, and key-person dependencies. Successful project delivery improves effective organizational execution capacity.

## Integration

Phase 4D.18 builds on NPC skills, workforce planning, workload, attrition risk, organization management, and technical continuity systems.

Browser/mobile and Scriptable builds both load the project portfolio module.

## Next

Phase 4D.19 should add dependency graphs, milestones, project sequencing, blocked work, cross-team coordination costs, and critical-path planning.