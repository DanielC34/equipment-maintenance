# Building the Equipment Maintenance Management System (Project Setup)

## Purpose

You have made it through the hard part. In Sessions 1 through 8, you learned *why* this system exists, *how* it is designed, and *how* it will be deployed. Now it is time to do something new: **build it**.

Before writing any application features, developers first prepare the **foundation** of the project. This is the setup phase — the moment where you create the empty project, install the tools, connect the services, and make sure everything talks to each other.

This might not feel as exciting as building features, but it is one of the most important phases of a project. Think of it like laying the foundations of a house. You cannot build the walls until the ground is level, the concrete is poured, and the pipes are in place.

Good preparation prevents future problems:

- Tools installed now save hours of confusion later.
- Services connected now mean fewer surprises when you start building.
- A clean folder structure now means you always know where code belongs.
- A working "hello world" now means you can be confident that problems you meet later are in your new code, not in the setup.

As Session 5 explained, a good architecture makes a system easier to understand, change, and grow. This chapter turns that architecture into a real, runnable project.

> [!NOTE]
> This chapter marks the transition from **understanding** the system to **implementing** it. Everything you learned in Sessions 1 through 8 now becomes the blueprint you build from.

---

## Looking Back at the Architecture

Before we start typing commands, let us remind ourselves where we have been. The earlier chapters built a complete picture of the EMMS:

- **Business Problem** (Session 1) — why factories need a central system to track downtime and maintenance.
- **Database Design** (Session 3) — how the data is organized into tables for users, factories, production lines, machines, downtime events, and parts.
- **Architecture** (Session 5) — how Next.js, Prisma, PostgreSQL, Redis, and Auth.js fit together.
- **Deployment** (Session 8) — how the finished application will be hosted on Vercel and Railway.

Those chapters were not just reading material. They are now the **blueprint** for implementation. Every decision we make in this chapter — which tools to install, which folders to create, which connections to test — comes directly from what we planned earlier.

```mermaid
flowchart TD
    A[Planning] --> B[Design]
    B --> C[Architecture]
    C --> D[Implementation]
```

The planning and design are done. Now we begin implementation.

> [!TIP]
> When you feel lost during setup, go back to the earlier chapters. If you do not know why a piece exists, Session 5 (architecture) or Session 3 (database) will usually explain it. The handbook is your map.

---

## What Will We Build?

At a high level, the final EMMS is an application that helps a factory track its equipment, its downtime, and its maintenance. Here is what the finished application will include:

| Feature | What it does | Where we planned it |
|---|---|---|
| **Authentication** | Lets users sign in and identifies who they are | Session 5 (Auth.js) |
| **Equipment Management** | Lets users register and view machines and equipment | Sessions 1 and 3 (machines) |
| **Maintenance Scheduling** | Lets supervisors plan preventive maintenance | Session 2 (preventive maintenance) |
| **Downtime Tracking** | Lets operators log downtime events and engineers resolve them | Sessions 1, 2, and 3 |
| **Dashboard** | Shows summary metrics to managers at a glance | Session 7 (analytics engine) |
| **Reports** | Presents filtered views of downtime and performance | Session 7 (filtering and grouping) |
| **Analytics** | Turns raw records into MTTR, production loss, and top-machine insights | Session 7 (KPIs) |

Every feature connects back to a chapter you have already studied. This is important: nothing in the EMMS is new or mysterious. You already understand the *why* behind each feature. Now you get to build the *how*.

> [!IMPORTANT]
> You are not building something unknown. You are implementing a system you already understand. When a feature feels complicated, remember the chapter that explains its purpose.

---

## Choosing the Technology Stack

A **technology stack** is the collection of tools and technologies used to build an application. Think of it like the set of materials and tools a builder uses — the same way a carpenter chooses wood, screws, and a saw, a developer chooses frameworks, languages, and databases.

We chose our stack in Session 5. Here it is, explained simply:

| Technology | Purpose | Why We Chose It |
|---|---|---|
| **Next.js** | The framework that runs the whole web application | It organizes both the frontend and the backend in one project, and works perfectly with Vercel for deployment (Session 8) |
| **React** | The library used to build the user interface | It makes interactive pages easy to build as reusable pieces (Session 5) |
| **TypeScript** | Adds type safety to JavaScript | It catches mistakes before the code runs, which is especially helpful for a project as large as the EMMS (Session 5) |
| **Tailwind CSS** | A styling tool for the interface | It makes building consistent, professional-looking UI fast (Session 5) |
| **shadcn/ui** | A collection of ready-made interface components | It provides polished buttons, cards, and forms so we do not build everything by hand (Session 5) |
| **Prisma** | An ORM that connects the application to the database | It lets us work with the database using TypeScript instead of raw SQL (Session 4) |
| **PostgreSQL** | The main database | It is the reliable source of truth for all permanent data (Sessions 3 and 5) |
| **Redis** | A fast in-memory cache | It speeds up the dashboard by caching expensive calculations (Sessions 7 and 8) |
| **Auth.js** | Handles authentication and user identity | It manages sign-in, sessions, and roles so we do not build security from scratch (Session 5) |

> [!NOTE]
> An **ORM** (Object-Relational Mapper) is a tool that lets you work with a database using your programming language instead of writing raw SQL. Prisma is the ORM we use. You learned how it translates TypeScript into SQL in Session 4.

There are no surprises here. Every technology in this table was introduced in the earlier sessions. The stack was chosen because these tools work well together, are well documented, and match the deployment plan from Session 8.

---

## Setting Up the Development Environment

Before you can write a single line of code, you need a few tools installed on your computer. Together, these are called your **development environment** — the workspace where you build software.

Here is each tool and why it is required:

| Tool | What it is | Why we need it |
|---|---|---|
| **Node.js** | The runtime that runs JavaScript outside the browser | Next.js applications are built with JavaScript, and they need Node.js to run during development |
| **npm** | A package manager | It installs and manages the libraries (packages) our project depends on. npm is installed automatically with Node.js |
| **Visual Studio Code** | A code editor | It is where you write, read, and organize your code, with helpful features like autocomplete |
| **Git** | A version control tool | It tracks every change to your code, so you can go back in time and collaborate safely (Session 8) |
| **Docker Desktop** | A tool for running software in isolated containers | It gives us an easy way to run PostgreSQL and Redis locally without installing them directly on our computer |
| **PostgreSQL** | The database itself | It stores all the permanent data for the EMMS (Session 3) |
| **Redis** | The in-memory cache | It caches dashboard metrics so the dashboard stays fast (Session 7) |

> [!NOTE]
> A **package manager** is a tool that downloads and installs software libraries for you. npm (Node Package Manager) is the one used with Node.js. You ask it for a library, and it fetches it and keeps track of the version.
>
> A **container** is a small, isolated environment that runs software with everything it needs included. Docker lets us start a PostgreSQL or Redis "container" with one command, which is far easier than installing and configuring them by hand.

You might wonder: why use Docker instead of installing PostgreSQL and Redis directly? Because databases and caches are tricky to install cleanly, and every developer's computer is slightly different. Docker packages each service so it runs the same way everywhere. If it works on one computer, it works on all of them.

> [!TIP]
> You do not need to memorize how to install these tools right now. The key idea is that each one has a job: Node.js runs the app, npm installs libraries, VS Code is where you write code, Git tracks changes, and Docker runs the database and cache. As you use them, they will start to feel natural.

---

## Creating the Project

Now we begin. The first step is to create a brand-new Next.js project.

### Why we start with a clean foundation

A **project** is simply a folder that contains your application's code and configuration. When we create a new project with a tool, that tool generates a clean, working starting point with sensible defaults already in place.

Starting with a fresh, generated project matters because:

- The basic structure is already correct — we do not invent it from scratch.
- The default configuration is known to work — we build on tested ground.
- We avoid the messy files that appear when people try to assemble a project by hand.

This connects to Session 6. The folder structure we learned about is not something we invent — a new Next.js project already comes with most of it created for us. Our job is to understand it, organize it, and grow it.

### What the tool generates

When you create a new Next.js project, the tool produces:

- the `app/` folder, where the pages of the application will live
- configuration files, such as TypeScript and project settings
- a starter homepage, so the project runs immediately
- a `package.json` file, which lists the project's dependencies

> [!NOTE]
> A **dependency** is a library your project needs to work. `package.json` keeps a list of them so that anyone can install exactly the right versions. You met `package.json` in Session 6.

The result is a tiny working application. You can start it and see a page in your browser within minutes. That is the goal: get to "it works" as quickly as possible, then build outward from there.

> [!IMPORTANT]
> Do not skip the clean start to "save time." Every project you build from scratch later will have subtle differences and hidden problems. Starting from a generated project means the foundation is tested and reliable.

---

## Installing Project Dependencies

Once the base project exists, we add the libraries we need. Dependencies come in groups, and each one has a role. Here are the major packages grouped by category:

| Category | Packages | What they do |
|---|---|---|
| **Framework** | Next.js, React | The core of the application — pages, routing, and the user interface |
| **Database** | Prisma, Prisma Client | Connects the app to PostgreSQL and lets us query it in TypeScript (Session 4) |
| **Authentication** | Auth.js | Handles sign-in, sessions, and user identity (Session 5) |
| **Validation** | Zod | Checks that data coming in from forms is correct before it is saved |
| **Styling** | Tailwind CSS, shadcn/ui | Styles the interface with consistent, ready-made components (Session 5) |
| **Caching** | ioredis or `redis` client | Connects the app to Redis for fast dashboard caching (Sessions 7 and 8) |
| **Developer Tools** | TypeScript, ESLint, Prettier | Catch mistakes, enforce code style, and keep the codebase clean |

> [!NOTE]
> **Validation** is the process of checking that data is correct before it is used. **Zod** is a library that makes validation easy by describing the shape data should have. If a form sends a missing field, validation catches it before it reaches the database.
>
> **Linting** is the process of checking code for problems — ESLint is the tool that does this. **Formatting** makes code consistent and readable — Prettier handles that. Both are developer tools that help you write better code with less effort.

Do not worry about remembering every package name. The important idea is that each category has a job, and together they match the stack we chose earlier. When you install a package, ask yourself: "Which part of the architecture does this support?" If you can answer that question, you understand why it is there.

> [!TIP]
> A common beginner mistake is installing packages without understanding them (more on this later). Before adding a library, ask whether it supports the plan from Session 5. If it does not match the architecture, you probably do not need it.

---

## Creating the Initial Folder Structure

Remember Session 6? We studied the folder structure of a professional full-stack project. Now we actually implement it.

A well-organized project is easier to understand, debug, and grow — that was the whole lesson of Session 6. Here is the structure we will set up:

```mermaid
flowchart TD
    S[src/] --> A[app/]
    S --> C[components/]
    S --> V[server/]
    S --> L[lib/]
    S --> P[prisma/]
    S --> U[public/]
```

> [!NOTE]
> **`src/`** is a folder that holds the application's source code. It keeps all the code in one place, separate from configuration files at the project's root.

Here is the responsibility of every folder:

| Folder | Responsibility |
|---|---|
| **`src/app/`** | Holds the pages and routes of the application. In Next.js, the folder structure decides the URLs (Session 6) |
| **`src/components/`** | Stores reusable UI building blocks — buttons, cards, forms — that are used in many places |
| **`src/server/`** | Contains server-side logic: business rules, validation, and database communication (Session 4) |
| **`src/lib/`** | Holds shared helper code, such as the Prisma client, the Redis client, and auth utilities (Session 6) |
| **`prisma/`** | Contains the database schema and seed logic — the formal definition of the tables from Session 3 |
| **`public/`** | Stores static assets like images and logos that the browser serves directly (Session 6) |

This is exactly the structure we studied in Session 6, now made real. When you add a feature, you will know where it belongs:

- New page? Go to `src/app/`.
- New button or card? Go to `src/components/`.
- New business rule? Go to `src/server/`.
- Shared helper? Go to `src/lib/`.
- Database change? Go to `prisma/`.

> [!IMPORTANT]
> The folder structure is not decoration. It is the physical home of the separation of concerns we studied in Session 5. Putting each piece in the right folder is what keeps the project maintainable.

---

## Configuring the Project

Before building features, projects are configured. **Configuration** is the set of settings that tell the project how to behave. Here is what we configure and why:

| Item | What it does | Why it matters |
|---|---|---|
| **TypeScript configuration** | Controls how strict and how well-checked the code is | Ensures type safety works the way we want, catching mistakes early (Session 5) |
| **ESLint** | Checks code for problems and common mistakes | Keeps the code healthy and consistent as it grows |
| **Prettier** | Formats code in a consistent style | Makes the codebase uniform and easier to read for everyone |
| **Environment variables** | Store settings and secrets outside the code | Keeps passwords and URLs safe, and lets each environment differ (Session 8) |
| **Path aliases** | Lets you import files using short, friendly names | Makes imports like `@/components/Button` instead of long relative paths, keeping code clean |

> [!NOTE]
> A **path alias** is a shortcut for a folder location. Instead of writing `../../components/Button` (which breaks easily as files move), you write `@/components/Button`. The alias always points to the same place.

### Why configure before building features?

Think of configuration as the settings on a musical instrument. A guitar needs tuning before you play a song. The tuning takes a few minutes, but if you skip it, every chord sounds wrong no matter how well you play.

The same applies to software. If you configure the project now:

- TypeScript and ESLint will catch mistakes in every feature you write from day one.
- Prettier keeps the code readable from the first commit.
- Environment variables are in place so the database and cache connections work immediately.

Configuring late means retrofitting rules onto existing code, which is slow and error-prone. Configuring early means every feature you write benefits from the setup automatically.

> [!TIP]
> Configuration is a one-time investment with permanent rewards. It takes a little time now and saves far more time later.

---

## Connecting PostgreSQL

Now we connect the first real service: the database. This was planned in Session 3 and uses Prisma, which you learned about in Session 4.

### Creating `DATABASE_URL`

To connect to a database, the application needs to know where it is and how to log in. That information lives in an **environment variable** called `DATABASE_URL` (you met this variable in Session 8).

A `DATABASE_URL` contains the address of the database, the username, and the password. It looks something like:

```
postgresql://user:password@localhost:5432/emms
```

In development, this points to the local PostgreSQL we run with Docker. In production (Session 8), it will point to the database hosted on Railway. Same variable name, different value, depending on the environment.

### Prisma connection

Prisma reads the `DATABASE_URL` and uses it to connect to PostgreSQL. We tell Prisma where the connection string is, and Prisma handles the actual connection.

The Prisma setup has two parts:

1. **The schema** (`schema.prisma`) — the formal definition of the tables we designed in Session 3. We will fill this in during Session 10.
2. **The Prisma Client** — the tool our application uses to talk to the database once it is connected.

For now, we just set up the connection so Prisma can reach PostgreSQL.

### Testing the connection

After configuring the connection, we test it. Testing the connection means asking Prisma to talk to the database and confirming it succeeds.

Why verify first? Because the database is the foundation of everything. Every feature — logging downtime, viewing machines, loading the dashboard — depends on the database. If we discovered a connection problem while building features, we would not know whether the bug was in our new code or in the connection. Testing now removes that doubt.

> [!NOTE]
> **Testing a connection** simply means attempting to connect and confirming it worked. If it fails, the error message usually tells you exactly what is wrong — a wrong address, a wrong password, or a database that is not running.

> [!IMPORTANT]
> Verify the database connection now, before building features. A foundation you have tested is a foundation you can build on. This is the same "test early" habit you will use throughout development.

---

## Connecting Redis

The second service to connect is Redis, the fast cache we studied in Sessions 7 and 8.

### Why Redis comes after the database

The order is intentional. PostgreSQL is the **source of truth** — the permanent home of all data (Session 5). Redis is a **helper** that caches copies of expensive calculations to make the dashboard faster (Session 7).

Because Redis only holds temporary copies of data that comes from the database, it makes sense to connect the database first. Once the source of truth is working, we add the cache that speeds it up.

### Redis connection

Just like the database, Redis needs a connection setting — an environment variable called `REDIS_URL` (you also met this in Session 8). It tells the application where the Redis cache is and how to reach it.

The **Redis client** is a small library that lets our application send commands to Redis — for example, "store this dashboard result" or "give me the cached result." Session 7 explained how the dashboard reads from the cache first and only recalculates when the cache is stale.

### Testing connectivity

As with the database, we test that the application can actually reach Redis. We do a simple check: connect, send a small command, and confirm Redis answers.

Why test? Because a broken cache has a subtle effect: the app still works, but the dashboard is slow. If we tested Redis only after building the dashboard, a slow dashboard would be confusing. Testing now tells us the connection is solid, so any future dashboard slowness must come from our caching logic, not the connection.

> [!TIP]
> PostgreSQL stores the truth. Redis stores the speed. Connect the truth first, then the speed — and test both as you go.

---

## Configuring Authentication

Authentication is the system that lets users prove who they are. In Session 5 you learned about Auth.js and how it manages identity, sessions, and permissions.

### Auth.js

**Auth.js** is the library that handles authentication for us. Instead of building sign-in, session management, and password handling from scratch, we configure Auth.js and let it do the secure work. The application needs an environment variable called `AUTH_SECRET` (Session 8) — a secret used to protect the data that identifies logged-in users.

### Sessions

A **session** is the period during which the system remembers that a user is logged in (Session 5). When a user signs in, the system creates a session. As long as the session is valid, the user can access protected pages without signing in again.

### User roles

The EMMS has different kinds of users — operators, engineers, and managers (Session 1) — and later, the planned role-based access control (RBAC) from Session 5. Authentication is the first half of this: it confirms *who* the user is. Authorization, the second half, decides *what* they are allowed to do. For now, we set up the authentication foundation; the detailed role rules come in a later session.

### Why configure authentication early

Authentication is woven through the whole application. Almost every page the EMMS has — recording downtime, viewing machines, opening the dashboard — should be protected, so that only signed-in users can see them (Session 4 explained why the server must control access).

If we configured authentication later, we would have to retrofit it onto every existing page. Configuring it now means:

- the infrastructure is ready from the start
- every page we build can be protected from day one
- we never build a feature that ignores security

> [!NOTE]
> **Authentication** confirms who you are. **Authorization** decides what you are allowed to do. Auth.js handles authentication now; the detailed role-based rules will be added later as the EMMS grows.

> [!IMPORTANT]
> Security is not something to add at the end. As Session 4 taught us, the server is the gatekeeper. Setting up authentication early means every feature is built inside a secure foundation from the beginning.

---

## Creating the First Working Application

Now that the services are connected, we create our first real page: a simple homepage.

### Why start with a simple homepage?

Developers love to verify that everything works before adding business logic. A simple homepage is the perfect first step because:

- It confirms the whole stack starts and runs.
- It proves the database and Redis connections are live (we can read a value and display it).
- It shows that authentication middleware does not block the basic flow.
- It gives us a "known-good" point — if the homepage loads, the foundation is solid.

Think of it like turning on the lights in a new house before moving in furniture. You want to confirm the wiring works before you bring in anything you care about.

### A practical example

A first homepage might:

1. Start the application.
2. Display a friendly heading like "Welcome to the EMMS."
3. Read a small value from PostgreSQL and show it on the page — proving the database connection works.
4. Read a small value from Redis and show it — proving the cache connection works.

If all four work, you have verified the entire foundation with one page. Now, when you build the real features in later sessions, you will know the infrastructure is trustworthy.

> [!NOTE]
> A **"known-good" point** is a moment where you have confirmed things work, so you can be confident that problems found later are in new code, not the setup. The simple homepage is exactly this for the EMMS.

> [!TIP]
> Keep this first page simple on purpose. It is not the real product — it is a proof that the foundation works. Real features come next, and they will be far easier because the foundation is verified.

---

## First Milestone

A **milestone** is a point in the project where you can look back and say "we have achieved something complete." After this setup phase, the project should be capable of the following:

- **Application starts successfully** — running the project shows a working homepage.
- **Database connected** — the homepage can read from PostgreSQL.
- **Redis connected** — the homepage can read from the Redis cache.
- **Authentication configured** — the Auth.js foundation is in place and ready for roles.
- **Folder structure complete** — all the folders from the structure diagram exist and are organized.
- **Ready to begin feature development** — every foundation piece is verified before any business logic is written.

Here is the milestone checklist:

| # | Milestone item | What "done" looks like |
|---|---|---|
| 1 | Application starts successfully | Running the project shows the homepage in the browser |
| 2 | Database connected | A small value from PostgreSQL appears on the homepage |
| 3 | Redis connected | A small value from Redis appears on the homepage |
| 4 | Authentication configured | Auth.js is set up and the auth secret is in place |
| 5 | Folder structure complete | `app/`, `components/`, `server/`, `lib/`, `prisma/`, and `public/` all exist |
| 6 | Ready for feature development | Every checklist item above is verified and working |

When every box is checked, the setup phase is complete. You have not built a feature yet — and that is correct. You have built the foundation, and it is solid.

> [!IMPORTANT]
> Do not start building features until this milestone is complete. The entire point of this chapter is that a verified foundation makes feature development smooth. Skipping ahead to features now would bring back exactly the confusion we are trying to avoid.

---

## Common Beginner Mistakes

Everyone makes mistakes when setting up a project for the first time. Here are the most common ones, and how to avoid them.

### Installing packages without understanding them

**The mistake:** Adding libraries to the project without knowing what they do, because a tutorial or a friend suggested them.

**How to avoid it:** Before installing anything, ask "which part of the Session 5 architecture does this support?" If you cannot answer, you probably do not need it. Keep the project lean and understood.

### Skipping environment variables

**The mistake:** Writing a database URL or secret directly into the code, or forgetting to create the `.env` file.

**How to avoid it:** From the very first day, put connection strings and secrets in environment variables, never in source code (Session 8). Use an `.env` file for development and never commit real secrets to Git.

### Ignoring folder organization

**The mistake:** Dropping new files anywhere, because "it works, so where does it live matter?"

**How to avoid it:** Follow the folder structure from Session 6. If a file has no clear home, stop and think about what it is for. Disorganization in the first week becomes chaos in the tenth.

### Not testing connections

**The mistake:** Assuming the database and Redis are connected because the setup "looked right," then debugging feature failures later.

**How to avoid it:** Test every connection the moment you create it — the way we did with the homepage. A known-good foundation is the difference between a clear bug and a mystery.

### Hardcoding secrets

**The mistake:** Writing passwords, API keys, or the auth secret directly in the code where anyone who sees the repository can read them.

**How to avoid it:** Secrets belong in environment variables only (Session 8). Never type a real secret into source code, and make sure secrets are excluded from Git with a `.gitignore` file.

> [!NOTE]
> A **`.gitignore`** file tells Git which files to ignore — typically secret files like `.env`. It ensures you never accidentally commit passwords or keys to the repository.

> [!TIP]
> Almost every beginner setup problem falls into one of these five categories. If something goes wrong, ask yourself: "Did I understand this package? Did I set the variables? Did I put the file in the right folder? Did I test the connection? Did I leak a secret?" One of those questions is almost always the answer.

---

## What's Next?

This chapter laid the foundation. The project is created, the services are connected, and everything is verified. The next step is to start building the real system.

**Session 10 — Database Implementation** will take the database design from Session 3 and turn it into reality. You will write the Prisma schema — the formal definition of the tables for users, factories, production lines, machines, downtime events, and parts — create the migrations, and add seed data so the application has realistic starting records.

The schema you studied in Session 3 becomes actual working code. The tables become real tables in PostgreSQL. And from there, the application begins to come alive.

> [!NOTE]
> **Migrations** are the step-by-step changes that update the database structure over time, as you learned in Session 6. **Seed data** is sample data added to the database to give the application a realistic starting point.

---

## Key Takeaways

- The setup phase lays the foundation of the project before any features are built.
- Good preparation prevents future problems — the house is only as good as its foundations.
- Sessions 1 through 8 are the blueprint. The architecture from Session 5 and the database from Session 3 now become the plan we build from.
- The final EMMS will include authentication, equipment management, maintenance scheduling, downtime tracking, a dashboard, reports, and analytics — all planned in earlier chapters.
- The technology stack — Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Redis, and Auth.js — was chosen in Session 5 and implemented here.
- The development environment needs Node.js, npm, a code editor, Git, Docker, PostgreSQL, and Redis — each with a clear job.
- A clean, generated project gives us a tested foundation instead of one we assembled by hand.
- Dependencies are installed in groups, each matching a part of the architecture.
- The folder structure from Session 6 becomes real: `app/`, `components/`, `server/`, `lib/`, `prisma/`, and `public/`.
- Configuration — TypeScript, ESLint, Prettier, environment variables, and path aliases — is done early so every future feature benefits from it.
- PostgreSQL is connected first as the source of truth, then Redis as the cache, then authentication as the gatekeeper.
- A simple homepage proves the whole foundation works before any business logic is added.
- The first milestone is a project that starts, connects to the database and Redis, has authentication configured, and is ready for feature development.
- Avoid the five common mistakes: installing packages blindly, skipping environment variables, ignoring folder organization, not testing connections, and hardcoding secrets.
- Next comes **Session 10**, where the database design from Session 3 is implemented as a real Prisma schema.
