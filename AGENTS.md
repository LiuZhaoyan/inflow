# Repository Guidelines

## Project Structure & Module Organization

Inflow is a Korean learning application using Next.js 16, TypeScript and React 19 with an Electron desktop host for Windows. Page entry, layout, styles and the retained Logo live in `src/app/`. The active workspace UI lives in `src/workspace/`; listening rules, bridge types and API adapters live in `src/listening/` and `src/app/api/`; passage generation lives in `src/generation/`. Host operations and persistence live in `desktop/`, and local processing lives in `scripts/`. Audio and provenance belong in `public/materials/`. Preserved legacy `data/` and `public/uploads/` are not source and must not be deleted as part of code cleanup. Current product scope is defined in `docs/PRODUCT_SPEC.md`; read `.scratch/README.md` when locating active specs or tickets. Records under `.scratch/archive/` are historical evidence.

## Documentation Language

- Write repository documentation, specifications, roadmaps, task records and acceptance reports in English.
- Keep each document's prose in one language; do not mix English and Chinese. Non-English source text, UI labels, media titles and literal model output may remain as quoted data when the subject requires them.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production build and run framework checks.
- `npm run start`: serve the production build locally.
- `npm run lint`: run ESLint with the Next.js core-web-vitals and TypeScript rules.
- `npm run typecheck`: refresh Next.js generated route types with `next typegen`, then run `tsc --noEmit --pretty false`.
- `npm test`: run TypeScript unit tests through the `tsx` runner.

## Coding Style & Naming Conventions

- Use TypeScript with strict compiler settings and the `@/*` path alias for imports from `src/`
- Follow existing formatting: two-space indentation is common in config files, while several test files use four spaces
- Name React components in PascalCase, hooks with `use` prefixes, and route handlers as `route.ts`
- Keep media-processing and listening-interaction rules close to their modules under `src/listening/`. Prefer native browser features and existing dependencies. The confirmed desktop MVP uses host-owned SQLite and requires no account system; current processing choices are documented in `docs/PRODUCT_SPEC.md` and `docs/ROADMAP.md`.

## Testing Guidelines

- Tests use Node's built-in `node:test` module with `node:assert/strict`, executed via `npm test` and the `tsx` TypeScript runner.
- Keep test files beside the code they cover using `*.test.ts`, such as `src/listening/processing.test.ts`.
- Use ESM-style static imports in tests; avoid top-level dynamic `await import(...)` unless a test specifically needs runtime import behavior.
- Do not run `.ts` tests with bare `node --test`; the repository relies on `tsx` to load TypeScript.
- Prefer focused checks for media-result validation, sentence timing, meaning-group boundaries, reveal rules, request validation and material provenance; verify processing and playback flows in a browser.

## Commit & Pull Request Guidelines

- When asked to commit current changes, stage and commit them directly. Treat `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and other checks as opt-in verification, run only when the user explicitly requests them or the task specifically requires verification.
- Recent history uses concise subjects with conventional prefixes such as `feat:`, `chore:`, and `refactor:`. Keep commits focused and use imperative, specific summaries, for example `feat: add placement test retry state`.
- For non-trivial commits, include a short commit body after the subject that summarizes the main behavior changes, schema/data compatibility notes, and test or tooling updates.
- Prefer 2-4 concise bullet-style body lines when a commit touches multiple layers, such as API, UI, domain logic, and tests.

## Security & Configuration Tips

Local transcription requires no environment secret. Passage generation uses the owner's API key in the host or an ignored local environment file. Never commit existing secrets, local databases, logs or generated uploads. Record provenance and material-specific usage conditions when adding audio; the code license does not automatically cover learning media.

## Agent skills

### Issue tracker

Issues are tracked as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a single-context layout. See `docs/agents/domain.md`.
