# Vocabulary selection and lookup: design and acceptance (historical)

Verified 2026-10-02. See [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior.

## Decisions and interaction

Listen and Story share an in-place single-word collection flow. A selection is tied to the original sentence, source offsets and media or generated-artifact provenance. Contextual Kiwi analysis suggests a dictionary form (lemma); the learner may correct it and enter a Chinese contextual meaning manually. Lookup failure never prevents manual collection.

Initial selection accepts one continuous word without internal whitespace; cross-sentence, hidden-text and multiword selections are rejected or require reselection. Korean endings and particles may remain in the captured surface. This is an interaction rule, not a linguistic correctness guarantee. An unedited draft may close; edited drafts require save or discard before navigating. Delayed lookup results cannot replace a newer selection or a user-corrected lemma; failed save retains the draft.

The migration retained existing vocabulary IDs, ordering, selected state and source relationships, with uniqueness scoped to language, lemma and meaning. English analysis was deferred in this *historical* delivery and was implemented later; the deferral is not current product status.

## Verification boundary

Acceptance passed 24 host tests, seven Python tests with real Kiwi, lint, typecheck, desktop build and native Electron interaction checks. Scenarios included pointer selection, UTF-16 offsets, irregular predicates, repeated words, draft/navigation protection, stale responses, save retry, source navigation and sense deduplication. These were scoped fixture and local checks, not exhaustive multilingual quality testing.

The original interview notes, detailed acceptance and summary were consolidated here.
