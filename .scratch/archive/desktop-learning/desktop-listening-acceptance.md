# Persistent Desktop Listening Acceptance

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Date: 2026-10-01. Ticket: [03](issues/03-persistent-desktop-listening.md).

## Delivered behavior

Electron 44.5.1 loads a static Next 16.1.1 renderer at `inflow://app/`, with no Next HTTP server. The measured native Electron runtime contains Node 24.21.0 and successfully opens builtin `node:sqlite`. The isolated native Python 3.12 worker and local models remain development prerequisites; worker distribution belongs to ticket 06.

The sandboxed renderer has context isolation, no Node integration, and a fixed preload operations bridge. IPC checks the originating window and main frame. The host owns native import, managed files, SQLite, processing and cancellation. Stable media and segment identifiers survive reopening. Imported media are copied, SHA-256 checked and retained independently of the original download. SQLite stores transcript segments, position, selected sentence, speed, loop preference and the active material. Saved changes are written during learning rather than only at shutdown.

Missing media preserve transcript records and learning state. Re-association checks the original recording hash before replacing the managed file. Invalid or canceled processing does not overwrite an existing result. Sentence navigation continues to hide source text and translation; translation remains independent of source reveal.

## Checks and evidence

- 18 TypeScript tests passed, including real temporary SQLite/file import, save, reopen, cancellation, invalid-result preservation, missing-file recovery, state validation and media byte ranges. Existing processing, reveal, API and generation checks remain passing.
- Root typecheck and changed TypeScript/renderer ESLint checks passed. Static desktop build passed. The generated renderer contains only static page/icon routes, no transcription or translation API routes.
- The representative 155.775-second Hanbid video was imported through the production operation, with dialog selection supplied by the native verification script. The verification removed its isolated original copy and still played the managed recording.
- Real native transcription returned 33 sentences in 93,977 ms. Sentence 5 looped at 1.5x within 18.78–20.26 seconds. Full reveal/hide and independent translation (`我们的家庭是4个人。`) passed; changing sentences hid translation. Canceling a real retry retained the saved 33 sentences.
- A separate Electron process restored all segment IDs and learning state without transcription. Position 18.78 seconds, sentence 5, 1.5x and loop preference were restored, with source text and translation hidden. A byte-range request returned HTTP 206 with exactly 1,024 bytes. An additional native replay decoded 111 video frames at width 1,080, establishing actual video decoding after reopening.
- A third launch after removal of the managed recording retained all 33 transcript records and recovered playback through re-association with the same recording. Operations continued working after navigation to `#library`.
- Successful evidence has no renderer alerts or console errors. Canceled IPC rejects intentionally and Electron prints its cancellation stack in the development console. Verification processes and workers exited.

Readable runtime evidence and screenshots: [first launch](../../desktop-learning/generated-samples/desktop-acceptance-GBTE8b/first.json), [reopen](../../desktop-learning/generated-samples/desktop-acceptance-GBTE8b/reopen.json), [missing-file recovery](../../desktop-learning/generated-samples/desktop-acceptance-GBTE8b/missing.json), [restored UI](../../desktop-learning/generated-samples/desktop-acceptance-GBTE8b/reopen.png). These generated files and isolated database/media profiles remain ignored.

## Defects resolved during native verification

Forwarding a file fetch through the custom protocol did not provide reliable byte-range seeking: the first loop check continued near the beginning despite selecting sentence 5. Managed media now use bounded byte-range responses and a regression checks middle, open-ended, suffix and invalid ranges. The subsequent native seek/loop and HTTP 206 checks passed.

One verification window exited during transcription before writing completion evidence. The runner now hides its windows, disables background throttling for verification, and requires every launch to write a completion artifact. The final three-launch run passed. Earlier failed profiles are not acceptance evidence.

## Remaining boundary

This accepts the desktop development slice, not an installed application. Tickets 04 and 06 are now unblocked. Vocabulary, text-artifact UI, credential storage and a Python-free installer are later work. Current ASR and local translation inaccuracies remain the owner-accepted limitations from ticket 01. Ticket 02 has its own separately accepted live generation evidence.
