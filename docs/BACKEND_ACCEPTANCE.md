# Inflow Local Backend Real-Media Acceptance

Acceptance date: 2026-09-16 (Asia/Shanghai)
Runtime location: WSL Ubuntu, `/home/ada/projects/inflow`
API: `http://127.0.0.1:3010` (local Node development server)
Processor: `.venv/bin/python scripts/media_processor.py`; models are loaded only from the project's `.models/` directory.
No preloaded course text was used as input; every transcription sample came from actual worker output.

## Conclusion

Real audio and real Korean video passed the basic local transcription API acceptance: the API returned HTTP 200 with sentences, source text and meaning groups containing start/end times. Independent structural checks confirmed that all segments are monotonic, have positive duration, and reconstruct the source text from their meaning groups when whitespace is ignored.

The real ASR output contains model recognition errors, especially in longer natural-video sentences; no manual correction or replacement with preloaded text was performed. The offline translation API returned Chinese for two real recognition results. Corrupt media, pure silence and media without an audio track all returned HTTP 503 with understandable error messages.

## Inputs and local models

| Input | Bytes | SHA-256 | PyAV duration | Streams |
| --- | ---: | --- | ---: | --- |
| `public/materials/fsi-unit1-dialogue-a.mp3` | 505,007 | `0e59f38b90d599becfd1e2db70b6480578c1e30fea953ec107b3778ce9fb637a` | 63.000 s | audio / mp3float |
| `/tmp/inflow-acceptance/hanbid-ko.webm` | 26,999,144 | `edf0a8c7ac7a104246ed9c1c2e0a81b51b4509227895c3f50e8c3978f3bd5037` | 155.775 s | video / vp8; audio / vorbis |

Video source: [WIKITONGUES / Hanbid speaking Korean](https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Hanbid_speaking_Korean.webm), by Wikitongues / Teddy Nee, licensed CC BY-SA 4.0. The video was downloaded only to the temporary acceptance directory and was not copied into the repository.

Versions used for this run:

- Python 3.12.3
- faster-whisper 1.2.1
- kiwipiepy 0.23.2
- ctranslate2 4.8.2
- sentencepiece 0.2.2
- Whisper model: `.models/whisper-base`, CPU int8
- Translation models: local Argos ko→en and en→zh, executed offline through CTranslate2

## Commands and results

### 1. Python worker: repository audio

Equivalent worker command:

~~~bash
/home/ada/projects/inflow/.venv/bin/python \
  /home/ada/projects/inflow/scripts/media_processor.py transcribe \
  /home/ada/projects/inflow/public/materials/fsi-unit1-dialogue-a.mp3
~~~

Status: PASS. The worker returned code 0, took 5.972 seconds and produced 22 segments with no stderr output.

Structural checks:

- 22/22 segments satisfied `0 <= start < end <= 63.0`;
- adjacent segments did not overlap;
- every segment had non-empty `groups`;
- joining `groups` reconstructed `text` when whitespace was ignored.

Sample:

~~~text
01  0.080–1.360  안녕하십니까?             → 안녕하십니까?
06 20.400–21.940  선생님은 미국 사람입니까?  → 선생님은 / 미국 사람입니까?
22 61.290–62.710  한국말을 공부합니다.       → 한국말을 / 공부합니다.
~~~

### 2. HTTP API: repository audio

~~~bash
curl -sS --max-time 650 \
  -F 'file=@/home/ada/projects/inflow/public/materials/fsi-unit1-dialogue-a.mp3;type=audio/mpeg' \
  -o /tmp/inflow-acceptance/api-audio-result.json \
  http://127.0.0.1:3010/api/transcribe
~~~

Result: HTTP 200, response size 2,319 bytes and elapsed time 6.148045 seconds. The response contained 22 segments and passed the same timing, source-text and meaning-group checks. The first segment was 0.080–1.360 and the last was 61.290–62.710.

### 3. HTTP API: real Korean video

~~~bash
curl -sS --max-time 650 \
  -F 'file=@/tmp/inflow-acceptance/hanbid-ko.webm;type=video/webm' \
  -o /tmp/inflow-acceptance/api-video-result.json \
  http://127.0.0.1:3010/api/transcribe
~~~

Result: HTTP 200, response size 5,604 bytes and elapsed time 17.229020 seconds. The response contained 37 segments. All 37 passed the same structural checks, and every range fell within the 155.775-second video.

Sample:

~~~text
01   0.080–1.240  안녕하세요?
02   1.940–5.680  저는 한국에서 데만 사랑한 전근한 김한빛이라고 합니다.
05  18.100–20.300  저희 가족은 4명입니다.
37 152.480–153.340  감사합니다.
~~~

Phrases such as `데만 사랑한 전근한` are genuine base-model recognition output and are retained to expose the recognition-quality ceiling.

### 4. HTTP API: translation of real recognition output

The requests used `POST /api/translate`, `content-type: application/json`, `curl --max-time 650` and a JSON body piped to curl through standard input:

~~~bash
printf '%s' '{"text":"선생님은 미국 사람입니까?"}' |
  curl -sS --max-time 650 \
  -H 'content-type: application/json' --data-binary @- \
  http://127.0.0.1:3010/api/translate
~~~

Result: HTTP 200, elapsed time 0.603 seconds. The literal Chinese output was equivalent to `Are you an American teacher?` for `선생님은 미국 사람입니까?`.

Second real video recognition result:

~~~text
저희 가족은 4명입니다. → `Our family is four people.` (literal translation meaning)
~~~

Result: HTTP 200, elapsed time 0.468 seconds. The translation was produced locally by the Argos ko→en→zh pipeline and was noticeably literal.

## Failure-input acceptance

Negative fixtures were stored only in `/tmp/inflow-acceptance/` and are not product materials:

| Input | Characteristics | SHA-256 | Request time | HTTP | API error |
| --- | --- | --- | ---: | ---: | --- |
| `/etc/hostname`, uploaded as `bad.webm` | intentionally corrupt media | not recorded as a product input | 0.283 s | 503 | Local models could not process this media or text; confirm model installation or retry with clear Korean media. |
| `silent.wav` | 2.000 s, 64,044 bytes, PCM silent audio track | `20eaebffe1816e0ffa6f7f854f5ef4ea80d5349faaf0ce1ec1b713e7fde58fa` | 0.963 s | 503 | No speech was recognized; retry with clear Korean audio. |
| `no-audio.webm` | 2.000 s, 708 bytes, VP8 video stream only | `381b9b839079411124deba3e5e3e16cc41c5514517bc6e2cbfcb1d724e505a55` | 0.288 s | 503 | The media has no audio track; choose audio or video containing speech. |

Actual multipart form used for the corrupt-media request:

~~~bash
curl -sS --max-time 650 \
  -F 'file=@/etc/hostname;filename=bad.webm;type=video/webm' \
  http://127.0.0.1:3010/api/transcribe
~~~

## Cleanup and limitations

During API processing, the upload is written to a temporary directory on the service machine. A first inspection briefly found an `inflow-i1XPoc` directory after the request, but a later check confirmed that it had been removed. The only remaining `/tmp` content was the acceptance evidence directory `/tmp/inflow-acceptance`; no persistent upload residue was observed. Processing used local Python and local models, and all API requests in this run targeted `127.0.0.1`.

This run covered only one 63-second audio file and one 155.775-second video. Whisper base CPU int8 was fast enough for this test, but long and natural video sentences showed the recognition errors above. Meaning groups are based on particles and part-of-speech boundaries rather than human semantic segmentation. Model recognition accuracy has not been treated as proof of a correct learning transcript. Media longer than 10 minutes, files larger than 50 MB, request cancellation, concurrent busy-lock behavior and browser playback remain untested and require separate acceptance.
