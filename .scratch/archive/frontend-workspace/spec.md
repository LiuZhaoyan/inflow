# Frontend Workspace Phase

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Status: implemented; local verification passed, with owner visual acceptance pending after rework. See [verification evidence](acceptance.md).
Updated: 2026-10-01
Product context: [PRODUCT_SPEC.md](../../../docs/PRODUCT_SPEC.md).
Delivery context: [ROADMAP.md](../../../docs/ROADMAP.md).

## Goal and boundary

Build the confirmed Windows learning workspace around the existing processing, reveal and desktop business. `LearningWorkspace` coordinates those existing operations and the workspace views; this phase does not relocate or rewrite processing, reveal, translation, generation or storage algorithms. Add no dependencies or account system.

The visual direction follows the [dark cinematic workspace reference](https://www.canva.com/design/DAHWwk4SMkc/Ss3xOd5HLxhodE6yzdEnsQ/edit): video and the current sentence in the center, Context on the right, and Library in a left-side overlay. Library is a flat list with title search, without folders or deduplication.

Story generation and reading are temporarily hidden, and their associated controls are removed from the workspace. Preserve historical artifacts, selected flags and source text. The next phase will redesign that learning cycle. Subtitle Mask remains deferred to [issue 08](../video-subtitles/spec.md); play the original video as supplied, including embedded subtitles.

## Media import and processing

- Keep the existing supported media types and 50 MB file-size limit.
- Read media metadata and probe duration before saving a new import. Reject media longer than 10 minutes before saving it; it must not become playable in the workspace.
- Retain existing records longer than 10 minutes and keep their transcripts readable, but disable media playback.
- Start processing automatically after a valid new import is saved.
- If processing fails or is canceled, keep the valid imported media. Offer manual retry and do not retry repeatedly without user action.
- Reuse saved processing results when opening already-processed media.

## Playback and learning state

- Fresh material opens in Full mode, paused, without autoplay.
- When processing finishes, preserve the learner's current position, playback mode and playing or paused state.
- Choosing Context, previous or next enters Sentence mode, seeks to that sentence's start and pauses. Returning to Full mode keeps the current media time.
- Sentence loop affects playback only in Sentence mode; retain the loop preference when switching modes.
- Restore playback mode, position, rate and loop preference when reopening material.
- Full playback follows the current sentence. On sentence transitions, clear SentenceArea reveal and translation. Never generate translation automatically.
- Translation shown in this workspace is Chinese only.

## Context, Library and vocabulary

- Keep the right-side Context rail visible with sentence timestamps and placeholders by default. Its explicit full-transcript toggle is independent of SentenceArea reveal.
- Reset the full-transcript view to hidden on material switch and when reopening material. Keep it open when moving between sentences in the same material.
- Collecting from revealed source text opens the Vocabulary view with a confirmation form for Korean dictionary form and contextual Chinese meaning, including its source sentence.
- A pending vocabulary draft must be saved or canceled before another collection or manual addition can begin. Switching workspace views keeps the draft and its input values because the workspace remains mounted.
- Switching to Vocabulary pauses playback. Opening Library does not pause playback; choosing different media does.
- Opening a media source from the vocabulary list returns to the Content view, selects the source sentence and pauses at its start. Artifact sources remain plain title and sentence-index text.

## Acceptance criteria

- [ ] Library is a left overlay with a flat material list and title search; it has no folders or deduplication flow.
- [ ] A valid new import is duration-probed, saved, then processed automatically. A file over 10 minutes is rejected before save and cannot play.
- [ ] Existing long-media records remain stored, their transcripts remain readable, and media playback is disabled.
- [ ] Failure and cancellation retain imported media; retry is manual, and reopening completed material reuses its saved results.
- [ ] Fresh material opens paused in Full mode; processing completion preserves position, mode and play/pause state.
- [ ] Context, previous and next enter the target sentence paused at its start. Returning to Full mode retains media time.
- [ ] Sentence loop is effective only in Sentence mode, and mode, position, rate and loop preference restore after reopening.
- [ ] Full playback tracks the current sentence and clears reveal and translation on sentence changes; it does not trigger translation.
- [ ] The Context rail remains visible with timestamps/placeholders by default; its full-transcript toggle is independent of SentenceArea reveal, resets on material switch/reopen, and stays open across sentence changes within the same material.
- [ ] Collection opens the Vocabulary confirmation form with source context. Existing draft text survives tab switches; another collection or manual addition stays blocked until save or cancel.
- [ ] Vocabulary pauses playback. Library opening does not pause it; changing media does.
- [ ] A media source opens Content at its sentence paused. Artifact source text is not a button or link.
- [ ] Story-generation and reading controls are absent while historical artifacts, selected flags and source text remain stored.
- [ ] Original video, including embedded subtitles, plays without a Mask.

## Verification boundary

Verify desktop operations at the pre-agreed `DesktopOperations` seam and reuse the existing listening processing and reveal tests. Exercise the import, restore, vocabulary and playback behavior through browser and desktop flows. The criteria remain the owner acceptance checklist; [local verification evidence](acceptance.md) distinguishes automated checks from remaining visual and installed-app acceptance.
