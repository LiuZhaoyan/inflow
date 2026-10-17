# Task Index

Updated: 2026-10-17

Current behavior: [Project Status](../docs/PROJECT_STATUS.md). Future priorities: [Roadmap](../docs/ROADMAP.md).

## Current development

[Frontend visual system and component consistency](frontend-design-system/spec.md) has an initial shared-token and control-style implementation across Listen, the vocabulary notebook and Settings, with related shared consumers updated. Owner visual approval and acceptance at the exact agreed window sizes remain pending before wider migration. Temporary screenshots, fixture bridge and capture script were removed at the owner's request; the specification records the size mismatch found during review. No child implementation tickets have been created.

[Story navigation consistency and unified notices](story-navigation-notices/acceptance.md) passed source-checkout acceptance; its [implementation task](story-navigation-notices/issues/01-implement-navigation-and-notices.md) is resolved.

Story navigation/notices, interface internationalization and vocabulary completion passed source-checkout acceptance; installed-package verification belongs to the next release.

Continue developing from the source checkout. Completed specs and tickets remain available through their acceptance records.

## Deferred quality and release checks

- [English quality evaluation](english-learning/README.md): postponed by the owner; not a current blocker.
- [Video mask verification](video-subtitles/README.md): native maximized-window check when convenient; installed-app smoke test at the next release, not during rapid development.
- [Artifact request-ordering historical evidence](archive/artifact-state/architecture-and-verification.md): controlled delayed-reply divergence is resolved in the [current source checkout](story-navigation-notices/acceptance.md); installed-package verification remains a release check.

## Completed records

- [Vocabulary state ownership](vocabulary-state/acceptance.md): one Workspace owner for mutable vocabulary, derived generation targets, preserved drafts and reliable refresh after interrupted reads.
- [Story navigation and unified notices](story-navigation-notices/acceptance.md): latest-intent durable selection, preserved drafts/generation, shared bilingual compact notices and isolated crash recovery.
- [Interface internationalization](i18n/acceptance.md): bilingual workspace, native dialogs and saved preferences; all three [tickets](i18n/issues/) resolved on `codex/i18n`.
- [Story vocabulary synchronization](story-vocabulary/acceptance.md): collection highlights and sidebar counts refresh without changing generation snapshots.
- [Vocabulary completion](vocab-ui/acceptance.md): implemented Q1–Q9; [baseline audit and decisions](vocab-ui/audit.md), [approved spec](vocab-ui/spec.md).
- [Frontend visual acceptance](archive/frontend-workspace/visual-acceptance.md)
- [Settings acceptance](archive/settings/acceptance.md)
- [Windows desktop foundation and packaging](archive/desktop-learning/windows-packaging-acceptance.md)

Other historical designs and verification records remain under [archive/](archive/). Generated samples and local scripts are not active tasks.
