# Desktop framework investigation

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Investigated on 2026-09-30. Research and source inspection only; no installation, build, transcription, or Windows runtime test was performed.

## Recommendation

Use **Electron with a packaged static React renderer**, native desktop operations in the main process, and the existing Python processing logic as a child executable. Electron reuses the existing TypeScript/Node backend directly; Tauri remains feasible but adds a Rust host and Windows toolchain without removing the Python dependencies and models. This is an engineering recommendation based on the current code, not a measured package-size or playback-quality result.

For the first desktop conversion, retain the already-installed **Next.js as a static build tool**, move both POST API handlers to narrow desktop IPC operations, and configure static image handling. Do not ship a running Next HTTP server. A later move to Vite is optional: it simplifies a client-only build but does not solve an additional first-release requirement. Next static export supports only static GET route handlers; the current POST transcription and translation endpoints cannot remain working server APIs in an export. [Next static export](https://nextjs.org/docs/app/guides/static-exports)

## Current source evidence

- `package.json` contains Next 16.1.1 and React 19.2.3; there is no desktop shell or desktop bundler.
- `src/app/page.tsx` renders one client component, `src/listening/Practice.tsx`. The only framework imports within the listening UI are `next/image` and `next/link`.
- `Practice.tsx` uses a selected browser `File`, a temporary object URL, native audio/video elements, `currentTime` seeking, and playback-rate/segment looping. It calls `/api/transcribe` and `/api/translate`; selected material and results are not persisted.
- `src/listening/media-server.ts` already uses Node `execFile`, filesystem access, a single-job guard, JSON stdout, a timeout, and cancellation. Its `.venv/bin/python` and working-directory assumptions are Linux/development specific.
- `scripts/media_processor.py` already supports CPU/int8 faster-whisper, Korean word timestamps and sentence grouping, plus local Korean-to-English-to-Chinese translation. Models are resolved relative to the script's repository location. These paths must change for an installed app.
- The present 50 MB and 10-minute limits are application policy, not desktop-framework limits. Changing them requires a separate processing/resource decision.

## Electron versus Tauri 2

| Concern | Electron | Tauri 2 |
| --- | --- | --- |
| Reuse of this backend | Node main process can host the existing filesystem/child-process logic after removing request-specific glue. | Rust commands/plugins must replace the Node host, or another Node sidecar must also be shipped. |
| Frontend | Static Next export is sufficient after API migration; Vite is optional. A Next server is possible but adds startup, port, request and shutdown management. | Official Next integration uses static exports; it does not supply a Next server. The example still names Next 14.2.3, so the actual Next 16 export must be checked. |
| Python | Child executable with JSON input/output, bundled outside the application archive. | Explicit external binary support; each architecture needs an appropriately named target-specific executable and scoped execution permissions. |
| Renderer/runtime | Ships Chromium and Node together; larger baseline runtime. | Uses WebView2 on Windows; adds Rust and C++ Build Tools for development. Python/models still ship separately. |
| Windows distribution | Electron Forge produces packaged apps and Windows installers. | NSIS EXE or MSI; cross-compiling on Linux is documented as more complicated and less tested than Windows builds. |

Sources: [Electron security/runtime guidance](https://www.electronjs.org/docs/latest/tutorial/security), [Electron packaging](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging), [Tauri Next integration](https://v2.tauri.app/start/frontend/nextjs/), [Tauri sidecars](https://v2.tauri.app/develop/sidecar/), [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [Tauri Windows installers](https://v2.tauri.app/distribute/windows-installer/).

## Native files and media playback

Keep the native audio/video player and current segment controls. Replace upload-through-FormData with a native import operation that resolves/copies the selected file into the local library; expose material identifiers rather than unrestricted filesystem access to the renderer. A standard secure custom application protocol can serve packaged UI assets and selected library media. Electron documents protocol streaming support for audio/video; actual range requests and seeks need Windows verification. [Electron protocol API](https://www.electronjs.org/docs/latest/api/protocol)

Keep renderer Node integration disabled, context isolation and sandboxing enabled, and validate narrow IPC inputs and senders. Generated articles are text/data, not executable HTML. [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)

Successful transcription does **not** prove successful video playback. faster-whisper decodes audio with PyAV's bundled FFmpeg libraries; the renderer uses Chromium or WebView2, a different decoding stack. File extensions identify containers rather than guarantee a supported codec. Start acceptance with representative MP4/H.264/AAC and WebM samples; test the user's MOV and other real inputs before expanding the support claim. No codec or seek quality was tested here. [faster-whisper requirements](https://github.com/SYSTRAN/faster-whisper#requirements)

## Worker packaging and Windows boundary

First validate the existing worker with native Windows Python and the pinned media requirements. If acceptable, package it with **PyInstaller one-folder mode**, keeping its native libraries and Kiwi data intact, and preserve stdin/stdout JSON communication. Hide a spawned console through the host rather than disabling Python standard streams. Ship the worker as external resources, and pass an explicit model directory. Keep model files separate from application code and mutable user material; first-release model delivery can be a bundled directory or explicit setup download, but it must not depend on the repository layout.

PyInstaller bundles Python and dependencies so installed users need no Python installation, but it is **not a cross-compiler**: a Windows worker must be built with Windows Python on Windows. One-folder mode is the documented starting point for diagnosing missing dependencies. Collection of CTranslate2/PyAV DLLs, Kiwi dictionaries and sentencepiece data is a packaging acceptance item, not established success. [PyInstaller manual](https://pyinstaller.org/en/stable/), [operating modes](https://pyinstaller.org/en/stable/operating-mode.html)

WSL remains suitable for planning, React/domain changes and Linux-side focused checks. Move to a native Windows checkout with Windows Node/npm and Windows Python **before the first packaged worker/app acceptance test**; rebuild dependencies rather than reuse Linux `node_modules` or `.venv`. Native Windows or Windows CI should produce the installer. Forge's Squirrel maker also permits Linux with Wine/Mono, but this does not solve the worker build or validate Windows playback. [Squirrel.Windows requirements](https://www.electronforge.io/config/makers/squirrel.windows)

Before committing to the processing path, verify native Windows CPU transcription speed and Korean accuracy, sentence-loop/seek behavior, Unicode/spaced paths, cancellation and shutdown, worker operation without system Python, and restart persistence. Native DLL/runtime prerequisites must be determined from that packaged worker on a machine without the developer environment. No framework recommendation guarantees those results.
