# English Quality Follow-up

Updated: 2026-10-06

English implementation is complete for the source-checkout desktop application. Current behavior belongs in [Project Status](../../docs/PROJECT_STATUS.md); quality priorities belong in [Roadmap](../../docs/ROADMAP.md#2-broaden-english-quality-evaluation).

## Remaining work

- [ ] Evaluate real-speaker English audio, accents and phrase grouping beyond the synthetic acceptance sample.
- [ ] Review irregular/plural generated forms and topic adherence; retain failures as evidence.
- [ ] Sample English–Chinese dictionary coverage and candidate quality while retaining manual entry.
- [ ] Evaluate live translation and contextual gloss quality separately from deterministic provider fixtures.

Owner visual acceptance is tracked in [Frontend Workspace](../frontend-workspace/spec.md). Packaged Windows delivery is tracked in [the remaining desktop tickets](../desktop-learning/README.md).

## Historical evidence

- [Implemented specification](../archive/english-learning/spec.md).
- [Source-checkout acceptance](../archive/english-learning/acceptance.md).
- [Live generation quality probes from 2026-10-04](../archive/english-learning/quality-report.md).

The repeatable [native acceptance harness](verify.cjs) and [live quality probe](quality-check.ts) remain here.
