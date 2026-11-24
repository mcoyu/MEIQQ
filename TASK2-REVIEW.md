# Task 2 review: capacity and earnings planning

Review scope: a separate, offline 30-day planning workspace. Service ideas remain provisional. Planned sales, costs and owner draws do not create or change Jobs, agreements, work records or cash receipts.

Status: native Earnings lab implemented on 2026-11-20. The current app workflow below supersedes the historical import-pack walkthroughs later in this review. Earlier verification counts refer to their recorded release stage.

## Native app workflow

Open **Planner → Earnings lab → Studio plan**. The source code now creates an editable $2,000 combined-income plan with eight weekly hours per person. No JSON import is needed. Prior plans and baseline hashes survive the workspace migration unchanged; intentionally deleting the Studio plan does not make it reappear on reload. The Studio plan button can create it again deliberately.

Sliders and exact inputs cover targets, service prices/quantities/direct costs, owner/role effort, recurring costs, reserve and capacity. The four-week budget is explicit; it is not a calendar scheduler. **Studio ideas → Plan this idea** copies any idea into this shared planning context. Repeated clicks reopen the same copied idea version. New source versions remain independent copies.

The price explorer changes one service while retaining all other service revenue, costs, work, setup and shared-pool constraints. It calculates whole-unit price floors, shows capacity limits and unknowns, and saves a reviewed option as an independent alternative with a frozen baseline. It never changes effort automatically. Setup counts are explicitly capped and disclosed when trying fewer units than the original setup count.

With the native placeholders (four units at $600, $20 direct cost each, $200 recurring cost, $400 retention goal), owners have $2,120 available and the plan misses both combined targets by $280. The partner uses 24 project hours against a 23.4-hour reserved budget. Three units need $886.67 each and fit the entered effort; four need $670 each but still exceed reserved capacity by 0.6 hours. These are arithmetic requirements, not validated demand or prices.

Model and UI regressions cover v1 migration, local save/reload of raw edits, unchanged source domains, exact money, multiple services/roles, missing inputs, deleted-plan Undo, partner pool restoration and atomic failure at plan limits. Browser verification uses the actual bundled MEIQQ on a fresh local origin, without injected fixtures or imported data. The user's file-origin saved business data remains untouched by testing.

Verification: the full automated suite passed 410/410 checks. After the final copied-service disclosure adjustment, all 39 affected view, integration, native-app and build checks passed again. The actual bundled app was exercised through price-slider keyboard input, partner-hours pointer dragging, exact-value editing, reload persistence, a saved three-unit price alternative and a design idea copied into the studio mix. No app error/warning logs appeared. Phone (390px) and tablet (900px) layouts had no document-level horizontal overflow; the viewport was reset after testing. Screenshot: `native-earnings-lab.jpg`.


## What the director can decide

The planner asks: **if this mix of work sells and is delivered at these prices and costs, can the studio fit the work and cover its owner-income and retained-profit targets?** It does not establish demand or guarantee delivery, payment or profit.

Each plan covers 30 days. Planned deliveries and the number requiring setup are explicit assumptions. A recurring service label does not create additional sales. Setup consumes time and direct spending for each stated setup, while repeat deliveries reuse that preparation.

Revenue less external labor and other direct spending gives contribution. Deduct recurring studio expenses once to obtain the amount available for the owner and retained profit. Deduct the 30-day owner-income target once to show the remainder; compare that remainder with the additional retained-profit target. The owner target is a planning draw, not a recorded payment or a second hourly labor charge. Per-idea allocated overhead and owner hourly allowances are not deducted again.

Owner project capacity is `(available owner hours − nonproject hours) × (1 − buffer percentage)`. Each external role pool has its own `available hours × (1 − buffer percentage)` capacity. Delivery and setup hours consume those budgets. Spare capacity in one role does not cancel another role's shortage. These are aggregate effort budgets, not a calendar or a guarantee that handoffs and deadlines fit.

Blank or invalid inputs remain unresolved. Only dependent calculations become unavailable; known revenue can remain visible while an unknown cost prevents an earnings conclusion. Explicit zero means none. An overloaded plan must identify the constraint beside its earnings estimate, rather than presenting that estimate as achievable income.

The capacity ceiling scales the entered service mix and setup counts in proportion. It is an arithmetic bound, potentially containing fractional engagements. A target fitting that bound does not establish that a whole-unit mix can reach it. The entered-volume check evaluates the actual whole quantities typed into the plan; no integer scheduling or service-mix optimizer is included.

## Arithmetic test fixture (not the built-in example)

All amounts below are fictional USD values for checking the feature, not market prices or evidence of demand.

Start with a possible analytics diagnostic: one authorized source, one reporting period and one business question. Plan four deliveries at $600 each; two deliveries need setup. Each delivery needs five analyst hours, three owner hours and $20 of other direct spending. Each setup adds two analyst hours and one owner hour. The analyst pool costs $30 per worked hour.

Give the studio 24 owner hours for the period, including six hours reserved for sales and administration; give the analyst pool 24 hours. Use a 0% buffer so the arithmetic is easy to inspect. Enter $200 recurring studio expenses, a $1,000 owner-income target and a $400 retained-profit target.

| Result | Four-delivery baseline |
|---|---:|
| Planned revenue | $2,400 |
| Analyst work, including setup | 24 hours / $720 |
| Other direct spending | $80 |
| Total direct spending | $800 |
| Contribution before recurring expenses | $1,600 |
| Recurring studio expenses | $200 |
| Available for owner income and retained profit | $1,400 |
| Owner-income target | $1,000 |
| Left after the owner target | $400 |
| Owner project effort / project budget | 14 / 18 hours |
| Owner effort including nonproject work | 20 / 24 hours |
| Analyst effort / pool budget | 24 / 24 hours |

The stated targets fit this arithmetic, but the analyst pool has no spare hours. A positive buffer, extra cleanup or rework could change that conclusion.

Capture a dated baseline and make two independent alternatives from it. In the first, increase deliveries to six while leaving two setups and the original capacities. Its potential revenue is $3,600, direct spending $1,140, and the amount after recurring expenses and the owner target is $1,260. However, it requires 34 analyst hours and 20 owner project hours: **ten analyst hours and two owner hours exceed capacity**. The earnings alone are not a reason to choose this plan.

In the second alternative, test the same six deliveries with 34 analyst hours and 26 total owner hours available. With six nonproject hours and a 0% buffer, the stated work fits exactly. That additional availability is another assumption to confirm; the planner does not hire anyone or establish that the capacity can actually be obtained.

Changing either alternative, its source service idea or the editable working plan must leave the dated baseline and the other alternative unchanged. Backup and reopen must preserve the raw assumptions, source information and comparison basis.

## Director walkthrough after review

Director guidance on 2026-11-20: use one combined income target for both owners, with at most eight hours per week each. At the initial review the income amount was undecided; the director subsequently selected an editable $2,000 combined target. `Task2-Studio-Walkthrough.json` contains three independent, fictional plans with the same dated baseline; import through **Planner → Import plans** to add copies without replacing existing work.

The 30-day model uses 4.4 workweeks, giving each person a 35.2-hour ceiling. This is an aggregate budget, not proof that a weekly calendar or deadline fits. For this walkthrough, six hours of sales/administration per person and a 10% delivery buffer are **editable placeholders**. Your fields are 35.2 total hours and six nonproject hours. Your partner's pool contains 29.2 net delivery hours (35.2 minus six), leaving 26.28 project hours for each person after the buffer.

Your partner draws from the combined income, so their separate hourly cash cost is zero here. Their capacity still counts. This avoids treating the same partner compensation as both hourly cash cost and an owner draw. Other paid contractors would still need their own costs.

The possible offer is a scoped analytics brief answering one business question. Each delivery uses five partner hours, three of your hours and $20 in other direct spending. Two engagements need setup, adding two partner hours and one of your hours each. Recurring studio costs are $200. All those service assumptions remain fictional and editable.

| 30-day case | Revenue | Direct costs + recurring expenses | Available for both owners and retention | Available for combined income after retaining $400 | Capacity |
|---|---:|---:|---:|---:|---|
| Four at $600 | $2,400 | $280 | $2,120 | $1,720 | Fits the entered buffers |
| Four at $450 | $1,800 | $280 | $1,520 | $1,120 | Fits the entered buffers |
| Five at $600 | $3,000 | $300 | $2,700 | $2,300 | Partner exceeds delivery budget by 2.72 hours |

For four deliveries, your actual work is 14 project hours plus six administrative hours: **20 hours**. Your partner's actual work is 24 project hours plus six administrative hours: **30 hours**. There are **50 combined hours**, of which the app's counted-work metric shows 44 because partner administration has been allowed for in their net capacity rather than recorded as a workload entry.

The five-job case needs 29 partner project hours plus six administrative hours: 35 hours total. That remains below the 35.2-hour modeled hard ceiling but uses 2.72 hours of the protected delivery buffer. It therefore fails the chosen reserve, not the raw eight-hours-per-week allowance. Higher arithmetic earnings do not justify silently consuming that reserve.

The original frozen baseline retains the unknown income target. The three working copies now use $2,000 combined, following the director’s new guidance. The $400 retained amount is also a placeholder. The calculated amounts are before tax, unlisted expenses and payment delays; neither the customer volume nor the price has been validated. The remaining assumptions to validate include the administrative allowance, reserve, prices, demand and effort; this does not commit the studio to a service menu.

## $2,000 combined target: prices and workload

The director confirmed **$2,000 per month combined**, editable, and retained the **eight-hour maximum per week each**. `Task2-Income-Target-2000.json` is a new review group with its own common dated baseline. The earlier walkthrough’s working targets were updated without changing its existing frozen snapshots.

For this decision, use only four weeks of time: **32 hours per person** inside the 30-day planner. This conservative budget avoids relying on 4.4 workweeks. Keep the still-editable six administrative hours per person and 10% reserve: `(32 − 6) × 90% = 23.4` project hours each. The partner pool is 26 net hours before the reserve, with zero additional hourly cash pay because both owners draw from combined income.

The separate $400 retained-money allowance remains a placeholder. With $200 recurring costs and $20 direct costs per engagement, the arithmetic minimum unit price to cover both targets is `$20 + $2,600 / quantity`. Customer willingness to pay has not been researched or validated by this exercise.

| Scenario | Sales | Costs before owner income | Left after $2,000 combined income | Owner / partner total hours, including admin | Interpretation |
|---|---:|---:|---:|---:|---|
| Current four at $600 | $2,400 | $280 | $120 | 20 / 30 | Income is covered; retention is $280 short and partner reserve is 0.6 hours short |
| Three at $900 | $2,700 | $260 | $440 | 17 / 25 | Both money targets and current-effort buffers fit |
| Four at $670, current effort | $2,680 | $280 | $400 | 20 / 30 | Both money targets fit; reserve is still 0.6 partner hours short |
| Four at $670, 4.85 partner hours per unit | $2,680 | $280 | $400 | 20 / 29.4 | Fits if the unverified nine-minute-per-unit effort reduction is real |
| Five at $540, 3.88 partner hours per unit | $2,700 | $300 | $400 | 23 / 29.4 | Fits only with a materially narrower or more efficient offer: 22.4% less partner delivery effort |

All rows retain two setups: four partner hours and two owner hours in total. No price change silently improves productivity. Three engagements need a minimum arithmetic price of $886.67; $900 is an editable rounded scenario. Four at $600 already covers the income goal; the extra $280 is needed only to reach the retained-money placeholder. Reducing that retained target changes the money goal, not the time budget.

A concrete four-at-$670 weekly sketch after validating 4.85-hour partner delivery: allocate **5 hours/week to you** (3.5 project/setup + 1.5 administration) and **7.35 hours/week to your partner** (4.85 delivery + one setup + 1.5 administration). The two engagements not needing extra setup can finish in weeks one and three. Split each of the two extra setups over the preceding and delivery weeks, then finish those engagements in weeks two and four. This assumes ready inputs and compatible handoffs/deadlines. It is an illustrative feasible allocation, not automated scheduling or a customer commitment.

The lower-workload three-at-$900 case needs no assumed efficiency gain. One illustrative weekly allocation, including administration, is owner 4.5/4.5/4.5/3.5 hours and partner 6.5/6.5/6.5/5.5 hours. The suggested first comparison is this lower-volume option against four at $670; validate willingness to pay and actual delivery effort before adopting either.

The browser tool blocked access to the existing `file://` app tab. Therefore this turn prepares importable files and uses an isolated local preview; it does not claim to have changed browser-saved business records. That historical pack workflow has now been superseded by the native Earnings lab described above.

Verification for this target update: all five scenario money/capacity outcomes and their common baseline were checked through the planner model; the new backup parsed successfully. Earlier walkthrough baseline snapshots were asserted unchanged after setting the working income targets. The existing view and standalone-build suites passed 21/21 checks after the weekly-budget wording change. An isolated browser fixture confirmed three at $900 leaves $440 after the $2,000 target, and four at $670 with the explicit effort hypothesis leaves $400 and fits 23.4 project hours for the partner. No app error/warning logs appeared. Screenshot: `task2-income-target-2000.jpg`. This review did not validate market demand or actual production effort.

## Simulator connection acceptance

The existing simulator has weekly owner capacity, one pooled delivery team and a fixed quote/design/review/approval/production/delivery/payment workflow. The planner's role pools, setup counts and planned delivery quantities do not automatically become equivalent simulation behavior.

The implemented adapter blocks positive setup counts, generic direct costs and more than one used external role pool. Those plans remain usable in the planner; they cannot be copied faithfully into the current simulator. It also requires the relevant planner assumptions and new demand, cash and payment inputs to be resolved before creating the copy.

For the supported subset, the review shows exactly what will change: 30 days map to 22 modeled workdays (4.4 weeks); buffered owner delivery capacity maps to weekly owner capacity; the one external pool maps to the design team; recurring expenses map to monthly overhead; owner effort per delivery maps to the internal-review stage. Quantities become inquiry shares, not guaranteed sales. Monthly owner and retained-profit targets remain in the planner, and the simulator's hourly owner allowance is zero. Setup, print orders, repeat purchases, customer-profile variation and random disruptions are not enabled by this copy.

The reviewed copy preserves the Studio baseline and existing run. Demand, starting cash, payment timing and other simulation assumptions remain hypothetical. Custom service handoffs and unfinished real jobs are outside this first mapping. Simulator results cannot accept a quote, record a receipt or update real capacity automatically.

## Verification record

Director-review fixes: comparison details now match services, pools and expenses by stable identity; empty-planner errors remain visible; opening/creating/restoring a plan selects its own comparison by default; and an existing nonproject owner shortage is no longer discounted by the reserve percentage. Co-owner compensation and net role availability are explained in the interface. “Counted work hours” explicitly excludes other role pools' nonproject time.

After these changes, `node build.cjs` and `node --test *.test.cjs` passed **375/375** checks. The tailored walkthrough backup was parsed, reopened and checked against all three expected outcomes and its common baseline. An isolated browser fixture loaded those same saved plans and confirmed the $2,120/$1,520 shared-income amounts before retention, unchanged work/capacity in the lower-price alternative, explicit unknown income goal and exact price difference. No app error/warning logs appeared. `task2-shared-income-review.jpg` records this review. The actual browser file-picker import was not used for this fixture; existing file-origin workspaces were not modified.

`node --test planner-journey.test.cjs` passes **2/2 tests**. The first follows the four-delivery example through two alternatives, checks the actual hour shortages, preserves each dated source after later idea and working-plan edits, and round-trips all plans through backup. The second preserves an unfinished supplier-rate note through reopen and verifies that missing rates prevent an earnings conclusion while missing owner availability prevents a capacity conclusion. Known workload and revenue remain visible where justified.

The fixture explicitly replaces the initial unknown expense placeholder with its stated $200 expense. It does not rely on blank recurring costs being ignored. Source-idea overhead and hourly owner allowances are deliberately populated in the fixture, confirming that they are not deducted again in the studio-level plan.

The adapter and controller also received a read-only business review. The adapter's scope restrictions are documented above.

Release verification: `node build.cjs` regenerated the standalone offline `MEIQQ.html`; `node --test *.test.cjs` passed **368/368** checks. The tests cover model boundaries and unknown propagation, exact cents, isolated persistence and backup/import, deletion and Undo, view escaping/accessibility markup, and a reviewed simulator copy that preserves the current run, prior setup and planning source.

An isolated localhost browser check exercised the blank plan and fictional example, captured a dated baseline, increased four deliveries to six and observed the analyst shortage, then added a second alternative with increased analyst availability. It verified the unchanged four-unit baseline, editable differences, missing labor rate suppressing earnings without erasing known work, saved alternatives after reload, and explicit reasons an unsupported workflow cannot be copied. No browser error/warning logs appeared. A 390px viewport had no document-level horizontal overflow; comparison tables scroll within their own region. The viewport override was reset. `task2-planner-review.jpg` records the final comparison. The user's existing file-origin jobs and ideas were not used as test data.

Limits: physical browser download/file-picker import was not repeated (the prior browser download observer timed out); exported contents, additive imports and reopening were verified through integration tests. Fresh Windows/Edge coverage and online synchronization are not claimed. The ceiling is labeled as proportional arithmetic before whole-unit rounding; it is not an integer optimizer or a demand forecast.

Task 2 complements the original operating roadmap: S1 records one job end to end; S2 adds the daily studio view; S3 improves estimates from actuals; S4 deliberately adopts observations into planning; S5 models live unfinished commitments. This planner is not an implementation of S2–S5 or the full customer, quoting and purchasing capabilities proposed in Tasks 3–7.
