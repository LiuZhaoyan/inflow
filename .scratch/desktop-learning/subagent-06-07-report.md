# Windows packaging and installed learning-cycle acceptance

Date: 2026-10-09. Tickets: [06](issues/06-packaged-windows-worker.md), [07](issues/07-installed-learning-cycle-acceptance.md).

Both delivery slices passed the scoped native Windows acceptance. Changes remain uncommitted. This report separates deterministic checks, authenticated model output and installed-runtime evidence; it does not claim clean-VM qualification or new owner visual approval.

## Delivered package

`npm run desktop:package` builds the static renderer and host, builds a native Windows PyInstaller one-folder worker, and produces `build/package/Inflow-win32-x64/Inflow.exe`. The package contains compiled application files, dictionaries, the code license, worker dependencies and Korean analysis data. It excludes the development checkout, development virtual environment, model weights and learner records. The observed application folder is 922,246,236 bytes, before model preparation.

`build/package/install-desktop.ps1` is the personal-use installer. It copies the adjacent application folder to `%LOCALAPPDATA%\Programs\Inflow` and creates a Start menu shortcut. It refuses to overwrite an existing directory. It is a PowerShell copy installer, not an MSI or signed setup executable. The installer was executed with isolated destination/shortcut directories; installed host/worker hashes and the shortcut target match the package. See [installer evidence](generated-samples/desktop-packaged-07/installer/result.json).

The host resolves `resources/media_processor/media_processor.exe`, uses profile-owned writable model/media/SQLite locations, and retains JSON standard-stream communication and cancellation. Settings shows model availability and provides explicit download/cancel actions. See [README setup and usage](../../README.md).

## Root causes and fixes

- Settings correctly closes after a successful Save. The inherited driver incorrectly required an in-dialog success label. A two-second credential-only repro failed before the assertion fix and passed afterward; product Settings behavior was retained.
- An authenticated Responses result contained a valid JSON object inside a single outer JSON code fence. The shared parser now removes only that complete wrapper before parsing. The new regression failed before the one-line fix and passes afterward; unknown targets, extra fields, malformed JSON and accompanying commentary remain rejected. The [captured returned text](generated-samples/desktop-packaged-07/diagnostic-fenced-response/result.json) contains no request headers or credentials.
- The worker forced Hugging Face offline mode even during explicit setup. Only the `setup` command now permits downloads. A fresh-process regression fails on the old behavior and passes for setup, model status and transcription after the fix. The installed Settings download button subsequently downloaded both translation packages through Hugging Face.
- The inherited driver also selected the first sentence rather than the whole story, assumed newest artifacts were last, captured vocabulary selection before the second generation, and could report `ok` despite failed checks. Those acceptance assertions were corrected. Fresh-import selection works; no workspace or vocabulary-selection product change was needed.
- Electron captures could contain an older compositor frame or transiently fail. The driver disables background throttling, requests a native repaint and bounds/retries capture. The final [restored reader](generated-samples/desktop-packaged-07/screenshots/02-restored-story.png) and [restored player](generated-samples/desktop-packaged-07/screenshots/01-restored-listening.png) were visually inspected. Earlier cycle/relink PNGs are superseded as visual evidence.

## Deterministic evidence

- `npm test`: 42/42 passed, including host-owned SQLite cycles, exact source/snapshot retention, cancellation, invalid results, relinking and the fenced-JSON regression.
- Native Python `test_media_processor`: 8/8 passed, including the new setup/offline regression, audio decoding and configured model paths.
- `npm run lint`, `npm run typecheck`, static `desktop:build`, native `desktop:worker` and application packaging passed. Worker build took approximately 227 seconds; subsequent builds have a ten-minute timeout.
- Initial sandbox attempts blocked native path canonicalization, temporary-file writes or a rename. The same checks passed outside that sandbox; no application workaround was added for those restrictions.

Summary: [automated checks](generated-samples/desktop-packaged-07/automated/result.json).

## Authenticated model evidence and semantic review

The final installed cycle collected `안녕하세요` as `안녕하다` / `你好` from the real video's greeting. The first artifact contains three Korean sentences; generation took 1,313 ms and used 340 input / 192 output tokens. Its marked `안녕하세요` is used as the quoted greeting to a friend, with a corresponding Chinese translation. The Taiwan trip and night-market sentences are coherent ordinary context.

The learner then collected `오늘` / `今天` from that artifact's first sentence. The second artifact contains seven Korean sentences; generation took 2,161 ms and used 358 input / 392 output tokens. Its marked `오늘` in `오늘은 퇴근이 조금 늦었어요.` retains the intended temporal meaning. The remaining text describes washing, dinner, music and a quiet evening, with matching Chinese translations. Both artifacts contain text and target snapshots without generated audio.

This is an agent review of two representative outputs, not a broad linguistic quality rate or an independent owner review. The existing accepted quality limitations remain: output length and variety vary, transcription can be wrong, and structural target IDs alone do not establish semantics. The actual sentences, target source context, response metadata and token usage are retained separately in [live-model evidence](generated-samples/desktop-packaged-07/live-model/result.json).

## Installed Windows evidence

| Scenario | Observed result | Evidence |
| --- | --- | --- |
| First-use model status and parser download | Missing resources reported; parser downloaded into the profile | [06 models baseline](generated-samples/desktop-packaged-06/models/result.json) |
| Actual Settings download on rebuilt worker | Two absent translation packages downloaded; all four resources then Installed; 198 seconds | [06 download](generated-samples/desktop-packaged-06/download/result.json) |
| Real listening, seeking and loop wrap | 155.775-second Korean WebM; 31 sentences; 1.5× playback and actual loop wrap | [06 listening baseline](generated-samples/desktop-packaged-06/listen/result.json) |
| Initial-import cancellation | No false successful transcript; child shutdown | [06 cancellation baseline](generated-samples/desktop-packaged-06/cancel/result.json) |
| Final fresh learning cycle | 31 sentences in 96,402 ms; media word → three-sentence artifact → artifact word → seven-sentence artifact | [07 rebuilt cycle](generated-samples/desktop-packaged-07/rebuilt-cycle/result.json) |
| Exact restart | Transcript, position 1.66 s, sentence index 1, 1.5×, looping, sentence masks, video mask, source contexts, selections and complete artifact snapshots match | [07 restart](generated-samples/desktop-packaged-07/rebuilt-restart/result.json) |
| Failure preservation | Cancelled retranscription retains transcript/masks; invalid live credential surfaces an error; vocabulary and artifacts remain identical; valid credential restored | [07 failures](generated-samples/desktop-packaged-07/rebuilt-failures/result.json) |
| Missing media and relink | Transcript and learning retained; original file relinked through UI; vocabulary/sources/artifacts unchanged | [07 missing](generated-samples/desktop-packaged-07/rebuilt-missing/result.json) |
| Visible restored UI | Actual video frame with opaque subtitle cover and visible source; readable second story with highlighted target | [07 screenshots](generated-samples/desktop-packaged-07/screenshots/result.json) |

All final launch summaries report exit code 0 and zero orphan worker processes. Source text was visible outside mask mode; stored masks reapplied only in mask mode. Sentence changes hid translation. Restart showed source text and hid translation while retaining the independent video subtitle cover. The video required no subtitle file or transcript input. Baseline seeking/loop and initial-cancel checks are reused because their runtime paths did not change; the rebuilt worker repeated the final cross-feature transcription and cancellation flows.

## Observed prerequisites and limits

The native host reported Windows 11 x64, OS build `10.0.26200`, Electron 44.5.1, Node 24.21.0 and builtin SQLite 3.53.4. Worker construction used native Python 3.12.14 and PyInstaller 6.22.3. The worker bundles `python312.dll`, `python3.dll`, Visual C++ runtime DLLs, SSL/crypto, expat, ffi and SQLite dependencies.

Installed runs start with the installed application as their current directory and `PATH=C:\WINDOWS\System32;C:\WINDOWS`. No development Python, Node, conda or repository-script path is supplied to product processing. `INFLOW_PYTHON` is absent and the worker resolves under installed resources. The external acceptance driver still lives in the checkout; it is test instrumentation rather than a product runtime dependency. Most model weights are seeded into isolated writable profiles to avoid repeatedly downloading 1.8 GB. Real packaged downloads cover the parser baseline and both translation packages; the full Whisper network download was not repeated in this session.

This machine still has developer tools installed. No clean Windows VM, all supported codecs, other Windows versions or maximized-window visual acceptance was tested here. The demonstrated conclusion is a self-contained packaged worker under a restricted runtime environment on the observed machine, not universal clean-machine compatibility. Windows credential encryption, writable profile storage and internet access for initial downloads/cloud requests are required. The installer is unsigned, has no automatic update system, and leaves learner data intact on application removal.

## Evidence hygiene and working tree

Evidence folders retain JSON results, screenshots and small logs only. Seven inherited profile folders, including their databases, browser caches, managed media and model copies, were removed from the 06/07 evidence directories. Active isolated profiles remain under ignored `build/package-test/profiles/`; the original real-video sample is preserved. Temporary `debug-dialog.cjs`, `debug-popup.cjs` and the generation probe were deleted. Earlier failed run results remain diagnostic history, not passing evidence. No secret, database or generated media was added to tracked files; no commit was made and unrelated work was not reverted.

## Maintained rerun entry points

After building/installing, run these from the checkout. The example uses the built package; supply `exe=<installed Inflow.exe path>` to test another installed copy. Credentials are read from the ignored environment file, never from command-line arguments. `cycle` resets only its isolated test profile under `build/package-test/profiles/`; do not use a learner's real profile. Model weights are seeded from `.models/` and the default media is the preserved Korean sample.

```powershell
node scripts/verify-packaged.cjs download .scratch/desktop-learning/generated-samples/rerun-download
node --env-file-if-exists=.env scripts/verify-packaged.cjs cycle .scratch/desktop-learning/generated-samples/rerun-cycle
node scripts/verify-packaged.cjs restart .scratch/desktop-learning/generated-samples/rerun-restart expectedFile=.scratch/desktop-learning/generated-samples/rerun-cycle/result.json
node --env-file-if-exists=.env scripts/verify-packaged.cjs failures .scratch/desktop-learning/generated-samples/rerun-failures
node scripts/verify-packaged.cjs missing .scratch/desktop-learning/generated-samples/rerun-missing "profile=build/package-test/profiles/中文 循环 目录" expectedSentences=31
node scripts/verify-packaged.cjs screenshots .scratch/desktop-learning/generated-samples/rerun-screenshots
```
