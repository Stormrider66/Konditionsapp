# CLAUDE.md

## Git Workflow

Always commit and push directly to `main`. Do NOT create feature branches or pull requests unless explicitly asked. After making changes, commit with a clear message and `git push origin main`.

## Project Overview

**Elite Training Platform** - Next.js 16 SaaS for physiological testing, AI training programs, and athlete management. Multi-tenant architecture for coaches, athletes, and physiotherapists.

## Commands

```bash
npm run dev          # Dev server http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest
npm run test:e2e     # Playwright
npx prisma generate  # After schema changes
npx prisma db push   # Push schema (dev) — must load env vars, see below
npx prisma studio    # View/edit data
npx prisma migrate dev --name <name>  # Create migration
```

### Prisma & Database Connection

Env vars are in `.env.local` (not `.env`). Prisma doesn't auto-load `.env.local`, so load them manually:

```bash
export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && npx prisma db push
```

**DIRECT_DATABASE_URL** must use the Supabase **Session Mode (port 5432)** pooler hostname — the old `db.*.supabase.co` hostname is IPv6-only and unreachable from most local networks:

```
# ✅ Correct — pooler on port 5432
postgresql://postgres.rzvznvaxpxsfqfmhbept:[pw]@aws-1-eu-north-1.pooler.supabase.com:5432/postgres

# ❌ Wrong — IPv6-only, unreachable locally
postgresql://postgres:[pw]@db.rzvznvaxpxsfqfmhbept.supabase.co:5432/postgres
```

## Tech Stack

Next.js 16 (App Router) | TypeScript (strict) | PostgreSQL/Supabase | Prisma ORM (192 models) | Supabase Auth | Tailwind + shadcn/ui (40 components) | React Hook Form + Zod | Recharts | jsPDF | Stripe | Remotion (video) | Vercel AI SDK

## Architecture

```
app/
├── (business)/[businessSlug]/    → Multi-tenant routes (primary)
│   ├── athlete/                  → 53 athlete pages
│   ├── coach/                    → 66 coach pages
│   └── physio/                   → 8 physio pages
├── api/                          → 463 API routes
├── athlete/, coach/, physio/     → Legacy routes (redirect to business-scoped)
└── (public routes)               → login, signup, pricing, etc.

components/                       → 574 components
lib/
├── calculations/                 → Threshold detection, zones, VDOT
├── training-engine/              → 28 modules (methodologies, sport-specific, injury, ergometer)
├── program-generator/            → Periodization, workout building
├── ai/                           → Multi-provider AI, RAG, video analysis, voice, cost tracking
├── integrations/                 → Strava, Garmin, Concept2, VBT
├── subscription/                 → Feature gating, trial management
└── data-moat/                    → ML predictions, coach decisions
```

## Critical Conventions

### Calculations (`lib/calculations/`)
- **Anaerobic threshold = SECOND crossing of 4 mmol/L** (not first)
- Use **linear interpolation** between test stages
- Test stages must be sorted by `sequence` before calculations
- Check `testType` for relevant fields: Running→`speed`, Cycling→`power`, Skiing→`pace`

### TrainingLoad rows (`source` discriminator)
Two kinds of rows live in `TrainingLoad`: `WORKOUT` (one per logged session; the default) and `ACWR_SUMMARY` (one per athlete/day from the nightly `calculate-acwr` cron — its `dailyLoad` **duplicates** the day's workout rows, and it is the **only** carrier of `acuteLoad`/`chronicLoad`/`acwr`). Every query must pick a side: load sums filter `source: 'WORKOUT'` (else ~2× double-count); ACWR reads filter `source: 'ACWR_SUMMARY'` (else a workout logged after the 2 AM cron masks the values).

### Code Standards
- Always use `@/` import prefix
- Validate with Zod schemas (`lib/validations/schemas.ts`)
- Use Prisma client singleton from `lib/prisma.ts`
- Handle Prisma errors (unique constraints, FK violations)
- Use transactions for multi-step operations

### Test Types & Sports
```typescript
type TestType = 'RUNNING' | 'CYCLING' | 'SKIING'
```
18 sport types: Endurance (Running, Cycling, Skiing, Swimming, Triathlon) | Functional (HYROX, General Fitness, Functional Fitness, Strength) | Team (Football, Ice Hockey, Handball, Floorball, Basketball, Volleyball) | Racket (Tennis, Padel)

## Roles & Subscriptions

**Roles:** `COACH` | `ATHLETE` | `PHYSIO` | `ADMIN`

**Coach Tiers:** FREE (trial, 1 athlete) → BASIC (5) → PRO (50) → ENTERPRISE (unlimited)
**Athlete Tiers:** FREE → STANDARD → PRO → ELITE

Route protection in `middleware.ts` (includes custom domain white-label support, CSRF protection). Subscription enforcement via `lib/subscription/feature-access.ts`.

## AI System

**Providers (BYOK - encrypted user API keys):**
- Anthropic: Haiku 4.5, Sonnet 4.6, Opus 4.7
- Google: Gemini 3.1 Flash Lite, Gemini 3.5 Flash, Gemini 3.1 Pro
- OpenAI: GPT-5.3 Instant, GPT-5 Mini, GPT-5.4

**ModelIntent:** `fast` | `balanced` | `powerful` — provider-agnostic model selection

**Capabilities:** Program generation, daily WOD (readiness/injury-aware), nutrition, video analysis (MediaPipe + Gemini), voice workouts, document RAG (pgvector), web search, mental prep, pattern/milestone detection, conversation memory, cost tracking

## Training Engine (`lib/training-engine/`)

**Methodologies:** Polarized (80/20), Norwegian (double threshold), Canova (marathon %), Pyramidal
**Sport Modules:** Basketball, Football, Hockey, Handball, Floorball, Volleyball, Tennis, Padel
**Threshold Detection:** Standard D-max, Modified D-max (Bishop), Smart D-max
**Injury Management:** Delaware pain rules, ACWR monitoring (OPTIMAL/CAUTION/DANGER/CRITICAL)
**Progression:** 1RM estimation (Epley/Brzycki), 2-for-2 rule, plateau detection
**Ergometer:** 11+ protocols, Concept2/Wattbike/Air Bikes, critical power analysis

## Cron Jobs (`app/api/cron/`)

17 scheduled jobs: `calculate-acwr` (nightly), `expire-trials`, `trial-warnings`, `morning-briefings`, `pattern-detection`, `milestone-detection`, `reset-ai-usage`, `reset-budgets`, `weekly-summary`, `injury-digest`, `coach-alerts`, `mental-prep`, `post-workout-checkins`, `preworkout-nudges`, `poll-program-generation`, `poll-research`, `agent/*`

## Environment Variables

```env
# Core
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL
# Auth
USE_JWT_CLAIMS=true         # Middleware reads claims from Supabase custom_access_token_hook; unset/false falls back to DB lookup
INTERNAL_DISPATCH_SECRET    # Shared secret for /api/agent-tools/dispatch webhook fan-out
# Services
RESEND_API_KEY / STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET
# Integrations
STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / GARMIN_CONSUMER_KEY / GARMIN_CONSUMER_SECRET
# Webhook URL tokens (opt-in gates — Strava/Garmin/Concept2 don't sign POSTs).
# When set, the webhook URL registered with the provider MUST include
# ?token=<value>, otherwise events are rejected with 401. Set the env var and
# re-register the provider webhook URL together.
STRAVA_WEBHOOK_URL_TOKEN / GARMIN_WEBHOOK_URL_TOKEN / CONCEPT2_WEBHOOK_URL_TOKEN
# Optional
NEXT_PUBLIC_SENTRY_DSN / UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN / YOUTUBE_API_KEY
```

Note: AI provider API keys are managed per-user (encrypted in DB), not via env vars.

## Supabase Auth Hook (JWT Claims)

A Postgres function `public.custom_access_token_hook` enriches every Supabase access token with `app_metadata.{dbUserId, role, adminRole, primarySlug, memberBusinessSlugs, selfAthleteClientId}` so `proxy.ts` can authorize requests without hitting the DB on every hop.

- SQL lives in `prisma/migrations/20260418_custom_access_token_hook/migration.sql`.
- Registered in **Supabase Dashboard → Authentication → Hooks → Customize Access Token (JWT) Claims** (Postgres / schema `public` / function `custom_access_token_hook`). Setup walkthrough: `docs/deployment/supabase-auth-hook.md`.
- Gated by Vercel env var **`USE_JWT_CLAIMS=true`** (production + preview). If this flag is unset or `false`, middleware falls back to the legacy DB lookup — safe emergency rollback without touching the dashboard.
- If you disable the hook in the dashboard, also set `USE_JWT_CLAIMS=false` in Vercel so middleware stops expecting claims that aren't there.
- Schema drift: if you change `User`, `Business`, or `BusinessMember` columns the function reads, update the migration + re-apply, otherwise claims will silently be `null`.
- Watch Supabase logs for `custom_access_token_hook failed:` entries — the function has a try/catch that returns original claims on error so sign-in never blocks, but silent failures push users onto the slow DB-lookup path.

## Email Kill Switch

All outbound email is paused until launch. Set `EMAILS_PAUSED=true` in env to suppress (active in `.env.local` and must be added to Vercel). Remove or set to anything other than `true` to re-enable. Guard is applied in `lib/email/index.ts` and all 5 files that call Resend directly.

## Known Issues

- Lactate curve validation not enforced (users can input decreasing values)
- Economy calculations skip stages without VO2 data
- PDF export may timeout on slow connections for large reports

## Future Work / Watchpoints

Post-`v2.0.0`. Not urgent, worth checking periodically:

- **Supabase logs**: grep for `custom_access_token_hook failed:` — silent errors push users onto the slow DB-lookup fallback.
- **Stripe webhook**: dry-run a few events through the new idempotency path before peak billing cycles.
- **Lint warnings**: 1769 baseline, enforced via `--max-warnings` in the `lint` script (the build fails if it rises). Lower the gate in `package.json` whenever you reduce the count.
- **MediaPipe**: unmaintained, no declared React peer. Plan a 1–2 day migration to `@mediapipe/tasks-vision` before the next React major bump.
- **`videos` storage bucket**: never verified post-launch. When video-analysis gets real usage, confirm its RLS policies match `video-analysis` (private + 100 MB limit).
- **PoseAnalyzer.tsx (1422 LOC) + ConfigurationForm.tsx (1073 LOC)**: still above the 500-LOC target. Decompose further only when actively editing.

- **Food-scanner memory (Phases 1–4-lite shipped 2026-04-22)**: history-as-prompt-context, portion calibration, correction capture, and a correction-aware prompt extension are all live. The original Phase 4 (nightly fingerprint cron + pgvector retrieval) was deliberately **scrapped** in favor of "4-lite" — when the second pass fires, `buildFoodMemoryContext` also queries the last 60 days of `FoodScanCorrection` and prepends up to ~8 high-signal lines (recurring name swaps, systematic grams bias, frequently-added/removed items). No new table, no cron, no embeddings. Rationale: per-user corpus is small enough that in-context beats retrieval, and avoiding pgvector removes a whole layer of infra that didn't earn its keep. Watchpoints: `food_scan_memory` vs `food_scan` ratio in `AIUsageLog` (how often pass 2 fires), `memoryCorrectionHintsIncluded` rate in debug logs (are corrections actually getting injected), and any user reports of the "Personaliserad" badge producing worse scans.
