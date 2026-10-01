# Inflow Product Specification

Status: confirmed Windows desktop product planning; implementation remains incomplete.
Last updated: 2026-09-30

## 1. Product positioning

Inflow is an open-source Korean learning desktop application, initially for the owner's personal use on Windows. Users provide audio or video for intensive listening, collect unfamiliar words, and generate reading passages from their vocabulary notebook.

The system provides automatic transcription and basic segmentation, so users do not need to create subtitles or a course first. Generated passages use the selected target vocabulary and common supporting vocabulary; saved passages can themselves supply further unfamiliar words.

Dictation can be done on paper, in a notes application or elsewhere. Users verify their own understanding; Inflow does not require them to enter or submit a dictation answer.

## 2. Platform and evolution

- The first delivery target is an installable Windows desktop application. Mobile/PWA delivery and other operating-system packages are outside the first-release scope.
- The design baseline reuses the React interface through an Electron host and static Next build. The installed application owns processing and persistence rather than requiring the learner to run a development server.
- The existing implementation remains a browser prototype calling a local Python worker. Its Korean transcription, sentence timings, meaning groups and Chinese translation provide a starting point; Windows speed, accuracy, packaging and full learning-flow acceptance remain unverified.
- The owner configures their own generation API key. Local transcription is evaluated first; passage generation can call an online provider with the selected vocabulary and necessary source text. Saved learning material remains local.
- The detailed implementation and validation contract is in [the desktop specification](../.scratch/desktop-learning/spec.md). Technical research supplies a baseline, not evidence that the Windows application has already been delivered.

## 3. Core flow

Choose audio or video → automatically transcribe and segment it → practice one segment at a time → collect unfamiliar words → select target vocabulary → generate and save a short passage → read it and collect further words → repeat.

Full-length playback is available for first listening and review. Playback, hints and segment navigation do not depend on submitting an answer or completing a self-assessment.

Generated passages are text-only in the first release. The vocabulary notebook and saved learning artifacts connect listening and reading; neither requires a learner-level estimate.

## 4. Media input and basic processing

### 4.1 Input

- Users choose audio or video from their device. Imported media is retained as a managed local copy so moving the original file does not break reopening; the extra disk-space cost is part of this approach.
- A subtitle file is not a prerequisite for starting. A separate subtitle-import workflow is not a first-release acceptance requirement.
- The project may keep a small number of examples with clear provenance and usage conditions; it will not operate a continuously expanding official course library.

### 4.2 Processing results

- Generate source text and playable segments with timestamps.
- Divide each sentence into meaning groups for progressive reveal.
- Mark automatically generated content as potentially incorrect; it is not a guaranteed answer key.
- Show processing status and support retry. The original media remains playable after processing fails.
- Save processing results and reuse them when the same media is associated again, avoiding duplicate processing.
- Lightweight editing of the current segment's text and boundaries remains a possible later improvement rather than a first-release requirement.

Evaluate the existing local processing path with real Korean video on Windows before adopting a replacement. The current prototype's 50 MB and 10-minute processing limits remain the initial baseline; expanding them requires resource evidence.

## 5. Intensive listening and playback

- Play and pause audio or video, seek, change speed and play the full media.
- Move to the previous or next sentence as the current playback segment.
- Loop the current segment and show the loop range and state clearly.
- Keep playback and segment controls stable and reachable in the desktop interface.
- Save learning position and playback preferences so the learner can continue after reopening.
- A–B looping, revisit marks and standalone notes remain possible later improvements, outside the first-release learning-cycle acceptance.
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

The retained reveal rule uses consecutive groups from the beginning of the sentence: small reveals 1 group, more reveals `min(n, max(2, ceil(2n/3)))` groups, and full reveals all `n` groups.

## 7. Translation

- Translation has an independent control and does not depend on how much source text has been revealed.
- The prototype's bottom extension area is formally used as the current-sentence translation area.
- Clicking the translation entry expands or collapses that area; changing sentences collapses it by default.
- When a translation exists, show the current sentence's translation. When it is missing or has not been generated, show an explicit status.
- Translation is part of the listening-page structure. Existing local sentence translation is the initial baseline; its quality remains subject to real-media acceptance.

## 8. Visual reference

The supplied Photo 1.jpg and Photo 2.jpg show the normal and expanded-reveal states of the earlier mobile practice page. They remain visual references; the first delivery is organized for Windows desktop learning.

- Warm white background, yellow accent, dark blue text and icons, and large rounded corners.
- Page order: top navigation, media display, playback progress, previous/reveal/next controls, source-text area, speed/loop/translation controls, and bottom translation area.
- Reveal options represent small hints, more hints and the full sentence.
- Source text is revealed within the practice page without navigating away.
- Illustrations, system status bars and explanatory placeholder text in the images are not necessarily product features or licensed release assets.

## 9. Data and processing boundary

The product represents source media, playback segments, meaning groups, translations, learning position, playback preferences, vocabulary entries, source occurrences, learning artifacts and their target vocabulary.

Use stable identities for stored material and sources. An artifact preserves the target dictionary forms and contextual meanings used to generate it, even when the vocabulary notebook is corrected later.

The design baseline stores learning records in local SQLite and keeps large media/model files separately. Reopening reuses processing results. If a managed file is missing, retain its transcript and vocabulary and report how to re-associate the media.

Local transcription processes media on the user's computer. Online passage generation sends selected words, contextual meanings and necessary source sentences to the configured provider; local material storage does not imply that every model operation is offline.

## 10. Explicit boundaries

The first-release scope does not include automatic dictation verification or scoring, automatic mastery judgment, difficulty-level selection or estimation, handwriting recognition, a professional media/subtitle editor, generated-article editing, large-scale official material hosting, accounts or cross-device synchronization.

Generated audio, TTS, timed playback for learning artifacts, mobile packages, PWA delivery, other desktop operating systems, public distribution infrastructure and automatic updates are outside the first-release scope. A personal-use Windows installer and durable local material storage are in scope.

## 11. Relationship between current code and the new plan

The current page implements media import, local processing and meaning-group intensive listening. Desktop development adds a static Electron host, managed media, durable learning storage and a source-linked vocabulary notebook with corrections, manual additions and target selection. Generated learning artifacts, packaged processing resources and installed-app acceptance remain pending. The old preloaded course and answer-comparison design remains historical background.

[README.md](../README.md) describes the runnable prototype. [BACKEND_ACCEPTANCE.md](BACKEND_ACCEPTANCE.md) preserves the earlier Linux/WSL real-media evidence. This specification and [ROADMAP.md](ROADMAP.md) are current planning sources; documentation does not establish product completion.

## 12. Product acceptance goals

- A user without a subtitle file can process media and enter segmented intensive listening.
- The full flow does not require entering or submitting a dictation answer.
- The learner can play, change speed, move between sentences, loop, reveal, hide and reopen saved material.
- More hints include the groups revealed by the small hint; full reveal shows the complete source text.
- Translation has an independent control and uses the bottom translation area.
- The source of automatic results, processing failures and missing translations are clearly communicated.
- Vocabulary entries preserve dictionary forms, contextual Chinese meanings, original sentences and sources, and allow learner corrections and manual additions.
- Selected vocabulary generates one short Korean text passage using every intended meaning with common supporting vocabulary.
- Artifacts highlight targets, reveal Chinese translation on demand and support further source-linked vocabulary collection.
- The full listening → vocabulary → reading → vocabulary cycle survives application restart, with saved results reused and user actions not presented as learning scores.

## 13. Vocabulary notebook

- Collect vocabulary from a source-media sentence or a learning artifact, or add it manually.
- Retain the Korean dictionary form, contextual Chinese meaning, encountered surface form, original sentence and source. Manual entries may lack a source sentence.
- Let the learner review and correct the dictionary form and meaning. Distinct meanings of the same word should remain distinguishable, and further occurrences may preserve additional source contexts.

## 14. Generated passages and learning artifacts

- Selecting target vocabulary is enough to generate one short Korean passage. A topic is optional; the first release has no difficulty-level or passage-length control.
- Use every selected word in its recorded contextual meaning. Natural Korean inflection counts as use; exact dictionary-form spelling is not required. Other vocabulary should be common and everyday.
- Save the passage as a learning artifact, highlight target occurrences, and keep Chinese translation hidden until requested. Do not require audio generation.
- Collect further unfamiliar words from an artifact with its sentence and source retained, then use them in another generation.
- Failed or incomplete generation preserves existing work and offers retry. Structural validation checks the returned data; representative Korean review is required to establish meaning, naturalness and vocabulary quality.
