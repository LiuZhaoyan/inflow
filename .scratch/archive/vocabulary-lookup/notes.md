# Vocabulary Lookup Design Notes

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

This is a design interview record, not an implementation specification.

## Confirmed decisions

Confirmed by the learner on 2026-10-02:

- Korean is the initial source language; English support is planned for later.
- The learner chooses the source language when importing media, and that choice is saved with the material. Initial scope assigns one language to each media item. Automatic language detection may later suggest a default.
- Contextual meanings remain in Chinese for both Korean and English. Configurable meaning languages are outside this scope.
- Vocabulary collection and management are limited to individual words. Phrase and grammatical-construction entries are outside the current scope.
- A selection clearly containing multiple words prompts the learner to narrow it to one word. The selection remains available for adjustment; it is not automatically split into entries.
- Failed lookup does not block collection. The learner may enter the dictionary form and contextual Chinese meaning manually, and may correct an automatic dictionary-form suggestion.
- The initial word-selection boundary is a continuous selection with no internal whitespace. Korean endings and particles may remain in the encountered surface form. Multiword selections prompt reselection; multiword English expressions are outside this scope. This is a selection rule, not a guarantee of linguistic analysis.
- Changing the selection or active sentence closes an unedited collection draft. A manually edited draft requires saving or explicitly discarding before replacement. Interacting with the popover preserves the captured surface form and source context.
- Listen and Story both use the same selection-to-lookup-to-local-save flow, preserving their respective media or artifact provenance.

## Agreed first implementation

- Selecting eligible revealed text opens a lightweight collection popover in the current learning view. Collection does not navigate to the vocabulary notebook.
- Lookup is read-only and separate from saving. Korean dictionary-form suggestions use the existing local Kiwi parser and the source sentence; English analysis will be added later.
- Contextual Chinese meaning is entered manually in the first implementation. Automatic contextual gloss generation is deferred.
- The learner can edit the suggested dictionary form and must confirm collection. Saving reuses the existing vocabulary operation and provenance validation.
- Source language belongs to the learning material and vocabulary identity. Adding English must keep entries of different source languages distinct.

Domain terms are defined in [CONTEXT.md](../../../CONTEXT.md).

## Acceptance criteria

- Selecting a supported Korean word such as `갔어요` in a revealed sentence opens the popover and suggests `가다`; the learner can supply a Chinese meaning and save without leaving Listen.
- A selection with internal whitespace prompts the learner to select one word and creates no entry. Selection across sentences or hidden text is rejected.
- Lookup alone creates no vocabulary entry. Lookup failure still permits manual dictionary-form and meaning entry.
- Clicking a popover input preserves the selected surface and original source context. A late lookup result cannot overwrite another selection or a manually corrected dictionary form.
- Replacing an edited draft requires an explicit save or discard; failed saving retains the draft for correction or retry.
- Collection from Listen and Story retains the correct host-validated source sentence and media or artifact identity. Existing repeated-encounter deduplication remains in use.
- Saved vocabulary remains available in the vocabulary notebook for later management.
