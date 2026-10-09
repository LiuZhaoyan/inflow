# Task Index

Updated: 2026-10-09

Intended behavior: [Product Specification](../docs/PRODUCT_SPEC.md) · implemented behavior: [Project Status](../docs/PROJECT_STATUS.md) · sequencing: [Roadmap](../docs/ROADMAP.md). This index lists remaining actionable work; completed records live under [archive/](archive/) and are historical evidence, not current instructions.

## Active work

| Effort | Remaining | Entry point |
| --- | --- | --- |
| English quality | Broaden evaluation: real-speaker audio, dictionary coverage, irregular generated forms. | [english-learning/README.md](english-learning/README.md) |
| Windows runtime | Ticket 06 worker packaging (in progress, 2026-10-09) → ticket 07 installed learning-cycle acceptance. | [desktop-learning/README.md](desktop-learning/README.md) |
| Video mask follow-up | Maximized native-window verification; installed-app masking check after packaging. | [video-subtitles/README.md](video-subtitles/README.md) |

Owner visual acceptance of the workspace, settings screens and native-window video masking was recorded on 2026-10-09 in [frontend-workspace/spec.md](frontend-workspace/spec.md) and [settings/spec.md](settings/spec.md); those records await archiving.

## Historical records

| Effort | Evidence |
| --- | --- |
| Desktop foundation | [MVP spec](archive/desktop-learning/spec.md) · [ticket plan](archive/desktop-learning/ticket-plan.md) · [listening acceptance](archive/desktop-learning/desktop-listening-acceptance.md) · [text artifact acceptance](archive/desktop-learning/text-artifact-acceptance.md) · [vocabulary notebook acceptance](archive/desktop-learning/vocabulary-notebook-acceptance.md) · research notes and archived tickets 01–02 |
| Frontend implementation | [spec](archive/frontend-workspace/spec.md) · [listening acceptance](archive/frontend-workspace/acceptance.md) · [Story/Vocabulary acceptance](archive/frontend-workspace/reading-vocab-acceptance.md) |
| Sentence masks | [mask contract](archive/sentence-masks/spec.md) |
| Vocabulary lookup | [decisions](archive/vocabulary-lookup/notes.md) · [acceptance](archive/vocabulary-lookup/acceptance.md) |
| Translation lookup | [decisions](archive/translation-lookup/notes.md) · [acceptance](archive/translation-lookup/acceptance.md) |
| English implementation | [spec](archive/english-learning/spec.md) · [acceptance](archive/english-learning/acceptance.md) · [quality probes](archive/english-learning/quality-report.md) |
| Video subtitle masking | [design](archive/video-subtitles/spec.md) · [acceptance](archive/video-subtitles/acceptance.md) · [extraction research](archive/video-subtitles/research.md) |
| Learning artifact state | [scope](archive/artifact-state/spec.md) · [flow deepening](archive/artifact-state/issues/02-evaluate-story-flow-deepening.md) · [request ordering report](archive/artifact-state/request-ordering-report.md) |

When an effort is archived, its retired verification scripts are deleted; commands recorded in archived records are historical descriptions, not maintained entry points. Generated evidence stays under `.scratch/`, not `build/`.
