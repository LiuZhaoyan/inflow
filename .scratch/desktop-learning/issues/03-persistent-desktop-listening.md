# 03: Restore a processed video in the desktop application

Status: ready-for-agent
Blocked by: [01: Validate Korean media listening on native Windows](01-windows-listening-baseline.md).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../spec.md).

## What to build

The Electron desktop development application imports a managed media copy, performs the validated local processing, supports the existing listening interaction, and restores the material and learning state after restarting.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [ ] Load the existing React learning interface from a static Next build. Transcription and translation use narrow desktop operations rather than a packaged Next HTTP server.
- [ ] Native import retains a managed copy and stable media/segment identities. The original download can move without breaking the managed copy.
- [ ] SQLite stores processing results, learning position and playback preferences; reopening does not repeat transcription or depend on a browser object URL from the prior session.
- [ ] Preserve sentence navigation, loop/speed/reveal/hide and independent sentence translation, including hiding text and translation on sentence changes.
- [ ] Processing failures and cancellation preserve saved material and leave source media playable. A missing managed file retains transcript records and supports re-association.
- [ ] Verify builtin SQLite and managed-media playback in the selected native Windows Electron runtime.
- [ ] Development can use the validated native Python environment; installation without system Python is the separate packaged-runtime gate in ticket 06.

## Verification

Application-operation tests with real temporary SQLite/files and deterministic processor results, existing processing/reveal checks, and a native Windows import → process → listen → restart → reopen demo.

## Specification coverage

User stories 3–16 and 36–37.

## Comments

Published after the owner approved the seven-ticket breakdown and blocking edges on 2026-09-30. No implementation or acceptance evidence is recorded yet.
