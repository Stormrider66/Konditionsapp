# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **VO2max/Konditionstest Report Generator** - a Next.js 15 web application for generating professional physiological test reports from running, cycling, and skiing test data. Built for Star by Thomson to automate the creation of professional test reports with calculations for lactate thresholds, training zones, VO2max, and running economy.

**Key purpose**: Transform 30-60 minute manual report generation into a <1 minute automated process with standardized calculations and professional formatting.

**Major features**:
1. **Physiological Testing** - Lab test report generation (original core functionality)
2. **Training Programs** - Year-round endurance training programs with athlete portals
3. **Elite Training Engine** - Advanced monitoring, field tests, methodologies (Polarized, Norwegian, Canova)
4. **Strength Training** - Periodized strength programs with automatic progression tracking
5. **Multi-Sport Support** - 7 sports (Running, Cycling, Swimming, Triathlon, HYROX, Skiing, General Fitness) with sport-specific onboarding and coach dashboards

## Development Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000

# Build & Production
npm run build            # Build for production
npm start                # Start production server

# Linting
npm run lint             # Run ESLint

# Database
npx prisma generate      # Generate Prisma client after schema changes
npx prisma db push       # Push schema changes to database (development)
npx prisma studio        # Open Prisma Studio to view/edit data
npx prisma migrate dev   # Create and apply migrations (development)
```

## Chrome Browser Debugging (Claude Code Tool)

A lightweight Chrome DevTools Protocol helper for browser debugging without MCP overhead.

### Prerequisites

Start Chrome with remote debugging enabled (must close all existing Chrome windows first):

```powershell
# PowerShell (Windows)
& "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=C:/temp/chrome-debug http://localhost:3000
```

### Commands

```bash
# List all open tabs
node scripts/chrome-debug.js tabs

# Take screenshot (saves to current directory)
node scripts/chrome-debug.js screenshot [filename.png]

# Get page HTML
node scripts/chrome-debug.js html

# Capture console logs (listens for 5 seconds)
node scripts/chrome-debug.js console

# Execute JavaScript in page context
node scripts/chrome-debug.js eval "document.title"
node scripts/chrome-debug.js eval "document.querySelectorAll('button').length"

# Navigate to URL
node scripts/chrome-debug.js navigate http://localhost:3000/coach

# Get page info and performance metrics
node scripts/chrome-debug.js info
```

### Usage Tips for Claude Code

- **Screenshots**: Take screenshots to visually inspect UI issues
- **Console logs**: Capture runtime errors and debug output
- **Eval**: Query DOM state, check component counts, inspect data
- **Navigate**: Move between pages to test different views

### Troubleshooting

If "Cannot connect to Chrome on port 9222":
1. Close ALL Chrome windows (including system tray)
2. Restart Chrome with the `--remote-debugging-port=9222` flag
3. Must use `--user-data-dir` for fresh profile to enable debugging

## Tech Stack

- **Framework**: Next.js 15 with App Router and React Server Components
- **Language**: TypeScript (strict mode enabled)
- **Database**: PostgreSQL via Supabase with Prisma ORM
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **PDF Export**: jsPDF with html2canvas
- **Email**: Resend for report email delivery

## Directory Structure

```
konditionstest-app/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   ├── actions/                  # Server actions (auth.ts)
│   ├── coach/                    # Coach pages (programs, tests, monitoring, tools)
│   ├── athlete/                  # Athlete pages (dashboard, workouts, check-in)
│   ├── clients/                  # Client management pages
│   └── test/                     # Test creation pages
├── components/
│   ├── coach/                    # Coach UI (exercise library, program generator, monitoring)
│   ├── athlete/                  # Athlete UI (workout logging, stats, calendar)
│   ├── forms/                    # Form components
│   ├── charts/                   # Recharts components
│   ├── reports/                  # Report templates
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── calculations/             # Core physiological calculations
│   ├── training-engine/          # Elite training system (see below)
│   ├── program-generator/        # Program generation logic
│   ├── supabase/                 # Supabase client/server/middleware
│   ├── validations/              # Zod schemas
│   ├── auth-utils.ts             # Role-based authorization
│   └── prisma.ts                 # Prisma client singleton
├── types/
│   └── index.ts                  # Central TypeScript type definitions
├── prisma/
│   ├── schema.prisma             # Database schema (40+ models)
│   └── seed-exercises.ts         # 84-exercise library seeder
└── docs/
    └── training-engine/          # Detailed training engine documentation
```

## Database Schema (Prisma)

**Core testing models** (original functionality):
- `User`, `Client`, `Team`, `Test`, `TestStage`, `Report`, `TestTemplate`

**Training program models** (Phase 1):
- `TrainingProgram`, `TrainingWeek`, `TrainingDay`, `Workout`, `WorkoutSegment`
- `WorkoutLog`, `Message`, `AthleteAccount`, `Subscription`

**Elite training engine models** (Phases 1-12):
- `AthleteProfile`, `DailyCheckIn`, `DailyMetrics`, `TrainingLoad`
- `ThresholdCalculation`, `FieldTest`, `SelfReportedLactate`
- `InjuryAssessment`, `CrossTrainingSession`, `RaceCalendar`, `Race`
- `WorkoutModification`, `TrainingProgramEngine`

**Strength training models** (Phases 1-8):
- `Exercise` (84 exercises), `ProgressionTracking`, `OneRepMaxHistory`

**Visual Documentation**:
- 📊 **ER Diagram**: See `docs/database/erd.svg` - Auto-generated visual diagram of all 40+ models and relationships
- 📖 **Database Guide**: See `docs/database/README.md` - Complete documentation with relationship explanations

**Complete schema**: See `prisma/schema.prisma` for all 40+ models and relationships.

## Key Code Organization

### Calculations Engine (`lib/calculations/`)

**Physiological testing calculations**:
- `index.ts` - Main coordinator: `performAllCalculations(test, client)`
- `thresholds.ts` - Lactate threshold detection (aerobic ≈2.0 mmol/L, anaerobic ≈4.0 mmol/L)
  - Uses linear interpolation between test stages
  - **Critical**: Anaerobic threshold = **second crossing** of 4 mmol/L (if exists)
- `zones.ts` - Training zones based on max HR and thresholds
- `economy.ts` - Running economy (ml O₂/kg/km)
- `cycling.ts` - FTP, watt/kg, power zones
- `vo2max.ts` - VO2max identification and evaluation

### Training Engine (`lib/training-engine/`)

**Core systems** (see `docs/training-engine/` for detailed documentation):
- `calculations/` - D-max threshold detection, TSS/TRIMP
- `progression/` - 1RM estimation, 2-for-2 rule, plateau detection
- `methodologies/` - Polarized, Norwegian, Canova, Pyramidal implementations
- `generators/` - Exercise selection, plyometric volume control
- `integration/` - Norwegian validation, injury management, multi-system validation
- `scheduling/` - Interference management (strength/running)
- `quality-programming/` - 5-phase strength periodization

### Authorization (`lib/auth-utils.ts`)

**Role-based system**:
- `getCurrentUser()`, `requireCoach()`, `requireAthlete()`, `requireAdmin()`
- `canAccessProgram()`, `canAccessWorkout()`, `canAccessClient()`
- `hasReachedAthleteLimit()` - Subscription enforcement

### Type System (`types/index.ts`)

All TypeScript types centralized. Key types:
- `Test`, `TestStage`, `Client`, `User`, `Team`
- `TestType` = 'RUNNING' | 'CYCLING' | 'SKIING'
- `Threshold`, `TrainingZone`, `TestCalculations`
- `TrainingProgram`, `Workout`, `WorkoutSegment`

## Important Conventions

### Calculation Accuracy
- All calculations must match scientific standards
- Threshold interpolation: **linear interpolation only**, not estimation
- Always validate test stages are sorted by `sequence` before calculations
- Handle edge cases (missing VO2 data, incomplete lactate curves, etc.)

### Test Type Handling
- Check `testType` to determine relevant fields (speed vs power vs pace)
- Running tests require `speed`, cycling requires `power`, skiing requires `pace`

### Data Validation
- All form data validated with Zod schemas in `lib/validations/schemas.ts`
- Client-side: React Hook Form + Zod resolver
- Server-side: Always validate in API routes

### Database Interactions
- Use Prisma client singleton from `lib/prisma.ts`
- Always handle Prisma errors (unique constraints, foreign key violations)
- Use transactions for multi-step operations
- Cascade deletes configured for Test → TestStages, Test → Report

### Path Aliases
- `@/*` maps to project root (configured in `tsconfig.json`)
- Always use `@/` prefix for imports

### UI/UX Patterns
- Forms use multi-step wizards for test data entry
- Charts show dual-axis (HR + lactate) vs intensity (speed/power/pace)
- Responsive design with mobile navigation
- Error handling with toast notifications

## Common Development Tasks

### Adding a New Test Type
1. Add to `TestType` enum in `prisma/schema.prisma` and `types/index.ts`
2. Add relevant fields to `TestStage` model
3. Update `lib/calculations/thresholds.ts` to handle new unit type
4. Update `lib/calculations/zones.ts` for new type
5. Modify `components/forms/TestDataForm.tsx` for input fields
6. Update `components/charts/TestChart.tsx` for axis labels
7. Update `components/reports/ReportTemplate.tsx` to display data

### Debugging Calculation Issues
- Check console logs in `lib/calculations/thresholds.ts` (extensive logging)
- Verify test stages are sorted by `sequence`
- Check correct field (speed/power/pace) exists and is not null
- Validate lactate values are ascending
- Use Prisma Studio to inspect raw database values

## Environment Variables

Required in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=

# Email (optional, for report delivery)
RESEND_API_KEY=
```

## Performance Considerations

- Server-side rendering for initial page loads
- Client-side navigation via Next.js App Router
- Charts may be slow with >20 test stages
- Database queries: 18+ indexes for <500ms performance with 500+ athletes

## Deployment

- Designed for Vercel deployment
- Database hosted on Supabase
- Build command: `npm run build`

---

## Elite Training Engine (Phases 1-12 COMPLETE)

**Overview**: Production-ready elite training system with automatic adaptation based on athlete monitoring, lactate testing, field tests, injury management, and cross-training integration.

### Key Capabilities

- 🧪 **D-max threshold detection** from lactate curves (polynomial curve fitting)
- 📊 **4 elite methodologies**: Polarized (80/20), Norwegian (double threshold), Canova, Pyramidal
- 🎯 **Elite Pace Zone System** - Hierarchical multi-source pace calculation (VDOT → Lactate → HR → Profile)
- 🏃 **Race Results Tracking** - VDOT calculation, equivalent times, performance analysis
- 💓 **HRV/RHR monitoring** with daily readiness assessment
- 🏃 **Automatic workout modification** based on readiness scores
- 🩹 **Injury management** with University of Delaware pain rules (9 injury types)
- 🏊 **Cross-training integration** with 6 modalities (DWR 98%, Cycling 75%, Swimming 45%, etc.)
- 📅 **Multi-race planning** with A/B/C race classification
- 🧬 **ACWR monitoring** for injury prevention (EWMA method)
- 💬 **Coach-athlete messaging** with thread support

### Key Files & Directories

**Core calculations**:
- `lib/training-engine/calculations/dmax.ts` - D-max threshold detection
- `lib/training-engine/calculations/tss-trimp.ts` - Training load

**Integration systems**:
- `lib/training-engine/integration/norwegian-validation.ts` - Norwegian Method eligibility (5 prerequisites, 4-phase transition)
- `lib/training-engine/integration/injury-management.ts` - Multi-system injury response cascade
- `lib/training-engine/integration/multi-system-validation.ts` - Priority ordering (INJURY → READINESS → FIELD_TESTS → NORWEGIAN → PROGRAM → WORKOUT)

**Methodologies**:
- `lib/training-engine/methodologies/polarized.ts` - 80/20 distribution
- `lib/training-engine/methodologies/norwegian.ts` - Double threshold (2x weekly @ LT2)
- `lib/training-engine/methodologies/canova.ts` - Marathon specialist approach
- `lib/training-engine/methodologies/pyramidal.ts` - 70/20/10 distribution

**UI Components**:
- Coach: `components/coach/` (FieldTestForm, InjuryAssessmentForm, WorkoutConverter, MonitoringCharts, etc.)
- Athlete: `components/athlete/` (DailyCheckInForm, SelfReportedLactateForm, ModificationBanner, etc.)

### Elite Pace Zone System

**Purpose**: Addresses critical flaw in fixed lactate thresholds - elite marathoners can have LT2 <2 mmol/L while others have LT2 >6 mmol/L for same performance.

**Hierarchical Calculation Priority**:
1. **Tier 1**: Race Performance (VDOT) ⭐⭐⭐⭐⭐
2. **Tier 2**: Lactate Test (individualized LT2:Peak ratio) ⭐⭐⭐⭐
3. **Tier 3**: HR-Based Estimation ⭐⭐⭐
4. **Tier 4**: Profile-Based Estimation ⭐⭐

**Training Systems Supported**:
- **Daniels VDOT**: E/M/T/I/R paces (Easy/Marathon/Threshold/Interval/Repetition)
- **Canova**: Fundamental/Progressive/Marathon/Specific/Threshold/5K/1K paces
- **Norwegian**: Green/Threshold/Red zones (polarized)
- **Legacy 5-zone**: Backwards compatibility

**Key Features**:
- Metabolic type detection (Fast Twitch vs Slow Twitch based on max lactate)
- Athletic level compression factors (Elite: 96-98% MP/LT2, Recreational: 75-82%)
- LT2 calculated as % of individual max lactate (not fixed 4 mmol/L)
- Phase-aware zones (BASE: physiological anchor, SPECIFIC: race pace anchor)

**Files**:
- `lib/program-generator/elite-pace-integration.ts` - Integration layer (300+ lines)
- `lib/training-engine/calculations/pace-selector.ts` - Multi-source pace calculation (450+ lines)
- `lib/program-generator/pace-validator.ts` - Validation logic (500+ lines)
- `docs/training-engine/ELITE_PACE_ZONE_IMPLEMENTATION_PLAN.md` - Complete scientific documentation

### Race Results & Performance Tracking

**Database Models**: `Race`, `RaceCalendar`

**Features**:
- CRUD operations for race results (marathon, half, 10K, 5K, custom distances)
- Automatic VDOT calculation from race times (Jack Daniels tables)
- Equivalent time predictions across distances
- Race assessment: EXCEEDED/MET/CLOSE/MISSED goals
- Integration with pace calculation (Tier 1 priority source)
- A/B/C race classification for season planning

**API Endpoints**:
- `GET/POST /api/race-results` - List/create race results
- `GET/PUT/DELETE /api/race-results/[id]` - Single race CRUD
- `POST /api/calculations/vdot` - Standalone VDOT calculator

### Messaging System

**Database Model**: `Message`

**Features**:
- Coach-athlete bidirectional communication
- Thread support with message history
- Read/unread status tracking
- Accessible from `/coach/messages` and `/athlete/messages`

**API Endpoints**:
- `GET/POST /api/messages` - List/send messages
- `GET/PUT/DELETE /api/messages/[id]` - Single message CRUD

### Documentation

**Detailed documentation in `docs/training-engine/`** (36 markdown files):
- `MASTER_PLAN.md` - Complete 14-phase roadmap
- `PHASE_01_DATABASE.md` through `PHASE_12_INTEGRATION.md` - Phase-by-phase implementation details
- `STATUS.md` - Implementation status (99% complete)
- `Elite_Training_Zone_Frameworks.md` - Methodologies overview
- `Metabolic_Equilibrium_Lactate_Analysis.md` - D-max algorithm details
- `Norwegian_Double_Threshold_Training_Protocol.md` - Norwegian Method implementation
- `ELITE_PACE_ZONE_IMPLEMENTATION_PLAN.md` - Elite pace zone scientific framework
- `END_TO_END_TEST_SCENARIOS.md` - 10 comprehensive test scenarios

### Migration

```bash
npx prisma generate
npx prisma migrate dev --name add_training_engine
```

**New models**: 20+ models including AthleteProfile, DailyCheckIn, ThresholdCalculation, FieldTest, InjuryAssessment, CrossTrainingSession, etc.

### API Endpoints

**Training Engine APIs** (17 endpoints):

**Testing & Calculations**:
- `POST /api/field-tests` - Submit field test (30-min TT, HR drift, Critical Velocity)
- `POST /api/calculations/thresholds` - Calculate thresholds from test data
- `POST /api/calculations/zones` - Calculate training zones
- `POST /api/calculations/vdot` - VDOT from race performance
- `POST /api/calculations/environmental` - WBGT, altitude, wind adjustments

**Monitoring & Readiness**:
- `POST /api/daily-checkin` - Submit daily check-in (<2 min)
- `GET /api/monitoring/readiness` - Get athlete readiness
- `POST /api/lactate/self-reported` - Athlete lactate submission
- `PUT /api/lactate/[id]/validate` - Coach validation of lactate data

**Injury & Cross-Training**:
- `POST /api/injury/assess` - University of Delaware pain assessment
- `POST /api/injury/process-checkin` - Process daily check-in for injury triggers
- `GET /api/cross-training/convert` - Workout conversion with TSS equivalency

**Race Results**:
- `GET/POST /api/race-results` - List/create race results
- `GET/PUT/DELETE /api/race-results/[id]` - Single race CRUD

**Norwegian Method**:
- `POST /api/norwegian-singles/eligibility` - Check eligibility
- `POST /api/norwegian-singles/generate` - Generate Norwegian workouts

**System**:
- `GET /api/system-validation` - Multi-system validation cascade

**Complete API reference**:
- 📚 **Full Documentation**: See `docs/API_REFERENCE.md` - Comprehensive documentation of all 52 endpoints with request/response schemas and examples
- 🗂️ **Source Code**: See `app/api/` directory for implementation

### Common Tasks

**Enable Norwegian Method**:
1. Validate eligibility: `validateNorwegianMethodEligibility(athleteId, prisma)`
2. Check 5 prerequisites: training age ≥2 years, base ≥60 km/week, recent lactate test, lactate meter, coach supervision
3. Apply 4-phase transition (12 weeks total)
4. Monitor lactate twice weekly

**Handle Injury**:
1. Athlete reports pain via daily check-in
2. System applies Delaware pain rules (Pain >5 → Rest, 3-5 → Cross-training, <3 → Reduce 50%)
3. Auto-modifies workouts for next 14 days
4. Generates cross-training substitutions
5. Creates return-to-running protocol (5 phases)

**Process Low Readiness**:
1. Daily check-in calculates readiness score (weighted composite)
2. Score <40 → REST decision
3. Today's workout auto-modified
4. Coach notified if score <40 (HIGH urgency)

---

## Scientific Strength Training System (Phases 1-8 COMPLETE)

**Overview**: Production-ready strength training system with automated periodization, progression tracking, and biomechanical exercise balance - aligned with endurance training phases.

### Key Capabilities

- 📊 **5-phase periodization**: AA (4-6 weeks) → Max Strength (6-8 weeks) → Power (3-4 weeks) → Maintenance (4-24 weeks) → Taper (1-2 weeks)
- 💪 **1RM estimation**: Epley and Brzycki formulas (no 1RM testing required)
- 📈 **2-for-2 progression**: Automatic load increases (2+ extra reps × 2 sessions → increase 5-10%)
- 🔍 **Plateau detection**: Recommends deloads after 3+ weeks stagnation
- 🏃 **Interference management**: NEVER schedule heavy strength <48h before key running workout
- 🦘 **Plyometric volume control**: Scientific contact limits (60-300 per session by level)
- 🎯 **Biomechanical balance**: 6 movement patterns (Posterior Chain, Knee Dominance, Unilateral, Foot/Ankle, Core, Upper Body)
- 📚 **84-exercise library**: Swedish exercises with progression paths (LEVEL_1 → LEVEL_2 → LEVEL_3)

### Key Files & Directories

**Progression system**:
- `lib/training-engine/progression/index.ts` - Main coordinator
- `lib/training-engine/progression/rm-estimation.ts` - Epley/Brzycki/Average formulas
- `lib/training-engine/progression/two-for-two.ts` - Automatic progression logic
- `lib/training-engine/progression/plateau-detection.ts` - 3-week plateau detection

**Program generation**:
- `lib/training-engine/quality-programming/strength-periodization.ts` - 5-phase system (Bompa & Haff, 2009)
- `lib/training-engine/generators/exercise-selector.ts` - Biomechanical balance algorithm
- `lib/training-engine/generators/plyometric-calculator.ts` - Contact volume limits
- `lib/training-engine/scheduling/interference-manager.ts` - Strength/running scheduling

**Coach UI** (7 components):
- `components/coach/exercise-library/ExerciseLibraryBrowser.tsx` - Search, filter, pagination
- `components/coach/exercise-library/CustomExerciseCreator.tsx` - Create custom exercises
- `components/coach/program-generator/StrengthProgramWizard.tsx` - 5-step wizard
- `components/coach/program-editor/SessionEditor.tsx` - Universal workout editor
- `components/coach/program-editor/ExerciseSwapper.tsx` - Smart exercise replacement
- `components/coach/progression/ProgressionDashboard.tsx` - 1RM charts, plateau alerts

**Athlete UI** (4 components):
- `components/athlete/workout/StrengthWorkoutCard.tsx` - Workout display
- `components/athlete/workout/WorkoutLoggingForm.tsx` - Exercise-by-exercise logging
- `components/athlete/workout/WorkoutHistory.tsx` - PR tracking, stats
- `components/athlete/workout/ExerciseInstructionsModal.tsx` - Tabbed exercise guide

### Documentation

**Detailed documentation**:
- `docs/training-engine/Strength_Training_for_Runners_Scientific_Framework.md` - Complete scientific framework
- `STRENGTH_TRAINING_IMPLEMENTATION_CHECKLIST.md` - Implementation checklist

### Migration

```bash
npx prisma generate
npx prisma migrate dev --name add_strength_training
npx ts-node prisma/seed-exercises.ts  # Seed 84-exercise library
```

**New models**: Exercise, ProgressionTracking, OneRepMaxHistory
**New enums**: BiomechanicalPillar, ProgressionLevel, PlyometricIntensity, ProgressionStatus, StrengthPhase

### Exercise Library (84 Exercises)

**Categories** (see `prisma/seed-exercises.ts`):
- **Posterior Chain** (13): RDL, Nordic Hamstring, Glute Bridge variations
- **Knee Dominance** (11): Squats, Bulgarian Split Squat, Step-ups
- **Unilateral** (10): Lunges, Single-leg Squat, Skater Squat
- **Foot/Ankle** (10): Calf Raises, Ankle strengthening
- **Core** (15): Planks, Dead Bug, Pallof Press
- **Plyometric** (25): Box Jumps, Depth Jumps, Bounding

### API Endpoints

**Strength Training APIs** (14 endpoints):
- `GET/POST /api/exercises` - Exercise CRUD with filtering
- `GET /api/exercises/[id]/alternatives` - Alternative exercises (same pillar)
- `GET /api/exercises/[id]/progression-path` - Easier → Current → Harder
- `GET/POST /api/clients/[id]/progression/[exerciseId]` - Progression tracking
- `POST /api/workouts/[id]/log` - Log workout with auto-progression
- `GET /api/strength-templates` - Pre-built templates
- `PUT/POST/DELETE /api/programs/[id]/edit` - Program editing
- See `app/api/` directory for complete list

### Common Tasks

**Generate Strength Program**:
1. Navigate to `/coach/programs/new`
2. Use StrengthProgramWizard (5 steps): athlete info → goals → periodization plan → exercise pool → review
3. Program auto-aligned with running phases
4. Biomechanical balance validated
5. Interference rules applied

**Log Workout (Athlete)**:
1. View workout in StrengthWorkoutCard
2. Use WorkoutLoggingForm: enter sets, reps, load, RPE per exercise
3. Submit → Auto-progression runs (1RM updated, 2-for-2 checked, plateau detection)
4. Results saved to ProgressionTracking

**Monitor Progression (Coach)**:
1. Navigate to `/coach/clients/[id]/progression`
2. ProgressionDashboard shows: 1RM charts, load/reps bars, status badges (ON_TRACK/PLATEAU/REGRESSING)
3. Plateau alerts after 3+ weeks no progress → Recommend deload (40-50% volume reduction)
4. 2-for-2 badges → Next session auto-increases load

**Apply 2-for-2 Rule**:
- Session 1: 3×8 @ 100kg → Completed 3×10 (2 extra reps) ✓
- Session 2: 3×8 @ 100kg → Completed 3×10 (2 extra reps) ✓
- Result: Recommend 105kg (5% increase for lower body)
- Next workout auto-generated with 105kg

---

## Multi-Sport Support System (COMPLETE)

**Overview**: Comprehensive multi-sport platform supporting 7 sport types with sport-specific onboarding, dashboards, and program generation.

### Supported Sports

| Sport | Enum | Key Metrics | Dashboard Features |
|-------|------|-------------|-------------------|
| **Running** | `RUNNING` | VDOT, Paces, LT2 | Training zones, race predictions |
| **Cycling** | `CYCLING` | FTP, W/kg, Power zones | FTP trends, power distribution |
| **Swimming** | `SWIMMING` | CSS, Pace/100m | CSS-based zones, stroke analysis |
| **Triathlon** | `TRIATHLON` | CSS, FTP, VDOT | Multi-discipline balance, weakness detection |
| **HYROX** | `HYROX` | Station times, 5K/10K | Station benchmarks, race time estimation |
| **Skiing** | `SKIING` | LT, Technique | Classic/Skate, terrain preferences |
| **General Fitness** | `GENERAL_FITNESS` | Goals, Activity level | Weight progress, BMI, goal tracking |

### Database Model (`SportProfile`)

**Location**: `prisma/schema.prisma` (lines 1611-1661)

```prisma
model SportProfile {
  primarySport          SportType           // Main sport (determines dashboard)
  secondarySports       SportType[]         // Cross-training sports
  onboardingCompleted   Boolean             // Flow completion flag
  onboardingStep        Int                 // Current step (0-6)

  // Sport-specific settings (JSON)
  runningSettings       Json?
  cyclingSettings       Json?
  skiingSettings        Json?
  swimmingSettings      Json?
  triathlonSettings     Json?
  hyroxSettings         Json?
  generalFitnessSettings Json?

  // Experience levels
  runningExperience     String?             // BEGINNER | INTERMEDIATE | ADVANCED | ELITE
  cyclingExperience     String?
  swimmingExperience    String?
  strengthExperience    String?
}
```

### Athlete Onboarding System

**Flow**: 6-step wizard customized per sport

1. **Sport Selection** - Primary sport + optional secondary sports
2. **Experience Level** - Beginner/Intermediate/Advanced/Elite
3. **Sport-Specific Setup** - Unique per sport (see below)
4. **Weekly Availability** - Training days + preferred session length
5. **Equipment** - Available equipment (treadmill, bike, pool, etc.)
6. **Goals** - Target goals + target date

**Key Files**:
- `app/athlete/onboarding/page.tsx` - Server component with auth
- `components/onboarding/OnboardingWizard.tsx` - Main wizard (680 lines)
- `components/onboarding/SportSelector.tsx` - Sport picker with icons
- `components/onboarding/[Sport]Onboarding.tsx` - Sport-specific forms

**Sport-Specific Onboarding Fields**:

| Sport | Onboarding Component | Key Fields |
|-------|---------------------|------------|
| Cycling | `CyclingOnboarding.tsx` | Bike types, FTP, indoor/outdoor ratio, disciplines |
| Swimming | `SwimmingOnboarding.tsx` | Stroke types, CSS, pool length, open water exp |
| Triathlon | `TriathlonOnboarding.tsx` | Target distance, discipline balance, CSS/FTP/VDOT |
| HYROX | `HYROXOnboarding.tsx` | Category, station times, equipment access |
| General Fitness | `GeneralFitnessOnboarding.tsx` | Goals, activities, health metrics, limitations |
| Skiing | `SkiingOnboarding.tsx` | Technique (classic/skate), equipment, terrain |

### Sport-Specific Coach Dashboards

**Location**: `components/coach/sport-views/`

**Router Component**: `SportSpecificAthleteView.tsx`
- Renders appropriate dashboard based on `primarySport`
- Integrated into `/clients/[id]` page

**Dashboard Components**:

| Component | Features |
|-----------|----------|
| `HYROXAthleteView.tsx` | Station times with progress bars, benchmark comparison, estimated race time |
| `CyclingAthleteView.tsx` | FTP zones (6-zone), W/kg calculation, power distribution |
| `SwimmingAthleteView.tsx` | CSS-based zones (6-zone), stroke analysis, pool/open water |
| `TriathlonAthleteView.tsx` | Discipline balance (swim/bike/run %), weakness detection |
| `SkiingAthleteView.tsx` | Technique display, equipment, terrain preferences |
| `GeneralFitnessAthleteView.tsx` | Goal progress, weight tracking, BMI calculation |

### API Endpoints

**Sport Profile APIs**:
- `GET/PUT /api/sport-profile/[clientId]` - Get/update sport profile
- `POST /api/sport-profile` - Create new sport profile

**Request/Response Schema** (PUT):
```json
{
  "primarySport": "CYCLING",
  "secondarySports": ["RUNNING"],
  "cyclingSettings": {
    "bikeTypes": ["road", "gravel"],
    "currentFtp": 280,
    "primaryDiscipline": "road"
  },
  "onboardingCompleted": true,
  "onboardingStep": 6
}
```

### Mobile UI Optimizations

**WorkoutLoggingForm** (`components/athlete/workout/WorkoutLoggingForm.tsx`):
- Touch targets: `h-12` (48px) for all inputs and buttons
- Numeric keyboards: `inputMode="numeric"` / `inputMode="decimal"`
- Sticky action buttons on mobile with responsive breakpoints
- Swedish labels (Set, Reps, Belastning, Avbryt, Logga pass)

### Common Tasks

**Complete Athlete Onboarding**:
1. Athlete logs in for first time
2. Redirected to `/athlete/onboarding`
3. Selects primary sport → sport-specific wizard loads
4. Completes 6-step flow
5. `onboardingCompleted: true` saved to SportProfile
6. Redirected to `/athlete/dashboard`

**View Sport-Specific Data (Coach)**:
1. Navigate to `/clients/[id]`
2. SportSpecificAthleteView loads based on `primarySport`
3. Displays sport-relevant metrics and visualizations

**Update Sport Profile (Athlete)**:
1. Navigate to `/athlete/profile`
2. Edit sport settings via AthleteProfileEditor
3. Changes saved via `PUT /api/sport-profile/[clientId]`

---

## User Roles & Authentication

**Three roles**:
- `COACH` - Creates clients, tests, programs (existing test leaders)
- `ATHLETE` - Views programs, logs workouts, sees test results
- `ADMIN` - Full system access

**Route protection** (`middleware.ts`):
- `/coach/*` routes protected for coaches
- `/athlete/*` routes protected for athletes
- `/admin/*` routes protected for admins
- Automatic redirect to appropriate dashboard

**Subscription tiers**:
- FREE (0 athletes), BASIC (5), PRO (50), ENTERPRISE (unlimited)

---

## Testing & Quality

**Automated Testing**:
- **Unit tests**: Vitest - `npm test`, `npm run test:watch`, `npm run test:coverage`
- **E2E tests**: Playwright - `npm run test:e2e`
- **Calculation validation**: `npm run validate:calculations`

**Manual Test Scripts** (`scripts/` directory):
- `test-comprehensive-program-generation.ts` - Full program generation test
- `test-training-engine.ts` - Training engine validation
- `test-zone-calculations.ts` - Zone calculation accuracy tests
- `test-e2e-program-generation.ts` - End-to-end program flow

**Quality Assurance**:
- Forms validated with Zod schemas (type-safe at runtime)
- Calculation accuracy validated against reference data
- End-to-end test scenarios documented in `docs/training-engine/END_TO_END_TEST_SCENARIOS.md`

**Helper Scripts**:
- `create-athlete-account.ts` - Create athlete accounts
- `check-data.ts`, `diagnose-program.ts` - Debugging tools

## AI Studio System (~90% Complete)

**Overview**: Production-ready AI-powered training program creation system with multi-model support, document-based RAG, and advanced intelligence features.

### Key Capabilities

- 🤖 **Multi-Model Support**: Claude 4.5 Opus + Gemini 2.5 Pro with dynamic model selection
- 📄 **Document RAG**: Upload PDFs, Excel, videos with semantic search (pgvector)
- 💬 **Conversational Program Design**: Iterative AI-assisted program creation
- 🌐 **Web Search Integration**: DuckDuckGo for research context
- 🎥 **Video Analysis**: MediaPipe BlazePose + Gemini for technique analysis
- 📊 **Body Composition**: Bioimpedance tracking with nutrition planning
- 🧠 **Advanced Intelligence**: Pattern recognition, injury prediction, goal setting

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI STUDIO                                │
├─────────────────────────────────────────────────────────────┤
│  Context Panel (Left)    │  Chat Interface (Center)         │
│  • Athlete data toggles  │  • Streaming responses           │
│  • Document selection    │  • Program preview               │
│  • Web search toggle     │  • Natural language editing      │
├─────────────────────────────────────────────────────────────┤
│  AI Providers            │  RAG System                       │
│  • Claude (Anthropic)    │  • pgvector embeddings           │
│  • Gemini (Google)       │  • OpenAI ada-002 embeddings     │
│  • BYOK (user keys)      │  • Semantic + keyword search     │
└─────────────────────────────────────────────────────────────┘
```

### Key Files & Directories

**UI Components** (`components/ai-studio/`):
- `AIStudioClient.tsx` (~550 lines) - Main coach dashboard
- `FloatingAIChat.tsx` (~395 lines) - Floating chat widget
- `AIContextButton.tsx` (~327 lines) - Context-aware AI button
- `ContextPanel.tsx` - Document/data selection sidebar
- `ModelSelector.tsx` - Claude/Gemini model dropdown
- `ChatMessage.tsx` - Message rendering with markdown

**API Routes** (`app/api/ai/`):
- `chat/route.ts` (475 lines) - Streaming chat with context injection
- `conversations/route.ts` - Conversation CRUD
- `conversations/[id]/message/route.ts` - Message handling
- `save-program/route.ts` - Save AI-generated programs
- `nutrition-plan/route.ts` - Nutrition recommendations
- `advanced-intelligence/` - Pattern analysis, predictions, injury risk

**Library** (`lib/ai/`):
- `program-prompts.ts` (500+ lines) - Methodology definitions, sport context
- `sport-context-builder.ts` - Rich athlete data compilation
- `embeddings.ts` - OpenAI embedding generation, text chunking
- `web-search.ts` - DuckDuckGo integration
- `nutrition-calculator.ts` - BMR/TDEE/macro calculations
- `program-parser.ts` - Parse AI output to database format
- `document-processor.ts` - PDF, Excel, video parsing
- `advanced-intelligence/` - Training patterns, predictive goals, injury risk

### Database Models

```prisma
// AI Provider enum
enum AIProvider { ANTHROPIC, GOOGLE, OPENAI }

// Document management
model CoachDocument { ... }      // Uploaded files (PDF, Excel, video)
model KnowledgeChunk { ... }     // Chunked text with embeddings (pgvector)

// Conversation persistence
model AIConversation { ... }     // Chat sessions with token tracking
model AIMessage { ... }          // Messages with role, tokens, latency

// Generated content
model AIGeneratedProgram { ... } // JSON program structure
model VideoAnalysis { ... }      // MediaPipe landmarks + Gemini analysis
model BodyComposition { ... }    // Bioimpedance measurements

// User configuration
model UserApiKey { ... }         // Encrypted BYOK keys
model AIModel { ... }            // Dynamic model configuration
```

### API Endpoints

**AI Chat & Generation**:
- `POST /api/ai/chat` - Streaming chat with context
- `POST/GET /api/ai/conversations` - Conversation management
- `POST /api/ai/conversations/[id]/message` - Send message
- `POST /api/ai/save-program` - Save generated program
- `POST /api/ai/nutrition-plan` - Generate nutrition plan

**Document Management**:
- `POST /api/documents/upload` - Upload with parsing
- `GET/DELETE /api/documents/[id]` - Document CRUD
- `POST /api/knowledge/search` - Semantic search
- `POST /api/knowledge/context` - Build RAG context

**Advanced Intelligence**:
- `POST /api/ai/advanced-intelligence/patterns` - Training patterns
- `POST /api/ai/advanced-intelligence/predictions` - Goal predictions
- `POST /api/ai/advanced-intelligence/injury-risk` - Injury prediction
- `POST /api/ai/advanced-intelligence/periodization` - Auto-adjustments
- `POST /api/ai/advanced-intelligence/coach-style` - Style extraction

**Video Analysis**:
- `POST /api/video-analysis/upload` - Upload video
- `POST /api/video-analysis/analyze` - Gemini analysis

**Body Composition**:
- `POST/GET /api/body-composition/[clientId]` - Bioimpedance data

**Settings**:
- `GET/POST /api/settings/api-keys` - BYOK key management
- `POST /api/settings/api-keys/validate` - Key validation

### Dependencies

```json
{
  "ai": "^4.3.19",              // Vercel AI SDK
  "@ai-sdk/anthropic": "^1.2.12", // Claude integration
  "@ai-sdk/google": "^1.2.22",    // Gemini integration
  "@ai-sdk/react": "^2.0.109",    // React hooks (useChat)
  "@anthropic-ai/sdk": "^0.71.2", // Direct Anthropic API
  "openai": "^6.10.0",            // Embeddings
  "pdf-parse": "^2.4.5",          // PDF parsing
  "xlsx": "^0.18.5",              // Excel parsing
  "@mediapipe/pose": "^0.5.x"     // Video skeletal tracking
}
```

### Common Tasks

**Use AI Studio (Coach)**:
1. Navigate to `/coach/ai-studio`
2. Select athlete from dropdown
3. Toggle context (test data, goals, documents)
4. Select model (Claude/Gemini)
5. Chat to design program iteratively
6. Save generated program to database

**Upload Documents**:
1. Navigate to `/coach/documents`
2. Drag-and-drop PDF/Excel/video
3. System auto-chunks and embeds
4. Documents available in AI Studio context panel

**Configure API Keys (BYOK)**:
1. Navigate to `/coach/settings/ai`
2. Enter Anthropic/Google/OpenAI keys
3. Keys encrypted and validated
4. Used automatically in AI Studio

### Documentation

- `docs/AI_STUDIO_IMPLEMENTATION_PLAN.md` - Master plan (800+ lines)
- `docs/Architecting_the_Cognitive_Athlete.md` - Technical architecture

---

## Athlete Dashboard Data Flow

The athlete dashboard uses parallel Prisma queries to fetch data from multiple sources. All data connections have been audited and fixed for 100% accuracy.

**Dashboard Cards → Data Sources**:

| Card | Primary Data Source | Key Files |
|------|---------------------|-----------|
| Hero Workout | `Workout` + `WorkoutLog` | `HeroWorkoutCard.tsx` |
| Readiness Panel | `DailyMetrics` + `TrainingLoad` + Synced Strength | `ReadinessPanel.tsx` |
| Training Load | `TrainingLoad` + `StravaActivity` + `GarminActivity` + `Concept2Result` | `TrainingLoadWidget.tsx` |
| Recent Activity | All sources (deduplicated) | `IntegratedRecentActivity.tsx` |
| WOD History | `AIGeneratedWOD` (COMPLETED) | `WODHistorySummary.tsx` |

**Key Utilities**:

- **Activity Deduplication** (`lib/training/activity-deduplication.ts`): Prevents double-counting when same workout is synced via multiple sources (Strava + Garmin). Priority: concept2 > strava > garmin > ai > manual.

- **Synced Strength Fatigue** (`lib/training-engine/monitoring/synced-strength-fatigue.ts`): Calculates objective muscular fatigue from synced strength activities, blended with subjective soreness (40/60 weight).

- **GarminActivity Model**: Garmin activities are now normalized to a dedicated database model (like StravaActivity), enabling proper queries and deduplication.

**Full documentation**: See `docs/ATHLETE_DASHBOARD_CONNECTIONS.md` for complete data flow diagrams and implementation details.

---

## Known Issues & Considerations

- **Lactate curve validation**: Not enforced - users can input decreasing lactate values
- **Missing VO2 data**: Economy calculations skip stages without VO2
- **PDF export**: Large reports may timeout on slow connections
- **Database**: Currently uses Supabase PostgreSQL (not local development DB by default)
- **Norwegian Singles**: Standalone system may need audit/cleanup (see `INJURY_CROSS_TRAINING_IMPLEMENTATION.md`)
- **Gemini Video API**: Infrastructure complete, needs integration verification

---

**For detailed implementation details**, see:
- `docs/API_REFERENCE.md` - Complete API documentation (all 52 endpoints)
- `docs/database/` - Database documentation with auto-generated ER diagram
- `docs/training-engine/` - Elite training engine documentation (36+ markdown files)
- `docs/ATHLETE_DASHBOARD_CONNECTIONS.md` - Dashboard data flow and gap tracking
- `STRENGTH_TRAINING_IMPLEMENTATION_CHECKLIST.md` - Strength training implementation
- `docs/TRAINING_PROGRAM_IMPLEMENTATION_PLAN.md` - Training program roadmap
- `prisma/schema.prisma` - Complete database schema
- `types/index.ts` - All TypeScript types
