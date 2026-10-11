# Interface internationalization review

Date: 2026-10-11
Base: `efc16fa`
Reviewed integration: `0b020fd`
Status: Two specification findings awaiting fixes and verification.

## Standards

No actionable findings. The review covered AGENTS.md, CONTRIBUTING.md, local tracker/domain guidance, CONTEXT.md and the React checklist. Changes remain focused on localization, persistence, callers, build staging and verification fixtures. Documentation is English; source-language identity, learning content and existing host security boundaries remain intact. No substantial heuristic code smell warrants an extra abstraction or refactor.

## Spec

1. **P2: Worker-owned errors are missing from the catalog.** The specification requires bilingual application-owned renderer, host and browser API errors. The worker's ProcessingError messages for missing English analysis models, missing audio tracks, missing translation models and generic local model failures are forwarded by the processor adapter but absent from the host catalog. The English interface consequently presents English guidance followed by an untranslated Chinese application error. Include the owned worker messages and the finite source-language recognition variants.
2. **P2: Expanded and compound errors retain old interface text.** The specification requires shared locale presentation and parameterized messages. The host formats the HTTP request-rejection template before IPC; exact catalog-value matching cannot recognize the expanded message after a locale switch. Browser API errors similarly combine localized guidance with raw diagnostics before the renderer stores them. Preserve recognizable parameters and separate diagnostic data from localized guidance.

Summary: Standards 0 findings; Spec 2 P2 findings. Both fixes belong to the host integration ticket and must pass the existing shared-message and public API seams before final acceptance.
