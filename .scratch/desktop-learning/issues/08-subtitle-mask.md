# 08: Add on-demand manual video subtitle masking

Status: complete
Requested: 2026-10-01
Updated: 2026-10-05
Schedule: current manual-mask iteration.

## What to build

Provide an on-demand, manually adjustable visual covering so the learner can hide video subtitles during listening. Automatic region detection was considered and then deferred by the owner on 2026-10-05.

## Context and boundaries

- The owner confirmed that the current frontend phase plays the original video as supplied, including embedded subtitles. Mask is deferred and does not block that phase.
- Mask belongs to the video presentation layer. Preserve the original media, processing results, vocabulary and learning artifacts.
- SentenceArea Reveal only controls application-rendered source text; it cannot hide subtitles embedded in the media picture.
- Automatic region detection is deferred from the first version. New imports display no covering; masking is activated by explicit learner action. Recognizing subtitle text from picture pixels, subtitle removal, cropping and video re-encoding are separate capabilities and are outside this mask.
- Embedded subtitle-track reuse is a separate requested preparation capability. Its feasibility and shared design questions are recorded in [Video Subtitle Support](../../video-subtitles/spec.md) and [the research](../../video-subtitles/research.md).

## Confirmed behavior

The owner agreed the following first-version contract through Q1-Q5, Q4a and the Q5a revision:

- Cover fixed bottom subtitles, including one-line and bilingual layouts, with one opaque black rectangle.
- New imports show the original picture without a covering. On explicit subtitle-mask activation, enter adjustment with an initial rectangle that the learner can move and resize.
- Provide the mask switch and adjustment entry beside the video; handles appear only while adjusting. Meaning-group mask mode remains independent.
- Entering adjustment pauses once without seeking. The learner can manually resume playback and adjust the region live. Dragging does not implicitly toggle or repeatedly pause playback. Leaving adjustment preserves the current playing/paused state.
- Follow the actual video picture, including letterboxing, during window resizing/maximization. Do not add a player fullscreen flow in this version.
- Save the region and enabled/disabled state per material and restore them across reopening/restart.
- Defer automatic subtitle-region detection from the first version; no detector preparation is required for manual masking.

The owner accepted the final manual-only scope on 2026-10-05. This supersedes the earlier automatic-detection and import-time covering proposals. [The design interview](../../video-subtitles/spec.md) confirms the text-track source/fallback scope Q6, complete-sentence playback Q7 and explicit atomic replacement Q8; the owner subsequently removed subtitle extraction from this iteration. The manual-mask contract is implemented; the former combined-effort Q9 proposal is superseded. [Automated acceptance](../../video-subtitles/acceptance.md) passed; owner visual acceptance and installed-package checks remain separate.

## Acceptance criteria

- [x] Confirm manual-only scope, opt-in activation, region controls, persistence and adjustment/playback rules before implementation.
- [x] New imports show no automatic covering, including videos without subtitles; explicit activation and saved-state restoration follow the agreed rules.
- [x] The learner can enable and disable the Mask without changing playback position or mode.
- [x] The Mask covers the chosen region while the original media, transcript, vocabulary and generated artifacts remain unchanged.
- [x] Verify normal/maximized viewport sizes and letterboxing with decoded video, and provide keyboard-accessible controls; no new player fullscreen flow is included.
- [ ] Owner visual acceptance in the native normal/maximized window and installed-package acceptance remain separate.

## Comments

2026-10-01: The owner accepted original-video playback for the current phase and explicitly requested Mask in the follow-up plan. No Mask implementation or verification has been performed.

2026-10-04: The owner requested automatic subtitle-region identification and masking, plus an investigation of embedded subtitle-track reuse. This supersedes the former exclusion of subtitle detection. The design interview and research are linked above; no implementation or feature acceptance has been performed.

2026-10-04: Q1-Q3 were accepted in full. Work is isolated in `codex/video-subtitles`; the confirmed first-round behavior and open second-round decisions are recorded above.

2026-10-05: Q4 and Q5 were accepted. The owner raised a supplemental adjustment/playback choice; it remains open as Q4a. All changes continue in the separate subtitle worktree.

2026-10-05: Q4a was accepted. The owner questioned whether automatic subtitle detection is needed when manual masking exists. Q5a records a proposed default-region first version; keep the existing detection requirements until the owner accepts that scope change.

2026-10-05: The owner rejected immediately displaying a default covering after import. Explicit activation is required for new material; saved activation is restored on reopening. The manual-only first-version proposal remains a separate, unanswered detection-scope decision.

2026-10-05: The owner accepted the on-demand manual-only first version. Automatic region detection is deferred. The current body now describes the final masking contract; previous comments retain the design history. Implementation and overall subtitle-effort sign-off remain pending.

2026-10-05: Q7 and Q8 were accepted in the linked video-subtitle design interview. All numbered behavior decisions are settled, while subtitle alignment investigation and combined-effort sign-off remain pending. No feature implementation or acceptance has been performed.

2026-10-05: The linked design now includes existing-runtime extraction/alignment smoke tests and a concrete implementation plan. Q9 asks for final shared-understanding confirmation, including explained whole-material ASR fallback for unusable subtitle text. Manual masking has no extraction/alignment dependency; implementation still has not started.

2026-10-05: The owner removed subtitle extraction from this iteration. Proceed with the confirmed manual-mask contract; no extraction, alignment or source-selection implementation is included. Acceptance checks will be recorded after implementation.

2026-10-05: Manual masking is implemented and automated acceptance passed. See the linked report for 39 passing unit tests, type/lint checks, browser pointer/keyboard/playback/persistence cases, desktop production build and the explicit verification limits. No subtitle extraction, detector or OCR capability was implemented.
