# Learning cycle and generation quality acceptance (historical)

This record consolidates the completed listening, vocabulary notebook, text-artifact and generation-quality acceptance work from October 2026. Current behavior is documented in [Project Status](../../../docs/PROJECT_STATUS.md); the initial requirements are in [MVP specification](spec.md).

## Listening and media

The native Windows listening workflow was exercised with real Korean media: import and managed-media persistence, transcription, sentence navigation, playback/seek/loop, and restoration. Automatic transcripts and translations are learning aids, not verified ground truth. Processing/model availability and packaging limitations are separately documented in [Windows installed acceptance](windows-packaging-acceptance.md).

## Vocabulary and sources

Vocabulary collection was verified from source-linked listening sentences. Stored entries preserve contextual meanings and source occurrences so the user can navigate back to the original context. Generated text can also contribute vocabulary, with artifact-linked context rather than requiring a media provenance. The source model and UI evolved after the original acceptance; inspect the current schema before extending it.

## Generated text artifacts

The initial flow generated Korean text using selected vocabulary, displayed target highlights and on-demand Chinese translations, saved the artifact, and supported collecting vocabulary from it for another generation. Validation rejects incomplete or malformed responses, unknown target identifiers and unsupported extra output fields. A target-ID annotation alone does not prove that the Korean surface form has the intended lemma or meaning.

## Authenticated generation quality baseline

On 2026-10-01 the DeepSeek `deepseek-flash` adapter completed four prepared authenticated cases. Observed latencies were 1,765 / 2,013 / 1,598 / 2,492 ms, with 1,833 input and 1,666 output tokens in total. The owner accepted the baseline while noting limited coherence for inflection and awkward phrasing with unrelated targets. This was a scoped quality acceptance, not proof of error-free Korean.

The original prepared cases covered everyday vocabulary with a topic, mixed verb/adjective/noun forms, ambiguous lemmas with source meanings, and a larger unrelated-word selection. The evaluation runner was `scripts/evaluate-generation.ts`; the original local evidence was under `.scratch/desktop-learning/generated-samples/run-2026-10-01T03-34-27-466Z-990f1311/` (may not be present on other checkouts).

## Acceptance boundary

These checks were scoped to the then-current desktop learning cycle, not clean-machine qualification, exhaustive transcription accuracy or exhaustive semantic validation. For the later installed end-to-end learning cycle and retained failure-mode evidence, see [Windows installed acceptance](windows-packaging-acceptance.md).
