# Native studio planning controls · 2026-11-20

- Added Earnings lab sliders and exact-value inputs for income, prices, volumes, costs, effort, weekly capacity and reserves directly in MEIQQ.
- Added one shared Studio plan with editable $2,000 combined income and eight weekly hours each; service economics and additional targets remain labeled placeholders. Existing saved plans and baselines migrate without replacement.
- Connected Studio ideas through **Plan this idea**; arbitrary service mixes share the same income and capacity constraints. Dynamic price/workload options preserve all other services and save independent alternatives without changing effort automatically.
- Preserved offline persistence and backup/import, added versioned studio metadata, and checked deletion/Undo, unknown inputs, partner-capacity recovery and multi-service calculations.
- Rebuilt the standalone MEIQQ.html; no pack import is required for the new features.

# Task 2 — $2,000 combined-income target · 2026-11-20

- Set the editable combined-income goal to $2,000 in the working walkthrough files while preserving their earlier frozen baselines.
- Added `Task2-Income-Target-2000.json` with five reviewed scenarios: the current four-at-$600 mix, three at $900, a price-only four-at-$670 mix, a four-at-$670 effort hypothesis and a narrower five-at-$540 offer.
- Used a conservative four-week allowance of 32 hours per person; retained administration and the 10% reserve as explicit editable assumptions. Kept the separate $400 retention goal visible, with weekly allocation sketches and unverified effort reductions clearly labeled.
- Clarified that a monthly budget does not enforce weekly deadlines and removed the README's stale queued status for Task 2.
- Validated all five scenario calculations and backup parsing; 21 focused view/build checks passed. An isolated browser preview confirmed the $2,000 goal and the three-/four-job results with no app warnings/errors. The browser tool blocks the existing file-origin app tab, so these are importable plans, not a claim that browser-saved records were edited.

# Task 2 — Director review and shared-income walkthrough · 2026-11-20

- Reviewed Task 2 independently across calculations, usability and business interpretation. Fixed comparisons that misattributed changes after deleting earlier rows, hidden errors in an empty planner, stale comparison selection when opening/creating/restoring a plan, and reserve percentages understating an existing owner-time shortage.
- Clarified combined co-owner income, zero additional hourly cash pay for a co-owner drawing from that income, net role delivery availability and the non-project work excluded from the counted-hours total.
- Added `Task2-Studio-Walkthrough.json`: three fictional alternatives using the director's combined-income preference and eight-hour weekly maximum per person. Income goal stays unknown; administration, reserve, retained money, price and effort remain editable placeholders.
- All 375 automated checks pass. A separate browser preview confirmed the tailored results and lower-price comparison, with no app errors/warnings. Existing file-origin business records were not changed. Screenshot: `task2-shared-income-review.jpg`.

# Task 2 — Studio capacity and earnings planner · 2026-11-20

- Added an independent offline Planner with blank assumptions, an optional fictional example, arbitrary service mixes, paid-role capacity, recurring expenses, owner income and retained-money targets.
- Counted delivery and setup work separately, paid only used role hours, avoided double-counting idea overhead or owner allowances, and preserved unknown inputs instead of assuming zero.
- Added resource shortages, earnings and target shortfalls, a qualified proportional capacity ceiling, frozen dated baselines and independent alternatives with exact assumption comparisons.
- Added browser persistence, separate Planner backup/import, import copies, save-error recovery messaging, and confirmed plan deletion with session Undo.
- Added an explicit simulator-copy review for a supported single-pool workflow. Setup, generic direct costs and multiple used roles block the copy; demand/cash/timing assumptions require input. The active run and previous draft are preserved, with a downloadable planning source record.
- Verified all 368 automated checks. Browser checks covered editing, unknown costs, dated capture, two alternatives, overload warnings, reload persistence, comparison differences, unsupported-copy explanations and narrow layout. Backup contents/import and supported simulator-copy isolation passed integration tests; browser file-picker/download round-trip was not repeated.

# Jobs quality-of-life fixes · 2026-11-20

- Added recoverable draft deletion with Trash, Undo and restore; recorded jobs use Archive and keep all history. Hidden jobs reject edits until restored.
- Prevented repeated practice-button clicks from creating accidental copies; added explicit New practice copy, stable job IDs, location filters and search.
- Remembered the selected job/section/form, improved keyboard focus, and added persistent form-level posting errors. Fixed editing a search result disappearing mid-keystroke.
- Added Use today, cleared dates after posting, retained unfinished dates and showed supplier unpaid balances in payment choices.
- Added format-v2 migration from existing v1 saves, with the same browser storage key and complete backup retention of Trash/Archive.
- Verified 335 automated checks, browser cleanup/restore/archive/reopen journeys, typing focus and 390px layout/keyboard validation. See S1-REVIEW.md for exact scope and limits.

# S1 — One job end to end · 2026-11-20

- Added a separate offline Jobs workspace with blank real jobs and explicitly selected practice examples. Ad hoc scope does not require a fixed service catalog.
- Added working briefs, next actions, dated agreement snapshots and amendments; work, approval and delivery records; incurred costs, linked partial supplier payments, customer receipts and refunds.
- Added estimate-versus-recorded comparisons, customer and supplier balances, recorded cash movement and owner-time/overhead allowances. Delivery never implies payment; unresolved overpayments prevent settlement.
- Preserved history through dated void corrections. Added a dedicated versioned Jobs backup/import, unfinished-form persistence, conflict detection and preservation of damaged originals. Imports append copies; automatic repair of damaged browser saves is not included.
- Kept all three data domains independent and renamed the simulator navigation to “Run scenario.” Preserved the original S0–S5 roadmap; Task 2 remains queued by director choice.
- Verification: 314/314 automated tests; browser practice journey, correction, reload and unfinished-draft persistence; 320px overflow check. Browser download observation was unavailable; payload/import checks pass. Details and limits: S1-REVIEW.md.

# Studio ideas launch pad · 2026-11-20

- Task 1 review: surfaced total team effort alongside owner hours, clarified optional roles, fixed unchanged-window save conflicts and restored dialog-opener focus. The reviewed build passes all 289 automated checks. `TASK1-REVIEW.md` and `Task1-Analytics-Walkthrough.json` provide the worked example and review decisions.

- Added an independent offline Studio workspace for flexible service ideas, with five editable examples and blank-first creation.
- Added Scope, Numbers and Research sections, paid-role effort estimates, setup effort, first/later engagement comparisons and owner-time allowances. Unknown and invalid estimates remain editable and survive reopening.
- Added separate versioned Studio backups, additive imports, atomic browser persistence and visible conflict/recovery states. Simulator records and assumptions remain separate.
- Added model, view, persistence and integration checks covering cent rounding, incomplete drafts, source escaping, backup limits, stale windows and simulator isolation.
- Verification: all 285 automated checks passed; browser editing, reload persistence, calculations and 320px layout checked. Browser download-path observation was unavailable; backup contents/import round-trips passed integration tests.

# Prototype 03 — finish testing and native-browser verification

- Repair orphaned cash pauses for newly created projects on reopen, with a narrow migration only for the reproducible obsolete save signature.
- Complete modal keyboard cycling across visible buttons, inputs, links, summaries and text areas; retain nested/root openers; handle Safari pointer focus and distinguish DOM IDs from package `data-id` values.
- Treat duplicate blur/change values as no-ops so Safari's first Review click is not swallowed and undo state is preserved.
- Replace verbose service add/remove and raw-scope diffs with one readable service summary and named scope changes.
- Prevent narrow dialog-grid overflow and use two-column setup tabs at 540 px and below.
- Pass 252/252 automated checks and the 24-run experiment matrix covering 3,663 projects, 96 restore/replays and one funded cash block. Verify the packaged offline workflow in Safari 27.3, Firefox 160.0.1 and Chrome 157.0.8103.80, plus 320/390 px in-app layouts. Edge/Windows remains untested; see STAGE-C.md for the exact matrix.

# Prototype 03 — second service engineering review

- Preserve unfinished printing/campaign inputs across save/reload while retaining strict applied-run validation; fix the native-browser reproduction where a 101% print share quarantined an entire added-service draft.
- Cap yearly relationships at 12 monthly or four seasonal opportunities, with safe migration of the exact obsolete unstarted extra quote.
- Suppress invalid service-economics previews, align percentage error units, preserve proposed prices through evidence navigation, and export unadded-package evidence correctly.
- Audit added/duplicated services, freeze catalog records, complete numeric derivations, and distinguish skipped campaigns, unsupported future values and missing finances in reports.
- Group the library into five useful categories and preserve legacy renewal guidance. Verify 239 tests, a repeatable 24-run annual matrix, native Chrome recovery/Run/Pause checks and the in-app library layout. See STAGE-C.md for findings and remaining browser limits.

# Prototype 03 — researched boutique services and campaign relationships

- Replace new-workspace generic offerings with scoped restaurant/café/shop services and a library of 11 packages, including physical monthly and seasonal campaigns. Preserve existing/custom offerings; additions begin at zero inquiry share, and starter replacement has review and undo.
- Freeze published Michigan design/print observations and document modeled prices, hours, design-only fees, print-choice shares, campaign cadence and starter weights. Flag customized values instead of presenting the original derivation as verification.
- Show per-project cost, owner time, supplier quantity and same-scope price comparisons. Let customers choose managed printing or print-ready files; lock the actual route and commercial terms at acceptance.
- Quote and bill each campaign separately within a yearly relationship. Skip a declined campaign and reoffer at the next anchored cadence through the yearly cutoff, with no revenue booked for skipped work.
- Extend project inspection, contract analytics, human-readable comparison reports, validation and workspace restoration. Verify 219 automated checks and a real in-app-browser journey; retain explicit limits for the untested native-browser matrix.

# Prototype 03 — engineering review follow-up

- Preserve contract row and disclosure identity when live rankings change; restore keyboard focus to contract summaries and distinguish analytics-tab/pagination render keys.
- Avoid rebuilding full contract analytics for every saved-run comparison row. Index contract records once during analytics aggregation instead of repeatedly scanning them.
- Validate project-to-contract client and service ownership before importing a run, including pending repeat work. Recover fully prepaid legacy projects before delivery without changing money or ledger history.
- Reject unsupported model versions and duplicate queued order identities before import. Subtract outreach time when estimating owner bottleneck capacity; represent positive work with zero capacity as having no finite clearance time.
- Add focused frontend node-identity, backend import and analytics regressions, plus a reproducible large-workload benchmark (`node review-benchmark.cjs`). Timing reports cover JavaScript aggregation and HTML generation, not browser painting.

# Prototype 03 — analyst results workspace

- Reconcile the analytics source and generated HTML, with financial and UI regression coverage retained in the repository.
- Organize results into Profit overview, Contracts, Simulation stats and Cash & ledger, eliminating repeated summaries between views.
- Explain delivered contribution, operating and owner-time margins through a revenue-to-result bridge and service contribution table.
- Add contract search, filters, ranking, 20-row pagination and project drill-down; distinguish booked value, earned revenue, collections and unfinished costs.
- Add monthly trends and detail, decided-quote conversion, returning-cycle share, delivery measures and saved-run comparisons with period and workload caveats.
- Verify controlled arithmetic, all four horizons, restoration, partial periods, source and packaged navigation, filtering, pagination, escaping and drill-down.

# Prototype 03 — Stage B model consistency

- Give every external lead a stable day/index identity with independent conversion, complexity, revision, approval, supplier, payment and return random streams. Same-seed capacity comparisons now hold unrelated external demand constant.
- Define the daily event order as due collections, overhead, confirmed repeat cycles, new external demand, outreach and scheduled project work. Permit bounded same-day transitions when work or waits are zero.
- Limit one project to one designer's daily availability while allowing different projects to run in parallel across the configured designers.
- Commit quote effort when demand arrives and lock delivery effort, price, scope, payment terms, approval time, print time and promised lead time when the quote is accepted.
- Persist client and contract identities across paid-cycle subscriptions and confirmed repeat orders. Track fulfillment, payment and renewal eligibility separately.
- Label recurring work as paid-cycle subscriptions rather than calendar billing, and label the owner-time result as a current-target revaluation of all recorded owner hours.
- Add quote age, open owner/design work, completed lateness, on-time rate, lead-time and recent-throughput measures. Rank combined owner work, design work and external waits as distinct bottleneck resources.
- Add controlled workload, timing, capacity, commitment, lifecycle, delay and bottleneck fixtures while retaining the Stage A financial and migration invariants.

# Prototype 03 — business profiles and targeted offerings

- Add 22 food, retail and local-service business types with distinct hypothetical names, contexts and stable identities for repeat work.
- Add editable customer-group shares, a niche focus and workflow-variation strength. New profiles influence work hours, approval timing, revision chance and return frequency; old runs keep generic behavior until enabled.
- Add seven editable offering templates and audience suitability. Unmatched inquiries are counted, and the first-month preview excludes them from orders and revenue.
- Validate profile references and unserved counts in saved runs; add deterministic simulation and UI regression checks.
- Keep valid unfinished drafts from older workspaces despite new optional profile fields. Allow a preserved original to restore its draft alone, with the current workspace archived first.

# Prototype 03 — quieter workspace UI

- Keep Run playback visually stable by patching changed DOM nodes in place and delaying the save indicator so fast background writes cannot shift the screen every tick.
- Keep the original pre-update save available under a collapsed **Runs & backups → Original files** section. Remove the persistent migration banner after successful recovery.
- Hide routine saved status, remove duplicate setup and workflow instructions, and keep pending/failed save states visible. Show unapplied setup changes as a compact action beside the page title.
- Simplify the empty project inspector and remove success toasts for actions already visible in the interface. Keep errors, cash decisions, and backup download feedback.

# Prototype 03 — Stage A review and browser-save recovery

- Recover older checkpoints with missing delivery dates when their delivery log identifies the date, and correct the documented completed-payment date shift only when the receipt ledger confirms it. Current-format saves remain strictly validated.
- Preserve the exact original older save before browser storage is migrated. Explain why an unreadable save cannot be used and make the unsaved state explicit.
- Fix primary/fallback storage transitions, stale-write conflict reporting, empty-string save preservation, draft field display and service identity collisions. Keep modal controls and focus in sync with rerenders.
- Rebuild the offline HTML and add storage, migration and UI regression checks. A real Chrome profile recovered its day 31 run, 47 projects, five checkpoints and draft, then exported a validated backup.

# Prototype 03 — Stage A reliability

- Preserve entire workspaces when opening backups or worked examples; reopen/export/delete preserved copies in Scenarios.
- Permit backups with unfinished inputs. Quarantine malformed draft structures without losing their original bytes.
- Add version 3 backups with shared snapshot storage, symmetric 128 MiB limits, legacy import and readable original-save import.
- Keep 12 automatic checkpoints, deduplicate identical snapshots, and add naming/pinning/deletion for manual retention.
- Prefer atomic IndexedDB saving, preserve legacy local saves, debounce draft writes and report pending/failed saves. Detect stale-window writes.
- Validate project/ledger reconciliation, references, stage/delivery relationships, dates, funding totals and historical financial results before import.
- Escape imported ledger labels and change-review values.
- Complete fully prepaid deliveries immediately; exclude zero balances from overdue payments.
- Build cash charts from ledger movements and update same-day observations after funding.
- Round posted transactions consistently; migrate only documented, ledger-supported legacy inconsistencies.
- Add regression, storage, migration and packaged-HTML checks. Model and navigation changes from Stages B/C remain pending.

# Prototype 02 — usability and simulation revision

## Interface

- Replaced the single long assumptions form with four guided setup steps.
- Added explicit draft state, live draft preview, Apply/Cancel, and an impact review.
- Replaced fraction inputs with percentages and labeled money/time units.
- Added editable quotation time, delivery work and delivery promises.
- Replaced the horizontally scrolling fixed-coordinate map with responsive numbered stages and responsibility lanes.
- Added client/project search, filters and next-action explanations.
- Starts new workspaces at day 0; the day-12 sample is now optional.
- Added Finish month alongside run, pause, daily step, speed and horizon controls.
- Kept Light, Dark and Terminal themes.

## Engine and persistence

- Aligned instant estimates with the first simulated 30 days and 22 workdays.
- Limited outreach estimates to the owner's actual available hours.
- Separated late open deliveries from overdue payments.
- Locked payment, approval and print terms when quotes are accepted.
- Manual approval no longer triggers another random revision.
- Added independent uncertainty switches and stronger input validation.
- Replaced setup-only export with validated full-workspace backup/import.
- Added legacy migration and protection against overwriting unreadable browser saves.
- Added snapshot cash/revenue/expense reconciliation checks.
- A changed cost can resolve a paused payment by replaying the day under the revised settings.

## Verification

42 engine and UI-logic checks passed. Visual browser QA remains unavailable; no claim of cross-browser visual verification is made.
