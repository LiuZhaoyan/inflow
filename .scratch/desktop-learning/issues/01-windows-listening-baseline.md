# 01: Validate Korean media listening on native Windows

Status: needs-info
Reason: the rejected base model has been replaced by a measured turbo candidate with Korean sentence detection; owner review of revised quality and the longer wait remains pending.
Blocked by: None (can start immediately).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../spec.md).

## What to build

The existing media-selection, local transcription and sentence-playback flow works with real Korean video in native Windows, providing a concrete accepted baseline for the desktop host.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [x] Run the existing interface and processing flow with native Windows dependencies and an isolated Python 3.12 environment.
- [x] Adapt development-specific interpreter/model paths only as necessary; leave the user's base Python environment untouched.
- [ ] A representative Korean video without subtitles produces validated transcript text, meaning groups and playable sentence ranges.
- [x] Demonstrate full playback, sentence navigation, loop/speed/reveal/translation and cancel/retry behavior; original media remains usable after processing failure.
- [x] Record media characteristics, runtime/model versions, elapsed time, recognition errors, incomplete boundaries and replay behavior. Linux acceptance does not count as Windows evidence.
- [ ] Keep the existing processing limits. If Windows usability fails, record the failure and compare the affected approach before closing the gate; do not implement several processing backends.

## Verification

Relevant existing processing/reveal checks after any necessary changes, plus a recorded native Windows media session. Semantic and waiting-time acceptance use the representative media rather than an invented numeric quality threshold.

## Prerequisites

Native Windows execution and representative owner-appropriate media. A WSL-only run cannot complete this ticket.

## Specification coverage

Initial media processing and intensive-listening behavior, especially user stories 3 and 5–14.

## Comments

Published after the owner approved the seven-ticket breakdown and blocking edges on 2026-09-30. Windows acceptance remains incomplete.

- 2026-09-30: Windows setup preparation and explicit path support are implemented. The native environment probe is recorded in [windows-probe.md](../windows-probe.md); WSL/UNC Conda cache locking failed, so the real Windows gate still requires a Windows-local checkout and a native worker/UI run with the selected video.

- 2026-09-30 native continuation: isolated Windows setup and real player/API checks completed. Fixed the reproduced PyAV 19 decoder incompatibility by pinning PyAV 18.1.0 and exposed the existing cancellation mechanism in the UI. Real video returned 38 validated segments in 15.036 seconds, with a successful 14.941-second retry. The [native evidence](../windows-probe.md#native-windows-continuation) records playback, loops, reveals, local translation, worker cancellation and fallback. Owner recognition/boundary/waiting-time review remains pending; this ticket does not yet unblock ticket 03.

- 2026-09-30 quality decision: the owner explicitly requested improved recognition and sentence boundaries instead of accepting the first Windows baseline. The shared segmenter now uses the existing Korean parser's sentence boundaries over all aligned words, preserving sentences across ASR chunks and avoiding pause-only clause fragments. Missing-punctuation and paused-clause regressions pass. Same-worker model comparisons are being recorded before selecting a replacement baseline; ticket 03 remains blocked.

- 2026-09-30 quality revision: same-video comparisons selected large-v3-turbo CPU int8 over base and small. The worker returned 33 segments in 89.214 seconds, with four distinct opening sentences and improved common-word output. Small regressed an already-correct family sentence and was not adopted. Setup and documentation now use the pinned turbo model and its required preprocessing resources. [Comparison evidence](../windows-probe.md#recognition-and-sentence-quality-revision) and [uncorrected review output](../generated-samples/windows-acceptance/review-improved.md) retain remaining errors and the waiting-time tradeoff. This is a revised candidate, not owner acceptance.

- Final native UI/API verification returned the revised 33 segments in 89.984 seconds. Revised sentence playback/looping, reveals, independent translation and running-worker cancellation passed; cancellation retained the transcript and re-enabled processing. See [final UI/API evidence](../generated-samples/windows-acceptance/turbo-native-ui-evidence.json). Recognition, audible boundaries and waiting-time acceptance still require owner review.
