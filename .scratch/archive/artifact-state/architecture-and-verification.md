# Learning artifact state: architecture and verification

Historical consolidation, 2026-10-09. For current behavior use [Project Status](../../../docs/PROJECT_STATUS.md) and the implementation.

## Architecture

`LearningWorkspace` owns the shared artifact lifecycle through `useLearningArtifacts` (`src/workspace/useLearningArtifacts.ts`). The owner holds artifact list, accepted selection, pending source request, restoration, opening from Library/history/source, generation, busy/error state and cancellation. Readers consume snapshots and commands rather than independently invoking Story DesktopBridge operations or synchronizing paired state setters.

Reader-local state includes sentence selection, translation visibility, history filtering, topic and scrolling. Accepted source navigation identifies the requested sentence. Navigation preserves draft checks, and generated passages and vocabulary source contexts retain their existing host IPC and SQLite contracts.

The initial shared-state change was followed by the 2026-10-09 flow-ownership refactor. This consolidation did not change request ordering, IPC or database semantics.

## Verification completed

Desktop build, type checking, focused ESLint, `desktop/artifacts.test.ts`, and isolated native Electron/SQLite fixture acceptance passed at the time. The acceptance covered restoration, Library/history/source opening, sentence and translation resets, draft protection, generation failure and retry, vocabulary provenance, renderer reload and process restart. The fixtures used deterministic processing/generation adapters, not cloud-quality or installed-package qualification.

The native harnesses were `.scratch/frontend-workspace/verify-library.cjs` and `.scratch/artifact-state/verify-request-ordering.cjs` at the time of testing; verify their existence and current applicability before rerunning. Historical generated JSON samples were local ignored artifacts and may not be available in another checkout.

## Outstanding request-ordering risk

The 2026-10-09 investigation tested eight scripted scenarios with renderer reload and fresh-process restart. Ordinary scripted history and Library selections did not exhibit stale selection. Controlled *reply-only* delay did reproduce divergence:

- History A then B: when A's reply arrived after B's, the reader/Library could show A while the host had saved B; reload returned to B.
- Library A then history B: a late A reply could similarly override the newer displayed selection.
- Library A then B: source-effect cleanup rejected the stale A reply in the tested path.
- An edited draft after host execution could block renderer navigation while the host had already persisted A, producing a different selection after reload.

Delayed initial restoration and pending generation did not demonstrate the same overlap under the tested UI constraints. These are controlled scheduling risks, **not** a confirmed ordinary-runtime user bug. The subsequent flow-ownership refactor reran the scenarios and preserved these outcomes; **no ordering fix was implemented**.

A future fix should define request identity/latest-intent acceptance across history and source opening, reconcile host persistence with rejected navigation, and add deterministic regression coverage for delayed replies, mixed navigation, edited drafts, reload and restart. Do not infer correctness solely from ordinary click-order tests.

## Historical boundaries

The original research used source baseline `fedc987`. The detailed issue, scenario tables and local evidence links were removed during documentation cleanup; committed history remains available through Git where applicable.
