# Repository Guidelines

## Project Structure & Module Organization
The app is an Astro 5 project driven by islands of React. Feature components live in `src/components` and shared utilities in `src/lib`. Layout wrappers sit in `src/layouts`, while routed pages (SSR endpoints and API routes) are under `src/pages`. Global styles live in `src/styles`. Static assets go to `public`. Database assets are tracked in `supabase/migrations` with environment defaults in `supabase/config.toml`. Agent-facing docs and specs are stored in `.ai` (for example `.ai/prd.md`), and should be updated whenever product flows change.

## Build, Test, and Development Commands
Use Node 22 (`nvm use`) before installing dependencies. Key scripts:
- `npm run dev` launches the Astro dev server with hot reload.
- `npm run build` produces the optimized static+SSR output in `dist/`.
- `npm run preview` serves the production bundle for smoke testing.
- `npm run lint` / `npm run lint:fix` run ESLint with the TypeScript + React config.
- `npm run format` applies Prettier (including .astro files).

## Coding Style & Naming Conventions
Follow TypeScript with strict typing; prefer explicit interfaces for shared data. Components use PascalCase filenames (`TrainingCalendar.tsx`); hooks/utilities use camelCase (`usePlan.ts`). Keep indentation at 2 spaces and rely on Prettier defaults; never commit unformatted code. Tailwind utility order should remain logical but linting is not enforced—group related classes by layout, spacing, then color. New modules should export a single default when the file centers on one UI element, otherwise use named exports.

## Testing Guidelines
We target end-to-end coverage with Playwright once flows stabilize. Place scenarios in `tests/e2e` mirroring the route structure (create folder if absent). Name specs using `<feature>.spec.ts`. Run tests locally with `npx playwright test` after `npm run build` to ensure SSR parity. Add minimal fixtures/stubs instead of hitting live Supabase; store canned responses under `tests/fixtures`. Pull requests introducing new UI states should include at least one regression test, or call out gaps in TODOs.

## Commit & Pull Request Guidelines
Commits use present-tense, sentence-case summaries (e.g., `Add Supabase configuration and migrations`). Group related changes and let Husky’s pre-commit hook finish cleanly. Pull requests should describe intent, outline testing (`npm run lint`, `npx playwright test`), and link related GitHub issues. Include before/after screenshots for UI tweaks and note any configuration updates. Tag reviewers when touching `.ai` product docs so agent-facing content stays consistent.

## AI Agent Data & Security
Product briefs, prompts, and agent context live in `.ai/` (e.g., `.ai/prd.md`, `.ai/tech-stack.md`). Update these files whenever flows, copy, or toolchain change so automated agents ship the right behavior. Treat `.ai` as source of truth—avoid leaking secrets and keep environment-specific values in `.env.*` files excluded by `.gitignore`.
