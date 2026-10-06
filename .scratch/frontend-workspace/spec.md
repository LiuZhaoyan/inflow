# Frontend Workspace Visual Acceptance

Status: needs-info
Updated: 2026-10-04

The Listen, Story and Vocabulary workspace is implemented and has recorded local verification. Owner visual acceptance remains pending; this record does not claim that approval or a new runtime verification.

## Current scope

Review the current workspace against the owner-supplied visual references and [Product Specification](../../docs/PRODUCT_SPEC.md). Story reading and generation are available. Listen and Story use the shared collection popover; source text is visible outside Listen mask mode. The historical phase's temporary Story hiding and separate vocabulary confirmation form are superseded.

## Remaining acceptance

- [ ] Review the current Listen, Context and Library layout, including stable sentence-mask geometry and visible keyboard focus.
- [ ] Review the current Story and Vocabulary layouts against the supplied references.
- [ ] Record any concrete visual discrepancies separately from already verified host persistence and learning behavior.
- [ ] Record the owner's visual acceptance or the specific remaining changes.

## Existing evidence

Library refinement verified on 2026-10-04: the drawer slides in from the left, meets the Header without a gap, touches the left and bottom edges, and has square outer corners. A filter icon beside search opens the collapsed Language menu; choosing a language collapses it and retains the active filter indicator. Escape dismisses the menu before closing the drawer. Reduced-motion preference disables the slide animation.

Vocabulary now uses the same collapsed Language menu pattern. Choosing a language closes the menu and returns focus to the filter icon; Escape also closes it. The existing source filters stay visible and combine with the language filter.

`npm run desktop:build`, `npm run lint` and `node .scratch/frontend-workspace/verify-library.cjs` passed. The isolated native check uses real host storage and IPC with synthetic audio and saved Story fixtures; it does not contact a model provider. It verified Korean/English media and Story filtering, search, keyboard activation, close/reopen behavior, and drawer geometry at 1440×900 and 390×760. Vocabulary language and source filtering passed; its menu remains within the list panel at 1440×900 and 1100×800, with no horizontal overflow in the narrower desktop window. Evidence is under `.scratch/desktop-learning/generated-samples/library-native-MGNI3x/`; the collapsed and expanded filter screenshots were inspected. Owner visual acceptance remains pending.

- [Original phase and its dated checklist](../archive/frontend-workspace/spec.md).
- [Listen workspace verification](../archive/frontend-workspace/acceptance.md).
- [Story, Vocabulary and native header verification](../archive/frontend-workspace/reading-vocab-acceptance.md).
- [Sentence-mask verification](../archive/sentence-masks/spec.md).

Verification utilities and design references remain at their original locations. This visual acceptance effort does not include subtitle-region masking or English implementation.
