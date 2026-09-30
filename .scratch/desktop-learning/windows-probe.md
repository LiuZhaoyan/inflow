# Native Windows Listening Feasibility Probe

Date: 2026-09-30.
Status: environment probe only; ticket 01 remains open.

## Observed host

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

The Windows worker, real-video transcription, recognition/timing review, sentence playback, seeking, speed, loop, reveal, translation, cancellation/retry, and original-media fallback have not been accepted. The existing [backend acceptance record](../../docs/BACKEND_ACCEPTANCE.md) is Linux/WSL evidence only. Complete those checks from a native Windows checkout with the selected video before closing ticket 01.
