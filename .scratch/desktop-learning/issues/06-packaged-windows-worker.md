# 06: Run the packaged Windows worker without system Python

Status: ready-for-agent
Blocked by: None.
Completed prerequisite: [03: Restore a processed video in the desktop application](../../archive/desktop-learning/desktop-listening-acceptance.md).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../../archive/desktop-learning/spec.md).
Current product requirements: [Product Specification](../../../docs/PRODUCT_SPEC.md). The linked MVP spec is historical context; ticket 03 is completed and this ticket is unblocked.

## What to build

A Windows application package can import, transcribe and replay media using its included processing runtime and explicit local model setup, without a development checkout or installed system Python.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../../archive/desktop-learning/technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [ ] Build the Windows worker with native Windows Python in one-folder mode and collect required native libraries and Korean language data.
- [ ] Include the worker as application resources, pass explicit writable model/data locations, and preserve standard-stream communication and cancellation.
- [ ] Provide clear first-use model availability/download status; models and learning files persist outside installed executable resources.
- [ ] The packaged desktop listening slice processes and reopens a real video without developer virtual-environment or repository paths.
- [ ] Verify Chinese/spaced paths, media seeking/loops, cancellation, child-process shutdown and builtin SQLite persistence in the packaged runtime.
- [ ] Record the clean Windows runtime prerequisites actually observed. A developer-machine success does not establish operation without system Python.
- [ ] Packaging can be verified with the listening slice; vocabulary and generation features are not prerequisites.

## Verification

Native Windows package build and an installed/packaged listening session without the developer environment, plus focused checks only for packaging-related code changes.

## Specification coverage

User stories 1–2 and the packaged processing/persistence aspects of 3–16 and 37.

## Comments

Published after the owner approved the seven-ticket breakdown and blocking edges on 2026-09-30. No implementation or acceptance evidence is recorded yet.
