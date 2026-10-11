# Task Index

Updated: 2026-10-11

Current behavior: [Project Status](../docs/PROJECT_STATUS.md). Future priorities: [Roadmap](../docs/ROADMAP.md).

## Current development

- [Interface internationalization](i18n/spec.md): implementation in progress on `codex/i18n`; [tickets](i18n/issues/) track shared preferences, renderer interfaces and host integration.

Vocabulary completion passed source-checkout acceptance; all three [tickets](vocab-ui/issues/) are resolved. Continue developing from the source checkout; installed-package verification belongs to the next release.

## Deferred quality and release checks

- [English quality evaluation](english-learning/README.md): postponed by the owner; not a current blocker.
- [Video mask verification](video-subtitles/README.md): native maximized-window check when convenient; installed-app smoke test at the next release, not during rapid development.
- [Artifact request-ordering risk](archive/artifact-state/architecture-and-verification.md): known renderer/persistence divergence under controlled delayed replies; evaluation deferred, not fixed.

## Completed records

- [Story vocabulary synchronization](story-vocabulary/acceptance.md): collection highlights and sidebar counts refresh without changing generation snapshots.
- [Vocabulary completion](vocab-ui/acceptance.md): implemented Q1–Q9; [baseline audit and decisions](vocab-ui/audit.md), [approved spec](vocab-ui/spec.md).
- [Frontend visual acceptance](archive/frontend-workspace/visual-acceptance.md)
- [Settings acceptance](archive/settings/acceptance.md)
- [Windows desktop foundation and packaging](archive/desktop-learning/windows-packaging-acceptance.md)

Other historical designs and verification records remain under [archive/](archive/). Generated samples and local scripts are not active tasks.
