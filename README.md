# Konditionstest & Training Platform

**English** | [Svenska](#svenska)

A comprehensive Next.js 15 web application for professional endurance coaching, combining physiological testing, training program generation, and athlete monitoring.

**Built for**: Star by Thomson
**Status**: Production-ready with 4 major systems
**Tech Stack**: Next.js 15, TypeScript, PostgreSQL, Supabase, Prisma, Tailwind CSS

---

## 🎯 What It Does

### 1. **Physiological Testing** (Original Core)
Professional lab test report generation with automatic calculations for lactate thresholds, training zones, VO2max, and running economy.

**Key Features**:
- Multi-stage test data entry (running, cycling, skiing)
- D-max lactate threshold detection (polynomial curve fitting)
- Garmin 5-zone training zones
- PDF export with professional charts
- Historical test comparison

### 2. **Training Programs**
Year-round endurance training programs with athlete portals and workout logging.

**Key Features**:
- Program generation with periodization (BASE → BUILD → PEAK → TAPER)
- Athlete dashboard with daily workout plans
- Workout logging with RPE tracking
- Progress visualization
- Coach program editing

### 3. **Elite Training Engine**
Advanced training system with automatic adaptation based on athlete monitoring, field tests, and injury management.

**Key Features**:
- 4 elite methodologies: Polarized (80/20), Norwegian (double threshold), Canova, Pyramidal
- Elite pace zone system (VDOT → Lactate → HR → Profile hierarchical calculation)
- HRV/RHR monitoring with daily readiness assessment
- Automatic workout modification based on readiness
- Injury management (University of Delaware pain rules, 9 injury types)
- Cross-training integration (6 modalities with TSS equivalency)
- Multi-race planning with A/B/C classification
- ACWR monitoring for injury prevention

### 4. **Strength Training**
Periodized strength training with automatic progression tracking and biomechanical exercise balance.

**Key Features**:
- 5-phase periodization (AA → Max Strength → Power → Maintenance → Taper)
- 84-exercise library with Swedish/English names
- 1RM estimation (Epley/Brzycki formulas - no testing required)
- 2-for-2 automatic progression rule
- Plateau detection with deload recommendations
- Interference management (strength/running scheduling)
- Plyometric volume control (scientific contact limits)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (via Supabase or local)
- Supabase account (for authentication)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd konditionstest-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Set up database
npx prisma generate
npx prisma migrate dev

# Seed exercise library (84 exercises)
npx ts-node prisma/seed-exercises.ts

# Start development server
npm run dev
```

Visit `http://localhost:3000`

---

## 📚 Documentation

**Quick reference**: See `CLAUDE.md` for comprehensive developer documentation

**Detailed documentation**:
- `CLAUDE.md` - Complete developer guide (architecture, conventions, API reference)
- `docs/training-engine/` - 36 markdown files covering elite training system
  - `MASTER_PLAN.md` - 14-phase roadmap
  - `Elite_Training_Zone_Frameworks.md` - Methodologies overview
  - `ELITE_PACE_ZONE_IMPLEMENTATION_PLAN.md` - Elite pace zone scientific framework
  - `END_TO_END_TEST_SCENARIOS.md` - Comprehensive test scenarios
- `STRENGTH_TRAINING_IMPLEMENTATION_CHECKLIST.md` - Strength training implementation
- `INJURY_CROSS_TRAINING_IMPLEMENTATION.md` - Injury management implementation

---

## 🏗️ Architecture

### Tech Stack

**Framework**: Next.js 15 with App Router and React Server Components
**Language**: TypeScript (strict mode)
**Database**: PostgreSQL via Supabase with Prisma ORM
**Authentication**: Supabase Auth with role-based access control
**Styling**: Tailwind CSS with shadcn/ui components
**Charts**: Recharts for data visualization
**Forms**: React Hook Form with Zod validation
**PDF Export**: jsPDF with html2canvas
**Email**: Resend for report delivery

### Key Directories

```
konditionstest-app/
├── app/
│   ├── coach/                # Coach pages (programs, tests, monitoring, tools)
│   ├── athlete/              # Athlete pages (dashboard, workouts, check-in)
│   └── api/                  # 52 API endpoints
├── components/
│   ├── coach/                # 25 coach components
│   └── athlete/              # 21 athlete components
├── lib/
│   ├── calculations/         # Core physiological calculations
│   ├── training-engine/      # Elite training system
│   ├── program-generator/    # Program generation logic
│   └── auth-utils.ts         # Role-based authorization
├── types/
│   └── index.ts              # TypeScript type definitions
├── prisma/
│   └── schema.prisma         # Database schema (40+ models)
└── docs/
    └── training-engine/      # 36 markdown documentation files
```

### User Roles

- **COACH** - Creates clients, tests, programs (original test leaders)
- **ATHLETE** - Views programs, logs workouts, sees test results
- **ADMIN** - Full system access

---

## 🧪 Testing

```bash
# Unit tests (Vitest)
npm test
npm run test:watch
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# Calculation validation
npm run validate:calculations

# Manual test scripts (in scripts/ directory)
npx ts-node scripts/test-comprehensive-program-generation.ts
npx ts-node scripts/test-training-engine.ts
npx ts-node scripts/test-zone-calculations.ts
```

---

## 📊 Database

**40+ Prisma models** organized by feature:

**Core Testing**: User, Client, Team, Test, TestStage, Report
**Training Programs**: TrainingProgram, TrainingWeek, TrainingDay, Workout, WorkoutSegment
**Elite Training Engine**: AthleteProfile, DailyCheckIn, ThresholdCalculation, FieldTest, InjuryAssessment, CrossTrainingSession, RaceCalendar, Race
**Strength Training**: Exercise, ProgressionTracking, OneRepMaxHistory
**Communication**: Message, AthleteAccount
**Billing**: Subscription

See `prisma/schema.prisma` for complete schema.

---

## 🌍 Deployment

**Designed for Vercel deployment**:

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

**Environment variables required**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `RESEND_API_KEY` (optional)

---

## 🤝 Contributing

This is a proprietary project for Star by Thomson. For questions or support, contact the development team.

---

## 📝 License

Proprietary - Star by Thomson

---

## 🆘 Support

**For developers**:
- Read `CLAUDE.md` for complete documentation
- Check `docs/training-engine/` for elite training system details
- Run `/help` in the application for user guides

**For issues**:
- Review `CLAUDE_MD_CODE_REVIEW.md` for known issues and gaps
- Check `INJURY_CROSS_TRAINING_IMPLEMENTATION.md` for implementation status

---

## 📈 Stats

- **52 API endpoints**
- **40+ database models**
- **84 exercises** in strength training library
- **4 elite training methodologies**
- **36 training engine documentation files**
- **25 coach components + 21 athlete components**
- **~90,000 lines of TypeScript code**

---

# Svenska

# Konditionstest & Träningsplattform

En omfattande Next.js 15 webbapplikation för professionell uthållighetsträning, som kombinerar fysiologisk testning, träningsprogramgenerering och atletövervakning.

**Byggd för**: Star by Thomson
**Status**: Produktionsklar med 4 huvudsystem
**Tech Stack**: Next.js 15, TypeScript, PostgreSQL, Supabase, Prisma, Tailwind CSS

---

## 🎯 Vad Den Gör

### 1. **Fysiologisk Testning** (Ursprunglig kärna)
Professionell labbtestrapportgenerering med automatiska beräkningar för laktattröskel, träningszoner, VO2max och löpekonomi.

**Nyckelfunktioner**:
- Flerstegs testdatainmatning (löpning, cykling, skidåkning)
- D-max laktattröskeldetektering (polynomanpassning)
- Garmin 5-zon träningszoner
- PDF-export med professionella diagram
- Historisk testjämförelse

### 2. **Träningsprogram**
Helårs uthållighetsträningsprogram med atletportaler och träningsloggning.

**Nyckelfunktioner**:
- Programgenerering med periodisering (BAS → BYGG → TOPP → NEDTRAPPNING)
- Atletinstrumentpanel med dagliga träningspass
- Träningsloggning med RPE-spårning
- Framstegsvisualisering
- Tränarredigering av program

### 3. **Elit Träningsmotorn**
Avancerat träningssystem med automatisk anpassning baserad på atletövervakning, fälttester och skadehantering.

**Nyckelfunktioner**:
- 4 elitmetodologier: Polariserad (80/20), Norsk (dubbel tröskel), Canova, Pyramidal
- Elit-pace-zonsystem (VDOT → Laktat → Hjärtfrekvens → Profil hierarkisk beräkning)
- HRV/RHR-övervakning med daglig beredskapsbedömning
- Automatisk träningsmodifiering baserad på beredskap
- Skadehantering (University of Delaware smärtregler, 9 skadetyper)
- Korträningsintegration (6 modaliteter med TSS-ekvivalens)
- Multi-tävlingsplanering med A/B/C-klassificering
- ACWR-övervakning för skadeförebyggande

### 4. **Styrketräning**
Periodiserad styrketräning med automatisk progressionsspårning och biomekanisk övningsbalans.

**Nyckelfunktioner**:
- 5-fas periodisering (AA → Max Styrka → Kraft → Underhåll → Nedtrappning)
- 84-övningsbibliotek med svenska/engelska namn
- 1RM-uppskattning (Epley/Brzycki-formler - ingen testning krävs)
- 2-för-2 automatisk progressionsregel
- Plateådetektering med avlastningsrekommendationer
- Interferenshantering (styrka/löpningsschemaläggning)
- Plyometrisk volymkontroll (vetenskapliga kontaktgränser)

---

## 🚀 Snabbstart

```bash
# Installera dependencies
npm install

# Konfigurera miljövariabler
cp .env.example .env.local
# Redigera .env.local med dina Supabase-uppgifter

# Konfigurera databas
npx prisma generate
npx prisma migrate dev

# Seed övningsbibliotek
npx ts-node prisma/seed-exercises.ts

# Starta utvecklingsserver
npm run dev
```

Besök `http://localhost:3000`

---

## 📚 Dokumentation

**Snabbreferens**: Se `CLAUDE.md` för omfattande utvecklardokumentation

**Detaljerad dokumentation**:
- `CLAUDE.md` - Komplett utvecklarguide (arkitektur, konventioner, API-referens)
- `docs/training-engine/` - 36 markdown-filer som täcker elitträningssystem
- `STRENGTH_TRAINING_IMPLEMENTATION_CHECKLIST.md` - Styrketräningsimplementering
- `INJURY_CROSS_TRAINING_IMPLEMENTATION.md` - Skadehanteringsimplementering

Se engelsk version för ytterligare detaljer.

---

**För frågor eller support, kontakta utvecklingsteamet.**
