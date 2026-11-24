# Stage B — model consistency

Stage B of the November 17, 2026 MEIQQ build audit is implemented. It changes simulation semantics and saved-state structure while retaining the Stage A reliability boundary. Stage C interface restructuring remains pending.

## Implemented model rules

| Audit requirement | Implemented behavior |
| --- | --- |
| Stable demand identities | External demand uses `lead:<day>:<index>` identities. Conversion, complexity, revision, approval, supplier, payment and return draws use separate deterministic streams tied to that identity. Same-seed capacity comparisons therefore keep external leads fixed. |
| Explicit same-day event order | A day processes due collections, monthly overhead, confirmed repeat cycles, external demand, outreach, then scheduled project work. A failed cash obligation rolls back the entire proposed day. |
| Same-day transitions | Completed work and zero-duration waits can cross several stages in one day. A bounded transition loop prevents invalid infinite routing. |
| Realistic project capacity | A design project can consume no more than one designer's daily availability. Different projects can run in parallel across multiple designers. Owner quoting, review and delivery share one capacity pool after outreach. |
| Commitment boundaries | Quote effort is fixed when demand arrives. At quote acceptance, price, scope, design/review effort, delivery effort, deposit, payment terms, approval time, print time/cost and promised lead time are fixed for that project. Delivery deadlines cannot be edited before acceptance. |
| Owner-time labels | The result is labeled **After owner-time target**. It revalues all recorded owner hours at the currently applied target and is not a historical payroll calculation. |
| Payment and renewal separation | Fulfillment, payment and renewal status are stored independently. A renewal becomes eligible only after delivery and full payment. Fully prepaid work completes without a zero-balance payment wait. |
| Client and contract identity | Clients and accepted contracts have persistent IDs. Paid-cycle subscriptions and confirmed repeat orders retain those identities and record a cycle number. |
| Delay and bottleneck measures | Results include quote count/age, open owner/design hours, completed lateness, on-time rate, lead times, external waits and 30-day throughput. Bottlenecks combine all owner stages, compare design load, and identify external waits separately. |

## Recurring-work boundary

The service-level recurring switch models a **paid-cycle subscription**. It is not a fixed billing calendar or an overlapping retainer obligation. Its next cycle starts only after the prior cycle is delivered and paid, no earlier than 30 days after the previous inquiry. A returning non-recurring client creates a **confirmed repeat order**. Both bypass new-sales conversion by design.

Capacity may change when those later cycles become eligible and therefore how many repeat cycles exist inside a fixed horizon. It does not reroll unrelated external leads.

## Saved-run compatibility

New and restored runs use model version 2 inside the existing version 3 workspace format. Older readable runs are upgraded with deterministic demand-stream values plus explicit client, contract, commitment and lifecycle records. The validator checks the new references and statuses before imported state can replace active work. The original legacy-file preservation behavior from Stage A is unchanged.

## Verification

`stage-b.test.cjs` adds controlled fixtures for:

- identical external leads and random streams across low- and high-capacity runs;
- collections before overhead;
- zero-duration same-day completion;
- the one-designer-day-per-project cap and multi-project parallelism;
- quote and acceptance commitment boundaries;
- persistent client/contract cycles and payment-gated renewal eligibility;
- enhanced delay metrics and resource-aware bottleneck output.

The complete automated suite also retains 1-, 3-, 6- and 12-month reconciliation and invariants, legacy migration tests, storage failure/conflict tests, workspace round trips, imported-state validation, UI logic checks and execution of the generated offline HTML.

Run the release checks with:

```sh
node build.cjs
node --test *.test.cjs
```

## Remaining scope

Stage B does not add fixed-calendar subscriptions, named staff assignment, formal accrual accounting, taxes, borrowing, supplier selection or market demand response to price. Those remain explicit model limits rather than implied behavior. Stage C remains the next audit milestone.
