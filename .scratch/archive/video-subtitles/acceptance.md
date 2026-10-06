# Manual Video Subtitle Mask Acceptance

Archived: 2026-10-06. Historical delivery record; see [the task index](../../README.md) for remaining work.

Verified: 2026-10-05; native screenshot preview: 2026-10-06
Worktree: `D:/DeskBox/project/inflow-video-subtitles`
Branch: `codex/video-subtitles`
Scope: the owner-confirmed manual mask only. Subtitle extraction, track preview/selection, audio alignment, automatic region detection and OCR are deferred.

## Result

Implemented explicit video-mask activation, a single opaque black rectangle, pointer move and eight edge/corner resize handles, arrow-key adjustment (Shift increases the step), contained-picture positioning and per-material enabled/disabled persistence. Entering adjustment pauses once without seeking; manual playback remains available and live movement/resizing does not toggle or repeatedly pause playback. Finishing adjustment retains playback state and hides handles.

Settings are optional in the existing learning JSON, so older material remains uncovered without a schema migration. The host validates coordinates and preserves saved settings when older callers omit the field. Retranscription retains video settings while retaining its existing sentence-dependent cleanup. The desktop renderer's explicit source-file list includes the new shared mask module.

## Automated checks

| Check | Result |
| --- | --- |
| Focused geometry and host tests | 7 passed. Picture bounds include 16:9, 4:3 and portrait letterboxing, window-size scaling, resize clamps, invalid settings, optional-state compatibility, restart, independent materials, audio rejection and failure/cancellation/reprocessing preservation. |
| `npm test` | All 39 tests passed, including existing vocabulary, translation, provenance and artifact behavior. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm run desktop:build` | Passed: Electron host TypeScript compilation and optimized static Next.js renderer export. |
| Agent-browser interaction | Passed with actual H.264 video decoding and native keyboard/pointer input; no page errors or framework error overlay. |
| Native Electron screenshot preview | Passed in an isolated SQLite profile with the built static renderer and actual H.264 decoding. New material was uncovered; activation paused playback and exposed eight handles; finishing retained the covering and removed the handles. No UI alerts were present. |

Browser cases verified first activation pauses in place, keyboard and pointer adjustment during playback, corner resizing, finish-without-pause, switch state, saved-region reactivation, adjustment pause/exit semantics, 1920x1080 viewport scaling, portrait bounds, audio-only controls, independent material settings, reopening, an uncovered new import, independent meaning-group masking, retention through processing and restored settings after reload. The 4:3 picture measured 240x180 inside a 956-pixel-wide stage, then 640x480 inside a 1580-pixel-wide stage; the overlay followed the picture rather than the side bars. The restored default rectangle covered both synthetic subtitle lines.

## Evidence and limits

Synthetic 4:3/portrait MP4 and audio-only fixtures, a mocked desktop bridge, the browser runner and [the final screenshot](../../desktop-learning/generated-samples/video-mask/final.png) are retained under the ignored `../../desktop-learning/generated-samples/video-mask/` directory. The controlled video frames use two white bottom bars as a subtitle-layout fixture; they are not real-speaker or detector/OCR evidence. Browser reload uses isolated test storage; real SQLite restart and compatibility are covered separately by host tests.

React review checked cleanup of the resize observer, event-driven geometry updates, keyboard-accessible adjustment controls, optional state compatibility and separation of video masks from meaning-group masks. Runtime dependencies were reused through a worktree node_modules junction; no packages or models were added.

Native Electron screenshots of the [uncovered video](../../desktop-learning/generated-samples/video-mask/native-preview-jK8nSw/mask-off.png), [adjustment controls](../../desktop-learning/generated-samples/video-mask/native-preview-jK8nSw/mask-adjusting.png) and [finished covering](../../desktop-learning/generated-samples/video-mask/native-preview-jK8nSw/mask-on.png) were captured on 2026-10-06 and shown to the owner. The isolated profile was seeded through real host operations with synthetic transcript data; native media serving, decoding, renderer and learning-state IPC were real.

Maximized native-window and installed-package verification remain unrun. Browser viewport resizing, native screenshot preview and the desktop production build do not constitute installer or clean-machine acceptance. No subtitle extraction or alignment implementation is included.
