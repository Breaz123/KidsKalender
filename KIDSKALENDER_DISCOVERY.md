# KidsKalender — Discovery & Gap Report

**Repository:** https://github.com/Breaz123/KidsKalender  
**Primary Branch:** `master`  
**Purpose:** Private PWA for managing shared child custody calendar between two parents

---

## Architecture Overview

### Tech Stack

**Frontend (PWA):**
- React 18.3 + Vite 6
- Tailwind CSS 3.4
- React Router 7
- TanStack Query 5 (data fetching/caching)
- Vite PWA plugin (service worker, offline support)
- date-fns 4 (date manipulation)
- IndexedDB via idb-keyval (client-side storage)

**Backend (API):**
- Fastify 5 (web framework)
- Drizzle ORM 0.38 + postgres driver 3.4
- Argon2 (password hashing)
- Session-based authentication (cookies)
- Rate limiting (@fastify/rate-limit)
- CORS enabled (@fastify/cors)

**Database:**
- PostgreSQL 16 (alpine Docker image)

**Infrastructure:**
- Docker Compose (development & production)
- Caddy 2 (reverse proxy, automatic HTTPS via Let's Encrypt)
- Automated daily backups via cron (`pg_dump`)

**Monorepo:**
- npm workspaces (3 packages)
- TypeScript 5.7 throughout
- ESLint 9 + typescript-eslint 8
- Vitest 2 (test runner, not actively used yet)

---

## Monorepo Structure

```
├── apps/
│   ├── web/           # React PWA (@kids-calendar/web)
│   └── api/           # Fastify REST API (@kids-calendar/api)
├── packages/
│   └── shared/        # Shared Zod schemas & types (@kids-calendar/shared)
├── docker/            # Dockerfiles (web, api, backup)
├── scripts/           # Node.js utility scripts
├── backups/           # pg_dump output directory
├── docker-compose.yml         # Production stack (postgres, api, web, caddy, backup)
├── docker-compose.dev.yml     # Dev: Postgres only (port 5433)
├── Caddyfile                  # Reverse proxy config
├── vercel.json                # Vercel deployment (web only)
└── .env.example               # Template for all required env vars
```

---

## How Local Development Works

**Prerequisites:**
- Node.js 20+
- Docker & Docker Compose (for Postgres)

**Steps (from README):**

1. `npm install` (installs all workspace dependencies)
2. `cp .env.example .env` (configure locally)
3. `docker compose -f docker-compose.dev.yml up -d` (starts Postgres on port 5433)
4. `npm run db:migrate` (runs Drizzle migrations in `apps/api/src/db/migrations/`)
5. `npm run db:seed` (seeds August 2026 test data)
6. `npm run user:create -- --email papa@example.com --name "Papa"` (creates first parent)
7. `npm run user:create -- --email mama@example.com --name "Mama" --household <uuid>` (creates second parent in same household)
8. `npm run dev` (starts both web on :5173 and API on :3001)

**Development URLs:**
- Web: `http://localhost:5173`
- API: `http://localhost:3001`
- Postgres: `localhost:5433`

**Vite Proxy:** In dev mode, Vite proxies `/api/*` requests to the API (configured in `apps/web/vite.config.ts`), so frontend calls relative `/api/...` URLs.

---

## How Production Deployment Works

### Docker Compose (Self-Hosted)

The canonical production setup uses `docker-compose.yml`:

1. **postgres** — PostgreSQL 16, internal network only
2. **api** — Fastify API, built via `docker/api/Dockerfile`, listens on :3001 internally
3. **web** — Nginx serving static Vite build from `docker/web/Dockerfile`, listens on :80 internally
4. **caddy** — Reverse proxy on :80/:443, auto-HTTPS via Let's Encrypt
   - Routes `/api/*` → api:3001
   - Routes `/*` → web:80
5. **backup** — Daily `pg_dump` cron job, retains backups for 14 days (configurable)

**Required .env for production:**
- `DOMAIN` (e.g., `kalender.example.com`)
- `ACME_EMAIL` (for Let's Encrypt)
- `SESSION_SECRET` (min 32 chars)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `COOKIE_SECURE=true`
- `CORS_ORIGIN=https://${DOMAIN}`

**Deployment steps:**
1. Configure DNS: `DOMAIN` → server IP
2. Open ports 80 & 443
3. `docker compose up -d --build`
4. `docker compose exec api node apps/api/dist/db/migrate.js`
5. Seed data and create users via CLI scripts

**HTTPS:** Fully automated via Caddy + Let's Encrypt (ACME).

---

### Vercel Deployment (Web Only)

`vercel.json` configures a **frontend-only** deployment:
- Framework: Vite
- Build: `npm run build -w @kids-calendar/shared && npm run build -w @kids-calendar/web`
- Output: `apps/web/dist`
- Rewrites: SPA fallback to `/index.html` (except `/api/*`)

**Key Question:** The README and `vercel.json` do **not** specify where the API backend runs when the web app is deployed to Vercel. Options:
1. Vercel deployment expects API hosted separately (e.g., Docker on a VPS)
2. The `VITE_API_URL` env var (empty in production Docker builds) is meant to be set at build time for Vercel
3. The Vercel deploy may be a **preview/staging** environment only

**Unclear:** Is `kids-kalender.vercel.app` the intended production URL, or just a demo? If production, where is its API hosted?

---

## Environment Variables (Names Only)

**Database:**
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL` (full connection string, derived or explicit)

**API Runtime:**
- `NODE_ENV` (development | production)
- `API_PORT` (default 3001)
- `SESSION_SECRET` (min 32 chars, cryptographic)
- `SESSION_DURATION_HOURS` (default 168 = 1 week)
- `COOKIE_SECURE` (false in dev, true in prod)
- `CORS_ORIGIN` (allowed frontend origin)

**Web Build (Vite):**
- `VITE_API_URL` (API base URL; empty in prod Docker → uses relative `/api/*`)

**Production (Docker):**
- `DOMAIN` (e.g., `kalender.example.com`)
- `ACME_EMAIL` (Let's Encrypt contact)
- `BACKUP_RETENTION_DAYS` (default 14)

**No secrets were found in `.env.example` — all values are placeholders.**

---

## Gaps, Risks & Unclear Areas

### 1. **CI/CD Pipeline**
- **Status:** None found
- **Gap:** No GitHub Actions, GitLab CI, or other automation
- **Risk:** Manual testing and deployment only; no automated linting, type-checking, or tests on PRs
- **Recommendation:** Add GitHub Actions for lint, typecheck, and test on push/PR

### 2. **Vercel Deployment Ambiguity**
- **Gap:** `vercel.json` deploys only the web app; API host not documented
- **Questions for Siemon:**
  1. Is `kids-kalender.vercel.app` the intended production URL?
  2. If yes, where does the API run? (separate VPS, Vercel Serverless Functions, Railway, Fly.io?)
  3. Should `VITE_API_URL` be set at Vercel build time to point to external API?
- **Risk:** Frontend may deploy successfully but fail to reach API if not configured correctly

### 3. **Testing Coverage**
- **Status:** Vitest configured, minimal test files exist (e.g., `apps/api/src/tests/api.test.ts`)
- **Gap:** No actual tests written; test suites are placeholders
- **Risk:** Regressions and auth/business logic bugs may go undetected
- **Recommendation:** Write integration tests for:
  - Authentication flows (login, logout, session)
  - Calendar CRUD operations
  - User creation and household linking
  - Database migrations

### 4. **Database Migrations in Production**
- **Current:** Manual step after `docker compose up`: `docker compose exec api node apps/api/dist/db/migrate.js`
- **Risk:** Easy to forget; migrations must be applied before new code runs
- **Recommendation:** Consider running migrations automatically in API startup (with idempotency checks), or add a pre-deploy step in CI

### 5. **Backup & Disaster Recovery**
- **Status:** Automated daily backups via cron (`pg_dump`)
- **Gap:** 
  - Backups stored only in Docker volume (`backup_data`) — not externally redundant
  - Restore process documented but not tested in README
- **Risk:** Data loss if server/volume is destroyed
- **Recommendation:** 
  - Add automated backup upload to cloud storage (S3, Backblaze, Google Drive)
  - Test restore procedure periodically

### 6. **Authentication & Session Security**
- **Current:** Session-based with `SESSION_SECRET`, Argon2 password hashing
- **Gap:** No documented password reset flow, no 2FA
- **Risk:** If parent loses password, admin intervention required
- **Recommendation:** 
  - Add password reset via email (requires SMTP config)
  - Document admin recovery procedure

### 7. **No Rate Limiting Configuration**
- **Status:** `@fastify/rate-limit` installed but no config visible in README
- **Gap:** Unclear if rate limiting is active or configured appropriately
- **Recommendation:** Verify rate limit settings in API startup code

### 8. **Production Domain & DNS**
- **Gap:** README uses `kalender.example.com` as placeholder
- **Question for Siemon:** What is the actual production domain?

### 9. **CORS Configuration**
- **Current:** `CORS_ORIGIN` must match frontend origin exactly
- **Risk:** If misconfigured, API calls will fail with CORS errors in browser
- **Recommendation:** Document CORS troubleshooting steps in README

### 10. **No Monitoring or Logging**
- **Gap:** No structured logging, no error tracking (Sentry, etc.), no uptime monitoring
- **Risk:** Production issues may go unnoticed
- **Recommendation:** Add basic logging middleware (Pino) and error tracking

---

## Recommended Next 3 Engineering Steps

### 1. **Set Up CI/CD (GitHub Actions)**
**What:** Add `.github/workflows/ci.yml` to run on push/PR:
- `npm run lint --workspaces` (ESLint)
- `npm run typecheck --workspaces` (TypeScript)
- `npm run test --workspaces` (Vitest — once tests exist)
- Optional: Build Docker images and push to registry

**Why:** Catch errors early, enforce code quality, automate testing

**Effort:** Low (1-2 hours)

---

### 2. **Write Core Integration Tests**
**What:** Add Vitest tests for:
- **API:** 
  - POST `/api/auth/login` (success, failure)
  - POST `/api/auth/logout`
  - GET `/api/calendar/:month` (authenticated, unauthenticated)
  - POST `/api/calendar/entries` (create, update, delete)
- **Database:** Verify migrations apply cleanly to empty DB
- **Web:** Optional smoke tests with Testing Library

**Why:** Catch regressions, document expected behavior, enable confident refactoring

**Effort:** Medium (4-6 hours for basic coverage)

---

### 3. **Clarify & Document Vercel Deployment**
**What:**
1. Determine if Vercel is production, staging, or unused
2. If production:
   - Document API host setup (VPS, Railway, Fly.io?)
   - Add `VITE_API_URL` to Vercel environment variables
   - Test full frontend + backend integration
3. If staging/demo:
   - Rename or remove `vercel.json` to avoid confusion
   - Document Docker Compose as the only production path

**Why:** Eliminate deployment confusion, ensure engineers know where to deploy

**Effort:** Low (1-2 hours for documentation; medium if new API hosting setup needed)

---

## Open Questions for Siemon

1. **Vercel Deployment:**
   - Is `kids-kalender.vercel.app` the intended production URL?
   - If yes, where is the API backend hosted?
   - Should `VITE_API_URL` be configured in Vercel env vars?

2. **Production Domain:**
   - What is the actual production domain (replacing `kalender.example.com`)?

3. **Testing & CI:**
   - Are there existing tests not committed to the repo?
   - Should CI be set up on GitHub, or is there a preference for GitLab/other?

4. **Backup Strategy:**
   - Should backups be uploaded to cloud storage (S3, etc.)?
   - What is the acceptable Recovery Point Objective (RPO)?

5. **Authentication:**
   - Is password reset functionality required?
   - Any plans for 2FA or magic link login?

6. **Monitoring:**
   - Should error tracking (Sentry, etc.) be added?
   - Any preference for logging service (Logtail, Datadog)?

---

## Summary

KidsKalender is a **well-structured, modern monorepo** with a solid technical foundation:
- Clean separation between web (PWA), API (Fastify), and shared code
- Robust local development setup with Docker Compose
- Production-ready Docker stack with auto-HTTPS via Caddy
- TypeScript throughout, modern React & Vite tooling

**Main gaps:**
- No CI/CD pipeline
- Unclear Vercel deployment story (web-only, API host not documented)
- Minimal test coverage (Vitest configured but unused)
- Backup redundancy (local only, no cloud upload)

**Next steps:** Add CI, write core integration tests, and clarify/document the Vercel deployment path. Once those are addressed, the project will be well-positioned for reliable production operation.
