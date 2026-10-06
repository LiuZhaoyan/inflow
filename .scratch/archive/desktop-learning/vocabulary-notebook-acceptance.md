# Desktop vocabulary notebook acceptance

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Date: 2026-10-01. Completed ticket: 04 (consolidated into this acceptance report).

## Delivered behavior

The learner selects visible Korean transcript text and reviews its dictionary form and contextual Chinese meaning before saving. These fields are learner-entered; collection does not infer a dictionary form or invent a meaning. Corrections retain the encountered form and original context. Manual additions have no invented sentence or media source.

The Electron host saves entries and occurrences through three fixed preload operations. Matching dictionary-form/meaning pairs append occurrences; different meanings remain separate entries. Repeated collection of the same occurrence does not duplicate it. Each occurrence retains its original sentence, segment identifier, encountered form and associated media. Source buttons return to listening at the recording position.

SQLite migration adds notebook tables and an active-segment flag to existing ticket-03 databases. Reprocessing replaces the player's active transcript while retaining collected source segments unchanged. Missing managed media does not remove the notebook or its contexts. Corrections and target selection are transactional; invalid selection cannot clear existing choices. Up to 20 target entries can be selected and restored after restart.

## Checks and evidence

- All 19 TypeScript tests passed. The added operation story uses real temporary SQLite/files to verify migration from the prior schema, source validation, Unicode normalization, additional occurrences, distinct senses, manual additions, corrections, invalid-write preservation, reprocessing, missing media and restart.
- Root typecheck, changed-file ESLint and the static desktop build passed. React review checked controlled native inputs, labels, keyed editor state, effect cleanup and serialized saves. No dependency was added.
- Native verification used the production static renderer, sandboxed preload and SQLite host in Electron 44.5.1 / Node 24.21.0. It cloned the previously accepted Hanbid profile; no new inference or paid API call was needed.
- Actual UI collection saved `대만을` from two different recognized sentences into one `대만` / `台湾` entry. Editing it to `타이완` / `台湾（地名）` retained both original contexts. Selecting text outside the current transcript was rejected without saving an entry.
- Manual `배` / `船` and `배` / `肚子` remained separate entries with empty source lists. Two target selections persisted. A source button returned to sentence 2 at 1.68 seconds; the source and translation were hidden on return.
- A second Electron process restored all three entries, both occurrences and both target selections with identical identifiers and contents. The existing 33-sentence media record, 1.5x speed and loop preference survived. Playback decoded video at width 1,080. Both phases had no renderer alerts or console errors.

Evidence: [collection phase](../../desktop-learning/generated-samples/desktop-acceptance-Tw5uYD/vocabulary.json), [restart phase](../../desktop-learning/generated-samples/desktop-acceptance-Tw5uYD/vocabulary-reopen.json), [restored notebook screenshot](../../desktop-learning/generated-samples/desktop-acceptance-Tw5uYD/vocabulary-reopen.png). Generated files and isolated profiles remain ignored.

Reproduce after `npm run desktop:build` using the accepted 33-sentence Hanbid profile:

```powershell
node scripts/verify-desktop.cjs --vocabulary ".scratch/desktop-learning/generated-samples/desktop-acceptance-GBTE8b/profile"
```

## Remaining boundary

This completes video-linked collection and the persistent notebook in the desktop development application. Ticket 05 owns generated text artifacts and collection from them. Ticket 06 owns packaged processing resources; ticket 07 owns installed-app acceptance. Recognition and translation retain the previously owner-accepted limitations.
