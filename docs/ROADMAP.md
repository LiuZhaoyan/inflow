# Inflow Implementation Roadmap

Status: a staged roadmap based on confirmed product boundaries. The current local processing pipeline and intensive-listening page are implemented; real-media backend acceptance is complete, while full browser acceptance and later stages remain incomplete.
Last updated: 2026-09-16
Product source: [PRODUCT_SPEC.md](PRODUCT_SPEC.md).

Stages are ordered by dependency and do not assign unconfirmed versions, dates or estimates. This is not a detailed code task list; undecided approaches must not be treated as completed decisions.

## Stage 1: Validate automatic processing for media without subtitles

Goal: prove that user-provided audio or video can produce source text, playable segments and sentence-level meaning groups that support intensive listening.

Scope:

- Validate automatic transcription, timing boundaries and meaning-group segmentation with representative Korean audio and video.
- Check that segments play completely, source text corresponds to the audio and meaning-group reveals are suitable for learning.
- Measure processing wait time, runtime conditions and cost, and determine where processing should run for the browser product.
- Decide whether media must be uploaded, how processing results are reused and how retries work.
- Initially validate a Next.js Node API calling a local Python worker with faster-whisper base CPU int8 transcription, Whisper word-timestamp sentence boundaries, kiwipiepy 0.23.2 particle and part-of-speech boundaries for meaning groups, and offline Argos ko→en→zh translation through CTranslate2. The first run downloads weights; media is not sent to third parties.

Deliverable: demonstrable processing results, an empirical record and a processing approach chosen from that evidence.

Acceptance: media without accompanying subtitles produces playable and revealable results, with errors and limitations recorded. Pre-arranged course text cannot substitute for this validation.

## Stage 2: Complete the browser intensive-listening flow

Dependency: the Stage 1 processing approach is accepted.

Scope:

- Integrate media selection, automatic processing, status display and retry into the existing Next.js project.
- Implement audio/video playback, speed control, segment navigation, current-segment looping and A–B looping.
- Implement small, more and full reveals plus hiding based on sentence-level meaning groups.
- Determine reveal quantity and order from real meaning-group examples, then implement the rule.
- Organize the practice page around the two mobile prototypes, with the bottom area carrying translation.
- Integrate current-sentence automatic translation with generated, missing and failed states.
- Support lightweight editing of the current segment's text and boundaries.
- The current learning flow has removed the old keyboard answer checking, automatic mastery judgment and fixed review-interval constraints.

Deliverable: a browser version that takes subtitle-free media into segmented intensive listening.

Acceptance: users can navigate, loop and reveal source text without entering an answer; hints increase by complete meaning groups; changing segments hides source text and translation by default; the original media remains playable after automatic processing fails.

The translation entry, display area, generated and failed states, and current-sentence translation belong to this stage. The exact service or local implementation depends on the real-media evidence from Stage 1.

## Stage 3: Learning continuity and mobile PWA experience

Dependency: the Stage 2 core flow is usable.

Scope:

- Save and restore learning position, revisit marks, notes and playback preferences.
- Save and reuse media-processing results, including the association needed for restoration.
- Polish touch layouts for phones and tablets and usability in desktop browsers.
- Provide a PWA installation experience and application icon.
- Validate storage failures, reopening media and processing retries in real usage paths.
- Update the README and usage instructions to match the delivered behavior.

Deliverable: a mobile-first browser product that can be reused and resume practice.

Acceptance: learning records can be reopened and restored, existing processing results are reused, primary playback actions are easy to reach, storage or media-association failures are clearly reported, and the documentation matches observed behavior.

Large media offline caching, background playback and a native installer are not completion conditions for this stage.

## Stage 4: Local Desktop service

Dependency: the browser core flow is established and the processing input/output boundary is clear.

Scope:

- Provide a local media-processing service on the user's computer.
- Let the local service handle media reading, transcription and segmentation for the browser learning interface.
- Reuse the validated learning interaction and processing-result structure.

Deliverable: a local Desktop service that works with the browser interface for the learning flow.

Acceptance: media on the user's computer can be processed through the local service and enter the same intensive-listening flow.

Supported operating systems, models, installation method and a standalone desktop client remain undecided and are not delivery commitments.

## Verification approach

- Automated checks cover validation of real subtitle or processing-result inputs, segment ranges, reveal relationships and progress restoration.
- Browser testing covers audio and video playback, sentence navigation, looping, reveals, the translation area and failure recovery.
- Continue using the repository's tests, lint, type checking and build commands, adjusting coverage to the actual implementation.
- Use the complete learning path with media without subtitles as the primary acceptance path rather than validating only preloaded examples.

## Decisions not yet scheduled for implementation

The following remain undecided and are not new feature commitments: the final model or deployment approach for automatic processing and translation, the storage mechanism for media and processing results, and packaging or distribution of the local Desktop service. The current reveal rule is confirmed in [the current task](INTENSIVE_LISTENING_TASK.md); the default local path still requires complete real-media validation.

When the implementation plan is refined next, refine only the current stage and its necessary decisions. Do not add accounts, a content platform, a professional editor or multi-client applications in advance.
