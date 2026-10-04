# Desktop Learning Direction

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Status: shared understanding, testing boundary and seven-ticket breakdown confirmed on 2026-09-30; first-gate preparation implemented, native Windows and live generation evidence pending.
Updated: 2026-09-30

## Confirmed direction

- Build for the owner’s personal use first, with Windows as the first supported operating system.
- Korean is the first supported learning language.
- Provide an installable desktop application and retain learning materials locally. Desktop delivery does not require all model inference to run offline; the processing boundary remains open.
- Connect the learning flow: source video → sentence-by-sentence listening → collect unfamiliar words → generate learning passages → study those passages.
- Allow manual additions to the vocabulary notebook and preserve the source sentence when collecting vocabulary from media.
- Vocabulary entries retain the Korean dictionary form, contextual Chinese meaning, original sentence and source, and allow learner corrections.
- The first delivery generates text passages without requiring generated audio. Video learning retains sentence-by-sentence listening; generated-passage learning does not require spoken audio or timed playback.
- Generate one passage per selected set of target vocabulary; do not split the selection across multiple passages by default.
- Selecting target vocabulary is sufficient to generate a passage. A topic is optional; the initial passage length is fixed to a short passage rather than exposed as a separate setting.
- Every selected target word must appear with the meaning recorded in its vocabulary entry. Normal Korean inflection counts as use; exact dictionary-form spelling is not required.
- Do not require a difficulty level. Vocabulary outside the selected targets should be common and everyday; this does not imply that the learner already knows every supporting word.
- Save generated results as learning artifacts. Allow collection of further unfamiliar words from these artifacts, forming a repeated vocabulary → passage → vocabulary learning cycle.
- Highlight target vocabulary in each learning artifact. Keep its Chinese translation hidden initially and allow the learner to reveal it on demand.
- Vocabulary collected from an artifact retains that artifact as its source and the sentence in which it occurred.
- The owner accepts configuring their own API keys. Prefer suitable free API allowances where available, but no provider has been selected.
- First evaluate the existing local transcription path with a real Korean video. Compare an online candidate if processing time or recognition errors interfere with learning; do not adopt or implement a second transcription backend in advance.
- Continue in WSL while useful; move development or validation to native Windows if a concrete limitation requires it.

## Existing implementation and planning context

- Media import, local transcription and sentence playback already have an implementation, while vocabulary collection, passage generation and persistent learning storage do not.
- [PRODUCT_SPEC.md](../../../docs/PRODUCT_SPEC.md) and [ROADMAP.md](../../../docs/ROADMAP.md) are the product and delivery planning sources. The September 30 specification phase updates their earlier mobile-first browser target to the confirmed Windows desktop learning loop.
- Current processing is Korean-specific. The existing transcription path invokes a local Python worker and downloaded model weights; it does not call an online speech-recognition API.
- [Speech API research](speech-api-options.md) records official free-tier conditions for Groq transcription and Azure Speech. It is candidate evidence, not a provider selection or a tested Korean-quality comparison.

## Confirmed first-delivery acceptance scenario

1. Open a Korean video and obtain transcript text with playable sentence ranges.
2. Listen sentence by sentence and collect unfamiliar words, retaining dictionary forms, contextual Chinese meanings, original sentences and source references.
3. Select vocabulary and optionally provide a topic; generate one short Korean passage using all selected words in their intended meanings and common supporting vocabulary.
4. Save the passage as a text-only learning artifact, read it with target words highlighted, and reveal its Chinese translation as needed.
5. Collect further unfamiliar words from the artifact and use them in another generation.
6. Close and reopen the application; saved media-processing results, vocabulary and artifacts remain available.

## Implementation decisions and evidence still needed

- [The technical investigation](technical-recommendation.md) supplies the Electron/static-Next and SQLite design baseline adopted in [the implementation specification](spec.md). Generation-provider access/quality and packaged runtime compatibility still require empirical evidence.
- Evaluate local transcription speed, accuracy and sentence timing using representative media before confirming the final desktop transcription approach.
- Validate the Electron/static-Next design, packaged Windows worker and builtin SQLite compatibility adopted in the specification.
- Confirm access and learning quality for the single generation-provider candidate using the owner's configured credentials.
- Define evidence for target-word coverage, contextual word usage and common supporting vocabulary. Semantic quality requires review of representative generated passages; lexical checks alone do not prove it.

## Scope revision

The earlier interview proposed generated audio and sentence replay for learning artifacts. The owner subsequently clarified that generating text does not require generating audio. Audio generation is therefore outside the first-delivery requirement; any later audio capability needs its own scope decision.

The owner explicitly confirmed shared understanding after the technical investigation, approved the testing boundary and then approved the seven-ticket breakdown and blocking edges. [The approved ticket breakdown](ticket-plan.md) links the published issues. Preparation for tickets 01 and 02 is implemented; their native Windows and authenticated Korean-quality evidence remains pending. The owner selected DeepSeek and the previous WIKITONGUES Hanbid Korean sample. Later desktop, vocabulary, artifact and packaging tickets remain blocked and have not started.
