# Inflow Implementation Roadmap

Status: previously accepted desktop slices cover persistent listening, vocabulary and text artifacts. The frontend workspace is implemented and locally verified; owner visual acceptance after rework, packaged resources and installed-app acceptance remain pending.
Last updated: 2026-10-01
Product source: [PRODUCT_SPEC.md](PRODUCT_SPEC.md).
Implementation contract: [Windows desktop specification](../.scratch/desktop-learning/spec.md).
Current phase: [Frontend Workspace specification](../.scratch/frontend-workspace/spec.md).

The first delivery connects Korean video listening, a vocabulary notebook and generated text artifacts for the owner's personal use on Windows. The specification's testing boundary is confirmed. [The approved ticket breakdown](../.scratch/desktop-learning/ticket-plan.md) links seven implementation issues. Tickets 01 and 02 have owner-accepted native listening and live generation evidence. Ticket 03 delivers static Electron listening with managed media and SQLite restoration, verified across native restarts. Ticket 04 adds source-linked vocabulary collection, learner corrections, manual entries and persistent target selection. Ticket 05 completes two real text generations, artifact-linked collection, historical target snapshots and offline reopening with encrypted host credentials. Packaged worker and installed acceptance remain later work.

## Current phase: Frontend learning workspace

Status: implemented and locally verified; owner visual acceptance after rework remains pending. See [verification evidence](../.scratch/frontend-workspace/acceptance.md).

Coordinate existing processing, reveal and desktop behavior in the confirmed LearningWorkspace layout. The phase includes import-duration gating, playback and Context behavior, source-linked vocabulary confirmation, and the flat Library overlay. Story generation and reading are hidden while stored artifacts and their source text remain preserved for a later redesign. Do not relocate or rewrite the existing business algorithms or add dependencies. Scope and acceptance are defined in the [frontend workspace specification](../.scratch/frontend-workspace/spec.md).

## Stage 1: Establish Windows processing and generation feasibility

Goal: obtain runnable evidence for the two model-dependent parts before integrating them into the desktop learning cycle.

Scope:

- Evaluate the existing local Korean transcription, sentence timing and translation baseline with representative media on Windows.
- Record transcription elapsed time, recognition errors, incomplete boundaries and processing conditions; inspect actual sentence replay.
- Use an isolated Windows Python 3.12 environment and validate dependencies/resource paths before packaging the Python worker.
- Validate one generation provider using owner-configured credentials. DeepSeek Flash Responses is the researched first candidate; account access and Korean quality must pass the prepared evaluation.
- Check a small structured response containing Korean sentence text, selected-word annotations and Chinese translation, including inflection and ambiguous contextual meanings.
- Inspect generated passages for full target coverage, correct meaning, natural Korean and common supporting vocabulary. Record usage and wait time.
- Keep the current 50 MB and 10-minute processing baseline until resource evidence justifies a separate expansion.

Deliverable: Windows media-processing evidence and an accepted first generation provider/response contract.

Acceptance: real media produces usable sentence text/timings; generated samples exercise the agreed vocabulary rule. Neither structural JSON validity nor existing Linux acceptance substitutes for Korean/Windows evidence. If the baseline fails, revise the affected approach from comparative evidence rather than integrating several providers in advance.

## Stage 2: Deliver persistent desktop intensive listening

Dependency: the Windows processing baseline is usable.

Scope:

- Host the existing React learning interface in Electron and use Next static export for packaged UI assets.
- Move transcription/translation from POST endpoints into desktop operations and package the Windows processing worker.
- Import a managed copy of selected media and save its metadata, processing results, learning position and playback preferences in local storage.
- Preserve sentence navigation, current-sentence loop, speed controls, meaning-group reveals, hiding and independent sentence translation.
- Reuse existing processing validation and reveal behavior.
- Validate cancel/retry, missing models, missing managed media, and failure recovery.
- Verify packaged media serving, codec compatibility and seek/loop completeness on Windows.

Deliverable: an installable desktop listening slice that can process one Korean video, close and restore it without repeating transcription.

Acceptance: the installed app plays and processes source media, retains the original media after processing failure, restores learning state and runs its worker without requiring developer paths or system Python. Existing prototype runtime code is adapted rather than treating a browser preview as desktop acceptance.

## Stage 3: Connect vocabulary and generated text artifacts

Dependency: the desktop operations and durable storage from Stage 2 exist, and the Stage 1 generation provider passes its evidence gate.

Scope:

- Collect source-linked vocabulary from media, retaining dictionary form, contextual Chinese meaning, original sentence and encountered form.
- Support manual entries and corrections; preserve distinct contextual meanings and multiple source occurrences.
- Select target vocabulary and optionally provide a topic to generate one short Korean passage, without difficulty-level or length controls.
- Validate structured output and target annotations, then atomically save the text artifact, Chinese translation, highlights and target-meaning snapshots.
- Display target highlights and on-demand Chinese translation.
- Collect further vocabulary from artifacts with source context retained, and generate another passage from those entries.
- Configure the owner's API key in the desktop host and retain saved material through authentication, quota, malformed-result and other generation failures.

Deliverable: the complete listening → vocabulary → reading → vocabulary learning cycle.

Acceptance: one real media sentence supplies vocabulary; all selected words appear in a usable generated passage with their intended senses; reading that artifact supplies further vocabulary for a second generation. Saved targets keep their historical meanings after notebook edits, and all records remain available after reopening.

## Stage 4: Complete personal-use Windows acceptance

Dependency: the complete learning cycle from Stage 3 works.

Scope:

- Build and exercise the Windows installer with the packaged worker, local model setup and durable data directories.
- Test the installed application without the developer environment.
- Verify Chinese/spaced file paths, original-file movement, managed-file recovery, processing cancellation and clean shutdown.
- Exercise the full learning cycle, close/reopen it and check media, transcripts, source-linked vocabulary and artifacts.
- Update runnable setup and usage documentation to describe observed desktop behavior.
- Record automated results, real model evaluations and installed-app checks separately, including remaining limitations.

Deliverable: a Windows application the owner can install and use for the confirmed learning cycle.

Acceptance: the installed app completes and restores the complete cycle. Generation produces text only; automatic audio generation is not required. Windows packaging, model/runtime setup and persistence are demonstrated rather than inferred from a source checkout.

## Verification approach

- Prefer observable learning actions through the application operations interface and existing processing/reveal test surfaces.
- Use temporary real SQLite/files for persistence checks and deterministic external-result substitutes for automated operation tests.
- Use representative Korean media and generated samples for recognition, timing, word sense, inflection, supporting-vocabulary and translation quality.
- Use native Windows installed-app checks for playback, worker resources, data directories and restoration.
- Run implementation checks appropriate to each change; this roadmap does not itself run tests or establish delivery.

## Scope boundaries and later improvements

Generated audio/TTS, learner-level estimation, difficulty/length controls, accounts/synchronization, mobile/PWA delivery, other desktop installers, a multi-provider framework, public distribution infrastructure and automatic updates are outside the first delivery.

The older browser roadmap's A–B looping, revisit marks, independent notes and lightweight transcript/timing editing remain separate possible improvements. They are not prerequisites for the confirmed vocabulary-to-text cycle.

Subtitle-region Mask is a confirmed follow-up after the current frontend workspace phase; see [the deferred Mask issue](../.scratch/desktop-learning/issues/08-subtitle-mask.md). The current phase plays original video, including embedded subtitles, as supplied. Mask interaction and persistence details will be confirmed before its implementation.

Technical research is recorded in [the recommendation](../.scratch/desktop-learning/technical-recommendation.md). Research and specification completion do not mean model quality, package compatibility or runtime acceptance has already passed.
