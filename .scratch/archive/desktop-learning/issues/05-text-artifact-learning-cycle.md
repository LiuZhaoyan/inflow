# 05: Generate text artifacts and collect the next vocabulary

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../../README.md) for remaining work.

Status: completed
Progress: implemented and verified on native Windows on 2026-10-01.
Blocked by: [02: Validate one vocabulary-to-passage generation path](02-generation-quality-baseline.md), [04: Collect source-linked vocabulary from video](04-video-vocabulary-notebook.md).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../spec.md).

## What to build

Selected notebook entries generate a saved readable artifact; the learner collects further words from it and generates a second artifact, completing the learning loop.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [x] Configure the one accepted provider credential in the desktop host and retain it separately from learning records with Windows-backed encryption.
- [x] Selecting target entries alone is sufficient; a topic is optional, passage length stays short, and no difficulty level or audio generation is requested.
- [x] The accepted generation path produces one artifact using all selected meanings with normal Korean inflection and common supporting vocabulary.
- [x] Validate returned text/IDs/highlights before atomically saving the artifact, translation, generation metadata and target-meaning snapshots.
- [x] Display target occurrences in Korean text and reveal Chinese translation on demand; saved artifacts can reopen without another API call.
- [x] Collect a further word from an artifact with its source sentence and artifact reference, then use the saved entry in a second generation.
- [x] Correcting a notebook meaning leaves the earlier artifact's supplied target meaning intact.
- [x] Authentication/quota failures, malformed/incomplete results and canceled work preserve saved entries and artifacts. Retry creates a new result rather than overwriting an earlier artifact.
- [x] Reopening restores the two artifacts, vocabulary, targets and source relationships.

## Verification

Operation tests spanning selection → provider result → durable artifact → source-linked word → second artifact with deterministic external responses, targeted failure cases and a real owner-key learning-cycle demo using the accepted provider.

## Specification coverage

User stories 22–35 and artifact aspects of 37.

## Comments

Published after the owner approved the seven-ticket breakdown and blocking edges on 2026-09-30. [Acceptance evidence](../text-artifact-acceptance.md) records the operation story, encrypted host credential, two real DeepSeek generations, artifact-linked collection, snapshot preservation and native offline reopening. The previously owner-accepted semantic baseline still applies; the second live passage repeats its source sentence. Ticket 07 still depends on ticket 06's packaged runtime.
