# Tech Stack Discussion Summary

**Date:** October 11, 2024
**Goal:** Choose the optimal tech stack for the AI Running Training Planner certification project

## Project Context

### Requirements:

- Certification project deadline: **November 16, 2024**
- Working time: **8h/week for 5 weeks** = ~25-30h of effective project time
- Developer: iOS developer (12 years of Swift) learning web development
- Learning alongside the project: online course

### Certification Requirements (MANDATORY):

1. ✅ User access control mechanism (login)
2. ✅ Data management - CRUD
3. ✅ Business logic with AI
4. ✅ PRD and context documents
5. ✅ At least 1 E2E test verifying functionality
6. ✅ CI/CD pipeline (build + tests)
7. ⭐ Deployment to a public URL (optional, but required)

### Specific technical requirements:

- **Deployment to a DigitalOcean VPS** (required for certification)
- **GitHub Actions** with manual triggering
- **Docker** (required for VPS deployment)

## Discussion Progress

### 1. Initial Tech Stack Proposal

Original stack proposed in `tech-stack.md`:

```
- Frontend: Astro 5 + React 19 + Tailwind 4
- Backend: Supabase (BaaS)
- AI: OpenRouter.ai
- CI/CD: GitHub Actions
- Hosting: DigitalOcean + Docker
```

### 2. Critical Analysis (6 questions)

#### ✅ Question 1: Speed of MVP delivery?

**Answer:** YES, with reservations

- Supabase as a BaaS significantly speeds up development
- Shadcn/ui provides ready-made components
- **But:** Astro 5 and Tailwind 4 are very new versions (potentially unstable)
- **But:** Docker + CI/CD may take considerable time

#### ✅ Question 2: Scalability?

**Answer:** YES, but over-engineered for an MVP

- PostgreSQL (Supabase) scales very well
- Astro SSR + React allows gradual growth
- **Problem:** Excessive for an MVP with a few hundred users

#### ⚠️ Question 3: Maintenance costs?

**Answer:** Moderate - cheaper options exist

- Supabase: $0 (free tier)
- DigitalOcean: $12-24/month
- OpenRouter: $5-20/month
- **TOTAL: $17-44/month**

#### ❌ Question 4: Do we need such a complex solution?

**Answer:** NO, too much for an MVP

- Docker + CI/CD is overkill for simple CRUD
- Astro 5 (bleeding edge) - Tailwind 4 (bleeding edge) = risk
- A simpler stack is sufficient for basic CRUD

#### ✅ Question 5: Is there a simpler approach?

**Answer:** YES

**Alternative #1 - Ultra-minimalist:**

- Next.js 15 (all-in-one)
- Vercel (free hosting, automatic CI/CD)
- Vercel Postgres / SQLite + Turso
- NextAuth
- **Cost: $0-5/month**

**Alternative #2:** Bubble.io / FlutterFlow (no-code)

#### ✅ Question 6: Security?

**Answer:** YES, but requires deliberate configuration

- Supabase has built-in Row Level Security
- Ready-made authentication
- **Risks:** OpenRouter API keys, sensitive data (heart rate), GDPR

### 3. First Recommendation (Vercel)

After the analysis, a **simplified stack** was proposed:

```
- Next.js 15 (instead of Astro)
- Vercel (instead of DigitalOcean)
- Vercel Postgres (instead of self-hosted Postgres)
- NextAuth
- Cost: $0-5/month
- Setup time: 1 week vs 4-5 weeks
```

**Rationale:**

- Fast validation is the priority for an MVP
- Simplicity > perfect architecture

### 4. Discovery of the Existing Configuration

Project analysis showed that **the following already exists:**

```json
{
  "astro": "^5.13.7",
  "react": "^19.1.1",
  "tailwindcss": "^4.1.13",
  "@astrojs/node": "^9.4.3",
  "shadcn/ui": "configured"
}
```

**New recommendation:** STAY with Astro (already configured), but simplify deployment.

### 5. Verification of Developer Experience

#### Database experience:

- ✅ SQL (rusty, 10 years ago)
- ❌ Foreign keys (unfamiliar)
- **Decision:** Supabase is OK (the visual interface will help)

#### JavaScript/TypeScript experience:

- ✅ Async/await, promises (familiar from Swift)
- ✅ Understands client-side vs server-side
- ✅ Understands Astro directives (`client:load`, `server:defer`)
- **Verification test passed!**

#### React experience:

- ✅ React Native (hooks, components)
- **Decision:** React for the web will not be a problem

#### Deadline:

- **November 16, 2024**
- 5 weeks, 8h/week
- **25-30h of actual time**

#### CI/CD requirements:

- ✅ Automatic builds on push
- ✅ Automatic tests
- ✅ Automatic deployment
- ✅ Manual trigger
- ❗ **Deployment to a DigitalOcean VPS is MANDATORY** (certification requirement)

### 6. Key Information

**REQUIREMENT:** Deployment to a **DigitalOcean VPS** (not Vercel/Netlify)

This changes everything - Vercel is no longer an option.

### 7. Final Recommendation

#### Stay with Astro + Docker + DigitalOcean

**Rationale:**

1. Astro is already configured (rewriting would waste 1-2 weeks)
2. Docker + DO are required for certification
3. With 12 years of iOS development experience, the developer can manage it

**Simplifications:**

- Use **DigitalOcean App Platform** ($5/month) instead of a plain Droplet (simpler)
- Or a Droplet with a **Docker Marketplace image** (saves 2h of configuration)
- **Supabase** (hosted) instead of self-hosted Postgres on the VPS
- Tailwind 4 - OK (recommended by course authors)

## Final Stack

### Frontend

- **Astro 5** (SSR) - already configured
- **React 19** - familiar from React Native
- **Tailwind 4** - recommended by the course
- **shadcn/ui** - ready-made components

### Backend

- **Supabase** (hosted PostgreSQL + Auth)
- **Astro API routes**
- **OpenRouter.ai** (AI)

### DevOps

- **Docker** (simple Dockerfile: `node:20-alpine`)
- **DigitalOcean** (App Platform or Droplet with Docker)
- **GitHub Actions** (build + test + deploy)
- **Playwright** (E2E tests)

### Costs

- Supabase: $0 (free tier)
- DigitalOcean App Platform: $5/month
- DigitalOcean Droplet: $12-24/month (alternative)
- OpenRouter: $5-20/month
- **TOTAL: $10-44/month**

## Timeline (25-30h)

**Week 1 (8h):**

- Supabase setup (1h)
- Tables + Auth (3h)
- DigitalOcean setup + first deployment (2h)
- Basic GitHub Actions setup (2h)

**Week 2 (8h):**

- Calendar UI (3h)
- Workout CRUD (3h)
- OpenRouter integration (2h)

**Week 3 (8h):**

- AI workout generator (3h)
- Rating system (2h)
- Onboarding flow (3h)

**Week 4 (6h):**

- Playwright E2E test (2h)
- Bug fixes + deployment debugging (2h)
- Documentation (2h)

**Week 5:** Buffer

## Plan B (If Time Runs Out)

1. **Deploy to Vercel first** (5-minute setup) - a working MVP
2. **Then** migrate deployment to DO
3. In the documentation: "Deployment available on multiple platforms"

## Key Takeaways

### ✅ What worked in the discussion:

1. Discovering the project was already partially configured (Astro)
2. Verifying the developer's experience (iOS provides a good foundation)
3. Identifying the VPS requirement (changed the recommendation)
4. Realistic time estimates

### ⚠️ Potential risks:

1. **Docker + DO setup may take 30% of the time** (8-10h)
2. Tailwind 4 may have bugs (bleeding edge)
3. Tight deadline (November 16)

### 💡 Key tips:

1. Priority: **a working project delivered on time** > perfect architecture
2. Use **DigitalOcean App Platform** (simpler than a Droplet)
3. **Hosted Supabase** (rather than self-hosted Postgres)
4. Ready-made snippets for Docker, GitHub Actions, CI/CD

## iOS → Web Analogies (for the Developer)

| iOS/Swift   | This project                 | Concept                    |
| ----------- | ---------------------------- | -------------------------- |
| SwiftUI     | React                        | Declarative UI             |
| async/await | async/await                  | Identical syntax           |
| Firebase    | Supabase                     | BaaS with auth + DB        |
| Codable     | TypeScript types             | Type safety                |
| XCTest      | Playwright                   | E2E testing                |
| Fastlane    | GitHub Actions               | CI/CD                      |
| Docker      | Container for the entire app | More than just the runtime |

## Next Steps

1. ✅ Set up Supabase account
2. ✅ Set up DigitalOcean account
3. ✅ Dockerfile (ready-made snippet in tech-stack.md)
4. ✅ GitHub Actions workflow (ready-made snippet)
5. 📖 Read Astro SSR docs
6. 📖 Read Supabase Auth docs
7. 🚀 Start coding!

## Files Created

1. ✅ `.ai/tech-stack.md` - Detailed description of the chosen stack
2. ✅ `.claude/claude.md` - Developer context for AI
3. ✅ `.ai/tech-stack-discussion.md` - This document

---

**Summary:** The Astro + React + Supabase + Docker + DigitalOcean stack is **optimal** for this project, considering:

- Certification requirements
- Developer experience (iOS)
- Available time (5 weeks)
- Existing configuration

Success depends on **simplifying wherever possible** (hosted Supabase, DO App Platform, ready-made components) and **sticking to the schedule**.
