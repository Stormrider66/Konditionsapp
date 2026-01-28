# CLAUDE.md

## Project Overview

**Elite Training Platform** - Enterprise-grade Next.js 15 SaaS for physiological testing, AI-powered training programs, and athlete management. Multi-tenant architecture supporting coaches, athletes, and physiotherapists.

**Core Capabilities:**
1. **Physiological Testing** - Lab VO2max/lactate tests with D-max threshold detection, training zone calculation
2. **AI Training Engine** - Multi-model AI (Claude/Gemini/GPT) with document RAG, program generation, daily WOD
3. **Training Programs** - Year-round periodization with 4 methodologies (Polarized, Norwegian, Canova, Pyramidal)
4. **Strength Training** - 5-phase periodization, 84-exercise library, 1RM estimation, 2-for-2 progression
5. **Multi-Sport** - 17 sports (endurance, team, racket) with sport-specific dashboards and testing
6. **External Integrations** - Strava, Garmin, Concept2, VBT devices with automatic sync
7. **Video Analysis** - Running gait, skiing technique, HYROX analysis (MediaPipe + Gemini)
8. **Physio System** - Rehabilitation programs, training restrictions, care team coordination
9. **Data Moat** - Proprietary ML system for coach decision tracking and performance predictions

## Commands

```bash
npm run dev          # Dev server http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest
npm run test:e2e     # Playwright

# Database
npx prisma generate  # After schema changes
npx prisma db push   # Push schema (dev)
npx prisma studio    # View/edit data
npx prisma migrate dev --name <name>  # Create migration
```

## Tech Stack

Next.js 15 (App Router) | TypeScript (strict) | PostgreSQL/Supabase | Prisma ORM (173 models) | Supabase Auth | Tailwind + shadcn/ui | React Hook Form + Zod | Recharts | jsPDF | Stripe

## Architecture

```
app/
├── (business)/[businessSlug]/    → Multi-tenant routes (primary)
│   ├── athlete/                  → 38+ athlete pages
│   ├── coach/                    → 60+ coach pages
│   └── physio/                   → 9 physio pages
├── api/                          → 402 API routes (82 categories)
├── athlete/, coach/, physio/     → Legacy routes (redirect to business-scoped)
└── (public routes)               → login, signup, pricing, etc.

components/                       → 440+ components
├── athlete/                      → Sport dashboards, workout logging, WOD
├── coach/                        → Program builder, monitoring, studios
├── ai-studio/                    → AI chat, program generation, RAG
├── hybrid-studio/                → Multi-workout builder
├── agility-studio/               → Agility training, timing gates
└── ui/                           → shadcn/ui (39 components)

lib/
├── calculations/                 → Threshold detection, zones, VDOT
├── training-engine/              → 25+ modules (methodologies, injury, ergometer)
├── program-generator/            → Periodization, workout building
├── ai/                           → Multi-provider AI, RAG, analysis
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

### Test Types
```typescript
type TestType = 'RUNNING' | 'CYCLING' | 'SKIING'
```

## User Roles & Subscriptions

**Roles:** `COACH` | `ATHLETE` | `PHYSIO` | `ADMIN`

**Coach Tiers:** FREE (trial, 1 athlete) → BASIC (5) → PRO (50) → ENTERPRISE (unlimited)
**Athlete Tiers:** FREE → STANDARD → PRO

**Feature Gating:** AI chat, video analysis, Strava/Garmin sync, workout logging

Route protection in `middleware.ts`. Subscription enforcement via `lib/subscription/feature-access.ts`.

## Environment Variables

```env
# Core
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Services
RESEND_API_KEY=              # Email
STRIPE_SECRET_KEY=           # Payments
STRAVA_CLIENT_ID/SECRET=     # Strava OAuth
GARMIN_CONSUMER_KEY/SECRET=  # Garmin OAuth
```

## Key Systems

### Training Engine (`lib/training-engine/`)
- **Methodologies:** Polarized (80/20), Norwegian (double threshold), Canova (marathon %), Pyramidal
- **Threshold Detection:** Standard D-max, Modified D-max (Bishop), Smart D-max
- **Injury Management:** Delaware pain rules, ACWR monitoring (OPTIMAL/CAUTION/DANGER/CRITICAL)
- **Progression:** 1RM estimation (Epley/Brzycki), 2-for-2 rule, plateau detection
- **Cross-Training:** Modality equivalencies, automatic substitution, fitness retention

### AI Systems (`lib/ai/`)
- **Providers:** Claude, Gemini, GPT-4.5 with BYOK support
- **RAG:** Document embeddings (pgvector), semantic search
- **Generation:** Programs, daily WOD (readiness/injury-aware), nutrition plans
- **Analysis:** Performance trends, training correlation, pattern detection
- **Memory:** Conversation persistence, athlete context extraction

### Ergometer Testing (`lib/training-engine/ergometer/`)
- **Protocols:** 4×4 intervals, 3-min all-out, CP tests, 2K/1K TT, MAP ramp (11+ total)
- **Devices:** Concept2 (Row/SkiErg/BikeErg), Wattbike, Air Bikes
- **Analysis:** Critical power, threshold detection, zone calculation, team leaderboards

### Physio System (`app/api/physio/`)
- **Rehab Phases:** ACUTE → SUBACUTE → REMODELING → FUNCTIONAL → RETURN_TO_SPORT
- **Restrictions:** Body part/exercise blocking, intensity caps (integrated with AI WOD)
- **Treatment:** SOAP-format documentation
- **Care Team:** Thread-based messaging (physio, coach, athlete)

### Data Moat (`lib/data-moat/`)
- Coach decision logging with outcome tracking
- Performance predictions with validation
- Training-to-outcome correlation analysis
- Athlete cohort benchmarking

### External Integrations (`lib/integrations/`)
| Service | Features | Auth |
|---------|----------|------|
| Strava | Activity import, HR/power/cadence | OAuth2 |
| Garmin | GPS routes, HR data | OAuth1 |
| Concept2 | Ergometer workouts | API Key |
| VBT | Load-velocity profiles | Direct upload |

## Cron Jobs (`app/api/cron/`)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `calculate-acwr` | Nightly | ACWR injury risk calculation |
| `expire-trials` | Daily | Expire ended trial subscriptions |
| `trial-warnings` | Daily | Email trials expiring in 3 days |
| `morning-briefings` | Morning | Daily athlete briefings |
| `pattern-detection` | Daily | Detect training patterns |
| `milestone-detection` | Daily | Auto-detect PRs and achievements |
| `reset-ai-usage` | Daily | Reset daily AI token budgets |
| `weekly-summary` | Weekly | Generate weekly summaries |
| `injury-digest` | Weekly | Injury status summaries |

## Documentation

| Topic | Location |
|-------|----------|
| API Reference (402 routes) | `docs/API_REFERENCE.md` |
| Database Schema (173 models) | `prisma/schema.prisma` |
| Training Engine | `docs/training-engine/` |
| Physio System | `docs/physio-system/` |
| TypeScript Types | `types/index.ts` |

## Chrome Debugging

```powershell
# Start Chrome with debugging (close all Chrome first)
& "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=C:/temp/chrome-debug http://localhost:3000
```

```bash
node scripts/chrome-debug.js tabs           # List tabs
node scripts/chrome-debug.js screenshot     # Screenshot
node scripts/chrome-debug.js console        # Console logs
node scripts/chrome-debug.js eval "..."     # Execute JS
```

## Known Issues

- Lactate curve validation not enforced (users can input decreasing values)
- Economy calculations skip stages without VO2 data
- PDF export may timeout on slow connections for large reports
