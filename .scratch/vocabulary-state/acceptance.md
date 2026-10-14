# Vocabulary ownership acceptance

Status: completed in the source checkout
Verified: 2026-10-14
Baseline: main at `96bf0e7`

## Result and boundaries

[useVocabulary](../../src/workspace/useVocabulary.ts) owns the mutable complete list, loading/error state and short vocabulary writes. Notebook retains UI selection, filters, pronunciation and drafts. Generation targets are derived. Collection commits returned entries through the same owner. Complete-list reads wait for pending short writes, follow superseding reads and retry when writes interrupt their snapshots. Refresh failures retain data and expose retry; successful writes do not require a follow-up read.

Removed Notebook's complete-list state/read effect and full-list callback, Workspace's duplicate generation-target state, and the vocabulary revision counter. Story still queries artifact collection positions independently and guards stale artifact-query replies. SQLite transactions and historical snapshots are unchanged. Long generation/transcription jobs do not block short writes or discard drafts.

## Baseline evidence

Rebuilt the unmodified baseline with `npm run desktop:build`, then ran [the new native regression](verify.cjs). Selecting two targets, closing the generation dialog and saving one target's note left two selected rows in SQLite but only one item in the rendered, closed generation preview. The expected-two assertion failed with actual one.

Evidence: `../desktop-learning/generated-samples/vocabulary-state-co1xfp/target-selection.json`, `failure.json` and `failure.png`. This reproduces rendered-state divergence, not a normal next-generation omission: reopening target selection rereads SQLite and can mask the baseline divergence.

## Verification

- `node .scratch/vocabulary-state/verify.cjs`: passed nine scenario groups through the real Electron main/renderer, shipped preload bridge and isolated SQLite, with deterministic local processor/generator fixtures and delayed IPC replies. Covers initial load failure/retry, target preservation after note save, generation completion during a draft, interrupted reads retaining both new Contexts and saved notes, superseding reads, refresh failure, failed note/deletion writes, collection/deletion highlights, retranscription and selected-word deletion. Final evidence: `../desktop-learning/generated-samples/vocabulary-state-jfQRXc/result.json`.
- `node .scratch/story-navigation-notices/verify.cjs`: passed native navigation ordering, draft protection, saved generation, notice behavior, restart and before/after-commit crash recovery. Evidence: `../desktop-learning/generated-samples/story-navigation-WeKyLd/`.
- Existing `.scratch/story-vocabulary/verify.cjs`: passed English repeated occurrence collection, sidebar counts, reload, target preservation and failed-save behavior against the rebuilt static renderer served locally on port 3010. This script uses mocked IPC/in-memory vocabulary, unlike the new SQLite regression. The temporary static server was stopped afterward.
- `npm test`: 83/83 passed.
- `npm run lint`: passed without warnings.
- `npm run typecheck`: passed.
- `npm run desktop:build`: passed host compilation and production static-renderer build.

Native Electron checks ran outside the Windows sandbox because Chromium could not start inside it. The unit suite initially encountered a sandbox temporary-file rename EPERM, and route type generation encountered an SWC workspace-path access error; both passed outside the sandbox. The English script initially lacked its local server; it passed after the static server and browser ran outside the same sandbox boundary. Injected read/write failures in acceptance logs are expected fixtures.

## Deferred and excluded

Installed-package acceptance remains deferred to release. No live model/provider calls, model-quality evaluation, new dependency, global store, write queue, multi-window conflict policy, schema migration or commit was added. Existing SQLite tests cover persistence across restart; this change adds no persistent data format. Historical media/artifact deletion features remain outside scope.
