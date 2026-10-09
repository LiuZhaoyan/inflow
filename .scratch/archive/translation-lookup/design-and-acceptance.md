# Translation and contextual meaning: design and acceptance (historical)

Verified 2026-10-02. Current behavior: [Project Status](../../../docs/PROJECT_STATUS.md).

## Decisions and behavior

Listen translates a sentence only on explicit request, with neighboring sentence context. A successful result is cached against the source sentence and input context for revisit/restart. Refresh replaces it only on success; failure/cancellation preserves the prior translation. Local reference translation is an explicit fallback, not a silent substitution. Story uses saved translations.

Korean vocabulary selection uses contextual Kiwi analysis and a bundled KRDict Chinese snapshot (42,908 headwords at acceptance). The learner may choose among senses, correct the lemma and meaning, or explicitly request a contextual cloud gloss. Selecting text alone does not call the cloud. Uncollected glosses are discarded; a delayed reply cannot silently overwrite intervening user edits. The same exact saved occurrence can reuse its collected meaning, while other contexts only suggest candidates. Existing vocabulary provenance and sense identity are retained. Sentence translation and word gloss share stored credentials but have independent request settings.

## Verification and limitations

Acceptance passed 28 host tests, eight Python tests, typecheck, lint, desktop build and native Electron/SQLite fixture checks with real Kiwi and dictionary. Scenarios included caching, context, refresh failure, cancellation, manual fallback, UTF-16 selection offsets, protected drafts, retry and provenance. Native fixture results used deterministic provider replies, not paid live quality evaluation.

Original notes, acceptance detail and summary were merged here. Provider behavior and dictionary coverage must be checked against the current implementation.
