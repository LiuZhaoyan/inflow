# 01: Validate Korean media listening on native Windows

Status: needs-info
Reason: native Windows acceptance requires a Windows-local checkout and isolated Python 3.12; the WSL UNC Conda cache-lock probe failed.
Blocked by: None (can start immediately).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../spec.md).

## What to build

The existing media-selection, local transcription and sentence-playback flow works with real Korean video in native Windows, providing a concrete accepted baseline for the desktop host.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [ ] Run the existing interface and processing flow with native Windows dependencies and an isolated Python 3.12 environment.
- [ ] Adapt development-specific interpreter/model paths only as necessary; leave the user's base Python environment untouched.
- [ ] A representative Korean video without subtitles produces validated transcript text, meaning groups and playable sentence ranges.
- [ ] Demonstrate full playback, sentence navigation, loop/speed/reveal/translation and cancel/retry behavior; original media remains usable after processing failure.
- [ ] Record media characteristics, runtime/model versions, elapsed time, recognition errors, incomplete boundaries and replay behavior. Linux acceptance does not count as Windows evidence.
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
