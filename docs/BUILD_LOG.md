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
