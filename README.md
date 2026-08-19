# Equipment Maintenance Management System

## Overview

The Equipment Maintenance Management System (EMMS) is a manufacturing equipment maintenance management platform. It replaces the fragmented, manual ways maintenance work is typically tracked — paper-based records, spreadsheets, and emails scattered across teams — with one centralized system for managing equipment and maintenance workflows.

In many plants, maintenance history lives in binders and desktop files. Equipment records are duplicated or lost, history is hard to trace, and maintenance can be missed or poorly coordinated between shifts and roles. Unplanned equipment failure then turns into operational impact: stopped lines, delayed production, and reactive firefighting.

EMMS addresses that by giving EMMS a single, consistent place to model the plant, its equipment, and the work performed on it. The goal is a system that makes equipment history reliable, maintenance work coordinated, and the people doing the work — from technicians to plant managers — grounded in the same trusted data.

## Who Uses EMMS

EMMS models six distinct roles, each with a different stake in the system:

- **Administrator** — owns the system itself: manages users, manages roles and permissions, and has full access across equipment and maintenance operations.
- **Supervisor** — runs day-to-day maintenance operations: maintains the equipment register, schedules maintenance work, tracks completion, and reviews reports.
- **Technician** — performs maintenance and repair work: views assigned equipment and records completed maintenance directly against it.
- **Operator** — works on the production floor with the equipment and logs operational events, such as downtime, that affect it.
- **Plant Manager** — cares about operational performance: consumes reporting and analytics without doing hands-on maintenance work.
- **Reliability Engineer** — analyzes equipment performance and failure history to reduce breakdowns, relying on the same maintained records and reporting views.

The differences in responsibility are encoded as distinct permissions, so each role sees and does only what its job requires.

## Core Capabilities

Completed and planned work is deliberately separated. Nothing marked **Planned** is claimed to be implemented yet.

### Completed

- **Authentication** — secure sign-in with session management (Auth.js), with passwords hashed on the server and 24-hour sessions.
- **Role-based access control** — a centralized permission model mapping the six roles to granular permissions, enforced on every action.
- **Application shell & navigation** — a consistent, responsive application layout and navigation structure.
- **Equipment Registry**
  - Equipment listing with search and filtering
  - Equipment detail views with full history context
  - Create and edit equipment records
  - Soft-archive (deletion) with a retained history
  - Server-side authorization on every view and mutation
- **Maintenance Management** — scheduling, tracking, and completion of maintenance work with full history.
- **Downtime Tracking** — recording and resolving operational downtime events against equipment.
- **Dashboards** — metrics and KPIs over equipment, maintenance, and downtime.
- **Reports & Analytics** — maintenance and downtime reporting over the operational data.
- **Performance & Scalability** — cached dashboard/report aggregates (Redis) with best-effort fallback and targeted database indexes.
- **Production Deployment** — Vercel (application) with PostgreSQL and Redis on Railway; see [deployment guide](./docs/DEPLOYMENT.md).

### Planned

- Advanced analytics and reporting surface: report **exports**, production-loss/OEE/MTBF metrics, and background processes — each deferred from the Phase 10 milestone.

## Architecture

EMMS follows a server-first architecture on the Next.js App Router. The browser interacts with Next.js, which renders server components and exposes data mutations through server actions and route handlers. Server-side logic is the **security boundary** — authorization is enforced where the data is touched, not just in the UI. All reads and writes flow through Prisma to PostgreSQL, the single **source of truth**. Auth.js provides authentication, backed by a centralized role-based permission model. Redis is available as caching infrastructure where appropriate, and Docker provides the local PostgreSQL/Redis development environment.

```mermaid
flowchart TB
    Browser["Browser"]
    AppRouter["Next.js App Router"]
    Server["Server Components / Server Actions / Route Handlers"]
    Prisma["Prisma"]
    PG[("PostgreSQL — source of truth")]
    Auth["Auth.js / Centralized RBAC"]
    Redis[("Redis — caching where appropriate")]

    Browser --> AppRouter --> Server --> Prisma --> PG
    Auth -. enforces authorization .-> Server
    Redis -. cache .-> Server
```

The separation of concerns is deliberately simple: the framework handles routing and rendering, the server handles business logic and authorization, Prisma handles all database access, and PostgreSQL owns the data.

## Technology Stack

| Technology | Purpose |
| --- | --- |
| Next.js 16 (App Router) | React framework for routing, rendering, and server-side execution |
| React 19 | UI component library |
| TypeScript 5 | Typed language for maintainable, predictable code |
| Tailwind CSS 4 | Utility-first styling |
| shadcn/ui | Accessible, composable UI components |
| React Hook Form | Form state management and validation |
| Zod 4 | Schema validation for forms and data |
| Server Actions | Server-side data mutations |
| Route Handlers | API endpoints (e.g., authentication) |
| Auth.js (NextAuth) | Authentication and session management |
| Prisma 7 | Object-relational mapping / database access |
| PostgreSQL | Relational database — the source of truth |
| Redis | Caching infrastructure where appropriate |
| Docker | Local PostgreSQL/Redis development environment |
| bcryptjs | Password hashing |

## What Makes This More Than a CRUD Application

EMMS is designed around the shape of real manufacturing work rather than generic data entry:

- **Real manufacturing workflows** — the domain spans equipment, maintenance tasks and records, downtime, and operational reporting.
- **Role-based security** — permissions are modeled centrally and differ meaningfully between roles, not bolted on as a single admin toggle.
- **Server-side authorization** — every view and mutation is checked against the permission model on the server; the UI never trusts the client.
- **Relational business data** — the data model (users, factories, equipment, maintenance tasks and records) captures relationships, not flat rows.
- **Maintenance lifecycle management** — the system is oriented around the lifecycle of equipment from registration through planned and completed work.
- **Operational history** — every record is part of a traceable history used for analysis.
- **Reporting and analytics** — planned on top of that same operational data.
- **Documented architectural decisions** — key choices are recorded as ADR-style entries in the architecture documentation.
- **Testing against a real PostgreSQL environment** — work is verified against an actual database, not just by compiling.

## Development Roadmap

The project is built incrementally, milestone by milestone, with each delivered in a reviewable state:

- **Milestones 1–4 — Foundation, Database, Auth, Shell** (complete): project setup, relational database design, sign-in/RBAC, and the application layout.
- **Milestones 5–9 — Equipment, Maintenance, Downtime, Dashboards, Reports** (complete): the equipment registry, maintenance lifecycle, downtime workflow, and operational analytics behind server-side authorization.
- **Milestone 10+ — Hardening** (complete): test suites (unit, integration, runtime), performance/indexing, caching, and user administration.
- **Milestone 15 — Performance & Scalability** (complete): Redis-backed dashboard/report aggregates with mutation invalidation.
- **Milestone 16 — Production Deployment** (current): Vercel + Railway rollout per the [deployment guide](./docs/DEPLOYMENT.md).
- **Future expansion** (planned): report exports, deeper downtime analytics (OEE/MTBF), and background processes.

Completed and upcoming work are kept distinct; the roadmap reflects what is delivered versus what remains.

## Engineering Documentation

Alongside the application code, the repository contains the engineering trail behind it:

- [PRD.md](./PRD.md) — product requirements and scope
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — architectural principles, decisions, and ADRs
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) — the implementation plan
- [BUILD_LOG.md](./docs/BUILD_LOG.md) — implementation history, including environment setup
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) — production deployment runbook (Vercel + Railway)
- [learning/](./docs/learning/) — a 15-session learning handbook documenting the reasoning behind each part of the system

These documents explain not just what was built, but why it was built that way.

## Current Status

EMMS is feature-complete for its MVP roadmap through Phase 9 and is in **Phase 10 (Production Deployment)**. Milestones 1–15 are complete: authentication and RBAC, the equipment registry (with soft-archive), maintenance management, downtime tracking, dashboards, reports, user administration, a full test suite (unit/integration/runtime), and performance hardening with cached aggregates. The remaining work is production rollout on Vercel with PostgreSQL and Redis on Railway, documented in [DEPLOYMENT.md](./docs/DEPLOYMENT.md); future expansion (report exports, OEE/MTBF analytics, background processes) is tracked separately.

## Development Philosophy

- **Server-first development** — logic and rendering live on the server by default.
- **Security enforced on the server** — the server is the enforcement point for every authorization decision.
- **Simple architecture before unnecessary complexity** — solve today's problem directly, and add machinery only when it earns its place.
- **Build functionality before visual polish** — working, verifiable workflows come before decoration.
- **Test real workflows** — verify behavior against a real PostgreSQL environment rather than only compiling.
- **Document important decisions** — significant architectural choices are recorded so the reasoning survives.

## Setup

For local setup and development instructions, see [BUILD_LOG.md](./docs/BUILD_LOG.md) — the environment (PostgreSQL and Redis via Docker, database migration and seeding) is documented there rather than repeated in this overview.