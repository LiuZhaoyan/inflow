# Bilingual host dialogs and failures

Type: task
Status: resolved
Blocked by: 01

Localize native dialog text, host and browser API application-owned failures from [the spec](../spec.md). Preserve external diagnostics and localized failure guidance. Update verification fixtures that assume English. Desktop settings persistence is owned by ticket 01.

## Acceptance

- Saved/resolved interface locale controls application-owned import/relink prompts and file filters.
- Source-language identity and last-used import language remain independent.
- Application-owned failure text is bilingual; external diagnostic text remains readable.
- Existing trust-boundary checks and security behavior are preserved.

## Answer

Native import/relink titles, file filters, source-language confirmation and credential warnings use the saved/resolved interface locale. The existing IPC boundary translates exact application-owned failures and retains already-surfaced external diagnostics for renderer guidance; browser API failures follow Accept-Language. The shared host catalog covers operations, credential, processing, mask, translation and generation failures without changing source-language selection, data validation or provider diagnostic privacy.

Maintained English acceptance fixtures pin their locale explicitly. Fourteen focused IPC, route and shared-message tests pass, including a red-to-green browser locale test and diagnostic whitespace preservation. Targeted ESLint reports no errors; the packaged driver passes Node syntax checking. Full renderer/host build and native acceptance are checked on the integration branch.

## Review fixes

The spec review found two gaps: Python worker-owned failures lacked catalog entries, and already-expanded HTTP/API error guidance could retain the previous interface language after switching. All 24 distinct application-owned worker failures now have bilingual entries, including both source-language no-speech variants and the generic local-model fallback. Expanded HTTP messages recognize only their known numeric-status templates and preserve the status during interface changes. Browser API failures carry original surfaced diagnostic data separately; the renderer stores that data and supplies current-language guidance when rendering.

The shared-message and public POST regressions failed before each fix and pass afterward. Eighteen focused tests, targeted ESLint and the diff whitespace check pass. Worker stderr, suppressed provider/private diagnostics, processing behavior and learning outputs remain unchanged. Final integration verification passed 79 tests, lint, typecheck, desktop build and native/restart/browser acceptance, including visible worker/HTTP error language switching; see [acceptance](../acceptance.md).
