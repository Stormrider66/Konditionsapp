# CLAUDE.md

## Project Overview

**Elite Training Platform** - Next.js 15 SaaS for physiological testing, AI training programs, and athlete management. Multi-tenant architecture for coaches, athletes, and physiotherapists.

## Commands

```bash
npm run dev          # Dev server http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest
npm run test:e2e     # Playwright
npx prisma generate  # After schema changes
npx prisma db push   # Push schema (dev)
npx prisma studio    # View/edit data
npx prisma migrate dev --name <name>  # Create migration
```

## Tech Stack

Next.js 15 (App Router) | TypeScript (strict) | PostgreSQL/Supabase | Prisma ORM (192 models) | Supabase Auth | Tailwind + shadcn/ui (40 components) | React Hook Form + Zod | Recharts | jsPDF | Stripe | Remotion (video) | Vercel AI SDK

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
- Anthropic: Haiku 4.5, Sonnet 4.6, Opus 4.6
- Google: Gemini 3 Flash, Gemini 3.1 Pro
- OpenAI: GPT-5 Nano, GPT-5 Mini, GPT-5.2

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
# Services
RESEND_API_KEY / STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET
# Integrations
STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / GARMIN_CONSUMER_KEY / GARMIN_CONSUMER_SECRET
# Optional
NEXT_PUBLIC_SENTRY_DSN / UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN / YOUTUBE_API_KEY
```

Note: AI provider API keys are managed per-user (encrypted in DB), not via env vars.

## Known Issues

- Lactate curve validation not enforced (users can input decreasing values)
- Economy calculations skip stages without VO2 data
- PDF export may timeout on slow connections for large reports
