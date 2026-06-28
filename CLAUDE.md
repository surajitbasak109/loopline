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
- **Email:** Resend SDK (production) / Nodemailer + Mailpit (local dev) — branched on `RESEND_API_KEY`
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
components/ui/Button.tsx                        # reusable button (primary/secondary/ghost/danger, loading spinner)
components/ui/Input.tsx                         # reusable input (label, error, hint, prefix slot)
components/ui/Alert.tsx                         # reusable alert (error/success/info)
components/ui/Modal.tsx                         # reusable modal (backdrop, Escape-to-close, click-outside-to-close)
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
lib/email.ts                                    # Email: Resend SDK (prod, RESEND_API_KEY set) or Nodemailer/Mailpit (dev); generateToken/hashToken, templates
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
components/Dashboard/SidebarNav.tsx      # client nav with usePathname() active-state highlighting
components/Dashboard/StatsCard.tsx       # stat card (label + number)
components/Dashboard/StatusBadge.tsx     # coloured pill for PostStatus values
components/Dashboard/PostsTable.tsx      # client: filter tabs, inline status change, delete
components/Dashboard/ChangelogList.tsx   # client: entry list, create form, publish, delete
components/Dashboard/OrgSettings.tsx     # client: org name/slug/API-key (hidden by default, eye toggle, copy, regenerate via modal)
app/api/admin/org/regenerate-key/route.ts       # POST — generates new pk_ key, persists, returns it
app/(app)/(dashboard)/dashboard/feedback/page.tsx   # server page — fetches posts, passes to PostsTable
app/(app)/(dashboard)/dashboard/changelog/page.tsx  # server page — fetches entries, passes to ChangelogList
app/(app)/(dashboard)/dashboard/settings/page.tsx   # server page — fetches org, passes to OrgSettings
app/(www)/changelog/[orgSlug]/page.tsx              # public changelog list (ISR, revalidate=60, paginated)
app/(www)/changelog/[orgSlug]/[entrySlug]/page.tsx  # public changelog entry detail (ISR, marked for MD→HTML)
components/Changelog/ChangelogPagination.tsx        # client: rows-per-page dropdown (10/25/50/100) + prev/next
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
  - `lib/email.ts` — dual email backend: Resend SDK when `RESEND_API_KEY` is set
    (production), Nodemailer + Mailpit otherwise (local dev); `generateToken`, `hashToken`, HTML templates
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
- Full dashboard UI:
  - `SidebarNav` client component — `usePathname()` active-state highlighting
  - `/dashboard` overview — 4 stat cards (total feedback, open, changelog entries, published)
  - `/dashboard/feedback` — all posts, filter tabs by status, inline status dropdown, delete
  - `/dashboard/changelog` — entry list (Draft/Published badges), inline create form
    (Title, Slug auto-filled from title, Body markdown), Publish + Delete actions
  - `/dashboard/settings` — org name, slug, publishable API key with one-click copy
  - Client components define local PostStatus types (no @prisma/client import); server
    pages query Prisma directly and serialize dates before passing to client components
- API key management:
  - Key hidden by default; eye-icon toggle reveals/masks it (prefix `pk_` always visible)
  - "Regenerate key" opens a `Modal` confirmation before calling `POST /api/admin/org/regenerate-key`
  - `Button` gained a `danger` variant (red); `Modal` is reusable for any confirmation dialog
- Public changelog pages (ISR):
  - `GET /changelog/[orgSlug]` — published entries list; 404 if org not found
  - `GET /changelog/[orgSlug]/[entrySlug]` — full entry; drafts return 404
  - `revalidate = 60` + `dynamicParams = true`; `generateStaticParams` pre-builds known slugs
  - `marked` renders body markdown → HTML; styled with Tailwind arbitrary variants (no plugin)
  - `generateMetadata` for proper `<title>` tags
  - Server-side pagination via `?page=` and `?limit=` searchParams (10/25/50/100 per page, default 10)
  - `ChangelogPagination` client component: rows-per-page dropdown resets to page 1 on change;
    prev/next navigate via `useRouter`; displays `X–Y of N` count

- CI/CD:
  - `.github/workflows/ci.yml` — triggers on push to `main`/`feature/**` and PRs; spins up
    MySQL 8 service container; runs `pnpm install → prisma migrate deploy → tsc → vitest`
  - `package.json` `postinstall: "prisma generate"` — Vercel runs this before `next build`
  - `lib/prisma.ts` updated to handle `?ssl=true` / `?ssl-mode=REQUIRED` query params (Aiven)
  - `.env.example` with all required vars and comments for local vs production setup

### Deployment (Vercel + Aiven)
1. Create a **free Aiven MySQL** cluster → copy the Service URI as `DATABASE_URL`
2. Push the repo to GitHub and import it in **Vercel**
3. Set env vars in Vercel dashboard (copy from `.env.example`):
   - `DATABASE_URL` — Aiven Service URI (includes `?ssl-mode=REQUIRED`)
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `RESEND_API_KEY` — from resend.com → API Keys (triggers Resend SDK path)
   - `SMTP_FROM` — `Loopline <noreply@yourdomain.com>` (verified Resend domain)
   - `NEXT_PUBLIC_APP_URL` — your Vercel deployment URL
4. Vercel auto-detects pnpm, runs `postinstall` (prisma generate), then `next build`
5. Run `prisma migrate deploy` once against the Aiven DB to apply migrations:
   `DATABASE_URL="<aiven-url>" pnpm prisma migrate deploy`

### Pending
None — project is feature-complete.

## Conventions

- TypeScript strict mode; avoid `any`.
- Org-scoping on every tenant query (see invariants).
- Zod validation on all external input.
- The middleware owns request typing; route handlers receive a typed `req` from
  the wrapper rather than importing request types themselves.
- Keep public and admin concerns in separate route trees
  (`/api/public/*` vs `/api/admin/*`).