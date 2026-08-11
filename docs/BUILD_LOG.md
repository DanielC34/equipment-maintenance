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
| Command | Description |
|---|---|
| `npm run db:migrate` | Apply schema migrations to the database |
| `npm run db:seed` | Populate the database with seed data |
| `npm run db:studio` | Open Prisma Studio visual editor |

### Important development commands
| Command | Description |
|---|---|
| `docker compose up -d` | Start PostgreSQL and Redis in the background |
| `docker compose down` | Stop running containers |
| `docker compose down -v` | Stop containers and wipe all persistent volumes (full reset) |
| `docker compose ps` | Check the status of running containers |
| `docker compose logs postgres` | View PostgreSQL logs |

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

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@emms.dev` | `password123` |
| Supervisor | `supervisor@emms.dev` | `password123` |
| Technician | `technician@emms.dev` | `password123` |
| Operator | `operator@emms.dev` | `password123` |
| Plant Manager | `manager@emms.dev` | `password123` |
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
