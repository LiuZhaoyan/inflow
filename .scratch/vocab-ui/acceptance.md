# Vocabulary completion acceptance

Date: 2026-10-10
Status: Source-checkout implementation complete; Q1–Q9 verified.

## Delivered behavior

The [approved spec](spec.md) is implemented in `VocabularyNotebook`, `ArtifactLibrary`, `StoryTargetsDialog` and `LearningWorkspace`, with host persistence in `desktop/operations.ts` and its typed preload/IPC contract. Local system speech pronounces dictionary forms; compact optional notes save per entry/sense; confirmed deletion retains original media and historical Stories. Unsupported Add context, duplicate Source and Story word-action UI are removed. Loading, save feedback, view visibility, selection refresh and mixed-language continuation are corrected. Story target navigation selects the exact notebook ID, including distinct senses and deleted-entry feedback.

Existing profiles gain an empty note column through an additive migration. Omitted notes preserve saved content. Context reads return previously stored UTF-16 occurrence positions; legacy contexts without positions use a documented first-match fallback until recollected. No dependency, provider, Settings selector, audio cache or undo mechanism was added.

## Verification

| Check | Observed result |
| --- | --- |
| `npm test` | 67 passed, 0 failed; note validation/preservation, legacy migration, transaction rollback, positions, media/snapshot retention and IPC access/parity included. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed. |
| `npm run desktop:build` | Compiled host and production static renderer successfully. |
| `node .scratch/vocab-ui/verify.cjs` | Native Electron UI and second-process restart passed with an isolated profile and synthetic media. No provider calls. |
| `node .scratch/vocab-ui/voice-probe.cjs '<existing electron.exe>'` | Real local English/Korean voices enumerated and muted synthesis start/end events completed. |

The native driver exercises initial loading failure/retry, an older delayed empty response ignored after newer state, correct second-token and multiple-token highlighting, retained selection after real source collection, source/language/search visibility after saves, committed writes with subsequent reads deliberately unavailable, note draft guards/cancel/write failure/retry, delete cancel/write failure/success, both Story target links through filters, deleted-target feedback without recreation, and preserved mixed-language checks with Continue disabled. It checks compact Notes dimensions and captures 1440×900 and 1080×720 viewport screenshots. Controlled synthesis methods use actual installed voice objects to check asynchronous readiness, matching language/local service, repeated-click stop, stale completion, failure/retry, missing voice and cancellation on selection/view changes. This UI lifecycle fixture is distinct from the real muted synthesis probe.

Machine-local ignored evidence:

- `../desktop-learning/generated-samples/vocab-native-bf1SFi/`: final `result.json`, `restart.json`, screenshots and isolated database/profile.
- `../desktop-learning/generated-samples/vocab-voice-z8HV02/result.json`: actual local voice enumeration and successful muted English/Korean synthesis.

The harness intentionally logs fixture errors for failed loading, note writing and deletion. Those expected errors are followed by explicit recovery assertions. Earlier driver failures were corrected: returning a confirmation function could not be cloned across Electron evaluation, and the driver referenced a nonexistent Story getter. They did not require application changes.

## Verification environment

The worktree initially had no dependencies. The installed source checkout at `D:/DeskBox/project/inflow` has the identical package-lock hash. Dependencies were reused without downloads. A cross-drive root junction caused Next/Webpack to misresolve client entry paths; the workspace now has a local copy of the matching Next package and links to the remaining installed packages. No main-checkout source or lockfile changed.

Windows sandbox restrictions caused an existing relink test's rename to fail and prevented Next type-generation path canonicalization. The same full suite and typecheck passed with normal filesystem access. Native checks and builds also ran with normal Windows access against isolated/generated workspace paths.

## Deferred and unverified

- Pronunciation method selection in Settings is approved future work; alternative methods and timing are undefined.
- Audible pronunciation quality, other machines' voice availability, installed-package and clean-machine acceptance were not checked. Missing-language voices remain an explicit supported state.
- Owner visual acceptance, representative large-notebook performance and exhaustive keyboard/screen-reader evaluation are not claimed.
- The previously recorded [Story request-ordering risk](../archive/artifact-state/architecture-and-verification.md) remains unresolved and outside this change.
- Deletion is irreversible after confirmation; original media and saved Story snapshots are retained.
