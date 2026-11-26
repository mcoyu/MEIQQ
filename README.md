# MEIQQ — Prototype 03 · Stage C

## Open

Open **MEIQQ.html** or **Live-Sky.html** to open the home page for Studio and Simulator. Choose **Enter simulator** for setup, or open **Ideas**, **Planner** or **Jobs** directly. The home link in each workspace returns to the same sky. If you received a ZIP, extract it first. Choose a modern browser if prompted. It runs offline on Windows and Mac, with no installation or server. A native desktop installer is not included.

On your first visit to the simulator, choose **My own services** or **Restaurant example** on the same screen as **Guided** and **All assumptions**. Choosing a style opens the editor. On later visits **Enter simulator** and **Navigate → Business setup** resume the saved draft. **Setup options → New scenario** opens the choices again. **Navigate** is available throughout the simulator and Studio.

## Studio workbench

Open **Navigate → Studio → Ideas** to see **Your ideas**. Find a draft by its name, family, buyer or next action. Open a row to work on it, or rename or delete it from the list. **New idea** asks for a working title before creating the record. Older unnamed ideas display their draft number. **← Your ideas** takes you back to the list.

Choose **Plan this idea** to try its price and effort in a service mix. When a client wants the work, choose **Start a job from this idea**. The draft includes the idea’s name, scope, deliverables, proposed price and what that price covers. Enter the client and review the terms before recording an agreement. The job keeps the source idea’s name and revision.

In **Planner → Service mix**, open the linked service. Choose **Remove** on a service row to take it out of the plan. **Undo** restores its quantity, effort and allocations. Beside **Your hours per unit**, you can see recorded owner hours from up to three recent real jobs with an agreement, a delivery and posted owner time. Expand the figures to see delivery dates and open each job. Archived jobs count. Check the scope and setup of each job when deciding whether to edit your estimate.

- Start with five editable examples covering analytics, creative work, product content, supplier coordination and Chinese-market discovery, or add a **New idea**. Example context is not a chosen service menu or evidence of demand. Prices and effort start unknown.
- Expand **Idea details** to describe the buyer, outcome, priced unit, inputs, handoffs and completion checks. **Research** keeps notes, references and the next thing to validate. Opening an external source link is optional and needs connectivity; the saved notes work offline.
- Use **Numbers** for USD price, direct costs, paid roles, your hours, your time target and allocated overhead. **First engagement** includes preparation once; **Later engagement** excludes it and assumes that preparation can be reused. Both use the same proposed price. No sales volume is assumed.
- **Compare ideas** shows the available estimates together, including total work hours and your share of that effort. Hours are summed work, not elapsed turnaround. Blank or invalid inputs stay unknown, and negative remainders remain visible. “Left after allowances” deducts direct costs, your time allowance and overhead. “Available / owner hour” is before valuing your time. Neither is recorded cash or guaranteed income.
- Edits save in this browser using a separate Studio record, with IndexedDB and a localStorage fallback. Under **Navigate**, **Studio backup** downloads a portable copy of ideas and research. **Import ideas** validates a Studio backup and adds independent copies, preserving existing ideas. Studio backups have an 8 MiB limit and are separate from simulator backups.

Keep browser backups before clearing site data, changing browsers or moving the HTML file. Ideas, Planner and Jobs each have a backup. To move a connected workflow, export and restore all three. If saving fails or another window changes the same Studio record, the app shows the problem. Download your session before closing it.

## Task 2 — Studio capacity and earnings

Open **Planner → Earnings lab** to edit the app directly. Its **Studio plan** starts with a $2,000 combined owner-income target and eight weekly hours for each partner. Sliders and exact-value fields update price, volume, costs, effort, capacity and the target shortfall immediately. These controls work with any service mix; no import is needed. Existing plans and frozen baselines are preserved when the app adds the Studio plan once.

1. **Earnings lab:** explore prices and workload against shared studio targets. **Try this price & volume** saves an independent alternative using the calculated required price; it preserves the starting baseline and never silently reduces effort. **Ideas → Plan this idea** copies a researched idea into the Studio plan, leaving its source intact and unfinished assumptions unknown.
2. **Baseline:** enter your total hours, non-project time, reserve buffer, each paid role's delivery capacity and rate, recurring studio costs, owner income target and extra retained-money target. Unknown estimates stay blank until you can supply them.
3. **Service mix:** enter monthly quantities directly in the list. Open a service to edit its priced unit, price, direct costs and your effort. Use **Add blank service** or **Copy a Studio idea** to expand the mix. Map paid work to a role pool. Enter how many units need extra setup; setup work is counted only that many times. Copied ideas remain independent, and their per-idea overhead and hourly owner allowances are not deducted again.
4. **Results:** inspect role-by-role shortages, used-hour labor costs, money available for your income, the remainder after that target, and the shortfall against both targets. These are before-tax planning calculations, not demand forecasts or recorded cash. The proportional capacity ceiling may imply fractional units; the entered whole-unit workload receives its own capacity check.
5. **Capture dated baseline**, then **New alternative:** change volume, prices, effort or capacity and use **Compare** to see the frozen starting assumptions beside an alternative. Every alternative keeps its own baseline snapshot. Later edits and new baseline captures do not rewrite existing alternatives.

Planner saves independently in this browser with IndexedDB/localStorage fallback. **Planner backup** downloads all plans and snapshots; **Import plans** adds validated copies and preserves existing plans (8 MiB limit). **Delete plan** asks first and offers Undo until another deletion or app close. Keep portable backups before changing browsers or clearing local data.

**Review Simulator copy** explains a limited mapping before any draft is created. Currently supported: no setup, zero generic nonlabor direct costs and at most one paid delivery pool. Multiple roles, setup and print/supplier workflows remain fully usable in Planner but cannot yet be copied faithfully into Simulator. Demand, cash and timing assumptions must be explicitly entered. A supported copy preserves the current run and earlier setup under **Runs & backups**, carries its planning source as a downloadable original file, and opens a new setup draft for review. It does not apply or run automatically.

Weekly availability uses a conservative four-week budget inside the 30-day plan: 8 × 4 = 32 hours each. Six non-project hours per person and a 10% reserve leave 23.4 project hours each. The $400 retained target, $200 recurring expenses and all starter service prices, costs, volumes and effort are editable research placeholders. The partner's additional cash rate starts at zero because both owners share the combined income target. These budgets do not schedule individual weeks or establish market demand.

The earlier walkthrough JSON files remain optional historical examples; native controls and scenarios now replace that import workflow. Saved alternatives are independent snapshots: changing the Studio plan does not silently update their assumptions.

See **TASK2-REVIEW.md** for the worked example and verification record.

## S1 — One job end to end

Open **Jobs** to manage client work. Start from an idea, choose **Blank real job** for a one-off, or add the fictional **practice example**. Practice records remain visibly marked and cannot be silently converted to real ones.

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

1. Open **Enter simulator**, choose a starting business and select a setup style. Use the four tabs to move through **Offers → Demand → People → Cash & timing**. Run length and setup style are available above the tabs. Refresh and browser Back and Forward retain the draft.
2. In **Offers**, use **Choose a client** to explore a three-offer starter menu. Each role explains why the service fits that buyer. Open **Swap offer** to compare alternatives before applying. **Choose offerings** opens the full catalog, and **Write my own offer** lets you start from scratch. Open an offer in the editor to change its price, scope and hours.
3. **Demand** shows how outreach or a fixed monthly volume turns into inquiries, how many match your offers, and how many first orders your acceptance rate implies. **People** compares weekly client and design hours with expected workload and shows estimated design labor cost. **Cash & timing** shows the first overhead charge, the deposit and balance on one quote, and the working window inside your delivery promise. Edit an input to update its readout. When projected earnings change, the run estimate also shows the difference from your first complete estimate on that step for the same run length.
4. Choose **Run length** from 1 to 12 model months. New scenarios start at 3 months (90 days). Setup checks whether even one order of each eligible offer can finish within the run. It allows for owner time left after outreach, the design hours one person can supply, and the days spent waiting for approval or printing. With zero time for a required role it identifies blocked offers and shows the full period’s scheduled overhead. When the team is short of hours, the dollar comparison is conditional on delivering all expected first orders. The day-by-day run determines what actually ships and which charges can be paid. Use **Sources for these estimates** to attach a reference, date and sample to an assumption.
5. Select **Simulate 90 days**, or the duration you chose. The run opens in the live sky with your setup estimate, the current operating result and progress through the selected days. You can pause or inspect the run. A cash shortfall pauses it for a funding decision. At the end, **Scenario results** compares the original estimate with the recorded outcome and shows how delivered revenue and costs account for the difference. Expand **Compare all figures** for inquiries, working hours and the result after owner time.
6. In **Scenario results**, choose an assumption beside a finding, such as **Test designer hourly cost**. The editor opens at that field and shows its original value. Change it and select **Simulate again**. The revised run starts on day one with the original workload seed and run length unless you change them. Results shows the settings you changed and both runs’ recorded earnings, deliveries and closing cash over their shared period. **Original results** lets you revisit the finding and keep your edits for later.
7. Choose **Keep original setup** or **Keep revised setup** under the comparison. The chosen run’s opening assumptions, workload seed and duration become an editable day-zero setup. You can review them and press **Simulate** when ready. **View saved comparison** reopens the two completed runs and shows which setup you kept. Later, find the same report under **Scenario results → Compare runs → Saved comparisons**.
8. On **2. Run scenario**, step one day, play, finish the month, or select **Controls → Finish run**. Open a project to see the next action, agreed scope, price, deadline and payments.
9. In **3. Review results**, choose a reporting month for earnings, deliveries and cash. Longer runs also show whole-run totals. Use **New scenario** in Setup to preserve the current run, unfinished draft and checkpoints before starting another scenario.

### Replay a bottleneck

Choose **Test one change** on a job waiting for design or owner time. It also appears in **Review results → Compare runs** for a studio-wide experiment. Pick a month, change the weekly hours per designer, designer count or owner hours, and choose **Replay both runs**. The copies start with the same opening work, funding and recorded decisions. The original must reproduce the recorded month through the last observed day. Replaying a partial month labels the remaining days as simulated.

The result shows the selected job’s status or delivery day, the accepted jobs still waiting, deliveries, operating profit, earnings after owner time and closing cash. **Save comparison** keeps both copies together under **Compare runs → Saved replays**. Your active run and setup draft stay in place. Older saves with incomplete history or a replay that stops for funding explain what prevented a matched result.

Choose **Carry this change forward** when the replay month ends before the end of the configured run. Both copies continue from their month-end workloads, with the tested capacity setting held in the changed copy. The result shows the delivery date for the same job and the operating-profit difference at each month-end. **Since day** accumulates gains and losses from the start of the tested month. A lasting gain starts at the first positive month-end that stays positive through the selected horizon. Designer cost follows the hours actually worked at the modeled rate.

Expand **Compare both runs in detail** for side-by-side earnings, costs, cash, deliveries and ending backlog. Save the result to reopen it directly from **Saved replays** or download it in the comparison report. New saves retain the settings, funding and decisions recorded in the original scenario. For an older pair that lacks the original’s later decisions, **Project from saved month-end** continues the two saved schedules and labels the projected dates.

Monthly replays and carry-forward results show what each schedule spent on the jobs still awaiting delivery at the cutoff. Open the cost breakdown for individual orders and repeat cycles, including jobs with different project numbers across schedules. **Why did cash change?** reconciles receipts, spending, funding and closing cash. The backlog detail identifies shared open jobs, deliveries and work accepted in just one schedule. The downloaded comparison includes the same period and figures.

At the configured horizon, choose **Finish the accepted work** to close intake on two copies and follow the orders already accepted and the invoices still outstanding. Each schedule keeps its staffing, reserved outreach, supplier commitments, payment timing and overhead. Both pay costs through the later settlement date. The result shows the original cutoff, each schedule’s delivery and collection dates, and the cumulative operating-profit difference at their common close. A funding stop, unreachable work or the 360-additional-day limit shows the outstanding work and the stopping reason. A saved, settled projection reopens with its comparison and appears in its offline HTML report.

The restaurant example models a studio with 80% of inquiries from food businesses, 10% from retail and 10% from local services. The menu and table-tent packages serve food businesses. The monthly promotion also serves the other two groups. The example assumes 15 weekly owner hours, four outreach hours at 0.30 qualified inquiries per hour, 30% quote acceptance and $18 per designer hour. Replace these estimates from your own records. A resumed workspace uses its saved numbers. The separate **Open worked example** action loads a hypothetical day-12 studio after preserving the current workspace.

## Local scenario recipes

Select **Try a scenario** to compare proposed draft values. The six market labels describe location. Four operating models, six customer mixes and five business conditions produce 120 operating combinations. These conditions apply across the selected run. Earlier saved recipes retain their original geography-dependent values and provenance. Loading a recipe preserves the service menu, prices, starting cash, seed and horizon. Review the proposed changes, merge them into the draft, then apply or use **Undo recipe**.

Public context supplies vocabulary and qualitative setting through U.S. Census QuickFacts, the May 2025 BLS Detroit-area wage release, Michigan wage rules and selected city economic-development pages. It does not establish the ordering of recipe values and does not publish design-service conversion, demand or price forecasts. The app therefore treats prices, inquiries, conversion and operating behavior as transparent modeled scenarios—not market quotes or predictions.

The evidence supplies broad context, not a numeric calibration formula. `preset-evidence.js` contains frozen public observations and modeled parameter records with dates, scopes and derivation inputs. Exact price factors, inquiry counts, conversion rates, payment timing, staffing, labor rates and shop percentages are scenario-design choices. Michigan wage rules do not establish the cost of overseas design labor. High lineage coverage means the app can explain where its preset values came from; it does **not** mean those values are empirically calibrated or validated. See [PRESET-EVIDENCE.md](PRESET-EVIDENCE.md) for the parameter-by-parameter boundary, source register and reproducibility limits.

Composed recipe values and their versioned recipe origin survive browser saves, checkpoints, backups, preserved workspaces and import. The selector's current UI position is still a separate browser preference, so it may show another combination after import; use the recipe origin shown on the saved run, and treat the saved exact assumptions as authoritative.

**Steady month** is the neutral demand multiplier, not a guarantee of spare capacity. The draft preview shows the expected work against owner and designer capacity. Ordinary uncertainty uses the master switch; higher-impact rush deadlines, supplier reprints, repeated revision rounds and extended late payments are separately opt-in modeled disruptions with editable inferred frequencies.

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
- Services selected from the catalog share 100% of inquiry weight. Existing active services keep their relative proportions. A new custom row or duplicate in a populated menu starts at 0%. Use **Include in simulation** when ready. Select a service’s weight to adjust the mix by hand. Actual inquiry shares depend on which offers match each customer group. **Undo service mix** restores the previous selection until your next draft edit.
- Empty or invalid values are flagged; they are not silently treated as zero.

## Businesses and offerings

New workspaces draw inquiries from **22 business types**: bakeries, bubble tea shops, noodle and dumpling shops, cafés, pizzerias, fast-casual and sit-down restaurants, food trucks, dessert shops, retailers and local services. Names are hypothetical and distinct within a run. Returning clients keep their business type and identity.

In **Demand → Repeat business and customer mix**, set the share of inquiries from food, retail and local services, choose an optional niche focus, and select no, moderate or stronger workflow variation. The focus type receives half of its group's inquiries. Business types can change illustrative work hours, approval waits and repeat frequency; the overall conversion, service prices, print costs and capacity still come from your inputs. Older saved runs keep their original generic customer behavior until you enable business types in the draft and apply it.

The simulator includes 37 editable packages. They cover design and print, food service, sales analytics, wholesale catalogs, bilingual materials, supplier research and service businesses. The [offering playbook](OFFERING-PLAYBOOK.md) explains which offers to test first and what to ask a buyer. The original design and print comparables are in the [service evidence register](SERVICE-EVIDENCE.md). New opportunity packages use explicit planning estimates for price and hours.

The client menu builder covers independent restaurants, bilingual cafés, wholesale brands, neighborhood retailers, makers sourcing packaging, appointment-based studios and home service businesses. It uses the same estimator as setup. Compare the proposed operating result, first orders, production hours, owner hours and result after owner time with the current draft or the suggested menu. If the draft has no complete estimate yet, the suggested menu provides a starting comparison. The selected client guides the recommendations. Incoming customer shares still come from **Demand**.

From an applied menu, **Plan client outreach** opens Demand. Each client has three ways to reach a buyer, with an opening question tied to one of your offers. Set the percentage of all new inquiries you expect from this outreach, or enter your own client and total inquiry counts. In a 90-day setup with 20 inquiries per month, a 30% share allocates 18 expected inquiries to this client and 42 to the remaining pool. Those 42 follow your existing customer mix and niche settings. Your volume and acceptance inputs still determine overall demand. Changes in offer eligibility, fees and workload can affect the operating result.

At the end of the run, **Client outreach** compares the launch estimate with recorded inquiries, offer matches and accepted first orders for this client. **Test client inquiry share** reopens the assumption for a second run. The side-by-side comparison shows the observed inquiry counts through the same day in both runs.

**Apply menu** saves the three roles in the draft. **Adjust client menu** reopens the same choices after a reload. Swapping a saved role replaces its offer and carries over its inquiry share. Additional offers stay in the menu by default. The review names any offers that will leave. **Undo service mix** restores the previous draft until the next edit.

Catalog selections affect the setup draft. Search and filter freely before applying. A selection replaces an untouched blank starter and preserves offers you have worked on. If a partly written custom offer is holding up a run, **Finish later** keeps it in the draft and gives its share to the other active offers. Use **Include in simulation** to resume it. Open **Inquiry mix** to see the resulting share of new inquiries. Setup estimates how many inquiries will find no match, and the run counts the actual misses.

For print-bearing work, customers choose agency-managed printing or design-only files at quote acceptance. The share choosing managed printing drives the weighted setup estimate and the route sampled at acceptance. Each accepted project keeps its agreed deliverable, price and supplier allowance. Monthly and seasonal packages model a year-long relationship with separately quoted 30- or 90-day campaigns, not guaranteed revenue or a prepaid annual subscription. Declining one campaign skips that cycle without ending the relationship; another quote can be offered at the next cadence through the one-year cutoff. The chosen product policy is pay per campaign. Monthly invoicing and annual prepayment are unsupported alternatives, not unresolved setup choices.

## Find and understand projects

**Jobs to watch** shows up to three open jobs, who acts next, and the reason for the wait. A funding pause, missing capacity or missed deadline gets priority over routine work. Select a job for its next action, agreed scope, controls and timeline. **View all open jobs** opens the searchable project list.

Use **Next project event** to skip quiet days or **1 day** to advance one day. Expand **Work queues by responsibility** or **Full project handoff map** for the detailed workflow. **Controls** holds speed, run length and restart.

Select a stage to inspect its queue, or a project to see its next action. **Projects** provides client/project search and filters for active, late, payment, completed and declined work.

Project controls support prioritization, extending the agreed delivery deadline, and confirming client approval. Decisions are recorded in the timeline. Confirming approval bypasses another random revision request.

## Analyst results workspace

Open **3. Review results** to inspect five views for the current scenario and elapsed day.

- **Profit overview** opens on the latest simulated month. Choose an earlier month to see its deliveries, costs, deposits and open balances. Open the unfinished jobs to see their status at that cutoff and replay a capacity wait for the same job. Older saves with incomplete history show the facts supported by dated records. **Run-to-date financial details** contains cumulative margins and the service table.
- **Contracts** supports search by client or ID and filters for open deliveries and outstanding balances. Expand a client for booked value, collections, hours and project links.
- **Simulation stats** shows quote acceptance, returning work, delivery performance and monthly trends. **Run 20 sample months** replays the applied setup at different seeds on independent copies. It reports ranges for completed months and counts funding pauses separately.
- **Cash & ledger** reconciles cash and charts its history for one month or the whole run. **See cash movements** opens the month shown in the overview. Transactions appear newest first in pages of 100. Select a linked job for its current project details.
- **Compare runs** opens one-change experiments and saved pairs. You can also pin a checkpoint and compare it with the active run or another checkpoint. The offline report includes the selected pair’s monthly result, plus run totals, the exact changed assumptions and available evidence.

Contribution compares delivered revenue with direct costs of delivered work. Operating margin also deducts unfinished-work costs and shared overhead. The historical after-owner-time measure values each model month’s hours at its closing hourly target and sums the selected months. Run-to-date detail also shows all hours valued at today’s target. Ratios display **—** when their denominator is zero. Contract results exclude shared overhead, outreach and unsuccessful new-business quoting. Recurring cycles are grouped under one contract. Comparison also checks the incoming demand history.

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

## Language

Choose **Language / 语言 → 简体中文** in the header to use the app in Simplified Chinese. Choose **English** to switch back. The translations work offline, and this browser remembers the language. English uses US dollars. Simplified Chinese displays and accepts renminbi (CNY). The **人民币 ¥** disclosure beside the language menu shows the fixed offline reference rate of **1 USD ≈ 6.6645 CNY**, derived from the European Central Bank’s 24 November 2026 rates. Records are stored to the nearest US cent, so an amount entered in yuan can round by a few fen. Switching languages preserves your saved records and backup data.

## Appearance

The Terminal color scheme combines warm charcoal surfaces, copper controls and cream lettering over the live sunset.

Choosing Ideas, Planner, or Jobs from Home starts a descending camera move. The horizon enters first, followed by the far shore and the promenade railing as the camera descends 30 feet to standing height. Returning to the sky reverses the move. Open **Workspace options → View waterfront** for an unobstructed view of the bridge, observation wheel, and their reflections.

In the full-screen sky and waterfront views, the opening shot lasts 45–85 seconds. Later shots hold for 55–125 seconds before the camera accelerates into a broad pan and eases into its next framing. Weather and evening light evolve on their own schedules, so a returning view can look different each time.

Three cloud banks cross the sky at different speeds. Dry air splits the banks into billows and opens gaps onto the stars. Loose copper curls around the edges and gathers in rising air to form new clouds downwind. Each bank can follow **Evolving weather** or hold one of the ten cloud genera in the [WMO International Cloud Atlas](https://cloudatlas.wmo.int/en/cloud-classification-summary.html). Twilight cools the upper sky before the horizon. The moon follows a shallow arc as stars become visible. Its cratered surface waxes and wanes over a 32-minute scene month, and the river reflects the same illuminated disc. Occasional shooting stars pass behind the clouds. Choose **Workspace options → Edit sky** to move, resize or hide individual layers, adjust the light and wind, and save the composition in this browser. Drag the selected layer in the preview or use the position sliders. Background motion follows your device’s reduced motion preference. In simulator setup the clouds settle into moonlight. Each step frames the same moon and stars from a different angle, and Back returns to the previous framing. Use **Navigate** in the shared header to switch workspaces or open a backup. With reduced motion enabled, the view from each stop appears immediately. The same preference controls navigation and panel transitions. Motion pauses in hidden tabs. From Home, choose **Workspace options → View sky** to watch individual copper shards leave a bank, turn in the wind and settle into another.

## Economics and uncertainty

Client names and exact outcomes are hypothetical. Local preset ranges use the public evidence listed above, but they are scenario inputs rather than researched market forecasts or vendor quotes.

The preview uses the full selected horizon. A 90-day run has 65 working days. The five-day workweek continues across 30-day reporting boundaries. Monthly overhead and fixed-demand assumptions keep their monthly rates. The preview assumes full fulfillment of new converted inquiries and excludes returning clients, delays and uncertainty. Outreach estimates use the same available-owner-hours cap as the running engine.

One tick is a day. Work is available five days in seven. When work or a wait has zero remaining duration, a project can cross multiple stages on the same day. Owner capacity is shared by quoting, review, delivery and outreach. Design capacity is shared across projects, but one project can use at most one designer's daily availability; separate projects can run in parallel across designers. Designers are paid for hours actually worked.

Owner time is an economic valuation. It has no cash posting. A target edited after closing day 30 applies from day 31. Partial periods use the rate in effect on their last simulated day. A legacy run without rate history labels the available current-rate valuation.

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
