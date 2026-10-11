# Locale foundation and preferences

Type: task
Status: resolved
Blocked by: none

Implement the shared TypeScript messages, locale resolution, renderer Context, browser-local preferences, desktop settings persistence and Settings language workflow from [the spec](../spec.md).

Use the confirmed shared-message and desktop operations test seams. Preserve color-only saves, credentials, category partial saves and older profiles. Stage shared resources in the desktop build. Export a translation helper usable by both React and the host; preserve external diagnostic text with localized guidance.

## Acceptance

- Chinese system variants select Simplified Chinese; other defaults select English; saved language wins.
- Save applies and persists; Cancel discards; failures retain the language draft.
- Existing settings and learning data remain compatible; dictionary completeness and interpolation checks pass.

## Answer

Implemented shared locale messages, interpolation and external diagnostic guidance, React locale context, independent browser persistence, partial desktop settings persistence and the Settings draft workflow. The existing desktop build stages locale resources, and the test command includes the shared-message checks.

Confirmed red/green checks for locale defaults, dictionary coverage/interpolation/fallback and desktop locale persistence. Five focused tests pass, including restart, rejected combined updates, color compatibility and retained per-video learning. Final integrated verification passed 79 tests, lint, typecheck, desktop build and native/browser Settings acceptance; see [acceptance](../acceptance.md). The earlier Windows relink sandbox restriction did not recur with normal local permissions.
