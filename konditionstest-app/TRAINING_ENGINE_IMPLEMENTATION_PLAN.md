# Training Engine - Complete Implementation Plan

**Version:** 1.0
**Created:** 2025-01-11
**Implementation Timeline:** 16 weeks (4 months)
**Build Method:** Autonomous Claude Code implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Phase 1: Database Foundation](#phase-1-database-foundation-week-1)
4. [Phase 2: Core Calculation Library](#phase-2-core-calculation-library-weeks-1-2)
5. [Phase 3: Monitoring Systems](#phase-3-monitoring-systems-weeks-2-3)
6. [Phase 4: Field Testing Module](#phase-4-field-testing-module-week-3)
7. [Phase 5: Self-Service Lactate Entry](#phase-5-self-service-lactate-entry-week-4)
8. [Phase 6: Training Methodologies](#phase-6-training-methodologies-weeks-4-5)
9. [Phase 7: Program Generation Engine](#phase-7-program-generation-engine-weeks-5-7)
10. [Phase 8: Workout Modification System](#phase-8-workout-modification-system-weeks-7-8)
11. [Phase 9: API Layer](#phase-9-api-layer-weeks-8-9)
12. [Phase 10: UI Components - Coach Portal](#phase-10-ui-components-coach-portal-weeks-9-11)
13. [Phase 11: UI Components - Athlete Portal](#phase-11-ui-components-athlete-portal-weeks-11-13)
14. [Phase 12: Integration & Migration](#phase-12-integration-migration-week-13)
15. [Phase 13: Testing & Validation](#phase-13-testing-validation-weeks-14-15)
16. [Phase 14: Documentation & Deployment](#phase-14-documentation-deployment-week-16)
17. [File Structure Reference](#file-structure-reference)
18. [Dependencies & Prerequisites](#dependencies-prerequisites)
19. [Testing Strategy](#testing-strategy)
20. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

### What We're Building

A complete elite-level training program generation and monitoring system that transforms the Konditionstest app from a test reporting tool into a comprehensive training platform. The system includes:

- **Advanced Threshold Detection**: D-max algorithm (r² ≥ 0.90) replacing basic OBLA methods
- **4 Elite Training Methodologies**: Norwegian, Polarized, Pyramidal, Canova with automatic selection
- **Daily Athlete Monitoring**: HRV, RHR, wellness questionnaires with composite readiness scoring
- **Automatic Workout Modification**: Real-time adjustments based on recovery markers
- **Injury Prevention**: ACWR tracking with automatic deload triggers
- **Field Testing Suite**: 30-min TT, 20-min TT, HR drift, critical velocity, race-based estimation
- **Self-Service Lactate Entry**: Athletes can input their own lactate measurements for threshold tracking
- **Multi-Race Season Planning**: A/B/C race classification with recovery protocols
- **Cross-Training Integration**: DWR, cycling, elliptical with fitness retention calculations

### Key Innovations

1. **Never uses generic %HRmax formulas** - all zones anchored to individualized LT1/LT2
2. **Evidence-based decision algorithms** - every recommendation backed by research
3. **Athlete empowerment** - runners can track their own lactate data between lab tests
4. **Adaptive not prescriptive** - program modifies daily based on readiness
5. **Methodology-specific intelligence** - Norwegian requires different rules than Polarized

### Success Criteria

- Threshold calculation accuracy >95% (R² ≥ 0.90)
- Program completion rate >80%
- Injury rate <5% (vs ~20% baseline for runners)
- User satisfaction score >4.5/5
- Time-to-program-generation <2 minutes

---

## System Architecture Overview

### Technology Stack

**Backend:**
- Next.js 15 App Router (React Server Components)
- TypeScript (strict mode)
- Prisma ORM → PostgreSQL (Supabase)
- Server Actions for mutations

**Frontend:**
- React 18+ with Server Components
- Tailwind CSS + shadcn/ui
- Recharts for data visualization
- React Hook Form + Zod validation

**Infrastructure:**
- Supabase (Database + Auth)
- Vercel (Hosting)
- Edge Functions for calculations

### Data Flow Architecture

```
Test Data (Lab or Field)
    ↓
Threshold Calculation (D-max/Mod-Dmax)
    ↓
Athlete Categorization (Beginner → Elite)
    ↓
Methodology Selection (Polarized/Norwegian/Canova/Pyramidal)
    ↓
Program Generation (Periodization + Weekly Plans)
    ↓
Daily Monitoring (HRV/RHR/Wellness/ACWR)
    ↓
Workout Modification (Auto-adjust based on readiness)
    ↓
Workout Execution & Logging
    ↓
Performance Tracking (VDOT progression, race predictions)
```

### Module Dependencies

```
Core Calculations (dmax, zones, tss)
    ↓
Field Tests ← → Monitoring Systems
    ↓              ↓
Athlete Profile & Categorization
    ↓
Methodology Selector
    ↓
Program Generator → Workout Modifier
    ↓                    ↓
API Layer ← → UI Components
```

---

## Phase 1: Database Foundation (Week 1)

### Overview

Extend the existing Prisma schema with all new models required for the training engine. This phase is **CRITICAL** - all subsequent phases depend on this foundation.

### Tasks

#### Task 1.1: Update Prisma Schema

**File:** `prisma/schema.prisma`

**Add the following models:**

```prisma
// ============================================
// ENHANCED THRESHOLD CALCULATIONS
// ============================================

model ThresholdCalculation {
  id                String   @id @default(cuid())
  testId            String   @unique
  method            String   // "D-MAX", "MOD-DMAX", "OBLA", "FIELD_TEST", "SELF_REPORTED"
  confidence        String   // "VERY_HIGH", "HIGH", "MEDIUM", "LOW"

  // D-max specific data
  polynomialCoeffs  Json?    // {a: number, b: number, c: number, d: number}
  r2                Float?   // Goodness of fit (require ≥0.90 for high confidence)
  dmax_intensity    Float?   // Intensity at D-max point
  dmax_lactate      Float?   // Lactate at D-max point
  dmax_hr           Float?   // Heart rate at D-max point

  // LT1 (Aerobic Threshold) data
  lt1_intensity     Float    // km/h, watts, or m/s
  lt1_lactate       Float    // mmol/L
  lt1_hr            Float    // bpm
  lt1_method        String   // "BASELINE_PLUS_0.5", "HR_DRIFT", "TALK_TEST"

  // LT2 (Anaerobic Threshold) data
  lt2_intensity     Float
  lt2_lactate       Float
  lt2_hr            Float
  lt2_percentVO2max Float?   // LT2 as % of VO2max (for categorization)

  // Metadata
  testDate          DateTime
  notes             String?
  warnings          Json?    // Array of validation warnings

  test              Test     @relation(fields: [testId], references: [id], onDelete: Cascade)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([testId])
}

// ============================================
// ATHLETE PROFILING & CATEGORIZATION
// ============================================

model AthleteProfile {
  id                  String   @id @default(cuid())
  clientId            String   @unique

  // Categorization
  category            String   // "BEGINNER", "RECREATIONAL", "ADVANCED", "ELITE"
  vo2maxPercentile    Float?   // Percentile for age/gender
  lt2AsPercentVO2max  Float?   // Key categorization metric

  // Monitoring baselines (established over 14-21 days)
  hrvBaseline         Float?   // RMSSD in ms
  hrvStdDev           Float?   // Standard deviation for thresholds
  hrvLastUpdated      DateTime?
  rhrBaseline         Float?   // bpm
  rhrLastUpdated      DateTime?

  // Current training zones (JSON for flexibility)
  trainingZones       Json?    // {zone1: {hrMin, hrMax, paceMin, paceMax}, zone2: {...}, ...}
  zonesLastUpdated    DateTime?

  // Equipment & capabilities
  hasLactateMeter     Boolean  @default(false)
  hasHRVMonitor       Boolean  @default(false)
  hasPowerMeter       Boolean  @default(false)

  // Training history context
  yearsRunning        Int?
  typicalWeeklyKm     Float?
  longestLongRun      Float?

  client              Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([clientId])
}

// ============================================
// DAILY MONITORING SYSTEM
// ============================================

model DailyMetrics {
  id                  String   @id @default(cuid())
  clientId            String
  date                DateTime @db.Date

  // ===== HRV DATA =====
  hrvRMSSD            Float?   // Primary HRV metric (ms)
  hrvQuality          String?  // "GOOD", "FAIR", "POOR"
  hrvArtifactPercent  Float?   // % of recording with artifacts
  hrvDuration         Float?   // Duration of measurement in seconds
  hrvPosition         String?  // "SUPINE", "SEATED"
  hrvStatus           String?  // "EXCELLENT", "GOOD", "MODERATE", "FAIR", "POOR", "VERY_POOR"
  hrvPercent          Float?   // % of baseline
  hrvTrend            String?  // "IMPROVING", "STABLE", "DECLINING"

  // ===== RESTING HEART RATE =====
  restingHR           Float?   // bpm
  restingHRDev        Float?   // Deviation from baseline (bpm)
  restingHRStatus     String?  // Status based on deviation

  // ===== WELLNESS QUESTIONNAIRE (1-10 scale) =====
  sleepQuality        Int?     // 1=terrible, 10=perfect
  sleepHours          Float?   // Actual hours slept
  muscleSoreness      Int?     // 1=none, 10=severe
  energyLevel         Int?     // 1=exhausted, 10=energized
  mood                Int?     // 1=terrible, 10=excellent
  stress              Int?     // 1=none, 10=extreme
  injuryPain          Int?     // 1=none, 10=severe

  // Derived wellness scores
  wellnessScore       Float?   // Weighted composite (0-10)
  wellnessStatus      String?  // "EXCELLENT" to "VERY_POOR"

  // ===== COMPOSITE READINESS =====
  readinessScore      Float?   // 0-10 weighted composite of all factors
  readinessLevel      String?  // "EXCELLENT", "GOOD", "MODERATE", "FAIR", "POOR", "VERY_POOR"
  recommendedAction   String?  // "PROCEED", "MODIFY_LIGHT", "MODIFY_MODERATE", "MODIFY_SIGNIFICANT", "REST_REQUIRED"

  // Factor contributions (JSON for detailed breakdown)
  factorScores        Json?    // {hrv: {score, weight, status}, rhr: {...}, wellness: {...}, acwr: {...}, sleep: {...}}

  // Flags for critical issues
  redFlags            Json?    // Array of {severity: "CRITICAL", message: "..."}
  yellowFlags         Json?    // Array of {severity: "WARNING", message: "..."}

  // Notes
  athleteNotes        String?  // Free text from athlete
  coachNotes          String?  // Free text from coach

  client              Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([clientId, date])
  @@index([clientId, date])
}

// ============================================
// TRAINING LOAD & ACWR TRACKING
// ============================================

model TrainingLoad {
  id              String   @id @default(cuid())
  clientId        String
  date            DateTime @db.Date

  // Daily training load
  dailyLoad       Float    // TSS or TRIMP
  loadType        String   // "TSS", "TRIMP_EDWARDS", "TRIMP_BANISTER", "TRIMP_LUCIA"

  // ACWR calculations (Exponentially Weighted Moving Average)
  acuteLoad       Float?   // 7-day EWMA
  chronicLoad     Float?   // 28-day EWMA
  acwr            Float?   // Acute:Chronic ratio
  acwrZone        String?  // "DETRAINING", "OPTIMAL", "CAUTION", "DANGER", "CRITICAL"
  injuryRisk      String?  // "LOW", "MODERATE", "HIGH", "VERY_HIGH"

  // Session details
  duration        Float    // minutes
  distance        Float?   // km
  avgHR           Float?   // bpm
  maxHR           Float?   // bpm
  avgPace         Float?   // sec/km
  intensity       String   // "RECOVERY", "EASY", "MODERATE", "HARD", "VERY_HARD"

  // Session type
  workoutType     String?  // "EASY", "LONG", "THRESHOLD", "INTERVALS", "TEMPO", "RECOVERY", "RACE"
  workoutId       String?  // Link to planned workout if exists

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())

  @@index([clientId, date])
}

// ============================================
// TRAINING PROGRAMS
// ============================================

model TrainingProgramEngine {
  id              String   @id @default(cuid())
  clientId        String

  // Core settings
  name            String   // Program name
  methodology     String   // "POLARIZED", "NORWEGIAN", "CANOVA", "PYRAMIDAL", "LYDIARD"
  status          String   @default("DRAFT") // "DRAFT", "ACTIVE", "COMPLETED", "PAUSED", "ARCHIVED"

  // Timeline
  startDate       DateTime
  endDate         DateTime
  totalWeeks      Int
  currentWeek     Int      @default(1)
  currentPhase    String?  // "BASE", "BUILD", "PEAK", "TAPER", "RECOVERY"

  // Goals
  targetRaceDate  DateTime?
  targetDistance  String?  // "5K", "10K", "HALF", "MARATHON", "ULTRA"
  targetTime      String?  // HH:MM:SS

  // Program structure (JSON for flexibility)
  periodization   Json     // Array of {phase, startWeek, endWeek, weeklyVolume, intensityDistribution, qualitySessionsPerWeek}
  weeklyPlans     Json     // Array of weekly workout structures

  // Methodology-specific settings (JSON)
  methodologyConfig Json?  // Norwegian: {thresholdVolume, lactatTargets}, Canova: {percentages}, etc.

  // Generation metadata
  generatedBy     String   // "COACH" or "AUTO"
  generatedFrom   Json?    // {testId, fieldTestId, thresholdData}

  // Tracking
  completedWeeks  Int      @default(0)
  missedWorkouts  Int      @default(0)
  modifiedWorkouts Int     @default(0)

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  workouts        Workout[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([clientId, status])
  @@index([clientId, startDate, endDate])
}

// ============================================
// WORKOUT MODIFICATIONS
// ============================================

model WorkoutModification {
  id              String   @id @default(cuid())
  workoutId       String
  date            DateTime @default(now())

  // Decision
  decision        String   // "PROCEED", "MINOR_MODIFICATION", "MODERATE_MODIFICATION", "MAJOR_MODIFICATION", "CANCEL"
  autoGenerated   Boolean  @default(true) // false if coach manually modified

  // Original plan
  plannedType     String
  plannedDuration Float    // minutes
  plannedDistance Float?   // km
  plannedIntensity String
  plannedDetails  Json?    // Full planned workout structure

  // Modified plan
  modifiedType    String?
  modifiedDuration Float?
  modifiedDistance Float?
  modifiedIntensity String?
  modifiedDetails Json?

  // Reasoning
  readinessScore  Float?
  factors         Json     // Array of {factor, weight, contribution, status}
  reasoning       String   // Human-readable explanation
  methodology     String?  // Methodology-specific guidance

  // References to monitoring data
  dailyMetricsId  String?
  acwr            Float?

  workout         Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())

  @@index([workoutId])
  @@index([date])
}

// ============================================
// FIELD TESTS
// ============================================

model FieldTest {
  id              String   @id @default(cuid())
  clientId        String
  testType        String   // "30MIN_TT", "20MIN_TT", "HR_DRIFT", "CRITICAL_VELOCITY", "TALK_TEST", "RACE_BASED"
  date            DateTime

  // Test conditions
  conditions      Json?    // {temperature, humidity, wind, terrain}

  // Raw results (JSON for flexibility across test types)
  results         Json     // Test-specific data structure

  // Derived thresholds
  lt1Pace         Float?   // sec/km
  lt1HR           Float?   // bpm
  lt2Pace         Float?   // sec/km
  lt2HR           Float?   // bpm
  confidence      String?  // "VERY_HIGH", "HIGH", "MEDIUM", "LOW"

  // Validation
  valid           Boolean  @default(true)
  warnings        Json?    // Array of validation warnings
  errors          Json?    // Array of errors

  // Notes
  notes           String?

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())

  @@index([clientId, date])
  @@index([testType, date])
}

// ============================================
// SELF-REPORTED LACTATE MEASUREMENTS
// ============================================

model SelfReportedLactate {
  id              String   @id @default(cuid())
  clientId        String
  date            DateTime

  // Measurement context
  measurementType String   // "WORKOUT", "RACE", "STANDALONE_TEST"
  workoutType     String?  // "EASY", "TEMPO", "THRESHOLD", "INTERVALS", "LONG"

  // Single measurement data
  intensity       Float?   // km/h, watts, or pace (if single measurement)
  lactate         Float?   // mmol/L (if single measurement)
  heartRate       Float?   // bpm (if single measurement)
  rpe             Int?     // 1-10 scale

  // Multi-stage test data (for self-administered incremental tests)
  measurements    Json?    // Array of {stage, intensity, lactate, heartRate, rpe}

  // Equipment & quality
  meterBrand      String?  // "Lactate Plus", "Lactate Scout", etc.
  calibrated      Boolean  @default(false)
  qualityRating   String?  // "GOOD", "FAIR", "POOR"

  // Derived insights (calculated by system)
  estimatedLT1    Float?   // If enough data points
  estimatedLT2    Float?
  confidence      String?  // "LOW", "MEDIUM", "HIGH" based on data quality

  // Context
  workoutId       String?  // Link to workout if during planned session
  notes           String?
  photos          Json?    // Array of photo URLs (meter readings)

  // Validation status
  validated       Boolean  @default(false) // Coach can validate measurements
  validatedBy     String?  // Coach userId
  validatedAt     DateTime?

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([clientId, date])
  @@index([clientId, measurementType])
}

// ============================================
// RACE CALENDAR & MULTI-RACE PLANNING
// ============================================

model RaceCalendar {
  id              String   @id @default(cuid())
  clientId        String
  seasonName      String   // "Spring 2025", "Fall Marathon Build", etc.
  startDate       DateTime
  endDate         DateTime

  races           Race[]

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([clientId])
}

model Race {
  id              String   @id @default(cuid())
  calendarId      String
  clientId        String

  // Race details
  name            String
  date            DateTime
  distance        String   // "5K", "10K", "HALF", "MARATHON"
  classification  String   // "A", "B", "C"
  priority        Int      @default(1) // 1=highest

  // Goals
  targetTime      String?  // HH:MM:SS
  targetPace      Float?   // sec/km

  // Preparation
  taperWeeks      Int?
  lastQualityDate DateTime?

  // Results
  actualTime      String?
  actualPace      Float?
  place           Int?
  avgHR           Float?
  maxHR           Float?
  splits          Json?    // Array of split times
  conditions      Json?    // Weather, terrain

  // Analysis
  vdot            Float?   // Jack Daniels VDOT
  equivalents     Json?    // Equivalent performances at other distances
  assessment      String?  // "EXCEEDED", "MET", "CLOSE", "MISSED"

  // Notes
  notes           String?
  photos          Json?

  calendar        RaceCalendar @relation(fields: [calendarId], references: [id], onDelete: Cascade)
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([clientId, date])
  @@index([classification, date])
}

// ============================================
// EXTEND EXISTING MODELS
// ============================================

// Add these fields to existing Workout model
model Workout {
  id                String   @id @default(cuid())
  // ... existing fields ...

  // NEW FIELDS:
  programId         String?  // Link to training program
  weekNumber        Int?     // Week within program
  dayOfWeek         Int?     // 1-7 (Monday-Sunday)
  sessionNumber     Int?     // 1, 2 (for double days)

  // Planned details (from program generation)
  plannedType       String?  // "EASY", "LONG", "THRESHOLD", "INTERVALS", "TEMPO", "RECOVERY", "RACE"
  plannedDuration   Float?   // minutes
  plannedDistance   Float?   // km
  plannedIntensity  String?  // "Z1", "Z2", "Z3", "Z4", "Z5" or specific pace
  plannedStructure  Json?    // Detailed workout structure (warmup, intervals, cooldown)

  // Executed details (logged after completion)
  executedType      String?
  executedDuration  Float?
  executedDistance  Float?
  executedIntensity String?
  actualData        Json?    // GPS data, HR zones, splits

  // Training load
  tss               Float?   // Training Stress Score
  trimp             Float?   // TRIMP

  // Relationship
  program           TrainingProgramEngine? @relation(fields: [programId], references: [id], onDelete: SetNull)
  modifications     WorkoutModification[]

  @@index([programId, weekNumber])
}

// Add to existing Client model
model Client {
  // ... existing fields ...

  // NEW RELATIONSHIPS:
  athleteProfile       AthleteProfile?
  dailyMetrics         DailyMetrics[]
  trainingLoads        TrainingLoad[]
  programs             TrainingProgramEngine[]
  fieldTests           FieldTest[]
  selfReportedLactates SelfReportedLactate[]
  raceCalendars        RaceCalendar[]
  races                Race[]
}
```

#### Task 1.2: Generate Prisma Client

```bash
npx prisma generate
```

#### Task 1.3: Create Database Migration

```bash
npx prisma migrate dev --name add_training_engine_foundation
```

**Expected output:** Migration files created in `prisma/migrations/`

#### Task 1.4: Update TypeScript Types

**File:** `types/index.ts`

Add TypeScript interfaces for all new models (these will be auto-generated by Prisma, but add custom types for complex JSON structures):

```typescript
// ============================================
// TRAINING ZONES
// ============================================

export interface TrainingZone {
  name: string;
  hrMin: number;
  hrMax: number;
  paceMin: number;  // sec/km
  paceMax: number;  // sec/km
  lactateTarget: string;
  purpose: string;
}

export interface TrainingZones {
  zone1: TrainingZone;  // Recovery
  zone2: TrainingZone;  // Aerobic base
  zone3: TrainingZone;  // Tempo
  zone4: TrainingZone;  // Threshold
  zone5: TrainingZone;  // VO2max
}

// ============================================
// PERIODIZATION
// ============================================

export interface TrainingPhase {
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY';
  startWeek: number;
  endWeek: number;
  weeklyVolume: number;  // km
  intensityDistribution: {
    zone1_2_percent: number;
    zone3_percent: number;
    zone4_5_percent: number;
  };
  qualitySessionsPerWeek: number;
}

// ============================================
// READINESS ASSESSMENT
// ============================================

export interface ReadinessFactors {
  hrv?: {
    score: number;  // 0-10
    weight: number;
    status: string;
    rawValue: number;
    percentOfBaseline: number;
  };
  rhr?: {
    score: number;
    weight: number;
    status: string;
    rawValue: number;
    deviation: number;
  };
  wellness?: {
    score: number;
    weight: number;
    status: string;
    breakdown: {
      sleep: number;
      soreness: number;
      energy: number;
      mood: number;
      stress: number;
      injury: number;
    };
  };
  acwr?: {
    score: number;
    weight: number;
    status: string;
    value: number;
    zone: string;
  };
  sleep?: {
    score: number;
    weight: number;
    status: string;
    hours: number;
    quality: number;
  };
}

export interface ReadinessFlag {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  factor: string;
  action?: string;
}

export interface ReadinessAssessment {
  compositeScore: number;  // 0-10
  readinessLevel: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'FAIR' | 'POOR' | 'VERY_POOR';
  recommendedAction: 'PROCEED' | 'MODIFY_LIGHT' | 'MODIFY_MODERATE' | 'MODIFY_SIGNIFICANT' | 'REST_REQUIRED';
  factors: ReadinessFactors;
  redFlags: ReadinessFlag[];
  yellowFlags: ReadinessFlag[];
  reasoning: string;
}

// ============================================
// WORKOUT STRUCTURES
// ============================================

export interface WorkoutInterval {
  duration: number;    // minutes
  distance?: number;   // meters
  intensity: string;   // "Z4", "@LT2", "5K pace", etc.
  recovery: number;    // minutes or meters
  repetitions: number;
}

export interface WorkoutStructure {
  warmup: {
    duration: number;
    intensity: string;
  };
  mainSet: WorkoutInterval[];
  cooldown: {
    duration: number;
    intensity: string;
  };
  drills?: string[];
  strides?: {
    count: number;
    distance: number;
  };
}

// ============================================
// SELF-REPORTED LACTATE
// ============================================

export interface LactateMeasurement {
  stage: number;
  intensity: number;   // km/h or watts
  lactate: number;     // mmol/L
  heartRate: number;   // bpm
  rpe: number;         // 1-10
  timestamp?: Date;
}

export interface SelfReportedLactateEntry {
  date: Date;
  measurementType: 'WORKOUT' | 'RACE' | 'STANDALONE_TEST';
  workoutType?: string;

  // Single measurement
  single?: {
    intensity: number;
    lactate: number;
    heartRate: number;
    rpe: number;
  };

  // Multi-stage test
  measurements?: LactateMeasurement[];

  // Equipment
  meterBrand?: string;
  calibrated: boolean;
  qualityRating: 'GOOD' | 'FAIR' | 'POOR';

  notes?: string;
  photos?: string[];
}
```

#### Task 1.5: Verify Migration Success

```bash
# Check database schema
npx prisma studio

# Verify all new tables exist
# Expected new tables:
# - ThresholdCalculation
# - AthleteProfile
# - DailyMetrics
# - TrainingLoad
# - TrainingProgramEngine
# - WorkoutModification
# - FieldTest
# - SelfReportedLactate
# - RaceCalendar
# - Race
```

### Acceptance Criteria

- [ ] All new Prisma models added to schema
- [ ] Migration runs without errors
- [ ] Prisma Studio shows all new tables
- [ ] TypeScript types compile without errors
- [ ] No breaking changes to existing models
- [ ] All relationships correctly defined with cascade deletes
- [ ] Indexes created on frequently queried fields

### Dependencies

- Existing Prisma schema (Client, Test, TestStage, Workout models)
- PostgreSQL database (Supabase)

### Estimated Time

**4-6 hours**

---

## Phase 2: Core Calculation Library (Weeks 1-2)

### Overview

Implement the mathematical algorithms that power the entire system. These are pure TypeScript functions with no database dependencies, making them easy to test and reuse.

### File Structure

```
lib/training-engine/
├── calculations/
│   ├── dmax.ts                 # D-max and Mod-Dmax algorithms
│   ├── zones-enhanced.ts       # Individualized zone calculation
│   ├── tss-trimp.ts           # Training stress calculations
│   ├── race-predictions.ts     # Race time predictions
│   ├── vdot.ts                # Jack Daniels VDOT
│   └── environmental.ts        # Temperature/altitude/wind adjustments
├── utils/
│   ├── polynomial-fit.ts       # Polynomial regression
│   ├── interpolation.ts        # Linear interpolation
│   ├── statistics.ts           # Mean, std dev, R²
│   └── validation.ts           # Data validation helpers
└── __tests__/
    └── calculations/
        ├── dmax.test.ts
        ├── zones.test.ts
        └── tss-trimp.test.ts
```

### Task 2.1: Polynomial Fitting Utility

**File:** `lib/training-engine/utils/polynomial-fit.ts`

**Purpose:** Fit 3rd degree polynomial for D-max calculation

```typescript
/**
 * Polynomial Regression Utilities
 * Fits polynomial curves using least squares method
 */

export interface PolynomialCoefficients {
  a: number;  // x³ coefficient
  b: number;  // x² coefficient
  c: number;  // x coefficient
  d: number;  // constant
}

export interface RegressionResult {
  coefficients: PolynomialCoefficients;
  r2: number;
  predictions: number[];
}

/**
 * Fit 3rd degree polynomial: y = ax³ + bx² + cx + d
 * Uses Vandermonde matrix method for least squares fit
 *
 * @param x - Independent variable (intensity)
 * @param y - Dependent variable (lactate)
 * @returns Polynomial coefficients and goodness of fit (R²)
 */
export function fitPolynomial3(x: number[], y: number[]): RegressionResult {
  const n = x.length;

  if (n < 4) {
    throw new Error('Minimum 4 data points required for 3rd degree polynomial');
  }

  // Build Vandermonde matrix: [x³, x², x, 1]
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    X.push([
      Math.pow(x[i], 3),
      Math.pow(x[i], 2),
      x[i],
      1
    ]);
  }

  // Solve normal equations: (X^T X)β = X^T y
  const coefficients = solveNormalEquations(X, y);

  // Calculate predictions
  const predictions = x.map(xi =>
    coefficients.a * Math.pow(xi, 3) +
    coefficients.b * Math.pow(xi, 2) +
    coefficients.c * xi +
    coefficients.d
  );

  // Calculate R² (coefficient of determination)
  const r2 = calculateR2(y, predictions);

  return {
    coefficients: {
      a: coefficients.a,
      b: coefficients.b,
      c: coefficients.c,
      d: coefficients.d
    },
    r2,
    predictions
  };
}

/**
 * Solve normal equations using matrix operations
 * (X^T X)β = X^T y
 */
function solveNormalEquations(X: number[][], y: number[]): PolynomialCoefficients {
  // Calculate X^T X
  const XtX = multiplyMatrices(transpose(X), X);

  // Calculate X^T y
  const Xty = multiplyMatrixVector(transpose(X), y);

  // Solve using Gaussian elimination
  const beta = gaussianElimination(XtX, Xty);

  return {
    a: beta[0],
    b: beta[1],
    c: beta[2],
    d: beta[3]
  };
}

/**
 * Calculate R² (coefficient of determination)
 * R² = 1 - (SS_res / SS_tot)
 * where SS_res = Σ(y_i - ŷ_i)²
 *       SS_tot = Σ(y_i - ȳ)²
 */
export function calculateR2(observed: number[], predicted: number[]): number {
  const n = observed.length;
  const mean = observed.reduce((sum, val) => sum + val, 0) / n;

  let ssRes = 0;  // Sum of squares of residuals
  let ssTot = 0;  // Total sum of squares

  for (let i = 0; i < n; i++) {
    ssRes += Math.pow(observed[i] - predicted[i], 2);
    ssTot += Math.pow(observed[i] - mean, 2);
  }

  return 1 - (ssRes / ssTot);
}

// Matrix operations
function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];

  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j];
    }
  }

  return result;
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const rowsA = a.length;
  const colsA = a[0].length;
  const colsB = b[0].length;
  const result: number[][] = [];

  for (let i = 0; i < rowsA; i++) {
    result[i] = [];
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }

  return result;
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  const rows = matrix.length;
  const result: number[] = [];

  for (let i = 0; i < rows; i++) {
    let sum = 0;
    for (let j = 0; j < matrix[i].length; j++) {
      sum += matrix[i][j] * vector[j];
    }
    result[i] = sum;
  }

  return result;
}

/**
 * Gaussian elimination for solving linear systems
 * Ax = b → x
 */
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented: number[][] = [];

  // Create augmented matrix [A|b]
  for (let i = 0; i < n; i++) {
    augmented[i] = [...A[i], b[i]];
  }

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  const x: number[] = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  return x;
}
```

**Test File:** `lib/training-engine/__tests__/calculations/polynomial-fit.test.ts`

```typescript
import { fitPolynomial3, calculateR2 } from '../../utils/polynomial-fit';

describe('Polynomial Fitting', () => {
  test('fits perfect cubic', () => {
    // Test data: y = x³ + 2x² - 3x + 1
    const x = [0, 1, 2, 3, 4];
    const y = x.map(xi => Math.pow(xi, 3) + 2 * Math.pow(xi, 2) - 3 * xi + 1);

    const result = fitPolynomial3(x, y);

    expect(result.r2).toBeGreaterThan(0.9999);
    expect(result.coefficients.a).toBeCloseTo(1, 4);
    expect(result.coefficients.b).toBeCloseTo(2, 4);
    expect(result.coefficients.c).toBeCloseTo(-3, 4);
    expect(result.coefficients.d).toBeCloseTo(1, 4);
  });

  test('fits real lactate curve data', () => {
    // Real lactate test data
    const intensity = [10, 12, 14, 16, 18];  // km/h
    const lactate = [1.2, 1.5, 2.1, 3.5, 6.2];  // mmol/L

    const result = fitPolynomial3(intensity, lactate);

    expect(result.r2).toBeGreaterThan(0.90);  // Require good fit
    expect(result.predictions.length).toBe(5);
  });

  test('throws error with insufficient data', () => {
    const x = [1, 2, 3];
    const y = [1, 4, 9];

    expect(() => fitPolynomial3(x, y)).toThrow('Minimum 4 data points');
  });
});
```

### Task 2.2: D-max Calculation

**File:** `lib/training-engine/calculations/dmax.ts`

**Purpose:** Calculate lactate thresholds using D-max method

```typescript
import { fitPolynomial3, PolynomialCoefficients } from '../utils/polynomial-fit';

export interface LactateTestData {
  intensity: number[];   // km/h, watts, or m/s
  lactate: number[];     // mmol/L
  heartRate: number[];   // bpm
  unit: 'kmh' | 'watts' | 'mps';
}

export interface ThresholdPoint {
  intensity: number;
  lactate: number;
  heartRate: number;
  method: string;
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DmaxResult {
  method: 'DMAX' | 'MOD-DMAX';
  lt2: ThresholdPoint;
  polynomialCoefficients: PolynomialCoefficients;
  r2: number;
  baselineSlope: number;
  warnings: string[];
  valid: boolean;
}

/**
 * Calculate LT2 using D-max method
 *
 * Algorithm:
 * 1. Fit 3rd degree polynomial to lactate curve
 * 2. Calculate baseline slope (first point to last point)
 * 3. Find point where curve tangent equals baseline slope
 * 4. Solve: 3ax² + 2bx + (c - avgSlope) = 0
 * 5. Select larger root within data range
 *
 * Requirements:
 * - Minimum 4 data points
 * - R² ≥ 0.90 for high confidence
 * - R² ≥ 0.85 acceptable with warning
 * - R² < 0.85 = invalid, use fallback method
 */
export function calculateDmax(data: LactateTestData): DmaxResult {
  const warnings: string[] = [];

  // Validation
  if (data.intensity.length < 4) {
    throw new Error('Minimum 4 data points required for D-max calculation');
  }

  if (data.intensity.length !== data.lactate.length ||
      data.intensity.length !== data.heartRate.length) {
    throw new Error('All arrays must have same length');
  }

  // Check baseline lactate
  const baselineLactate = data.lactate[0];
  if (baselineLactate > 2.5) {
    warnings.push('High baseline lactate (>2.5 mmol/L) - test may be invalid');
  }

  // Check for monotonic increase (warning, not error)
  for (let i = 1; i < data.lactate.length; i++) {
    if (data.lactate[i] < data.lactate[i - 1]) {
      warnings.push('Non-monotonic lactate progression detected');
      break;
    }
  }

  // Fit polynomial
  const { coefficients, r2, predictions } = fitPolynomial3(data.intensity, data.lactate);
  const { a, b, c, d } = coefficients;

  // Check goodness of fit
  let confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  if (r2 >= 0.95) {
    confidence = 'VERY_HIGH';
  } else if (r2 >= 0.90) {
    confidence = 'HIGH';
  } else if (r2 >= 0.85) {
    confidence = 'MEDIUM';
    warnings.push(`Moderate curve fit (R²=${r2.toFixed(3)}). Consider using Mod-Dmax or field tests.`);
  } else {
    confidence = 'LOW';
    warnings.push(`Poor curve fit (R²=${r2.toFixed(3)}). D-max invalid. Use OBLA or field test instead.`);
    return {
      method: 'DMAX',
      lt2: {
        intensity: 0,
        lactate: 0,
        heartRate: 0,
        method: 'DMAX',
        confidence: 'LOW'
      },
      polynomialCoefficients: coefficients,
      r2,
      baselineSlope: 0,
      warnings,
      valid: false
    };
  }

  // Calculate baseline slope
  const n = data.intensity.length;
  const baselineSlope = (data.lactate[n - 1] - data.lactate[0]) /
                        (data.intensity[n - 1] - data.intensity[0]);

  // Find D-max point
  // Derivative: y' = 3ax² + 2bx + c
  // Set equal to baseline slope: 3ax² + 2bx + (c - baselineSlope) = 0
  // Solve using quadratic formula

  const A = 3 * a;
  const B = 2 * b;
  const C = c - baselineSlope;

  const discriminant = B * B - 4 * A * C;

  if (discriminant < 0) {
    warnings.push('No real solution for D-max - curve may be too flat');
    return {
      method: 'DMAX',
      lt2: { intensity: 0, lactate: 0, heartRate: 0, method: 'DMAX', confidence: 'LOW' },
      polynomialCoefficients: coefficients,
      r2,
      baselineSlope,
      warnings,
      valid: false
    };
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const root1 = (-B + sqrtDisc) / (2 * A);
  const root2 = (-B - sqrtDisc) / (2 * A);

  // Select larger root (should be within data range)
  const dmaxIntensity = Math.max(root1, root2);

  // Validate D-max is within data range
  const minIntensity = data.intensity[0];
  const maxIntensity = data.intensity[n - 1];

  if (dmaxIntensity < minIntensity || dmaxIntensity > maxIntensity) {
    warnings.push(`D-max (${dmaxIntensity.toFixed(1)}) outside data range [${minIntensity}, ${maxIntensity}]`);
  }

  // Calculate lactate at D-max
  const dmaxLactate = a * Math.pow(dmaxIntensity, 3) +
                      b * Math.pow(dmaxIntensity, 2) +
                      c * dmaxIntensity +
                      d;

  // Interpolate heart rate at D-max
  const dmaxHR = interpolateHeartRate(data.intensity, data.heartRate, dmaxIntensity);

  return {
    method: 'DMAX',
    lt2: {
      intensity: dmaxIntensity,
      lactate: dmaxLactate,
      heartRate: dmaxHR,
      method: 'DMAX',
      confidence
    },
    polynomialCoefficients: coefficients,
    r2,
    baselineSlope,
    warnings,
    valid: r2 >= 0.85
  };
}

/**
 * Calculate LT2 using Modified D-max method
 * More reliable than standard D-max (CV ≈ 3.4%)
 *
 * Algorithm:
 * 1. Find last point BEFORE lactate rises ≥0.4 mmol/L above baseline
 * 2. Apply standard D-max to data starting from this point
 * 3. Better handles early lactate fluctuations
 */
export function calculateModDmax(data: LactateTestData): DmaxResult {
  const baselineLactate = data.lactate[0];
  const threshold = baselineLactate + 0.4;

  // Find cutoff point
  let cutoffIndex = 0;
  for (let i = 1; i < data.lactate.length; i++) {
    if (data.lactate[i] >= threshold) {
      cutoffIndex = i - 1;
      break;
    }
  }

  // If no cutoff found (lactate never rises 0.4), use all data
  if (cutoffIndex === 0) {
    cutoffIndex = data.lactate.length - 1;
  }

  // Create adjusted dataset starting from cutoff
  const adjustedData: LactateTestData = {
    intensity: data.intensity.slice(cutoffIndex),
    lactate: data.lactate.slice(cutoffIndex),
    heartRate: data.heartRate.slice(cutoffIndex),
    unit: data.unit
  };

  // Apply standard D-max to adjusted data
  const result = calculateDmax(adjustedData);

  // Update method name
  return {
    ...result,
    method: 'MOD-DMAX',
    lt2: {
      ...result.lt2,
      method: 'MOD-DMAX'
    }
  };
}

/**
 * Calculate LT1 using Baseline + 0.5 mmol/L method
 */
export function calculateLT1Baseline(data: LactateTestData): ThresholdPoint {
  const baselineLactate = data.lactate[0];
  const targetLactate = baselineLactate + 0.5;

  // Find first point where lactate exceeds target
  for (let i = 1; i < data.lactate.length; i++) {
    if (data.lactate[i] >= targetLactate) {
      // Linear interpolation between [i-1] and [i]
      const intensity = interpolateLinear(
        data.lactate[i - 1], data.intensity[i - 1],
        data.lactate[i], data.intensity[i],
        targetLactate
      );

      const hr = interpolateLinear(
        data.lactate[i - 1], data.heartRate[i - 1],
        data.lactate[i], data.heartRate[i],
        targetLactate
      );

      return {
        intensity,
        lactate: targetLactate,
        heartRate: hr,
        method: 'BASELINE_PLUS_0.5',
        confidence: 'HIGH'
      };
    }
  }

  // If target never reached, use last point
  const n = data.lactate.length - 1;
  return {
    intensity: data.intensity[n],
    lactate: data.lactate[n],
    heartRate: data.heartRate[n],
    method: 'BASELINE_PLUS_0.5',
    confidence: 'LOW'
  };
}

/**
 * Linear interpolation between two points
 */
function interpolateLinear(
  x1: number, y1: number,
  x2: number, y2: number,
  x: number
): number {
  return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
}

/**
 * Interpolate heart rate at given intensity
 */
function interpolateHeartRate(
  intensities: number[],
  heartRates: number[],
  targetIntensity: number
): number {
  // Find bracketing indices
  for (let i = 1; i < intensities.length; i++) {
    if (intensities[i] >= targetIntensity) {
      return interpolateLinear(
        intensities[i - 1], heartRates[i - 1],
        intensities[i], heartRates[i],
        targetIntensity
      );
    }
  }

  // If target is beyond range, return last HR
  return heartRates[heartRates.length - 1];
}

/**
 * Calculate both LT1 and LT2 from lactate test
 */
export interface CompletedThresholdAnalysis {
  lt1: ThresholdPoint;
  lt2: ThresholdPoint;
  method: 'DMAX' | 'MOD-DMAX';
  r2: number;
  polynomialCoefficients: PolynomialCoefficients;
  warnings: string[];
  valid: boolean;
}

export function analyzeThresholds(data: LactateTestData): CompletedThresholdAnalysis {
  // Prefer Mod-Dmax over standard D-max
  const lt2Result = calculateModDmax(data);
  const lt1 = calculateLT1Baseline(data);

  return {
    lt1,
    lt2: lt2Result.lt2,
    method: lt2Result.method,
    r2: lt2Result.r2,
    polynomialCoefficients: lt2Result.polynomialCoefficients,
    warnings: lt2Result.warnings,
    valid: lt2Result.valid
  };
}
```

**Continue in next message due to length...**

This document is getting very long. Should I:

1. **Continue building out this comprehensive document** (will be 50+ pages covering all 14 phases in detail)
2. **Split into multiple focused documents** (one per phase)
3. **Create a master plan** with links to detailed phase documents

Which approach would work best for your implementation?