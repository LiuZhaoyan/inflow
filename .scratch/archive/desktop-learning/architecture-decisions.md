# Desktop architecture decisions (historical)

Decisions taken during the September–October 2026 desktop migration. For current behavior consult [Project Status](../../../docs/PROJECT_STATUS.md) and the implementation.

## Electron and processing

Use Electron with a static React renderer and Node main-process desktop operations, rather than introducing a Rust/Tauri host. Retain the existing Python media processing as a packaged child executable communicating over JSON standard streams. This minimized the rewrite of the TypeScript backend and Python language tooling. Next.js static export was initially reused as a build step; the application does not need an embedded HTTP server. The installed worker and its model downloads must be separate from the writable learner profile.

## Persistence

Use main-process SQLite for structured learning records and ordinary managed files for imported media and downloaded models. Transactions preserve relationships between media, sentences, vocabulary occurrences and generated artifacts. This was chosen over JSON files and renderer-owned IndexedDB to keep durable records independent of the UI origin. The selected built-in `node:sqlite` integration required native Electron/package verification.

## Text generation

Use a narrow DeepSeek Responses adapter for text-only Korean passages with target vocabulary and contextual Chinese meanings. Request structured output and validate it rather than treating schema-shaped target annotations as semantic proof. Avoid unnecessary provider abstraction and extra LLM calls. Provider model names, prices and region availability from the original September research are historical and must not be treated as current.

## Boundaries and lessons

Windows-first personal-use application; no account system, sync, cross-platform installer or TTS requirement in the initial scope. The early WSL/UNC and Conda experiments were environment-specific and are superseded by [installed Windows acceptance](windows-packaging-acceptance.md). The design rationale is historical; current APIs, models, paths and limitations must be checked against code and current docs.
