# 07: Accept the installed Windows learning cycle

Status: completed
Blocked by: None. [Ticket 06](06-packaged-windows-worker.md) is completed.
Completed prerequisite: [05: Generate text artifacts and collect the next vocabulary](../../archive/desktop-learning/text-artifact-acceptance.md).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../../archive/desktop-learning/spec.md).
Current product requirements: [Product Specification](../../../docs/PRODUCT_SPEC.md). Tickets 05 and 06 are completed.

## What to build

The personal-use Windows installer completes the full video → vocabulary → text artifact → vocabulary → artifact cycle and restores it after restart, with runnable documentation and recorded acceptance evidence.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../../archive/desktop-learning/technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [x] Install the application with the packaged worker/model setup and configure the accepted generation credential.
- [x] Use real subtitle-free Korean video to collect entries, generate/read an artifact, collect another entry and generate a second artifact.
- [x] Close and reopen the installed application, confirming managed media, cached processing, learning position/preferences, vocabulary, artifacts, target snapshots and source references.
- [x] Exercise missing managed media, processing cancellation and generation failure without losing earlier material or presenting an incomplete result as saved success.
- [x] Keep source text visible outside mask mode, saved masks active only in mask mode, and translation hidden on sentence changes; preserve genuine target coverage/meaning and text-only artifact generation.
- [x] Update setup/usage instructions to describe observed Windows behavior and known processing/media limits.
- [x] Record automated, live-model and installed-Windows evidence separately. Resolve delivery failures within the agreed scope before closing the ticket.

## Verification

The specification's full owner-visible installed-app acceptance scenario, including representative Korean semantic review. Reuse completed lower-ticket evidence where its code/runtime remains unchanged; repeat only affected checks or the final cross-feature workflow.

## Specification coverage

Complete acceptance across user stories 1–37; no new product features.

## Comments

Published after the owner approved the seven-ticket breakdown and blocking edges on 2026-09-30.

2026-10-09: The personal PowerShell installer and final installed executable passed the real video → vocabulary → artifact → vocabulary → second artifact flow. Exact restart comparisons cover cached transcript, playback preferences, sentence/video masks, vocabulary sources/selections and complete historical target snapshots. Missing-media relink, cancelled retranscription and live credential rejection retain earlier material. The shared parser now accepts one complete JSON code fence without relaxing passage validation. Automated, live-model and installed evidence, representative agent semantic review and clean-machine/owner-review boundaries are recorded separately in the [delivery report](../subagent-06-07-report.md). No commit was made.
