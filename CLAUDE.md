# Loopline — Project Context

## What this is

Loopline is a feedback & changelog widget SaaS, built as a portfolio project to
demonstrate production-grade full-stack Next.js with a security-first design.

A company signs up, gets a dashboard and a public API key, embeds a `<script>`
widget on their own website, and their end users can submit feedback, upvote
existing requests, and read a published changelog — all without leaving the host
page.

The distinguishing feature (and the main thing the project exists to showcase)
is its **two-trust-context architecture**, described below. Authorization
correctness, tenant isolation, and tests matter more here than feature breadth.

## Tech stack

- **Next.js 16** — App Router, TypeScript, Tailwind CSS v4, ESLint, Turbopack
- **Package manager:** pnpm (supply-chain policies are active — see Gotchas)
- **ORM:** Prisma 7 (driver-adapter based)
- **Database:** MySQL, local, port 3306, via `@prisma/adapter-mariadb`
- **Validation:** Zod
- **Tests:** Vitest + `vite-tsconfig-paths`
- **Runtime:** Node 24 (via nvm)
- **Import alias:** `@/*` resolves to the project root (no `src/` directory)

## Architecture — the two trust contexts

Requests reach the database through two completely separate paths that share one
MySQL database:

1. **Public path (`/api/public/*`)** — used by the embeddable widget, which runs
   on customers' own domains. CORS is intentionally wide open. Authenticated
   only by a publishable API key (`pk_...`) that resolves to exactly one
   organization. Scoped to a minimal set of actions: read feedback, create
   feedback, vote.

2. **Admin path (`/api/admin/*`, not built yet)** — used by the dashboard.
   Session-authenticated. Full CRUD, status changes, changelog management.

Every database query is scoped by `organizationId`. Tenant isolation is the core
security property and is covered by the test suite.

### Security invariants — DO NOT violate

These are load-bearing. Any change in this codebase must preserve them:

- Handlers **never** read `organizationId` (or any tenant identifier) from
  request input. The org is resolved from the API key (public path) or the
  session (admin path) and hardcoded into the query. This is the primary IDOR
  defense.
- Every Prisma query that touches tenant data includes
  `where: { organizationId: ... }`, or creates the row with it.
- The public API key grants only read / create-feedback / vote. It must never be
  able to change status, delete, or reach any `/api/admin/*` route.
- All external input is validated with Zod before it touches the database. The
  create schema deliberately omits `organizationId` so it cannot be injected.
- Vote deduplication is enforced at the **database** level via
  `@@unique([postId, voterId])`, not in application code.
- The API key is a *publishable* key (like Stripe's `pk_`), shipped in
  client-side widget code. It is not secret — its safety comes from scoping, not
  secrecy. Do not move it into secret stores or treat a leak as a credential
  breach.

## Data model (`prisma/schema.prisma`)

Six models:

- **User** — dashboard account (email, passwordHash, name)
- **Organization** — the tenant (name, slug, publicApiKey, ownerId)
- **Post** — a feedback item (title, body, status, voteCount, submitterEmail,
  organizationId)
- **Vote** — (voterId, postId); unique per `(postId, voterId)`
- **ChangelogEntry** — (title, body markdown, slug, publishedAt nullable for
  drafts, organizationId)
- **PostStatus** enum — `OPEN | PLANNED | IN_PROGRESS | DONE | DECLINED`

MySQL notes: `body` fields are mapped `@db.Text` (a default `String` becomes
`VARCHAR(191)` and would truncate). `voteCount` is denormalized on `Post` for
cheap sort-by-votes.

## Prisma 7 specifics (important — these already caused setup errors)

- The generator provider is `prisma-client-js`, **not** `prisma-client`. This
  generates into `@prisma/client` and is the Turbopack-safe choice; switching to
  `prisma-client` causes a "Cannot find module `.prisma/client/default`" error
  and changes all import paths.
- The connection URL lives in `prisma.config.ts` (read by the CLI for
  migrations), **not** in `schema.prisma`. The datasource block contains only
  `provider = "mysql"`.
- At runtime, `lib/prisma.ts` builds a `PrismaMariaDb` adapter from
  `process.env.DATABASE_URL` and passes it to `PrismaClient`. A bare
  `new PrismaClient()` is invalid in v7.
- `next.config.ts` lists `@prisma/client`, `@prisma/adapter-mariadb`, and
  `mariadb` under `serverExternalPackages`.
- Prisma 7 does **not** auto-run generate. Run `pnpm prisma generate` after every
  schema change, or `@prisma/client` will not export `PrismaClient`.

## Project structure (relevant files)

```
prisma/schema.prisma                     # 6 models, mysql provider
prisma.config.ts                         # CLI connection config (reads DATABASE_URL)
next.config.ts                           # serverExternalPackages
vitest.config.ts                         # tsconfig path resolution for tests
lib/prisma.ts                            # PrismaClient singleton w/ MariaDB adapter
lib/auth/public-api-key.ts               # withPublicApiKey wrapper, CORS, handlePreflight, generatePublicApiKey
app/api/public/posts/route.ts            # GET list + POST create + OPTIONS preflight
app/api/public/posts/[id]/vote/route.ts  # POST vote + OPTIONS preflight
tests/public-api.authz.test.ts           # authz / IDOR / vote-dedup / vote-route tests
tests/setup.ts                           # loads .env.test before Prisma initialises
```

## Environment

`.env` needs:

```
DATABASE_URL="mysql://loopline:<password>@localhost:3306/loopline"
```

Tests run against a **separate throwaway database** (the suite wipes tables
between runs). Point `DATABASE_URL` at it via `.env.test` or a dedicated local
test DB.

## Commands

- Dev server: `pnpm dev`
- Generate client (after any schema change): `pnpm prisma generate`
- Migrate: `pnpm prisma migrate dev --name <name>`
- Run tests: `pnpm test`

## Status

### Done
- Project scaffolded (Next 16, TS, Tailwind v4, ESLint, Turbopack, pnpm)
- Prisma 7 + MySQL (MariaDB adapter) wired up
- Data model defined (6 models), first migration applied
- Public API-key middleware (`withPublicApiKey`) with org resolution + CORS
- Public posts route: `GET` (list, org-scoped, sorted by votes), `POST` (create,
  Zod-validated), `OPTIONS` (preflight)
- Vote route: `POST /api/public/posts/[id]/vote` — anonymous voter cookie,
  atomic voteCount increment, P2002 → 409, cross-org IDOR blocked
- Authorization test suite (9 tests): missing/invalid key → 401, cross-tenant
  isolation, body-injection IDOR, DB-level vote dedup, vote happy path,
  duplicate vote → 409, cross-org vote → 404

### Pending (roughly in build order)
1. Rate limiting on public endpoints (by IP and by voter cookie)
3. Dashboard auth — session-based (Auth.js or hand-rolled credentials)
4. Admin API (`/api/admin/*`) — full CRUD, status changes, changelog management,
   all session-guarded
5. Privilege-escalation test — a public `pk_` key must get 401/403 on admin routes
6. The embeddable widget — script tag → iframe → hosted widget route,
   `postMessage` for resize and open/close
7. Dashboard UI
8. Public changelog page (ISR)
9. CI/CD pipeline + deployment

## Conventions

- TypeScript strict mode; avoid `any`.
- Org-scoping on every tenant query (see invariants).
- Zod validation on all external input.
- The middleware owns request typing; route handlers receive a typed `req` from
  the wrapper rather than importing request types themselves.
- Keep public and admin concerns in separate route trees
  (`/api/public/*` vs `/api/admin/*`).