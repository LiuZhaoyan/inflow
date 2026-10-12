# Implement reliable learning artifact navigation and unified notices

Type: task
Status: resolved

Deliver the full behavior in [the approved spec](../spec.md), covering Q1–Q14. This issue deliberately combines closely related Story navigation feedback with app-wide presentation consistency so acceptance can verify the complete learner experience.

## Scope

- Deepen existing learning artifact navigation so latest valid intent wins across Library, history, vocabulary source navigation and generation.
- Separate candidate reading from persistent acceptance; draft edit, page departure, failed read, superseding intent or failed commit must leave the last accepted Story and its saved selection intact.
- Keep successful generated passages saved when automatic navigation is canceled by a new dirty draft.
- Introduce one compact, single-line, pink-on-purple error/notice UI module used consistently across Listen, Story, Vocabulary notebook, Library and Settings, with inline and upper-right floating variants.
- Support ellipsis + accessible full details on activation, dismiss action, ~5-second transient feedback and persistent actionable errors; preserve bilingual messages and safe external diagnostics.

## Acceptance

1. Deterministic delayed-order navigation across at least two entry points shows and persists only the latest valid Story; reload and restart agree.
2. A draft becoming dirty cancels an in-flight switch permanently, preserves its contents and selected Story, and produces a non-blocking floating notice.
3. Leaving Story, read failure and persistence failure never allow late updates to display or save the abandoned selection.
4. Successfully generated learning artifacts and target snapshots survive canceled auto-navigation; normal auto-navigation succeeds with no dirty draft.
5. Unified error notices share one visual treatment and honor inline/floating placement, single-line truncation, full safe diagnostics, close and lifetime behavior in both interface locales.
6. Existing host integrity, learning data, Vocabulary source/navigation, form validation and protected edits remain intact.
7. Targeted tests, repository checks and isolated native desktop acceptance pass. Report controlled timing evidence without claiming ordinary-runtime reproduction.

## Testing seam

Prefer the existing renderer → Electron host → SQLite learning artifact workflow, plus real app rendering for notices. Test behavior across the public interface; avoid tests coupled to internal hook/private state. Use the existing host, IPC, artifact and native acceptance patterns.

## Notes

The spec was approved before this implementation. Record acceptance evidence and any unresolved questions during the implementation task.

## Answer

Implemented Q1–Q14: one latest-intent navigation policy, read-only candidate lookup, guarded durable acceptance, immediate cancellation for real drafts or view departure, and generation retention independent of automatic navigation. Unified compact bilingual notices preserve field associations and remedies, with safe full details, keyboard access, dismissal and transient lifetimes. No schema migration or new dependency.

[Acceptance](../acceptance.md) records 83 passing tests, lint, typecheck, desktop build, six isolated native-process phases, and zero remaining findings from independent Standards and Spec reviews. Installed-package, live-provider, screen-reader and owner visual acceptance remain unverified; screenshot capture failed in this environment.
