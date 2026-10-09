# Shared Learning artifact state

Approved: 2026-10-08
Status: implemented

## Scope

LearningWorkspace owns the Learning artifact state through useLearningArtifacts. That module performs restoration, source navigation, history opening and generation, and exposes shared snapshots and commands. ArtifactLibrary reads the snapshots and invokes commands; LibraryDrawer and vocabulary collection consume the same artifact selection.

Remove the reader's duplicate state and paired synchronization calls. Keep reader-local sentence selection, translation visibility, history filtering, scrolling and generation controls. Preserve the existing draft checks, request completion behavior, DesktopBridge contract and SQLite storage.

## Acceptance

- Restoration, history selection, Library navigation and successful generation show the same Learning artifact in the reader, Library selection and collected vocabulary provenance.
- Edited word drafts still prevent delayed navigation; unedited drafts close normally.
- Failed generation preserves the current Learning artifact and list; retry updates both.
- Reload restores the saved Learning artifact through the existing host operation.
- Verification uses an isolated profile and deterministic processor/generation adapters without cloud access.

## Deferred work

Request-ordering changes are outside the approved shared-state refactor.

## Flow ownership — 2026-10-09

[Artifact #02](issues/02-evaluate-story-flow-deepening.md) completes the follow-up flow deepening approved on 2026-10-09. The workspace-level owner holds the artifact list, accepted selection, load/error/busy state and generation job. The reader no longer calls Story DesktopBridge operations or synchronizes shared state through paired setters. Sentence selection, translation visibility, filtering, topic and scrolling remain reader-local; accepted source metadata identifies the sentence to show.

The desktop build, type checking, focused ESLint and host artifact-cycle test passed. Extended [native acceptance](../desktop-learning/generated-samples/library-native-nSjlAh/result.json) covers restoration, both opening paths, vocabulary-source navigation, reader resets/filter preservation, draft protection, generation failure/retry, provenance and reload. The [ordering check](../desktop-learning/generated-samples/ordering-native-eAiwO3/result.json) passed all eight scenarios and fresh-process restarts, retaining the previously recorded delay-related divergences. No request-ordering, IPC or SQLite behavior was changed.

## Verification — 2026-10-08

- `npm run desktop:build`: passed, including desktop compilation and static renderer build.
- `npm run typecheck`: passed. The first sandboxed attempt failed on Windows path canonicalization; the unrestricted retry passed.
- Focused ESLint for ArtifactLibrary, LearningWorkspace and the extended native verification script: passed.
- `node --import tsx --test desktop/artifacts.test.ts`: passed; two artifact cycles retain snapshots, provenance, failure/cancellation behavior and restart restoration.
- `node .scratch/frontend-workspace/verify-library.cjs --artifacts`: passed in a hidden Electron window with an isolated profile. It verifies shared restoration, history/Library navigation, edited-draft checks before and after a delayed open reply, generation failure/retry, Korean and generated English vocabulary provenance, and renderer reload through the real host restoration operation.

Native [result evidence](../desktop-learning/generated-samples/library-native-I3eRcN/result.json) records the artifact ID, lookup inputs and empty renderer-error list. The generation failure printed by Electron is intentionally injected to exercise retry. Electron required an unrestricted run because it could not start in the sandbox. Processing and generation use deterministic adapters; cloud access and developer credential initialization are disabled for this check. Renderer reload is verified here; full process restart remains covered by the existing host test rather than a fresh native restart run.

The React review confirmed a single owner for shared artifact data, stable parent setters in effect dependencies, unchanged reader-local state, and preserved post-await draft checks. The existing request-completion behavior remains outside this change.
