# Scenario recipe evidence and reproducibility

The setup recipes are editable modeling starting points. They are not forecasts, market research estimates, vendor quotes or recommended prices.

## What the evidence does and does not support

| Input family | Evidence role | Calibration status |
| --- | --- | --- |
| Market names and broad relative context | A frozen Census snapshot records household-income observations for the named markets. | There is no valid formula from household income to studio response, acceptance, timing or overhead. Those values have separate, explicitly modeled records. |
| Designer labor and owner-time values | Frozen BLS, China NBS, Michigan and Upwork observations provide employee, regulatory and marketplace context. | None directly calibrates a China-based remote designer hired by this studio. The $15–$25 recipe range is a low-confidence prior, not a quote. |
| Shop mix and focus | Official city pages describe broad commercial character, such as downtown, small-business, retail and institutional context. | Exact food/retail/service percentages, focus types and service inquiry shares are scenario-design choices, not measured local market shares. |
| Outreach and business conditions | A frozen HubSpot survey supplies general cold-outreach response context. | The default funnel—6 contacts/hour × 5% qualified = 0.30 qualified inquiries/hour—and all condition multipliers are low-confidence priors, not measured local-studio performance. |

The application therefore uses phrases such as “modeled assumptions—not quotes or forecasts.” “Evidence-anchored” means only that public sources informed the vocabulary and qualitative setting. It does not mean the category ordering or any numeric value was statistically estimated.

## How to use the builder

The builder does not ask a user to choose among 720 named scenarios. It asks four independent questions:

1. **Where?** A local-market narrative changes modeled response, qualified-quote acceptance, timing, overhead and customer-mix assumptions.
2. **How large?** An operating model changes modeled time, staffing, labor rate and active outreach. It does not replace starting cash.
3. **Who?** A shop mix changes modeled customer targeting; it does not replace custom services.
4. **What month?** A condition changes modeled demand and delay pressure.

The 720 figure is only the product of those choices (6 × 4 × 6 × 5), not a claim that 720 environments were observed or researched. Start with the closest understandable choices, inspect the preview, and edit the resulting assumptions. Recipe labels are navigation aids; saved numeric assumptions are authoritative.

## Source register

- [U.S. Census QuickFacts](https://www.census.gov/quickfacts/) — current public demographic, 2020–2024 income and 2022 retail-sales context. QuickFacts is a live product; the recipe module does not freeze its city extracts.
- [BLS Detroit-Warren-Dearborn occupational wages, May 2025](https://www.bls.gov/regions/midwest/news-release/2026/occupationalemploymentandwages_detroit_20260715.htm) — regional occupational-wage context.
- [Michigan minimum wage](https://www.michigan.gov/leo/bureaus-agencies/ber/wage-and-hour/min-wage) — state regulatory context, not a remote-design labor quote.
- [China National Bureau of Statistics 2025 urban wages](https://www.stats.gov.cn/english/PressRelease/202605/t20260518_1963740.html) — employee-wage context, not a remote-freelancer quote.
- [Upwork graphic-designer rates](https://www.upwork.com/hire/graphic-designers/cost/) — global public marketplace rates, not China-specific realized contracts.
- [HubSpot 2025 cold-calling survey](https://blog.hubspot.com/sales/state-of-cold-calling) — general sales-response context, not qualified local-design inquiries.

`preset-evidence.js` freezes the observation, source date, retrieval date, scope and SHA-256 digest for each public record. It also freezes the modeled-assumption records that actually supply recipe values. `QQPresets.audit(config)` joins every applied leaf to those records and marks later manual edits.

## Capacity semantics still requiring a product decision

**Steady month** means the neutral demand-condition multiplier, not a capacity guarantee. Capacity depends on market, operation, custom services and customer mix. The current conservative catalog happens to keep the shipped service catalog below 100% in all steady combinations, but no rule caps a changed or future combination. The interface must continue warning when a preview is overloaded.

Do not silently reinterpret **steady** as **capacity-balanced**: doing so would require either changing demand per operating model or removing valid overload experiments. The recommended policy is to keep steady as a demand narrative, say so explicitly, and offer a separately named capacity-balanced starting action if onboarding needs one.

## Persistence boundary

Applying **Use this recipe** composes ordinary editable setup values into the unfinished draft. It does not alter the active simulation until the user explicitly applies the draft.

The composed draft and applied configuration include catalog/ledger versions, the frozen applied-value snapshot and its checksum. They survive browser saves, backups, preserved workspaces and reopened runs. Selector choices remain a separate browser preference, but recipe identity in the configuration allows evidence audit after import.

Recipes preserve scenario name, seed, horizon, starting cash and every service leaf. They apply only market, team, customer and condition settings. The initial new workspace additionally snapshots every configuration leaf so later edits are visible without treating unchanged user-owned values as source-calibrated.

## Reproducibility limits

The repository now includes frozen observations, retrieval/source dates, record hashes, catalog/ledger versions and a value-by-value derivation API. It still lacks studio CRM history, quote outcomes, vendor defect records, remote-contractor invoices and an extraction notebook. Therefore `empiricallyCalibrated` remains false for every recipe. Replace modeled records with versioned studio/vendor observations before making a calibration claim.

The automatic new-workspace funnel is deliberately conservative: 4 outreach hours/week × 6 contacts/hour × 5% contact-to-qualified inquiry × 4.4 weeks = 5.28 qualified inquiries/month; at 30% qualified-quote acceptance, that is 1.584 expected initial wins/month. All four real-world disruption families are enabled at low modeled priors (10% rush, 3% supplier reprint, 15% repeated revision, 15% extended late payment); the stress recipe raises them. These are editable hypotheses, not measured frequencies.
