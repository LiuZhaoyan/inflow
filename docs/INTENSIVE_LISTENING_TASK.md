# Mobile-First Intensive Listening Task

Status: approved. The core page and local processing path are implemented; real-media backend acceptance is recorded, while complete browser acceptance remains unfinished.
Last updated: 2026-09-16

## 1. Scope and document relationships

This task is based on the user-provided Photo 1.jpg and Photo 2.jpg prototypes and the confirmed product goals. The page prioritizes a vertical phone layout while remaining usable in desktop browsers.

- The long-term product direction is in [PRODUCT_SPEC.md](PRODUCT_SPEC.md), including possible learning continuity, PWA support and a local Desktop service.
- This delivery focuses on the mobile-first browser intensive-listening page and the real-media processing path.
- [STRUCTURED_INTENSIVE_LISTENING_MVP.md](STRUCTURED_INTENSIVE_LISTENING_MVP.md) is a historical document describing the superseded preloaded-material, dictation and review design. It is not evidence for this scope or its completion.

## 2. Current goal

For real audio and video without subtitles:

Choose media → automatically transcribe and segment it → generate sentences with time ranges and source text → play sentence by sentence → reveal meaning groups → change speed and loop → generate and show the current-sentence translation at the bottom.

Automatic translation is in scope. The initial processing path uses a Next.js Node API calling a local Python worker with faster-whisper base CPU int8 transcription, Whisper word-timestamp sentence boundaries, kiwipiepy 0.23.2 part-of-speech and particle boundaries for meaning groups, and Argos ko→en→zh translation through CTranslate2. The first run downloads Hugging Face and Argos weights. The browser uploads media to the machine running the current Next.js service; that machine's Python worker processes it, temporary files are removed afterward, and the media is not sent to third parties. This path must still be assessed through complete audio and video evidence and must not be called the final solution merely because an endpoint or a single request succeeds.

## 3. Processing-path decision before full acceptance

The first implementation step is to validate the minimum processing path with real audio and video, covering transcription, timing boundaries, meaning groups and translation, while recording:

- processing location, wait time and failure behavior;
- audio and video playback completeness and whether source text corresponds to the sound;
- whether meaning groups support progressive reveal and whether sentence boundaries are usable;
- first-run weight-download conditions and the licenses of models and dependencies;
- whether media is processed only on the current Next.js service machine and how media and results are retained or removed.

The current default path is a local approach awaiting complete acceptance, not a final model or deployment decision. If a paid service or external media upload is later needed, the service, cost, uploaded content, processing location and retention policy must be explained before integration.

The current implementation contract is:

- `POST /api/transcribe`: a `multipart/form-data` `file` field, returning `{ segments: [{ start, end, text, groups: string[] }] }`.
- `POST /api/translate`: JSON `{ text }`, returning `{ translation }`.
- Both endpoints return `{ error }` on failure, and the page must show an understandable message.

The interface contract itself does not prove that the processing approach has passed acceptance.

## 4. Seven implementation and acceptance stages

| Stage | Work | Acceptance |
| --- | --- | --- |
| 1. Document placement | Put the specification, roadmap and task document under `docs/`, commit them to Git and update local links. | Files are not ignored and migrated links work. |
| 2. Page layout | Implement the media area, progress bar, previous/next, sentence navigation, reveal, source-text area, speed/loop/translation entry and bottom translation area based on the prototypes. | The vertical phone layout follows the prototypes; desktop browsers work; primary controls neither overflow nor cover one another. |
| 3. Media import and segmentation | Select audio or video, load it for playback and generate sentences with start/end times, source text and meaning groups for subtitle-free media. | Real subtitle-free media produces real segments; previous/next locates the corresponding range; first and last controls have correct boundaries. |
| 4. Meaning groups and reveal | Reveal small, more and full amounts by sentence-level meaning groups, with hiding. | Every reveal shows complete groups; more keeps the small reveal; full shows the complete source text; changing sentences hides text by default. |
| 5. Fan interaction | On mobile, long-press reveal to open the fan, slide to an option and release; on desktop, click to open and choose. | All three options can be selected; releasing outside cancels; ordinary scrolling does not trigger selection; the menu is not clipped. |
| 6. Speed, looping and translation | Change playback speed, loop the current sentence and request/show its automatic translation. | Speed changes take effect; looping does not advance to the next sentence; translation appears at the bottom and can be collapsed independently; changing sentences hides it by default; failures are understandable. |
| 7. Complete-flow validation | Run every operation with real subtitle-free audio and video; record delegated test results and have the primary agent review them. | Import → segmentation → sentence navigation → meaning-group reveal → speed/loop → translation works end to end; processing failures have understandable messages. |

## 5. Reveal rule for this task

Meaning groups are revealed consecutively from the beginning of the sentence. For a sentence with `n` groups:

- small: reveal the first 1 group;
- more: reveal the first `min(n, max(2, ceil(2n/3)))` groups;
- full: reveal all `n` groups;
- hide: hide the current sentence's source text;
- after changing sentences, hide source text and translation by default.

Reveal operates on complete meaning groups rather than individual characters or words. More must retain the groups already shown by small.

## 6. Real-media acceptance record

- Video: `hanbid-ko.webm`, original size 26,999,144 bytes and duration 155.775 seconds. Source: [WIKITONGUES / Hanbid speaking Korean](https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Hanbid_speaking_Korean.webm), by Wikitongues / Teddy Nee, licensed CC BY-SA 4.0. The acceptance file is at `/tmp/inflow-acceptance/hanbid-ko.webm` and is not committed to Git.
- Audio: the repository FSI MP3 is used as the real subtitle-free audio input; no preloaded course text substitutes for transcription.

These materials are used only for local acceptance and provenance records. Final completion still requires the primary agent to inspect the complete audio and video interaction results.

## 7. Acceptance evidence and collaboration

Completion evidence must include a complete operation record for real subtitle-free audio and real subtitle-free video. Static examples, prefilled text or simulated translation cannot substitute for real-media acceptance.

Testing may be delegated to the Luna agent. The primary agent must inspect the result, analyze failures and boundaries, and own final integration and acceptance. Documentation changes, code changes or passing automated checks alone do not prove completion.

## 8. Explicit exclusions

This task does not include:

- progress persistence, notes or a revisit list;
- PWA installation;
- a Desktop service or standalone desktop client;
- accounts, cross-device synchronization or other extensions.

These directions remain in the long-term product plan and are not completion conditions for the seven stages.
