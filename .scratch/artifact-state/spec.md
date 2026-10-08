# Shared Learning artifact state

Approved: 2026-10-08
Status: implemented

## Scope

LearningWorkspace owns the Learning artifact list and active Learning artifact. ArtifactLibrary reads these values directly and updates the same owner during restoration, source navigation, history selection and generation. LibraryDrawer and vocabulary collection consume this shared state.

Remove the reader's duplicate state and paired synchronization calls. Keep reader-local sentence selection, translation visibility, history filtering, scrolling and generation controls. Preserve the existing draft checks, request completion behavior, DesktopBridge contract and SQLite storage.

## Acceptance

- Restoration, history selection, Library navigation and successful generation show the same Learning artifact in the reader, Library selection and collected vocabulary provenance.
- Edited word drafts still prevent delayed navigation; unedited drafts close normally.
- Failed generation preserves the current Learning artifact and list; retry updates both.
- Reload restores the saved Learning artifact through the existing host operation.
- Verification uses an isolated profile and deterministic processor/generation adapters without cloud access.

## Deferred work

[Reproduce overlapping Story requests](issues/01-reproduce-story-request-ordering.md) before deciding whether request ordering needs a separate fix. No request-ordering fix belongs to this refactor.

## Verification — 2026-10-08

- `npm run desktop:build`: passed, including desktop compilation and static renderer build.
- `npm run typecheck`: passed. The first sandboxed attempt failed on Windows path canonicalization; the unrestricted retry passed.
- Focused ESLint for ArtifactLibrary, LearningWorkspace and the extended native verification script: passed.
- `node --import tsx --test desktop/artifacts.test.ts`: passed; two artifact cycles retain snapshots, provenance, failure/cancellation behavior and restart restoration.
- `node .scratch/frontend-workspace/verify-library.cjs --artifacts`: passed in a hidden Electron window with an isolated profile. It verifies shared restoration, history/Library navigation, edited-draft checks before and after a delayed open reply, generation failure/retry, Korean and generated English vocabulary provenance, and renderer reload through the real host restoration operation.

Native [result evidence](../desktop-learning/generated-samples/library-native-I3eRcN/result.json) records the artifact ID, lookup inputs and empty renderer-error list. The generation failure printed by Electron is intentionally injected to exercise retry. Electron required an unrestricted run because it could not start in the sandbox. Processing and generation use deterministic adapters; cloud access and developer credential initialization are disabled for this check. Renderer reload is verified here; full process restart remains covered by the existing host test rather than a fresh native restart run.

The React review confirmed a single owner for shared artifact data, stable parent setters in effect dependencies, unchanged reader-local state, and preserved post-await draft checks. The existing request-completion behavior remains outside this change.
