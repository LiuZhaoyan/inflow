# Repository Guidelines

## Project Structure & Module Organization

Inflow is a Korean intensive-listening MVP using Next.js 16, TypeScript and React 19. Page entry, layout, styles and the retained Logo live in `src/app/`. The learning UI, dictation logic, tests and lesson JSON live in `src/listening/`. Audio and provenance belong in `public/materials/`. Progress is browser-local in the retained legacy MVP. Preserved legacy `data/` and `public/uploads/` are not source and must not be deleted as part of code cleanup. Current product scope is defined in `docs/PRODUCT_SPEC.md`; `docs/STRUCTURED_INTENSIVE_LISTENING_MVP.md` is a historical record of the superseded preloaded dictation MVP.

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
- Keep dictation and progress rules in `src/listening/practice.ts`. Prefer native browser features and existing dependencies. The retained legacy MVP needs no LLM, account system or database; current processing choices are documented in `docs/PRODUCT_SPEC.md` and `docs/ROADMAP.md`.

## Testing Guidelines

- Tests use Node's built-in `node:test` module with `node:assert/strict`, executed via `npm test` and the `tsx` TypeScript runner.
- Keep test files beside the code they cover using `*.test.ts`, such as `src/listening/practice.test.ts`.
- Use ESM-style static imports in tests; avoid top-level dynamic `await import(...)` unless a test specifically needs runtime import behavior.
- Do not run `.ts` tests with bare `node --test`; the repository relies on `tsx` to load TypeScript.
- Prefer focused checks for dictation, hint boundaries, persistence and material timestamps; verify playback and learning flows in a browser.

## Commit & Pull Request Guidelines

- When asked to commit current changes, stage and commit them directly. Treat `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and other checks as opt-in verification, run only when the user explicitly requests them or the task specifically requires verification.
- Recent history uses concise subjects with conventional prefixes such as `feat:`, `chore:`, and `refactor:`. Keep commits focused and use imperative, specific summaries, for example `feat: add placement test retry state`.
- For non-trivial commits, include a short commit body after the subject that summarizes the main behavior changes, schema/data compatibility notes, and test or tooling updates.
- Prefer 2-4 concise bullet-style body lines when a commit touches multiple layers, such as API, UI, domain logic, and tests.

## Security & Configuration Tips

No environment secrets are required for the MVP. Never commit existing secrets, local databases, logs or generated uploads. Record provenance and material-specific usage conditions when adding audio; the code license does not automatically cover learning media.

## Agent skills

### Issue tracker

Issues are tracked as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a single-context layout. See `docs/agents/domain.md`.
