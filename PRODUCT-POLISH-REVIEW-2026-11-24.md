# MEIQQ product polish review

November 24, 2026 · Current offline build

**I’d start with one ordinary visit.** Open MEIQQ, pick an idea of your own, and decide whether to work on its scope, try a quantity in Planner, or start a client job. The app already supports those decisions. The difficult part is recognizing your own work and finding it again. I’d keep the copper workbench, the open list of ideas, and the three Studio tabs.

## The first change I would ship

1. **Open on Ideas on a first visit.** Today the two choices in the main window are “Set up my business” and “Try the restaurant example.” Both enter Simulator. When I worked on an idea and reopened the app, I landed back on Simulator setup. Remember the last top-level destination for return visits. Returning to Ideas should show the idea list. Returning to a simulation should keep its saved day and draft. [Startup and restore](app.js#L134)
2. **Give “Your ideas” back to the owner.** A fresh Studio lists five preloaded examples. “Add an example” offers those same five again. Put the templates there once. Show saved ideas in the main list, with **New idea** as the main action. Give a new user one quiet invitation to try an example. Preserve edited and linked examples during the change. [Initial ideas](app.js#L50) · [Idea list](studio-view.js#L46)
3. **Make “Plan this idea” dependable.** I planned a menu refresh at two units, edited only its next-action note, then clicked the same button again. Planner now had two menu refreshes, one at two units and one blank. Match the existing row by its stable idea link. Reopen it after a note edit. If price or effort changed, offer **Review updated estimates** and show the changed values. Keep quantities, role assignments, and dated baselines the owner has already worked on. Offer a separate version explicitly. Apply the same rule to Planner’s idea picker. [Revision matching](planner-studio.js#L52) · [Planner idea picker](planner-controller.js#L79)

**I’d call this ready after one test.** Create *Menu refresh*, plan two units, return to Ideas, change “Call the café” to “Call the café Thursday,” and open Planner again. There should be one menu refresh at two units. Then start a job from the idea. The cursor should land on Client with the scope and price ready to review.

## What feels like a placeholder

| What appears in the app | What it actually does | What I would change |
|---|---|---|
| **Exploratory studio service · placeholder** | The primary plan starts with four $600 engagements and a $200 recurring expense. The calculations treat those as real assumptions. Before entering a service, the owner sees $2,400 in planned sales. | Move the worked numbers into **Try a sample plan**. Start a personal plan with the first chosen service. Keep the owner’s chosen income target and weekly limits. Leave unknown costs blank until supplied. [Plan initialization](planner-studio.js#L8) |
| **Compare ideas** on first use | The comparison works. All five starter ideas have blank prices and effort, so the financial columns offer little basis for a decision. | Bring financial comparison into view when at least two ideas have comparable estimates. Earlier on, the buyer, deliverable, and next test are more useful when choosing between ideas. [Example values](studio-seeds.js#L109) · [Comparison](studio-view.js#L144) |
| **Market context** in a new Simulator recipe | The cities label the scenario. The current business-conditions recipes use common market coefficients. Operating model, customer mix, and conditions do affect the run. | Put location under scenario details and take it out of the row of controls that imply a change in results. Keep the recorded context on older recipes. [Recipe controls](app.js#L411) · [Coefficient selection](presets.js#L50) |
| **Copy to Simulator** on the starter plan | The transfer works for compatible plans. The supplied plan fails its own transfer rules because it includes setup work and a generic direct cost. | Put the reason beside the action before opening the review. Only ask for simulation-specific inputs when transfer is available. Preserve the cost as entered. [Compatibility rules](planner-bridge.js#L17) · [Transfer review](planner-controller.js#L42) |

## What I would change on each work surface

### Ideas and Planner

Keep the idea title and **Next action** as the center of the editor. Put Numbers and Research within reach. Once a linked job exists, let the owner reopen it from the idea. Today the prominent job action starts another draft, while the existing job already knows how to get back to its idea. A short **Jobs from this idea** disclosure would complete that round trip and still allow a second client job. [Idea actions](studio-view.js#L133) · [Job provenance](jobs-view.js#L127)

Use **Service mix** as the ordinary working view for a personal plan. Keep the editable quantity on each row, with price, effort, and recent recorded owner hours inside the selected service. Put **Earnings lab** one deliberate choice away for exploring alternatives. Move capture, compare, duplicate, and delete under plan options across the tabs. In the Earnings lab I saw “Studio plan” as an action, a list item, and a heading before reaching the work. One heading and one plan switcher would do. [Planner shell and tabs](planner-view.js#L200) · [Service editor](planner-view.js#L101)

### Jobs

**Make the list answer “Who needs me next?”** Rows show next-action text, but omit its date. The list sorts real jobs ahead of practice jobs and gives little guidance among the real ones. Show client, next action, and date on each row. Order overdue actions first, then upcoming actions, then undated work. Keep a separate label for delivery deadlines. This uses information Jobs already collects and avoids another dashboard. [Job rows](jobs-view.js#L45) · [Current sort](jobs-view.js#L137)

**Stage the form as the job progresses.** My new blank job already showed an agreement form, recorded progress, and a customer-money summary. On a 390 × 850 phone layout the page was 3,439 pixels tall, with 29 visible or scroll-reachable controls inside the main work area. I’d start with client, scope, proposed price, and next action. Put **Record agreement** behind one deliberate action. Bring work and payment summaries forward as entries arrive, with direct access to record a deposit whenever one occurs. Keep amendments, corrections, and archive history available on existing jobs. [Overview](jobs-view.js#L63) · [Entry forms](jobs-view.js#L79)

### Simulator

**Fix the first-service example handoff.** Starting **Set up my business** creates an unnamed row with 100% of inquiries. Choosing the Menu refresh example then adds a complete $350 service at 0%. Validation sends the owner back to finish the unnamed row. Replace a completely untouched starter row with the chosen example and give it the existing share. If the owner has typed anything, offer Add or Replace. In a custom scenario, group inherited assumptions such as opening cash and acceptance rate for review before the first run. [Custom setup](app.js#L501) · [Adding a service](app.js#L603)

**Carry the quieter Offers layout through setup.** Keep one next-step action on Demand, People, and Cash. Put run length, sources, scenario recipes, and advanced controls in the same place on all four steps. In price experiments, collapse equal **Current** and **Current custom price** rows. Move **Open worked example** from Preserved workspaces to Setup examples, where someone looking for a demonstration can find it. [Setup](app.js#L530) · [Price comparison](app.js#L611) · [Preserved workspaces](app.js#L1171)

**Give a finished run a whole-run answer.** At day 90 in the restaurant example, the headline reported a $40.98 operating result for month three. The result for the full experiment was $885.56, or −$2,359.40 after valuing owner time. Someone asking “Was this worth doing?” needs the period and both measures together. Open completed runs on **Whole run**, with a month selector for investigation. Keep **Jobs to watch**, project search, the cash ledger, replay, and run comparison as drill-downs. Those tools explain how the result happened. [Run view](app.js#L905) · [Results period](app.js#L1994) · [Margin view](app.js#L2096)

### Navigation and appearance

Reuse the Ideas header in Jobs and Planner. Put appearance, background motion, and file management under **Workspace options**. Show a persistent save warning when action is needed. Remove the always-visible healthy-save strip and repeated workspace headings. Keep the copper, typography, and breathing room on the surfaces where decisions happen. On keyboard navigation, send focus to the new main heading and mark the current destination for assistive technology. Ideas and Simulator already move focus to their headings. Jobs and Planner currently miss that target. [Workspace headers](app.js#L245) · [Navigation focus](app.js#L783)

## Fixes I would prioritize before relying on the records

| Priority | Reproduced behavior | Change and acceptance check |
|---|---|---|
| Before using Jobs for RMB receipts | I entered and posted **¥100.00** in Chinese. Jobs stored 1,500 US cents and displayed the receipt as **¥99.97**. The offline conversion rounds actual transactions. | Decide which currencies Jobs records. For CNY transactions, preserve the original currency and amount in minor units. For USD-only records, allow Chinese labels with exact USD entry and mark CNY conversions as estimates. A posted amount should survive a reload and backup exactly in its entry currency. Preserve existing USD records. [Money input](i18n.js#L137) · [Posted entries](jobs.js#L143) |
| Before moving a working Studio to another browser | Ideas, Planner, and Jobs require three backups. Restoring an 18-hour-per-week Studio plan into a freshly initialized Planner left the 8-hour starter plan primary. The restored figures survived in a second “Studio plan.” The next idea went to the starter. | Add **Back up Studio** and **Restore Studio** with a preview. Restore the primary plan and preserve links. Keep **Add copies** for intentional merges. Test an empty browser, an occupied browser, repeated restore, and an older backup. [Current backup workflow](README.md#studio-workbench) · [Plan import](planner.js#L99) |
| Before sharing a build | The top-level prototype ZIP contains a 343,982-byte HTML build without Ideas, Planner, or Jobs. The separate Release 1 HTML also predates the idea-to-job link. | Publish one clearly named current download. Put historical releases and exported comparisons in a labeled archive. Have the packaging check compare the ZIP’s HTML with the tested app. [Build](build.cjs) · [Build verification](build.test.cjs#L3) |
| Small correctness fixes | After recording a Nov 20 delivery and then backfilling Nov 15, Jobs labeled Nov 15 the latest delivery. An imported idea with an invalid legacy scenario quantity can show a Numbers warning for a field the user can no longer edit. | Use the latest effective date on Jobs summaries, as Planner already does for delivery. Scope Numbers warnings to fields the screen can repair and preserve the original backup data. [Jobs summary](jobs-view.js#L63) · [Planner observations](jobs.js#L164) · [Numbers warnings](studio-view.js#L85) |

## What I would keep and what can wait

**Keep** the separate agreement snapshot, the distinction between posted entries and drafts, the real/practice label, recoverable job cleanup, and the recorded-hours link in Planner. Keep the distinction between hours **per delivered job** and estimated hours **per service unit**. In Simulator, retain deterministic replay, cash versus earnings, checkpoints, and the evidence behind estimates. These features earn their space when the owner has a specific question. [Job records](jobs.js#L136) · [Recorded owner hours](jobs.js#L164) · [Run comparisons](app.js#L1045)

**Defer** a separate customer pipeline, named-staff scheduling, purchasing, native packaging, and a new Studio dashboard. Some appear in the expansion plan. They introduce new workflows and do little to improve the first visit or the next client handoff. Mark old milestone reviews as historical. The Studio roadmap still describes Planner as queued in its introduction and delivered farther down the same file. [Expansion plan](STUDIO-EXPANSION-PLAN.md#L11) · [Planner delivery note](STUDIO-EXPANSION-PLAN.md#L131)

## How I would pilot the changes

Start with the three changes under **The first change I would ship**, plus moving the fictional service out of new personal plans. Try the menu-refresh exercise with someone who has never seen the app. Watch where they hesitate and whether they can find their existing idea and plan after reopening. Then test one real job from agreement through delivery. Use that session to decide which Jobs fields deserve the first screen. The payment, restore, and distribution findings have their own release decisions in the table above.

The review covers the current offline HTML, Studio and Simulator flows, source, backups, release files, and prior reviews. The existing suite passed all **525 tests**. Desktop and phone-width walkthroughs used fresh offline Chrome profiles. The usability priorities are reviewer judgments. The duplicate row, posted receipt, restore behavior, and stale ZIP have reproducible checks. The project’s prior release matrix still lists Edge on Windows as outstanding. [Browser matrix](STAGE-C.md#L105)
