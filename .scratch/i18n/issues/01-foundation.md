# Locale foundation and preferences

Type: task
Status: ready-for-agent
Blocked by: none

Implement the shared TypeScript messages, locale resolution, renderer Context, browser-local preferences, desktop settings persistence and Settings language workflow from [the spec](../spec.md).

Use the confirmed shared-message and desktop operations test seams. Preserve color-only saves, credentials, category partial saves and older profiles. Stage shared resources in the desktop build. Export a translation helper usable by both React and the host; preserve external diagnostic text with localized guidance.

## Acceptance

- Chinese system variants select Simplified Chinese; other defaults select English; saved language wins.
- Save applies and persists; Cancel discards; failures retain the language draft.
- Existing settings and learning data remain compatible; dictionary completeness and interpolation checks pass.
