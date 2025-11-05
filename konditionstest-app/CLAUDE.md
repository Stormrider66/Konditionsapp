# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **VO2max/Konditionstest Report Generator** - a Next.js 15 web application for generating professional physiological test reports from running, cycling, and skiing test data. Built for Star by Thomson to automate the creation of professional test reports with calculations for lactate thresholds, training zones, VO2max, and running economy.

**Key purpose**: Transform 30-60 minute manual report generation into a <1 minute automated process with standardized calculations and professional formatting.

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

## Architecture & Code Organization

### Application Flow
1. **Authentication** → User login via Supabase Auth
2. **Client Management** → Create/manage test subjects (athletes/clients)
3. **Test Data Input** → Multi-stage test data entry (speed/power, HR, lactate, VO2)
4. **Calculations Engine** → Automatic threshold, zone, and economy calculations
5. **Report Generation** → Professional HTML reports with charts
6. **Export** → PDF download or email delivery

### Directory Structure

```
konditionstest-app/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── clients/              # Client CRUD endpoints
│   │   ├── tests/                # Test CRUD endpoints
│   │   ├── teams/                # Team management endpoints
│   │   ├── templates/            # Test template endpoints
│   │   └── send-report-email/    # Email delivery endpoint
│   ├── actions/                  # Server actions (auth.ts)
│   ├── clients/                  # Client management pages
│   ├── teams/                    # Team management pages
│   ├── tests/                    # Test management pages
│   ├── test/                     # Main test creation page
│   └── login|register/           # Authentication pages
├── components/
│   ├── forms/                    # Form components (TestDataForm, TeamForm)
│   ├── charts/                   # Recharts components (TestChart, PowerChart, ProgressionChart)
│   ├── reports/                  # Report templates and export buttons
│   ├── navigation/               # Navigation components (UserNav, MobileNav)
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── calculations/             # Core calculation engine (see below)
│   ├── supabase/                 # Supabase client/server/middleware
│   ├── validations/              # Zod schemas
│   ├── utils/                    # Utilities (csv-export.ts)
│   ├── prisma.ts                 # Prisma client singleton
│   └── pdf-generator.ts          # PDF export logic
├── types/
│   └── index.ts                  # Central TypeScript type definitions
└── prisma/
    └── schema.prisma             # Database schema
```

### Calculations Engine (`lib/calculations/`)

The calculation engine is the core of the application. All calculations follow scientific standards for physiological testing:

**Key files**:
- `index.ts` - Main entry point: `performAllCalculations(test, client)` orchestrates all calculations
- `thresholds.ts` - Lactate threshold calculations (aerobic ≈2.0 mmol/L, anaerobic ≈4.0 mmol/L)
  - Uses linear interpolation between test stages
  - Special handling for "second crossing" of 4 mmol/L for anaerobic threshold
- `zones.ts` - Garmin 5-zone training zones based on max HR and thresholds
- `economy.ts` - Running economy calculations (ml O₂/kg/km)
- `cycling.ts` - Cycling-specific: FTP, watt/kg, power zones
- `vo2max.ts` - VO2max identification and age/gender-based evaluation
- `basic.ts` - BMI and age calculations

**Critical calculation details**:
- Aerobic threshold: First crossing of 2 mmol/L lactate
- Anaerobic threshold: **Second crossing** of 4 mmol/L lactate (if exists), otherwise first crossing
- All interpolations use linear interpolation between adjacent test stages
- Training zones calculated as percentages of max HR (50-60%, 60-70%, 70-80%, 80-90%, 90-100%)
- Running economy = (VO2 × 60) / speed [ml/kg/km]
- Cycling FTP approximated from anaerobic threshold power

### Database Schema (Prisma)

**Core models**:
- `User` - Test leaders/administrators
- `Client` - Test subjects with demographics (height, weight, age, gender)
- `Team` - Groups of clients (e.g., sports teams)
- `Test` - Test session metadata (date, type, location, calculated results)
- `TestStage` - Individual test stages with measurements
- `Report` - Generated HTML reports
- `TestTemplate` - Reusable test protocols

**Important relationships**:
- Client → Tests (one-to-many)
- Test → TestStages (one-to-many, cascade delete)
- Test → Report (one-to-one, cascade delete)
- User → Clients, Tests (one-to-many)
- Team → Clients (one-to-many)

**TestStage fields by test type**:
- **Running**: `speed` (km/h), `incline` (%), `vo2`, `heartRate`, `lactate`
- **Cycling**: `power` (watt), `cadence` (rpm), `vo2`, `heartRate`, `lactate`
- **Skiing**: `pace` (min/km), `vo2`, `heartRate`, `lactate`

### Type System (`types/index.ts`)

All TypeScript types are centralized in `types/index.ts`. Key types:
- `Test`, `TestStage`, `Client`, `User`, `Team`
- `TestType` = 'RUNNING' | 'CYCLING' | 'SKIING'
- `Threshold` - Contains HR, value (speed/power/pace), unit, lactate, percentOfMax
- `TrainingZone` - HR ranges and corresponding speed/power/pace ranges
- `TestCalculations` - Return type from `performAllCalculations()`
- `CreateTestDTO`, `CreateClientDTO` - Form submission types

### State Management & Data Flow

- **Server Components**: Default for all pages (fetch data server-side)
- **Client Components**: Forms, charts, interactive UI (marked with 'use client')
- **API Routes**: RESTful endpoints for CRUD operations
- **Server Actions**: Used for authentication (`app/actions/auth.ts`)
- **No global state library**: Data fetched per-page, mutations via API calls

### Authentication & Authorization

- Supabase Auth handles login/register/sessions
- Middleware (`middleware.ts`) protects routes
- User context via Supabase server-side helpers
- All data scoped to authenticated user via `userId` foreign keys

## Important Conventions

### Calculation Accuracy
- All calculations must match scientific standards
- Threshold interpolation must use linear interpolation, not estimation
- Always validate that test stages are sorted by `sequence` before calculations
- Handle edge cases (missing VO2 data, incomplete lactate curves, etc.)

### Test Type Handling
- Check `testType` to determine which fields are relevant (speed vs power vs pace)
- Unit determination logic: Check if `speed` exists → 'km/h', else `power` → 'watt', else `pace` → 'min/km'
- Running tests require `speed`, cycling requires `power`, skiing requires `pace`

### Data Validation
- All form data validated with Zod schemas in `lib/validations/schemas.ts`
- Client-side validation via React Hook Form + Zod resolver
- Server-side validation in API routes (always validate on server)

### Database Interactions
- Use Prisma client singleton from `lib/prisma.ts`
- Always handle Prisma errors (unique constraints, foreign key violations)
- Use transactions for multi-step operations
- Cascade deletes configured for Test → TestStages, Test → Report

### Report Generation
- Reports generated from `ReportTemplate.tsx` component
- Export to PDF via `PDFExportButton.tsx` using jsPDF + html2canvas
- Email delivery via Resend API (`api/send-report-email/route.ts`)
- Reports include: client info, test data, charts, thresholds, training zones

### UI/UX Patterns
- Forms use multi-step wizards for test data entry
- Charts show dual-axis (HR + lactate) vs intensity (speed/power/pace)
- Responsive design with mobile navigation
- Loading states with skeleton components
- Error handling with toast notifications

### Path Aliases
- `@/*` maps to project root (configured in `tsconfig.json`)
- Always use `@/` prefix for imports: `@/lib/calculations`, `@/types`, `@/components/ui/button`

## Common Development Tasks

### Adding a New Test Type
1. Add to `TestType` enum in `prisma/schema.prisma` and `types/index.ts`
2. Add relevant fields to `TestStage` model (e.g., for rowing: `strokeRate`)
3. Update `lib/calculations/thresholds.ts` to handle new unit type
4. Update `lib/calculations/zones.ts` to calculate zones for new type
5. Modify `components/forms/TestDataForm.tsx` to show relevant input fields
6. Update `components/charts/TestChart.tsx` for new axis labels
7. Update `components/reports/ReportTemplate.tsx` to display new data

### Adding a New Calculation
1. Create function in appropriate `lib/calculations/*.ts` file
2. Add to `performAllCalculations()` in `lib/calculations/index.ts`
3. Update `TestCalculations` type in `types/index.ts`
4. Update `ReportTemplate.tsx` to display new calculation
5. Write tests if complex calculation logic

### Debugging Calculation Issues
- Check console logs in `lib/calculations/thresholds.ts` (has extensive logging)
- Verify test stages are sorted by `sequence`
- Check that correct field (speed/power/pace) exists and is not null/undefined
- Validate lactate values are ascending (if threshold can't be found)
- Use Prisma Studio to inspect raw database values

### Testing with Sample Data
- Sample data exists in `data_model.md` spec file
- Can create test data via `/simple-test` page
- Example client: Joakim Hällgren, male, 186cm, 88kg
- Example test date range: 2025-09-02 to 2025-10-02

## Known Issues & Considerations

- **Lactate curve validation**: Not enforced - users can input decreasing lactate values
- **Missing VO2 data**: Economy calculations skip stages without VO2, no error shown
- **PDF export**: Large reports may timeout on slow connections
- **Email delivery**: Requires Resend API key in environment variables
- **Database**: Currently uses Supabase PostgreSQL (not local development DB by default)

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

## Testing & Quality

- No automated test suite currently implemented
- Manual testing via development server
- Calculation accuracy validated against reference data
- Forms validated with Zod schemas (type-safe at runtime)

## Performance Considerations

- Server-side rendering for initial page loads
- Client-side navigation via Next.js App Router
- Charts may be slow with >20 test stages (consider virtualization)
- PDF generation blocks UI (consider moving to API route with background processing)
- Database queries not optimized with eager loading (N+1 queries possible)

## Deployment

- Designed for Vercel deployment
- Database hosted on Supabase
- Environment variables configured in Vercel dashboard
- Build command: `npm run build`
- No custom server required (Next.js handles routing)

---

## Phase 1: Training Program Foundation (IMPLEMENTED)

The app now includes foundational support for training programs and athlete portals. **Phase 1 is complete** with the following additions:

### New Database Models (10 models added)

**Subscription & Billing**:
- `Subscription` - Subscription tiers (FREE, BASIC, PRO, ENTERPRISE) with athlete limits and Stripe integration

**Athlete Accounts**:
- `AthleteAccount` - Links Client to Athlete User (1-to-1 relationship)

**Training Programs**:
- `TrainingProgram` - Year-round program support with goal types (marathon, 5k, fitness, etc.)
- `TrainingWeek` - Weekly structure with phases (BASE, BUILD, PEAK, TAPER, etc.)
- `TrainingDay` - Daily workout schedule
- `Workout` - Individual workouts with type, intensity, segments
- `WorkoutSegment` - Detailed workout parts (warm-up, intervals, exercises, etc.)
- `Exercise` - Exercise library with Swedish/English names
- `WorkoutLog` - Athlete workout completion logs with RPE, notes, file uploads
- `Message` - Coach-athlete messaging system

### User Roles & Authentication

**Three roles implemented**:
- `COACH` - Creates clients, tests, programs (existing test leaders)
- `ATHLETE` - Views programs, logs workouts, sees test results
- `ADMIN` - Full system access

**Role-based route protection** (`middleware.ts`):
- `/coach/*` routes protected for coaches
- `/athlete/*` routes protected for athletes
- `/admin/*` routes protected for admins
- Automatic redirect to appropriate dashboard based on role

### Auth Utilities (`lib/auth-utils.ts`)

Complete authorization system:
- `getCurrentUser()` - Get authenticated user with role
- `requireCoach()`, `requireAthlete()`, `requireAdmin()` - Role guards
- `canAccessProgram()`, `canAccessWorkout()`, `canAccessClient()` - Resource-level permissions
- `hasReachedAthleteLimit()` - Subscription limit checks
- `getAccessiblePrograms()` - Filtered program lists by role

### API Endpoints

**Athlete Account Management** (`/api/athlete-accounts`):
- `POST` - Create athlete account for client (generates temp password, sends email)
- `GET` - Retrieve athlete account by clientId
- Integrates with Supabase Auth
- Updates subscription athlete count

### Exercise Library

**25 Swedish exercises** (`prisma/seed-exercises.ts`):
- **Strength**: Knäböj, marklyft, bänkpress, rodd, chins, etc.
- **Plyometric**: Lådhopp, depth jumps, enbenhopp, broad jump, etc.
- **Core**: Plank, sidplank, dead bug, bird dog, pallof press, etc.
- All with Swedish (`nameSv`) and English (`nameEn`) names
- Instructions, equipment, difficulty, video links
- Run with: `npx ts-node prisma/seed-exercises.ts`

### Key Design Decisions

1. **Year-Round Training**: Programs can span any duration, not just race-specific blocks
2. **Multiple Goals**: Support for marathon, 5k, fitness, cycling, skiing, custom goals
3. **Flexible Logging**: Athletes can log in advance and add custom workouts (`isCustom` flag)
4. **Full Visibility**: Athletes see entire program from start (not week-by-week unlock)
5. **Scalability**: Designed for 500+ athletes with proper indexing
6. **Swedish First**: All content in Swedish, English support to be added later
7. **Subscription Tiers**: FREE (0 athletes), BASIC (5), PRO (50), ENTERPRISE (unlimited)

### Next Steps for Phase 2

To complete the training program MVP, implement:
1. Program generator algorithm (`lib/program-generator/`)
2. Coach program builder UI (`/coach/programs/`)
3. Athlete dashboard (`/athlete/dashboard`)
4. Workout detail and logging (`/athlete/workouts/[id]`)

See `TRAINING_PROGRAM_IMPLEMENTATION_PLAN.md` for complete Phase 2-7 roadmap.

### Migration Required

**Before using Phase 1 features**:
```bash
# Stop development server
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_training_programs

# Seed exercise library
npx ts-node prisma/seed-exercises.ts

# Restart development server
npm run dev
```

**Update existing users**: All existing users default to `COACH` role. Update manually if needed:
```sql
UPDATE "User" SET role = 'ATHLETE' WHERE email = 'athlete@example.com';
```
