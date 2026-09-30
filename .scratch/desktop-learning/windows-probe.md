# Native Windows Listening Feasibility Probe

Date: 2026-09-30.
Status: native Windows processing and browser checks recorded; ticket 01 awaits owner quality acceptance.

## Initial WSL-launched host probe

- Windows PowerShell can launch from WSL and access the checkout as `\\wsl.localhost\Ubuntu\home\ada\projects\inflow`.
- Native Node is v24.19.0.
- Python on PATH and `D:\miniconda\python.exe` are both Python 3.13.2. `py -0p` reports `No installed Pythons found!`; there is no native Python 3.12 environment.
- Conda 26.1.1 is available at `D:\miniconda\Scripts\conda.exe`.
- The current Windows Python has none of `av`, `faster_whisper`, `kiwipiepy`, `ctranslate2` or `sentencepiece` installed.
- The existing Linux/WSL `.venv` and `.models` occupy about 546 MB and 533 MB. These are not a native Windows runtime.
- The selected media is readable from Windows UNC at `\\wsl.localhost\Ubuntu\tmp\inflow-hanbid-ko.webm`; it is 26,999,144 bytes, with freshly computed SHA-256 `edf0a8c7ac7a104246ed9c1c2a0e81b51b4509227895c3f50e8c3978f3bd5037`. [The WIKITONGUES Hanbid source page](https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Hanbid_speaking_Korean.webm) identifies Wikitongues / Teddy Nee, VP8/Vorbis, 155.775 seconds and CC BY-SA 4.0. Windows read access and file size were checked; Windows decoding and transcription were not.
- The Windows D: drive has about 34 GB free. The WSL filesystem has about 861 GB free.

## UNC environment attempt

An offline Conda dry-run could not resolve Python 3.12 because the conda-forge index was absent from the local cache. One online dry-run then used the explicit `conda-forge` channel, target prefix `.venv-win` on the WSL UNC checkout, and a workspace-local `.conda-win-cache`:

```powershell
$env:CONDA_PKGS_DIRS = "\\wsl.localhost\Ubuntu\home\ada\projects\inflow\.conda-win-cache"
& "D:\miniconda\Scripts\conda.exe" -vv create --dry-run --json `
  --prefix "\\wsl.localhost\Ubuntu\home\ada\projects\inflow\.venv-win" `
  --override-channels -c conda-forge python=3.12 pip
```

Conda fetched channel metadata, then failed while locking its repodata cache on the UNC path. `msvcrt.locking` raised `OSError: [Errno 36] Resource deadlock avoided`, followed by `conda.exceptions.LockError: Failed to acquire lock.` The command was a dry-run; it did not create `.venv-win` or install packages. The temporary workspace cache was removed after the probe.

## Handoff and acceptance boundary

Use a Windows-local checkout for native Python/model setup. [The setup script](../../scripts/setup_windows.ps1) rejects UNC roots, creates an isolated Python 3.12 environment with the explicit conda-forge channel, installs the pinned media dependencies and downloads the local models. It sets `INFLOW_PYTHON` and `INFLOW_MODELS_DIR` for the current PowerShell session. No Conda base environment was changed.

The setup script was invoked from the current UNC checkout and stopped at its guard before creating an environment or installing packages.

At the end of this initial probe, the Windows worker, real-video transcription and player interactions had not been accepted. The existing [backend acceptance record](../../docs/BACKEND_ACCEPTANCE.md) is Linux/WSL evidence only. The native continuation below records subsequent Windows evidence separately.

## Native Windows continuation

Date: 2026-09-30 (Asia/Shanghai). Checkout: `D:\DeskBox\project\inflow`, `main` at starting commit `5bba8fd74d4cc90db082dd0fb53f7cccde07756c`. Native Git found only the untracked owner handoff before this work; no line-ending cleanup was needed.

### Runtime and setup

- Windows 11 Pro, build `10.0.26200`, AMD Ryzen 7 5800H (8 cores / 16 logical processors), approximately 13.9 GiB visible memory.
- Native Node `24.19.0`, Next `16.1.1`, isolated Conda Python `3.12.14` in `.venv-win`. Base Python was not modified.
- `scripts/setup_windows.ps1` and native `npm ci` completed. An initial Conda libsqlite download failed with HTTP 000; the cached retry succeeded.
- Worker libraries: faster-whisper `1.2.1`, PyAV `18.1.0`, CTranslate2 `4.8.2`, Kiwi `0.23.2`, sentencepiece `0.2.2`, ONNX Runtime `1.30.0`.
- The initial unbounded transitive install selected PyAV `19.0.0`. Real transcription failed with `TypeError: open() got an unexpected keyword argument 'metadata_errors'` in faster-whisper's audio decoder. A tiny WAV regression reproduced the failure; pinning PyAV to the previously working `18.1.0` made that check and real transcription pass.
- Existing platform-independent model files were copied from the preserved WSL `.models` into the native ignored `.models`. Setup recognized the local weights. SHA-256 comparisons confirmed identical core files: Whisper `d01c3014881c9c6f3133c182f3d2887eb6ca1c789a7538c5c007196857a0a6a9`, Korean→English `30170587ac837b737a749d4f821feb0925937cc9cbbedcf6aed07b9cf974f6ad`, English→Chinese `1a039114d9456b6528fabb65b455b6f156319634a0f984b1f6018f7737d67598`.
- The native development server received explicit `INFLOW_PYTHON` and `INFLOW_MODELS_DIR` paths. Models and media stayed local during inference.

### Real video and browser evidence

The selected video was copied to the ignored acceptance directory as `generated-samples/windows-acceptance/韩语 sample.webm`, preserving the source copy. Native inspection confirmed 26,999,144 bytes, SHA-256 `edf0a8c7ac7a104246ed9c1c2a0e81b51b4509227895c3f50e8c3978f3bd5037`, VP8/Vorbis, 1080×606 and 155.775 seconds. The provenance and license remain those recorded above; this copy is not committed learning media.

Browser verification used agent-browser `0.38.1` and native Windows HeadlessChrome `154.0.0.0`. The page rendered its controls without an error overlay or browser console errors. These are native development-browser checks, not packaged Electron evidence or a human audio-quality review.

| Check | Observed result |
| --- | --- |
| Full-media playback before processing | Video decoded to 1080 pixels wide, time advanced and frames were decoded. |
| Speed and seeking | Actual playback rate changed to 1.5×; the UI timeline sought to 80 seconds. |
| Real native transcription | HTTP 200 in 15.036 seconds, returning 38 structurally validated segments; successful retry took 14.941 seconds. |
| Native timing range | First segment 0.080–17.820 seconds; last 152.740–153.280. API and renderer validation accepted ordered, nonoverlapping ranges and complete group reconstruction. |
| Reveal and navigation | Small revealed one complete group; more revealed two of two groups and seven of ten; full revealed ten of ten. Previous/next navigation worked; changing the segment hid source text and translation. |
| Independent local translation | Hidden source text stayed hidden while `저희 가족은 네 명입니다.` produced `我们的家庭是四个人。` in 1.445 seconds; another request took 1.155 seconds. |
| Sentence loop and stopping | At 1.5× the 18.040–20.480-second range looped twice in the sampled interval. Disabling loop stopped playback at 20.480 seconds. One sampled frame reached 20.493 seconds before reset. |
| Cancellation and retry | The new cancel button aborted an actual request after approximately 3.55 seconds. One running worker before cancellation became zero after one second; all 38 existing segments and the media survived. An earlier cancellation was followed by the successful 14.941-second retry. |
| Processing failure fallback | Real decoder failure left the original video playable and the processing action available for retry. |
| Upload cleanup | No `inflow-*` upload directory remained in the native temporary directory after the completed and canceled requests. |

Uncorrected responses, interaction measurements, a full transcript review and screenshots remain in [the ignored acceptance directory](generated-samples/windows-acceptance/). Start with [review.md](generated-samples/windows-acceptance/review.md), [transcript.json](generated-samples/windows-acceptance/transcript.json) and [native-api-evidence.json](generated-samples/windows-acceptance/native-api-evidence.json).

### Quality boundary and verification

The base model produced clearly malformed phrases including `대만 사랑한 전근한`, `다근도신 과정`, `모킹할리 데이크` and `정말 슴프네요`. The first 17.740-second segment merges several spoken sentences; other ranges are fragments such as `교환학생으로 대만에 왔을 때`. The Windows output differs from the earlier WSL sample, which returned 37 segments and a shorter opening range. Structural validation and working replay do not establish recognition accuracy or complete semantic sentence boundaries. No transcript was corrected, no alternate backend was added and no fixed quality threshold was invented.

The owner rejected this baseline and requested improvements to recognition and sentence boundaries. Ticket 01 remains open and ticket 03 remains blocked while revised native quality evidence is prepared.

Native checks passed: the existing 16 TypeScript tests, the updated four-test processing subset including cancel/retry, four Python tests including the decoder regression, changed-file ESLint and typecheck. The Python decoder check failed against PyAV 19 before the dependency pin. The existing 50 MB / 10-minute limits remain unchanged. No desktop host, packaged worker or installer was built.

## Recognition and sentence-quality revision

The owner's rejection triggered a comparison inside the same faster-whisper backend. No provider registry, alternate processing backend or manual transcript correction was introduced.

The segmenter now asks the existing Kiwi parser for sentence endings across all aligned ASR words, then maps each ending to the enclosing real word timestamp. This detects sentence endings without punctuation, keeps text across ASR chunks and avoids turning a pause inside a subordinate clause into a separate sentence. Regression checks reproduce the original punctuation-free merge and cover a paused subordinate clause; both pass with the revised segmenter.

| Native variant | Elapsed time | Segments | Observed behavior |
| --- | ---: | ---: | --- |
| Original base and punctuation/pause segmentation | 15.036 s through the API | 38 | Opening 0.080–17.820-second range merged multiple sentences; numerous malformed words. Owner rejected this baseline. |
| Base with Korean sentence detection | 16.263 s through the API | 31 | Greeting split to 0.080–1.240; paused subordinate clauses stayed with their continuation. Lexical errors remained. |
| Small with Korean sentence detection | 36.344 s through the same worker | 31 | Several common phrases improved, but the family sentence regressed to `4명님도 됩니다`; not adopted. |
| Large-v3-turbo with Korean sentence detection | 89.214 s through the same worker | 33 | Opening became four sentences; the city phrase, family and multiple common words improved. Selected as the revised default, pending owner quality and waiting-time review. |

The turbo comparison's four opening ranges were 0.080–1.200, 1.680–5.620, 6.400–8.520 and 9.680–17.240 seconds. The longest sentence remains 13.900 seconds; no arbitrary maximum sentence length was imposed. A sampled Windows worker peak working set was 1,917,079,552 bytes (approximately 1.79 GiB); this is an observed process counter, not a universal resource guarantee. The slower model retains the existing processing timeout and media limits.

Examples of uncorrected changes include `다근도신 과정` → `작은 도시인 과천`, `정말 슴프네요.` → `정말 슬프네요.`, and `한국도라면 나온 남진공들이` → `한국 드라마에 나온 남주인공들이`. The family sentence becomes `저희 가족은 4명입니다.`. Remaining output such as `김한빈치`, `워킹 할리데이` and `현실을 지키어야` still needs audible-source review. This comparison is not a measured word-error rate, a complete semantic audit or a claim that every sentence is correct.

The selected [CTranslate2 turbo conversion](https://huggingface.co/dropbox-dash/faster-whisper-large-v3-turbo) is the model family mapped by the installed faster-whisper `turbo` entry. Setup pins revision `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf`, retains its model card and includes the required 128-mel preprocessing configuration. Native download verification matched the published 1,617,884,929-byte model and SHA-256 `e76620f83d5f5b69efd3d87e3dc180c1bd21df9fbebacfd4335e5e1efcc018da`. The small comparison used revision `536b0662742c02347bc0e980a01041f333bce120` and verified SHA-256 `3e305921506d8872816023e4c273e75d2419fb89b24da97b4fe7bce14170d671`. Existing base and small weights and all comparison outputs were preserved.

Hub transfers stalled and an ordinary HTTP retry timed out; pinned files were retrieved from the same Hugging Face repository through a direct HTTP download and checked against its published model checksum. This is local setup evidence, not a new application download backend.

Start revised review with [review-improved.md](generated-samples/windows-acceptance/review-improved.md). Raw comparison outputs remain beside it. Ticket 01 still requires owner review of the improved recognition, actual replay boundaries and longer waiting time; ticket 03 remains blocked.

The final native UI/API run returned HTTP 200 with 33 validated segments in 89.984 seconds. The revised greeting looped three times at 1.5× and stopped at 1.200 seconds with looping disabled. More reveal showed three of the introduction's four groups. Independent translation kept the source hidden and returned `我们的家庭是4个人。`. Canceling a running turbo worker after approximately 3.54 seconds reduced the worker count from one to zero within one second, preserved all 33 segments and re-enabled processing. No browser console errors were reported. [Final UI/API evidence](generated-samples/windows-acceptance/turbo-native-ui-evidence.json) records the actual responses and interaction checks. The earlier browser verification session's command connection timed out after the long download interval; a fresh native session loaded the application normally and supplied these final checks.
