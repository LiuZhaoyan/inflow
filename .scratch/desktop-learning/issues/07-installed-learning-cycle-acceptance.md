# 07: Accept the installed Windows learning cycle

Status: ready-for-agent
Blocked by: [05: Generate text artifacts and collect the next vocabulary](05-text-artifact-learning-cycle.md), [06: Run the packaged Windows worker without system Python](06-packaged-windows-worker.md).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../spec.md).

## What to build

The personal-use Windows installer completes the full video → vocabulary → text artifact → vocabulary → artifact cycle and restores it after restart, with runnable documentation and recorded acceptance evidence.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [ ] Install the application with the packaged worker/model setup and configure the accepted generation credential.
- [ ] Use real subtitle-free Korean video to collect entries, generate/read an artifact, collect another entry and generate a second artifact.
- [ ] Close and reopen the installed application, confirming managed media, cached processing, learning position/preferences, vocabulary, artifacts, target snapshots and source references.
- [ ] Exercise missing managed media, processing cancellation and generation failure without losing earlier material or presenting an incomplete result as saved success.
- [ ] Keep default-hidden source/translation behavior, genuine target coverage/meaning and text-only artifact generation consistent with the specification.
- [ ] Update setup/usage instructions to describe observed Windows behavior and known processing/media limits.
- [ ] Record automated, live-model and installed-Windows evidence separately. Resolve delivery failures within the agreed scope before closing the ticket.

## Verification

The specification's full owner-visible installed-app acceptance scenario, including representative Korean semantic review. Reuse completed lower-ticket evidence where its code/runtime remains unchanged; repeat only affected checks or the final cross-feature workflow.

## Specification coverage

Complete acceptance across user stories 1–37; no new product features.

## Comments

Published after the owner approved the seven-ticket breakdown and blocking edges on 2026-09-30. No implementation or acceptance evidence is recorded yet.
