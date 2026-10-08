# Settings Acceptance

Date: 2026-10-08
Status: Automated source-checkout acceptance passed; owner visual acceptance pending.
Delivery branch: `main`; implementation prepared in `codex/settings`.
Base: `aa2912f`

## Delivered behavior

- A right-side Settings entry opens a modal using the current dark workspace surfaces, lavender accent, typography, form controls, and dialog styling.
- A left sidebar separates LLM and Subtitle mask categories. The supplied reference informs the layout only; workspace colors are retained. Switching categories preserves drafts, the shared Save handles both categories, and sidebar Saved/Error text makes partial results discoverable. Failed saves open the first failing category.
- Header, categories, content and footer share one continuous dialog background, with no internal dividing lines or contrasting sidebar surface. Spacing and the selected-category treatment provide hierarchy.
- Settings saves or replaces the existing shared DeepSeek credential through the host's Windows encryption mechanism. Saved keys are never returned to the renderer. Story uses a Settings shortcut and refreshes availability immediately after saving without losing its target selection or topic.
- A native color control updates an inline 16:9 sample-picture mask immediately. Saving applies one opaque color to all videos; cancelling leaves saved appearance unchanged. Existing mask regions, enabled states, and meaning-group choices remain per material.
- One Save action attempts both changed fields. Successful changes survive another field's failure, failures remain visible with retained drafts, and retry only submits remaining changes. Saving only a color does not replace a saved key.
- Opening pauses without seeking, and closing leaves playback paused. Escape and closing discard unsaved drafts; pending saves disable closing and duplicate submission. Focus returns to the invoking control.
- Narrow windows wrap workspace navigation below the native title-bar controls and arrange Settings categories horizontally above the content. The dialog accounts for scrollbar width; its header, category navigation and Save/Cancel remain visible while the content panel scrolls, including in short windows.

## Verification

| Check | Result |
| --- | --- |
| `npm test` | 40/40 passed, including global color restart, invalid-input rejection, and unchanged per-video learning state. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed. |
| `npm run desktop:build` | Passed; desktop host and static renderer compiled. |
| `node .scratch/settings/verify.cjs` | Passed in two isolated Electron processes with a generated WebM and real host IPC, SQLite, and Windows credential encryption. |
| Native screenshots | Both desktop categories, narrow and short-window screenshots inspected for current-style consistency, preview rendering, visible navigation and Save/Cancel, and overflow. |

The native runner covers an empty library, unsaved preview/cancel, category draft preservation, keyboard navigation with Tab/Enter, cross-category Save and failure navigation/status, color-only save with blank key, Story's disabled-to-enabled transition, encrypted file contents, selected-target/topic preservation, pause position, key-success/color-failure, color-success/key-failure, retry counts, pending-save Escape protection, focus restoration, reduced motion, 390px layout, scrolling at 900x520, existing mask and playback preferences, and restart restoration.

Successful native continuous-surface run: [initial results](../desktop-learning/generated-samples/settings-native-YqOb9p/initial-result.json), [restart results](../desktop-learning/generated-samples/settings-native-YqOb9p/restart-result.json). Both recorded zero renderer errors and zero provider requests. Deliberately injected IPC save errors are expected during the failure checks. Hidden-window screenshots use the Chromium debugging interface.

Screenshots: [subtitle mask desktop](../desktop-learning/generated-samples/settings-native-YqOb9p/settings-desktop.png), [LLM desktop](../desktop-learning/generated-samples/settings-native-YqOb9p/settings-llm.png), [narrow window](../desktop-learning/generated-samples/settings-native-YqOb9p/settings-narrow.png), [short window](../desktop-learning/generated-samples/settings-native-YqOb9p/settings-short-window.png), [empty library](../desktop-learning/generated-samples/settings-native-YqOb9p/settings-empty-library.png), [partial save](../desktop-learning/generated-samples/settings-native-YqOb9p/settings-partial-save.png).

The sidebar change re-ran lint, type checking, the desktop build and native acceptance. The subsequent continuous-surface CSS change re-ran the desktop build and native acceptance. The 40-test host/domain suite result above comes from the preceding implementation run; the sidebar change did not modify those modules.

The initial sandboxed checks encountered Windows filesystem restrictions in Next path canonicalization and an existing media-relink test. Re-running with normal local permissions passed without changing the relink implementation. Native acceptance uses an isolated profile and fixture keys, not the owner's credential or learning data.

## Remaining boundaries

- Owner visual acceptance is not claimed by screenshot inspection.
- These checks cover the source checkout, not an installed Windows package.
- Saving a key does not verify provider authorization or linguistic quality. No live cloud request is made by this feature or its acceptance runner.
- Settings implementation and the main checkout's design drafts are delivered together on main.

## Worktree cleanup

Both existing worktree branch tips were confirmed as ancestors of `main` before removal. The sentence-boundary worktree's uncommitted documentation and both worktrees' generated evidence were copied and verified by file hashes before deleting the old worktrees. Shared directory junctions were removed without touching their targets. The missing worktree record was pruned.

Backups remain under `D:/DeskBox/project/inflow/.scratch/desktop-learning/generated-samples/worktree-backups-20261008/`. Implementation used `D:/DeskBox/project/inflow/.worktrees/settings`, with a dependency junction to the main checkout's installed dependencies. Main-checkout design drafts were incorporated into the implementation records. Successful native screenshots and result files were copied to main and verified by file hashes before removing the temporary Settings worktree; generated evidence remains ignored by Git.
