# Vocabulary Lookup Acceptance

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Verified on 2026-10-02 in the isolated `codex/vocabulary-lookup` worktree.

## Delivered behavior

Listen and Story share an in-place single-word collection popover. Contextual Kiwi lookup is read-only and uses the selected UTF-16 span in the original sentence. The learner can correct the dictionary form and enters the Chinese meaning manually. Saving retains host-validated Media or Story provenance and existing sense deduplication.

Whitespace-containing, cross-sentence and hidden-text selections are rejected. Unedited drafts may close; edited drafts require save or discard. Lookup failure permits manual entry, saving failure retains the draft, and late results cannot replace a newer selection or a corrected lemma.

Source material and vocabulary retain Korean language metadata. The vocabulary migration preserves existing IDs, row ordering, selection state and source relationships, while changing uniqueness to language plus lemma and meaning. English analysis and automatic Chinese meanings remain deferred.

## Verification

- `npm test`: 24 tests passed.
- `.venv-win/python.exe -m unittest discover -s scripts -p "test_*.py"`: 7 tests passed, including real Kiwi dictionary forms, derivational and irregular predicates, repeated spans and UTF-16 positions.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run desktop:build`: passed.
- `node .scratch/vocabulary-lookup/verify.cjs`: passed in a hidden Electron window with isolated profile and generated local audio. Real mouse dragging opens the popover only after release. Verification covers real worker/IPC lookup, focus preservation, save retry, manual fallback, draft navigation protection, stale results, repeated selections, UTF-16 offsets, cross-sentence/hidden/multiword rejection, delayed Story opening and target-dialog draft protection, Story collection, provenance, sense deduplication, retained translation, notebook refresh and popover bounds.

The native run injects lookup and save errors deliberately to verify recovery; these expected host errors and cancelled obsolete lookups are not renderer failures. Generated profiles, audio, databases and screenshots remain ignored under `.scratch/desktop-learning/generated-samples/`.

Latest native evidence: `../desktop-learning/generated-samples/vocabulary-acceptance-UCoFJR/`. The selection screenshot was visually inspected; the popover and save button fit without scrolling in the default window.

## Review baseline

Review the feature against `6ca6126544f42b18d76b809d8d6ce37163a53ca9`, the commit used to create this worktree. Requirements are recorded in [notes.md](notes.md).


## Standards

No actionable findings against the worktree creation baseline. The review checked repository conventions and the skill's code-smell baseline; no additional dependencies or speculative meaning-provider abstraction were introduced.

## Spec

One P2 finding was resolved: asynchronous Story opening and target-dialog loading initially checked drafts only before awaiting IPC. They now recheck immediately before committing navigation, with a stable callback for the source-opening effect. The native regression reproduced the failure before the fix and passed afterward for saved-story opening, Library source navigation and target-dialog loading. Edited drafts remain available; unedited drafts close normally. Focused follow-up review found no remaining issue.

Summary: Standards 0 findings; Spec 1 P2 finding resolved, 0 remaining.
