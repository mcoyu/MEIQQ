# MEIQQ — Prototype 03 · Stage A

## Open

Extract the ZIP and double-click **MEIQQ.html**. Choose a modern browser if prompted. It runs offline on Windows and Mac, with no installation or server. A native desktop installer is not included.

## A clearer first experiment

1. Open **1. Set up**. Work through **Services → Customers → Team & time → Cash & timing**.
2. Change the numbers you want. Prices and hours show their units; percentages use values such as **70**, not **0.7**.
3. Read the draft preview. It shows potential monthly economics and the hours required versus hours available.
4. Select **Review & apply changes**. Apply to future work, or save the current run and start a new one.
5. Open **2. Run business**. Advance **1 day**, press **Run**, or select **Finish month**.
6. Click a project to see what must happen next, its agreed price, costs, deadline and timeline.
7. Open **3. Review results**. Inspect cash, operating result, owner time and overdue balances separately.

New users start on day 0. **Open worked example** loads a hypothetical studio on day 12 after preserving the complete current workspace in **Scenarios → Preserved workspaces**. Existing readable browser saves are resumed automatically.

## Editing without surprises

Inputs belong to a **draft**. Typing does not change the running simulation. The preview updates without rebuilding the form or interrupting typing. Your draft is saved separately from the applied setup.

- **Apply going forward:** capacity and labor costs change for upcoming work. New quotes use new service prices and terms. Already accepted prices, scope, payment terms, approval waits and print turnaround commitments stay fixed.
- **Apply & start new run:** saves a checkpoint and starts on day 0 with the new assumptions.
- **Cancel all draft changes:** returns to applied settings.
- Changing the starting cash or random seed after day 0 requires a new run. To fund the current business, use **Add owner funding**.
- Service inquiry shares must total 100%. **Balance shares equally** fixes the total immediately. A newly added or duplicated service starts at 0% so it cannot silently change the workload.
- Empty or invalid values are flagged; they are not silently treated as zero.

## Find and understand projects

The workflow uses numbered steps and responsibility lanes for Clients, You, China team and Suppliers. Digital services skip printing. The layout no longer requires a wide horizontal canvas.

Select a stage to inspect its queue, or a project to see its next action. **Projects** provides client/project search and filters for active, late, payment, completed and declined work.

Project controls support prioritization, extending the agreed delivery deadline, and confirming client approval. Decisions are recorded in the timeline. Confirming approval bypasses another random revision request.

## Scenarios and backups

**Branch scenario** preserves the current run and continues in a copy. **Save checkpoint** records a frozen observation. Loading a checkpoint first preserves the current run.

**Backup** downloads the current run, projects, cash, histories, funding, checkpoints, unfinished draft and preserved workspaces. Blank or out-of-range draft inputs do not block export. **Open backup** validates the complete file before opening it and preserves the entire previous workspace, including its checkpoints and draft. Older full-workspace exports, readable original browser saves, and setup-only exports remain importable.

Backups use version 3 and a shared **128 MiB** export/import limit. Identical snapshots are represented once. If a workspace approaches the limit, export preserved workspaces separately and remove unneeded saved copies. Prototype 02 cannot read these new backups; use the new MEIQQ.html.

The latest **12 automatic checkpoints** are retained. Manually saved checkpoints stay until explicitly deleted. **Name / keep** names and pins an automatic checkpoint. Identical checkpoints are not duplicated. Preserved workspaces have Open, Export and Delete controls; they are not automatically discarded.

Malformed draft structures are quarantined as recovery originals while the form opens with the last applied settings. Recover these originals through Scenarios. Financially inconsistent runs are rejected without replacing active work. Truly malformed JSON cannot be reconstructed automatically; its raw original remains available for download and is included in backups of the recovery workspace.

Browser saving prefers atomic IndexedDB transactions and falls back to local storage if unavailable. The previous local save is retained during migration. Draft writes are debounced, routine rendering does not trigger a full save, and save status distinguishes pending, saving, saved and failed writes. Primary storage rejects conflicting changes from another app window; the local-storage fallback also checks whether its original save changed before writing. Back up the affected window before reopening after a conflict. Failed writes keep the last committed save and leave the current workspace available in memory for backup.

Backups do not contain browser theme preferences.

Browser storage remains specific to browser and file location. Download a backup before moving or replacing the HTML. Saves from the older prototype use the same storage key when the browser makes them available. When importing an old snapshot that did not record project terms, migration retains recorded values and uses that snapshot's saved settings only for missing terms. Unrecoverable or inconsistent histories are left intact for manual recovery.

## Appearance

The top-bar **Appearance** selector offers:

- **Light:** off-white surfaces and green accents.
- **Dark:** dark slate surfaces, light text and teal accents.
- **Terminal:** Bloomberg-inspired black, amber, monospace typography and cyan project text. This is independent software, with no Bloomberg connection or data.

## Economics and uncertainty

All initial inputs and client names are hypothetical. They are not researched market forecasts.

The preview and simulation now both use the first **30 calendar days / 22 working days**. Preview totals assume full fulfillment of new converted inquiries; they exclude returning clients, delays and uncertainty. Outreach estimates respect the same available-owner-hours cap as the running engine.

One tick is a day. Work is available five days in seven. A project advances at most one stage per day. Role capacity is shared. Designers are paid for hours actually worked. The owner's time is valued separately rather than deducted from cash.

Deposits enter cash on quote acceptance. Fully prepaid delivered projects complete immediately and are never counted as overdue payments. Funding appears immediately in the cash chart and current-day cash observation. Revenue is recognized on delivery. Costs are expensed when incurred, including costs on unfinished work. This is an operating simulation, not full accrual accounting. Owner funding changes cash but never revenue or profit.

Delivery promises begin at quote acceptance. **Late open deliveries** count undelivered accepted projects past their due date. **Overdue final payments** are separate; delivered work waiting for cash is not a late delivery.

Optional uncertainty controls separately enable variable complexity, extra revisions, approval delays, supplier delays and late payments. The master switch must be enabled for them to affect projects. Identical initial inputs and seed reproduce the same run. Different capacity or demand can change renewal timing and later work.

Subscriptions and repeat purchases are configurable by service. A new cycle starts after the prior cycle is paid; subscription renewals are at least 30 days apart. Overlapping unpaid cycles are not modeled.

Cash shortfalls roll back the proposed day atomically. Add explicit funding, or revise applicable costs, then retry. Transactions are never duplicated. Already agreed project prices and supplier costs are preserved.

## Remaining limits

- Staff hours are pooled by role; named staffing and individual reassignment remain future work.
- Supplier alternatives, production quantities, borrowing and expense deferral remain future work.
- Workflow routing is fixed, with printing optional per service.
- Native Windows/Mac packages and full visual browser QA remain outstanding.

## Source and checks

The archive includes source, build script, tests, requirements and change notes. No dependencies are installed.

```sh
node build.cjs
node --test *.test.cjs
```

The automated suites cover simulation behavior, strict saved-run validation, original Prototype 02 migration, backup round trips larger than the old 25 MiB limit, preserved workspaces, incomplete and malformed drafts, checkpoint retention, failed/competing storage writes, prepaid completion, cash history and the actual generated HTML. See **STAGE-A.md** for the release verification.

The UI checks run in a minimal JavaScript host and storage tests use a controlled IndexedDB contract double; they are not visual browser tests. Browser layout and real click-through QA remain unverified because the environment denied local server binding and blocked local-file browser navigation. The revision uses responsive CSS rather than fixed canvas coordinates, but rendering across browsers still needs visual verification.
