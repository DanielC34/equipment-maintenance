# EMMS Production Deployment Guide

This document is the canonical runbook for taking EMMS from a developer laptop to a
production deployment. It implements **Phase 10 (Production Deployment)** of the
[development roadmap](../IMPLEMENTATION_ROADMAP.md) and the production checklist from
Session 8 of the learning handbook ([08-deployment-and-production.md](./learning/08-deployment-and-production.md)).

> [!IMPORTANT]
> The deployment **targets are fixed**: the Next.js application runs on **Vercel**, and
> PostgreSQL + Redis run on **Railway**. No Dockerfile, reverse proxy, or custom server
> is required for this path. If the hosting decision ever changes, this document must be
> rewritten — not patched.

---

## 1. Target Architecture

```mermaid
flowchart TD
    A[User Browser] --> B[Internet]
    B --> C[Vercel: Next.js Application]
    C --> D[Prisma]
    D --> E[Railway: PostgreSQL]
    C --> F[Railway: Redis]
    C --> G[Auth.js]
```

| Component | Host | Purpose |
|---|---|---|
| Next.js application | Vercel | Frontend + backend (server components, actions, route handlers, middleware) |
| PostgreSQL | Railway | Source of truth for all business data |
| Redis | Railway | Best-effort cache for dashboard/report aggregates (M15) |
| Auth.js (NextAuth) | inside the app | Credentials sign-in, JWT sessions (24h), `AUTH_SECRET` signing |

Key production behaviors already built in:

- **Best-effort Redis** — `src/lib/cache.ts` degrades to live PostgreSQL computation if
  Redis is unreachable (dashboard and reports stay fast enough to render).
- **Session lifetime** — JWT sessions expire after **24 hours** (`session.maxAge` in
  `src/auth.ts`), matching PRD §16. Sessions are stateless; deactivating a user blocks
  new sign-ins immediately (existing tokens live out their 24h).
- **Hardened errors** — root `not-found.tsx` (friendly 404) and `global-error.tsx`
  (root-layout crash fallback) render even outside the normal layout.

---

## 2. Environment Variables

Secrets live in the platform dashboards, **never** in source code (`.env*` is gitignored;
only `.env.example` is committed).

| Variable | Where | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | Railway PostgreSQL connection string | Yes | `postgresql://user:password@host:port/db?schema=public` — host must be a **publicly reachable** Railway URL or a Vercel-private assigned address |
| `REDIS_URL` | Railway Redis connection string | Recommended | `rediss://...` over TLS, or `redis://` if on the privacy network. App works without it (fallback), but dashboards lose caching |
| `AUTH_SECRET` | Any | **Yes** | Generate with `openssl rand -base64 32`. A stable value — changing it signs every user out |
| `NEXTAUTH_URL` | Vercel | **Yes** | The canonical public URL, e.g. `https://emms.vercel.app`. Ensures Auth.js builds correct callback URLs behind the proxy |

Vercel env vars should be set at **Preview** **and** **Production** scope so preview
deployments can talk to the same Railway services. Mark `AUTH_SECRET`, `DATABASE_URL`,
`REDIS_URL`, and `NEXTAUTH_URL` as **encrypted**.

> [!NOTE]
> Railway URLs — use the app's **publicly accessible** connection string. If you instead
> use a private network, Vercel cannot reach it without a Vercel Private Network or
> serverless-proxy; for this project, public Railway URLs with password auth are the
> documented path. **Verify whether your Railway connection URL requires an encrypted
> connection**: if it does, add `?sslmode=require` to `DATABASE_URL` (or use the exact URL
> settings Railway provides) and confirm the app connects before go-live.

---

## 3. Provisioning (first-time, one person with account access)

These steps require cloud accounts and are performed by the owner. Code-side preparation
already exists in the repository.

### 3a. Railway — PostgreSQL

1. Create a Railway project (e.g. `emms-prod`).
2. Add a **PostgreSQL** service. Copy the connection string → that is `DATABASE_URL`.
3. **Backups**: verify the backup/snapshot setting offered by **your** Railway plan — do not
   assume a default — and enable it, recording its retention. See [§7 Backups](#7-backups-and-restore-drill).

### 3b. Railway — Redis

1. Add a **Redis** service (volume optional — Redis is a cache; losing it is harmless).
2. Copy the connection string → that is `REDIS_URL`.

### 3c. Vercel — the application

1. Import the GitHub repository into Vercel (framework preset: **Next.js**).
2. Set the environment variables from [§2](#2-environment-variables).
3. Deploy once; confirm the build passes.

> The `"postinstall": "prisma generate"` script runs client generation during install, so
> later deployments need no extra build step. The Prisma CLI reads `prisma.config.ts`,
> which requires `DATABASE_URL` to be resolvable — this is why env vars must be set on the
> Vercel project **before** the first successful build. The script is guarded (`|| echo`) so
> a fresh local `npm install` that has no `.env` yet logs a skip note instead of aborting;
> on Vercel the env var is always set, so generation always runs (and a missing client
> would still fail the build loudly).

---

## 4. Deployment Pipeline

Vercel auto-deploys on every push to the connected branch and creates **preview
deployments** for pull requests:

```
git push → GitHub → Vercel (build + postinstall) → live
```

- The build runs `npm run build` (`next build`).
- `postinstall` runs `prisma generate` during dependency installation. It does **not**
  migrate the database.
- A failed build is not promoted — the previous deployment keeps serving.

There is deliberately **no GitHub Actions CI job**: the Vercel pipeline (lint/typecheck/
build) plus the repo's own unit/integration/runtime suites are the verification gates.
If a CI job is ever wanted, add a `verify:m16` (or `npm test`) job on push — it is optional.

---

## 5. Running Database Migrations in Production

Migrations are applied **from the developer machine / a one-off command**, never
automatically as part of every Vercel build (risky: mid-deploy migrations).

```powershell
# PowerShell (one-time): point at the Railway PostgreSQL URL, then apply pending migrations
$env:DATABASE_URL = "postgresql://user:<password>@host:port/db?schema=public"
npx prisma migrate deploy
```

```bash
# bash equivalent:
# DATABASE_URL="postgresql://user:<password>@host:port/db?schema=public" npx prisma migrate deploy
```

Best practice:

- Run `prisma migrate deploy` against production **after** the code deploying the matching
  schema merges, and **before** pointing real users at it.
- Never run `prisma migrate dev` or `prisma migrate reset` against production.
- Client generation needs no manual step: `postinstall` generates the Prisma client on
  every Vercel deployment.
- All eight migrations are in `prisma/migrations/` (see [§8 Verification](#8-verification)).

### Seeding in production

`prisma/seed.ts` **wipes every table first** (`deleteMany` chain) and creates demo accounts
with the known password `password123`. It is for local development only.

To bootstrap a **production** admin:

```bash
# In the Railway "Connection → SQL shell" (or a one-off psql session), when the DB is empty:
DATABASE_URL=<railway-pg-url> npx prisma db seed
```

Then **immediately** change the admin password — the app itself has no change-password
flow (by design), so use a one-off SQL update:

```sql
-- copy a bcrypt hash generated locally, e.g. via node -e
-- "console.log(require('bcryptjs').hashSync('S3cure-Pass!', 10))"
UPDATE "User" SET "password" = '<bcrypt-hash>' WHERE "email" = 'admin@emms.dev';
```

Then create the rest of the user roster through the running app (Administration → Users).

> [!WARNING]
> Never run the seed against a production database that already holds real data — it
> destroys it.

---

## 6. Production Checklist (Session 8)

| # | Check | How to verify |
|---|---|---|
| 1 | Environment variables configured | Vercel dashboard shows `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (encrypted) |
| 2 | Database migrations run | Set `DATABASE_URL` to the production URL, then `npx prisma migrate status` → "up to date" |
| 3 | Seed data loaded (if needed) | Only if the production DB is empty and demo data is desired; otherwise skip |
| 4 | Authentication working | Sign in as admin at the live URL; protected routes redirect anonymous users to `/login` |
| 5 | Database connected | Open `/dashboard` after sign-in; records render; verify `GET /api/health` returns `{"status":"ok","db":"ok"}`. If your Railway URL needs encryption, confirm `sslmode=require` is set in `DATABASE_URL` |
| 6 | Redis connected | Open `/dashboard`, then `/reports`; keys `emms:dashboard:aggregates:v1`, `emms:reports:*:v1` appear in Railway Redis with TTL ≤ 60 s |
| 7 | HTTPS enabled | Public URL starts with `https://` (automatic on Vercel unless a custom domain is misconfigured) |
| 8 | Error handling verified | Unknown URL (with a valid session) → custom `not-found` page (HTTP 404); note `global-error.tsx` covers any crash outside a layout. Anonymous unknown URLs redirect to `/login` via the middleware — that is the intended behavior |

Run `npm run verify:m16` against the live URL (see §8) to automate checks 4–8.

---

## 7. Backups and Restore Drill

**Railway runbook**

- **Scheduled**: verify the backup/snapshot setting on **your** Railway plan — availability
  and retention differ by plan and can be toggled. Enable it and record the cadence and
  retention; check it again after any plan change.
- **On-demand**: in Railway, from the PostgreSQL service → **Backups** → create a manual
  backup before and after any significant data operation.
- **Restore**: Railway lets you spin the same volume/backup into a new PostgreSQL service;
  point the app at it by swapping `DATABASE_URL` + one redeploy.

**Manual `pg_dump` / `pg_restore` drill** (recommended at least once before going live):

`pg_dump`/`pg_restore` are PostgreSQL **client tools** — either install them locally or run
the same commands through the PostgreSQL Docker image (example below).

```powershell
# PowerShell, with PostgreSQL client tools installed ($env:DATABASE_URL set to production)
$env:BACKUP = "emms-backup.dump"

# Dump
pg_dump $env:DATABASE_URL -Fc -f $env:BACKUP

# Verify the file is non-empty and the dump header parses (lists the table-of-contents)
pg_restore -l $env:BACKUP | Select-Object -First 5

# Restore into a different, EMPTY database (never over the live one):
#   create the new DB first, then:
pg_restore --clean --if-exists -d $env:NEW_DATABASE_URL $env:BACKUP
```

```powershell
# Same drill without installing client tools — via the PostgreSQL 15 image (PowerShell)
docker run --rm -v "${pwd}:/backup" postgres:15-alpine `
  pg_dump $env:DATABASE_URL -Fc -f /backup/emms-backup.dump
docker run --rm -v "${pwd}:/backup" postgres:15-alpine `
  pg_restore -l /backup/emms-backup.dump
```

> [!IMPORTANT]
> A `pg_restore` target must be a **different, empty** database — pointing it at the live
> database overwrites real data.

> [!TIP]
> Redis is **not** backed up by design — it is a disposable cache. If Redis is lost,
> nothing permanent is lost; the dashboard recomputes on the next read.

---

## 8. Building, Testing, and Verifying a Deployment

Everything is reproducible from this repo:

| Gate | Command | Purpose |
|---|---|---|
| Lint | `npm run lint` | ESLint, zero problems |
| Types | `npx tsc --noEmit` | TypeScript check |
| Build | `npm run build` | Next production build |
| Unit + integration | `npm test` | 233 tests against `emms_test` (real PostgreSQL) |
| Runtime (local prod build) | `npm run verify:m16` | Boots `next start`, checks health, auth (24h session), 404 page, root/login/dashboard flow |
| Runtime (live) | `npm run verify:m16` with `VERIFY_BASE_URL` | Same checks against the deployed URL |

### Verifying the live deployment

```bash
VERIFY_BASE_URL=https://emms-xxxx.vercel.app npx tsx scripts/verify-m16-runtime.ts --skip-build
```

The script requires the deployed seed admin credentials (`admin@emms.dev` /
`password123` unless rotated — pass `VERIFY_LIVE_EMAIL` / `VERIFY_LIVE_PASSWORD` if
rotated). It checks: `/api/health`, the auth-aware root redirect, `/login`, anonymous
redirect on `/dashboard`, the friendly 404 page (exercised with a session, since the
middleware sends anonymous users to `/login`), a working admin sign-in, and that the
session cookie expires ≈ **24 hours** from issue (confirming the PRD §16 session lifetime).

---

## 9. Definition of Done (Phase 10)

- [ ] Environment variables configured in production (Vercel: `DATABASE_URL`,
      `REDIS_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`)
- [ ] Migrations run against production (`prisma migrate status` = up to date)
- [ ] HTTPS enabled (Vercel default; verified at the public URL)
- [ ] Backups configured (Railway daily backups on; manual dump drill executed once)
- [ ] The Session 8 production checklist is complete (§6)
- [ ] `npm run verify:m16` passes against the live URL
- [ ] Admin password rotated after any production seed