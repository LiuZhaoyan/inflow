# Inflow Project Status

Last verified: 2026-10-09

This document is the canonical snapshot of what Inflow implements now. Product intent and scope belong in [PRODUCT_SPEC.md](PRODUCT_SPEC.md); future work belongs in [ROADMAP.md](ROADMAP.md). Task-level specs, tickets, research, and acceptance evidence remain under `.scratch/`.

## 1. Current product state

Inflow currently runs as a Windows-oriented Electron desktop application with a React/Next.js renderer. The implemented learning loop is:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

The desktop host owns persistence, managed media, local processing, and generation credentials. The renderer communicates with those capabilities through the preload/DesktopBridge contract rather than owning desktop business logic directly.

Runtime import, transcription, local dictionary-form lookup, translation and passage generation support Korean and English. The source-checkout desktop application completes both learning loops; [English acceptance](../.scratch/archive/english-learning/acceptance.md) separates operations tests, real local processing, native UI checks and live generation quality. Native import confirms one language and remembers the last confirmed choice even if import fails. Independent language filters preserve selected targets, and mixed-language generation fails before provider access.

The current frontend workspace supports media import and processing, full and sentence playback, sentence navigation and looping, persistent learner-selected meaning-group masks applied in mask mode, with full source text and word collection available outside the mode, independent Chinese translation, source-linked vocabulary collection, and a local Library view. Listen separates live mask mode from native word selection; Listen and Story expose shared single-word collection through a local lookup and save popover. The vocabulary notebook manages the saved entries and passage generation targets.

Manual video subtitle masking is implemented in this source checkout: explicit activation, one opaque rectangle, pointer/keyboard adjustment, picture-relative positioning with letterboxing, an initial adjustment pause with optional live playback, and independent per-video persistence. New video imports remain uncovered. [Mask acceptance](../.scratch/archive/video-subtitles/acceptance.md) records automated browser interaction, real host/SQLite tests and the desktop build; owner visual acceptance and installed-package verification remain separate.

The top-navigation Settings modal uses the current dark workspace style, with LLM and Subtitle mask categories on one continuous surface. It replaces Story's key editor with a Settings shortcut, shares credential status with Story, and previews a global solid-color video mask before saving. The host retains encrypted credential storage and persists the color in SQLite. Save/Cancel, explicit partial-save feedback, pause without automatic resume, empty-library use, and real profile restart passed [Settings acceptance](../.scratch/settings/acceptance.md). Owner visual approval and installed-package verification remain separate.

## 2. Runtime architecture

```text
React / Next.js renderer
        ↓
DesktopBridge / Electron IPC
        ↓
DesktopOperations
        ↓
SQLite        Python worker        DeepSeek API
```

Electron loads a static Next.js export. Managed media is served through the custom `inflow://` protocol with byte-range support for seeking and sentence playback. No local HTTP server is required by the desktop runtime.

LearningWorkspace owns Learning artifact state through useLearningArtifacts, which handles restoration, source/history opening, generation and cancellation behind shared snapshots and commands. ArtifactLibrary no longer owns host orchestration or paired shared-state updates; it retains sentence selection, translation visibility, filtering, topic and scrolling. Library selection and vocabulary collection consume the same accepted artifact. [Flow ownership and verification](../.scratch/artifact-state/issues/02-evaluate-story-flow-deepening.md) covers native restoration, opening, draft protection, generation failure/retry and provenance. The separate [ordering investigation](../.scratch/artifact-state/request-ordering-report.md) remains a bounded negative result in ordinary scripted use, with renderer/persistence divergence under controlled reply delays; this refactor preserves that behavior.

## 3. Implemented learning domains

### Media and listening

Imported audio or video is copied into application-managed storage and identified by SHA-256. Processing results are stored and restored with the learning position and playback preferences. Missing managed media can be re-associated only when the selected file matches the original hash.

Local transcription uses faster-whisper with the confirmed source language and word timestamps enabled. Kiwi determines Korean sentence boundaries and grammatical phrase groups. English uses a prepared spaCy pipeline for sentence boundaries, contextual lemmas and phrase/clause groups, preserving whole contractions and hyphenated words. The persisted listening model is sentence-level:

```ts
type Segment = {
  start: number;
  end: number;
  text: string;
  groups: string[];
};
```

Whisper word timestamps are intermediate processing data. Sentence start/end times are derived from the first and last aligned words, but individual word timestamps are not persisted in the current Segment model.

### Vocabulary

Vocabulary entries store source language, a dictionary form, contextual Chinese meaning, selection state, and one or more source occurrences. Kiwi provides read-only Korean lookup; spaCy suggests contextual English lemmas while preserving contractions, removing possessives and normalizing lemma apostrophes. The host validates complete English selections and original UTF-16 offsets. Bundled dictionaries contain 42,908 Korean and 19,745 English headwords with offline Chinese sense candidates; [resource notices](../resources/dictionaries/NOTICE.md) record provenance and separate data licenses. Learners select or edit a meaning and can explicitly request a cloud contextual gloss. Only collected meanings persist; saved meanings are automatically reused only for the same source sentence and selected occurrence. Both Listen and Story retain edited drafts on lookup or saving failure. Sources can point either to a media segment or to a sentence in a generated artifact.

Entries are unique by source language plus lemma and meaning, so distinct senses remain separate while repeated encounters with the same sense can accumulate source contexts. Successful retranscription atomically replaces all segments for that material and removes their vocabulary source occurrences, including occurrences on older retained segments. Vocabulary entries, meanings, target selection and sources from other media or artifacts remain intact. Failure or cancellation preserves the previous transcript and sources. Legacy material and vocabulary gain Korean language metadata while retaining existing IDs, selection state, and source references.

### Generated artifacts

Up to 20 selected vocabulary entries in one language can be sent to DeepSeek to generate one short passage in that language. Generation receives the selected lemma, contextual Chinese meaning, and available source sentence. Returned target IDs are structurally validated before the artifact and its language are saved. Filtering never omits selected targets from this check.

Saved artifacts include the passage, Chinese sentence translations, target annotations, a snapshot of the target vocabulary, creation time, elapsed generation time, requested model, and available provider metadata. Vocabulary can then be collected from artifact sentences, closing the learning loop.

## 4. Processing and service boundaries

Transcription and sentence segmentation run locally. Listen translation uses the cloud on explicit request, with an explicitly selected local reference fallback. The current processing path is:

```text
media
  ↓
faster-whisper
  ↓
word-aligned Korean or English recognition
  ↓
Kiwi (Korean) / spaCy (English) sentence splitting + phrase grouping
  ↓
Segment[]
```

Listen sends the confirmed language, current sentence and neighboring context to DeepSeek and keeps one latest successful translation in SQLite for offline revisits and restart. Refresh failure or cancellation preserves that result. Explicit local reference translation uses Korean → English → Chinese or English → Chinese through prepared CTranslate2 resources. Story keeps its generation-time translations. Sentence translation, word gloss and passage generation share the host-owned credential, with independent task settings in code. Preparation installs pinned English dependencies and the local pipeline; runtime processing does not download resources.

Passage generation is not local. It uses the DeepSeek Responses API and therefore requires network access and an owner-configured credential. Saved media, learning state, vocabulary, provenance, and generated artifacts remain local.

## 5. Persistence

The Electron host stores learning records in SQLite. The current persisted domains are:

- media and learning state;
- current sentence segments, plus latest successful sentence translations and their input context;
- vocabulary entries and media-source occurrences;
- generated artifacts and artifact-source vocabulary occurrences;
- small application settings such as the current media or artifact and global video subtitle mask color.

Video mask settings are an optional field in the existing media learning JSON. Missing settings mean disabled; no table migration is required. The host validates bounded numeric regions, retains settings when older save requests omit them, and preserves them during successful retranscription.

The global mask color uses the existing settings table and defaults to black for existing profiles. Each video's region and enabled state stay in its learning JSON. The shared DeepSeek key remains in a Windows-encrypted host file; it is not stored in the settings table or returned to the renderer. The two settings may save independently, with explicit field-level results and retries for failed changes.

Large media files and local model resources are stored outside SQLite.

## 6. Verification state

The desktop implementation has automated coverage around listening processing/reveal behavior, managed media, desktop operations, vocabulary persistence, artifact generation, and media serving. The persistent listening, vocabulary, and generated-artifact slices have also been exercised during their task-level acceptance work.

The current frontend workspace has been implemented and locally verified. Native Electron acceptance covers shared Listen/Story selection, real Kiwi and bundled dictionary lookup, explicit cloud actions, translation cache reuse, failed refresh preservation, manual fallback, stale-result protection, suggestion application, discarded glosses, saving retry, source provenance, and notebook refresh. Cloud HTTP and local reference translation use deterministic fixtures in this acceptance; live provider translation quality is not assessed. Visual/product acceptance of the broader redesigned workspace is still evolving.

Task-specific verification records are indexed in [the task index](../.scratch/README.md). Superseded and completed delivery records live under `.scratch/archive/`; this document records only the resulting current state.

English native acceptance runs in an isolated profile and a second Electron process. It covers real Whisper transcription on offline synthetic speech, real spaCy and dictionary lookup, language confirmation/default, playback, masks, protected drafts, independent filters, two Story cycles and offline restoration. Provider requests in that UI run are deterministic fixtures. Separate live English generations verified supplied contextual senses, contractions, hyphens and regular inflection; plural/irregular generation quality remains unverified, and one malformed response was rejected. See [the quality report](../.scratch/archive/english-learning/quality-report.md).

## 7. Current gaps

The main known gaps are:

- owner visual/product acceptance of the implemented frontend remains pending;
- automatic contextual dictionary disambiguation remains deferred;
- individual ASR word timestamps are not part of the persisted domain model;
- local Chinese translation can be literal or lossy; Korean uses an English pivot;
- English dictionary coverage and irregular generated inflections need broader quality review; real-speaker English ASR beyond the synthetic acceptance sample remains unverified;
- new cloud translations, contextual glosses and generated passages depend on the remote DeepSeek service; saved results and offline dictionary lookup remain local;
- packaged processing resources and installed-application acceptance are not yet complete;
- automatic subtitle-region detection, subtitle-track extraction/audio alignment and bitmap subtitle OCR remain deferred; manual subtitle masking is implemented.

See [ROADMAP.md](ROADMAP.md) for the work that follows from these gaps.

## 8. Documentation boundaries

Use these documents according to their role:

- [PRODUCT_SPEC.md](PRODUCT_SPEC.md): what Inflow should be — product behavior, scope, and boundaries.
- **PROJECT_STATUS.md**: what Inflow is now — implemented architecture, capabilities, verification state, and known gaps.
- [ROADMAP.md](ROADMAP.md): what comes next — remaining work, ordering, and dependencies.
- `docs/agents/`: how repository agents should work with domain documentation and the local issue workflow.
- [`.scratch/README.md`](../.scratch/README.md): active task entry points and historical evidence. Active specs and tickets live under `.scratch/<effort>/`; archived records under `.scratch/archive/` are not expected to describe current behavior.
