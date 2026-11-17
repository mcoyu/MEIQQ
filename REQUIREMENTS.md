# MEIQQ business simulation — agreed direction

## Purpose

An interactive hypothetical model of a local marketing business with overseas design labor and external print suppliers. The user needs to understand what the company offers, who does the work, how clients and projects progress, and how pricing, labor, cash and capacity interact.

## Agreed behavior

1. Instant estimates plus a running simulation; play, pause, speed, day step and restart.
2. Workflow map as main screen; responsibility lanes for owner, China team, suppliers and clients.
3. Compact persistent results: cash, profit, active projects, owner work and delays.
4. Three hypothetical services: design only, design plus print, monthly promotion.
5. Preset inquiries and customer acquisition based on editable outreach assumptions.
6. Both input adjustment and operational reconfiguration: people, services, costs and assignments.
7. Adjustable realism, eventually with independent uncertainty switches.
8. Live runs respect commitments; scenario copies support experimentation and comparison.
9. Cash performance and economics after valuing owner time, with an editable hourly target.
10. Entire starting business hypothetical, with assumptions clearly labeled.
11. Downloadable on Windows and Mac; offline operation and local scenario saves.
12. Scenario comparisons with explanations traceable to projects, queues, hours and costs.
13. Service duplication and guided creation.
14. Financial timing: deposits, final payments, labor, suppliers, shipping and overhead. Cash shortages pause and require a decision. No silent funding.
15. Both subscriptions and repeat purchases, configurable by service.
16. Clicking a project opens details and intervention controls.
17. Automatic routine work under editable rules, with manual overrides.
18. Balanced workspace: workflow map, compact indicators, right-hand inspector and bottom clock.
19. Horizons of 1, 3, 6 and 12 months; carry forward unfinished projects, cash, payments and client relationships.

## Current milestone

Prototype 03 completes Stage A of the November 17 audit: workspace preservation and recovery, financial validation, safe rendering of imported values, prepaid completion, accurate cash observations and controlled storage growth. Stages B and C remain pending. This is not the complete production application. README and the in-app Model guide distinguish implemented behavior from future scope.

## Defaults chosen for the prototype

- MEIQQ working title; restrained green / off-white workspace.
- Single offline HTML distribution before native packaging.
- Pooled role capacity and hourly pay for actual design labor.
- Fixed stage routing; printing is omitted when print cost is zero.
- Actual elapsed-day event history; seeded randomness.
- Daily atomic transactions: a failed cash payment rolls back the proposed day.
- Earliest-deadline scheduling by default, priority overrides, alternative FIFO.
- Simplified incurred-cost operating result, explicitly distinct from formal accounting.
- Subscription cycle begins after the previous cycle is delivered and paid, with a minimum 30-day cycle from its original inquiry.
- New workspaces begin at day 0; the day-12 worked example is optional.
- Setup uses a separate draft with explicit Apply/Cancel; inputs show percentages and units.
- Full workspace backups preserve runs, projects, decisions, checkpoints, unfinished drafts, recovery originals and archived workspaces.
- Delivery delays and overdue payments are measured separately.

## Next validation

Stage A is complete; see STAGE-A.md. Stages B and C require the next approval. Complete real-browser interaction, layout and offline storage checks when available; then review model and interface changes before expanding staffing, supplier detail or desktop packaging.
