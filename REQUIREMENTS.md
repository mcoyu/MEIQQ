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

Prototype 03 completes Stages A, B and the automated implementation portion of Stage C from the November 17 audit. Stage A covers workspace preservation and recovery, financial validation, safe rendering of imported values, prepaid completion, accurate cash observations and controlled storage growth. Stage B adds stable external-demand identities, explicit daily ordering and same-day transitions, per-project designer capacity, commitment boundaries, persistent client/contract records, separated fulfillment/payment/renewal status, and stronger delay and bottleneck measures. The customer-profile extension adds a hypothetical 22-type local-business catalog, editable group mix and niche focus, and suitable offerings. Stage C adds service economics and capacity previews, structured validation, exact assumption changes, persistent pinned baselines, result explanations and interruptible month runs. Its cross-browser release gate remains open. This is not the complete production application. README and the stage notes distinguish implemented behavior from future scope.

## Defaults chosen for the prototype

- MEIQQ working title; restrained green / off-white workspace.
- Single offline HTML distribution before native packaging.
- Shared owner capacity; one designer-day maximum per project with parallel work across designers; hourly pay for actual design labor.
- Fixed stage routing; printing is omitted when print cost is zero.
- Actual elapsed-day event history; seeded randomness.
- Daily atomic transactions: a failed cash payment rolls back the proposed day.
- Earliest-deadline scheduling by default, priority overrides, alternative FIFO.
- Simplified incurred-cost operating result, explicitly distinct from formal accounting.
- The recurring option is a paid-cycle subscription: its next cycle begins after the previous cycle is delivered and paid, no earlier than 30 days after the prior inquiry. It is not fixed calendar billing.
- New workspaces begin at day 0; the day-12 worked example is optional.
- Setup uses a separate draft with explicit Apply/Cancel; inputs show percentages and units.
- Full workspace backups preserve runs, projects, decisions, checkpoints, unfinished drafts, recovery originals and archived workspaces.
- Delivery delays and overdue payments are measured separately.

## Next validation

See STAGE-A.md, STAGE-B.md and STAGE-C.md. Complete the Stage C real-browser matrix for current stable Chrome, Edge, Safari and Firefox on their major desktop platforms, including the canonical journey, keyboard behavior, narrow windows, downloaded-backup reopen and offline storage fallback. Automated contract-host coverage is not browser certification. Finish that gate before expanding staffing, supplier detail or desktop packaging.
