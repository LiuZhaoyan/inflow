# Interface internationalization review

Date: 2026-10-11
Base: `efc16fa`
Reviewed integration: `0b020fd`
Status: Resolved; fixes verified at `5a3ff3a`.

## Standards

No actionable findings. The review covered AGENTS.md, CONTRIBUTING.md, local tracker/domain guidance, CONTEXT.md and the React checklist. Changes remain focused on localization, persistence, callers, build staging and verification fixtures. Documentation is English; source-language identity, learning content and existing host security boundaries remain intact. No substantial heuristic code smell warrants an extra abstraction or refactor.

## Spec

1. **P2: Worker-owned errors are missing from the catalog.** The specification requires bilingual application-owned renderer, host and browser API errors. The worker's ProcessingError messages for missing English analysis models, missing audio tracks, missing translation models and generic local model failures are forwarded by the processor adapter but absent from the host catalog. The English interface consequently presents English guidance followed by an untranslated Chinese application error. Include the owned worker messages and the finite source-language recognition variants.
2. **P2: Expanded and compound errors retain old interface text.** The specification requires shared locale presentation and parameterized messages. The host formats the HTTP request-rejection template before IPC; exact catalog-value matching cannot recognize the expanded message after a locale switch. Browser API errors similarly combine localized guidance with raw diagnostics before the renderer stores them. Preserve recognizable parameters and separate diagnostic data from localized guidance.

## Resolution

Both P2 findings were fixed in `5015b86`, integrated at `5a3ff3a`. The host catalog now covers all 24 distinct owned worker failures. Known expanded HTTP templates retain their numeric status and can be presented in either locale; browser API responses separate original diagnostic data from localized guidance. Shared-message and public POST regressions failed before the fixes and pass afterward.

Follow-up specification review found both issues resolved and no new material regression. Final verification passed 79 tests, lint, typecheck, desktop build and desktop/restart/browser acceptance, including visible worker/HTTP error language changes. See [acceptance](acceptance.md) for evidence and limits.
