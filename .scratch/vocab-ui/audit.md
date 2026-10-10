# Vocabulary UI audit

Date: 2026-10-10
Status: Baseline audit complete; Q1–Q9 approved and implemented. See [acceptance](acceptance.md) for final verification.

## Scope and evidence boundary

Reviewed the active Vocabulary notebook, its editor and styles, shared collection popover, Story target selection and generation, source navigation, preload/IPC contract, SQLite operations, relevant tests, product scope, and historical acceptance records.

The inventory and findings below describe the pre-implementation baseline; line references belong to that baseline. The initial audit did not rerun native UI acceptance or live provider requests. Later pronunciation feasibility and owner decisions are recorded separately below; completed behavior and fresh verification belong in [acceptance](acceptance.md).

## Control inventory

| Surface | Current behavior | Evidence |
| --- | --- | --- |
| Entry count | Counts saved entries, including separate meanings of the same word; label says words. | `src/listening/VocabularyNotebook.tsx:154` |
| Add manually | Opens an editor, confirms Korean/English, saves through the host, and reloads entries. | `src/listening/VocabularyNotebook.tsx:134` |
| Edit | Changes dictionary form and Chinese meaning; source language stays fixed. Host rejects identity collisions and retains contexts and target selection. | `src/listening/VocabularyNotebook.tsx:131`; `desktop/operations.ts:318` |
| Save / Cancel | Save disables the editor while pending; errors retain its draft. Cancel discards the draft. | `src/listening/VocabularyNotebook.tsx:12` |
| Search | Case-insensitive substring search across dictionary form, meaning, encountered form, source sentence and source name. | `src/listening/VocabularyNotebook.tsx:109` |
| Source filters | All, Media, Stories and No source work. Media and Stories can overlap. No source includes manual entries and entries whose sources were removed by retranscription. | `src/listening/VocabularyNotebook.tsx:43` |
| Language filter | Independent All/Korean/English filtering; selection closes the menu and returns focus; Escape closes the menu. | `src/listening/VocabularyNotebook.tsx:174` |
| Filter counts | Global saved-entry counts, independent of search and the other filter. | `src/listening/VocabularyNotebook.tsx:118` |
| Row / details | Selecting a row opens its saved meaning and contexts. If selected ID is not visible, the first visible entry is displayed. | `src/listening/VocabularyNotebook.tsx:117` |
| Contexts | Shows stored media and Story occurrences, encountered text and source location. | `src/listening/VocabularyNotebook.tsx:234` |
| Context Open | Media opens paused at the saved sentence; Story opens at the saved sentence index. | `src/workspace/LearningWorkspace.tsx:292`; `src/workspace/useLearningArtifacts.ts:36` |
| Source card | Repeats the first context's source and Open action; no distinct primary-source field exists. | `src/listening/VocabularyNotebook.tsx:246` |
| Thumbnails | Lazy native video previews for supported filename extensions, with generic media/Story icons and error fallback. | `src/workspace/SourceThumbnail.tsx:10` |
| Generate story | Opens a real target selection dialog using all saved entries, then generation. Notebook filters do not define selected targets. | `src/workspace/LearningWorkspace.tsx:315` |
| Target checkboxes | Restore saved selection; cap additions at 20; Continue persists selection. Mixed languages are warned about but can continue to the next dialog. | `src/workspace/StoryTargetsDialog.tsx:11` |
| Generation | Checks credentials and a single source language before provider access; persists passages and target snapshots. | `src/listening/ArtifactLibrary.tsx:198`; `desktop/operations.ts:402` |
| Pronunciation | Hard-disabled button, no handler or supporting pronunciation service. | `src/listening/VocabularyNotebook.tsx:219` |
| Add context | Hard-disabled button. Real source contexts already accumulate through recollection in Content; no free-form notebook context model exists. | `src/listening/VocabularyNotebook.tsx:233` |
| Notes | Hard-disabled textarea; no value, editing state, schema field or save API. | `src/listening/VocabularyNotebook.tsx:258`; `src/listening/desktop.ts:25` |
| Story word actions | Dictionary, Pronunciation, Add context and Notes are also disabled in Story's target-word menu. This is an associated surface, not another implemented flow. | `src/listening/ArtifactLibrary.tsx:157` |

Delete-entry, delete-context, export/import, mastery/review, sorting and pagination controls do not exist. They are absent capabilities rather than unfinished visible controls; this audit does not authorize adding them.

## Code-confirmed problems

### 1. Wrong occurrence is highlighted

`HighlightedSentence` uses `sentence.indexOf(surface)` (`src/listening/VocabularyNotebook.tsx:61`). In `배가 배에 있어요.`, a collection of the second `배` with meaning `船` highlights the first `배` instead. `desktop/vocabulary-gloss.test.ts:17` already establishes distinct meanings at offsets 0 and 3.

The host writes positions into `vocabulary_positions` (`desktop/operations.ts:356`) but does not return them from `vocabulary()` (`desktop/operations.ts:296`). Fixing only the renderer cannot recover the selected occurrence. A context can contain multiple stored positions because its identity deduplicates entry/source/surface; the display contract needs an explicit policy for those occurrences and for legacy sources without offsets. Saved positions are still available; this is a display problem, not evidence of lost position data.

Acceptance after a fix: both media and Story show the collected occurrence(s), including repeated words; legacy contexts remain readable without fabricated precision.

### 2. Failed loading never finishes and offers no retry

The initial list rejection only sets error (`src/listening/VocabularyNotebook.tsx:100`). It leaves `loaded=false`, so empty list and detail panels continue announcing Loading. There is no Retry action. Later successful refreshes do not clear the previous load error.

Acceptance after a fix: terminal failure ends Loading, exposes retry, preserves any existing entries, and clears the relevant error after successful recovery.

### 3. Successful write can be reported as a failed save

`saveVocabulary` commits before a separate `listVocabulary` refresh (`src/listening/VocabularyNotebook.tsx:140`). If that refresh rejects, the editor catches the whole operation and reports failure while the database already contains the edit/addition. The draft remains open, encouraging an unnecessary retry.

Acceptance after a fix: a committed write is reflected using its returned entry; refresh failure is identified separately and can be retried without repeating the write. An actual failed write retains the draft.

### 4. A saved entry can be hidden immediately

Save chooses the saved ID without changing query, language or source filters (`src/listening/VocabularyNotebook.tsx:142`); detail selection then falls back to the first visible entry (`:117`). Examples: Media filter -> Add manually -> Save; Korean filter -> add an English word; edit a word so it no longer matches search. The write succeeds but another entry or an empty state appears.

The behavior is confirmed by the filtering code; the desired interaction is a product decision. Options are to reveal the saved entry with the necessary filter changes, or preserve filters with explicit saved/hidden feedback and a reveal action. Ordinary filtering must continue preserving stored target selection.

### 5. Refresh always changes the selected word

Every accepted list refresh sets selected ID to `result[0]` (`src/listening/VocabularyNotebook.tsx:98`), even when the previously viewed entry still exists. Collection and retranscription increment the notebook revision (`src/workspace/LearningWorkspace.tsx:365`, `:499`).

Acceptance after a fix: background refresh preserves the current surviving selection; first load and removed/hidden selection retain a defined fallback.

### 6. Mixed-language selection advances into a blocked generation step

`StoryTargetsDialog` warns about mixed languages but only disables Continue for an empty selection (`src/workspace/StoryTargetsDialog.tsx:33`). `confirmStoryTargets` persists those targets and opens the next dialog (`src/workspace/LearningWorkspace.tsx:326`), where generation is disabled. The host also rejects mixed generation before provider access. This is an avoidable workflow detour, not an incorrect cloud request.

Acceptance after a fix: preserve all checked targets while explaining and blocking the invalid transition at the target-selection step.

## Design choices and bounded risks

- **Pronunciation:** dictionary-form speech and replaying a source sentence are different features. Word timing is not persisted, and a selected dictionary form may differ from the spoken surface. Do not label sentence replay as isolated word pronunciation. Native Korean/English voice availability has not been checked.
- **Add context:** current contexts are validated provenance from saved media/Story sentences. A typed example would require separate semantics; it must not pretend to be source evidence. Recollecting the same language/form/meaning already attaches a new real source.
- **Notes:** product scope does not currently require notes; the roadmap lists them as a possible improvement. Retaining them needs a clear learner use, local persistence and draft/failure behavior. Rich text, AI notes and a tagging system are not implied.
- **Source duplication:** Contexts and Source repeat the same action. The first context is not necessarily the newest or the source matching a Stories filter; reads concatenate media contexts before Story contexts. Removing the duplicate section or defining a meaningful primary-source interaction is a decision.
- **Counts and empty states:** global counts are internally consistent, but do not describe the filtered result count. Empty database and zero search matches share one message. Keep these distinct from data or loading defects.
- **Editing/navigation:** notebook and Content subtrees remain mounted, so tab switches retain notebook drafts. Notebook editing disables related processing/collection/actions. Collection-popover draft guards are a separate mechanism; do not assume the notebook has identical dirty-draft handling.
- **Keyboard follow-up:** labels, language metadata, pressed states, fieldsets and focus styles exist. Repeated source buttons have generic Open names; removing an editor does not explicitly restore focus. Actual focus and narrow-window interaction need native verification.
- **Known Story ordering risk:** controlled delayed replies can cause displayed Story and host restoration state to diverge. This is already documented in [artifact-state evidence](../archive/artifact-state/architecture-and-verification.md), remains unfixed, and was not reclassified as an ordinary-runtime confirmed failure in this audit.
- **Scale:** list/search rendering and database context reads are eager. No representative large-notebook benchmark was performed; pagination or caching is not justified by this audit alone.

## Persistence constraints to preserve

- Entries are unique by source language, dictionary form and contextual meaning. Recollection adds validated contexts; different meanings/languages remain distinct. Editing into an existing identity reports a conflict rather than silently merging.
- Source language cannot be changed on an existing entry. Host validation rebuilds source metadata from saved material, rejects invalid source IDs/offsets, and validates complete English selections.
- Successful retranscription atomically removes that material's old contexts while preserving entries, meanings, selected targets and other sources. Failure/cancellation preserves the old transcript and contexts. No source is therefore not synonymous with manually added.
- Generated stories keep historical target snapshots even after notebook correction. Any future deletion must define its relationship to snapshots, source rows and selected targets before implementation.
- Filtering is a view operation and must not silently remove saved generation targets. No automatic mastery inference is in scope.

## Initial audit verification

The worktree had no local `node_modules` or built renderer. An initial test attempt could not load `tsx`; importing the existing loader enabled host tests, but IPC then could not resolve `typescript`. No dependency download or installation was performed. The existing source checkout at `D:/DeskBox/project/inflow` had an identical SHA-256 package lock. A local dependency junction attempt was denied and did not create a junction. Final verification used its installed dependencies through an explicit loader and process-local `NODE_PATH`:

```powershell
$env:NODE_PATH = 'D:\DeskBox\project\inflow\node_modules'
node --import file:///D:/DeskBox/project/inflow/node_modules/tsx/dist/loader.mjs --test desktop/vocabulary.test.ts desktop/vocabulary-lookup.test.ts desktop/vocabulary-gloss.test.ts desktop/artifacts.test.ts desktop/english-learning.test.ts desktop/ipc.test.ts
```

Result: **16 tests passed, 0 failed**. Coverage includes identity/merging, validation, lookup and occurrence-specific meaning reuse, migrations, selection, transactional retranscription, restart, provenance, generation snapshots, two collection/generation cycles, and IPC access checks. These passing tests do not cover the notebook's rendering and failure paths identified above.

Existing native English acceptance scripts exercise filters, manual addition, source collection and generation. The retained older `frontend-workspace/fixture.js` uses superseded vocabulary shapes and must not be used as current acceptance evidence. At this initial audit stage, no new native UI run, lint, typecheck, renderer build, installed-app check or live cloud operation had been performed. Subsequent implementation checks are recorded in [acceptance](acceptance.md).

## Pronunciation feasibility follow-up

The owner asked whether dictionary-form pronunciation would require substantial code. A native probe against the existing Electron 44.5.1 / Chromium 152.0.7977.130 runtime used the same secure `inflow://app/` origin, sandboxed/context-isolated renderer, denied permission requests, a hidden window and an isolated profile. It made no network requests and did not open learning storage.

After waiting for asynchronous voice population, `speechSynthesis.getVoices()` returned local English Mark/Zira/David and Korean Heami voices. Muted synthesis of `learn` and `배우다` received both start and successful end events. The initial probe incorrectly treated an early empty `voiceschanged` event as final; the corrected probe ignores empty notifications until its deadline. This demonstrates why implementation must handle voice readiness rather than inspect the list only once.

Reproduction:

```powershell
node .scratch/vocab-ui/voice-probe.cjs 'D:\DeskBox\project\inflow\node_modules\electron\dist\electron.exe'
```

Probe: [voice-probe.cjs](voice-probe.cjs). Local evidence: `../desktop-learning/generated-samples/vocab-voice-z8HV02/result.json` (ignored, machine-local). A separate Windows .NET/SAPI probe could synthesize English but did not expose an enabled Korean voice; that alternate path is unnecessary given the successful renderer-native probe.

Confirmed design: click the dictionary-form speaker button to use a matching local English/Korean system voice. Handle asynchronous voice readiness, missing voices, speech errors, repeated clicks, entry changes and leaving Vocab. Do not fall back to a wrong-language voice. No database migration, audio cache, provider credentials, new dependency or host IPC is needed for pronunciation. At feasibility review, estimated implementation size was tens to about one hundred production lines plus focused verification. The delivered implementation is now recorded in [acceptance](acceptance.md).

The owner also requested a future Settings option allowing learners to choose how pronunciation is produced. Record that direction without implementing a method selector, alternative provider or speculative speech interface in this iteration. Alternative methods and delivery timing remain undefined.

This was a synthesis/event feasibility check, not audible pronunciation-quality acceptance or a clean-machine packaging check. System voices provide synthesized reference speech; English homographs and names may require contextual pronunciation that a bare dictionary form cannot express. Installed voices and quality vary across machines. API references: [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis), [localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), and [voiceschanged](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event).

## Decision tree

Confirmed by the owner on 2026-10-10:

- Q1: correct the six existing behavior issues; reveal the saved entry with only necessary filter changes and preserve selected targets.
- Q2: keep dictionary-form pronunciation and implement it with local system voices now. A pronunciation-method option in Settings is a future direction, outside this iteration.
- Q3: remove the notebook Add context placeholder; retain collection of validated real-source contexts in Content.
- Q4: keep Notes as an optional secondary feature and reduce its share of the detail panel. Do not remove it.
- Q5: remove the separate Source card; keep source provenance and Open actions in Contexts.
- Q6: add deletion of a single vocabulary entry.

- Q7: collapsed Notes row, small plain-text editor, entry/sense ownership, explicit Save/Cancel, failed-write draft retention and protected navigation.
- Q8: confirm the exact entry; atomically delete entry, note, contexts/positions and target selection; retain original media, artifacts and target snapshots. No undo.
- Q9: remove the disabled Story word-action menu. Clicking target words in both the dropdown and sidebar opens Vocab and selects the exact entry. Missing deleted entries report feedback without automatic recreation.

All decisions are implemented; [the approved spec](spec.md), resolved tickets and [acceptance](acceptance.md) record the resulting behavior and evidence.
