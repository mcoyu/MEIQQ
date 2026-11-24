# Boutique service catalog evidence

Frozen: 2026-11-18 · Market: Metro Detroit · Currency: USD

This catalog is a planning baseline for an owner-led studio that sells locally, uses a remote designer, and coordinates commercial printers. It is not a claim about the studio’s actual conversion, productivity, margins, or supplier quote. Public prices are frozen observations; catalog prices, hours, review time and ranges are explicitly modeled assumptions.

See the [README service workflow](README.md#businesses-and-offerings) for how these packages are added, customized, quoted and simulated.

## Evidence boundary

- Michigan design anchors: B-Unique (Lansing) publishes logo $200+, menu $100+, flyer $75/$135, and social $50+; Dana Laureano (Rockford) publishes $50/hour and a $300 logo package; North Country publishes $84/hour and a $275 logo/brand kit; AppWT (Livonia) publishes logo from $447, print design from $147, and digital design from $297.
- Print anchors: Royal Printing (Detroit) publishes batch prices and $5–$10/sq-ft adhesive/window materials. Printyco (Warren) publishes 100 table tents for $95 and 25 posters for $75.
- A vendor starting price is not a market average. A printer list price is not a delivered cost. Taxes, shipping, installation, permits, copywriting, photography, ad spend, postage and unspecified finishing are excluded unless the service scope says otherwise.
- Modeled sell prices were placed inside the documented `modeledPriceRange` after checking a direct-cost floor: planned designer hours, owner quote/review/delivery time, and any listed print batch. They are conservative starting hypotheses, not empirical calibration.
- `DERIVATIONS` exposes that arithmetic for every package using the baseline $18 designer-hour and $38 owner-hour assumptions. Those labor rates are scenario assumptions, not provider observations, and changing scenario rates changes actual simulated economics.

## Scope rules

Every offering states its deliverable count and included revisions. `hours` is planned designer effort including those revisions. `review` is planned owner review time; quote and delivery time remain scenario settings. Print-bearing services state a quantity and preserve missing vendor specifications instead of inventing them. The window product is print-only: measurement, installation, removal, permits, tax and delivery remain excluded.

Starter-bundle weights are deliberately labeled low-confidence modeling weights. No published source establishes that 30% of restaurant inquiries will be recurring campaigns or table tents; users should replace those shares with their own inquiry history.

Every print-bearing package offers an operational customer choice. The listed service `price` and `print` cost describe agency-managed printing; `fulfillment.designOnlyPrice` describes self-print delivery of the same approved artwork with no supplier cost charged by the agency. The baseline 70% managed-print share is an unvalidated workflow assumption, not observed customer behavior. The engine locks the chosen route at acceptance so later catalog edits cannot rewrite a commitment.

`DERIVATIONS` freezes each self-print price, its no-supplier cost floor, the unmeasured 70/30 fulfillment prior, and the user-directed campaign cadence beside the affected package. `BUNDLE_DERIVATIONS` separately freezes every starter weight and labels it unmeasured. These model records do not borrow empirical authority from adjacent printer records.

Each package’s `numericAssumptions` also enumerates price, planned design hours, owner review, supplier allowance, library weight, included revisions, print quantity, and modeled price/cost ranges. Observed supplier numbers are identified as comparisons; all remaining numbers are explicitly labeled policy or unmeasured planning assumptions. The exported registries are immutable at runtime so a UI consumer cannot silently rewrite the frozen evidence basis.

The monthly and seasonal physical campaigns model a 365-day relationship with at most 12 monthly or four seasonal opportunities. Every 30- or 90-day campaign is separately quoted and paid; these are not prepaid retainers. Declining a campaign skips that cycle rather than ending the relationship; the next eligible cadence receives a new quote within the relationship's slot and time limits. These counts are the chosen yearly-plan convention, not an empirical renewal forecast. The seasonal package starts at zero inquiry share so adding it to the library does not silently change demand.

Current billing semantics are deliberately pay-per-campaign. Monthly invoicing across 12 months and discounted annual prepayment are unsupported alternatives and must not be inferred from `relationshipDays: 365`. Changing that chosen policy in a future version would first require explicit cancellation, refund, revenue-recognition and renewal rules.

The brand starter is intentionally narrow: one developed logo direction, two revisions, palette, type choice, exports and a one-page reference. It excludes naming, positioning strategy and trademark work. The recurring monthly kit centers a physical 25-poster run with four coordinated digital companions. Its QR placement may point to a customer-owned trackable URL, but the package does not promise hosting, analytics, posting, or ad management.

## Source registry

The executable `SOURCES` registry in `service-catalog.js` stores publisher, location, URL, retrieval date, exact observations, reproducible observation hashes and caveats. `PRINT_OBSERVATIONS` ties modeled print costs to quantities and specifications; `BUNDLES` defines starter mixes only. Source pages can change after retrieval, so validate a live supplier quote before promising a client price.
