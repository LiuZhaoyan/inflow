# 02: Evaluate Learning artifact flow deepening

Status: resolved
Type: task
Recorded: 2026-10-09
Approved: 2026-10-09
Specification: [Shared Learning artifact state](../spec.md).

## Starting point

The original architecture review proposed concentrating Learning artifact restoration, opening and generation behind one owning module. Commit `fedc987` completed the subsequently approved, narrower shared-state change; it did not implement that broader proposal.

Before this change, LearningWorkspace owned the artifact list and active artifact. ArtifactLibrary invoked DesktopBridge for restoration, source navigation, history opening and generation, and updated the owner through onArtifactChange and onArtifactsChange. Its interface and orchestration were not consolidated into a focused Learning artifact module.

## Next decisions

- [x] Evaluate whether concentrating these flows provides additional locality and leverage after duplicate state removal; moving functions into a hook without reducing caller knowledge is insufficient.
- [x] Define the smallest owning module and interface if the proposal is pursued. A new file or abstraction is not a requirement.
- [x] Keep reader-local sentence selection, translation visibility, filtering and scrolling with the reader; preserve draft protection and existing host persistence contracts.
- [x] Specify and verify restoration, both opening paths, generation failure/retry and vocabulary provenance through the chosen interface before marking this proposal implemented.

## Separate investigation

[Overlapping Story request ordering](../request-ordering-report.md) is a completed, independent investigation: ordinary scripted checks were negative, while controlled reply-only delays reproduced renderer/persistence divergence. The owner removed its issue record. This follow-up does not authorize a request-ordering fix.

## Comments

2026-10-09: Recorded the gap identified when the owner asked whether architecture-review candidate 01 was fully complete. The agreed shared-state scope is complete; broader flow deepening remains unimplemented and awaits scope confirmation.

2026-10-09: The owner requested resolution of this follow-up and deletion of the investigation branch. Its research report, runnable check and this ticket were retained in main before deleting the branch; artifact #01 remains removed.

## Answer

Implemented [useLearningArtifacts](../../../src/workspace/useLearningArtifacts.ts) at workspace lifetime. It owns the list, pending source request, accepted artifact/source selection, restoration, source opening, history opening, generation, errors, busy state and generation cancellation. Its interface exposes snapshots and source-open/history-open/generate/cancel commands; callers cannot set the artifact list or active artifact independently, or manage the source-effect trigger. This removes the reader's direct DesktopBridge orchestration, generation job bookkeeping and paired owner-update callbacks rather than merely relocating functions behind those callbacks.

The reader retains sentence selection, translation visibility, history filtering, topic and scrolling. Accepted navigation metadata resets its sentence/translation state while preserving the filter and topic; vocabulary-source navigation selects the requested sentence. Source-effect cleanup, history draft checks before and after awaiting, generation failure/retry and the existing IPC/SQLite contracts are preserved. The recorded ordering risks are unchanged and are not fixed by this ticket.

Verification on 2026-10-09:

- `npm run desktop:build` and `npm run typecheck`: passed with normal local permissions after sandbox filesystem failures.
- Focused ESLint for the owner, workspace, reader and extended native runner: passed.
- `node --import tsx --test desktop/artifacts.test.ts`: passed; two cycles cover persistence, failure, cancellation, retry and restart.
- `node .scratch/frontend-workspace/verify-library.cjs --artifacts`: passed through real host IPC/SQLite, including restoration, history/Library opening, vocabulary-source navigation to sentence two, same-story sentence/translation reset, preserved history filter, pre/post-await draft protection, generation failure/retry, provenance and renderer reload. [Native result](../../desktop-learning/generated-samples/library-native-nSjlAh/result.json) records no renderer errors.
- `node .scratch/artifact-state/verify-request-ordering.cjs`: all eight scenarios, renderer reloads and fresh-process restarts passed against the final refactor. The runner waits for the native generation-dialog close event before collecting vocabulary. [Aggregate evidence](../../desktop-learning/generated-samples/ordering-native-eAiwO3/result.json) preserves the earlier controlled-delay outcomes, with no renderer errors or cloud requests.

React review confirmed one data owner, no public state setters or duplicate artifact state, cleanup of delayed source replies and generation jobs, and reader-local interaction state. Verification uses isolated fixture profiles and deterministic adapters; it does not claim live provider quality or installed-package acceptance.
