# Inflow

A mobile-first Korean intensive-listening page: import audio or video → automatically split it into sentences → reveal meaning groups progressively → adjust speed and looping → view a translation.

The current implementation uses local models, and the complete backend acceptance record is kept in `docs/`. Automatically generated content is not guaranteed to be correct. The prototype's bottom extension area is used for translations.

## Setup (Linux / WSL)

Node.js 20.9+ and Python 3.12 are required. No API key, account or database is needed. The Python worker is called by the Next.js Node API; it does not require a separate Desktop service.

```bash
npm ci
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements-media.txt
.venv/bin/python scripts/setup_models.py
npm run dev
```

Open http://localhost:3000. For production, run `npm run build` and then `npm start`.

The first setup downloads dependencies from PyPI and Hugging Face, the Whisper base model and Argos translation weights. The Python environment and models require about 1 GB in total. Subsequent processing uses local files and has no third-party inference fees. The setup script pins the translation mirror versions and SHA-256 checksums; the official Argos download endpoint returned 403 during preparation, so a public mirror is used. The model and Python environment are stored in the Git-ignored `.models/` and `.venv/` directories.

**Processing location:** the browser sends the selected media to the machine running the current Inflow / Next.js service. Python performs transcription and translation on that machine; media and source text are not sent to third parties. Temporary media is removed when processing finishes. When a phone accesses Inflow on a computer, processing happens on the computer rather than on the phone.

This version has been validated for local single-user Linux / WSL use. It requires a working Python subprocess and local model directories; ordinary static hosting or short-lived serverless environments cannot directly run this processing path.

## Usage

1. Click `＋` or **Select media**, choose a browser-supported audio or video file, and optionally preview it first.
2. Click **Start processing**. The current limits are 50 MB and 10 minutes. If processing fails, the original media remains playable and can be retried.
3. Use previous/next sentence to move between ranges. The transcript is hidden by default; playback stops at the sentence end, or replays the current sentence when looping is enabled.
4. Long-press **reveal**, slide to a small hint, more hints or the full sentence, and release. On desktop, click to choose; keyboard controls are also supported.
5. Hide the transcript, change playback speed from 0.5× to 2×, or independently expand the translation area at the bottom. Switching sentences hides both transcript and translation.

This iteration does not save progress, processed media or notes. Refreshing the page requires importing and processing the media again. It does not include a review list, PWA installation, a Desktop service or accounts.

## Local processing and limitations

- **Transcription and timing:** faster-whisper base, CPU int8, Korean recognition, with sentence boundaries based on real word timestamps, sentence-ending punctuation and pauses. Old recordings, noise, names and connected speech can cause recognition errors.
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

Primary acceptance must use real audio and video without subtitles and exercise the complete processing path. The current page uses only recognition results returned by the media-processing API and does not depend on preloaded course text; the superseded dictation design remains only in the historical document.

## Documentation and code

- [Current task and acceptance criteria](docs/INTENSIVE_LISTENING_TASK.md)
- [Product specification](docs/PRODUCT_SPEC.md) · [Roadmap](docs/ROADMAP.md) · [Historical MVP](docs/STRUCTURED_INTENSIVE_LISTENING_MVP.md)
- `src/listening/Practice.tsx`: media and learning interactions; `RevealMenu.tsx`: touch and keyboard menu.
- `src/app/api/`: transcription and translation endpoints; `src/listening/processing.ts`: processing-result validation.
- `scripts/media_processor.py`: local transcription, meaning groups and translation; `scripts/setup_models.py`: model installation.

Future task documentation belongs in `docs/` and should be committed to Git. See [LICENSE](LICENSE) for the code license.
