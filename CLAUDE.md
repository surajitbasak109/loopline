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
app/api/auth/[...nextauth]/route.ts      # Auth.js catch-all handler
lib/rate-limit.ts                        # fixed-window in-memory rate limiter (createRateLimiter factory + singleton)
lib/auth/authorize.ts                    # credentials authorize logic (bcrypt check, Zod validation)
lib/auth/session.ts                      # withAdminSession wrapper — mirrors withPublicApiKey for admin routes
auth.config.ts                                  # Edge-safe NextAuth config for proxy (no Prisma/bcrypt)
proxy.ts                                        # Next.js 16 proxy — protects /api/admin/* and /dashboard/*
auth.ts                                         # NextAuth config: Credentials provider, JWT strategy, session callbacks
lib/validations/register.ts                     # shared Zod schema for registration (used by API + frontend)
components/ui/Button.tsx                        # reusable button (primary/secondary/ghost, loading spinner)
components/ui/Input.tsx                         # reusable input (label, error, hint, prefix slot)
components/ui/Alert.tsx                         # reusable alert (error/success/info)
app/(www)/page.tsx                              # homepage / landing page
app/(app)/(auth)/layout.tsx                     # centered bg-gray-50 shell shared by auth pages
app/(app)/(auth)/login/page.tsx                 # login form
app/(app)/(auth)/register/page.tsx              # two-step registration wizard
app/(app)/(dashboard)/layout.tsx                # dashboard shell: auth check, topbar, sidebar nav
app/(app)/(dashboard)/dashboard/page.tsx        # dashboard overview (stub)
app/api/auth/register/route.ts                  # POST — creates User + Organization, hashes password, sends verification email
app/api/auth/forgot-password/route.ts           # POST — generates reset token (SHA-256 hashed), emails link
app/api/auth/reset-password/route.ts            # POST — validates token, updates password, clears token
app/api/auth/verify-email/route.ts              # GET  — validates verify token, marks emailVerified
app/api/auth/resend-verification/route.ts       # POST — resends verification email
lib/email.ts                                    # Nodemailer transporter, generateToken/hashToken, email templates
components/Auth/ForgotPasswordForm.tsx          # forgot password form (shows success state after send)
components/Auth/ResetPasswordForm.tsx           # reset password form (reads token from URL)
components/Auth/VerifyEmailStatus.tsx           # verify email status page + resend form
app/api/admin/posts/route.ts             # GET list (filterable by status)
app/api/admin/posts/[id]/route.ts        # PATCH status + DELETE
app/api/admin/changelog/route.ts         # GET list (drafts + published) + POST create
app/api/admin/changelog/[id]/route.ts    # PATCH update + DELETE
app/api/admin/changelog/[id]/publish/route.ts  # POST publish (idempotent)
app/widget/page.tsx                      # hosted widget page (served inside iframe)
app/widget/WidgetPanel.tsx               # client component: feedback list, submit form, vote buttons
public/widget.js                         # loader script — injects button + iframe, wires postMessage
public/widget-test.html                  # local test page simulating a customer's website
tests/public-api.authz.test.ts           # authz / IDOR / vote-dedup / vote-route tests
tests/rate-limit.test.ts                 # unit + integration tests for rate limiting
tests/dashboard-auth.test.ts             # authorize logic + withAdminSession wrapper tests
tests/admin-api.test.ts                  # admin CRUD + changelog + privilege-escalation tests
tests/auth-email.test.ts                 # forgot-password, reset-password, verify-email, resend-verification
tests/setup.ts                           # loads .env.test before Prisma initialises
```

## Environment

`.env` needs:

```
DATABASE_URL="mysql://loopline:<password>@localhost:3306/loopline"
AUTH_SECRET="<random 32+ char string — generate with: openssl rand -base64 32>"

# Email — Mailpit for local dev (install: curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh | bash)
# Start with: mailpit   |   Web UI: http://localhost:8025
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_FROM="Loopline <noreply@loopline.app>"

# Optional — used in email links (defaults to http://localhost:3000)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
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
- Rate limiting: fixed-window in-memory counter; 20 POST req/min per IP
  (all public routes via `withPublicApiKey`), 5 votes/hour per voter cookie
  (vote route); returns 429 + `Retry-After`
- Dashboard auth: Auth.js v5 with Credentials provider; JWT sessions;
  `withAdminSession` wrapper resolves org from session (same IDOR pattern
  as public path); middleware protects `/api/admin/*` and `/dashboard/*`
- Admin API: all routes session-guarded via `withAdminSession`
  - Posts: `GET` (list, filter by status), `PATCH` (status change), `DELETE`
  - Changelog: `GET` (list incl. drafts), `POST` (create), `PATCH` (update),
    `DELETE`, `POST .../publish` (idempotent draft → published)
  - Slug uniqueness enforced at DB level (P2002 → 409)
- Privilege-escalation tests: public `pk_` key → 401 on all admin routes
- Test suite (47 tests) across 4 files; sequential execution
- Embeddable widget: `public/widget.js` loader (IIFE, vanilla JS) injects a
  floating button + iframe; `app/widget/page.tsx` serves the widget UI inside
  the iframe; postMessage protocol: widget→parent `resize` + `close`,
  parent→widget `open` / `close`; test page at `/widget-test.html`
- Dashboard UI foundation:
  - `components/ui/` — `Button`, `Input`, `Alert` reusable components
  - Route groups: `(www)` marketing layout, `(app)/(auth)` centered auth shell,
    `(app)/(dashboard)` sidebar + topbar layout with auth guard in layout
  - `/login` — credentials form, `React.SubmitEvent` type, cursor-pointer fix
  - `/register` — two-step wizard; step 1 validates with `registerSchema.pick()`,
    step 2 submits full schema; client+server Zod (shared `lib/validations/register.ts`)
  - `proxy.ts` — replaces deprecated `middleware.ts` in Next.js 16; Edge-safe
    auth guard; `z.flattenError()` migration across all routes (Zod v4)
- Homepage: landing page with nav, hero + code snippet, 6 feature cards,
  how-it-works steps, CTA banner, footer; lives in `app/(www)/page.tsx`
- Forgot password + email verification:
  - Mailpit for local SMTP (port 1025, UI at http://localhost:8025)
  - `lib/email.ts` — Nodemailer transporter, `generateToken` (plain + SHA-256 hash),
    `hashToken`, HTML email templates
  - `User` schema: added `emailVerified`, `verifyToken`, `resetToken`, `resetTokenExpiry`
  - Forgot password: token hashed → stored; plain token → emailed; 1h expiry
  - Reset password: validates hashed token + expiry, re-hashes new password, clears token
  - Email verify: register auto-sends; `GET /api/auth/verify-email?token=` marks verified;
    resend endpoint available; always-200 responses to avoid email enumeration
  - New pages: `/forgot-password`, `/reset-password`, `/verify-email`
  - "Forgot password?" link added to login form
- Test suite (62 tests) across 5 files: always-200 email enumeration guard,
  token hashed in DB, expired/invalid token → 400, verified users blocked
  from resend; sendEmail mocked via vi.mock to avoid SMTP in CI

### Pending (roughly in build order)
1. Full dashboard UI (posts management, changelog management, API key display)
2. Public changelog page (ISR)
3. CI/CD pipeline + deployment

## Conventions

- TypeScript strict mode; avoid `any`.
- Org-scoping on every tenant query (see invariants).
- Zod validation on all external input.
- The middleware owns request typing; route handlers receive a typed `req` from
  the wrapper rather than importing request types themselves.
- Keep public and admin concerns in separate route trees
  (`/api/public/*` vs `/api/admin/*`).