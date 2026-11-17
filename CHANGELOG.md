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
