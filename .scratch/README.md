# Task Index

Updated: 2026-10-08

Use [Product Specification](../docs/PRODUCT_SPEC.md) for intended behavior, [Project Status](../docs/PROJECT_STATUS.md) for implemented behavior, and [Roadmap](../docs/ROADMAP.md) for sequencing. This index identifies actionable task records and historical evidence.

## Active work

| Effort | Current boundary | Entry point |
| --- | --- | --- |
| English quality | Implementation is complete; real-speaker audio, dictionary coverage and irregular generated forms need broader evaluation. | [Remaining quality work](english-learning/README.md) |
| Windows runtime | Worker packaging is unstarted and unblocked; installed-cycle acceptance depends on packaging. | [Remaining desktop tickets](desktop-learning/README.md) |
| Frontend workspace | The implemented Listen, Story and Vocabulary interface still needs owner visual acceptance. | [Visual acceptance](frontend-workspace/spec.md) |
| Video mask acceptance | Manual masking is implemented; owner visual acceptance and maximized native-window/installed-package checks remain pending. | [Remaining acceptance and deferred work](video-subtitles/README.md) |
| Application settings | Implemented on main; automated native acceptance and restart passed. Owner visual acceptance remains pending. | [Settings specification](settings/spec.md), [acceptance](settings/acceptance.md) |
| Learning artifact state | Shared ownership is implemented and verified; overlapping Story request ordering requires reproduction as a separate TODO. | [Refactor and verification](artifact-state/spec.md), [reproduction TODO](artifact-state/issues/01-reproduce-story-request-ordering.md) |

## Historical records

The foundation records were archived on 2026-10-03; completed English and manual video-mask records were archived on 2026-10-06. Their status fields, test counts, proposed models and descriptions of then-current behavior are historical, not current instructions or new acceptance claims.

| Effort | Retained evidence |
| --- | --- |
| Desktop foundation | [Original MVP spec](archive/desktop-learning/spec.md), [ticket sequence](archive/desktop-learning/ticket-plan.md), owner quality approvals in tickets 01–02, research and listening/vocabulary/artifact acceptance. Completed tickets 03–05 are consolidated into their acceptance reports. Packaging and installed acceptance remain active above. |
| Frontend implementation | [Original workspace phase](archive/frontend-workspace/spec.md), [listening acceptance](archive/frontend-workspace/acceptance.md), [Story and Vocabulary acceptance](archive/frontend-workspace/reading-vocab-acceptance.md). Later implementations supersede temporary Story hiding and the original collection form. |
| Sentence masks | [Implemented mask contract and verification](archive/sentence-masks/spec.md). |
| Vocabulary lookup | [Original decisions](archive/vocabulary-lookup/notes.md) and [acceptance](archive/vocabulary-lookup/acceptance.md), preceding bundled dictionary and cloud-gloss additions. |
| Translation and meanings | [Decisions](archive/translation-lookup/notes.md) and [acceptance with consolidated review](archive/translation-lookup/acceptance.md). |
| English implementation | [Confirmed spec](archive/english-learning/spec.md), [acceptance with consolidated review](archive/english-learning/acceptance.md) and [dated live quality probes](archive/english-learning/quality-report.md). Remaining quality work is indexed above. |
| Manual video subtitle mask | [Design interview](archive/video-subtitles/spec.md), [acceptance](archive/video-subtitles/acceptance.md) and [feasibility research](archive/video-subtitles/research.md). Completed ticket 08 is consolidated into the design and acceptance records. Deferred extraction designs are historical context; remaining acceptance is indexed above. |

Verification scripts, fixtures, design references and generated evidence remain at their existing paths. Moving a Markdown record does not retire its verification utility. Historical generated outputs remain evidence of their recorded run, not evidence that the current application has been reverified.

Sentence-mask and retranscription verification directories were moved from `build/` to `.scratch/desktop-learning/generated-samples/` on 2026-10-06. Their screenshots, fixtures, runners and recorded results are retained. Verification outputs belong under `.scratch/`; `build/` is reserved for regenerable application build output.

Archive cleanup on 2026-10-06 removed nine redundant or superseded records, retaining final decisions, owner approvals, acceptance evidence, provenance and research relevant to remaining work. Resolved English and translation review findings were consolidated into acceptance reports. The archive contains Markdown only; no download caches, temporary builds or large generated artifacts were present within this cleanup scope.
