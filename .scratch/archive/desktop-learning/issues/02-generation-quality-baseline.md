# 02: Validate one vocabulary-to-passage generation path

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../../README.md) for remaining work.

Status: completed
Reason: four authenticated DeepSeek samples passed structural checks; the owner accepted the current generation quality and its documented limitations on 2026-10-01.
Blocked by: None (can start immediately).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../spec.md).

## What to build

A small generation runner takes fixed vocabulary entries and an optional topic, calls one configured provider, validates its response and saves readable Korean/Chinese samples for quality review.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [x] Start with the researched DeepSeek Flash candidate unless the owner's available account or comparison evidence selects another single provider.
- [x] Use the same entry IDs, dictionary forms, contextual meanings, source sentences and small structured-response contract intended for artifact generation.
- [x] The successful path returns one short text passage, Chinese sentence translations and target annotations with no audio generation or difficulty/length controls.
- [x] Unknown IDs, omitted IDs, malformed text and incomplete provider responses cannot be presented as complete samples. A provider's target-ID claim is not accepted as semantic proof.
- [x] Exercise the prepared everyday-word, inflection, specified-word-sense and unrelated-target cases. Review genuine coverage, natural Korean, common supporting vocabulary, translation and highlights; record latency, usage and failures.
- [x] Keep credentials out of saved samples and logs. Fixture checks can run without credentials, but this ticket cannot be closed without the live account/access and Korean-quality evidence.
- [x] Save the accepted provider/model, request/response contract and evaluation evidence for the later artifact slice. Do not build a provider registry or automatic failover.

## Verification

Focused request/result validation with deterministic fixtures, plus a bounded live sample evaluation through the same generation path. No full desktop or media dependency is necessary.

## Prerequisites

The owner's configured usable API credential and account capacity for the agreed small evaluation. Never require a key to be pasted into the issue or report.

## Specification coverage

Generation rules and semantic evidence, especially user stories 22–26 and 28–29.

## Comments

- 2026-10-01 owner acceptance: the owner reviewed the concrete four-sample summary and accepted current generation quality ("接受当前生成质量"), including the documented awkward wording and limited coherence. DeepSeek `deepseek-flash` Responses is the accepted single provider for ticket 05. No claim of error-free Korean is implied.

- 2026-10-01: `.env` configuration now works in the standalone runner. Four authenticated requests completed in 1,765 / 2,013 / 1,598 / 2,492 ms, reporting 3,499 total tokens. [Live review](../../../desktop-learning/generated-samples/run-2026-10-01T03-34-27-466Z-990f1311/review.md) links unmodified outputs and records coherence and wording limitations. Access and structural success are established; owner semantic acceptance is still required before ticket 05.

Published after the owner approved the seven-ticket breakdown and blocking edges on 2026-09-30. Live acceptance remains incomplete.

2026-09-30 implementation update: the DeepSeek Responses adapter, structured text validation, cancellation/size safeguards and four-case evaluation runner are implemented and covered by deterministic tests. The owner chose DeepSeek, but no configured key or live call is available. The no-key runner saves prepared inputs only and explicitly marks live evaluation as not run. [Generation baseline](../generation-baseline.md) records the contract and evidence boundary. This ticket remains incomplete until authenticated samples pass the agreed Korean-quality review.
