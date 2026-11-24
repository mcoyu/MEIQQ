# MEIQQ — Prototype 03 · Stage C

## Open

Extract the ZIP and double-click **MEIQQ.html**. Choose a modern browser if prompted. It runs offline on Windows and Mac, with no installation or server. A native desktop installer is not included.

## Studio ideas launch pad

Open **Studio ideas** in the sidebar to explore what the studio could offer. This is an independent offline workspace for unfinished ideas; it does not create customers, jobs, payments or simulator assumptions.

- Start with five editable examples covering analytics, creative work, product content, supplier coordination and Chinese-market discovery, or add a **Blank idea**. Example context is not a chosen service menu or evidence of demand. Prices and effort start unknown.
- Use **Scope** to describe the buyer, outcome, priced unit, inputs, handoffs and completion checks. **Research** keeps notes, references and the next thing to validate. Opening an external source link is optional and needs connectivity; the saved notes work offline.
- Use **Numbers** for USD price, direct costs, paid roles, your hours, your time target and allocated overhead. **First engagement** includes preparation once; **Later engagement** excludes it and assumes that preparation can be reused. Both use the same proposed price. No sales volume is assumed.
- **Compare ideas** shows the available estimates together, including total work hours and your share of that effort. Hours are summed work, not elapsed turnaround. Blank or invalid inputs stay unknown, and negative remainders remain visible. “Left after allowances” deducts direct costs, your time allowance and overhead. “Available / owner hour” is before valuing your time. Neither is recorded cash or guaranteed income.
- Edits save in this browser using a separate Studio record, with IndexedDB and a localStorage fallback. **Studio backup** downloads a portable copy of ideas and research. **Import ideas** validates a Studio backup and adds independent copies, preserving existing ideas. Studio backups have an 8 MiB limit and are separate from simulator backups.

Keep browser backups before clearing site data, changing browsers or moving the HTML file. If saving fails or another window changes the same Studio record, the app shows the problem; download your session before closing it. Research links are manually supplied references, not an automated research service. Copy an idea into Planner to test a provisional mix; Jobs manages separately entered real client work.

## Task 2 — Studio capacity and earnings

Open **Planner → Earnings lab** to edit the app directly. Its **Studio plan** starts with a $2,000 combined owner-income target and eight weekly hours for each partner. Sliders and exact-value fields update price, volume, costs, effort, capacity and the target shortfall immediately. These controls work with any service mix; no import is needed. Existing plans and frozen baselines are preserved when the app adds the Studio plan once.

1. **Earnings lab:** explore prices and workload against shared studio targets. **Try this price & volume** saves an independent alternative using the calculated required price; it preserves the starting baseline and never silently reduces effort. **Studio ideas → Plan this idea** copies a researched idea into the Studio plan, leaving its source intact and unfinished assumptions unknown.
2. **Baseline:** enter your total hours, non-project time, reserve buffer, each paid role's delivery capacity and rate, recurring studio costs, owner income target and extra retained-money target. Unknown estimates stay blank until you can supply them.
3. **Service mix:** add any provisional service or copy a Studio idea. Define its priced unit, whole-unit quantity, price, direct costs and your effort. Map paid work to a role pool. Enter how many units need extra setup; setup work is counted only that many times. Copied ideas remain independent, and their per-idea overhead and hourly owner allowances are not deducted again.
4. **Results:** inspect role-by-role shortages, used-hour labor costs, money available for your income, the remainder after that target, and the shortfall against both targets. These are before-tax planning calculations, not demand forecasts or recorded cash. The proportional capacity ceiling may imply fractional units; the entered whole-unit workload receives its own capacity check.
5. **Capture dated baseline**, then **New alternative:** change volume, prices, effort or capacity and use **Compare** to see the frozen starting assumptions beside an alternative. Every alternative keeps its own baseline snapshot. Later edits and new baseline captures do not rewrite existing alternatives.

Planner saves independently in this browser with IndexedDB/localStorage fallback. **Planner backup** downloads all plans and snapshots; **Import plans** adds validated copies and preserves existing plans (8 MiB limit). **Delete plan** asks first and offers Undo until another deletion or app close. Keep portable backups before changing browsers or clearing local data.

**Review Simulator copy** explains a limited mapping before any draft is created. Currently supported: no setup, zero generic nonlabor direct costs and at most one paid delivery pool. Multiple roles, setup and print/supplier workflows remain fully usable in Planner but cannot yet be copied faithfully into Simulator. Demand, cash and timing assumptions must be explicitly entered. A supported copy preserves the current run and earlier setup under **Runs & backups**, carries its planning source as a downloadable original file, and opens a new setup draft for review. It does not apply or run automatically.

Weekly availability uses a conservative four-week budget inside the 30-day plan: 8 × 4 = 32 hours each. Six non-project hours per person and a 10% reserve leave 23.4 project hours each. The $400 retained target, $200 recurring expenses and all starter service prices, costs, volumes and effort are editable research placeholders. The partner's additional cash rate starts at zero because both owners share the combined income target. These budgets do not schedule individual weeks or establish market demand.

The earlier walkthrough JSON files remain optional historical examples; native controls and scenarios now replace that import workflow. Saved alternatives are independent snapshots: changing the Studio plan does not silently update their assumptions.

See **TASK2-REVIEW.md** for the worked example and verification record.

## S1 — One job end to end

Open **Jobs** to manage an ad hoc client job without choosing a fixed service menu. Start with **Blank real job** or explicitly add the fictional **practice example**. Practice records remain visibly marked and cannot be silently converted to real ones.

Use **Delete draft** to move an unrecorded job to **Trash**. **Undo** or **Trash → Restore draft** brings it back with all unfinished inputs. Jobs with an agreement or any posted history instead offer **Archive job**; restore them from **Archived** to resume editing. Cleanup is recoverable, and recorded history is retained. Search works within Active, Archived or Trash; each card shows its stable job ID so identical examples can be distinguished. Editing a searched job clears the search if the edit would otherwise hide that job mid-typing.

**Open practice example** reopens an existing active practice job. Use **New practice copy** only when you deliberately want another. The selected job, section and entry type are remembered in this browser. Failed posts keep your input and show a persistent error beside the form. New event dates start blank; use **Use today** or enter the date the event happened. A successful post clears its date so the next event does not silently inherit it. Existing unfinished dates are preserved and dates other than today prompt a check.


1. **Overview:** enter the client, scope, proposed price, next action, owner, dates and payment terms. Optional cost, time and overhead estimates can remain unknown. Record an agreement only when accepted; later draft edits preserve its exact snapshot. Record an amendment with a reason when agreed terms change.
2. **Work:** post dated owner/external hours, approvals and deliveries with references. External hours do not automatically become an expense. Delivery does not create a receipt.
3. **Money:** record incurred costs, linked supplier payments, customer receipts and refunds separately. Partial payments are supported. Compare agreed estimates against recorded costs and hours. Job cash movement is not a bank balance or profit; owner time and overhead remain allowances.
4. **History:** inspect preserved agreements and events. Void a mistake with a dated reason, then record its replacement. Linked payments must be corrected before voiding their cost. A delivered job is settled on recorded entries only when its customer balance, overpayment and recorded unpaid costs are all zero.
5. **Jobs backup / Import jobs:** download a separate typed JSON file including active jobs, Archived, Trash, agreements, events, corrections and unfinished forms. Import validates the entire file and adds new copies, preserving real/practice labels. Importing the same backup twice creates duplicates. The limit is 8 MiB; restore into an empty Jobs workspace when recovering a whole backup.

Jobs save offline in their own IndexedDB/localStorage record. Format v2 reads and upgrades existing v1 saves and backups through the same storage key; older Jobs builds cannot read v2 backups. View preferences are browser-local and are not part of the portable backup. Simulator controls and Studio idea edits cannot advance jobs or change their money. Unknown/invalid unfinished input survives reopening; actual posting requires valid values. Damaged or divergent browser saves are preserved and write-blocked. Import does not repair them: export the preserved originals and current session, then open a valid Jobs backup in a fresh browser profile or another browser. Failed saves remain available in memory for backup.

S1 is manual, single-operator recordkeeping in USD. It does not send quotes/invoices, collect payments, store attachments, synchronize collaborators or provide bank reconciliation/tax accounting. References are text; retain source files separately. No live-job data flows into simulation yet. **Task 2 is available in Planner.** See [the whole-studio roadmap](STUDIO-EXPANSION-PLAN.md) and [the S1 walkthrough and review](S1-REVIEW.md).

## A clearer first experiment

1. Open **1. Set up**. Choose a Metro Detroit scenario recipe, or work through **Services → Customers → Team & time → Cash & timing**.
2. Change the numbers you want. Prices and hours show their units; percentages use values such as **70**, not **0.7**.
3. Read the draft preview. It shows potential monthly economics and the hours required versus hours available.
4. Select **Review & apply changes**. Apply to future work, or save the current run and start a new one.
5. Open **2. Run scenario**. Advance **1 day**, press **Run**, or select **Finish month**.
6. Click a project to see what must happen next, its agreed price, costs, deadline and timeline.
7. Open **3. Review results**. Inspect cash, operating result, owner time and overdue balances separately.

New users start on day 0 with the Metro Detroit / solo / steady recipe: 15 owner hours per week, four outreach hours at 0.30 qualified inquiries per hour, 30% qualified-quote acceptance and $18 per designer hour. These are low-confidence modeled starting assumptions, not measured benchmarks. Existing readable browser saves are resumed unchanged; use the recipe loader if you want to merge the newer assumptions into an older saved draft. **Open worked example** loads a hypothetical studio on day 12 after preserving the complete current workspace in **Runs & backups → Preserved workspaces**.

## Local scenario recipes

Setup asks four understandable questions: **where is the studio**, **how large is the operation**, **who does it serve**, and **what kind of month is being tested**. Six local-market narratives, four operating models, six shop mixes and five conditions can be combined in 720 ways; that count is combinatorics, not 720 observed or researched markets. Applying a recipe changes only the draft; review its exact values before applying it to a run. Recipe loading merges market, team, customer and condition assumptions while preserving your service catalog, prices and mix, starting cash, seed and horizon.

Public context supplies vocabulary and qualitative setting through U.S. Census QuickFacts, the May 2025 BLS Detroit-area wage release, Michigan wage rules and selected city economic-development pages. It does not establish the ordering of recipe values and does not publish design-service conversion, demand or price forecasts. The app therefore treats prices, inquiries, conversion and operating behavior as transparent modeled scenarios—not market quotes or predictions.

The evidence supplies broad context, not a numeric calibration formula. `preset-evidence.js` contains frozen public observations and modeled parameter records with dates, scopes and derivation inputs. Exact price factors, inquiry counts, conversion rates, payment timing, staffing, labor rates and shop percentages are scenario-design choices. Michigan wage rules do not establish the cost of overseas design labor. High lineage coverage means the app can explain where its preset values came from; it does **not** mean those values are empirically calibrated or validated. See [PRESET-EVIDENCE.md](PRESET-EVIDENCE.md) for the parameter-by-parameter boundary, source register and reproducibility limits.

Composed recipe values and their versioned recipe origin survive browser saves, checkpoints, backups, preserved workspaces and import. The selector's current UI position is still a separate browser preference, so it may show another combination after import; use the recipe origin shown on the saved run, and treat the saved exact assumptions as authoritative.

**Steady month** is the neutral demand multiplier, not a guarantee of spare capacity. The recipe preview warns when expected work exceeds the selected team. Ordinary uncertainty uses the master switch; higher-impact rush deadlines, supplier reprints, repeated revision rounds and extended late payments are separately opt-in modeled disruptions with editable inferred frequencies.

- [U.S. Census QuickFacts](https://www.census.gov/quickfacts/)
- [BLS Detroit-Warren-Dearborn occupational wages](https://www.bls.gov/regions/midwest/news-release/2026/occupationalemploymentandwages_detroit_20260715.htm)
- [Michigan minimum wage](https://www.michigan.gov/leo/bureaus-agencies/ber/wage-and-hour/min-wage)
- [Detroit retail-corridor initiative](https://detroitmi.gov/government/mayors-office/mayors-initiatives-and-programs/detroit-open-retail-business)
- [Ann Arbor economic health](https://www.a2gov.org/planning/economic-health/)
- [Royal Oak business and economic development](https://www.romi.gov/558/Business)

## Editing without surprises

Inputs belong to a **draft**. Typing does not change the running simulation. The preview updates without rebuilding the form or interrupting typing. Your draft is saved separately from the applied setup.

- **Apply going forward:** capacity and labor costs change for upcoming work. New quotes use new service prices and terms. Already accepted prices, scope, payment terms, approval waits and print turnaround commitments stay fixed.
- **Apply & start new run:** saves a checkpoint and starts on day 0 with the new assumptions.
- **Cancel all draft changes:** returns to applied settings.
- Changing the starting cash or random seed after day 0 requires a new run. To fund the current business, use **Add owner funding**.
- Service inquiry shares must total 100%. **Balance shares equally** fixes the total immediately. Shares are relative among offerings suitable for each business group, so actual project mix can differ from the overall shares. A newly added or duplicated service starts at 0% so it cannot silently change the workload.
- Empty or invalid values are flagged; they are not silently treated as zero.

## Businesses and offerings

New workspaces draw inquiries from **22 business types**: bakeries, bubble tea shops, noodle and dumpling shops, cafés, pizzerias, fast-casual and sit-down restaurants, food trucks, dessert shops, retailers and local services. Names are hypothetical and distinct within a run. Returning clients keep their business type and identity.

In **Customers**, set the share of inquiries from food, retail and local services, choose an optional niche focus, and select no, moderate or stronger workflow variation. The focus type receives half of its group's inquiries. Business types can change illustrative work hours, approval waits and repeat frequency; the overall conversion, service prices, print costs and capacity still come from your inputs. Older saved runs keep their original generic customer behavior until you enable business types in the draft and apply it.

In **Services**, add an editable starter offering for menus, window promotions, flyers, social graphics, loyalty cards, digital menu boards or a seasonal campaign. Starter prices and costs are examples, not vendor quotes; [SERVICE-EVIDENCE.md](SERVICE-EVIDENCE.md) records their frozen observations, modeled derivations and exclusions. New offerings start at **0% inquiry share** until you assign a share. Set each offering's suitable business group. A new inquiry with no matching offering is counted as unserved; the preview includes expected unserved inquiries and the workflow shows the actual count. Existing accepted project terms remain locked.

For print-bearing work, customers choose agency-managed printing or design-only files at quote acceptance. The setup share is an unvalidated modeling assumption used only for expected unit economics; accepted projects record the realized route and locked price/cost terms. Monthly and seasonal packages model a year-long relationship with separately quoted 30- or 90-day campaigns, not guaranteed revenue or a prepaid annual subscription. Declining one campaign skips that cycle without ending the relationship; another quote can be offered at the next cadence through the one-year cutoff. The chosen product policy is pay per campaign. Monthly invoicing and annual prepayment are unsupported alternatives, not unresolved setup choices.

## Find and understand projects

The workflow uses numbered steps and responsibility lanes for Clients, You, China team and Suppliers. Digital services skip printing. The layout no longer requires a wide horizontal canvas.

Select a stage to inspect its queue, or a project to see its next action. **Projects** provides client/project search and filters for active, late, payment, completed and declined work.

Project controls support prioritization, extending the agreed delivery deadline, and confirming client approval. Decisions are recorded in the timeline. Confirming approval bypasses another random revision request.

## Analyst results workspace

Open **3. Review results**. Four focused views share the current scenario and elapsed-day context:

- **Profit overview:** delivered revenue, contribution margin, operating margin and the result after owner time. The bridge reconciles delivered direct costs, unfinished-work costs and overhead. Services are ranked by contribution dollars.
- **Contracts:** search by client or ID, filter open deliveries or outstanding balances, and rank contracts by revenue, contribution, margin, receivables or result after owner time. Twenty rows per page keep long simulations manageable. Expand a client for booked value, collections, hours and project links.
- **Simulation stats:** decided-quote conversion, returning-cycle share, delivery performance, monthly trends and a table comparing the current run with saved checkpoints. Partial months and different elapsed days are labeled.
- **Cash & ledger:** cash reconciliation, cash history and the latest 100 transactions.

Contribution compares delivered revenue with direct costs of delivered work. Operating margin also deducts unfinished-work costs and shared overhead. Owner-time results value all recorded hours at the currently applied target; this is not a cash expense. Ratios display **—** when their denominator is zero. Contract results exclude shared overhead, outreach and unsuccessful new-business quoting. Recurring cycles are grouped under one contract. A matching simulation seed does not guarantee matching demand settings.

## Runs and backups

**Branch scenario** preserves the current run and continues in a copy. **Save checkpoint** records a frozen observation. Loading a checkpoint first preserves the current run.

**Comparison report** lets you choose any two distinct current or saved runs. It downloads one self-contained HTML file with comparability warnings, measured results, exact assumption changes, service and project figures, recipe origin, detected post-recipe edits and available evidence/derivation records. The export does not change either run. Open it offline in a browser to read, print or save as PDF.

**Backup** downloads the current run, projects, cash, histories, funding, checkpoints, unfinished draft and preserved workspaces. Blank or out-of-range draft inputs do not block export. **Open backup** validates the complete file before opening it and preserves the entire previous workspace, including its checkpoints and draft. Older full-workspace exports, readable original browser saves, and setup-only exports remain importable.

Backups use version 3 and a shared **128 MiB** export/import limit. Identical snapshots are represented once. If a workspace approaches the limit, export preserved workspaces separately and remove unneeded saved copies. Prototype 02 cannot read these new backups; use the new MEIQQ.html.

The latest **12 automatic checkpoints** are retained. Manually saved checkpoints stay until explicitly deleted. **Name / keep** names and pins an automatic checkpoint. Identical checkpoints are not duplicated. Preserved workspaces have Open, Export and Delete controls; they are not automatically discarded.

Malformed draft structures are quarantined as original files while the form opens with the last applied settings. Download them from the collapsed **Original files** section in Runs & backups. If an original contains a valid unfinished draft, **Restore draft** recovers only those setup inputs and preserves the current workspace first. It does not change the active projects or applied settings. Financially inconsistent runs are rejected without replacing active work. Truly malformed JSON cannot be reconstructed automatically; its raw original remains available for download and is included in backups of the recovery workspace. If the app says a saved workspace needs recovery, download its original before opening another backup; edits in that tab will not save until the problem is resolved.

Browser saving prefers atomic IndexedDB transactions and falls back to local storage if unavailable. The previous local save is retained during migration. Draft writes are debounced, routine rendering does not trigger a full save, and pending or failed writes are displayed while a settled save stays quiet. Primary storage rejects conflicting changes from another app window; the local-storage fallback also checks whether its original save changed before writing. Back up the affected window before reopening after a conflict. Failed writes keep the last committed save and leave the current workspace available in memory for backup.

Backups do not contain browser theme preferences.

Browser storage remains specific to browser and file location. Download a backup before moving or replacing the HTML. Saves from the older prototype use the same storage key when the browser makes them available. Migration keeps the exact older browser save available under **Runs & backups → Original files** before writing the updated format. Successful migration does not leave a persistent warning on the main screen. Older checkpoints missing delivery dates are repaired only when their delivery history identifies the date; a known completed-payment date error also requires matching completion and receipt records. When importing an old snapshot that did not record project terms, migration retains recorded values and uses that snapshot's saved settings only for missing terms. Unrecoverable or inconsistent histories are left intact for manual recovery.

## Appearance

The top-bar **Appearance** selector offers:

- **Light:** off-white surfaces and green accents.
- **Dark:** dark slate surfaces, light text and teal accents.
- **Terminal:** Bloomberg-inspired black, amber, monospace typography and cyan project text. This is independent software, with no Bloomberg connection or data.

## Economics and uncertainty

Client names and exact outcomes are hypothetical. Local preset ranges use the public evidence listed above, but they are scenario inputs rather than researched market forecasts or vendor quotes.

The preview and simulation now both use the first **30 calendar days / 22 working days**. Preview totals assume full fulfillment of new converted inquiries; they exclude returning clients, delays and uncertainty. Outreach estimates respect the same available-owner-hours cap as the running engine.

One tick is a day. Work is available five days in seven. When work or a wait has zero remaining duration, a project can cross multiple stages on the same day. Owner capacity is shared by quoting, review, delivery and outreach. Design capacity is shared across projects, but one project can use at most one designer's daily availability; separate projects can run in parallel across designers. Designers are paid for hours actually worked.

The owner's time is valued separately rather than deducted from cash. **After owner-time target** is a decision aid: all recorded owner hours are multiplied by the currently applied hourly target, so changing that target revalues the full run rather than preserving a historical rate per hour.

Deposits enter cash on quote acceptance. Fully prepaid delivered projects complete immediately and are never counted as overdue payments. Funding appears immediately in the cash chart and current-day cash observation. Revenue is recognized on delivery. Costs are expensed when incurred, including costs on unfinished work. This is an operating simulation, not full accrual accounting. Owner funding changes cash but never revenue or profit.

Delivery promises begin at quote acceptance. **Late open deliveries** count undelivered accepted projects past their due date. **Overdue final payments** are separate; delivered work waiting for cash is not a late delivery.

Optional uncertainty controls separately enable variable complexity, extra revisions, approval delays, supplier delays and late payments. The master switch must be enabled for them to affect projects. Identical initial inputs and seed reproduce the same run. External leads have stable day/index identities and separate random streams, so a capacity comparison with the same seed keeps unrelated external demand fixed. Capacity can still change the timing and number of confirmed repeat cycles. Change the seed when you intentionally want a different workload.

The existing recurring option is explicitly a **paid-cycle subscription**, not calendar billing: a new cycle starts only after the prior cycle is delivered and paid, and cycles begin at least 30 days apart. Non-recurring returns are confirmed repeat orders and also bypass new-sales conversion. Each client and accepted contract has a persistent identity across cycles. Overlapping unpaid cycles are not modeled.

Each day uses a documented order: collect already-due client balances; pay monthly overhead when due; release confirmed repeat cycles; create that day's external demand; reserve outreach time; then schedule project work and same-day transitions. A cash shortfall rolls back the whole proposed day, so retrying cannot duplicate transactions.

Cash shortfalls roll back the proposed day atomically. Add explicit funding, or revise applicable costs, then retry. Transactions are never duplicated. Already agreed project prices and supplier costs are preserved.

## Remaining limits

- Designers are capacity slots rather than named people; skills, individual assignment and reassignment remain future work.
- Supplier alternatives, production quantities, borrowing and expense deferral remain future work.
- Workflow routing is fixed, with printing optional per service.
- Native Windows/Mac packages and full visual browser QA remain outstanding.

## Source and checks

The engineering review adds contract identity/import safeguards, DOM node-identity and keyboard-focus regressions, and large-workload analytics checks. Run `node review-benchmark.cjs` for a reproducible 12-month, 500-inquiries-per-month experiment with 50 saved comparison rows. It reports aggregation and HTML generation timings, excludes browser painting, and does not modify saved browser workspaces. Timing results are observational, not brittle pass/fail thresholds.

Stage C adds structured setup validation, per-service economics and capacity, exact assumption differences, a persistent pinned comparison baseline, descriptive result explanations, an offline comparison-report export and an interruptible Finish month action. The canonical automated journey changes a service, applies and restarts, creates and inspects a deterministic overdue design project, compares it with the pinned baseline, exports two chosen runs, requests a backup, parses the exported workspace contract and reopens the browser save. Worst-performing-contract sorting and filtered contract export remain future work.

The archive includes source, build script, tests, requirements and change notes. No dependencies are installed.

```sh
node build.cjs
node --test *.test.cjs
node review-experiments.cjs
```

The automated suites cover simulation behavior, stable-workload comparisons, same-day ordering and transitions, per-project capacity, commitment boundaries, explicit client/contract lifecycles, customer identity and suitability, strict saved-run validation, original Prototype 02 migration, backup round trips larger than the old 25 MiB limit, preserved workspaces, incomplete and malformed drafts, pinned-baseline retention, exact Phase C journey behavior, failed/competing storage writes, prepaid completion, cash history and the actual generated HTML. See **STAGE-C.md** for the current usability milestone, **STAGE-B.md** for model consistency and **STAGE-A.md** for the earlier reliability milestone.

Final verification passes **252/252 automated checks** plus the repeatable 24-run annual experiment covering 3,663 projects, 96 restore/replay checks and one funded cash block. Native Safari 27.3 completed the offline change/apply/run/late-project/baseline/download/reimport/refresh journey; Firefox 160.0.1 verified two reload-surviving cash blocks, funding, Run/Pause and 200% zoom; Chrome 157.0.8103.80 restored an existing offline workspace and completed an isolated Incognito add/apply/day-30/refresh path. The in-app browser verified 320 px and 390 px layouts, all three themes and analyst rendering. Normal `file:` saves may be shared across file paths by browser file-origin behavior and are not isolated by filename. Edge/Windows remains untested. See **STAGE-C.md** for the exact matrix, repaired native-focus/input findings, screenshots and remaining release gap.
