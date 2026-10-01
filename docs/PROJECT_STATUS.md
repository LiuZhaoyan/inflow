# Inflow Project Status

Last verified: 2026-10-01

This document is the canonical snapshot of what Inflow implements now. Product intent and scope belong in [PRODUCT_SPEC.md](PRODUCT_SPEC.md); future work belongs in [ROADMAP.md](ROADMAP.md). Task-level specs, tickets, research, and acceptance evidence remain under `.scratch/`.

## 1. Current product state

Inflow currently runs as a Windows-oriented Electron desktop application with a React/Next.js renderer. The implemented learning loop is:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

The desktop host owns persistence, managed media, local processing, and generation credentials. The renderer communicates with those capabilities through the preload/DesktopBridge contract rather than owning desktop business logic directly.

The current frontend workspace supports media import and processing, full and sentence playback, sentence navigation and looping, progressive source-text reveal, independent Chinese translation, source-linked vocabulary collection, and a local Library view. The vocabulary-to-artifact functionality exists in the desktop operations and persistence layer, while its frontend flow is currently hidden pending redesign.

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

Electron loads a static Next.js export. Managed media is served through the custom `inflow://` protocol with byte-range support for seeking and sentence playback. No local HTTP server is required by the desktop runtime.## 3. Implemented learning domains

### Media and listening

Imported audio or video is copied into application-managed storage and identified by SHA-256. Processing results are stored and restored with the learning position and playback preferences. Missing managed media can be re-associated only when the selected file matches the original hash.

Local transcription uses faster-whisper with Korean word timestamps enabled. Kiwi uses the recognized text to determine sentence boundaries and grammatical phrase groups. The persisted listening model is sentence-level:

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

Vocabulary entries store a Korean lemma, contextual Chinese meaning, selection state, and one or more source occurrences. Sources can point either to a media segment or to a sentence in a generated artifact.

Entries are unique by lemma plus meaning, so distinct senses remain separate while repeated encounters with the same sense can accumulate source contexts. Re-transcription preserves old segments that are still referenced by vocabulary provenance.

### Generated artifacts

Up to 20 selected vocabulary entries can be sent to DeepSeek to generate one short Korean learning passage. Generation receives the selected lemma, contextual Chinese meaning, and available source sentence. Returned target IDs are structurally validated before the artifact is saved.

Saved artifacts include the passage, Chinese sentence translations, target annotations, a snapshot of the target vocabulary, creation time, elapsed generation time, requested model, and available provider metadata. Vocabulary can then be collected from artifact sentences, closing the learning loop.## 4. Processing and service boundaries

Transcription, sentence segmentation, and translation run locally. The current processing path is:

```text
media
  ↓
faster-whisper
  ↓
word-aligned Korean recognition
  ↓
Kiwi sentence splitting + phrase grouping
  ↓
Segment[]
```

Chinese translation is also local and currently uses a Korean → English → Chinese CTranslate2 pipeline. The English pivot is an implementation detail of the current translation models, not part of the product domain model.

Passage generation is not local. It uses the DeepSeek Responses API and therefore requires network access and an owner-configured credential. Saved media, learning state, vocabulary, provenance, and generated artifacts remain local.

## 5. Persistence

The Electron host stores learning records in SQLite. The current persisted domains are:

- media and learning state;
- active and provenance-retained segments;
- vocabulary entries and media-source occurrences;
- generated artifacts and artifact-source vocabulary occurrences;
- small application settings such as the current media or artifact.

Large media files and local model resources are stored outside SQLite.

## 6. Verification state

The desktop implementation has automated coverage around listening processing/reveal behavior, managed media, desktop operations, vocabulary persistence, artifact generation, and media serving. The persistent listening, vocabulary, and generated-artifact slices have also been exercised during their task-level acceptance work.

The current frontend workspace has been implemented and locally verified. Visual/product acceptance of the redesigned workspace is still evolving, and the vocabulary/artifact UI is intentionally awaiting its next redesign rather than representing the final product flow.

Task-specific verification records live under `.scratch/`; this document records only the resulting current state.

## 7. Current gaps

The main known gaps are:

- the frontend is being redesigned around the existing desktop/domain capabilities;
- the vocabulary → artifact → vocabulary cycle needs to be reintroduced through the new frontend;
- individual ASR word timestamps are not part of the persisted domain model;
- local Chinese translation depends on an English pivot and can be literal or lossy;
- generated passages depend on the remote DeepSeek service;
- packaged processing resources and installed-application acceptance are not yet complete;
- subtitle masking is deferred work.

See [ROADMAP.md](ROADMAP.md) for the work that follows from these gaps.

## 8. Documentation boundaries

Use these documents according to their role:

- [PRODUCT_SPEC.md](PRODUCT_SPEC.md): what Inflow should be — product behavior, scope, and boundaries.
- **PROJECT_STATUS.md**: what Inflow is now — implemented architecture, capabilities, verification state, and known gaps.
- [ROADMAP.md](ROADMAP.md): what comes next — remaining work, ordering, and dependencies.
- `docs/agents/`: how repository agents should work with domain documentation and the local issue workflow.
- `.scratch/<effort>/`: task execution history — specs, research, tickets, decisions, and acceptance evidence. These records are not expected to remain current after an effort finishes.
