# Task Index

Updated: 2026-10-03

Use [Product Specification](../docs/PRODUCT_SPEC.md) for intended behavior, [Project Status](../docs/PROJECT_STATUS.md) for implemented behavior, and [Roadmap](../docs/ROADMAP.md) for sequencing. This index identifies actionable task records and historical evidence.

## Active work

| Effort | Current boundary | Entry point |
| --- | --- | --- |
| English learning | Implemented source-checkout learning loop; broader linguistic quality and packaged Windows delivery remain separate. | [Spec](english-learning/spec.md), [acceptance](english-learning/acceptance.md), [live quality review](english-learning/quality-report.md) |
| Windows runtime | Worker packaging is unstarted and unblocked; installed-cycle acceptance depends on packaging. | [Remaining desktop tickets](desktop-learning/README.md) |
| Frontend workspace | The implemented Listen, Story and Vocabulary interface still needs owner visual acceptance. | [Visual acceptance](frontend-workspace/spec.md) |
| Subtitle-region mask | Confirm interaction and persistence before implementation; separate from sentence meaning-group masks. | [Ticket 08](desktop-learning/issues/08-subtitle-mask.md) |

## Historical records

The following records were archived on 2026-10-03. Their status fields, test counts, proposed models and descriptions of then-current behavior are historical, not current instructions or new acceptance claims.

| Effort | Retained evidence |
| --- | --- |
| Desktop foundation | [Original MVP spec](archive/desktop-learning/spec.md), [ticket sequence](archive/desktop-learning/ticket-plan.md), completed tickets 01–05, research and listening/vocabulary/artifact acceptance. Packaging and installed acceptance remain active above. |
| Frontend implementation | [Original workspace phase](archive/frontend-workspace/spec.md), [listening acceptance](archive/frontend-workspace/acceptance.md), [Story and Vocabulary acceptance](archive/frontend-workspace/reading-vocab-acceptance.md). Later implementations supersede temporary Story hiding and the original collection form. |
| Sentence masks | [Implemented mask contract and verification](archive/sentence-masks/spec.md). |
| Vocabulary lookup | [Original decisions](archive/vocabulary-lookup/notes.md) and [acceptance](archive/vocabulary-lookup/acceptance.md), preceding bundled dictionary and cloud-gloss additions. |
| Translation and meanings | [Decisions](archive/translation-lookup/notes.md), [review](archive/translation-lookup/review.md) and [acceptance](archive/translation-lookup/acceptance.md). |

Verification scripts, fixtures, design references and generated evidence remain at their existing paths. Moving a Markdown record does not retire its verification utility. Historical generated outputs remain evidence of their recorded run, not evidence that the current application has been reverified.
