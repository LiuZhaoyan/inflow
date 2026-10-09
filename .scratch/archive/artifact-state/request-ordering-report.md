# Story request ordering investigation

Date: 2026-10-09
Original ticket: artifact #01 (removed at the owner's request).
Source baseline: `fedc987` (`refactor: share learning artifact state across workspace`)

The unchanged native runtime did not replace the newer Story in the tested scripted selections. Controlled **reply-only** delays reproduce stale renderer selection through history, including Library A followed by history B. These results demonstrate an ordering risk under an injected delivery schedule, not a confirmed ordinary-runtime bug. No product fix is included or approved by this research ticket.

## Public seams and execution

The [runnable harness](verify-request-ordering.cjs) follows the existing [native Library acceptance pattern](../frontend-workspace/verify-library.cjs). It runs the built renderer, sandboxed preload, real Electron IPC open/restore handlers and host-owned SQLite in eight separate fixture profiles. Each scenario reloads its renderer, exits, and starts a second Electron process with the same fixture profile. No account, developer profile, credentials, cloud call, or schema change is involved.

The seams are the Story history control, Library buttons, reader artifact ID, Library `aria-current` selection, vocabulary collection/lookup/save, and the public `restoreArtifact`/`listVocabulary` operations. The ticket's reproduction checklist authorizes these seams. Provider generation and lookup adapters are deterministic fixtures; their IPC handlers and credential status are fixture overrides. Open/restore retain the application's host handlers and sender checks. Credential initialization is disabled and global provider fetch throws. The current renderer build was reused after its ArtifactLibrary and LearningWorkspace source copies were confirmed identical to this baseline; the product was not rebuilt or edited.

From a checkout with a current desktop build and installed dependencies:

```powershell
node .scratch/artifact-state/verify-request-ordering.cjs
```

A worktree can reuse that same build with `$env:INFLOW_ORDERING_RUNTIME_ROOT = 'D:/DeskBox/project/inflow'` before running. The harness prints its evidence directory, asserts the recorded outcomes, and exits nonzero on a changed outcome or failed check. It intentionally records existing stale-reply behavior rather than implementing a green product fix. Electron could not start in the filesystem sandbox (exit `2147483651`); the approved unrestricted run passed. One approval-review attempt timed out before the permitted retry succeeded.

## Results

Every seeded profile starts with Story C saved. A/B/C refer to each scenario's IDs in its JSON; G is the successfully generated fixture. The reader and Library agree in all completed scenarios. Collected vocabulary follows the displayed reader, including when the saved host selection differs.

| Scenario | Schedule and scope | Reader / Library / new vocabulary source after completion | Saved host selection | Reload and fresh-process restart |
| --- | --- | --- | --- | --- |
| Ordinary history | 12 A/B pairs; both select change events dispatched in one renderer turn; no held IPC | B | B | B |
| Ordinary Library | 12 A/B pairs using visible Library buttons and actual close/reopen; 100 ms settles queued close notifications; no held IPC | B | B | B |
| History A, history B | Host executes and saves A, then B; only A's reply is held until B is shown | A | B | B |
| Library A, Library B | Same A-then-B host execution and B-then-A reply delivery | B; A ignored by source-effect cleanup | B | B |
| Library A, history B | Same injected reply schedule; history does not replace the Library source effect | A | B | B |
| Edited draft during A | A executes while C remains visible; edit a C draft before delivering A | C; saved draft source remains C | A | A |
| Delayed initial restore | Hold the already computed C restoration reply; the renderer exposes zero Story choices until list/restore completes; choose B afterward | B | B | B |
| Pending generation | Hold the deterministic provider result; the busy native modal blocks Library/history access; release it | G | G | G |

The ordinary controls are scripted DOM change/click events in the real native renderer, not physical pointer or keyboard evidence. The negative runs do not prove that every machine or IPC load preserves order. Library closes immediately on selection, so its ordinary path requires reopening before B; the trace records actual execution and delivery rather than asserting an overlap that did not occur.

The controlled cases hold replies **after** `DesktopOperations.openArtifact` has synchronously updated the active ID. Host execution remains A then B. No open execution is postponed or reordered. Initial restoration likewise computes C before its reply is held. Generation alone holds provider completion before the host artifact transaction, and no concurrent newer article selection is exposed by the current busy modal. The harness checks `:modal`, the disabled close control and hit testing over the Library button; it does not programmatically click inert background controls to manufacture a user scenario.

An additional pre-request edited-draft check keeps C in both renderer and host and sends no open request. The post-await check differs: the draft blocks renderer navigation after A has already been saved by the host. Reload/restart therefore restores A. The draft and subsequently collected C vocabulary contexts remain C across both reload and restart. This is persistence divergence under the delayed-reply fixture, separate from a two-selection race.

## Source explanation

All artifact open/restore/generate callers were traced through [ArtifactLibrary](../../src/listening/ArtifactLibrary.tsx), [LearningWorkspace](../../src/workspace/LearningWorkspace.tsx), [LibraryDrawer](../../src/workspace/LibraryDrawer.tsx), [DesktopBridge](../../src/listening/desktop.ts), [preload](../../desktop/preload.cjs), [IPC handlers](../../desktop/main.ts) and [DesktopOperations](../../desktop/operations.ts).

The history function applies any successful reply after its second draft check. Library and vocabulary-source navigation use an effect whose cleanup rejects a superseded source reply. A newer history selection does not change that source prop, explaining the mixed-path result. The initial restoration effect publishes the list and restored artifact together, so a newer article cannot be selected while restoration is pending. Successful generation commits its artifact and active ID together, while the busy generation modal prevents selecting another article through the UI.

## Evidence and verification

The final [aggregate JSON](../desktop-learning/generated-samples/ordering-native-iiMUx2/result.json) contains all eight scenarios, with **eight renderer reloads, eight fresh-process restarts, and zero recorded renderer errors**. Individual files retain `ids`, before/intermediate/after `states`, `afterReload`, `restart`, `lookupInputs`, and host-completion/reply `trace` entries:

- [History reply divergence](../desktop-learning/generated-samples/ordering-native-iiMUx2/history-reply.json)
- [Existing Library cleanup protection](../desktop-learning/generated-samples/ordering-native-iiMUx2/library-reply.json)
- [Mixed Library/history divergence](../desktop-learning/generated-samples/ordering-native-iiMUx2/mixed-reply.json)
- [Pre-request and post-await draft protection](../desktop-learning/generated-samples/ordering-native-iiMUx2/draft-reply.json)
- [Delayed restoration](../desktop-learning/generated-samples/ordering-native-iiMUx2/restore-reply.json) and [generation UI availability](../desktop-learning/generated-samples/ordering-native-iiMUx2/generation.json)

Earlier attempts stopped on harness synchronization with queued native dialog-close events or hidden-window waits. They are not product-failure evidence. The final run uses bounded waits and a 45-second process watchdog. Evidence databases and logs remain ignored local fixture output; only the harness and English research records are committed. Syntax validation, focused ESLint and whitespace checks also pass. Product behavior, schema, APIs and request ordering remain unchanged; any ordering/persistence fix requires a separate scoped ticket.

## Subsequent flow-ownership verification — 2026-10-09

The [artifact #02 refactor](issues/02-evaluate-story-flow-deepening.md) subsequently concentrated restoration, opening and generation in a workspace-level owner. Its [ordering rerun](../desktop-learning/generated-samples/ordering-native-eAiwO3/result.json) passed all eight scenarios, reloads and fresh-process restarts with the same recorded outcomes. The harness now acknowledges the native generation-dialog close event before selecting vocabulary, avoiding a fixture-only selection race. The original investigation and its `fedc987` source explanation above remain dated evidence; no request-ordering fix is claimed.
