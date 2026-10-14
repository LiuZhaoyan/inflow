# Inflow Project Status

Last verified: 2026-10-14

This document is the canonical snapshot of what Inflow implements now. Product intent and scope belong in [PRODUCT_SPEC.md](PRODUCT_SPEC.md); future work belongs in [ROADMAP.md](ROADMAP.md). Task-level specs, tickets, research, and acceptance evidence remain under `.scratch/`.

## 1. Current product state

Inflow currently runs as a Windows-oriented Electron desktop application with a React/Next.js renderer. The implemented learning loop is:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

The desktop host owns persistence, managed media, local processing, and generation credentials. The renderer communicates with those capabilities through the preload/DesktopBridge contract rather than owning desktop business logic directly.

Runtime import, transcription, local dictionary-form lookup, translation and passage generation support Korean and English. The source-checkout desktop application completes both learning loops; [English acceptance](../.scratch/archive/english-learning/implementation-and-acceptance.md) separates operations tests, real local processing, native UI checks and live generation quality. Native import confirms one language and remembers the last confirmed choice even if import fails. Independent language filters preserve selected targets, and mixed-language generation fails before provider access.

The current frontend workspace supports media import and processing, full and sentence playback, sentence navigation and looping, persistent learner-selected meaning-group masks applied in mask mode, with full source text and word collection available outside the mode, independent Chinese translation, source-linked vocabulary collection, and a local Library view. Listen separates live mask mode from native word selection; Listen and Story expose shared single-word collection through a local lookup and save popover. The vocabulary notebook manages the saved entries and passage generation targets.

Manual video subtitle masking is implemented in this source checkout: explicit activation, one opaque rectangle, pointer/keyboard adjustment, picture-relative positioning with letterboxing, an initial adjustment pause with optional live playback, and independent per-video persistence. New video imports remain uncovered. [Mask acceptance](../.scratch/archive/video-subtitles/implementation-and-acceptance.md) records automated browser interaction, real host/SQLite tests and the desktop build; owner visual acceptance was recorded on 2026-10-09 and installed-package masking verification is deferred until the next packaged release; native maximized-window verification also remains outstanding.

The top-navigation Settings modal uses the current dark workspace style, with Interface language, LLM, Subtitle mask and Processing models categories. It replaces Story's key editor with a Settings shortcut, shares credential status with Story, and previews a global solid-color video mask before saving. The host retains encrypted credential storage and persists color and interface language in SQLite. Save/Cancel, explicit partial-save feedback, pause without automatic resume, empty-library use, and real profile restart passed [Settings acceptance](../.scratch/archive/settings/acceptance.md). Owner visual approval of that Settings iteration was recorded on 2026-10-09; additional installed-package verification belongs to the next packaged release.

Simplified Chinese and English interfaces now cover the workspace, libraries, Settings, accessible names, application-owned errors and native dialog options. Saved language overrides the Chinese-system/English-otherwise default; Save applies immediately, while Cancel discards the draft and failures retain it. Browser preferences use separate local storage without a desktop bridge. Source media and Korean/English learning text, Chinese assistance, notes, target snapshots, playback and masks remain unchanged by switching. See [interface internationalization acceptance](../.scratch/i18n/acceptance.md).

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

LearningWorkspace owns learning artifact state through useLearningArtifacts, which handles restoration, Library/history/source opening, generation and cancellation behind shared snapshots and commands. ArtifactLibrary retains sentence selection, translation visibility, filtering, topic and scrolling. Candidate reads do not persist selection. The latest eligible intent commits through a guarded synchronous host operation before updating the view, preserving the accepted Story during loading and on failed reads or writes. Real vocabulary drafts and view departure permanently cancel pending navigation; immediate save/discard does not revive it. Successful generation remains saved even when its automatic switch is canceled. The existing SQLite schema is unchanged. [Navigation acceptance](../.scratch/story-navigation-notices/acceptance.md) resolves the historical controlled delayed-reply divergence and verifies recovery before and after the durable commit. The short synchronous SQLite acceptance can briefly delay the renderer on slow storage.

Application-owned errors now share compact pink-on-purple notices across Listen, Story, Vocabulary, Library and Settings. Contextual errors remain inline with validation/retry controls; general errors, loading and cancellations float upper-right. Notices truncate to one line within 370px × 44px, expose sanitized full details through a keyboard-accessible popover, support dismissal and bilingual presentation, and expire transient feedback after five seconds. Actionable errors persist.

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

The notebook now returns and highlights saved occurrence positions, retries failed loading, ignores older responses and preserves surviving selections on refresh. Committed writes use the returned entry directly and reveal it through necessary filter changes. Local system voices pronounce the dictionary form in the entry's language, with readiness, missing-voice, error and cancellation handling. Notes are optional, collapsed and compact, explicitly saved, and protect unsaved drafts. An additive SQLite note column defaults to empty and survives edits, recollection, retranscription and restart. Confirmed single-entry deletion atomically removes notes, contexts, positions and target selection while retaining media and historical Story snapshots. Contexts provide source navigation; the redundant Source card and Add context placeholder are removed.

Mutable renderer vocabulary now has one Workspace-owned hook. Notebook consumes that list while retaining its filters, selection and drafts; generation targets derive from the same list. Saves and collection merge returned entries into the current list, and deletion and target selection update that owner directly. Reads wait for pending short writes and retry snapshots interrupted by later writes, retaining generated Contexts and retranscription source cleanup without overwriting saved notes. Refresh failures preserve existing data and expose retry. Long generation/transcription jobs remain independent of vocabulary editing. Story retains its artifact-specific collected-position query and historical target snapshots. [Vocabulary ownership acceptance](../.scratch/vocabulary-state/acceptance.md) records source-checkout native regression evidence; packaged verification remains a release check.

### Generated artifacts

Vocabulary Contexts include both historical and newly generated stories by stable target entry ID. Each story appears once, showing the first marked target sentence and opening that sentence in Story. Collected occurrences remain stored for contextual lookup, while duplicate story cards are collapsed on read. Entry edits preserve links and historical target snapshots; deleting and recreating an entry does not inherit the old links. Successful generation refreshes the notebook without a database migration.

Up to 20 selected vocabulary entries in one language can be sent to DeepSeek to generate one short passage in that language. Generation receives the selected lemma, contextual Chinese meaning, and available source sentence. Returned target IDs are structurally validated before the artifact and its language are saved. Filtering never omits selected targets from this check.

Saved artifacts include the passage, Chinese sentence translations, target annotations, a snapshot of the target vocabulary, creation time, elapsed generation time, requested model, and available provider metadata. Vocabulary can then be collected from artifact sentences, closing the learning loop.

Story collection refreshes saved occurrence highlights and a Collected Vocabulary list with its own entry count, preserving the historical Target Vocabulary snapshot. The host returns all collected contexts for the active artifact, including repeated positions and later sentences, independently of notebook card deduplication. [Story collection verification](../.scratch/story-vocabulary/acceptance.md) covers renderer updates, host persistence and the desktop bridge.

Story target words in the dropdown and sidebar open the corresponding Vocab entry by ID, including the correct sense through filters. Deleted targets report missing entries without recreating them or changing historical snapshots. The disabled word-action menu is removed. Mixed-language target selections preserve their checks and disable Continue.

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
- small application settings such as the current media or artifact, global video subtitle mask color and interface language.

Video mask settings are an optional field in the existing media learning JSON. Missing settings mean disabled; no table migration is required. The host validates bounded numeric regions, retains settings when older save requests omit them, and preserves them during successful retranscription.

The global mask color and interface language use the existing settings table with no learning-data migration. Color defaults to black; profiles without a language use the system default. Color-only and language-only updates preserve the other preference. Each video's region and enabled state stay in its learning JSON. The shared DeepSeek key remains in a Windows-encrypted host file; it is not stored in the settings table or returned to the renderer. Settings categories may save independently, with explicit results and retries for failed changes.

Large media files and local model resources are stored outside SQLite.

## 6. Verification state

The desktop implementation has automated coverage around listening processing/reveal behavior, managed media, desktop operations, vocabulary persistence, artifact generation, and media serving. The persistent listening, vocabulary, and generated-artifact slices have also been exercised during their task-level acceptance work.

The current frontend workspace has been implemented and locally verified. Native Electron acceptance covers shared Listen/Story selection, real Kiwi and bundled dictionary lookup, explicit cloud actions, translation cache reuse, failed refresh preservation, manual fallback, stale-result protection, suggestion application, discarded glosses, saving retry, source provenance, and notebook refresh. Cloud HTTP and local reference translation use deterministic fixtures in this acceptance; live provider translation quality is not assessed. Visual/product acceptance of the broader redesigned workspace is still evolving.

Task-specific verification records are indexed in [the task index](../.scratch/README.md). Superseded and completed delivery records live under `.scratch/archive/`; this document records only the resulting current state.

English native acceptance runs in an isolated profile and a second Electron process. It covers real Whisper transcription on offline synthetic speech, real spaCy and dictionary lookup, language confirmation/default, playback, masks, protected drafts, independent filters, two Story cycles and offline restoration. Provider requests in that UI run are deterministic fixtures. Separate live English generations verified supplied contextual senses, contractions, hyphens and regular inflection; plural/irregular generation quality remains unverified, and one malformed response was rejected. See [the quality report](../.scratch/archive/english-learning/quality-report.md).

[Vocabulary acceptance](../.scratch/vocab-ui/acceptance.md) passed 67 tests, lint, typecheck, desktop build, isolated native UI checks and a second-process restart. It covers load retry/stale reads, save visibility, protected notes, rollback-safe deletion, exact repeated-occurrence highlighting, Story navigation and mixed-language continuation. Controlled speech events test UI lifecycle; a separate real, muted English/Korean synthesis probe completed successfully. Audible speech quality and installed-package acceptance are unverified.

[Interface internationalization acceptance](../.scratch/i18n/acceptance.md) passed 79 tests, lint, typecheck, desktop build and isolated desktop/restart/browser checks. It includes failed/partial saves, owned failure language changes, native dialog options, narrow Settings layout and unchanged learning state. Processing/provider fixtures make this source-checkout behavior evidence; installed-package and owner visual acceptance of this iteration remain unverified.

[Story navigation and notices acceptance](../.scratch/story-navigation-notices/acceptance.md) passed 83 tests, lint, typecheck, desktop build and six isolated native-process phases. Controlled delayed replies, dirty drafts, generation retention, injected commit failure, bilingual narrow notices and before/after-commit recovery passed. Screenshot capture was unavailable; computed layout and native keyboard checks passed. Installed-package, screen-reader and owner visual acceptance remain unverified.

## 7. Current gaps

The main known gaps are:

- owner visual/product acceptance of the implemented frontend remains pending;
- automatic contextual dictionary disambiguation remains deferred;
- individual ASR word timestamps are not part of the persisted domain model;
- local Chinese translation can be literal or lossy; Korean uses an English pivot;
- English dictionary coverage and irregular generated inflections need broader quality review; real-speaker English ASR beyond the synthetic acceptance sample remains unverified;
- new cloud translations, contextual glosses and generated passages depend on the remote DeepSeek service; saved results and offline dictionary lookup remain local;
- personal Windows packaging and installed-cycle acceptance passed; clean-VM and broader codec qualification remain unverified ([delivery report](../.scratch/archive/desktop-learning/windows-packaging-acceptance.md));
- automatic subtitle-region detection, subtitle-track extraction/audio alignment and bitmap subtitle OCR remain deferred; manual subtitle masking is implemented.

See [ROADMAP.md](ROADMAP.md) for the work that follows from these gaps.

## 8. Documentation boundaries

Use these documents according to their role:

- [PRODUCT_SPEC.md](PRODUCT_SPEC.md): what Inflow should be — product behavior, scope, and boundaries.
- **PROJECT_STATUS.md**: what Inflow is now — implemented architecture, capabilities, verification state, and known gaps.
- [ROADMAP.md](ROADMAP.md): what comes next — remaining work, ordering, and dependencies.
- `docs/agents/`: how repository agents should work with domain documentation and the local issue workflow.
- [`.scratch/README.md`](../.scratch/README.md): active task entry points and historical evidence. Active specs and tickets live under `.scratch/<effort>/`; archived records under `.scratch/archive/` are not expected to describe current behavior.
