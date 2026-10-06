# Video Subtitle Feasibility

Archived: 2026-10-06. Historical delivery record; see [the task index](../../README.md) for remaining work.

Investigated: 2026-10-04 to 2026-10-05
Scope: repository inspection, primary-source documentation, and small experiments with the existing local runtime. This is not feature acceptance. On 2026-10-05 the owner deferred subtitle extraction from the current manual-mask iteration; extraction and alignment findings below are retained for possible future work.

## Findings

There are three relevant cases:

| Source | Hide during listening | Reuse as a learning transcript |
| --- | --- | --- |
| Burned-in subtitles | Cover a detected or learner-defined picture region. | No separate text stream exists; recovering the lettering requires text recognition. Audio transcription remains available. |
| Embedded text subtitles | Suppress subtitle rendering when the player exposes the track. Picture masking is still needed if the video also has burned-in subtitles. | Decode source-language text and display times, then generate meaning groups and apply an explicit timing policy. |
| Embedded bitmap subtitles | Suppress rendering when supported. | Decoding yields images; text reuse requires a separate recognition step. |

FFmpeg distinguishes text and image subtitle streams, and its SRT output accepts text streams. Its `-sn` option excludes subtitle streams from processing/output; it does not erase lettering already in video pixels. Playback support must be checked separately from extraction support. [FFmpeg documentation](https://ffmpeg.org/ffmpeg.html#Stream-selection).

## What Inflow actually needs

The current contract is `Segment = { start, end, text, groups }` in [processing.ts](../../../src/listening/processing.ts). Individual word timestamps are not persisted. The validator requires positive, ordered, non-overlapping ranges and complete meaning groups whose joined text matches the segment text after whitespace removal. The host also checks the final endpoint against media duration.

| Learning data | Available from a text subtitle track? | Remaining work |
| --- | --- | --- |
| Source-language text | Usually, if the selected track contains the spoken source language. | Decode markup and preserve the spoken text; Chinese-only subtitles cannot replace Korean or English source text. |
| Playback start/end | Cue display times are available. | Normalize the media timeline and resolve overlaps; display boundaries are not guaranteed speech boundaries. |
| Sentence boundaries | Not guaranteed. | A sentence may span cues, or one cue may contain multiple sentences. Q7 confirms complete-sentence playback; investigate and validate additional audio alignment rather than treating cues as sentences. |
| Meaning groups | Not provided as Inflow meaning groups. | Reuse local `meaning_groups(text, language)` in [the worker](../../../scripts/media_processor.py). |
| Chinese translation | Only if separate or bilingual translation data exists. | Matching a translation to newly constructed segments is separate work; translation is not part of the required Segment contract. |
| Track language and identity | Container metadata may help. | Preserve metadata separately and allow ambiguous/multiple tracks to be resolved. Do not assume an extracted SRT retains that information. |

SRT stores timed text blocks and has little metadata. [Library of Congress format description](https://www.loc.gov/preservation/digital/formats/fdd/fdd000569.shtml). WebVTT specifies timed cues and permits overlaps and optional internal timestamps. [W3C WebVTT specification](https://www.w3.org/TR/webvtt1/). ASS can include syllable timings and positioning/movement. [Aegisub tag documentation](https://aegisub.org/docs/latest/ass_tags/). These optional features do not guarantee usable speech alignment or Inflow meaning groups.

For example, one cue containing two sentences from 10 to 14 seconds provides no trustworthy split time between the sentences. Conversely, two cues containing halves of one sentence could be joined, but their outer display times may include silence. Text alone cannot resolve either issue reliably. Audio alignment is an additional operation. The existing runtime can perform it, as shown below, but representative subtitle compatibility and alignment quality have not been accepted.

## Automatic region detection: deferred from the first version

A text detector can locate lettering without recognizing its content; PaddleOCR documents separate detection with bounding-box output. [Official detection documentation](https://www.paddleocr.ai/main/en/version3.x/module_usage/text_detection.html).

Inference: sampled video frames and recurring text positions could produce a candidate region for stable subtitles. Generic detection also finds scene signs, titles and logos, so it cannot by itself guarantee subtitle classification. Sparse sampling can miss short-lived or moving subtitles. This is a candidate approach, not a measured accuracy or performance claim. The detector, sampling policy, confidence threshold, and CPU/Windows packaging remain unevaluated.

The current [VideoStage](../../../src/workspace/VideoStage.tsx) renders the original media directly, with no explicit subtitle-track controls or picture mask. The video uses `object-fit: contain`; region coordinates must follow the displayed picture, including letterboxing. Q4 confirms normal-window and maximized-window support; a new player fullscreen flow is outside this version.

## Existing runtime evidence

The worker already depends on PyAV 18.1.0, which wraps FFmpeg libraries. There is no standalone FFmpeg/ffprobe command in the current processing path. PyAV exposes text and bitmap subtitle decoding. [PyAV subtitle API](https://pyav.basswood.io/docs/stable/api/subtitles.html). That live documentation describes version 19; the observations below were made against the repository's installed 18.1.0 runtime.

Initial read-only probes used `.venv-win/python.exe -B` without model downloads, speech inference, or changes to application data:

| Probe | Observation |
| --- | --- |
| In-memory SRT with English and Korean text | Both cues decoded as `AssSubtitle`; text, packet timestamp, duration and time base were readable. The first cue had PTS 500, duration 1500, and time base 1/1000: 0.5 to 2 seconds. |
| In-memory overlapping WebVTT | Cues at 0.5–2 and 1.5–3 seconds decoded with their overlap intact. This input would require adaptation for Inflow's non-overlap rule. |
| Decoder construction | SRT, ASS, WebVTT, MP4 `mov_text`, PGS and DVD subtitle decoders could be constructed. Codec-name membership alone is insufficient: PGS/DVD aliases resolve to `pgssub`/`dvdsub`. Availability does not establish real-file compatibility. |
| Historical `reading-acceptance-8nFlH3/Queen of Tears.mp4` | An 8-second H.264 video-only fixture, with no audio or subtitle stream. It is not positive evidence of real subtitle extraction. |
| Historical `windows-acceptance/韩语 sample.webm` | A 155.775-second VP8/Vorbis fixture, with no subtitle stream. Both streams report `eng` metadata, which is not sufficient evidence of spoken language. |

An initial attempt to generate a subtitle-only MP4 fixture failed during encoder initialization. On 2026-10-05, supplying the ASS subtitle header from the SRT decoder resolved that fixture setup. Two subsequent in-memory probes succeeded:

- A subtitle-only MP4 exposed a `mov_text` track with `eng` language and a track name. The decoded text retained 0.5-2 and 2.5-4 second cue times; empty packets represented gaps and must not become transcript text.
- An 8-second, 162,182-byte MP4 combined the historical H.264 fixture, the existing synthetic English WAV encoded to AAC, and two `mov_text` cues. PyAV discovered video, audio and subtitle streams and recovered the two sentence texts at 0-3.5 and 3.5-5.7 seconds. Stream time bases were 1/12288, 1/16000 and 1/1000 respectively, all with start time zero.

All media construction stayed in memory; no output files or application data were written. These are controlled generated-fixture checks, not real-speaker or arbitrary-file acceptance. Non-zero start offsets and real embedded Korean/English subtitle files still need validation. No region detector was run.

Before introducing a new executable dependency, evaluate subtitle extraction through the existing PyAV worker on representative media. FFprobe remains an alternative for a stream catalogue; FFmpeg remains an alternative for text-track conversion. [FFprobe documentation](https://ffmpeg.org/ffprobe.html).

## Existing text/audio alignment path

The installed faster-whisper 1.2.1 uses CTranslate2 4.8.2. CTranslate2's Whisper `align` accepts supplied text tokens and audio features rather than requiring newly recognized text. [Official API documentation](https://opennmt.net/CTranslate2/python/ctranslate2.models.Whisper.html). The pinned faster-whisper `find_alignment` method turns these alignments into word text, times and token-derived probabilities. [Version 1.2.1 source](https://github.com/SYSTRAN/faster-whisper/blob/v1.2.1/faster_whisper/transcribe.py).

The existing `.models/whisper-turbo/config.json` includes six `alignment_heads`; the installed model loaded as multilingual with 128 mel features. The CTranslate2 implementation requires these heads and builds an alignment for supplied text. [Version 4.8.2 source](https://github.com/OpenNMT/CTranslate2/blob/v4.8.2/src/models/whisper.cc). No additional model, package or executable was installed for the probe.

A read-only CPU/int8/4-thread probe used the existing 6.427875-second Windows SAPI English fixture described in [English acceptance](../english-learning/acceptance.md). It called `find_alignment` on supplied text, then adapted the returned words to the existing worker's `sentences()` function. It did not call speech recognition or write data.

| Supplied text | Observed result | Implication |
| --- | --- | --- |
| Matching fixture text: two sentences beginning "After school" and "They don't" | Recovered both complete sentence texts, local meaning groups, and ranges 0-3.48 and 3.48-5.7 seconds. | The existing runtime can feed supplied text through alignment into the current segment shape on this controlled English input. |
| Unrelated text about a spaceship and purple elephants | Still produced two sentence ranges, 0-3.34 and 3.34-6.4 seconds, despite several word probabilities near zero. | Valid-shaped timing is not evidence that the words were spoken. Shape validation alone would not reject this input. |
| Partial text: "The children met their friends." | Produced a sentence from 0-3.5 seconds, including omitted opening speech in its range. | Partial subtitles can yield plausible text with misleading playback boundaries; successful alignment does not establish completeness. |

Model loading took 12.097 seconds on this machine. Probe case timings included downstream text analysis; encoding happened separately and was not timed. They do not establish end-to-end speed or a production latency estimate.

Inference: reuse this runtime as the first candidate for alignment, using cue display times to limit candidate audio windows and assembling linguistic sentences separately from cue boundaries. This avoids committing to another aligner before testing the existing one. It still needs bounded audio/text chunks: the installed feature extractor defaults to 30-second audio windows, and the wrapper uses a 448-token generation limit. This is a chunking design constraint, not evidence that every 30-second subtitle window will align correctly or that the alignment API has the same public token-limit guarantee.

Do not treat token probabilities as a calibrated correctness score. Missing, paraphrased, translated, overlapping or shifted subtitles need explicit handling and representative tests. A model can assign times to unsuitable text. The first version must keep speech transcription available and make its actual preparation source visible.

## Compatibility boundaries

- Current import accepts MP4, WebM and MOV video, at most 50 MB and 10 minutes. MKV is not currently accepted, even though it is common in FFmpeg subtitle examples. Supporting MKV would also require evaluating Electron playback, rather than changing only the file picker.
- Processing currently always calls Whisper. Using subtitles requires a new preparation path; the raw subtitle result cannot be passed to the existing word-based `sentences()` function unchanged.
- Successful retranscription replaces segment identities, removes this media's vocabulary source occurrences and cached translations, and clears meaning-group masks. Vocabulary entries and generated artifacts survive. Q8 accepts this atomic replacement policy for explicit subtitle-based reprocessing; preserve video-region settings because the picture is unchanged. Picture masking alone does not require transcript replacement. See [DesktopOperations](../../../desktop/operations.ts).
- Failure or cancellation must preserve the existing transcript under the current product contract. Track discovery must not silently replace already studied material.

## Agreed scope and remaining quality boundary

The owner accepted on-demand manual video masking, source-language text-track preview/selection with speech-transcription fallback, complete-sentence playback, and explicit atomic transcript replacement. Automatic region detection and image-subtitle OCR are deferred; OCR is recorded as a future experiment in [the roadmap](../../../docs/ROADMAP.md).

The simplest candidate implementation uses the existing PyAV and Whisper runtimes rather than introducing a new executable or alignment model. Preserve the current Segment validator and derive meaning groups locally after text preparation/alignment. Do not add external subtitle-file import/export, word-timing persistence, translation-track import, MKV support or a subtitle editor without a separate requirement.

Before the owner deferred extraction, the final Q9 proposal asked for whole-material ASR fallback with a visible explanation when the selected track cannot be safely prepared or aligned, without silently mixing subtitle and ASR text. That proposal is superseded by the manual-mask-only iteration, not accepted as a current feature. Cancellation or processing failure preserves the old transcript; only a completed valid preparation replaces it under Q8. Successful alignment alone cannot certify wording or completeness, so retain preview and an explicit ASR choice even for apparently usable tracks.

Actual rejection rules, representative subtitle/audio samples, Korean alignment quality, chunk boundaries, shifted timelines and end-to-end CPU runtime remain implementation validation work. Do not invent a universal confidence threshold from the smoke tests above.
