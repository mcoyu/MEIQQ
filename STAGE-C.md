# Stage C — usability and comparison workflow

Stage C implements the November 17, 2026 audit's usability path on top of the Stage A reliability boundary and Stage B model semantics.

## Implemented behavior

| Audit requirement | Implemented behavior |
| --- | --- |
| Simplify setup and map | Setup defaults to guided essentials with an optional all-assumptions analyst workspace. Combinable Metro Detroit scenario recipes provide public-context-informed starting points. The workflow uses configurable responsibility-lane and handoff metadata. |
| Preserve input state | Draft inputs remain separate from applied settings and persist in browser saves and backups. Stable render identities preserve focused controls and open disclosures across routine renders. |
| Unify validation | Engine and UI use structured configuration issues. Invalid fields, service shares and customer shares are checked by the same rules before apply or import. |
| Expose service costs | Each service leads with per-project price, direct cost, contribution, hours and owner-time result. A collapsed 30-day demand-ceiling view shows aggregate economics and capacity. |
| Pin comparison baselines | One saved checkpoint can be pinned as the baseline. The pin survives retention, browser persistence, backup export/import and archive round trips. Later checkpoints do not silently move it. |
| Explain assumptions and results | Apply review and scenario comparison list leaf-level setting changes, including service terms. Comparisons label day and workload mismatches and use descriptive rather than causal language when runs are not equivalent. Any two distinct current or saved runs can also be exported as a self-contained HTML report with exact assumptions, warnings, measured results, service/project figures, recipe provenance and the frozen evidence ledger. |
| Interrupt long runs | Finish month advances in bounded asynchronous batches. Pause, modal actions, restart and import invalidate queued callbacks so stale work cannot resume the run. |

## Evidence-anchored presets

`presets.js` composes four user decisions—local-market narrative, operating model, shop mix and business condition—into 720 mathematically possible recipes. The count is not presented as 720 observed environments. Every recipe is fully editable and passes the engine's normal validation. Public income, wage and business-context observations provide qualitative vocabulary and setting only. `preset-evidence.js` freezes those observations alongside the modeled parameter records, dates, scope limits and derivation inputs. High evidence-lineage coverage means values are traceable; it never means they are empirically calibrated. Service demand, conversion, pricing, payment timing, staffing, labor rates, shop shares and stress multipliers remain explicit modeled assumptions rather than empirical estimates.

A genuinely new workspace uses the Metro Detroit / solo / steady recipe: 15 owner hours and four outreach hours per week, 0.30 qualified inquiries per outreach hour, 30% qualified-quote acceptance and $18 per designer hour. Those low-volume values are modeled starting points. Existing browser saves are not rewritten; their exact applied configuration and unfinished draft remain intact until the user explicitly merges a recipe.

Loading a recipe merges market, operation, customer and condition assumptions into the draft; it preserves the user's service catalog, service prices and mix, starting cash, seed and horizon. The **steady** condition is the neutral demand multiplier, not a promise that the selected team has enough capacity. The preview calls out overload before the recipe is loaded. The master uncertainty switch controls ordinary variability, while higher-impact rush deadlines, supplier reprints, repeated revision rounds and extended late payments are individually opt-in modeled disruptions.

The exact composed values and versioned recipe origin persist with each draft or applied configuration through browser saves, checkpoints, backups, archives and import. The selector's current UI position remains a browser preference and may differ from the origin attached to an imported run; the saved run's configuration is authoritative. See `PRESET-EVIDENCE.md` and the frozen ledger for the source register, parameter boundaries and reproducibility limitations.

## Canonical tested path

`stage-c.test.cjs` exercises a deterministic path:

1. open the day-12 worked example;
2. edit a service's price and work plus team capacity without changing the applied run;
3. inspect its 30-day cost and capacity preview;
4. review exact changes and restart with the previous run pinned;
5. finish the month cooperatively;
6. open a genuinely overdue design project and inspect its remaining work, deadline and timeline;
7. compare the result with the pinned baseline, including different-day warnings;
8. export a human-readable comparison of any two distinct current or saved runs without mutating either run;
9. request a downloadable backup and parse the exact serialized workspace contract;
10. reopen the browser-saved workspace and verify the run, baseline, recipe origin and assumptions.

`build.test.cjs` repeats the critical journey against scripts extracted from the distributed `MEIQQ.html`, so source-only success cannot hide a stale package.

## Browser support target and verification status

The support target is the current stable release of the four major desktop browser families:

- Chrome on Windows and macOS;
- Edge on Windows;
- Safari on macOS;
- Firefox on Windows and macOS.

Automated checks run in Node with a minimal DOM/storage contract host. They verify simulation semantics, render output, cooperative scheduling, persistence formats, the generated offline package and deterministic Phase C journey, but they do not replace native layout, focus, download, file-origin storage or screen-reader checks. Safari, Firefox and Chrome verification is recorded below. Edge on Windows remains an explicit gap; no unexecuted browser is claimed as verified.

## Remaining real-browser release gate

The 2026-11-18 follow-up exercised the packaged HTML in the real in-app browser over localhost: the inferred new-workspace defaults appeared automatically; a custom service name and $415 price survived a Dearborn recipe merge; exact changes were reviewed and applied; the run completed day 30; a two-run HTML comparison report downloaded through the browser; and reload retained day 30 and the custom service. `phase-c-browser-check.jpg` records the verified setup. This local HTTP check does not certify file-origin storage or Chrome/Edge/Firefox/Safari separately.

The service-overhaul follow-up exercised the rebuilt package through actual controls: filtered the 11-package library, inspected a seasonal campaign, changed its managed-print price from $850 to $900 with a live economics update, added it at 0% inquiry share, balanced the service mix, pinned a day-0 baseline, and reduced designer availability to one hour/week for an intentional capacity stress test. After review/apply and 30 simulated days, two campaigns were late. Project P002 showed 10.9 design hours remaining, seven days late, an agreed $900 managed-print price, a locked $175 supplier allowance, and the $600 files-only alternative. The comparison displayed unequal-period and changed-demand warnings; an HTML report downloaded successfully; reload retained the run and custom price. The final evidence dialog explicitly marked the edited price. `services-delayed-project-check.jpg` records the project inspection. The one-hour stress setting is browser test data, not a changed application default.

The service-overhaul suite passed **219/219** checks. The subsequent review below expanded that coverage. These checks supplement browser testing; they do not certify the outstanding browser matrix.

## Second engineering review — 2026-11-18

The team independently reviewed engine/restore behavior, catalog/preset provenance, reports/comparison, and browser editing. It found and repaired the following reproducible defects:

| Priority | Experiment and finding | Repair |
| --- | --- | --- |
| P1 | Add a seasonal service at $925, enter a 101% print share, save and reload. Strict applied-value checks quarantined the whole unfinished draft and reopened the applied setup. | Draft restoration validates safe object shape while preserving blank/out-of-range finite numeric inputs. Apply and accepted-run validation remain strict. Existing recovered drafts can be restored. |
| P1 | Run monthly/seasonal relationships for a year. Thirty/ninety-day slots could produce a 13th monthly or fifth seasonal opportunity. | Limit the yearly relationship to 12 monthly or four seasonal opportunities. Migrate only the exact obsolete, unstarted terminal queue signature; preserve settled projects and money. |
| P2 | Enter a managed-print share above 100%. Apply was blocked but unit revenue and margin still appeared. | Use the same validation rules for service previews, hide invalid unit/30-day calculations, and display percentage errors in 0–100% units. |
| P2 | Add or duplicate services after the original recipe snapshot. The audit omitted them. | Emit added-service lineage with source bindings and edited status; retain snapshot coverage semantics. Freeze catalog registries and document every numeric package assumption. |
| P2 | Type a proposed library price, open sources, return or download evidence before adding the package. The price was lost or the export could not find the service. | Preserve proposed prices through source navigation and export the actual candidate. Explicit catalog references prevent collisions with custom service IDs. |
| P2 | Compare skipped campaigns and malformed/future optional report fields. Skips were missing and unsupported modes/missing money could be mislabeled. | Report skipped/accepted counts separately, preserve accepted value, label unsupported routes, and show unavailable financial fields without inventing zeroes. |

The library also groups alternatives under five short customer-need categories. Price experiments do not borrow current catalog prices for incompatible saved catalog versions. Legacy repeat-service guidance retains its original renewal semantics.

Final automated verification: **239/239 tests passed**. `node review-experiments.cjs` supplies a repeatable additional matrix of 24 annual runs, 3,663 projects, 96 restore/replay checks and one funded cash block. The earlier exploratory matrix also covered payment/deadline stress, service edits/removal, every workflow stage, self-print and managed printing. Simulated stress counts are test evidence, not observations about the user's business.

Native Chrome/macOS over an isolated localhost origin verified category selection, a $925 proposed seasonal price, source/back navigation, a completed evidence download before adding the package, addition at 0% share, invalid-share feedback, and the repaired save/reopen behavior. The actual quarantined test draft was restored through the UI; another reload retained the fourth service and 101% field with Apply disabled. Changing it to 70% restored economics; Apply succeeded; Run/Pause stopped at day 8 and reload retained day 8 paused. The user's separate file-origin workspace was left unchanged. The in-app browser separately verified the grouped library layout; `engineering-review-library.jpg` records it.

## Finish-testing pass — 2026-11-19

The final engineering pass repaired issues found by new adversarial and native-browser experiments:

| Area | Reproduction and repair |
| --- | --- |
| Cash pause restoration | A cash pause on a newly created project could be orphaned after reopen. Restoration now reopens it, and only the exact reproducible obsolete save signature is narrowly migrated. Other histories and money remain strict. |
| Modal keyboard behavior | Evidence links and disclosure summaries were omitted from the trap, native Safari could skip browser-default focusables, and nested dialogs could lose their original opener. The modal now cycles every visible valid focus stop in both directions, retains the root opener across modal replacements and restores it on Escape/close. |
| Safari pointer focus | Safari pointer clicks do not necessarily move `activeElement`. Click intent is captured temporarily, and DOM `id` identity is distinct from ordinary `data-id`, preventing a package ID from restoring focus to the wrong element. |
| Input blur/click ordering | Safari's change-on-blur event rerendered an already committed numeric input and swallowed the first Review click. Equivalent values—including equivalent decimal text—are now no-ops that preserve the node and undo buffers. |
| Change readability | Adding or removing a service now produces one informative summary row. Existing package-scope edits use named fields rather than serialized JSON. |
| Narrow layout | Dialog grids no longer overflow at narrow widths, and setup tabs use a two-column arrangement at 540 px and below. |

Final automated verification passed **252/252 tests**. `node review-experiments.cjs` passed 24 annual runs covering **3,663 projects**, **96 restore/replay checks** and **one funded cash block**.

### Current native-browser matrix

| Browser / surface | Verified result |
| --- | --- |
| Safari 27.3, macOS, packaged offline file | Completed an offline edit/apply/run/inspect/compare/backup round trip: menu price $350 → $425, designer work 7 → 7.5 hours/project, and designer availability 24 → 1 hour/week; apply-and-restart, day 30 completion, late P002 inspection, baseline pin, approved download and backup reimport. Refresh retained day 30, the pin and preserved archive. Keyboard focus defects above were reproduced and repaired. `finish-safari-backup-check.png` records the final backup check. |
| Firefox 160.0.1, macOS, official temporary launch, packaged offline file | Changed menu price $350 → $425, forced zero cash/deposit, reached a cash block, reloaded, funded $500, reached a project-labor cash block on day 11, reloaded, funded another $500, ran/paused at day 14 and reloaded to day 14 paused. Also checked at 200% zoom. |
| Chrome 157.0.8103.80, macOS | A regular offline window restored the existing read-only day-58 workspace. In an isolated Incognito session, adding a $400 postcard at 0% share produced one readable change, applied successfully, reached day 30 and survived a same-session refresh. |
| In-app browser over localhost | At 320 px and 390 px, fixed setup tabs and modal controls remained unclipped after the narrow-layout repair. Light, Terminal and Dark themes and the analyst workspace rendered successfully. |
| Edge / Windows | **Not tested.** Edge was absent. The official installer downloaded for temporary testing had a trusted installer signature, but the extracted executable failed strict code-signature verification using two extraction methods. It was not launched or installed. Windows browser tests were not executed. |

Normal packaged `file:` workspaces may share browser storage across file paths under the browser's file-origin behavior. They are not claimed to be isolated by filename. Use a separate browser profile for persistent isolated work. Private/Incognito testing only verifies persistence within that private session; download a backup to retain it after closing. The dark-theme library check is recorded in `finish-browser-library.jpg`.

For the remaining Edge/Windows release gap and future browser versions, run the packaged offline file and record:

- the canonical journey above, using actual typing and buttons;
- browser refresh persistence and downloaded-backup reopen;
- Pause responsiveness during a long run and a cash-shortfall stop;
- keyboard-only navigation, modal focus trap, Escape and focus return;
- light, dark and terminal themes;
- desktop and narrow-window layouts, including tables and the fixed clock;
- IndexedDB-to-local-storage fallback and recovery where the browser permits file-origin storage.

## Automated verification

Run:

```sh
node build.cjs
node --test *.test.cjs
```

The automated suite is necessary but does not replace the real-browser release gate above.
