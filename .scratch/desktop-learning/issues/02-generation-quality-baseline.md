# 02: Validate one vocabulary-to-passage generation path

Status: needs-info
Reason: the owner selected DeepSeek and will configure a local API key; authenticated sample generation and Korean semantic review remain pending.
Blocked by: None (can start immediately).
Approved: 2026-09-30
Specification: [Windows Korean Learning Desktop MVP](../spec.md).

## What to build

A small generation runner takes fixed vocabulary entries and an optional topic, calls one configured provider, validates its response and saves readable Korean/Chinese samples for quality review.

## Context and boundaries

This is a Windows-first Korean learning application for the owner's personal use. Reuse the existing listening prototype and the confirmed [technical baseline](../technical-recommendation.md). Keep changes limited to this slice; preserve existing learning material. Generated artifacts are text-only. Accounts, synchronization, additional platform installers, provider registries and public-release infrastructure are outside this MVP.

## Acceptance criteria

- [ ] Start with the researched DeepSeek Flash candidate unless the owner's available account or comparison evidence selects another single provider.
- [ ] Use the same entry IDs, dictionary forms, contextual meanings, source sentences and small structured-response contract intended for artifact generation.
- [ ] The successful path returns one short text passage, Chinese sentence translations and target annotations with no audio generation or difficulty/length controls.
- [ ] Unknown IDs, omitted IDs, malformed text and incomplete provider responses cannot be presented as complete samples. A provider's target-ID claim is not accepted as semantic proof.
- [ ] Exercise the prepared everyday-word, inflection, specified-word-sense and unrelated-target cases. Review genuine coverage, natural Korean, common supporting vocabulary, translation and highlights; record latency, usage and failures.
- [ ] Keep credentials out of saved samples and logs. Fixture checks can run without credentials, but this ticket cannot be closed without the live account/access and Korean-quality evidence.
- [ ] Save the accepted provider/model, request/response contract and evaluation evidence for the later artifact slice. Do not build a provider registry or automatic failover.

## Verification

Focused request/result validation with deterministic fixtures, plus a bounded live sample evaluation through the same generation path. No full desktop or media dependency is necessary.

## Prerequisites

The owner's configured usable API credential and account capacity for the agreed small evaluation. Never require a key to be pasted into the issue or report.

## Specification coverage

Generation rules and semantic evidence, especially user stories 22–26 and 28–29.

## Comments

Published after the owner approved the seven-ticket breakdown and blocking edges on 2026-09-30. Live acceptance remains incomplete.

2026-09-30 implementation update: the DeepSeek Responses adapter, structured text validation, cancellation/size safeguards and four-case evaluation runner are implemented and covered by deterministic tests. The owner chose DeepSeek, but no configured key or live call is available. The no-key runner saves prepared inputs only and explicitly marks live evaluation as not run. [Generation baseline](../generation-baseline.md) records the contract and evidence boundary. This ticket remains incomplete until authenticated samples pass the agreed Korean-quality review.
