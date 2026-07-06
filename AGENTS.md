# Repository Guidelines

## Project Structure & Module Organization

Inflow is a Next.js 16 App Router project using TypeScript and React 19. Application routes and API handlers live in `src/app/`, reusable UI in `src/components/`, custom hooks in `src/hooks/`, and shared business logic in `src/lib/`. Database schema and access code are under `src/lib/db/`, with generated Drizzle migrations in `drizzle/`. Static assets belong in `public/`; generated or uploaded media is stored under `public/uploads/`. Runtime SQLite data is kept in `data/` and should not be treated as source.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production build and run framework checks.
- `npm run start`: serve the production build locally.
- `npm run lint`: run ESLint with the Next.js core-web-vitals and TypeScript rules.
- `npm run db:generate`: generate Drizzle migration files from schema changes.
- `npm run db:migrate`: apply pending migrations to the SQLite database.
- `npm run db:studio`: open Drizzle Studio for database inspection.

## Coding Style & Naming Conventions

- Use TypeScript with strict compiler settings and the `@/*` path alias for imports from `src/`
- Follow existing formatting: two-space indentation is common in config files, while several test files use four spaces
- Name React components in PascalCase, hooks with `use` prefixes, and route handlers as `route.ts`
- Keep domain logic in `src/lib/domain/` or focused service modules rather than embedding it in components.

## Testing Guidelines

- Existing tests use Node's built-in `node:test` module with `node:assert/strict`
- keep test files beside the code they cover using `*.test.ts`, such as `src/hooks/learn/utils/requestId.test.ts` 
- Prefer focused unit tests for utilities, mappers, cooldown logic, and domain algorithms

## Commit & Pull Request Guidelines

- Recent history uses concise subjects with conventional prefixes such as `feat:`, `chore:`, and `refactor:`. Keep commits focused and use imperative, specific summaries, for example `feat: add placement test retry state`.

## Security & Configuration Tips

Copy required settings from `.env.example` into `.env.local`; never commit secrets, local databases, logs, or generated uploads. Review AI, TTS, and image-generation settings when changing server-side API routes.
