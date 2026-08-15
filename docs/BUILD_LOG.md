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

---

## Milestone 5 — Equipment Management / Equipment Registry

### What was built

The first major EMMS business feature: a fully functional **Equipment Registry**. Equipment is the anchor entity — maintenance scheduling, maintenance records, downtime, dashboards, and reports will all hang off equipment records in later milestones. The milestone delivers the complete flow: list → search/filter → detail → create → edit, with all mutations executed server-side.

### Equipment workflows implemented

- **View list** — server-rendered table at `/equipment` showing name, asset number, factory, criticality, status, and a "View" action.
- **Search** — substring search (case-insensitive) across name, asset number, and location via `?q=`.
- **Filter** — status filter via `?status=` (Operational / Under maintenance / Offline).
- **Pagination** — offset pagination (`?page=`), page size 20, with Previous/Next controls that preserve the active search and filter; results are never loaded unbounded.
- **Empty state** — dedicated panel for "no equipment yet" vs. "no matches for your search".
- **Detail view** — `/equipment/[id]` shows all available asset fields plus four "future milestone" panels (scheduled maintenance, maintenance history, downtime history, equipment performance) so it is clear where maintenance/downtime/reporting features will connect.
- **Create** — `/equipment/new` renders the shared equipment form; on success the action redirects to the new asset's detail page.
- **Edit** — `/equipment/[id]/edit` reuses the same form prefilled; on success it redirects to the detail page.

### Routes/pages created

| Route | Gate | Description |
|---|---|---|
| `/equipment` | `requirePermission(equipment:view)` | List, search, filter, paginated table |
| `/equipment/new` | `requirePermission(equipment:create)` | Create form |
| `/equipment/[id]` | `requirePermission(equipment:view)` | Detail page (404 if asset missing) |
| `/equipment/[id]/edit` | `requirePermission(equipment:edit)` | Edit form (404 if asset missing) |
| `equipment/loading.tsx` | — | Route-segment loading fallback |
| `equipment/error.tsx` | — | Route-segment error boundary |

Supporting components/files:

- `src/server/actions/equipment.ts` — `createEquipment` and `updateEquipment` Server Actions.
- `src/server/equipment.ts` — server-only data access (`listEquipment`, `getEquipmentById`, `listFactories`).
- `src/components/equipment/equipment-form.tsx` — reusable client-side form (react-hook-form + zodResolver), used for both create and edit.
- `src/components/equipment/equipment-status-badge.tsx` — reusable status badge.
- `src/lib/validations.ts` — added `equipmentFormSchema`, `equipmentFilterSchema`, `EQUIPMENT_STATUSES`.

### Server-side authorization

- Pages use the existing centralized gates: `requirePermission(PERMISSIONS.equipmentView | equipmentCreate | equipmentEdit)`.
- **Server Actions authorize too** — `createEquipment` calls `requirePermission(PERMISSIONS.equipmentCreate)` and `updateEquipment` calls `requirePermission(PERMISSIONS.equipmentEdit)` *inside the action*, so a direct action dispatch is just as gated as the UI. Render-time gating alone is never the security boundary.
- No roles are hardcoded in components; UI affordances (Add equipment / Edit buttons) are surfaced with `hasPermission(...)` from the same permission matrix.
- No client-supplied role, user id, or permission is trusted. The authenticated JWT session identifies the user; `factoryId` submitted by the form is re-validated against the database; a stale/nonexistent factory is rejected by the action.

### Validation approach

- A single `equipmentFormSchema` (Zod v4) drives both the client resolver (react-hook-form) and the server actions — validation is never duplicated.
- Server actions always `safeParse` the payload and return a friendly error plus per-field issues if invalid.
- Search/filter inputs are validated with `equipmentFilterSchema` (`q`, `status`, `page`), with resilient coercion/fallbacks so a bad value never wipes out a valid search.
- Duplicate asset numbers are rejected server-side: a pre-insert look-up plus the Prisma `P2002` unique-constraint guard return "An asset with this number already exists."
- Empty optional description/criticality are normalized to `null` on write.

### Database interactions

- **No schema change** — reuses the existing `Equipment` and `Factory` models and relationships exactly as locked in. PostgreSQL remains the source of truth via Prisma.
- All queries go through Prisma (`src/server/equipment.ts`); all writes go through the Server Actions.
- Created/updated timestamps come from the existing `createdAt`/`updatedAt` columns (Prisma-managed).
- Pagination uses `take`/`skip` with a matching `count`.

### Seed changes

- Added one realistic `OFFLINE` asset (Hydraulic Press, `HPR-004`) so all three status values are represented during development and the status filter is meaningful. The seed remains idempotent and the demo users/tasks/records are untouched. (Seed now creates 4 equipment items.)

### Testing performed

Automated checks (all pass):

- `npm run lint` — passes, no warnings.
- `npx tsc --noEmit` — passes.
- `npm run build` — passes; all equipment routes compile (`/equipment`, `/equipment/new`, `/equipment/[id]`, `/equipment/[id]/edit`).

Runtime verification against the running PostgreSQL container (production build via `next start`, sign-in through the real Auth.js credentials flow):

- Unauthenticated `/equipment` → 307 redirect to `/login`.
- Logged-in roles can view the list and detail pages (`200`).
- Search works: `?q=hydraulic` returns only the Hydraulic Press; `?status=OFFLINE` filters correctly.
- Create, duplicate rejection, and validation were exercised by dispatching the real Server Actions (the build exposes server-action IDs; posted the serialized arguments directly):
  - Admin create persists in PostgreSQL (row verified via `psql`).
  - Duplicate asset number on create and on update → rejected with the friendly message.
  - Invalid payload (missing name, empty factory) → rejected server-side with field errors.
  - Update persists changed name/status/description/location (verified via `psql`).
  - Updating a nonexistent id → friendly "no longer exists" error.
  - Technician dispatching `createEquipment` directly → rejected; **no row written** (verified via `psql`).
- UI role-awareness: Administrator and Supervisor see "Add equipment" / "Edit"; Technician, Operator, and Plant Manager do not. The server actions are the real boundary regardless.
- Seed re-run succeeds (4 equipment items) and is idempotent.

### Known limitations

- **Streaming redirect nuance**: equipment routes sit under `equipment/loading.tsx` (a Suspense boundary). In a streaming context Next.js emits `redirect()` as a meta-refresh (HTTP 200 + `<meta http-equiv="refresh">` to the target) instead of a 307 when an authenticated user is unauthorized; the same request path without the boundary returns a 307. The authorization itself is enforced — the protected content is never rendered (verified: unauthorized responses leak no form/data). This is Next.js's documented streaming-redirect behavior, not a workaround.
- **No delete**: the PRD lists equipment deletion (FR-012) with a note to preserve maintenance history, but `equipment:delete` is not part of the locked permission matrix, so delete is intentionally not implemented. It should be added to the permission matrix first, then built (Milestone 5 scope was register/view/edit/search).
- JavaScript-unavailable form submissions were not exercised; the form relies on the react-hook-form client path (the same boundary as the existing login form).
- no activity/audit logging yet (out of scope for this milestone).

### Next milestone

- **Maintenance Management (Milestone 6)**: schedule and complete maintenance tasks against registered equipment, including maintenance completion that writes `MaintenanceRecord` history, and wire the equipment detail page's scheduled-maintenance / history panels to real data.

---

## Milestone 6 — Maintenance Scheduling

### What was built

The complete **scheduling side** of the maintenance workflow. Maintenance tasks can now be listed, searched, filtered, paginated, viewed in detail, scheduled (create), and updated (edit) against registered equipment — reusing the same server-first pattern as the equipment registry. The completion side (performing a task and writing maintenance history) is intentionally deferred to the next milestone, as the detail page's "Completion and history" panel makes clear.

The milestone delivers the full flow: list → search/filter → pagination → detail → create → edit, with all mutations executed server-side and authorized inside the Server Actions themselves.

### Maintenance workflows implemented

- **View list** — server-rendered page at `/maintenance` showing title, equipment, assignee, scheduled date, priority, and status, with a "View" action.
- **Search** — substring search (case-insensitive) across task title, description, and equipment name via `?q=`.
- **Filter** — status filter via `?status=` (Scheduled / In progress / Completed / Cancelled) and priority filter via `?priority=` (Low / Medium / High / Critical).
- **Pagination** — offset pagination (`?page=`), page size 20, with Previous/Next controls that preserve the active search and filters; results are never loaded unbounded.
- **Empty state** — dedicated panel for "no maintenance tasks yet" vs. "no maintenance tasks match your search".
- **Sorting** — tasks are ordered by scheduled date (soonest first), then creation time.
- **Detail view** — `/maintenance/[id]` shows equipment (linked to the registry), assignee, scheduled date, status, priority, location, created/updated timestamps, and description, plus a "Completion and history" placeholder pointing at the next milestone.
- **Create** — `/maintenance/new` renders the shared maintenance form; on success the action redirects to the new task's detail page.
- **Edit** — `/maintenance/[id]/edit` reuses the same form prefilled; on success it redirects to the detail page. Editing a task preserves its current status (only scheduling details change).

### Routes/pages created

| Route | Gate | Description |
|---|---|---|
| `/maintenance` | `requirePermission(maintenance:view)` | List, search, filter, paginated tasks |
| `/maintenance/new` | `requirePermission(maintenance:schedule)` | Create form |
| `/maintenance/[id]` | `requirePermission(maintenance:view)` | Detail page (404 if task missing) |
| `/maintenance/[id]/edit` | `requirePermission(maintenance:schedule)` | Edit form (404 if task missing) |
| `maintenance/loading.tsx` | — | Route-segment loading fallback |
| `maintenance/error.tsx` | — | Route-segment error boundary |

Supporting components/files:

- `src/server/actions/maintenance.ts` — `createMaintenanceTask` and `updateMaintenanceTask` Server Actions.
- `src/server/maintenance.ts` — server-only data access (`listMaintenanceTasks`, `getMaintenanceTaskById`, `listEquipmentsForSelect`, `listAssignableUsers`, `userCanBeAssigned`).
- `src/components/maintenance/maintenance-form.tsx` — reusable client-side form (react-hook-form + zodResolver), used for both create and edit.
- `src/components/maintenance/maintenance-status-badge.tsx` — reusable status badge.
- `src/components/maintenance/maintenance-priority-badge.tsx` — reusable priority badge.
- `src/lib/validations.ts` — added `maintenanceTaskFormSchema`, `maintenanceFilterSchema`, `MAINTENANCE_STATUSES`, `PRIORITIES`.

### Permission / RBAC changes

- Added the `maintenance:view` permission to the locked matrix and granted it to `ADMINISTRATOR`, `SUPERVISOR`, and `TECHNICIAN`. Operators and Plant Managers do **not** get it, so the "Maintenance" nav entry and the list/detail pages are hidden from them.
- The side-nav "Maintenance" entry now gates on `maintenance:view` instead of the blanket `app:view`, so the link only appears for maintenance-capable roles.
- `maintenance:schedule` (create/edit) is held by `ADMINISTRATOR` and `SUPERVISOR`; `maintenance:complete` (used as the "who can be assigned" boundary) is held by `ADMINISTRATOR`, `SUPERVISOR`, and `TECHNICIAN`.

### Server-side authorization & assignment rules

- Pages use the existing centralized gates (`requirePermission`) plus `hasPermission(...)` to surface Edit/Schedule affordances only to capable roles.
- **Server Actions authorize too** — `createMaintenanceTask` and `updateMaintenanceTask` call `requirePermission(PERMISSIONS.maintenanceSchedule)` *inside the action*, so a direct action dispatch is just as gated as the UI. Render-time gating alone is never the security boundary.
- **Assignment rule** — a task can only be assigned to a user capable of completing maintenance (`maintenance:complete`): `userCanBeAssigned` performs the check and rejects operators, plant managers, and nonexistent users in the action. The assignee dropdown is filtered to the same set.
- No client-supplied role or user id is trusted; the authenticated session identifies the user, and submitted `equipmentId` is re-validated against the database (stale/nonexistent equipment is rejected).

### Validation approach

- A single `maintenanceTaskFormSchema` (Zod v4) drives both the client resolver (react-hook-form) and the server actions — validation is never duplicated.
- Server actions always `safeParse` the payload and return a friendly error plus per-field issues if invalid.
- Search/filter inputs are validated with `maintenanceFilterSchema` (`q`, `status`, `priority`, `page`), with resilient coercion/fallbacks so a bad value never wipes out a valid search.
- The scheduled date is checked as a real parseable datetime; empty optional description is normalized to `null` on write.

### Database interactions

- **No schema change** — reuses the existing `MaintenanceTask` model and its `Equipment` / `User` (assignee) relationships exactly as locked in Milestone 2. PostgreSQL remains the source of truth via Prisma.
- All queries go through Prisma (`src/server/maintenance.ts`); all writes go through the Server Actions.
- Created/updated timestamps come from the existing `createdAt`/`updatedAt` columns (Prisma-managed).
- Pagination uses `take`/`skip` with a matching `count`.

### Testing performed

Automated checks (all pass):

- `npm run lint` — passes, no warnings.
- `npx tsc --noEmit` — passes.
- `npm run build` — passes; all maintenance routes compile (`/maintenance`, `/maintenance/new`, `/maintenance/[id]`, `/maintenance/[id]/edit`).

Runtime verification against the running PostgreSQL container (production build via `next start`, sign-in through the real Auth.js credentials flow). **40/40 checks passed**, including:

- Unauthenticated `/maintenance` → 307 redirect to `/login`.
- Admin and technician can view list + detail (`200`); operator and plant manager are redirected (`/unauthorized`) with **no task data leaked** (verified by searching the response body).
- Search (`?q=`) finds matches and shows the empty state when nothing matches without leaking other tasks; status and priority filters return only matching rows; `?page=2` renders.
- Detail page renders equipment, assignee, scheduled date, status, priority, and location; bogus id returns 404.
- Create/update were exercised by dispatching the real Server Actions (the build exposes server-action IDs; posted the serialized arguments directly):
  - Admin create persists in PostgreSQL (row verified via `psql`), sets status `SCHEDULED`, and the action redirects to the new task.
  - Admin update persists changed title/priority/description/date and preserves status (verified via `psql`).
  - Invalid payloads (empty title, invalid date, missing equipment, missing assignee) → rejected server-side with the friendly field message; **no row written**.
  - Stale/nonexistent equipment → "no longer exists" error; **no row written**.
  - Assignment rule: operator, plant manager, and nonexistent user are all rejected as assignees; **no row written**.
  - Technician dispatching `createMaintenanceTask` directly → rejected; **no row written**. Same for technician dispatching `updateMaintenanceTask` → rejected, task unchanged.
  - Supervisor dispatches `createMaintenanceTask` (role allowed) → row written as `SCHEDULED` (verified via `psql`).
- Page gates: admin/supervisor see the create/edit forms (`name="equipmentId"` present); technician's request for `/maintenance/new` and `/maintenance/[id]/edit` is gated with **no form leaked**.
- All test artifacts (tasks created during verification) were deleted from the database afterward; only the 3 seeded tasks remain.

### Known limitations

- **Streaming redirect nuance**: maintenance routes sit under `maintenance/loading.tsx` (a Suspense boundary). In a streaming context Next.js emits `redirect()` as a meta-refresh (HTTP 200 + `<meta http-equiv="refresh">` to the target) instead of a 307 when an authenticated user is unauthorized. The authorization itself is enforced — the protected content is never rendered (verified: unauthorized responses leak no form/data, same as Milestone 5).
- JavaScript-unavailable form submissions were not exercised; the forms rely on the react-hook-form client path (the same boundary as the login and equipment forms).
- No activity/audit logging yet (out of scope for this milestone).

## Milestone 7 — Maintenance Execution & Completion

**Goal**: let a maintenance-capable technician carry a scheduled task through execution — start the work, record what was done / notes / parts used, and complete it — so that completion atomically writes a `MaintenanceRecord` (with its `PartUsed` rows) linked to the task and flips the task to `COMPLETED`.

### Schema

- Added the missing link between maintenance records and tasks:
  - `MaintenanceRecord.taskId String? @unique` + back-relation `task MaintenanceTask? @relation(fields: [taskId], references: [id])`.
  - `MaintenanceTask.maintenanceRecord MaintenanceRecord?`.
  - The column is **nullable** so the 2 seed records (created before task linking) remain valid, and **unique** so a record can never be attached to the same task twice — only a *succeeded* completion inserts a row, which makes this constraint the database-level guarantee of "no double completion."
- Migration `20260813120000_add_maintenance_record_task_link` created manually with `prisma migrate diff --from-config-datasource --to-schema` (interactive `migrate dev` is unusable in this non-interactive shell) and applied with `prisma migrate deploy`. A manual build step was needed because the generated file must be BOM-free (a BOM breaks the migration reader / psql). `taskId` column confirmed via `information_schema`.

### Validation (`src/lib/validations.ts`)

- `maintenancePartSchema`: `name` trimmed, 1–120 chars; `quantity` an integer 1–100 000 (any string maps to `NaN` and fails).
- `maintenanceCompletionSchema`: `description` trimmed 1–2000; `notes` optional, ≤2000 (empty→null); `parts` array ≤50 of `maintenancePartSchema`.
- Type `MaintenanceCompletionValues`. Note the deliberate choice of `z.number()` over `z.coerce.number()`: coercing on the schema breaks the react-hook-form resolver typings (input is `unknown`), so the form coerces in the field (`setValueAs`) instead.

### Server actions (`src/server/actions/maintenance.ts`)

- **`startMaintenanceTask(id)`** — leaves `SCHEDULED`, sets `IN_PROGRESS`:
  - Requires `maintenanceComplete` permission.
  - Lifecycle: rejects with `already been completed and cannot be restarted` (COMPLETED), `already in progress` (IN_PROGRESS), `cancelled and cannot be started` (CANCELLED).
  - Assignee rule: `Only the technician assigned to this task can start the work.`
  - Returns `{ ok: true }` (no redirect — the page re-renders in place).
- **`completeMaintenanceTask(id, values)`** — the terminal transition:
  - Requires `maintenanceComplete` and re-validates the payload server-side with `maintenanceCompletionSchema`.
  - Lifecycle: rejects `already been completed` (COMPLETED), `cancelled` (CANCELLED), and for SCHEDULED: `Start the task before recording its completion. Tasks move from scheduled to in progress to completed.` (status guard runs before the assignee guard).
  - Assignee rule: `Only the technician assigned to this task can record its completion.`
  - Wrapped in `prisma.$transaction`: creates the `MaintenanceRecord` (`taskId`, `equipmentId`, `technicianId` **from the session**, `description`, `notes`, `completedDate`) with nested `partsUsed`, then updates the task to `COMPLETED`. The technician identity is never read from the client payload — impersonation is impossible by construction.
  - Returns `{ ok: true }`.
- **`updateMaintenanceTask`** guard extended: editing a `COMPLETED` or `CANCELLED` task is now rejected (`This task is no longer schedulable and cannot be edited...`) so history can't be rewritten.

### UI

- `src/components/maintenance/maintenance-start-button.tsx` — client component; dispatches `startMaintenanceTask`, then `router.refresh()`.
- `src/components/maintenance/maintenance-complete-form.tsx` — client component; react-hook-form + zodResolver + `useFieldArray` for parts (add/remove), dispatches `completeMaintenanceTask`, `router.refresh()` on success, field-level errors under each input.
- `src/app/(app)/maintenance/[id]/page.tsx` — execution panels gated by `canExecute` (maintenanceComplete permission) **and** `isAssignee`:
  - `SCHEDULED` → "Execute maintenance" panel with the start button.
  - `IN_PROGRESS` → "Complete maintenance" panel with the completion form.
  - Record exists (`maintenanceRecord`) → "Completed maintenance record" panel showing technician, completed-on date, work performed, notes, and the parts list.
  - `CANCELLED` → "This task was cancelled" placeholder.
  - Edit button and the edit route stay restricted to `SCHEDULED`/`IN_PROGRESS`.
- `src/server/maintenance.ts` — `getMaintenanceTaskById` now includes the task's record with its technician (id/name/email/role) and parts.

### Verification

`npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass (16 routes). Runtime suite ran against the production build (`next start`) using real Server-Action IDs extracted from `server-reference-manifest.js` and real Auth.js cookies. **24/24 assertions passed**, including:

- Technician opens an assigned scheduled task (200) and starts it → status flips to `IN_PROGRESS` (row verified via `psql`).
- Completion with parts (description + 2 parts) → `MaintenanceRecord` created and linked via `taskId` to the task, `technicianId` = session user, parts rows written; task becomes `COMPLETED`.
- Completion without parts works; record written with `partsUsed` empty.
- **Other-tenant completion rejected**: with the supervisor's (unassigned-to-tech) task moved to IN_PROGRESS, the technician's completion is rejected with `Only the technician assigned to this task can record its completion.`; no record written, status untouched. (On a SCHEDULED unassigned task the status guard fires first — also rejected, no row.)
- Operator (no `maintenanceComplete`) is rejected for both start and complete; no data written.
- Invalid payloads (empty description, missing description, zero/negative/non-numeric quantity) rejected server-side; task stays IN_PROGRESS; no row written.
- Double completion rejected — exactly one record, task stays COMPLETED.
- A COMPLETED task cannot be restarted.
- Transaction atomicity: no COMPLETED task lacks a record, no orphaned record, no task has multiple records.
- Editing a COMPLETED task rejected; title unchanged.
- All M7 test tasks, records, and parts were deleted afterward; only the 3 seeded tasks / 2 seed records remain.

### Known limitations

- **No re-open path**: a completed task cannot be reopened/uncompleted; a new maintenance task is the way to capture follow-up work.
- The supervisor's execution of *their own* task set by me for the assignee-guard probe was triaged as part of cleanup — no seed data was touched.
- Start/completion relied on the react-hook-form client path (same JavaScript boundary as earlier milestones); no-JS submissions not exercised.

### Next milestone

- **Activity/audit log (Milestone 8)**: record who did what (created/started/completed/edited) against tasks, records, equipment, and users as a `MaintenanceAuditLog`-style table; consider wiring the equipment detail page's history panel to the now-populated `MaintenanceRecord` data.

---

## Milestone 8 — Maintenance History

**Goal**: surface the completed-maintenance history that Milestones 6/7 began populating — a read-only, searchable, filterable, paginated **global history** list, a **record detail** page, and an **equipment-scoped history** page, all protected by the existing `maintenanceView` permission. No new CRUD, no schema redesign: history rows are the `MaintenanceRecord` rows only ever written by a successful task completion.

### Schema / indexes

- No new models or fields. Added two cover indexes to make the common history queries (newest-first ordering, equipment-scoped listing) efficient:
  - `@@index([completedDate])`
  - `@@index([equipmentId, completedDate])`
- Migration `20260814120000_add_maintenance_history_indexes` created manually with `prisma migrate diff --from-config-datasource --to-schema`, made BOM-free (required by the migration reader / psql), applied with `prisma migrate deploy`, and `prisma generate` re-ran. Both indexes verified in `pg_indexes`.

### Data access (`src/server/maintenance.ts`)

- `MAINTENANCE_HISTORY_PAGE_SIZE = 20`.
- **`listMaintenanceHistory(filter)`** — the single query behind both history pages:
  - Optional `q` (OR across record `description`/`notes`, `equipment.name`/`equipment.assetNumber`, `technician.name`, `task.title`/`task.description`, case-insensitive contains).
  - Optional `equipmentId`, `technicianId`, and a `from`/`to` date range (`gte` start, `lte` end-of-day `23:59:59.999`).
  - Sorted `completedDate` desc, then `createdAt` desc (stable newest-first).
  - Paginated via `skip`/`take`; includes `equipment` (id/name/assetNumber), `technician` (id/name/email/role), `task` (id/title/priority/status/scheduledDate), and `_count.partsUsed`.
  - Returns `{ records, total, page, totalPages }`.
- **`getMaintenanceRecordById(id)`** — includes equipment + factory, technician, task (title/description/priority/status/scheduledDate), and `partsUsed` ordered by name. Returns `null` for unknown ids.
- **`getEquipmentMaintenanceHistory(equipmentId, page, q)`** — thin wrapper over `listMaintenanceHistory` for the equipment-scoped page (also returns the total for the equipment detail card).

### Validation (`src/lib/validations.ts`)

- **`maintenanceHistoryFilterSchema`** (+ type `MaintenanceHistoryFilterValues`): `q` trimmed, max 200, empty → `undefined`, any error → `undefined`; optional `equipmentId`/`technicianId` (trimmed, empty → `undefined`); optional `from`/`to` dates (produced by browser date inputs, so no strict validation beyond catch → `undefined`); `page` coerced integer, min 1, any error → 1. All filters stay entirely optional.

### UI / routes

- **`/maintenance/history`** (`src/app/(app)/maintenance/history/page.tsx`) — global history:
  - `requirePermission(PERMISSIONS.maintenanceView)` at the top; unauthorized/external users are redirected by the shell.
  - PageHeader shows the live total count.
  - GET filter form: free-text search, equipment dropdown (all + `name · assetNumber`), technician dropdown (all + `name · email`), `from`/`to` date inputs, Search + Clear. Query params round-trip through the pagination links and form so filters persist on page 2+.
  - Table: Completed (localized date), Equipment (name + asset tag), Task (title or "Standalone record" when the batch seed record has no linked task), Technician, **Work performed** (line-clamped description), Priority badge, Parts count, View link.
  - Pagination (Previous/Next, "Showing x–y of N") with page links built from the current search params; last page clamp.
  - Empty states: "No completed maintenance yet" vs "No completed maintenance records match your search".
- **`/maintenance/history/[id]`** (`src/app/(app)/maintenance/history/[id]/page.tsx`) — read-only record detail:
  - `getMaintenanceRecordById`; `notFound()` for unknown/invalid ids (renders the 404 boundary).
  - Card: Record (work performed, notes, completed-on, created-on), Equipment (name, asset tag, factory, View link), Task (title/priority/status/scheduled date, or "Standalone record"), Parts used (name + quantity, or "No parts recorded").
  - Back to history link. No edit/delete UI, no form, no server actions.
- **`/equipment/[id]/history`** (`src/app/(app)/equipment/[id]/history/page.tsx`) — equipment-scoped history:
  - `requirePermission(PERMISSIONS.maintenanceView)` (not `equipmentView`, so viewers of equipment still need maintenance rights to see history).
  - Equipment header card + search box + pagination; history table identical in spirit to the global one, scoped to the equipment.
  - Empty state: "No maintenance history exists for this equipment yet."
- **Equipment detail page** (`src/app/(app)/equipment/[id]/page.tsx`):
  - New "Maintenance history" outline button in the header actions (visible to `maintenanceView` holders) linking to `history`.
  - Replaced one SectionPlaceholder with a **real history card**: total record count (from `getEquipmentMaintenanceHistory(id, 1)`) + View history link + FileClock icon; shows "No maintenance history yet" when zero.
- **Maintenance page** (`src/app/(app)/maintenance/page.tsx`): added a "History" outline button in the header actions before "Schedule maintenance".

### Design decisions & mechanics

- **Newest-first always**: completed-date desc with insertion-order tiebreak matches the "history = what happened" mental model.
- **RSC numbers are stream tokens**: with `next start`, list/detail HTML renders counts through React Flight; raw curl output splits numbers into tokens (`\" of \",22`, `[\"Qty \",2]`). Runtime assertions therefore match the stream-escaped forms (e.g. `of \\",22`) rather than naive "of 22".
- **Streaming 404**: a missing record id returns the not-found boundary page (body contains "This page could not be found") while HTTP stays 200 because of streaming; tests assert on body content.
- **No new server actions** were added — history is read-only by construction; the only write paths in the codebase remain Milestone 6/7's task/equipment/record actions.
- **`PartUsed.name`** (not `partName`) is the actual schema column used in queries and detail rendering.

### Verification

`npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass (19 routes, including the three new history routes). Runtime suite (`m8-test.ps1`) ran against the production build (`next start`, PID note: server restarted after the rebuild) with real Auth.js cookie jars for admin/technician/supervisor/operator. **44/44 assertions passed**, including:

- Global history loads with both seed records visible; `Monthly Calibration` (SCHEDULED) and `Replace Conveyor Motor` (IN_PROGRESS) are **not** shown.
- Record detail shows work performed, technician, equipment + asset tag, both parts with quantities (`Qty 2`); unknown record id renders the 404 boundary.
- Equipment-scoped history lists the CNC records; Hydraulic Press shows the "No maintenance history exists for this equipment yet" empty state.
- Equipment detail links to history and shows the live count card.
- Search `pump`/`coolant`/`robot`/`Technician` returns the right rows; `zzznomatch` shows the search empty state.
- Equipment and technician dropdown filters narrow correctly.
- `from`/`to` date range within the records' completion window matches; a future-only `from` yields zero rows.
- Pagination: inserted 22 probe records (`m8pg…`) → page 1 shows the newest probe, page 2 the oldest, "of 22" count, correct Next link, no Prev on page 1 → probes deleted afterward (DB returned to exactly 3 rows, 0 probes).
- Operator is blocked from both history routes (no `maintenanceView`); anon is redirected to login; supervisor is allowed.
- No edit/delete controls or forms on the record detail; refresh returns a consistent live count.
- DB verification via `psql`: every record points to the correct equipment/technician, `PartUsed` rows belong to the right record (Coolant Pump×1 + Seal Kit×2 → coolant record; Hydraulic Seal×1 → robot record).

### Known limitations

- **Only completed work is visible**: history is `MaintenanceRecord`-backed, and records exist only after a task is completed (by design). Scheduled/in-progress work lives on the maintenance task list.
- The M7 manual demo record (`cmss4muui0009dkv37cn0t5z7`, linked to the seeded COMPLETED "Robot Arm Lubrication" task) is retained as realistic history data.
- Streaming-related HTTP 200 on 404s is a Next.js behavior, not a logic gap.

### Next milestone

- **Activity/audit log (Milestone 9)**: record who did what (created/started/completed/edited) against tasks, records, equipment, and users as a `MaintenanceAuditLog`-style table.

---

## Milestone 9 — Downtime Tracking

**Goal**: record, view, search, filter, paginate, and inspect equipment downtime events — plus an open→resolved lifecycle so ongoing events can be recorded and later closed with an end time. Global `/downtime` list, `/downtime/new` record form, read-only `/downtime/[id]` detail, and an equipment-scoped `/equipment/[id]/downtime` history. No dashboards/MTTR/MTBF/analytics (per roadmap, those depend on accrued data). Two separate write permissions: **`downtimeRecord`** (report) and **`downtimeResolve`** (resolve) — aligning with the roadmap Phase 6 expected outcome *"Operators can report downtime and technicians can resolve it"*; view rides on the existing `appView`/nav entry.

### Schema / enums

- **`DowntimeStatus`** = `OPEN | RESOLVED`.
- **`DowntimeReason`** = the eight standardized categories from the learning handbook (Session 2's reason-code list): `MECHANICAL | ELECTRICAL | HYDRAULIC | PNEUMATIC | MATERIAL | OPERATOR_ERROR | QUALITY | CHANGEOVER`.
- **`DowntimeEvent`** model:
  - `id`, `equipmentId` (FK), `reportedById` (FK → User), `startedAt`, `endedAt?` (nullable — active downtime is a documented lifecycle state, not an omission), `status @default("OPEN")`, `reason`, `notes?`, `createdAt`, `updatedAt`.
  - Cover indexes `@@index([equipmentId, startedAt])` and `@@index([startedAt])` for the ordering/equipment-filter queries.
- `User.reportedDowntime` and `Equipment.downtimeEvents` back-relations added.
- Migration `20260815000000_add_downtime_event` created manually via `prisma migrate diff`, made BOM-free, applied with `prisma migrate deploy`, `prisma generate` re-ran. Verified in `psql`: columns, both indexes, and the enum labels.

### Data access (`src/server/downtime.ts`)

- `DOWNTIME_PAGE_SIZE = 20`.
- **`listDowntimeEvents(filter)`** — the single query behind the global and equipment-scoped pages:
  - Optional `q` (OR across `equipment.name`/`equipment.assetNumber`, `reportedBy.name`, `notes`, case-insensitive contains).
  - Optional `equipmentId`, `status`, and `from`/`to` range on `startedAt` (`to` clamped to end-of-day `23:59:59.999`).
  - Sorted `startedAt` desc → `createdAt` desc (stable newest-first).
  - Includes `equipment` (id/name/assetNumber) and `reportedBy` (id/name/email/role); returns `{ items, total, page, pageSize, totalPages }`.
- **`getDowntimeEventById(id)`** — detail include: equipment (id/name/assetNumber/location/status/factory) and reporter (id/name/email/role); `null` for unknown ids.
- **`getEquipmentDowntimeHistory(equipmentId, page, q)`** — wrapper over `listDowntimeEvents` (also returns the total used by the equipment detail card).
- **`downtimeDurationMinutes(event)`** — computed, never stored: `Math.max(0, Math.round((endedAt − startedAt) / 60000))`; `null` while OPEN. **`formatDowntimeDuration`** renders it as `"1h 35m"` / `"45m"` / `"Ongoing"` consistently (no stored duration by design).

### Validation (`src/lib/validations.ts`)

- **`downtimeEventFormSchema`**: `equipmentId` required; `startedAt` required valid datetime; **`endedAt` is a required string** that must be empty OR a valid datetime — the empty-string opt-in is what records ongoing downtime (this plain-string shape is what keeps the zodResolver/react-hook-form typing happy); `reason` enum; `notes` trimmed ≤2000.
- **`downtimeEventResolveSchema`**: `endedAt` required valid datetime (resolving always requires an end time).
- **`downtimeFilterSchema`**: `q` trimmed ≤200 (catch → ''); optional `equipmentId`/`status`/`from`/`to` (empty → undefined, catch → undefined); `page` coerced int min 1 catch 1.

### Server actions (`src/server/actions/downtime.ts`)

- **`recordDowntimeEvent(values)`** — requires `PERMISSIONS.downtimeRecord`:
  - Server-side re-validation; field errors mapped back to the form.
  - Rejects `endedAt ≤ startedAt` ("End date/time must be after the start date/time.").
  - Verifies the selected equipment still exists (rejects with a reload hint otherwise).
  - Creates the event with **`reportedById` taken from the session user** (never the client); `status` derived: `RESOLVED` when an end time was supplied, otherwise `OPEN`; `notes` trimmed → null.
  - Revalidates `/downtime` + `/equipment`, then `redirect()`s to `/downtime/{id}`.
- **`resolveDowntimeEvent(id, values)`** — requires **`PERMISSIONS.downtimeResolve`** (separate from recording):
  - Rejects unknown events ("no longer exists"), already-resolved events ("has already been resolved"), and `endedAt ≤ startedAt`; otherwise sets `endedAt` + `status: RESOLVED`, revalidates (incl. the detail path), returns `{ ok: true }`.

### UI / routes

- **`/downtime`** (`src/app/(app)/downtime/page.tsx`) — replaces the placeholder:
  - `requirePermission(PERMISSIONS.appView)`; "Record downtime" button shown only to `downtimeRecord` holders.
  - GET filter form: search box, equipment dropdown (`name · assetNumber`), status dropdown, `from`/`to` dates, Search + Clear; query params round-trip through pagination links.
  - Amber strip when open events exist ("N open events are currently ongoing…").
  - Table: Started, Equipment (link + asset tag), Reason badge, Duration, Reported by, Status badge, Ended, View.
  - Pagination (Previous/Next, "Showing x–y of N"), last-page clamp; empty states for "no events recorded yet" vs "…match your filters".
- **`/downtime/new`** (`src/app/(app)/downtime/new/page.tsx`) — `requirePermission(PERMISSIONS.downtimeRecord)`; `DowntimeForm` client component (react-hook-form + zodResolver, datetime-local start/end with "leave empty for ongoing downtime" hint, reason select with friendly labels, notes, action-error banner).
- **`/downtime/[id]`** (`src/app/(app)/downtime/[id]/page.tsx`) — read-only detail; `notFound()` for unknown ids:
  - Status/duration (with minute count for long events)/started/ended/reason/event-id fields, notes, Equipment card (link back), Reporter card.
  - For `OPEN` events + **`downtimeResolve`** holders: a "Resolve this event" panel with `DowntimeResolveForm` (endedAt → `router.refresh()` on success). No edit/delete controls.
- **`/equipment/[id]/downtime`** (`src/app/(app)/equipment/[id]/downtime/page.tsx`) — equipment-scoped downtime (search box + pagination; same table, plus equipment name in the header; empty state "No downtime events recorded for this equipment yet").
- **Equipment detail** (`src/app/(app)/equipment/[id]/page.tsx`): replaced the Downtime SectionPlaceholder with a real amber card — live event count (from `getEquipmentDowntimeHistory(id, 1)`) + link to `/downtime`.
- **Badge components**: `downtime-status-badge` (amber OPEN / emerald RESOLVED) and `downtime-reason-badge` (per-reason color + friendly label).
- **Seed** (`prisma/seed.ts`): wiped before re-seed (new table added to the deleteMany cascade) and 3 events added against seeded equipment/reporter: HPR-004 hyraulic-pressure loss (RESOLVED, 95 min), CNC-001 quality halt (RESOLVED, 35 min), HPR-004 ongoing hydraulic (OPEN — matches its `OFFLINE` status).

### Design decisions & mechanics

- **Status is authoritative, `endedAt` drives it**: `OPEN`+null end / `RESOLVED`+set end, and the seed sets `status` explicitly (the default alone would leave ended events `OPEN`).
- **Duration is computed, never stored** — avoids a denormalized field that could drift from (start, end); formatting is shared via `formatDowntimeDuration`.
- **Search corpus** covers equipment name/asset tag, reporter name, and notes (list rows don't render notes, so search-by-notes is verified by result counts, not text matching).
- **RBAC is split by role**: `downtimeRecord` (report) → OPERATOR + ADMINISTRATOR; `downtimeResolve` (resolve) → TECHNICIAN + ADMINISTRATOR. Matching the roadmap Phase 6 flow, *operators report downtime and technicians/engineers resolve it*; a role without `downtimeResolve` is rejected server-side even when dispatching the resolve action directly. No other role (SUPERVISOR, PLANT_MANAGER, RELIABILITY_ENGINEER) carries either downtime write permission.
- The empty-`endedAt` string is the client contract for "ongoing" (avoids optional-field typing friction in react-hook-form); the action converts '' → null before creation.

### Verification

`npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass (20 routes, including the four new downtime routes). Runtime suite (`m9-test.ps1`) ran against the production build (`next start`) with real Auth.js cookie jars (admin/operator/technician) and real Server-Action IDs from `server-reference-manifest.json`. **All assertions passed**, including:

- List loads with the 3 seed events, count 3, open banner present, "1h 35m" duration, Open/Resolved badges, reporter shown.
- Equipment filter (HPR → 2) and status filter (RESOLVED → 2, banner suppressed when filtered).
- Search by notes (`out-of-tolerance` → 1), asset tag (`CNC-001` → 1), reporter name (`operator` → 3); no-match shows the filter empty state.
- Open detail shows the resolve form + "Ongoing"; resolved detail hides it, shows 35m, equipment link, reporter email, factory; invalid id renders the 404 boundary.
- **Record action (operator)**: creates RESOLVED/OPERATOR_ERROR event with reporter = session user and the right equipment; ongoing record (empty end) lands as OPEN + null `endedAt`.
- **Resolve action**: end ≤ start rejected (stays OPEN); valid resolve sets RESOLVED + non-null end; second resolve rejected ("already been resolved").
- Create validation: end ≤ start and invalid reason rejected, nothing persisted.
- Unknown equipment rejected ("no longer exists").
- RBAC (corrected split): operator record attempt succeeds; operator resolve attempt rejected server-side (no `downtimeResolve`); technician resolve attempt succeeds; technician record attempt rejected (no `downtimeRecord`); a role without `downtimeResolve` (operator) cannot dispatch the resolve action. Operator can open `/downtime/new`; technician sees the resolve panel on OPEN events but not the "Record downtime" button.
- Equipment-scoped pages: HPR → 2 events; robot page shows only its own event and excludes hydraulic/cnc; equipment detail card shows the live count and 1-event text.
- Pagination: 22 probe events → page 1 = 20 rows, page 2 = 2 rows, next link on page 1, no page 3, probes fully cleaned afterward (0 remain; DB back to exactly 3 seed rows).
- Anon redirected to login; no edit/delete/form on detail; duration in DB matches ended − started (≈1h and ≈45m).
- Post-run `psql`: exactly 3 seed events (1 OPEN / 2 RESOLVED), zero M9/probe leftovers; EMMS Postgres (port 5433) and Redis healthy.

### Known limitations

- **Permission split applied post-M9** (requirements correction): downtime reporting (`downtimeRecord`) and resolution (`downtimeResolve`) were originally fused under `downtimeRecord`; a follow-up aligned the implementation with roadmap Phase 6 ("Operators can report downtime and technicians can resolve it") by adding the separate `downtimeResolve` permission — OPERATOR keeps record-only, TECHNICIAN gained resolve-only, ADMINISTRATOR holds both. No schema change; only permission matrix, UI gate, and action authorization.
- **No editing/deleting events** — record + resolve only, by design (history shouldn't be rewritten).
- **No analytics** (MTTR/MTBF/availability dashboards) — roadmap Phase 6 cites these as later work once downtime data accrues.
- No `/downtime/new` link from the equipment detail card / equipment-scoped page (events are created from the global record form).
- Streaming keeps HTTP 200 on the 404 boundary for invalid ids; tests assert on body content (established Next.js behavior noted in M8).
- Postgres now listens on host port 5433 (the `dealbridge_db` container from the unrelated `dealbridgecrm` project occupies 5432); `docker-compose.yml` is back to `'5432:5432'`, so a fresh `docker compose up -d` would try 5432 again — the running container keeps 5433 until recreated.

### Next milestone

- **Activity/audit log (Milestone 10 equivalent)**: record who did what (created/resolved downtime, plus the earlier task/record/equipment actions) as an audit trail; revisit downtime analytics (MTTR/MTBF) once a meaningful window of events exists.
