# Inflow Roadmap

Last updated: 2026-10-09

This document describes what comes next for Inflow: remaining work, ordering, and dependencies. Product behavior and scope belong in [PRODUCT_SPEC.md](PRODUCT_SPEC.md); the implementation that already exists belongs in [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Current direction

The persistent desktop foundation already supports listening, vocabulary, generated artifacts, and their provenance. The next work should build on those capabilities rather than redesigning the backend around the current UI.

The implemented learning loop now supports Korean and English. Frontend and Settings owner visual acceptance were recorded on 2026-10-09. English quality evaluation is postponed by owner choice; the next work is demand-driven development and release preparation:

```text
Media → Listening → Vocabulary → Generated Artifact → Vocabulary
```

## 1. Frontend visual acceptance (completed)

Owner visual acceptance was recorded on 2026-10-09. See [archived acceptance](../.scratch/archive/frontend-workspace/visual-acceptance.md). No active frontend visual-acceptance ticket remains.

## 2. Broaden English quality evaluation (deferred)

The [English Learning Support spec](../.scratch/archive/english-learning/implementation-and-acceptance.md) has been implemented for the source-checkout desktop application. [Acceptance](../.scratch/archive/english-learning/implementation-and-acceptance.md) covers the full loop and retained Korean data. The owner postponed broader quality improvement during rapid development. Future evaluation may:

- evaluate real-speaker English audio, accents and phrase grouping beyond the synthetic acceptance sample;
- review more irregular/plural generated forms and topic adherence, preserving failures as evidence;
- sample the fixed English–Chinese dictionary's coverage and candidate quality while retaining manual entry;
- keep deterministic provider fixtures separate from live linguistic quality evidence.

English resources use the existing preparation workflow. Owner visual review and Windows packaging were completed separately; future language-quality evaluation is not a current blocker.

## 3. Revisit listening data only where the new UX requires it

The current persisted Segment model is sentence-level. Whisper produces word timestamps internally, but they are discarded after sentence construction.

Do not expand the data model merely because finer alignment exists. First determine whether the redesigned listening interaction needs word-level highlighting, word-level seeking, transcript correction, or another concrete feature that cannot be expressed with sentence timing plus meaning groups.

If such a requirement is confirmed, define the migration and provenance behavior before persisting word alignment.

## 4. Evaluate translation and dictionary quality

Listen now supports explicit cloud sentence translation with a latest-result cache and an explicit local reference fallback. Word collection uses bundled offline dictionary candidates and optional user-requested contextual glosses.

Evaluate live cloud output and dictionary coverage against representative Korean and English learning sentences. Local reference translations can still be literal or lossy. Keep provider and model details outside the learning domain; saved results remain reusable independently of the current provider.

## 5. Package the Windows runtime

Goal: turn the source-checkout desktop application into a dependable personal-use Windows installation.

Completed on 2026-10-09: native worker packaging, a personal PowerShell installer, explicit profile-owned model setup, managed media/SQLite restoration, Chinese/spaced paths, cancellation, missing-media relinking and the complete installed learning cycle with authenticated generation.

Installed-app behavior, not successful execution from the repository, is the acceptance boundary for this milestone.

Both [packaged-worker](../.scratch/archive/desktop-learning/windows-packaging-acceptance.md) and [installed learning-cycle](../.scratch/archive/desktop-learning/windows-packaging-acceptance.md) tickets are complete. The [delivery report](../.scratch/archive/desktop-learning/windows-packaging-acceptance.md) records the observed Windows prerequisites and developer-machine isolation boundary; clean-VM and broader codec qualification were not performed. Earlier foundation records remain archived in [the task index](../.scratch/README.md).

## 6. Deferred product work

On-demand manual subtitle-region masking is implemented and automated checks passed; [mask acceptance](../.scratch/archive/video-subtitles/implementation-and-acceptance.md) records the source-checkout boundary. Owner visual acceptance was recorded on 2026-10-09. Actual maximized-window verification is deferred; installed-package masking verification belongs to the next packaged release, not a new installation during rapid development. The owner removed subtitle extraction from this iteration on 2026-10-05; text-track reuse and audio alignment remain deferred with research retained in [Video Subtitle Support](../.scratch/archive/video-subtitles/implementation-and-acceptance.md). Automatic subtitle-region detection is also deferred.

Future experiment: OCR for image-based subtitle tracks as another source of learning text. Evaluate Korean/English recognition accuracy, text cleanup, retained cue timing and Windows processing/resource requirements on representative samples before committing to implementation. This is a possible future path, outside the first subtitle-reuse version; keep speech transcription available when image-subtitle recovery is unavailable or unsuitable.

Automatic contextual sense selection remains deferred; explicit cloud glosses are available. Phrase and grammatical-construction collection remain outside the current scope for both learning languages.

Settings now manages the shared DeepSeek key and global video subtitle mask color with an inline preview; [Settings acceptance](../.scratch/archive/settings/acceptance.md) records source-checkout verification and owner visual acceptance on 2026-10-09. Additional installed-package Settings checks may be performed at the next packaged release. Provider, endpoint, and per-task model controls remain deferred; task-specific model, prompt, output-limit and timeout settings stay in code.

Optional follow-up: cloud Jev contextual selection from offline dictionary sense candidates. This is outside the initial translation work and requires explicit user opt-in for automatic network requests. Offline candidates and manual editing must remain available when disabled, offline or unavailable. Local JevEmbed deployment and evaluation are not planned; the initial vocabulary flow presents offline candidates and calls the cloud LLM only on user request.

The [artifact request-ordering investigation](../.scratch/archive/artifact-state/architecture-and-verification.md) records a still-unfixed renderer/persistence divergence under controlled delayed replies. This is a known risk to revisit, not a completed fix or current implementation ticket.

Other possible improvements remain demand-driven rather than roadmap commitments: A–B looping, revisit marks, notes, lightweight transcript/timing correction, generated audio/TTS, and additional platforms.

## Working rules

For each substantial effort:

1. define the task under `.scratch/<effort>/` using the repository's agent workflow;
2. use task-local specs, research, tickets, and acceptance evidence while the effort is active;
3. when the effort finishes, update [PROJECT_STATUS.md](PROJECT_STATUS.md) with the new current truth;
4. update this roadmap only when the remaining direction or dependency order changes;
5. update [PRODUCT_SPEC.md](PRODUCT_SPEC.md) only when the intended product behavior or scope changes.

Use [the task index](../.scratch/README.md) to locate active work. Superseded plans and completed delivery records under `.scratch/archive/` remain historical evidence and are not required to describe the current system. Preserve verification utilities and generated evidence at their existing paths when archiving Markdown records.
