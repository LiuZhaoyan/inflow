# Handoff: Ticket 06 (packaged Windows worker) + Ticket 07 (installed learning-cycle acceptance)

Date: 2026-10-09
Origin: a background worker agent (model glm-5.3-flash) ran this task twice (3h + 3h timeouts, ~3.5M tokens) and did not finish. Its work is uncommitted in the working tree. This document hands the task to a new agent.

## Task

Implement and accept two tickets in the Inflow repository (Windows-first personal Korean-learning desktop app: Electron host + Next.js 16 static renderer + Python media-processing worker):

- `.scratch/desktop-learning/issues/06-packaged-windows-worker.md` — package the app so it imports/transcribes/replays media with a bundled processing runtime, no system Python, no dev checkout.
- `.scratch/desktop-learning/issues/07-installed-learning-cycle-acceptance.md` — full installed-app cycle: video → vocabulary → text artifact → vocabulary → second artifact, restart restore, failure handling; automated / live-model / installed-Windows evidence recorded separately.

Read first: `AGENTS.md`, `docs/PRODUCT_SPEC.md`, both ticket files, `.scratch/archive/desktop-learning/technical-recommendation.md` (historical baseline).

## Environment facts

- Windows machine; the previous agent drove bash through WSL (`/mnt/d/...`) and called Windows executables — that works. `bash` from the repo root is slow if you scan untracked dirs; prefer `git grep`.
- `.venv-win/` is a conda-style native Windows Python venv. PyInstaller is installed there. Its CPython runtime DLLs live in `Library/bin` (not where PyInstaller looks) — `scripts/build-worker.mjs` already copies `libcrypto-3-x64.dll`, `libssl-3-x64.dll`, `ffi-8.dll`, `libexpat.dll`, `sqlite3.dll`.
- The repo has ~75 tracked files with whitespace/line-ending-only churn from another session (`git diff --ignore-all-space` shows zero content for them). Do not revert or reformat them; make surgical edits only.
- Real Korean test video (only copy, do not duplicate): `.scratch/desktop-learning/generated-samples/desktop-acceptance-GBTE8b/韩语 sample.webm`.
- Live-model generation uses the owner's locally configured DeepSeek credential (host environment / ignored local env file). Never write it into tracked files or evidence.

## What the previous agent built (all uncommitted)

New npm scripts (`package.json`): `desktop:worker` → `scripts/build-worker.mjs` (PyInstaller one-folder build of `scripts/media_processor.py` into `build/worker/`, collect-all for Korean morphological data/spaCy/tokenizers); `desktop:package` → `npm run desktop:build` + worker + `scripts/package-desktop.mjs` (`@electron/packager`, new devDependency, portable folder `build/package/Inflow-win32-x64/Inflow.exe`; staging includes only compiled renderer, compiled host, package.json — sources/node_modules/models/venv excluded).

Verification harness:
- `scripts/verify-packaged.cjs` — outer orchestrator. Launches the packaged exe with a hermetic profile (optionally Chinese/spaced path), a minimal environment without dev paths, and records evidence + orphan-process checks. Usage: `node scripts/verify-packaged.cjs <phase> <runDir> [option=value ...]`. Phases: `models listen reopen missing cancel cycle failures restart`.
- `scripts/verify-packaged-driver.cjs` — driver loaded INSIDE the packaged app via the `INFLOW_DESKTOP_DRIVER` seam in `desktop/main.ts`, configured through `INFLOW_VERIFY_*` env vars (never active at normal runtime). Configures the credential through the real Settings dialog UI (bridge-only configuration leaves renderer credential state stale and generation disabled).

Modified tracked files (real content under `--ignore-all-space`): `desktop/main.ts` (driver seam, worker resolution from resources, explicit writable model/data paths), `desktop/preload.cjs`, `scripts/media_processor.py` (packaging-related changes), `scripts/setup_models.py`, `scripts/build-desktop.mjs`, `src/listening/desktop.ts`, `src/listening/media-server.ts` (+ test), `src/workspace/SettingsDialog.tsx`, `src/workspace/workspace.css`, `package.json`, `package-lock.json`.

Temporary debug scripts to delete when done: `scripts/debug-dialog.cjs`, `scripts/debug-popup.cjs`.

## Ticket 06 state: functionally complete, all packaged phases pass

Evidence in `.scratch/desktop-learning/generated-samples/desktop-packaged-06/` — every `result.json` has `"ok": true`:

| Phase | Key checks |
| --- | --- |
| `models` | packaged app; worker binary resolved from `resources\media_processor\media_processor.exe` |
| `listen` | whisper model present; transcription 31 sentences in 67.6s; media served from managed `inflow://` URL |
| `reopen` | cached segments reopen without reprocessing (31 vs 31); learning position and selected sentence restored |
| `missing` | deleted managed media handled; source still present for relink |
| `cancel` | cancellation leaves empty transcript without false success; Chinese path profile `中文 取消 目录` |

Remaining for ticket 06: tick the acceptance checkboxes in the ticket file, set the Status line, and record the clean Windows runtime prerequisites actually observed (one criterion explicitly requires this note).

## Ticket 07 state: `cycle` phase failing — the actual open work

Evidence in `.scratch/desktop-learning/generated-samples/desktop-packaged-07/` (`cycle` and `cycle-attempts` both `"ok": false`). Two distinct failures recorded in their `result.json`:

1. `credential save failed: DIALOG-GONE href=inflow://app/ start=true bodyLen=14494` at `configureKeyViaUI` (`scripts/verify-packaged-driver.cjs:32`) — the Settings dialog disappears while the driver is configuring the key. Unknown whether this is a driver timing bug or a real app defect; it did not reproduce on a restored profile in earlier debug runs.
2. `Timed out waiting for story sentences` — generation dialog opens and submits (state shows `story-generation-dialog:open`, two `Generate story` buttons: one in the artifact library menu, one in the dialog; the driver intentionally submits via the dialog's own footer button) but no story sentences arrive. Could be live-model latency, credential state, or a real defect.

Related investigation in progress: on a FRESH import → transcribe → select cycle, the vocabulary selection popup never triggered (`selectionChanges: 0`), while the same flow works on a restored profile (logs show `selection: selected: 안녕하세요`, `popup:true`). Debug evidence under `build/package-test/debug-*` and `scripts/debug-popup.cjs`. The previous agent was mid-way determining whether the selection popup fails under fresh-import conditions (possible real defect in `src/workspace/LearningWorkspace.tsx` / `VocabularySelection` interplay) or is a driver artifact.

Remaining for ticket 07 (priority order):
1. Diagnose and fix the `cycle` failures (credential DIALOG-GONE, story generation timeout, fresh-import selection popup). If a defect is genuinely outside the packaging/cycle scope, record it as a finding instead of endlessly debugging.
2. Run the full cycle + restart + failure phases (`cycle restart failures` in verify-packaged.cjs terms) with automated / live-model / installed evidence recorded separately.
3. Update setup/usage instructions with observed Windows behavior and known processing/media limits.
4. Tick both tickets' checkboxes, set Status lines, write the final report to `.scratch/desktop-learning/subagent-06-07-report.md`.

## Hard constraints

- Do not commit; leave changes in the working tree.
- Evidence directories must contain only `result.json`, screenshots, and small logs. Full Electron profile folders (Code Cache, GPUCache, leveldb, `learning.sqlite`, copied `models/` trees) must NOT be left in evidence dirs — this repository just cleaned ~600MB of such leftovers. The current `desktop-packaged-06/` and `desktop-packaged-07/` dirs still contain them; delete the profile folders but keep result.json/PNGs.
- Long commands (Electron runs, transcription ~70s, live generation) need explicit timeouts; a hung process previously stalled the run twice.
- `npm test` / `npm run lint` / `npm run typecheck` are the check entry points (opt-in per AGENTS.md).
- Do not revert the unrelated whitespace churn; do not touch `.worktrees/content-resize` (active worktree of another session).
