# Frontend Workspace Verification

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Date: 2026-10-01
Status: implemented and locally verified; owner visual acceptance remains pending after the requested rework.
Review baseline: `4284abc05367cdef61eef93241adf08b182b7598`.

## Checks

| Check | Result |
| --- | --- |
| `npm test` | 22 passed, including duration rejection before storage, learning-state preservation during processing, cancellation, source history and artifact retention. |
| `.venv-win/python.exe -m unittest discover -s scripts -p test_media_processor.py` | 5 passed, including a real WAV metadata probe. |
| `npm run typecheck` | Passed after integration and alias corrections. |
| `npm run lint` | Passed; focused lint also covers the browser verification scripts. |
| `npm run build` | Passed during integration. |
| `npm run desktop:build` | Passed with the new workspace renderer and retained host operations. |
| `node .scratch/frontend-workspace/run.mjs` | Passed with Chromium and native WAV playback; bridge and processing responses are controlled fixtures. |

The browser script checks exactly one automatic import job, processing completion while playing, position-to-sentence mapping, Context seeking, manual retry after failure, retained mode/rate/loop, DOM selection into a vocabulary draft, separate tab transitions and blocking another draft until the current one is resolved. The script uses the locally cached agent-browser CLI; `AGENT_BROWSER_CLI` and `AGENT_BROWSER_EXECUTABLE_PATH` can point to another installed CLI and Chromium executable. Start the development server on port 3000 first.

Additional browser checks passed: Full mode retains position, follows sentences and clears reveal/translation without requesting another translation; Library opening and current-item selection preserve playback; cancellation retains media and transcript without automatic retry; completed records reuse saved results; missing and overlong records retain readable transcripts and have no playable media source. An eight-second generated H.264 fixture decoded at 640 × 360 and advanced during native video playback.

## Visual rework

The first dashboard-like render was rejected by the owner. The revised layout uses left-aligned navigation, a continuous video and sentence surface, centered source text with Chinese immediately beneath it, centered transport controls, a narrow Context rail and a left overlay below the navigation. Populated Content and Library renders were inspected at 1440 × 960. The preview uses test audio rather than the drama frame in the reference.

## Standards

The independent review identified relative cross-module imports that conflicted with the repository alias rule. These were corrected to `@/*`. No remaining standards or concrete data-loss findings were reported.

## Spec

The final independent spec review reported no findings. Earlier checks led to preserving playback when choosing the current Library item and clarifying that long-media playback is disabled while its transcript remains readable. Context resets its explicit full-text view rather than removing the rail.

## Verification limits

The browser harness substitutes DesktopBridge and model results; it does not establish real Korean transcription/translation quality or installed Electron acceptance. Existing worker algorithms, artifact storage and generation remain preserved. Installer/resource packaging is a later desktop delivery task. Subtitle Mask is deferred to [issue 08](../../desktop-learning/issues/08-subtitle-mask.md).
