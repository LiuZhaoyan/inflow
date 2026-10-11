# Inflow Roadmap

Last updated: 2026-10-11

This document describes what comes next for Inflow: remaining work, ordering, and dependencies. Product behavior and scope belong in [PRODUCT_SPEC.md](PRODUCT_SPEC.md); implemented capabilities and completed milestones belong in [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Current direction

The Korean and English desktop learning loops, frontend visual acceptance, Settings, and personal Windows installer have reached their recorded acceptance boundaries. See [Project Status](PROJECT_STATUS.md) and [the task index](../.scratch/README.md) for current implementation and completed evidence.

Next work is demand-driven quality improvement and release qualification rather than rebuilding the existing foundation.

[Interface internationalization](../.scratch/i18n/spec.md) is specified and `ready-for-agent`: add Simplified Chinese and English interfaces with saved language preferences while preserving source-language learning content and Chinese assistance. Implementation and acceptance have not started.

## 1. Release qualification

Before a broader packaged release:

- Verify subtitle masking and Settings in the installed package, including an actual maximized window.
- Consider clean-VM installation and broader media codec compatibility tests. These were outside the completed personal-installation acceptance boundary.
- Preserve installed-app behavior, not merely source-checkout execution, as the release acceptance boundary.

The prior [Windows packaging acceptance](../.scratch/archive/desktop-learning/windows-packaging-acceptance.md) provides the baseline.

## 2. Quality evaluation

### English learning (deferred)

Broader English quality evaluation is postponed by owner choice. When resumed:

- Test real-speaker audio, varied accents, and phrase grouping beyond synthetic acceptance.
- Review irregular and plural generated forms and topic adherence, preserving failures as evidence.
- Sample offline English–Chinese dictionary coverage and candidate quality while retaining manual entry.
- Keep deterministic provider fixtures separate from live linguistic quality evidence.

See [English acceptance and quality evidence](../.scratch/archive/english-learning/implementation-and-acceptance.md).

### Translation and vocabulary

Evaluate live cloud translations and offline dictionary candidates against representative Korean and English learning sentences. Local reference translations may be literal or lossy. Keep saved learning results independent of the current provider.

Automatic contextual sense selection remains deferred. An optional cloud Jev selection from offline candidates would require explicit opt-in for automatic requests; offline choices and manual editing must remain available. Local JevEmbed deployment and evaluation are not planned.

## 3. Listening data: expand only for concrete UX needs

The persisted Segment model remains sentence-level, without individual word timestamps.

Do not expand it merely because Whisper has finer alignment internally. First establish a concrete need such as word highlighting, word-level seeking, or transcript/timing correction. If confirmed, define migration and provenance behavior before persisting alignment.

## 4. Known architectural risk

The [artifact request-ordering investigation](../.scratch/archive/artifact-state/architecture-and-verification.md) documents renderer/persistence divergence under controlled delayed replies. This remains unfixed and should be revisited when relevant work touches artifact state or request ordering.

## 5. Deferred product opportunities

- Subtitle text-track reuse and audio alignment; subtitle extraction was removed from the October 5 iteration. Automatic subtitle-region detection is also deferred. See [subtitle research](../.scratch/archive/video-subtitles/implementation-and-acceptance.md).
- Experiment with OCR for image-based subtitle tracks only after assessing Korean/English accuracy, cleanup, cue timing, and Windows resource costs on representative samples. Speech transcription remains the fallback.
- Phrase and grammatical-construction collection remains outside current scope for both languages.
- Provider, endpoint, and per-task model controls in Settings remain deferred; task-specific generation settings stay in code.
- Other demand-driven possibilities: A–B looping, revisit marks, notes, lightweight transcript/timing correction, generated audio/TTS, and additional platforms.

Future pronunciation setting: let learners choose a pronunciation method in Settings. [Vocabulary acceptance](../.scratch/vocab-ui/acceptance.md) records local system speech for dictionary forms; alternative methods and implementation timing remain undefined, and the Settings selector is outside this iteration.

These are opportunities, not committed delivery milestones.

## Working rules

For each substantial effort:

1. Define the task under `.scratch/<effort>/` using the repository's agent workflow.
2. Keep task-local specs, research, tickets, decisions, and acceptance evidence while active.
3. On completion, update [PROJECT_STATUS.md](PROJECT_STATUS.md) with the resulting current truth.
4. Update this roadmap only when future direction or dependencies change.
5. Update [PRODUCT_SPEC.md](PRODUCT_SPEC.md) only when intended behavior or scope changes.

Use [the task index](../.scratch/README.md) to locate active work. Archived task records remain historical evidence, not current system documentation. Preserve verification utilities and generated evidence at their existing paths when archiving Markdown records.
