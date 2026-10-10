# Vocabulary completion

Date: 2026-10-10
Status: Complete; Q1–Q9 implemented and source-checkout acceptance passed.

## Confirmed behavior

- Correct occurrence highlighting, failed loading/retry, committed-save feedback, save visibility, refresh selection and mixed-language target continuation.
- Preserve actual collected positions, including multiple same-sense occurrences in one source context. Legacy contexts without offsets retain their readable fallback.
- Use an installed local voice in the entry's language to pronounce its dictionary form. Support asynchronous voice loading, missing voices, failure/retry and cancellation on repeated click, entry change, editing and leaving Vocab. Settings method selection is future work.
- Remove Add context and the duplicate Source card. Keep validated source collection in Content and source navigation in Contexts.
- Keep Notes as a secondary, collapsed row. Expand into a small plain-text editor with explicit Save/Cancel; notes belong to a single entry/sense. Retain failed-save drafts and protect unsaved notes during selection/filter/navigation changes.
- Confirm before deleting a single entry, displaying its dictionary form and meaning. Atomically remove its note, source contexts/positions and target selection. Preserve original media, saved stories and historical target snapshots. No undo is provided.
- Remove Story's disabled word-action menu. Clicking a target word in the top dropdown or sidebar opens Vocab and selects that exact entry, clearing view filters if necessary. If the entry was deleted, keep the Story readable and report the missing notebook entry; do not recreate it silently.

## Compatibility and scope

Notes default to empty for existing data and survive ordinary edits, recollection, retranscription and restart. A caller omitting notes must not erase saved notes. No automatic merging of distinct senses or mastery inference is introduced. Existing Story snapshots are not rewritten by note/edit/delete operations.

All saved generation targets remain selected through view filtering. Mixed-language selections remain checked but cannot continue into generation. Successful saves reveal the saved entry; failed writes retain drafts. A refresh error cannot turn a committed write into a reported save failure.

No provider, voice selector, cloud TTS, pronunciation cache, rich-text notes, bulk deletion, context deletion, export or pagination is added. The known Story request-ordering risk remains outside this change.

## Verification

1. Host tests: legacy migration, note validation/preservation/restart, real occurrence positions, transactional deletion and rollback, retained media/artifacts/snapshots, invalid IDs and IPC registration/guards.
2. Native UI: search/filter saves, load failure/retry, note size/draft/failure handling, deletion cancel/failure/success, repeated-token highlighting, Story-to-Vocab targeting and deleted-target feedback, mixed-language continuation, voice readiness/error/cancellation.
3. Repository checks: tests, lint, typecheck and desktop renderer/host build. Native evidence uses an isolated profile and deterministic processing/generation; no live provider quality or installed-package acceptance is claimed.

Observed outcomes and remaining limitations are recorded in [acceptance.md](acceptance.md).
