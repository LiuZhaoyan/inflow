# Inflow Product Specification

Last updated: 2026-10-03

This document defines what Inflow should be: its product behavior, scope, and boundaries. Current implementation status belongs in [PROJECT_STATUS.md](PROJECT_STATUS.md); future implementation work belongs in [ROADMAP.md](ROADMAP.md).

## 1. Product positioning

Inflow is an open-source Korean learning desktop application, initially for personal use on Windows. Users provide audio or video for intensive listening, collect unfamiliar words, and generate short Korean reading passages from their vocabulary notebook.

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

A subtitle file is not required. Processing should produce source text, playable sentence ranges, and meaning groups for masking. Automatically generated transcription, segmentation, and translation must not be presented as guaranteed-correct answer keys.

Processing failures should preserve the original media and provide a retry path. Reopening already processed material should reuse saved results rather than requiring duplicate processing.

The first release does not require a professional subtitle editor or a separate subtitle-import workflow. Lightweight transcript/timing correction may be added later.## 5. Intensive listening

The learner can:

- play or pause the full source media;
- seek and change playback speed;
- move to the previous or next sentence;
- loop the current sentence;
- choose which complete meaning groups to mask in the current sentence;
- exit mask mode to view the complete source text and collect words;
- reveal or hide the Chinese translation independently;
- reopen material with learning position and playback preferences restored.

Playback segments and meaning groups are separate concepts. Previous/next navigation operates on sentences; masks operate on system-defined meaning groups inside the current sentence.

New sentences initially show their source text. Set masks directly toggles mask mode. In this mode, clicking a visible group immediately hides it, and clicking its masked placeholder immediately shows it again; there is no separate selection or confirmation step. Word collection is disabled in mask mode. Clicking Set masks again exits the mode, shows every meaning group and enables native word selection for vocabulary collection. Mask choices remain saved and apply only while mask mode is active.

Mask choices are saved locally per media and sentence and survive application restart. Changing or reopening a sentence exits mask mode, shows the complete source text and hides translation. Re-entering mask mode applies its saved mask choices. Successful retranscription clears masks because the sentence/group identities have changed; failure or cancellation preserves them. Translation is never generated merely because playback advances.

Listen requests a Chinese translation from the cloud only on explicit action, using neighboring sentences as context while translating the current sentence alone. Keep one latest successful result locally and reuse it on ordinary revisits and restart. Actual source text or context changes invalidate reuse. Explicit refresh replaces the result only on success; failure or cancellation preserves the previous translation. A cloud failure offers retry or an explicitly chosen local reference translation. Story uses its saved sentence translations without regeneration controls.

## 6. Vocabulary notebook

Vocabulary may be collected from source-media sentences or generated artifacts, and may also be added manually. The current scope is individual words; phrase and grammatical-construction entries are deferred.

Selecting one continuous word with no internal whitespace in revealed source text opens a lightweight popover in Listen or Story. Lookup suggests a Korean dictionary form locally without saving an entry. A bundled Korean-Chinese dictionary supplies offline sense candidates. A single available sense may fill automatically; multiple senses require learner selection. The learner can choose or edit a contextual Chinese meaning and explicitly confirm collection without leaving the learning view. An explicit cloud lookup can suggest a concise contextual meaning without changing the dictionary form. Failed lookup still permits manual entry. Selections across sentences, hidden text, or multiple words are rejected with guidance to select one revealed word.

Word selection never triggers a cloud request. Uncollected lookup results are not persisted. A saved meaning may be reused for the same source sentence and selected occurrence; meanings from other contexts are candidates only. An explicit cloud lookup may replace the meaning already present when requested. Pending results cannot overwrite edits made during that request or newer selections; intervening edits expose the returned meaning as an explicit Apply suggestion action.

The popover retains the selected surface and source when its inputs receive focus. Changing sentence or selection closes an unedited draft; an edited draft requires saving or explicitly discarding. Failed saving retains the draft for retry.

The learner confirms the source language when importing media. Korean is supported initially and English is planned; contextual meanings remain Chinese. Source language is part of vocabulary identity.

A vocabulary entry should preserve:

- source language and dictionary form;
- contextual Chinese meaning;
- encountered surface form when available;
- original sentence when available;
- source identity.

Learners can correct the dictionary form and meaning. Distinct meanings of the same Korean form remain distinguishable, while repeated encounters with the same meaning may preserve multiple source contexts.

Successful retranscription removes all vocabulary source contexts from that material's old transcript, including unchanged sentences and earlier retained versions. Context removal and transcript replacement commit together; failure or cancellation preserves the previous transcript and contexts. Vocabulary entries, their meanings and target selection remain valid and unchanged. Sources from other media and generated artifacts remain intact. An entry without sources stays visible and editable, may be selected for generation, and displays an empty-source state. Collecting the same word and meaning from a new sentence reuses the existing entry and adds its new source.

Vocabulary selection is an explicit learner action. Inflow does not infer mastery from play count, collection, or selection.

## 7. Generated learning artifacts

Selecting target vocabulary is sufficient to generate one short Korean passage; a topic may be optional. The first release does not require difficulty-level or passage-length controls.

Every selected target should appear naturally in its recorded contextual meaning. Natural Korean inflection counts as use; exact dictionary-form spelling is not required. Supporting vocabulary should remain common and suitable for learning.

A saved artifact preserves its text, target occurrences, Chinese sentence translations, and a snapshot of the target meanings used to generate it. Learners can collect further unfamiliar vocabulary from artifact sentences and use those entries in later generation.

Generation failure must preserve existing learning data and offer retry. Structural validation alone does not establish Korean naturalness or semantic quality.## 8. Data and provenance principles

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

The complete product should allow a learner to start from media without subtitles, perform sentence-based intensive listening, collect source-linked vocabulary, generate a Korean reading artifact from selected vocabulary, collect further vocabulary from that artifact, and restore the complete cycle after restarting the application.

The learner must remain in control of reveal, translation, vocabulary selection, and generation. Automatic model output should be treated as assistance rather than a score or authoritative answer.

For the implementation that currently exists, see [PROJECT_STATUS.md](PROJECT_STATUS.md). For remaining work and sequencing, see [ROADMAP.md](ROADMAP.md).
