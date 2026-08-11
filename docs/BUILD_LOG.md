# EMMS Build Log

## Milestone 1 — Project Foundation

### What was created

- Initialized Next.js App Router project with TypeScript and Tailwind CSS.
- Established project folder structure (`src/app`, `src/components/ui`, `src/lib`, `src/server`, `src/hooks`, `src/types`, `src/styles`, `prisma`, `docs`, `public`, `scripts`).
- Created initial landing page to verify application runs successfully.
- Configured `.env.example` with placeholders for future services (Database, Auth, Redis).

### Technologies configured

- Next.js (App Router)
- TypeScript
- Tailwind CSS (v4)
- ESLint and Prettier
- shadcn/ui components (with lucide-react)
- react-hook-form, zod, @hookform/resolvers (forms and validation)
- Prisma (Database ORM preparation)
- NextAuth.js (Auth preparation)

### Important decisions

- Strictly followed Server-First Development and other principles from `ARCHITECTURE.md`.
- No features, business models, or real authentication implemented yet; focused purely on project structure.
- Used default shadcn/ui configuration with New York style and neutral colors (via init).

### Files/folders created

- `src/app/page.tsx` (Application Shell)
- `src/components/ui/` (Ready for shadcn components)
- `.env.example`
- `.prettierrc`
- `components.json` (shadcn config)
- `package.json` (updated with `format` script and all dependencies)

### Problems encountered

- None blocking. Ensured correct initialization of Next.js and shadcn manually before running build verifications.

### Current limitations

- Database is not configured yet.
- No real authentication system.
- Placeholder UI, no functional features exist.

### Next milestone

- The next milestone will likely focus on database configuration and core models (based on the roadmap).

---

## Milestone 2 — Database Foundation

### Database decisions

- Configured Prisma with PostgreSQL as the primary database.
- Implemented `prisma.config.ts` required by Prisma v7+ for database connections since the `url` property is deprecated inside `schema.prisma`.
- Created robust Enums for equipment, priority, and maintenance statuses to enforce data integrity.

### Schema created

The database model perfectly aligns with the EMMS MVP requirements.

### Models added

- **User**: Represents system users with roles (ADMINISTRATOR, SUPERVISOR, TECHNICIAN, OPERATOR, PLANT_MANAGER, RELIABILITY_ENGINEER).
- **Factory**: Represents manufacturing locations.
- **Equipment**: Represents machines and assets within factories.
- **MaintenanceTask**: Represents planned work orders assigned to equipment.
- **MaintenanceRecord**: Represents the history of completed maintenance tasks.
- **PartUsed**: Represents the inventory parts consumed during maintenance operations.

### Relationships

- `Factory` 1:N `Equipment`
- `User` 1:N `MaintenanceTask` (as assigned user)
- `User` 1:N `MaintenanceRecord` (as completing technician)
- `Equipment` 1:N `MaintenanceTask`
- `Equipment` 1:N `MaintenanceRecord`
- `MaintenanceRecord` 1:N `PartUsed`

### Migration details

- Migrations (`npm run db:migrate`) and Studio (`npm run db:studio`) commands mapped in `package.json`.
- Note: Migrations require an active PostgreSQL instance.

### Seed data

- Created `prisma/seed.ts` featuring a fully populated "Main Assembly Plant".
- Injected mock users (Admin, Supervisor, Technician, Operator).
- Configured 3 unique equipment machines spanning multiple statuses.
- Scheduled 3 maintenance tasks and logged 2 historical maintenance records with parts used.
- Added `db:seed` script into `package.json`.

### Problems encountered

- Prisma v7 deprecates the traditional `url = env("DATABASE_URL")` schema datasource property. Resolved by defining `prisma.config.ts`.

### Current limitations

- A live PostgreSQL database URL must be supplied in `.env` before running migration/seed scripts.

---

## Database Environment Setup

### Why Docker was introduced

Docker was introduced to provide a consistent, isolated, and easily reproducible local development environment for database services. This ensures all developers run identical backend services without complex local software installations.

### What services are running

- **PostgreSQL 15** (`emms_postgres`): Primary relational database, source of truth for all business data. Exposed on port `5432`. Data persisted to `emms_pgdata` Docker volume.
- **Redis 7** (`emms_redis`): In-memory data store for future caching and session needs. Exposed on port `6379`. Data persisted to `emms_redisdata` Docker volume.

### How PostgreSQL connects to Prisma

Prisma reads the `DATABASE_URL` from the `.env` file (based on `.env.example`). The URL points to the Docker container:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/emms_dev?schema=public"
```

The `prisma.config.ts` file reads this variable and passes it to Prisma Migrate.

### Migration and seeding commands

| Command              | Description                             |
| -------------------- | --------------------------------------- |
| `npm run db:migrate` | Apply schema migrations to the database |
| `npm run db:seed`    | Populate the database with seed data    |
| `npm run db:studio`  | Open Prisma Studio visual editor        |

### Important development commands

| Command                        | Description                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| `docker compose up -d`         | Start PostgreSQL and Redis in the background                 |
| `docker compose down`          | Stop running containers                                      |
| `docker compose down -v`       | Stop containers and wipe all persistent volumes (full reset) |
| `docker compose ps`            | Check the status of running containers                       |
| `docker compose logs postgres` | View PostgreSQL logs                                         |

---

## Milestone 3 — Authentication & Role-Based Access Control

### What was implemented

- **Login**: A clean EMMS login page with React Hook Form + Zod validation.
- **Logout**: Sign-out button that ends the session and returns to `/login`.
- **Sessions**: Stateless JWT sessions managed by Auth.js / NextAuth v4.
- **Session identity**: The authenticated user's id, name, email, and role are available server-side.
- **Six EMMS roles**: `ADMINISTRATOR`, `SUPERVISOR`, `TECHNICIAN`, `OPERATOR`, `PLANT_MANAGER`, `RELIABILITY_ENGINEER` (no new roles invented).
- **RBAC foundation**: Centralized permission matrix and server-side authorization helpers.
- **Protected routes**: Unauthenticated users are redirected to `/login`; unauthorized authenticated users get an `/unauthorized` response.
- **UI role awareness**: The app header shows the user's name and role and hides the Admin link for non-administrators — the server remains the security boundary.

### Authentication approach

- Auth.js / NextAuth **v4** (already installed, `4.24.15`) with the **Credentials** provider (email + password).
- Passwords verified with **bcryptjs** hashes stored in the `User.password` column (never stored or served in plain text).
- Shared Zod login schema (`src/lib/validations.ts`) used by both the server `authorize` check and the client form, so validation is never duplicated.
- `src/auth.ts` holds the config, the Credentials provider, JWT callbacks, and the session type augmentation (role is available on `session.user`).

### Session approach

- JWT session strategy (`session.strategy = "jwt"`).
- `src/app/api/auth/[...nextauth]/route.ts` exposes the NextAuth route handlers (`GET`, `POST`).
- `getCurrentSession()` reads the session server-side via `getServerSession(authOptions)`; the client never holds the source of truth for authorization.

### Role system

- The six roles already exist as the `Role` enum in `prisma/schema.prisma` — reused as-is.
- `src/lib/permissions.ts` defines the permission matrix (`equipment:create`, `maintenance:schedule`, `reports:view`, `users:manage`, etc.) for all six roles, following the Session 11 permission matrix.

### Authorization approach

- `src/server/rbac.ts` centralizes checks:
  - `requireAuth()` — must be authenticated; redirects to `/login` otherwise.
  - `requireRole(...roles)` — must hold one of the given roles; redirects to `/unauthorized` otherwise.
  - `requirePermission(permission)` — must hold the permission; redirects to `/unauthorized` otherwise.
  - `hasPermission(session, permission)` — pure check for flexible use.
- These helpers are used inside server components **and** are the pattern all future Server Actions / Route Handlers will use. Examples: `src/app/(app)/admin/page.tsx` demonstrates a server-side `requireRole(Role.ADMINISTRATOR)` gate.

### Protected routes

- `src/proxy.ts` (Next.js 16 uses `proxy` in place of the deprecated `middleware`) performs an **optimistic** check: unauthenticated visitors to protected pages are redirected to `/login` with a `callbackUrl`.
- Pages under `src/app/(app)/` (dashboard, admin, unauthorized) enforce the real check server-side via `requireAuth()` / `requireRole()`.
- `src/app/page.tsx` redirects the root based on session.
- `/dashboard` is available to every authenticated role; `/admin` is Administrator-only and redirects others to `/unauthorized`.

### Demo users

- `prisma/seed.ts` now creates **one user per role** (6 total) with bcrypt-hashed passwords and is idempotent (wipes and recreates the seed dataset so re-runs succeed).

> [!IMPORTANT]
> The following credentials are **development/demo credentials only** (all share the same demo password) and are for LOCAL development. They must never be used for real accounts or real environments.

| Role                 | Email                  | Password      |
| -------------------- | ---------------------- | ------------- |
| Administrator        | `admin@emms.dev`       | `password123` |
| Supervisor           | `supervisor@emms.dev`  | `password123` |
| Technician           | `technician@emms.dev`  | `password123` |
| Operator             | `operator@emms.dev`    | `password123` |
| Plant Manager        | `manager@emms.dev`     | `password123` |
| Reliability Engineer | `reliability@emms.dev` | `password123` |

### Environment variables added

- `AUTH_SECRET` — now documented in `.env.example` as required by Auth.js / NextAuth v4 (generate with `openssl rand -base64 32`).
- `NEXTAUTH_URL` — documented as optional/inferred in development, required in production.
- The real `.env` remains gitignored; only `.env.example` is committed.

### Database changes

- **Schema**: comment-only cleanup of the `User.password` field (it now stores a bcrypt hash). No model or relationship changes — the existing EMMS data model remains intact.
- **Seed**: added Plant Manager and Reliability Engineer demo users, switched demo passwords to real bcrypt hashes, and made the seed idempotent.
- **Prisma v7 driver adapter fix**: `src/lib/prisma.ts` was updated to use `@prisma/adapter-pg` (`new PrismaPg({ connectionString: process.env.DATABASE_URL })`). Prisma v7 requires a driver adapter — `new PrismaClient()` without one throws at runtime. `@prisma/adapter-pg` and `pg` were added to `package.json`.

### Validation performed

- `npm run lint` — passes (no warnings).
- `npm run build` — passes (all routes compile; Proxy detected).
- `npx prisma format` + `npx prisma generate` — pass.
- Runtime smoke test with the dev server (no database required): `/` redirects to `/login`; `/login` returns 200; `/dashboard`, `/admin`, `/unauthorized` redirect unauthenticated users to `/login`; `/api/auth/*` responds (providers and session endpoints return 200).
- **Not tested**: database migration, seeding, and full login flow. Docker Desktop is **not running** on this machine, so PostgreSQL is unavailable. These must be validated once Docker/Postgres is up (`npm run db:migrate`, `npm run db:seed`, then sign in with a demo user).

### Known limitations

- **No self-registration**: Users are created via seed data (and, in a later milestone, user management). PRD US-001 (sign-up) is intentionally not part of this milestone's scope.
- Full login flow could not be exercised end-to-end because the database was unavailable.
- `AUTH_SECRET` in the local `.env` still uses the placeholder value — fine for local development, but it must be replaced with a real random secret before any deployment.

### What Milestone 4 will build on

- The Equipment Registry pages will use `requireAuth()` / `requirePermission(...)` for every read and mutation, keeping the server as the security boundary.
- The `requirePermission(PERMISSIONS.equipmentCreate)` gate and the shared Zod validation pattern established here will be reused by equipment Server Actions.
- The `/admin` gate prepares the way for user management (which will use `PERMISSIONS.usersManage`).

---

## Milestone 4 — Application Shell & Navigation

### What was implemented

- **App shell**: The whole authenticated app (`src/app/(app)/`) now renders inside a responsive shell composed of a **sidebar navigation**, a **sticky header**, and a content area (`src/components/app-shell.tsx`).
- **Desktop sidebar** (`src/components/app-sidebar.tsx`): fixed-width brand header + navigation, shown from the `lg` breakpoint up.
- **Mobile navigation** (`src/components/mobile-nav.tsx`): a hamburger trigger in the header (hidden on `lg+`) that opens a slide-in drawer with an overlay, Escape-to-close, and body scroll lock. The drawer closes automatically after navigating.
- **Centralised navigation config** (`src/lib/navigation.ts`): a single source of truth for every sidebar section/item — href, label, description, icon (lucide-react), and the permission that gates it.
- **RBAC-driven menu**: `src/components/app-nav.tsx` (client) filters nav sections by the signed-in user's role using the existing `roleHasPermission()` matrix, so navigation never exposes areas the user cannot access (Admin is hidden from everyone but Administrators; Reports is hidden from Technicians/Operators). The server gates stay the real security boundary.
- **Active route highlighting**: the current page is highlighted in the sidebar/drawer via `usePathname()`.
- **Placeholder pages**: `Dashboard`, `Equipment`, `Maintenance`, `Downtime`, `Reports`, and the refactored `Administration` page. Each is an honest placeholder that names where the module will live and what it will include — no fake CRUD.
- **Reusable building blocks**:
  - `PageHeader` (`src/components/page-header.tsx`) — consistent page titles with optional description and actions.
  - `SectionPlaceholder` (`src/components/section-placeholder.tsx`) — the dashed "planned for later milestones" panel reused across all pages.

### Server-first split (kept)

- The **server** remains the security boundary: every `(app)` page calls `requireAuth()` or the appropriate `requirePermission(...)` before rendering; `/admin` now uses `requirePermission(PERMISSIONS.usersManage)` (Administrator-only) instead of duplicating the role check.
- Server components (`AppShell`, `AppHeader`, `AppSidebar`, page components, header widgets) hold all markup and data.
- Client components are limited to genuinely interactive work: active-link highlighting (`app-nav` via `usePathname`) and the mobile drawer (`mobile-nav`). This matches the "indicators/spinners/navigation live in client components" principle.

### Pages now under the shell

| Route          | Gate                                | Role visibility                                        |
| -------------- | ----------------------------------- | ------------------------------------------------------ |
| `/dashboard`   | `requireAuth()`                     | All authenticated roles                                |
| `/equipment`   | `requirePermission(equipment:view)` | All authenticated roles                                |
| `/maintenance` | `requirePermission(app:view)`       | All authenticated roles                                |
| `/downtime`    | `requirePermission(app:view)`       | All authenticated roles                                |
| `/reports`     | `requirePermission(reports:view)`   | Admin, Supervisor, Plant Manager, Reliability Engineer |
| `/admin`       | `requirePermission(users:manage)`   | Administrator only                                     |

### Validation performed

- `npm run lint` — passes.
- `npx tsc --noEmit` — passes.
- `npm run build` — passes; all routes compile (dashboard, equipment, maintenance, downtime, reports, admin, login, unauthorized, auth API).
- Runtime smoke test with `next start` (no database required): `/login` returns 200; every `(app)` route returns the expected 307 redirect to `/login` for unauthenticated visitors — the shell routes register correctly and do not 404.

### Known limitations

- The fully rendered shell (post-login, with per-role menu filtering) could not be visually smoke-tested because Docker Desktop is not running on this machine, so PostgreSQL is unavailable for an end-to-end login. Must be verified once Docker/Postgres is up (`npm run db:up`, `npm run db:migrate`, `npm run db:seed`, then sign in with a demo user).
- No new dependencies were added — lucide-react (already present) provides all icons.

### Next milestone

- **Equipment Registry (Phase 4)**: register, view, edit, and search equipment, using `requirePermission(equipment:create)` / `equipment:edit` and the shared Zod validation pattern, with all mutations as Server Actions.

---

## Milestone 2 / Database Environment Troubleshooting (Prisma 7 `.env` loading)

Built on the Milestone 2 database setup after Docker Desktop and both containers (`emms_postgres`, `emms_redis`) were confirmed healthy.

### What caused the issue

`npm run db:migrate` failed with:

```
Error: The datasource.url property is required in your Prisma config file when using prisma migrate dev.
```

(plus a secondary Windows `libuv` assertion during the crash: `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src/win/async.c, line 94`).

**Root cause:** Prisma 7 removed the CLI's automatic `.env` loading. When the CLI loads `prisma.config.ts` (via `c12`, with `dotenv: false`), `process.env.DATABASE_URL` was `undefined`, so `datasource.url` was never set — even though `.env` existed and PostgreSQL was running. `prisma validate` still passed because schema validation doesn't resolve the URL; only commands that actually need the database (`migrate`, `db`, etc.) fail. The Windows `uv` assertion was a downstream symptom of the engine child process being torn down during the early failure, not a separate defect.

A second, independent failure surfaced during `npm run db:seed`:

```
Error: PrismaClient was instantiated without any options.
A driver adapter is required to connect to your database.
```

**Root cause:** Prisma 7 requires a driver adapter, but `prisma/seed.ts` still called `new PrismaClient()` with no options (the Milestone 3 adapter fix was applied to `src/lib/prisma.ts` only). The seed also runs via `tsx`, which does not load `.env` automatically.

### What was changed

- `prisma.config.ts` — added `import 'dotenv/config'` at the top so the Prisma CLI loads `.env`, and switched `url` from `process.env.DATABASE_URL` to the type-safe `env('DATABASE_URL')` helper (from `@prisma/config`), which throws a clear error if the variable is missing.
- `prisma/seed.ts` — added `import 'dotenv/config'` (for the standalone `tsx` process) and constructed the client with the `@prisma/adapter-pg` `PrismaPg` driver adapter, mirroring `src/lib/prisma.ts`.
- `package.json` / `package-lock.json` — added `dotenv` (`^17.4.2`) to `devDependencies` (officially recommended for Prisma 7; `dotenv` was already present transitively).

No schema, model, migration, Docker, or application-architecture changes were made.

### How the database connection now works

- The Prisma CLI loads `.env` explicitly via `import 'dotenv/config'` inside `prisma.config.ts`, so `env('DATABASE_URL')` resolves `postgresql://postgres:password@localhost:5432/emms_dev?schema=public`.
- The URL matches `docker-compose.yml`: `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=password`, `POSTGRES_DB=emms_dev`, port `5432`.
- Runtime application code (`src/lib/prisma.ts`) and the seed use the `PrismaPg` driver adapter required by Prisma 7 (Next.js auto-loads `.env`; the seed loads it explicitly via `dotenv/config`).

### Commands used to verify

All pass:

- `npx prisma validate` — schema valid (now also proves `DATABASE_URL` resolves, because `env()` throws if unset).
- `npx prisma generate` — Prisma Client (v7.9.1) generated.
- `npm run db:migrate` — applied migration `20260811122921_init`; database in sync.
- `npm run db:seed` — seeded 6 users, 1 factory, 3 equipment, 3 maintenance tasks, 2 maintenance records, 2 parts used (row counts confirmed via `psql`).
- `npm run lint`, `npx tsc --noEmit`, `npm run build` — pass.

The Windows `uv` assertion did **not** recur on any of the verified commands.

### What could not be verified

- Confirmed with `prisma`/`psql` against the local container only; a fresh-database run (`db:reset`) was not exercised end-to-end in this pass.
