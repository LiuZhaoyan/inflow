# English learning: implementation and acceptance (historical)

Implemented and source-checkout verified on 2026-10-04. Current behavior: [Project Status](../../../docs/PROJECT_STATUS.md). Remaining semantic quality concerns: [live quality report](quality-report.md).

## Product and architecture decisions

English extends the existing media → listening → vocabulary → Story → vocabulary loop; Korean and English coexist without separate libraries or databases. The learner confirms the source language on import; cancellation does not confirm it and the last confirmed choice is remembered. Whisper receives the confirmed language; Korean segmentation uses Kiwi and English uses a prepared local spaCy pipeline. The English parser handles contextual lemmas, source offsets, sentence boundaries and groups, including contractions, apostrophes and hyphenated words.

Vocabulary preserves complete selected surfaces, language, contextual Chinese meanings and media/Story provenance. Manual entries require a language. Generation rejects mixed-language target selections, while filtering does not clear selections. Saved artifacts retain language, Chinese translations, annotations and immutable target snapshots. Legacy data defaults to Korean. Local English dictionary data is bundled with source/licensing notices; models are prepared separately.

## Verified acceptance

At the time, 35 host tests, 14 Python worker/import/setup tests, typecheck, lint, desktop build and native workflow checks passed. Cases covered inflection, proper names, Unicode/UTF-16 offsets, quoted words, contractions vs possessives, hyphens, import/retranscription, translation/cache/restart, source provenance, language mixing and migration compatibility. A prepared English pipeline could be reused after interrupted extraction.

This established scoped functionality, not exhaustive real-speaker transcription or semantic generation quality. The separate [quality report](quality-report.md) records real DeepSeek attempts, an invalid inflection response, and limits on topic/tense adherence. The original long specification and overlapping acceptance summary were retired; use current product documents for active requirements.
