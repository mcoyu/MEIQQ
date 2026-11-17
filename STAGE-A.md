# Stage A completion — Prototype 03

November 17, 2026

Stage A of the MEIQQ build audit is implemented. The simulation refinements in Stage B and broader interface changes in Stage C remain pending.

## Changes delivered

| Audit issue | Implemented behavior |
|---|---|
| Imports discard prior checkpoints/drafts | The entire previous workspace is preserved, separately from imported experiments. Reopen or export it from Scenarios. |
| Invalid draft blocks backup | Blank and out-of-range inputs are saved without being applied. Malformed draft structures are kept as downloadable recovery originals. |
| Exports cannot be reopened | Export and import share a 128 MiB limit; a valid workspace above the previous 25 MiB ceiling is covered by a passing round-trip test. |
| Checkpoint accumulation | Identical runs deduplicate. Keep the latest 12 automatic checkpoints; manual/named checkpoints remain until explicit deletion. |
| Fragile browser saving | Atomic primary storage, debounced drafts, write coalescing, stale-window checks, explicit save status and preserved prior data after failures. Local storage remains a fallback. |
| Corrupted financial states accepted | Imports check individual project receipts/costs against the ledger, delivery-stage consistency, transaction signs/references, dates, funding and daily financial totals. |
| Imported text becomes HTML | Ledger project labels and review values are escaped; malformed draft styling/IDs are quarantined. |
| Fully prepaid work appears overdue | Delivered, fully paid projects complete immediately without a zero-value final receipt. |
| Funding missing from charts | Charts use ledger cash movements; funding immediately updates the current-day observation. |
| Legacy recovery | Readable original browser saves and previous backup formats import. Recorded terms are retained. Known missing funding observations and prepaid payment queues migrate through explicit rules. |

## Verification

**84 automated checks passed**, including the existing simulation tests and new regression tests for the audit findings. The initial regression run reproduced nine failures before the fixes.

Coverage includes 1-, 3-, 6- and 12-month money reconciliation, a real Prototype 02 migration fixture, valid and invalid imports, archived workspace restoration, incomplete drafts, storage failures/conflicts, snapshot retention, and execution of the generated offline HTML scripts.

Run from this directory:

```sh
node build.cjs
node --test *.test.cjs
```

UI checks use a minimal JavaScript host. Storage tests use a controlled IndexedDB contract double. Real-browser layout, native downloads, cross-browser file-origin persistence, and keyboard testing remain unverified in this environment. No visual certification is claimed.

## Using the revision

Extract the ZIP and open **MEIQQ.html**. Existing readable browser saves migrate where the browser exposes them. Otherwise choose **Open backup** and select a prior export. New version 3 backups require this revision or later.

**Scenarios → Preserved workspaces** contains workspaces saved before opening an example or backup. **Name / keep** pins a checkpoint. Explicit deletion has a confirmation step. Keep downloaded backups before moving the app or clearing browser data.

The prepaid correction can change completion and subsequent renewal dates. Stage B will address common-workload comparison identities, scheduling, commitment semantics and deeper subscription modeling; Stage C will address the wider setup/map/results redesign.
