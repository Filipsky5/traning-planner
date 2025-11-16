## AI Running Training Planner (MVP)

<p align="left">
  <a href="https://nodejs.org/"><img alt="Node" src="https://img.shields.io/badge/node-22.14.0-339933?logo=node.js"></a>
  <a href="https://astro.build/"><img alt="Astro" src="https://img.shields.io/badge/Astro-5-BC52EE?logo=astro&logoColor=white"></a>
  <a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/React-19-087EA4?logo=react&logoColor=white"></a>
  <a href="https://tailwindcss.com/"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss&logoColor=white"></a>
  <img alt="Version" src="https://img.shields.io/badge/version-0.0.1-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-in_progress-blue">
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green"></a>
</p>

### Table of Contents
- [1. Project name](#1-project-name)
- [2. Project description](#2-project-description)
- [3. Tech stack](#3-tech-stack)
- [4. Getting started locally](#4-getting-started-locally)
- [5. Available scripts](#5-available-scripts)
- [6. Project scope](#6-project-scope)
- [7. Project status](#7-project-status)
- [8. License](#8-license)

## 1. Project name

AI Running Training Planner

## 2. Project description

AI Running Training Planner is a web application that helps beginner and intermediate runners plan their workouts using AI-generated suggestions. The MVP focuses on making training planning simple and approachable without requiring coaching expertise.

Key goals:
- Provide structured workout suggestions with clear parts: Warm-up, Main, Cool-down
- Adapt to the user based on their last 3 workouts and feedback ratings
- Keep the interface simple with a calendar-first experience

For a detailed product specification, see the PRD: [`./.ai/prd.md`](./.ai/prd.md).

## 3. Tech stack

- Frontend
  - Astro 5 (SSR) with `@astrojs/node`
  - React 19 (Astro Islands)
  - Tailwind CSS 4
  - shadcn/ui
  - Lucide React (icons)
- Backend
  - Supabase (PostgreSQL, Auth, RLS)
  - Astro API Routes under `src/pages/api` (server-only)
  - AI integration via OpenRouter.ai (model-agnostic)
- DevOps & Deployment
  - Docker (single-stage, `node:22-alpine`)
  - Cloudflare Pages
  - GitHub Actions for CI/CD
- Testing & DX
  - **E2E Tests**: Playwright (Chromium, WebKit, desktop + mobile viewports)
  - **Unit/Integration Tests**: Vitest + React Testing Library
  - **API Tests**: supertest or node-fetch (for Astro API endpoints)
  - **Mocking** (optional): MSW (Mock Service Worker)
  - TypeScript 5
  - ESLint 9, Prettier, Husky, lint-staged

Selected runtime/tooling versions come from the current project setup:
- Node: `22.14.0` (see `.nvmrc`), engines: `>=22.0.0`
- Notable dependencies: `astro@^5.13.7`, `react@^19.1.1`, `tailwindcss@^4.1.13`

Additional stack details are documented in [`./.ai/tech-stack.md`](./.ai/tech-stack.md).

## 4. Getting started locally

- Prerequisites
  - Node.js 22 (recommended via `nvm`): `22.14.0`
  - npm (bundled with Node)

- Clone and install
```bash
# clone
git clone https://github.com/Filipsky5/traning-planner
cd traning-planner

# use the project Node version
nvm use

# install dependencies
npm install
```

- Run the dev server
```bash
npm run dev
```
The dev server will start and print a local URL (Astro dev).

- Build for production
```bash
npm run build
```

- Preview the production build
```bash
npm run preview
```

Notes:
- No environment variables are required at this stage. Future integrations (Supabase, OpenRouter) will introduce configuration.
- This project uses Tailwind CSS 4 and Astro 5 with React Islands; minimal client JS is shipped by default.

## 5. Available scripts

All scripts are defined in `package.json`:

- `dev`: Start the Astro dev server
- `build`: Build the production site
- `preview`: Preview the built site locally
- `astro`: Run the Astro CLI directly
- `lint`: Run ESLint on the project
- `lint:fix`: Run ESLint with auto-fix
- `format`: Format files with Prettier

## 6. Project scope

- In scope (MVP)
  - User onboarding: user provides exactly 3 last training sessions (starter data)
  - AI training generation with structure: Warm-up, Main, Cool-down
  - Calibration mode for the first 3 AI-generated workouts
  - Progressive logic: if the last 3 ratings for a training type are “just right” or “too easy”, increase the next suggestion slightly (e.g., ~10%)
  - Training management: manually add/edit/delete completed workouts (distance, duration, avg HR)
  - Calendar visualization as the main view (color-coded by workout type)
  - Rating system after completing a workout: Too Easy / Just Right / Too Hard
  - Modal UI for AI proposals with Accept/Add and Reject/Regenerate (limit: 3 regenerations/day)

- Out of scope (for MVP)
  - File imports (.FIT, .GPX) or any external integrations (e.g., Strava, Garmin)
  - Charts and advanced visualizations
  - Social features
  - Mobile applications

Success criteria (targets):
- AI suggestion acceptance rate ≥ 75%
- AI-generated workouts ≥ 75% of all scheduled workouts
- Majority of user ratings trending to “Just Right”

See the PRD for full details: [`./.ai/prd.md`](./.ai/prd.md).

## 7. Project status

Planned next steps (from Tech Stack & PRD):
- Implement Supabase (DB + Auth) and Astro API routes under `src/pages/api`
- Integrate OpenRouter.ai for AI training generation
- Build calendar UI and training forms; wire rating flow
- Add CI/CD (GitHub Actions) and containerization (Docker)
- Add basic E2E test (Playwright) verifying the main user flow

Timeline guidance and deployment options are described in [`./.ai/tech-stack.md`](./.ai/tech-stack.md).

## 8. License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
