# Story vocabulary synchronization

Status: resolved
Verified: 2026-10-11

Story previously rendered only generation target annotations and never consumed vocabulary collection updates. Notebook contexts deliberately collapse each story to one card, so that response cannot supply all reading highlights.

The reader now refreshes collected vocabulary after collection and notebook updates. `DesktopOperations.listArtifactVocabulary` returns all actual collected contexts for that artifact, excluding synthetic generation contexts. `StorySentence` combines saved UTF-16 positions with original target boundaries. The sidebar shows collected entry counts separately from historical targets. No database migration or historical artifact rewrite is required. Legacy contexts without positions retain the first-match fallback.

Verification:

- `node --import tsx --test src/listening/story-vocabulary.test.ts desktop/artifacts.test.ts desktop/ipc.test.ts`: 9 tests passed, including multiple sentences/positions, restart, deletion, target preservation and bridge authorization.
- `node .scratch/story-vocabulary/verify.cjs`, with a local renderer at `http://localhost:3010` (override with `INFLOW_VERIFY_URL`): hidden Electron selection/save checks passed after reproducing zero collected highlights before the fix. Covers consecutive collections, counts, reload and failed saving. The bridge uses fixture responses; real SQLite persistence is covered separately above.
- Targeted ESLint, TypeScript checking and `npm run desktop:build` passed.

Full-suite tests and installed-package acceptance were not run. The pre-existing artifact request-ordering risk remains deferred and unchanged.
