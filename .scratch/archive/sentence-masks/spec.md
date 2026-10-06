# Learner-selected Sentence Masks

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Date: 2026-10-03
Status: implemented; owner visual review pending.

## Confirmed behavior

- The system supplies complete meaning groups. New sentences show their source text.
- Set masks directly toggles mask mode. Clicking a visible group immediately masks it; clicking a masked group immediately shows it again. The same Set masks button exits the mode and shows all meaning groups, retaining the saved mask choices for the next mode entry. There is no separate selection or confirmation step. Native vocabulary selection is disabled in mask mode.
- Outside mask mode, the complete current sentence is visible and native word selection is enabled for vocabulary collection, including words in previously masked groups. There are no per-group mask controls outside the mode.
- Masks persist per media and stable sentence ID across navigation and desktop restart. Returning to a sentence exits mask mode, shows the full source text and hides translation. Saved masks apply only when re-entering mask mode. Translation stays independent and requires explicit action.
- Edited or saving vocabulary drafts block changes to masks, mask mode and the active sentence until resolved.
- Successful retranscription clears masks because it creates new sentence IDs. Failed or canceled retranscription retains existing masks and transcript records.
- Missing and legacy overlong media retain editable transcript masks; playback restrictions remain effective.
- Visual changes are confined to the current sentence area and its controls, retaining the existing dark workspace palette. There are no persistent mask buttons beside every visible group.
- The sentence area uses a compact metadata row, a text-based mask toggle, underlined meaning groups and neutral rectangular masks that cover the original rendered text width without moving the sentence. Instructional helper text is omitted. Playback controls use flat surfaces and fine active-state rules instead of rounded containers. Keyboard focus remains visible.

## Storage compatibility

The existing learning JSON gains an optional `masks` record keyed by sentence ID, with complete group indices as values. No SQLite migration or additional IPC method is required. Older learning records start without masks; saves that omit the field preserve existing masks, and an empty record explicitly clears them. The host validates sentence ownership, integer bounds and duplicate indices before saving.

## Verification

- `npm test`: 26 passed. The existing managed-media test now verifies nonconsecutive masks, SQLite close/reopen, legacy saves, explicit clearing, invalid-input preservation, missing media, failure/cancellation and retranscription reset.
- `npm run typecheck`, `npm run lint` and `npm run desktop:build` passed.
- Start `npm run dev`, then run `node .scratch/sentence-masks/verify.mjs`. It reuses the existing media fixture and cached agent-browser/Chromium tools. `AGENT_BROWSER_CLI` and `AGENT_BROWSER_EXECUTABLE_PATH` can select another installed CLI/browser.
- Browser checks cover keyboard mode toggling, immediate hide/show without confirmation, concealed accessible labels, exact source-text width and position before and after masking, nonconsecutive masks, full source visibility outside the mode, native double-click word collection on previously masked text, original word offsets, edited-draft protection, translation reset, navigation/reload restoration, missing/overlong-media restoration and 480px layout. No browser errors were reported.
- Screenshots and detailed browser results are retained in `.scratch/desktop-learning/generated-samples/sentence-mask-verification/` (moved from `build/` on 2026-10-06); the verification runner now writes there. The development-only Next badge is hidden in the fixture to avoid obstructing playback buttons.

The browser bridge and lookup results are fixtures; real persistence is covered separately with temporary SQLite databases. These checks do not establish transcription quality or installed-app visual acceptance.
