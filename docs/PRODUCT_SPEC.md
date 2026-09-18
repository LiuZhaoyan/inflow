# Inflow Product Specification

Status: confirmed planning; this document does not mean that every item is implemented.
Last updated: 2026-09-16

## 1. Product positioning

Inflow is an open-source foreign-language audio and video intensive-listening assistant. Users provide audio or video they want to study. The system performs basic processing and helps them play segments at their own pace, request hints, understand the content and listen again.

Most media does not include accompanying subtitles. The system provides automatic transcription and basic segmentation, so users do not need to create subtitles or a course first. The current experience is being validated around Korean learning.

Dictation can be done on paper, in a notes application or elsewhere. Users verify their own understanding; Inflow does not require them to enter or submit a dictation answer.

## 2. Platform and evolution

- The current delivery target is a mobile-first browser version using the existing Next.js, React and TypeScript project, with a PWA experience planned later.
- Desktop browsers can use the same learning interface.
- A local Desktop service may be built later to handle media processing while reusing the browser learning interface.
- The current implementation calls a local Python worker through a Next.js Node API. It uses faster-whisper base with CPU int8, sentence boundaries based on Whisper word timestamps, kiwipiepy 0.23.2 particle and part-of-speech boundaries for meaning groups, and offline Argos ko→en→zh translation through CTranslate2. This path has passed basic local backend acceptance with real audio and video, but still has ASR recognition errors; complete browser-flow validation, quality boundaries and the final processing approach remain unconfirmed.
- A local Desktop service does not imply a commitment to publish a standalone desktop installer.

## 3. Core flow

Choose audio or video → automatically transcribe and segment it → practice one segment at a time → reveal meaning groups or the full sentence as needed → view a translation as needed → mark, record and revisit content.

Full-length playback is available for first listening and review. Playback, hints and segment navigation do not depend on submitting an answer or completing a self-assessment.

## 4. Media input and basic processing

### 4.1 Input

- Users choose audio or video from their device.
- Subtitle import is a secondary entry point, not the primary path and not a prerequisite for starting.
- The project may keep a small number of examples with clear provenance and usage conditions; it will not operate a continuously expanding official course library.

### 4.2 Processing results

- Generate source text and playable segments with timestamps.
- Divide each sentence into meaning groups for progressive reveal.
- Mark automatically generated content as potentially incorrect; it is not a guaranteed answer key.
- Show processing status and support retry. The original media remains playable after processing fails.
- Save processing results and reuse them when the same media is associated again, avoiding duplicate processing.
- Provide lightweight editing for the current segment's text and boundaries rather than building a professional subtitle editor.

This task initially validates the local processing path above. The audio-segmentation algorithm, meaning-group method, wait time and final cost still require testing with real unscripted audio and video.

## 5. Intensive listening and playback

- Play and pause audio or video, seek, change speed and play the full media.
- Move to the previous or next sentence as the current playback segment.
- Loop the current segment and show the loop range and state clearly.
- Retain A–B looping so users can choose a range to replay.
- Keep playback and segment controls stable and reachable for mobile touch interaction.
- Support revisit marks, notes and learning-position records so users can return to marked content.
- Do not convert play count into a judgment of ability, automatic difficulty changes or mastery state.

## 6. Meaning-group reveal

### 6.1 Two levels

Playback segments and meaning groups are separate. Previous and next move between playback segments; meaning groups within a segment determine the reveal range.

Each sentence is divided into meaning groups. Each reveal shows complete groups rather than isolated characters or words.

### 6.2 Reveal behavior

| Action | Confirmed behavior |
| --- | --- |
| Small hint | Reveal fewer meaning groups. |
| More hints | Keep the groups already revealed and reveal more content. |
| Full sentence | Reveal the complete source text for the current segment. |
| Hide source text | Let the user return to blind listening at any time. |
| Change segment | Hide source text and translation by default. |

Unrevealed content remains as a placeholder. Users choose the hint level directly; levels do not require step-by-step unlocking and are not automatically downgraded based on answers. The difference between small and more hints is the number of meaning groups, not the number of words.

The current task uses consecutive groups from the beginning of the sentence: small reveals 1 group, more reveals `min(n, max(2, ceil(2n/3)))` groups, and full reveals all `n` groups. See [the current task](INTENSIVE_LISTENING_TASK.md) for the acceptance rule.

## 7. Translation

- Translation has an independent control and does not depend on how much source text has been revealed.
- The prototype's bottom extension area is formally used as the current-sentence translation area.
- Clicking the translation entry expands or collapses that area; changing sentences collapses it by default.
- When a translation exists, show the current sentence's translation. When it is missing or has not been generated, show an explicit status.
- Translation is part of the listening-page structure. Automatic translation is in scope for the current page; the specific service or local implementation remains subject to the real-media validation in stage 1.

## 8. Mobile interface reference

The supplied Photo 1.jpg and Photo 2.jpg show the normal and expanded-reveal states of the same practice page.

- Warm white background, yellow accent, dark blue text and icons, and large rounded corners.
- Page order: top navigation, media display, playback progress, previous/reveal/next controls, source-text area, speed/loop/translation controls, and bottom translation area.
- Reveal options represent small hints, more hints and the full sentence.
- Source text is revealed within the practice page without navigating away.
- Illustrations, system status bars and explanatory placeholder text in the images are not necessarily product features or licensed release assets.

## 9. Data and processing boundary

The product needs to represent media information, timestamped segments and source text, sentence-level meaning groups, optional translations, learning position, revisit marks, notes and playback preferences.

Keep the boundary from media input to timestamped source text and segments explicit so that a future local Desktop service can reuse it. Do not implement multiple processing backends in advance.

A browser version does not promise that all processing happens in the browser. Whether media leaves the device, how media is retained, what storage is used and how the same media is re-associated must be decided with the processing approach; do not claim that media never leaves the device before that decision is made.

## 10. Explicit boundaries

The current scope does not include automatic dictation verification or scoring, automatic mastery judgment, handwriting recognition or photo grading, automatic difficulty reduction, a professional audio/video or subtitle authoring platform, large-scale official material production or hosting, accounts or cross-device synchronization.

The current scope does not promise iOS or Android packages, a standalone desktop installer, large media offline caching, background playback or system sharing entry points.

## 11. Relationship between current code and the new plan

The current page uses media import, local automatic processing and meaning-group intensive listening. The old preloaded course, dictation-comparison and progress logic has been removed from runtime code and remains only as historical background; this task does not implement persistence, notes or review. See [the current task](INTENSIVE_LISTENING_TASK.md) for scope and completion evidence.

[README.md](../README.md) describes the current setup. [STRUCTURED_INTENSIVE_LISTENING_MVP.md](STRUCTURED_INTENSIVE_LISTENING_MVP.md) describes only the superseded design. This specification and [ROADMAP.md](ROADMAP.md) are the current planning sources; completing documentation does not mean the product is complete.

## 12. Product acceptance goals

- A user without a subtitle file can process media and enter segmented intensive listening.
- The full flow does not require entering or submitting a dictation answer.
- The user can play, change speed, move between sentences, loop, reveal, hide and revisit content.
- More hints include the groups revealed by the small hint; full reveal shows the complete source text.
- Translation has an independent control and uses the bottom translation area.
- The source of automatic results, processing failures and missing translations are clearly communicated.
- Learning records and processing results can be reused without presenting user actions as objective learning scores.
