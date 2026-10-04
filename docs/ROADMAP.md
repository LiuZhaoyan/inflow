# Inflow Roadmap

Last updated: 2026-10-03

This document describes what comes next for Inflow: remaining work, ordering, and dependencies. Product behavior and scope belong in [PRODUCT_SPEC.md](PRODUCT_SPEC.md); the implementation that already exists belongs in [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Current direction

The persistent desktop foundation already supports listening, vocabulary, generated artifacts, and their provenance. The next work should build on those capabilities rather than redesigning the backend around the current UI.

The immediate product direction is to extend the implemented learning loop to English and finish owner visual acceptance of the existing workspace:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

## 1. Complete frontend visual acceptance

Goal: complete owner visual/product acceptance of the implemented learning workspace.

Priorities:

- complete visual/product acceptance of the new listening workspace;
- keep playback, sentence navigation, reveal, translation, and Context behavior stable during any remaining visual refinements;
- review the implemented source-focused vocabulary experience against the supplied visual references;
- complete owner visual acceptance of the implemented vocabulary selection and generated-artifact reading views;
- preserve the implemented collection from generated artifact sentences and its provenance;
- keep frontend components dependent on the DesktopBridge/domain contract rather than duplicating desktop business logic.

The remaining frontend review is tracked in [the visual acceptance record](../.scratch/frontend-workspace/spec.md). The original implementation phase and its evidence are archived and linked from that record.

## 2. Implement the confirmed English learning loop

The [English Learning Support spec](../.scratch/english-learning/spec.md) is ready-for-agent. It extends import, local transcription and analysis, Chinese translation, offline dictionary lookup, vocabulary identity and passage generation to English while retaining the Korean learning loop and saved data.

Implementation should:

- carry the confirmed source language through the existing renderer/host/worker contracts;
- reuse Whisper, keep Korean analysis on Kiwi, and prepare a compatible local spaCy English pipeline;
- evaluate and bundle an English–Chinese dictionary with fixed provenance and resource notices;
- preserve complete-word lookup, contextual meanings, explicit cloud actions, translation cache behavior and artifact snapshots;
- add independent source-language filters without changing target selections, and reject mixed-language generation before contacting the provider;
- complete application-operations tests, real-worker checks and isolated native Electron acceptance, reporting English semantic quality separately from deterministic fixtures.

English resources use the existing preparation workflow. This work targets the source-checkout desktop application; owner visual review and packaged Windows delivery are separate efforts, not prerequisites for implementing English. Runtime English support must remain marked unimplemented until its evidence is recorded.

## 3. Revisit listening data only where the new UX requires it

The current persisted Segment model is sentence-level. Whisper produces word timestamps internally, but they are discarded after sentence construction.

Do not expand the data model merely because finer alignment exists. First determine whether the redesigned listening interaction needs word-level highlighting, word-level seeking, transcript correction, or another concrete feature that cannot be expressed with sentence timing plus meaning groups.

If such a requirement is confirmed, define the migration and provenance behavior before persisting word alignment.

## 4. Evaluate translation and dictionary quality

Listen now supports explicit cloud sentence translation with a latest-result cache and an explicit local reference fallback. Word collection uses bundled offline dictionary candidates and optional user-requested contextual glosses.

Evaluate live cloud output and dictionary coverage against representative Korean learning sentences. The local Korean → English → Chinese fallback can still be literal or lossy. Keep provider and model details outside the learning domain; saved results remain reusable independently of the current provider.

## 5. Package the Windows runtime

Goal: turn the source-checkout desktop application into a dependable personal-use Windows installation.

Remaining work includes:

- package the Python processing worker and required local model resources;
- remove dependencies on developer-only paths or system setup;
- verify managed media and SQLite data directories in the installed application;
- verify paths containing Chinese characters and spaces;
- verify clean shutdown, cancellation, retry, and missing-resource behavior;
- exercise the complete learning loop after install and restart.

Installed-app behavior, not successful execution from the repository, is the acceptance boundary for this milestone.

The active [packaged-worker ticket](../.scratch/desktop-learning/issues/06-packaged-windows-worker.md) is unstarted and unblocked. [Installed learning-cycle acceptance](../.scratch/desktop-learning/issues/07-installed-learning-cycle-acceptance.md) remains dependent on it. Completed desktop foundation tickets and research are archived in [the task index](../.scratch/README.md).

## 6. Deferred product work

Subtitle-region masking is a confirmed follow-up to the current workspace. Its interaction and persistence contract should be specified before implementation.

Automatic contextual sense selection remains deferred; explicit cloud glosses are available. Phrase and grammatical-construction collection remain outside the current scope for both learning languages.

A settings page for separate sentence-translation and vocabulary-gloss model configurations is deferred. The first implementation keeps task-specific model, prompt, output-limit and timeout settings in code while sharing the existing provider credential.

Optional follow-up: cloud Jev contextual selection from offline dictionary sense candidates. This is outside the initial translation work and requires explicit user opt-in for automatic network requests. Offline candidates and manual editing must remain available when disabled, offline or unavailable. Local JevEmbed deployment and evaluation are not planned; the initial vocabulary flow presents offline candidates and calls the cloud LLM only on user request.

Other possible improvements remain demand-driven rather than roadmap commitments: A–B looping, revisit marks, notes, lightweight transcript/timing correction, generated audio/TTS, and additional platforms.

## Working rules

For each substantial effort:

1. define the task under `.scratch/<effort>/` using the repository's agent workflow;
2. use task-local specs, research, tickets, and acceptance evidence while the effort is active;
3. when the effort finishes, update [PROJECT_STATUS.md](PROJECT_STATUS.md) with the new current truth;
4. update this roadmap only when the remaining direction or dependency order changes;
5. update [PRODUCT_SPEC.md](PRODUCT_SPEC.md) only when the intended product behavior or scope changes.

Use [the task index](../.scratch/README.md) to locate active work. Superseded plans and completed delivery records under `.scratch/archive/` remain historical evidence and are not required to describe the current system. Preserve verification utilities and generated evidence at their existing paths when archiving Markdown records.
