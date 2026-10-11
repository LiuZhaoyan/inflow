# Bilingual host dialogs and failures

Type: task
Status: ready-for-agent
Blocked by: 01

Localize native dialog text, host and browser API application-owned failures from [the spec](../spec.md). Preserve external diagnostics and localized failure guidance. Update verification fixtures that assume English. Desktop settings persistence is owned by ticket 01.

## Acceptance

- Saved/resolved interface locale controls application-owned import/relink prompts and file filters.
- Source-language identity and last-used import language remain independent.
- Application-owned failure text is bilingual; external diagnostic text remains readable.
- Existing trust-boundary checks and security behavior are preserved.
