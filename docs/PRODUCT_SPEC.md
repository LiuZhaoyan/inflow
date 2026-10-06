# Inflow Product Specification

Last updated: 2026-10-05

This document defines what Inflow should be: its product behavior, scope, and boundaries. Current implementation status belongs in [PROJECT_STATUS.md](PROJECT_STATUS.md); future implementation work belongs in [ROADMAP.md](ROADMAP.md).

## 1. Product positioning

Inflow is an open-source Korean and English learning desktop application, initially for personal use on Windows. Users provide audio or video for intensive listening, collect unfamiliar words, and generate short reading passages in the selected vocabulary's source language.

English is a confirmed product extension specified in [English Learning Support](../.scratch/english-learning/spec.md). Current runtime availability is recorded separately in [PROJECT_STATUS.md](PROJECT_STATUS.md).

The system automatically transcribes and segments source media so users do not need to prepare subtitles or a course first. Generated passages reuse selected vocabulary in its recorded contextual meaning and can themselves become sources for further vocabulary collection.

Dictation may be done on paper, in a notes application, or elsewhere. Inflow does not require users to enter or submit a dictation answer and does not score their understanding.

## 2. Core learning loop

The target learning loop is:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

Full-length playback supports first listening and review. Sentence playback, looping, learner-selected meaning-group masks, and translation support intensive listening. Vocabulary connects source media with generated reading material.

Generated passages are text-first learning artifacts. They preserve the target vocabulary and meanings used at generation time so later notebook edits do not rewrite historical learning context.

## 3. Platform and ownership boundaries

- The first delivery target is an installable Windows desktop application.
- The application owns processing, persistence, and managed media rather than requiring the learner to run a development server.
- Local transcription is preferred for source media.
- The owner configures the credential for online passage generation.
- Saved learning material remains local even when a model operation uses an online provider.
- Mobile/PWA delivery, accounts, and cross-device synchronization are outside the first-release scope.

## 4. Media and processing behavior

Users choose audio or video from their device. Imported media is retained as a managed local copy so moving the original file does not silently break saved learning material.

The learner confirms Korean or English for each import, with the last confirmed choice offered as the next default. Each material has one source language. A mistaken choice is corrected by reimporting; automatic detection and editing an existing material's language are outside this extension. English material should be predominantly English; reliable handling of frequent multilingual switching is not promised.

A subtitle file is not required. Processing should produce source text, playable sentence ranges, and meaning groups for masking. Automatically generated transcription, segmentation, and translation must not be presented as guaranteed-correct answer keys.

English meaning groups use local grammatical analysis to preserve phrases or clauses, complete contractions and hyphenated words. Ambiguous boundaries may produce larger groups; fixed word-count chunks are not the learning rule. Analysis resources are prepared through the existing setup workflow, and ordinary local processing does not download resources at runtime.

Processing failures should preserve the original media and provide a retry path. Reopening already processed material should reuse saved results rather than requiring duplicate processing.

The first release does not require a professional subtitle editor or a separate subtitle-import workflow. Lightweight transcript/timing correction may be added later.

## 5. Intensive listening

The learner can:

- play or pause the full source media;
- seek and change playback speed;
- move to the previous or next sentence;
- loop the current sentence;
- choose which complete meaning groups to mask in the current sentence;
- exit mask mode to view the complete source text and collect words;
- reveal or hide the Chinese translation independently;
- reopen material with learning position and playback preferences restored;
- optionally cover video subtitles with a manually adjustable black rectangle.

Playback segments and meaning groups are separate concepts. Previous/next navigation operates on sentences; masks operate on system-defined meaning groups inside the current sentence.

New sentences initially show their source text. Set masks directly toggles mask mode. In this mode, clicking a visible group immediately hides it, and clicking its masked placeholder immediately shows it again; there is no separate selection or confirmation step. Word collection is disabled in mask mode. Clicking Set masks again exits the mode, shows every meaning group and enables native word selection for vocabulary collection. Mask choices remain saved and apply only while mask mode is active.

Mask choices are saved locally per media and sentence and survive application restart. Changing or reopening a sentence exits mask mode, shows the complete source text and hides translation. Re-entering mask mode applies its saved mask choices. Successful retranscription clears masks because the sentence/group identities have changed; failure or cancellation preserves them. Translation is never generated merely because playback advances.

Video subtitle covering has its own switch, independent of source-text meaning-group masks. A new video shows its original picture with no covering. First activation offers one bottom rectangle and enters adjustment, pausing once without seeking. The learner can move the rectangle and resize its edges or corners using pointer or keyboard controls, manually resume playback and adjust live. Dragging does not toggle or repeatedly pause playback; finishing adjustment retains the current playback state and hides handles. The rectangle follows the actual video picture during window resizing, including letterboxing. Save its region and switch state per video across reopening/restart and preserve it through retranscription. Automatic subtitle-location detection, subtitle-track extraction and bitmap subtitle OCR are deferred.

Listen requests a Chinese translation from the cloud only on explicit action, using neighboring sentences as context while translating the current sentence alone. Keep one latest successful result locally and reuse it on ordinary revisits and restart. Actual source text or context changes invalidate reuse. Explicit refresh replaces the result only on success; failure or cancellation preserves the previous translation. A cloud failure offers retry or an explicitly chosen local reference translation. Story uses its saved sentence translations without regeneration controls.

## 6. Vocabulary notebook

Vocabulary may be collected from source-media sentences or generated artifacts, and may also be added manually. The current scope is individual words; phrase and grammatical-construction entries are deferred.

Selecting one complete word with no internal whitespace in revealed source text opens a lightweight popover in Listen or Story. Lookup suggests a dictionary form in the source language locally without saving an entry. Bundled Korean–Chinese and English–Chinese dictionaries supply offline sense candidates. A single available sense may fill automatically; multiple senses require learner selection. The learner can choose or edit a contextual Chinese meaning and explicitly confirm collection without leaving the learning view. An explicit cloud lookup can suggest a concise contextual meaning without changing the dictionary form. Failed lookup still permits manual entry. Selections across sentences, hidden text, partial English words, or multiple words are rejected with guidance to select one revealed word.

English collection includes whole contractions and hyphenated forms but excludes whitespace-containing phrases. Contextual lookup suggests ordinary dictionary forms in lowercase and proper names with appropriate spelling, while retaining the encountered text. Contractions such as `don't`, `can't` and `I'm` remain complete forms; possessives such as `teacher's` may suggest `teacher`; hyphenated forms remain intact. Dictionary forms normalize curly/straight apostrophes. All suggestions remain editable before collection.

Word selection never triggers a cloud request. Uncollected lookup results are not persisted. A saved meaning may be reused for the same source sentence and selected occurrence; meanings from other contexts are candidates only. An explicit cloud lookup may replace the meaning already present when requested. Pending results cannot overwrite edits made during that request or newer selections; intervening edits expose the returned meaning as an explicit Apply suggestion action.

The popover retains the selected surface and source when its inputs receive focus. Changing sentence or selection closes an unedited draft; an edited draft requires saving or explicitly discarding. Failed saving retains the draft for retry.

Source language is part of vocabulary identity and is confirmed for manual additions as well as inherited from collected material. Contextual meanings and sentence translations remain Chinese for both learning languages.

A vocabulary entry should preserve:

- source language and dictionary form;
- contextual Chinese meaning;
- encountered surface form when available;
- original sentence when available;
- source identity.

Learners can correct the dictionary form and meaning. Distinct meanings of the same source-language form remain distinguishable, while repeated encounters with the same meaning may preserve multiple source contexts. Entries in different source languages remain distinct even when their spelling matches.

Successful retranscription removes all vocabulary source contexts from that material's old transcript, including unchanged sentences and earlier retained versions. Context removal and transcript replacement commit together; failure or cancellation preserves the previous transcript and contexts. Vocabulary entries, their meanings and target selection remain valid and unchanged. Sources from other media and generated artifacts remain intact. An entry without sources stays visible and editable, may be selected for generation, and displays an empty-source state. Collecting the same word and meaning from a new sentence reuses the existing entry and adds its new source.

Vocabulary selection is an explicit learner action. Inflow does not infer mastery from play count, collection, or selection.

Media, vocabulary and saved reading lists identify source language and offer independent All/Korean/English filters, initially set to All. Filtering changes visible results without changing stored material or selected target vocabulary.

## 7. Generated learning artifacts

Selecting target vocabulary is sufficient to generate one short passage in the selected entries' shared source language; a topic may be optional. The first release does not require difficulty-level or passage-length controls.

Each generation uses exactly one source language, determined from the full selected target set rather than the currently visible filtered list. Mixed Korean/English selections require learner correction before a provider request and preserve all existing selections.

Every selected target should appear naturally in its recorded contextual meaning. Natural Korean or English inflection counts as use; exact dictionary-form spelling is not required. Supporting vocabulary should remain common and suitable for learning.

A saved artifact preserves its source language, text, target occurrences, Chinese sentence translations, and a snapshot of the target meanings used to generate it. Learners can collect further unfamiliar vocabulary from artifact sentences and use those entries in later generation.

Generation failure must preserve existing learning data and offer retry. Structural validation alone does not establish linguistic naturalness or semantic quality.

## 8. Data and provenance principles

Source media, sentence segments, meaning groups, translations, learning state, vocabulary entries, source occurrences, generated artifacts, and artifact target snapshots are distinct product concepts.

Stored material and source occurrences should use stable identities. Retranscription replaces sentence identities and clears their vocabulary source occurrences while preserving valid vocabulary entries. Notebook corrections preserve their remaining sources. Historical artifacts should continue to represent the vocabulary meanings that produced them.

Large media/model resources may be stored separately from structured learning records.

## 9. Explicit scope boundaries

The first release does not include:

- automatic dictation verification or scoring;
- automatic mastery judgment;
- learner-level or difficulty estimation;
- handwriting recognition;
- professional media/subtitle editing;
- generated-article editing;
- large-scale official course hosting;
- accounts or cross-device synchronization;
- generated audio/TTS for learning artifacts;
- mobile/PWA packages or other desktop operating-system packages;
- public distribution infrastructure or automatic updates.

A personal-use Windows installer and durable local learning storage are in scope.

## 10. Product acceptance goals

The complete product should allow a learner to start from Korean or English media without subtitles, perform sentence-based intensive listening, collect source-linked vocabulary, generate a reading artifact in the target vocabulary's language, collect further vocabulary from that artifact, and restore the complete cycle after restarting the application.

The learner must remain in control of reveal, translation, vocabulary selection, and generation. Automatic model output should be treated as assistance rather than a score or authoritative answer.

For the implementation that currently exists, see [PROJECT_STATUS.md](PROJECT_STATUS.md). For remaining work and sequencing, see [ROADMAP.md](ROADMAP.md).
