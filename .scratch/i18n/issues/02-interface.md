# Bilingual learning workspace

Type: task
Status: resolved
Blocked by: 01

Apply shared locale messages to all learning workspace and listening UI surfaces and supporting hooks in [the spec](../spec.md), including document metadata, accessible names, dates and quantities. Settings is owned by ticket 01.

## Acceptance

- Listen, Vocab, Story, their libraries and dialogs render both supported languages.
- Source text and Chinese assistance stay unchanged; switching preserves playback, masks, selection and drafts.
- No untranslated application-owned labels, hardcoded English dates or broken quantity wording remain.

## Answer

All renderer controls, libraries, learning dialogs, status and owned error presentation now consume shared locale messages. Dates and quantities use the interface locale; browser processing requests send the locale header. Raw failure state and existing restoration dependencies are retained, so display changes do not reload material or discard learning state. Source text and Chinese assistance keep their source-language annotations. Document metadata follows the interface; the Settings language selector follows existing control styling.

The shared-message seam was exercised red before green. Dictionary coverage/interpolation/fallback and renderer controls, counts, source-value interpolation and external diagnostics pass. Focused TypeScript and ESLint checks pass. Final integration checks passed native/browser state-retention and layout acceptance, desktop build, 79 tests, lint and typecheck; see [acceptance](../acceptance.md).
