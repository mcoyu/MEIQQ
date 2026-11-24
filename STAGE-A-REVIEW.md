# Stage A review and browser-save recovery

November 17, 2026

Reviewed checkout: `/Users/marco/Documents/GitHub/qq/qq-simulator`.

**Current status:** the Stage A review fixes, recovery correction, subsequent UI cleanup, and customer-profile extension have been applied to this checkout. The generated HTML was rebuilt from source, the complete test suite passed, and the changes remain uncommitted.

## Assessment of Stage A

Stage A addressed the main reported financial and backup problems, and all 84 existing checks still pass against the original code. The review found additional failures in storage transitions and UI state. Passing the original tests was insufficient evidence that recovery worked across all startup and asynchronous-save sequences.

The minimal UI host does not behave like a real browser: it does not lay out the page, rebuild actual DOM focus, enforce native input constraints, or exercise browser download handling. Stage A accurately disclosed that limitation, but its UI checks could not detect several of the issues below.

## Confirmed failures and corrections

| Priority | Failure | Correction |
|---|---|---|
| High | When primary storage became available after fallback saving, startup silently selected the primary workspace and hid the fallback work, draft, and checkpoints. | Preserve both versions, merge their preserved workspaces, and show a notice. Record the fallback fingerprint with the primary write so unchanged fallback data does not resurrect deleted copies. |
| High | A primary database read failure was treated like unavailable primary storage, allowing writes to an older fallback save. | Distinguish failed reads from unavailable storage. Disable automatic saving for that session, retain both stored versions, and leave Backup available. |
| High | Completion of an older write could clear a newer serialization failure and incorrectly show “saved.” | Retain the preparation error until the current workspace can actually be serialized and saved. |
| High | After detecting another window's save, returning to a previously written snapshot could clear the conflict without checking the database again. | Keep the conflict latched until reopening; do not report success or resume writes in the stale session. |
| Medium | Empty-string saves were interpreted as absent and overwritten, in both primary and fallback storage. | Treat empty data as an unreadable original and preserve it through export and explicit recovery. |
| Medium | Cleared percentage fields rendered as `0` after navigation even though their draft value remained invalid. | Keep blank values visually blank. |
| Medium | Duplicate bypassed the 20-service limit imposed by Add service. | Enforce the same limit before duplication. |
| Medium | Multiple service creations within one timestamp could reuse IDs and prevent applying the draft. | Generate IDs with collision checks against draft services, applied services, and existing projects. |
| Medium | Recovery instructions were rendered inside the fixed-height clock as well as the main workspace. | Keep the instructions in the workspace; remove the oversized duplicate from the clock. Actual layout remains visually unverified. |
| Medium | Some dialogs stopped the simulation without updating its visible Pause control. | Refresh the clock when opening any dialog. |
| High | The existing Chrome save contained a valid day 31 run and five checkpoints, but older completed projects in two checkpoints omitted `deliveredDay` and had payment dates advanced an extra term. New validation rejected the whole save as unreadable. | Reconstruct only the missing date from a unique delivery log. Correct the known date shift only when the completion event and receipt ledger agree. Current-format validation stays strict. |
| High | Migrating a readable old browser save could replace the browser record without retaining its exact source bytes in the new backup. | Put the original text in **Runs & backups → Original files** before committing the migrated save. Distinguish successful restoration from an unreadable-save warning. |

Source inspection also confirmed that rerendering discarded disclosure state and focused elements. The prepared UI changes remember expanded service/uncertainty sections, restore focus by stable control identity, defer focus restoration until after a modal closes, and make the background inert while the dialog is open. These changes require a real-browser keyboard pass before claiming visual or accessibility completion.

## Verification

- Original build: 84 existing tests pass.
- Ten initial new regression tests fail against a clean copy of the original build. A further fallback-outage reproduction failed before its fix.
- Applied revision: **99 tests pass**, including all 84 original tests and 15 new regression cases. The suite was rerun in this checkout after rebuilding `MEIQQ.html`.
- Follow-up review reproduced a deleted archive reappearing after reload when Web Crypto was unavailable to an offline file. The fallback fingerprint now uses the same deterministic calculation in both storage environments; the new regression fails before the correction and passes after it.
- The new fallback test covers an outage, recovery of the primary store, preservation of the draft/checkpoints/archive, repeated reopening, and deliberate deletion without resurrection.
- The generated `MEIQQ.html` is rebuilt and checked against its source modules by the existing build test.
- Financial validation, prepaid completion, funding reconciliation, legacy migration, and supported simulation horizons remain covered by the existing passing suites. The simulation engine was not changed in this review.
- The rebuilt offline HTML opened in Chrome. Desktop layout rendered, a blank inquiry share stayed blank after switching setup steps, an invalid draft blocked application, and a one-day run exposed a project detail panel. These checks ran in an isolated Incognito window.
- The regular Chrome profile's unreadable-save warning was reproduced. Its Download original save control exported valid JSON containing a day 31 run, 47 projects and five checkpoints. The active run and three checkpoints validated; the remaining two exposed the legacy date error. The repaired build restored the live browser run and all five checkpoints. Scenarios offered the original save for download. A fresh Chrome backup parsed again with all five checkpoints, the unfinished draft and the exact source save embedded as a recovery original. No original browser data was cleared.
- A further Chrome pass opened the change review dialog, dismissed it with Escape, and returned focus to the review button.
- A later UI pass removed the always-visible successful-migration banner, routine saved strip, duplicate instructions and several confirmation toasts. The original file remains downloadable from a collapsed section under Runs & backups. Chrome showed the clean setup and workflow screens, and opened that section to verify the download control.
- The subsequent customer-profile extension and draft recovery fix bring the suite to **107 passing tests**. An isolated Chrome window showed the new customer mix and added a food-only menu offering without changing the regular browser workspace. The profile patterns are illustrative and need local business data for calibration.
- Fallback-to-primary recovery in a real browser, responsive widths, other browsers, and a full keyboard pass remain unverified.

Run from the checkout after applying the patch:

```sh
node build.cjs
node --test *.test.cjs
```

## Remaining work

The broader Stage B and C work remains outstanding: stable demand identities, scheduling and subscription semantics, capacity-first estimates, explicit comparison baselines, consistent numeric-field constraints, detailed change reviews, and interruptible long runs. This review does not establish the absence of all bugs.

Before calling the interface fully verified, test uncertainty controls, repeated add/duplicate, keyboard dialog focus, fallback recovery, and all three themes at narrow widths.

## Applied files

The checkout includes source changes, the rebuilt offline HTML, test-host updates, the new regression suite, and this report. It has not been committed or pushed to GitHub, and it does not replace the existing ZIP outside the checkout.
