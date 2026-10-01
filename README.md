# Inflow

A Korean learning application moving toward a Windows desktop MVP: import media → intensive listening → collect vocabulary → generate a short Korean passage → collect further vocabulary.

The browser prototype implements local transcription, sentence playback, meaning-group reveals and Chinese translation. Desktop development now adds an Electron host, managed media and SQLite learning restoration. Vocabulary/artifacts and the packaged worker remain later slices. [The approved tasks](.scratch/desktop-learning/ticket-plan.md) record the sequence. Automatically generated content may contain errors; [earlier backend evidence](docs/BACKEND_ACCEPTANCE.md) covers Linux/WSL only.

## Setup (Linux / WSL)

Node.js 20.9+ and Python 3.12 are required for the listening prototype. The optional passage evaluation runner uses Node.js 24 and an owner-configured DeepSeek API key. The current Python worker is called by the Next.js Node API; it does not require a separate Desktop service.

```bash
npm ci
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements-media.txt
.venv/bin/python scripts/setup_models.py
npm run dev
```

Open http://localhost:3000. For production, run `npm run build` and then `npm start`.

The first setup downloads dependencies from PyPI and Hugging Face, the [Whisper large-v3-turbo CTranslate2 model](https://huggingface.co/dropbox-dash/faster-whisper-large-v3-turbo) and Argos translation weights. Whisper weights require about 1.6 GB, plus translation models and Python dependencies. Subsequent processing uses local files and has no third-party inference fees. The setup script pins the Whisper revision and translation mirror versions and SHA-256 checksums; the official Argos download endpoint returned 403 during preparation, so a public mirror is used. The model and Python environment are stored in the Git-ignored `.models/` and `.venv/` directories.

**Processing location:** the browser sends the selected media to the machine running the current Inflow / Next.js service. Python performs transcription and translation on that machine; media and source text are not sent to third parties. Temporary media is removed when processing finishes. When a phone accesses Inflow on a computer, processing happens on the computer rather than on the phone.

This version has been validated for local single-user Linux / WSL use. It requires a working Python subprocess and local model directories; ordinary static hosting or short-lived serverless environments cannot directly run this processing path.

## Windows feasibility setup

Use a checkout on a local Windows drive. The Windows Conda probe failed to lock its package cache on the WSL UNC filesystem, so the setup script rejects a UNC checkout. After these changes are committed, a native Windows PowerShell session can clone the local WSL repository without a push:

```powershell
$inflowCheckout = Join-Path $env:USERPROFILE 'projects\inflow'
New-Item -ItemType Directory -Force (Split-Path $inflowCheckout)
git clone --no-hardlinks '\\wsl.localhost\Ubuntu\home\ada\projects\inflow' $inflowCheckout
Set-Location $inflowCheckout
.\scripts\setup_windows.ps1
npm ci
npm run dev
```

The setup script needs Conda available in PowerShell. It creates an isolated `.venv-win` with Python 3.12 using conda-forge, installs the pinned processing dependencies and downloads local models. It leaves the base environment intact and sets `INFLOW_PYTHON` and `INFLOW_MODELS_DIR` for the current PowerShell process. An optional `-ModelsDir` supplies another model directory. In later terminal sessions, set `INFLOW_PYTHON` to the local `.venv-win\python.exe` before starting the server, and set `INFLOW_MODELS_DIR` again if you used a custom directory.

Run the selected [WIKITONGUES Korean sample](https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Hanbid_speaking_Korean.webm) without subtitles and record transcription, sentence boundaries, playback, loops, reveal, translation, cancellation and retry. The prepared Windows script and WSL tests do not establish native Windows acceptance or an installer.

## Passage evaluation

Use Node.js 24. Set `DEEPSEEK_API_KEY` in the Git-ignored `.env` or `.env.local` (the latter overrides `.env`). `.env.example` documents the expected name. Never paste the key into an issue or report.

```sh
npm run generation:evaluate
```

With a key, this command makes at most four serial DeepSeek requests for the prepared Korean cases. It saves Korean text, Chinese sentence translations, target highlights, latency and usage in a new ignored directory under `.scratch/desktop-learning/generated-samples/`. If a request fails, it preserves earlier samples, records a sanitized failure and stops.

Without a key, it only saves the prepared inputs and explicitly reports that live evaluation was not run. Review real samples for the selected meanings, natural inflection, common supporting vocabulary and faithful translations before accepting the provider. Passing structured-output tests is not Korean quality evidence. See [the generation baseline](.scratch/desktop-learning/generation-baseline.md).

## Usage

1. Click `＋` or **Select media**, choose a browser-supported audio or video file, and optionally preview it first.
2. Click **Start processing**. The current limits are 50 MB and 10 minutes. If processing fails, the original media remains playable and can be retried.
3. Use previous/next sentence to move between ranges. The transcript is hidden by default; playback stops at the sentence end, or replays the current sentence when looping is enabled.
4. Long-press **reveal**, slide to a small hint, more hints or the full sentence, and release. On desktop, click to choose; keyboard controls are also supported.
5. Hide the transcript, change playback speed from 0.5× to 2×, or independently expand the translation area at the bottom. Switching sentences hides both transcript and translation.

Browser mode does not save progress or processed media. Desktop development retains imported media, processing results, learning position, speed and loop preference. Vocabulary and artifacts are separate later tickets.

## Desktop development (Windows)

After the native Python/model setup above, run:

```powershell
npm run desktop:build
npm run desktop:start
```

Electron 44.5.1 loads a static Next export and uses builtin `node:sqlite`; it does not start an HTTP server. Native import retains a managed copy. The application's user-data directory holds `media` files and `learning.sqlite`. The renderer receives managed identifiers and a narrow preload bridge. Media range responses support seeking and sentence replay through a secure custom protocol. [Electron protocol documentation](https://www.electronjs.org/docs/latest/api/protocol).

The saved-material selector reopens imports. Missing media leaves its transcript intact; **Re-associate media** requires the same recording, checked by SHA-256. Reveals and translations remain hidden when reopening. Development uses this checkout's `.venv-win/python.exe` and `.models`, or explicit `INFLOW_PYTHON` / `INFLOW_MODELS_DIR`. Ticket 06 owns packaging without system Python; this stage is not an installer.

```powershell
node scripts/verify-desktop.cjs "path/to/Hanbid sample.webm"
```

This verification creates an isolated ignored profile, supplies dialog selection deterministically, runs real decoding/transcription/translation, and starts Electron three times to check restoration and missing-file recovery. Evidence and screenshots remain under `.scratch/desktop-learning/generated-samples/desktop-acceptance-*`.

## Local processing and limitations

- **Transcription and timing:** faster-whisper large-v3-turbo, CPU int8, Korean recognition. Kiwi detects sentence endings across ASR chunks, including missing punctuation, and maps them to real word timestamps; a pause alone does not split a sentence. The native comparison improved common-word recognition and the merged opening range, with an approximately 90-second wait for the selected 156-second video. Names and individual words can still be wrong; the owner accepted this baseline on 2026-10-01. [Windows quality evidence](.scratch/desktop-learning/windows-probe.md).
- **Meaning groups:** Kiwi Korean morphological analysis creates complete grammatical phrases at particle and punctuation boundaries rather than fixed word counts. It is not full semantic understanding and remains limited for idioms, ambiguity and incorrectly transcribed text.
- **Translation:** an Argos Korean→English→Chinese model runs locally through CTranslate2; the English pivot can lose detail.
- **Resources:** each processing request has a 10-minute timeout; the API runs one inference operation at a time in the same process and asks busy callers to retry later. There is no account or multi-user job system.
- **Materials and models:** the project license does not automatically cover media or models. See [material provenance](public/materials/SOURCE.md) for the FSI recording conditions, and [the setup script](scripts/setup_models.py) plus the upstream README files in the model directories for model sources, mirrors and checksums. The English–Chinese model package identifies the original OPUS model as CC-BY 4.0; the Korean–English package lists its corpus sources in its README. This project does not make a separate redistribution-license claim for those upstream materials.

## Verification

```bash
npm test
.venv/bin/python -m unittest discover -s scripts -p 'test_*.py'
npm run lint
npm run typecheck
npm run build
```

Primary acceptance must use real audio and video without subtitles and exercise the complete processing path. The current page uses only recognition results returned by the media-processing API and does not depend on preloaded course text.

## Documentation and code

- [Implementation specification and acceptance criteria](.scratch/desktop-learning/spec.md)
- [Product specification](docs/PRODUCT_SPEC.md) · [Roadmap](docs/ROADMAP.md) · [Earlier backend acceptance](docs/BACKEND_ACCEPTANCE.md)
- `src/listening/Practice.tsx`: media and learning interactions; `RevealMenu.tsx`: touch and keyboard menu.
- `src/app/api/`: transcription and translation endpoints; `src/listening/processing.ts`: processing-result validation.
- `scripts/media_processor.py`: local transcription, meaning groups and translation; `scripts/setup_models.py`: model installation.

Future task documentation belongs in `docs/` and should be committed to Git. See [LICENSE](LICENSE) for the code license.
