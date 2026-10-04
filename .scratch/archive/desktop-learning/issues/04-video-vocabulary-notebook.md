# 04: Collect source-linked vocabulary from video

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../../README.md) for remaining work.

Status: completed
Progress: implemented and verified on native Windows on 2026-10-01.
Blocked by: [03: Restore a processed video in the desktop application](03-persistent-desktop-listening.md).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../spec.md).

## What to build

The learner collects vocabulary from a media sentence or adds it manually, reviews its dictionary form and contextual meaning, and finds it in a persistent vocabulary notebook.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [x] Collect an encountered surface form from visible transcript text, retaining the original sentence and stable source reference.
- [x] Let the learner enter or correct the Korean dictionary form and contextual Chinese meaning before saving and later correct the entry.
- [x] Support manual additions without inventing a source sentence.
- [x] Distinct meanings of the same dictionary form remain distinguishable; further occurrences can retain additional source contexts without overwriting earlier context.
- [x] The notebook displays saved entries, supports target selection and retains entries/occurrences after restart.
- [x] Changes are saved through the same application operations interface and preserve associated media records.

## Verification

Media sentence → entry review/save → notebook → restart tests, distinct-meaning/additional-occurrence cases, plus the actual collection and correction interaction on Windows.

## Specification coverage

User stories 17–21.

## Comments

Published after the owner approved the seven-ticket breakdown and blocking edges on 2026-09-30. [Acceptance evidence](../vocabulary-notebook-acceptance.md) records real SQLite migration, preservation and restart checks plus native collection, correction, manual additions, source navigation and selected-target restoration. Ticket 05 is now unblocked by this slice.
