# CLAUDE.md

## Project Overview

**VO2max/Konditionstest Report Generator** - Next.js 15 web app for professional physiological test reports. Built for Star by Thomson.

**Core Features:**
1. **Physiological Testing** - Lab test reports (VO2max, lactate thresholds, training zones)
2. **Training Programs** - Year-round endurance programs with athlete portals
3. **Elite Training Engine** - Monitoring, field tests, methodologies (Polarized, Norwegian, Canova)
4. **Strength Training** - Periodized programs with 84-exercise library, auto-progression
5. **Multi-Sport** - 17 sports (endurance, team sports, racket sports)
6. **AI Studio** - AI-powered program creation with document RAG
7. **External Integrations** - Strava, Garmin, Concept2, VBT devices
8. **Ergometer Testing** - 11+ protocols (4×4, CP tests, 2K TT, MAP ramp, etc.)
9. **Calendar System** - Race events, altitude camps, training impact tracking

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

Next.js 15 (App Router) | TypeScript (strict) | PostgreSQL/Supabase | Prisma ORM | Supabase Auth | Tailwind + shadcn/ui | React Hook Form + Zod | Recharts | jsPDF | Stripe

## Directory Structure

```
app/           → Next.js App Router (api/, coach/, athlete/, clients/, test/)
components/    → UI (coach/, athlete/, forms/, charts/, reports/, ui/, ai-studio/, hybrid-studio/)
lib/           → Core logic (calculations/, training-engine/, program-generator/, integrations/, ai/)
types/         → TypeScript types (index.ts)
prisma/        → Schema (122 models), seed-exercises.ts
docs/          → Documentation (training-engine/, database/, API_REFERENCE.md)
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

- `COACH` - Creates clients, tests, programs
- `ATHLETE` - Views programs, logs workouts
- `PHYSIO` - Manages rehabilitation, restrictions, treatments
- `ADMIN` - Full system access

Route protection in `middleware.ts`. Subscription tiers (Stripe): FREE, STANDARD, PREMIUM, ENTERPRISE - controls athlete limits and feature access (AI chat, video analysis, Strava/Garmin sync).

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
RESEND_API_KEY=           # Email
STRIPE_SECRET_KEY=        # Payments
STRAVA_CLIENT_ID=         # Strava OAuth
STRAVA_CLIENT_SECRET=
GARMIN_CONSUMER_KEY=      # Garmin OAuth
GARMIN_CONSUMER_SECRET=
```

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
node scripts/chrome-debug.js navigate <url> # Navigate
```

## Key Systems

### External Integrations (`lib/integrations/`)
- **Strava** - OAuth sync, activity import (`StravaActivity` model)
- **Garmin** - OAuth sync, activity import (`GarminActivity` model)
- **Concept2** - Ergometer data sync (`Concept2Result` model)
- **VBT** - Velocity-based training devices, load-velocity profiles (`VBTSession`, `VBTMeasurement`)

### Elite Training Engine (`lib/training-engine/`)
- D-max threshold detection, TSS/TRIMP calculations
- 4 methodologies: Polarized (80/20), Norwegian, Canova, Pyramidal
- Injury management (Delaware pain rules), cross-training conversion
- HRV/RHR monitoring, readiness assessment, ACWR calculation
- **Docs:** `docs/training-engine/`

### Ergometer Testing (`lib/training-engine/ergometer/`)
- 11+ protocols: 4×4 intervals, 3-min all-out, CP tests, 2K/1K TT, MAP ramp, etc.
- Zone calculation, threshold detection, benchmarking
- Team leaderboards with power/pace/watts-per-kg sorting
- Models: `ErgometerFieldTest`, `ErgometerThreshold`, `ErgometerZone`, `ErgometerBenchmark`

### Strength Training
- 5-phase periodization (AA → Max Strength → Power → Maintenance → Taper)
- 1RM estimation (Epley/Brzycki), 2-for-2 progression rule
- 84 exercises in 6 biomechanical pillars
- Interference management (no heavy strength <48h before key running)
- **Seed:** `npx ts-node prisma/seed-exercises.ts`

### AI Systems (`lib/ai/`, `app/api/ai/`)
- **AI Studio** - Claude + Gemini, document RAG (pgvector), BYOK support
- **AI WOD** - Readiness-aware daily workout generation, injury-aware exercise exclusion
- **Video Analysis** - Running gait, skiing technique, HYROX station analysis (MediaPipe + Gemini)
- Models: `AIConversation`, `AIMessage`, `AIGeneratedWOD`, `VideoAnalysis`

### Calendar & Events (`app/api/calendar-events/`)
- Event types: races, altitude camps, competitions, illness, travel, rest days
- Training impact levels: FULL_TRAINING, REDUCED, NO_TRAINING, REST_DAY, ALTITUDE_ADAPTATION
- Recurrence rules, conflict detection, external calendar sync
- Model: `CalendarEvent`

### Hybrid Workouts (`components/hybrid-studio/`)
- Combining multiple workout types (strength + cardio + skills)
- Versioning, detailed logging per round
- Models: `HybridWorkout`, `HybridMovement`, `HybridWorkoutResult`

### Multi-Sport (`SportProfile` model)
- Sport-specific onboarding (6-step wizard)
- Sport-specific coach dashboards (`components/coach/sport-views/`)

### Physio System (`app/api/physio/`, `app/physio/`)
- **Rehab Programs** - Phase-based rehabilitation (ACUTE → SUBACUTE → REMODELING → FUNCTIONAL → RETURN_TO_SPORT)
- **Training Restrictions** - AI WOD integration, body part/exercise blocking, intensity caps
- **Treatment Sessions** - SOAP-format documentation, modality tracking
- **Care Team Communication** - Thread-based messaging between physio, coach, athlete
- **Physio Assignments** - Flexible scoping (client, team, organization, business, location)
- Models: `PhysioAssignment`, `RehabProgram`, `RehabExercise`, `RehabMilestone`, `RehabProgressLog`, `TrainingRestriction`, `TreatmentSession`, `CareTeamThread`
- **Docs:** `docs/physio-system/`

### Additional Systems
- **Menstrual Cycle Tracking** - Phase tracking with training integration (`MenstrualCycle`, `MenstrualDailyLog`)
- **Audio Journals** - Voice logs for athlete check-ins (`AudioJournal`)
- **Nutrition** - Dietary preferences, macro goals (`DietaryPreferences`, `NutritionGoal`)
- **Business/Locations** - Multi-tenant support (`Business`, `Location` models)
- **Referral System** - Codes, tracking, rewards (`ReferralCode`, `Referral`, `ReferralReward`)

### Cron Jobs (`app/api/cron/`)
- `calculate-acwr/` - Nightly ACWR calculation (injury risk zones: OPTIMAL, CAUTION, DANGER, CRITICAL)
- `injury-digest/` - Injury status summaries

## Documentation References

| Topic | Location |
|-------|----------|
| API endpoints (300+ routes) | `docs/API_REFERENCE.md` |
| Database ER diagram | `docs/database/erd.svg` |
| Training engine | `docs/training-engine/` |
| Physio system | `docs/physio-system/` |
| Athlete dashboard data flow | `docs/ATHLETE_DASHBOARD_CONNECTIONS.md` |
| Complete database schema | `prisma/schema.prisma` (130+ models) |
| TypeScript types | `types/index.ts` |

## Known Issues

- Lactate curve validation not enforced (users can input decreasing values)
- Economy calculations skip stages without VO2 data
- PDF export may timeout on slow connections for large reports
