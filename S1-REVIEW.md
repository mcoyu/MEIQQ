# S1 — One job from agreement to final payment

Status: S1 is implemented and verified on 2026-11-20. The initial release passed 314 tests. The subsequent Jobs usability review passes 335 tests; fixes and browser checks are recorded below, alongside the original download-observation limit. The director chose S1 as the next build after the service-ideas launch pad. Task 2, the studio capacity/cost baseline and scenario connection, remains queued. The wider roadmap still covers the whole studio; this slice proves one operating record without turning a particular service into the studio's required business model.

The original operating sequence remains **S0 — Your studio workflow**, **S1 — One job end to end**, **S2 — Today's studio**, **S3 — Better estimates**, **S4 — Planning informed by your records**, and **S5 — Model live workload**. The later seven-task roadmap describes the wider business platform. S1 implements a small usable path through parts of Tasks 3–6, with an early estimate-versus-recorded review; it does not complete all of those tasks. S2 can add the daily view, S3 can improve estimates from actuals, S4 can review selected observations before adopting them into the simulator, and S5 can eventually model current commitments in isolated scenarios.

## Purpose and boundary

S1 should let the director record and inspect one job's scope, agreed price, work status, approval, delivery, actual costs, owner time and customer payments. A job can begin with an ad hoc brief; a fixed service portfolio is not required. The service-ideas workspace remains a place for research and estimated possibilities. Jobs records describe actual or clearly labeled practice work. Simulator runs remain hypothetical and separate.

This slice is not a full CRM or accounting system. It does not send an invoice, collect a payment, initiate a supplier purchase, calculate taxes, reconcile a bank account or recognize accounting revenue. Recording a payment means the director says it happened; it does not move money. Later roadmap work can expand relationships, scheduling, capacity, cash forecasting and reporting using these distinctions.

## Worked practice job

All figures below are fictional review inputs, not market-price or demand claims. Use a visibly labeled **practice** job so the demonstration cannot contaminate real operating totals.

The example is a $600 analytics diagnostic: one agreed business question, one source and reporting period, a checked short findings brief, and one client review. The brief records the required source fields, missing-data limitations, permitted use and a clear boundary for extra cleanup or broader analysis. The client approves a specific deliverable version before final delivery.

Estimated analyst cost is $150 and software/job cost is $20. The director expects three hours of their own work, valued at a $40/hour target. Those estimates provide a comparison basis; they do not automatically become costs incurred, time worked or payments.

The app's **Add practice example** also starts with a $30 allocated-overhead allowance. With that allowance retained, the Money tab's final **Remainder from records to date** is $280: $600 agreed price minus $170 incurred costs, $120 owner-time allowance and $30 allocated overhead. The $310 figure below is the distinct result **after owner time, before that overhead allowance**. The journey test sets overhead explicitly to zero to isolate the cash/cost/time distinctions; it therefore expects $310 after all entered allowances.

| Step | Action the director records | What must be clear afterward |
|---|---|---|
| Draft | Write the job brief and proposed $600 quote. Leave genuinely unknown fields blank. | This is a proposal. No agreement, customer receipt or supplier payment exists yet. |
| Agreement | Record the accepted scope, $600 price, deposit/final-payment terms and agreement date. | The accepted snapshot is retained. Agreed price is $600; received cash remains $0. Later changes require a dated amendment rather than silently rewriting the accepted terms. |
| Deposit | Record a dated $200 receipt with a reference. | Customer receipts total $200 and $400 remains to collect. The receipt is an actual entry, separate from any scheduled or requested deposit. |
| Work | Record the $150 analyst cost and $20 software cost incurred; record three actual owner hours. | Incurred cost totals $170. Amounts paid remain separate. The owner's $120 time allowance is not a cash payment. |
| Approval | Record which deliverable version was approved, when and by whom/reference. | A dated approval record exists; it does not create a receipt or prove delivery. |
| Delivery | Record the final deliverable/version and delivery date/reference. | Delivery is visible while the remaining customer balance is still $400. Delivery does not mark the balance paid. |
| Cost payment | Record payments of $150 and $20 against the actual costs. | Costs incurred remain $170; costs paid become $170. With only the deposit received, recorded net job cash is $30. |
| Final receipt | Record a dated $400 final customer receipt. | Total received is $600 and the customer balance is $0. Recorded net job cash is $430. No extra cost or payment appears automatically. |
| Correction | Void a mistaken posted entry with a reason and date, then enter the correct amount/reference. | The original remains in history as voided. Totals use only active entries. The correction does not erase the audit trail or double-count cash. |

At the end of this example:

- **Agreed price:** $600.
- **Customer receipts recorded:** $600.
- **Balance still to collect:** $0.
- **Costs incurred:** $170; **costs paid:** $170.
- **Recorded net job cash:** $430, calculated as receipts minus cash payments.
- **Recorded owner time:** 3 hours; **time allowance:** $120 at the selected $40/hour target.
- **Amount after incurred costs and owner time:** $310, before tax and unlisted costs. This is a job-level planning result, not bank cash or guaranteed studio profit.

The $430 cash result and $310 result after owner time answer different questions. Missing cost/time entries must remain visible as incomplete records; zero recorded entries do not establish that a job required no cost or effort.

## Review acceptance

The journey test should establish the business outcome rather than duplicate every model validation test:

1. A draft and an agreement create no payments; the agreed snapshot survives subsequent drafting and amendments.
2. Deposit, approval, delivery and final payment remain distinct events. Delivery can coexist with an unpaid balance.
3. Incurring a cost does not pay it. Paying a cost changes cash and outstanding cost balances without duplicating the cost itself.
4. Owner time affects its separately labeled allowance/result, never the cash ledger.
5. Dated corrections preserve the mistaken original and its reason, with active totals recalculated correctly.
6. A save/backup round-trip preserves the complete job, agreement history and correction trail.
7. Practice data remains visibly separate from real-job reporting and cannot alter simulator records or saved service ideas.

UI review confirmed that the director can identify the next action, distinguish estimates and unposted drafts from events, and see an unpaid balance after delivery. The final verification results follow.

## Verification record

`node --test jobs-journey.test.cjs` passed both outcome tests on 2026-11-20:

- The complete practice journey preserves original and amended agreements, separates incurred costs from cash payments, keeps a delivered job's unpaid balance visible, preserves a mistaken receipt and its dated void reason, reaches the expected $430 net cash and $310 result after owner time, and survives a backup round-trip. The separate real job is unchanged.
- A job with unknown internal delivery estimates can be saved and agreed at a known price without inventing a zero owner-time rate or a complete earnings result.

The final packaged build passed **314/314 tests** with `node --test *.test.cjs`. New coverage includes posted event validation, frozen agreements, unknown estimates, partial supplier payments, refunds and overpayments, correction dependencies, unfinished-form persistence, additive imports, typed backup isolation, stale-window protection and preserved damaged originals. UI integration exercises the exported backup payload and import confirmation without changing either simulator records or Studio ideas.

A separate localhost browser preview completed the fictional $600 practice job through agreement, $170 incurred cost, $200 deposit, three owner hours, approval, delivery with $400 still due, supplier settlement and the final $400 receipt. It also entered a mistaken $450 receipt, voided it with a reason and retained the original in History. The finished screen shows $430 job cash movement and $280 after the $120 owner-time and $30 overhead allowances. Reloading preserved the entries and an unfinished work-description draft without posting it. The next action remained editable after settlement. Real/practice labels and the derived settlement status were visible.

The desktop layout was inspected, and a 320px viewport check showed no horizontal document overflow. The responsive override was reset after inspection. Full native Windows/Edge verification remains outstanding; this release does not extend the earlier native-browser matrix. Browser download-event observation stalled in the automation tool, so downloaded-file delivery was not verified manually. Payload generation, backup parsing, additive import and reopening passed automated integration tests. No client data was used or sent. Screenshot: [s1-job-review.jpg](s1-job-review.jpg).

The initial view draft exposed an unsupported generic `note` form field. The view now uses the model's `description` field for optional work/approval/delivery detail and shows that detail in History. The focused model, view and journey run passed all 19 tests after this alignment.

## Adversarial integration review

Read-only review of `jobs-controller.js`, `jobs.js`, the shared collection session and `app.js` confirms that drafting does not post events, successful posting clears the relevant amount/hour fields, agreement amendments preserve earlier snapshots, additive imports retain job mode and local ledger references, and each workspace uses its own model key and typed backup format. Posted correction dependencies prevent removing a cost while its payments remain active or removing receipts needed to support a recorded refund.

Two review findings were addressed before delivery:

- **Settlement classification — fixed:** settlement now requires zero customer overpayment, zero outstanding balance and zero unpaid recorded costs, plus delivery. Regression tests cover resolution by refund or accepted amendment; an unaccepted draft price change cannot settle the job.
- **Damaged-save recovery — explicit limitation:** malformed/divergent originals remain preserved and write-blocked. Import can add copies in memory but does not repair that store. The import confirmation and completion message now explicitly warn that those copies are session-only and require a downloaded backup. A valid backup can be restored in a fresh browser profile or another browser. The previous saved original is not overwritten; an integration test verifies the warning and preservation. In-place automatic repair is outside S1.

The normal operating journey is ready for director review. S1 remains single-operator manual recordkeeping; wider customer management, studio-wide schedules, formal invoice delivery, synchronization and live-job simulation remain separate future expansions.


## Jobs usability review — 2026-11-20

The director reported five repeated practice drafts with no delete control. This was a missing interaction in the first build: preserving posted history had been applied too broadly to cleanup of unposted drafts.

Delivered fixes:

- **Delete draft, Trash, Undo and Restore draft:** remove unrecorded jobs from Active without losing working scope or unposted forms. Jobs with any agreement or entry, including a fully voided journal, use **Archive job**. Hidden jobs are read-only until restored. There is no permanent purge in this release.
- **Practice reuse and identity:** the normal practice button reopens an existing active example. Deliberate new copies remain available, and every card shows its job ID.
- **Navigation and focus:** remember selected job, section, entry type and filter in browser preferences. New jobs focus Job name; selection/restoration/removal focus the editor or creation control. Active, Archived and Trash each have search. A search is cleared if a live edit would otherwise hide its selected job.
- **Persistent errors:** an invalid post preserves input, creates no event and focuses an error beside the form. Correcting the input clears the error; a second click after successful posting cannot duplicate a receipt.
- **Dates and supplier choices:** new entry dates start blank, Use today is explicit, and successful posting clears the date. Existing unfinished dates remain intact. Supplier payment choices identify the cost, payee and unpaid amount, omitting fully paid costs unless preserving an existing selection for review.
- **Save compatibility:** format v2 adds locations while reading strict v1 records using the existing storage key. Backups and additive imports retain active/archived/trashed jobs, identity, agreements, entries and all unfinished forms. Hidden jobs reject accidental model edits or postings.

Verification: `node --test *.test.cjs` passes **335/335**. The 21 additional checks cover model migration and lifecycle, view behavior and complete UI cleanup/resumption paths. The existing job/payment/correction and simulator suites still pass. `git diff --check` passes and `MEIQQ.html` is regenerated from source.

An isolated browser preview reproduced five deliberate practice copies, verified repeated normal practice clicks did not add more, deleted a draft with unfinished receipt input, restored it using Undo, and retained the input. Invalid posting displayed and focused a persistent error. A valid $25 receipt changed the cleanup action to Archive; archive/restore preserved the posted entry. Reloading returned to the selected fifth job, Money section, Customer receipt form and unfinished amount. Renaming a filtered job from “Menu refresh” to “Analytics refresh” retained focus and the same record throughout typing. A 390px viewport had no horizontal overflow; keyboard restoration and focused validation worked there. The viewport was reset afterward. Existing user drafts in the file-open app were not manipulated during QA.

The prior limits still apply: the native Windows/Edge matrix was not rerun and browser download-file observation remains unverified. Backup payload and import/reopen behavior are covered by automated tests. The screenshot is [jobs-qol-review.jpg](jobs-qol-review.jpg).
