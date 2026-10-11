# Interface internationalization acceptance

Date: 2026-10-11
Status: Source-checkout implementation and acceptance complete
Integration branch: `codex/i18n`
Baseline: `efc16fa`; verified application commit: `5a3ff3a`

## Delivered behavior

Simplified Chinese and English cover the learning workspace, libraries, Settings, accessible names, dates, quantities, application-owned failures and native dialog options. Without a saved preference, Chinese system/browser variants select `zh-CN`; other languages select `en`. Settings Save persists and applies the choice immediately; Cancel discards the draft. Desktop SQLite and browser-local preferences are independent. Failed drafts and successful changes in other Settings categories are retained for retry.

Interface switching preserves Korean/English source content, Chinese meanings and sentence translations, notes, target snapshots, selected vocabulary, playback position/rate and masks. Older profiles and color-only callers remain compatible, with no learning-data migration. Shared TypeScript dictionaries, React Context and native Intl add no dependency or locale route.

## Verification

All checks passed against the verified application commit:

| Check | Outcome |
| --- | --- |
| `npm test` | 79 tests passed, including existing domain/security coverage, locale defaults, persistence/restart, rejected updates, dictionary integrity, interpolation/fallback and error presentation |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run desktop:build` | Passed; renderer export and host build include shared locale resources |
| `node .scratch/i18n/verify.cjs` | Desktop, second-process restart and browser phases passed; no renderer errors in any phase |
| Fixed-point code review | No standards findings; both specification findings fixed and re-reviewed without new material findings |

The maintained [acceptance driver](verify.cjs) uses isolated Electron profiles, real IPC, SQLite and Windows credential persistence. Processing and provider responses are deterministic fixtures. It covers Save/Cancel, failed language and credential saves, partial saves/retry, invalid locales, both interfaces, native import/relink options, narrow Settings layout, and learning-state preservation. A separate HTTP-served renderer has no desktop bridge and verifies browser storage failure/retry and reload restoration.

Native dialog calls are captured with deterministic responses; actual OS dialog interaction is not claimed. Owned worker and expanded HTTP failures change language after switching. External diagnostics remain data alongside current-language guidance. Review fixes cover all 24 distinct owned worker failures and separate browser API diagnostic data from localized guidance; see [the review](review.md) and commit `5015b86`, integrated in `5a3ff3a`.

Successful evidence is retained locally under `../desktop-learning/generated-samples/i18n-native-0cdt5w/`:

- [Desktop result](../desktop-learning/generated-samples/i18n-native-0cdt5w/initial.json), [restart result](../desktop-learning/generated-samples/i18n-native-0cdt5w/restart.json), [browser result](../desktop-learning/generated-samples/i18n-native-0cdt5w/browser.json).
- Inspected screenshots: [narrow Settings](../desktop-learning/generated-samples/i18n-native-0cdt5w/settings-narrow.png), [Chinese Story](../desktop-learning/generated-samples/i18n-native-0cdt5w/story-chinese.png), [English vocabulary](../desktop-learning/generated-samples/i18n-native-0cdt5w/vocab-english.png), [Chinese Listen](../desktop-learning/generated-samples/i18n-native-0cdt5w/listen-chinese.png). Controls fit, with source text and Chinese assistance retained.

Generated profiles, credential files, databases and media remain ignored local evidence. The driver can regenerate the assertions and screenshots; they are not committed application resources.

## Limits and environment

Installed-package acceptance, release/publication, live provider or linguistic quality, audible pronunciation quality and owner visual approval are outside this result. The separately recorded [artifact request-ordering risk](../archive/artifact-state/architecture-and-verification.md) remains unresolved and unchanged.

Windows sandbox relink restrictions were resolved by running the required checks with normal local permissions. Next.js could not build through a cross-drive dependency junction; copying the existing installed dependencies into this checkout allowed the build without a dependency or lockfile change. Acceptance-driver protocol registration timing and non-cloneable JavaScript return values were corrected before the successful complete run; these were harness failures, not outstanding product failures.
