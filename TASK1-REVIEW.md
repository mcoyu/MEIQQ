# Task 1 review — 2026-11-20

The engineering, experience and business-planning review supports keeping Task 1 as a provisional service-ideas workspace. Three concrete issues were corrected. No additional blocker was found in the workflow reviewed. The next proposed capability is the studio baseline for capacity, recurring expenses and income targets; no fixed service menu is required first.

## Worked example

Use Studio ideas and duplicate the analytics example. Name the copy **Walkthrough · One sales question**. The included `Task1-Analytics-Walkthrough.json` can also be opened through **Import ideas**; it adds the $600 and $400 examples as independent copies. These are fictional planning estimates, not recommended market prices, actual jobs or compensation agreements. Repeated imports add further copies.

1. **Scope:** one sales export, one reporting period and one question: which products account for discounting, and what should the owner investigate next? Deliver a checked short brief and one review call. Major cleanup, data connections and broader analysis require separate scope.
2. **Research:** record available fields, reconciliation questions, buyer usefulness and actual delivery effort as unresolved. The next step is a timed exercise using synthetic data, followed by buyer feedback on the usefulness of the resulting decision. Saved source links are context, not proof of demand or price.
3. **Roles:** keep one analyst responsibility covering preparation and analysis. Owner hours cover review and client coordination. Remove the other two example roles for this particular exercise. Responsibilities can be combined; they do not require separate hires.
4. **Numbers:** enter $600 price, $20 other direct costs, 5 analyst hours at $30/hour, 3 owner hours at a $40/hour target and $30 overhead. Setup adds 2 analyst hours and 1 owner hour, with $0 other setup costs. All figures are illustrative.
5. **Compare:** duplicate the idea and change only the price to $400. Compare First engagement, then Later engagement. The later case assumes the same preparation can be reused; a new client or changed data source may require preparation again.

| At a $600 price | First engagement | Later engagement |
|---|---:|---:|
| Analyst work | 7 h / $210 | 5 h / $150 |
| Other direct costs | $20 | $20 |
| Total direct costs | $230 | $170 |
| Owner time | 4 h / $160 | 3 h / $120 |
| Allocated overhead | $30 | $30 |
| Total work hours | 11 h | 8 h |
| All stated costs and allowances | $420 | $320 |
| Remainder after allowances | **$180** | **$280** |

At $400 with the same scope, the remainder becomes **−$20 first / $80 later**. A positive remainder covers the entered allowances; it does not establish buyer willingness to pay, available capacity or whole-studio profitability. Total hours are summed effort, not elapsed delivery time. Per-owner-hour figures are before deducting the owner's time allowance; they are not an additional payment or a guaranteed wage.

## Findings and changes

- **P2, corrected — hidden paid-role effort:** Numbers and Compare now show total work hours, while retaining owner hours separately. Unknown applicable role hours keep the total unknown. This prevents identical delivery costs from concealing different demands on partner/team capacity.
- **P2, corrected — false save conflicts:** opening, flushing or closing an unchanged Studio window no longer writes the same saved payload and invalidates another window's next edit. Actual conflicting edits still fail visibly. Reverting during a pending write remains saved correctly.
- **P2, corrected — dialog focus:** Studio dialogs capture their triggering button even when a browser click does not focus it. Escape returns focus to the Delete button without removing the idea.
- **P3, clarified — example roles:** helper text explains combining/removing responsibilities and counting work once.

One nonblocking usability improvement remains: the unknown-estimate message gives a count rather than naming each missing field. A field/role checklist would help larger ideas, but does not prevent this workflow. Role-specific capacity, monthly overhead coverage and sustainable income belong in Task 2.

## Verification and limits

`node build.cjs` rebuilt the offline HTML. `node --test *.test.cjs` passed **289/289** checks. Added coverage includes the false-conflict fix, pending-save reversal, dialog opener capture, total hours and unknown effort.

An isolated local browser workspace was used for the walkthrough. Browser checks covered duplication, scope and research edits, role removal, first/later calculations, the $400 loss, saved values after reload, comparison rows, and Escape focus restoration. The final browser error log was empty. The user's existing offline-file workspace was not modified during the walkthrough. Direct file-URL automation was unavailable, so this review does not add Windows/Edge or physical file download/import-dialog certification. Existing automated backup/import checks passed.

## Direction for the next task

Proceed to defining Task 2 around weekly availability, recurring studio costs and income targets. Before implementing partner compensation assumptions, distinguish an hourly delivery cost from a co-owner income target; do not silently choose one based on this fictional example. Keep services editable and provisional. Task 2 has not been implemented as part of this review.
