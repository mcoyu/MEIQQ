# MEIQQ simulator review and implementation brief

November 24, 2026 · For the MEIQQ owner and the ChatGPT coding agent implementing the next release

**Start with the path from a monthly loss to a specific job.** Today MEIQQ can tell you that two jobs were unfinished on day 30 and then take you to a completed job on day 90. It can also give two different after-owner-time figures for the same staffing decision. Fix those breaks in the existing flow. Then add one new experiment, **Finish the accepted work**, to show what happened to the money still tied up at the cutoff.

Keep the short guided setup, the 90-day default and the selectable 1–12 model months. The blank business and named restaurant example already separate a studio’s own services from sample offers. Keep effective demand shares, print and files-only economics, the animated replay prompt, and detailed queue and ledger controls. Fit the changes inside Setup, Results and Compare. Additional tables belong behind a specific action such as **See the two unfinished jobs**. [Current simulator flow](README.md#a-clearer-first-experiment) · [Earlier setup review](SIMULATOR-REVIEW-2026-11-24.md) · [Shipped changes](CHANGELOG.md)

## What the extra hours bought

In the restaurant example, change one designer from 6 to 12 available hours a week at $18 per hour, starting in month 1. Keep seed 2417 and carry both runs to day 90.

| At day 90 | Original | Extra hours |
|---|---:|---:|
| Selected job P003 delivered | Day 47 | Day 33 |
| Jobs delivered / accepted jobs still open | 4 / 2 | 4 / 3 |
| Delivered revenue | $2,500.00 | $2,500.00 |
| Operating profit | $465.04 | $59.78 |
| Closing cash | $6,640.04 | $6,859.78 |
| Accepted value still awaiting delivery | $975.00 | $1,600.00 |
| Direct costs incurred on work still awaiting delivery | $199.53 | $604.80 |

The changed schedule led by $419.95 at day 30 and $300.38 at day 60, then trailed by $405.26 at day 90. P003 shipped 14 days earlier and consumed the same 14.33 designer hours in both runs. The change made **78 more hours available** across 65 weekdays. The studio used **22.52 more hours** and paid **$405.26 more**. The two original open jobs were still open in both runs. The changed schedule also accepted a $625 campaign cycle, P018, with $248.18 already spent on it. The increase in costs on unfinished work was $405.27, offset by one cent less spent on delivered work. These are simulated outcomes under pay-as-worked billing. [Saved comparison and job breakdown](Designer-Hours-Day-90.html#job-costs) · [Reproducible fixture](carry-job-costs.test.cjs#L31)

## Release 1 fixes for setup and replay

### Consistent historical financial results

**Reproduce.** Use the 6→12 fixture above. At day 30 change the owner's hourly target from $38 to $100 and continue to day 90. The carried comparison values both schedules' hours at each month's closing target and displays **−$5,689.28 / −$6,227.99** after owner time, a **−$538.71** difference. The downloaded report's whole-run figures for those same 90 days use $100 for every hour and yield **−$7,162.71 / −$7,850.22**, a **−$687.51** difference. An owner can come away with a different answer depending on which screen they share. [Monthly calculation](engine.js#L259) · [Carry calculation](engine.js#L950) · [Report assembly](comparison-report.js#L160)

**Implement.** Use one period calculation in the monthly overview, monthly replay, carried verdict, saved pair and exported comparison. For the historical measure, value each reporting period's hours at the target in effect on its last simulated day. A change entered after day 30 first affects day 31. Sum those period results over the labeled comparison interval. Keep the existing current-rate revaluation in the run-to-date detail and label it **All hours at today's target of $X/h**. For a legacy run missing rate history, label the available current-rate calculation explicitly.

**Accept when** the historical on-screen and exported differences are both −$538.71 for the fixture. Check constant rates, a mid-month edit, a partial month, a month-2 start, and save/reopen. Operating profit and ledger cash must retain their original values. Distinguish days 31–90 from a whole-run figure covering days 1–90.

### Job status in the selected month

**Reproduce.** Finish the six-hour restaurant run and select Month 1 in Results. It reports **two unfinished jobs and $420.60** of month-one costs against them. The single link opens P002 on day 90. At the day-30 close P002 was with the printer with **one calendar day remaining**. P003 was waiting for the designer with **7.23 hours of design remaining**. The generic comparison prompt opens on month 3. With the currently linked job alone, the owner misses the one job that a designer-hours experiment directly addresses. [Month links and drivers](app.js#L1686) · [Project diagnostic](engine.js#L428) · [Replay setup](app.js#L999)

**Implement.** Make **See 2 unfinished jobs at day 30** open a read-only list. Show each job's service, responsible party, work or wait remaining, and the month's costs through that day. Offer **Replay month 1 for P003** on the design wait and a separately labeled link to either job's current record. Use verified replay history for period-specific queue and stage facts. Show only facts supported by dated records if reconstruction is unavailable. Pass the month and stable demand identity into the existing prompt.

**Accept when** both jobs appear even if one has zero period cost, P002 shows a supplier wait and P003 opens the designer-hours test. The 6→12 replay follows P003 to days 47 and 33. Closing returns keyboard focus to the triggering control in Month 1. Opening or replaying history leaves the live day, decisions and balances intact.

### Profit, cash and backlog on every matched replay

**Reproduce.** In the packaged app at 390 × 844, a final-month change from 24 to 6 designer hours left two more jobs open. Profit fell **$609.78** while closing cash rose **$640.22**. The verdict had a green accent and offered Close, Try another value and Save comparison. The per-job cost trace appears only after carry-forward, which is unavailable in the final month and in a one-month scenario. [Mobile capture](simulator-review-final-month-mobile.jpg) · [Monthly verdict](app.js#L1111) · [Existing job cost trace](engine.js#L1033)

**Implement.** Lead with delivery, backlog and operating-profit changes in words. Give mixed outcomes neutral styling. Apply the existing job-cost breakdown to the exact dates of any completed matched month or carry. Keep rows collapsed under **What changed the cost?** Match orders and repeat cycles by stable demand identity. Break out shared open jobs, originally open jobs delivered in the changed schedule, and newly accepted work still open. Label accepted value separately from earned revenue. Include the hours made available, hours actually worked, and the labor billing rule when hours are the tested change.

Under **Why did cash change?**, reconcile the difference using receipts, funding and spending. For day 90 the answer is **−$405.26 operating profit + $312.50 more deposits on unfinished work + $312.50 less owed by clients on delivered work = $219.74 more closing cash**. A later start needs the opening balances as well as closing balances. In the detail, show the lowest daily closing cash in each run and the first day it occurred. The first lows were $5,727.07 on day 76 in the original run and $5,639.35 on day 31 in the changed run. Use the engine’s recorded funding blocks for intraday shortfalls. [Period balances](engine.js#L259) · [Daily closing cash](engine.js#L579) · [Offline report](comparison-report.js#L147)

**Accept when** a one-month run, the final month and a carried run all offer the applicable detail, including on reopen and in the offline HTML. The day-90 dollars and two shared open jobs plus one additional cycle must reconcile. Use posted cents for money and unrounded hours for calculations. Keep shared overhead separate. Test zero/nondated historical labor, branch-only repeat cycles, funding and unequal cutoffs. For a blocked or unmatched pair show the last verified day and specific reason. Only comparable completed periods get a payoff verdict.

### Assumption sources and setup errors

**Reproduce.** In Demand, record 30% quote acceptance from “April quote log”, dated April 30, 2026, with six wins from twenty decided quotes. The field shows **Your records**. Opening **Assumption sources** shows the default modeled derivation at that value and omits the visible record. Separately, clear **Inquiries per outreach hour** and move to **Cash & timing**. Simulation is disabled and the summary names the invalid field, but the field and a link to fix it are both absent from that step. [Field provenance and sources dialog](app.js#L327) · [Validation paths](app.js#L78) · [Draft summary](app.js#L587)

**Implement.** Show current value, current source, sample and date together. Put the seed recipe and published comparables in a disclosure. A number can equal the example and still have evidence from the owner's records. Add a **Fix [field]** action to the existing issue summary. Open the correct step, offer and disclosure and focus the input. Keep drafts saveable and inactive offers out of the simulation. On first visiting Run before choosing an onboarding path, explicitly name **Run restaurant example** on the start action.

**Accept when** a recorded 30% is shown consistently in the field and source view, an unsupported edit loses the record label, and a restored draft preserves a still-applicable source. Verify error navigation for an off-step demand field, a nested service field and an invalid service mix using the keyboard at phone width. A returning owner can resume their existing run directly.

## Release 2 experiment to finish the accepted work

**Add this experiment first.** The owner's question after seeing $604.80 in unfinished work is whether the jobs will earn enough to cover it. A further trading month mixes in new inquiries and repeat sales. Offer **Finish the accepted work** from a completed comparison at its horizon, with the day-90 verdict still visible.

A controlled engine probe kept each schedule's day-90 accepted jobs and outstanding invoices. It closed intake, excluded future repeat offers, retained four reserved outreach hours per week, and kept each schedule's rates, capacity, delays and $180 monthly overhead. The changed schedule delivered and collected its entire opening book by **day 116**. The original finished by **day 142**. Charging both schedules through the common day 142 gave **$604.25 original / $875.56 changed** in cumulative operating profit, a **$271.31 advantage** under these assumptions. Part of that difference comes from the extra $625 campaign already accepted by the changed schedule on day 90. This is a proposed projection demonstrated on disposable copies. [Acceptance and payment processing](engine.js#L485) · [Repeat scheduling](engine.js#L564) · [Starting fixture](carry-job-costs.test.cjs#L31)

**Implementation contract**

- Freeze each branch's accepted orders, delivered-but-unpaid invoices, balances and dated commitments at the cutoff. Prevent future external inquiries, undecided quotes and new repeat cycles from entering the projection. Keep pre-cutoff history intact. An accepted repeat already in the book still counts.
- Use copies and the ordinary work, payment and funding rules. Show the staffing, reserved outreach and overhead carried into the projection. Continue both to the later settlement date and charge both for the same calendar interval. Display each branch's last delivery and last collection dates individually.
- Show booked value at cutoff, revenue subsequently earned, cash subsequently collected, further costs, and profit at that common date. Count pre-cutoff deposits once. Keep the original horizon and the conditional projection explicitly labeled in the saved comparison and report.
- With no outstanding work, finish immediately. With unreachable work, a funding block or the proposed limit of 360 additional model days, explain what remains open and omit a settled payoff verdict. Run in cancelable batches. The projection must also work from a 360-day scenario without extending the owner's real run.
- Verify the exact day-90 and day-142 figures above, a paid-in-full unfinished order, an already-delivered unpaid invoice, an accepted branch-only campaign, and zero designer capacity on an order needing design. On a canceled or incomplete projection the original saved comparison must still reopen.

## Additions to queue after the first two releases

| Order | Addition | Evidence and first acceptance check |
|---|---|---|
| 1 | **Try this staffing choice on 20 workloads** | Today's sampler runs one configuration through day 30. In 20 fresh day-zero pairs at 6→12 through day 90, seeds 1–20 produced **12 gains, 3 ties, 5 losses**, with a median **+$152.42** and a range of **−$407.42 to +$950.49**. One gain was one cent. Use identical external demand within each pair. Show exact win/tie/loss counts, paired profit and cash differences, and separate counts for blocked or unmatched pairs. Label this a sensitivity test under the entered assumptions. Restrict the initial version to day-zero settings and omit the individual job identity from this cross-workload view. [Existing sampler](simulation-sample.test.cjs#L15) |
| 2 | **Allow guaranteed designer hours** | The current model charges $0 for an idle designer. Some bookings commit the studio to buying the whole shift. Under People → advanced, offer a contract choice with the current per-hour-worked rule as default for new and existing workspaces. At $18/hour an empty five-workday week with 6 or 12 guaranteed hours should cost $108 or $216. Charge job labor once and book paid idle time separately at studio level. Test partial weeks, rate changes, funding rollback and reports. [Capacity and labor posting](engine.js#L485) |
| 3 | **Use real jobs to estimate a service** | Let owners select comparable real jobs, confirm the service, unit and role, and review a median, range, sample size and dates before applying a change to the draft. Exclude practice jobs and voided entries. A missing time entry stays unknown and external work needs a confirmed role before it counts as design. This would let an owner replace example inputs with traceable evidence as their records grow. [Job metrics](jobs.js#L144) · [Existing source editor](app.js#L365) |
| 4 | **Expose when a campaign can renew** | In a controlled monthly campaign with immediate day-one delivery, changing payment from net 0 to net 60 moved quote days from 1/31/61 to 1/62. Today a new cycle waits for full payment. Put that assumption beside the campaign cadence. Add a calendar-based option only when that is how the studio sells the service. Test unpaid preceding cycles, separate quote decisions and unique cycle IDs. [Campaign scheduling](engine.js#L473) · [Paid completion](engine.js#L564) |

Keep named designers, new service bundles and further dashboard tabs behind these items. The current evidence favors better explanations and better-sourced inputs. The deterministic results above describe the restaurant scenario. Actual studio demand and willingness to pay require owner records.

## Copy this prompt to ChatGPT

Give the coding chat this brief and access to the **current MEIQQ working tree**, including local source, tests and the generated HTML. The base commit alone predates the replay and cost-attribution work reviewed here.

```text
Implement Release 1 and then Release 2 of the attached MEIQQ simulator review in qq-simulator. Start by reproducing the historical owner-time discrepancy and the month-1 P002/P003 journey on the current working tree. Work through the acceptance checks for each item. Deliver Release 1 as a working checkpoint before adding Finish the accepted work. Keep the later queue as future work.

Use the existing engine, project diagnostics, replay journal, stable demand IDs, ledger and saved-pair/report paths. Apply changes in source and regenerate MEIQQ.html. Preserve existing workspace changes, old saves, the guided and advanced controls, and the original day-90 comparison. Run the packaged app on desktop and at 390 × 844. Verify keyboard navigation, focus return and reduced-motion behavior. Keep the historical job and simulated staffing experiments isolated from the live run and the real Jobs workspace.

Run node build.cjs, node --test --test-concurrency=4 *.test.cjs, and node review-experiments.cjs from qq-simulator. Add regression coverage for each reproduced gap and the projection stop conditions. Exercise a funding pause, a restored comparison and its offline export. Report what shipped, the day-90 and projected payoff side by side, the checks that passed, and any unverified behavior.
```

**Review baseline.** Three reviewers examined the interaction flow, service and labor economics, and reproducibility of comparisons in the November 24 working tree (base `82ace8c` plus local changes). The packaged restaurant scenario ran to day 90 in an isolated desktop browser session. A 390 × 844 viewport exercised both carry-forward and a final-month replay. All **490 tests** passed. The annual experiment suite ran **24 simulations, 3,663 projects and 96 restore checks**, plus a funded cash block. The 20-workload comparison and the closed-intake projection were separate engine probes. [Annual experiments](review-experiments.cjs) · [Packaged mobile result](simulator-review-final-month-mobile.jpg)

