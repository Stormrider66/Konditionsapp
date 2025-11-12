# Phase 1: Database Foundation

**Duration:** Week 1 (4-6 hours)
**Prerequisites:** None - this is the foundation
**Status:** 📝 Not Started

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Next Phase: Calculations](./PHASE_02_CALCULATIONS.md)
- [Related Phases](#related-phases)

---

## Overview

This phase establishes the complete database schema for the training engine. **Everything depends on this foundation** - all subsequent phases require these models to exist.

### What We're Building

15 new Prisma models + extensions to existing models:

**Core Training Models:**
1. **ThresholdCalculation** - D-max results and threshold data
2. **AthleteProfile** - Categorization and baselines
3. **DailyMetrics** - HRV, RHR, wellness tracking
4. **TrainingLoad** - TSS/TRIMP and ACWR calculations
5. **TrainingProgramEngine** - Complete program structure
6. **WorkoutModification** - Automatic adjustments
7. **FieldTest** - Field test results
8. **SelfReportedLactate** - Athlete lactate entries ⭐ NEW

**Advanced Features Models:**
9. **RaceCalendar** - Season planning
10. **Race** - Individual race details
11. **InjuryAssessment** - Pain tracking and protocols ⭐ NEW
12. **CrossTrainingSession** - Alternative training ⭐ NEW
13. **StrengthTrainingSession** - Periodized strength work ⭐ NEW
14. **EnvironmentalConditions** - Weather/altitude adjustments ⭐ NEW
15. **MethodologyTransition** - Blending protocols ⭐ NEW

### Key Innovation: Self-Reported Lactate

Athletes can track their own lactate measurements between lab tests:
- Single measurements during workouts
- Multi-stage incremental tests
- Photo uploads of meter readings
- Coach validation workflow
- Automatic threshold estimation

---

## Tasks

### Task 1.1: Backup Existing Database

**⚠️ CRITICAL: Always backup before schema changes**

```bash
# Export current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use Supabase dashboard to create snapshot
```

### Task 1.2: Update Prisma Schema

**File:** `prisma/schema.prisma`

Add the following after existing models:

```prisma
// ============================================
// TRAINING ENGINE MODELS
// Added: 2025-01-11
// Purpose: Elite training program generation
// ============================================

// ============================================
// ENHANCED THRESHOLD CALCULATIONS
// ============================================

/// Stores results from D-max, Mod-Dmax, and field test threshold calculations
/// Links to Test model for lab tests
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

/// Central profile for each athlete with categorization, baselines, and zones
/// One-to-one with Client model
model AthleteProfile {
  id                  String   @id @default(cuid())
  clientId            String   @unique

  // Categorization (affects methodology selection)
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
  // Format: {zone1: {hrMin, hrMax, paceMin, paceMax}, zone2: {...}, ...}
  trainingZones       Json?
  zonesLastUpdated    DateTime?

  // Equipment & capabilities
  hasLactateMeter     Boolean  @default(false)  // Can do self-testing
  hasHRVMonitor       Boolean  @default(false)  // Can track daily HRV
  hasPowerMeter       Boolean  @default(false)  // For cycling

  // Training history context
  yearsRunning        Int?
  typicalWeeklyKm     Float?
  longestLongRun      Float?

  client              Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([clientId])
  @@index([category])
}

// ============================================
// DAILY MONITORING SYSTEM
// ============================================

/// Daily metrics for athlete monitoring
/// Used for readiness assessment and workout modification decisions
model DailyMetrics {
  id                  String   @id @default(cuid())
  clientId            String
  date                DateTime @db.Date

  // ===== HRV DATA =====
  // Measured first thing in morning, lying supine, 3-5 min duration
  hrvRMSSD            Float?   // Primary HRV metric (ms)
  hrvQuality          String?  // "GOOD", "FAIR", "POOR"
  hrvArtifactPercent  Float?   // % of recording with artifacts (reject if >5%)
  hrvDuration         Float?   // Duration of measurement in seconds
  hrvPosition         String?  // "SUPINE", "SEATED" (must be consistent)
  hrvStatus           String?  // "EXCELLENT", "GOOD", "MODERATE", "FAIR", "POOR", "VERY_POOR"
  hrvPercent          Float?   // % of baseline
  hrvTrend            String?  // "IMPROVING", "STABLE", "DECLINING"

  // ===== RESTING HEART RATE =====
  restingHR           Float?   // bpm
  restingHRDev        Float?   // Deviation from baseline (bpm)
  restingHRStatus     String?  // Status based on deviation thresholds

  // ===== WELLNESS QUESTIONNAIRE (1-10 scale) =====
  sleepQuality        Int?     // 1=terrible, 10=perfect
  sleepHours          Float?   // Actual hours slept
  muscleSoreness      Int?     // 1=none, 10=severe
  energyLevel         Int?     // 1=exhausted, 10=energized
  mood                Int?     // 1=terrible, 10=excellent
  stress              Int?     // 1=none, 10=extreme
  injuryPain          Int?     // 1=none, 10=severe (AUTO RED FLAG if <6)

  // Derived wellness scores
  wellnessScore       Float?   // Weighted composite (0-10)
  wellnessStatus      String?  // "EXCELLENT" to "VERY_POOR"

  // ===== COMPOSITE READINESS =====
  // Calculated from HRV + RHR + Wellness + ACWR + Sleep
  readinessScore      Float?   // 0-10 weighted composite
  readinessLevel      String?  // "EXCELLENT", "GOOD", "MODERATE", "FAIR", "POOR", "VERY_POOR"
  recommendedAction   String?  // "PROCEED", "MODIFY_LIGHT", "MODIFY_MODERATE", "MODIFY_SIGNIFICANT", "REST_REQUIRED"

  // Factor contributions (JSON for detailed breakdown)
  // Format: {hrv: {score: 8.5, weight: 3.0, status: "GOOD"}, rhr: {...}, ...}
  factorScores        Json?

  // Flags for critical issues
  redFlags            Json?    // Array of {severity: "CRITICAL", message: "...", factor: "..."}
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

/// Daily training load with ACWR calculation
/// Uses Exponentially Weighted Moving Average (EWMA) method
model TrainingLoad {
  id              String   @id @default(cuid())
  clientId        String
  date            DateTime @db.Date

  // Daily training load
  dailyLoad       Float    // TSS or TRIMP value
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

/// Complete training program with periodization and methodology
/// Generated from athlete profile, thresholds, and goals
model TrainingProgramEngine {
  id              String   @id @default(cuid())
  clientId        String

  // Core settings
  name            String   // "Marathon Build Spring 2025"
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
  // Format: Array of {phase, startWeek, endWeek, weeklyVolume, intensityDistribution, qualitySessionsPerWeek}
  periodization   Json
  // Format: Array of {weekNumber, sessions: [{day, type, duration, intensity, structure}]}
  weeklyPlans     Json

  // Methodology-specific settings (JSON)
  // Norwegian: {thresholdVolume: 25, lactateTargets: {morning: [2.0, 3.0], afternoon: [2.5, 3.5]}}
  // Canova: {percentages: {...}}
  methodologyConfig Json?

  // Generation metadata
  generatedBy     String   // "COACH" or "AUTO"
  generatedFrom   Json?    // {testId: "...", fieldTestId: "...", thresholdData: {...}}

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

/// Tracks automatic and manual workout modifications
/// Records reasoning for future analysis
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
  @@index([decision])
}

// ============================================
// FIELD TESTS
// ============================================

/// Results from field tests (30-min TT, HR drift, etc.)
/// Alternative to lab testing for threshold determination
model FieldTest {
  id              String   @id @default(cuid())
  clientId        String
  testType        String   // "30MIN_TT", "20MIN_TT", "HR_DRIFT", "CRITICAL_VELOCITY", "TALK_TEST", "RACE_BASED"
  date            DateTime

  // Test conditions
  conditions      Json?    // {temperature: 20, humidity: 60, wind: "light", terrain: "flat"}

  // Raw results (JSON for flexibility across test types)
  // 30MIN_TT: {totalDistance, firstHalf, secondHalf, avgHR_final20, splits: [...]}
  // HR_DRIFT: {duration, targetPace, hrProgression: [...], driftPercent, driftBpm}
  // CRITICAL_VELOCITY: {timeTrials: [{distance, time, avgHR}], regression: {...}}
  results         Json

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
// SELF-REPORTED LACTATE MEASUREMENTS ⭐ NEW
// ============================================

/// Athletes can track their own lactate measurements
/// Empowers runners with lactate meters to monitor between lab tests
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
  // Format: [{stage: 1, intensity: 10, lactate: 1.2, heartRate: 130, rpe: 3}, {...}]
  measurements    Json?

  // Equipment & quality
  meterBrand      String?  // "Lactate Plus", "Lactate Scout", "Lactate Pro 2", etc.
  calibrated      Boolean  @default(false)
  qualityRating   String?  // "GOOD", "FAIR", "POOR"

  // Derived insights (calculated by system)
  estimatedLT1    Float?   // sec/km or watts (if enough data points)
  estimatedLT2    Float?
  confidence      String?  // "LOW", "MEDIUM", "HIGH" based on data quality

  // Context
  workoutId       String?  // Link to workout if during planned session
  notes           String?
  photos          Json?    // Array of photo URLs (meter readings for verification)

  // Validation status
  validated       Boolean  @default(false) // Coach can validate measurements
  validatedBy     String?  // Coach userId
  validatedAt     DateTime?
  validationNotes String?

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([clientId, date])
  @@index([clientId, measurementType])
  @@index([validated])
}

// ============================================
// RACE CALENDAR & MULTI-RACE PLANNING
// ============================================

/// Season-level race planning with A/B/C classification
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

/// Individual race with classification, goals, and results
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
// INJURY MANAGEMENT SYSTEM ⭐ NEW
// ============================================

/// Injury assessment and pain tracking
/// Implements University of Delaware Soreness Rules and pain-based decision tree
model InjuryAssessment {
  id              String   @id @default(cuid())
  clientId        String
  date            DateTime @default(now())

  // Pain assessment (0-10 numeric scale)
  painLevel       Int      // 0=none, 10=severe
  painLocation    String?  // "PLANTAR_FASCIA", "ACHILLES", "IT_BAND", "PATELLA", "SHIN", "HIP_FLEXOR", "HAMSTRING", "CALF"
  painTiming      String?  // "DURING_WARMUP", "DURING_WORKOUT", "POST_WORKOUT", "MORNING_STIFFNESS", "CONSTANT"
  gaitAffected    Boolean  @default(false) // RED FLAG if true
  
  // Soreness rules assessment
  painDuringWarmup Boolean @default(false)
  painContinuesThroughout Boolean @default(false)
  painDisappearsAfterWarmup Boolean @default(false)
  painRedevelopsLater Boolean @default(false)
  painPersists1HourPost Boolean @default(false)

  // Functional assessment
  rangeOfMotion   String?  // "NORMAL", "SLIGHTLY_LIMITED", "MODERATELY_LIMITED", "SEVERELY_LIMITED"
  swelling        Boolean  @default(false)
  discoloration   Boolean  @default(false)
  weightBearing   String?  // "NORMAL", "SLIGHTLY_AFFECTED", "LIMPING", "UNABLE"

  // Assessment result
  assessment      String   // "CONTINUE", "MODIFY", "REST_1_DAY", "REST_2_3_DAYS", "MEDICAL_EVALUATION"
  injuryType      String?  // Diagnosed type if known
  phase           String?  // "ACUTE", "SUBACUTE", "CHRONIC", "RECOVERY"

  // Protocol recommendations
  recommendedProtocol Json? // Return-to-running phase, exercises, modifications
  estimatedTimeOff String? // "0_DAYS", "1_3_DAYS", "1_WEEK", "2_4_WEEKS", "4_PLUS_WEEKS", "UNKNOWN"

  // Follow-up
  resolved        Boolean  @default(false)
  resolvedDate    DateTime?
  notes           String?

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([clientId, date])
  @@index([painLevel, gaitAffected])
}

// ============================================
// CROSS-TRAINING SYSTEM ⭐ NEW
// ============================================

/// Cross-training sessions for injured athletes or variety
/// Maintains fitness using validated equivalencies
model CrossTrainingSession {
  id              String   @id @default(cuid())
  clientId        String
  date            DateTime
  workoutId       String?  // Link to replaced running workout

  // Session details
  modality        String   // "DEEP_WATER_RUNNING", "CYCLING", "ELLIPTICAL", "SWIMMING", "ALTERG", "ROWING"
  duration        Float    // minutes
  distance        Float?   // km (if applicable)
  avgHR           Float?   // bpm
  maxHR           Float?   // bpm
  avgPower        Float?   // watts (cycling)
  rpe             Int?     // 1-10 scale

  // Intensity structure
  intensity       String   // "EASY", "MODERATE", "HARD"
  structure       Json?    // Intervals, rest periods, etc.

  // Equipment specific
  bodyWeightSupport Float? // % for AlterG
  resistance      String?  // Elliptical/bike resistance
  strokeRate      Float?   // Swimming strokes/min

  // Conversion calculations
  runningEquivalent Json   // {estimatedTSS, runningDistance, runningDuration, fitnessRetention}
  tssEquivalent   Float?   // Training Stress Score equivalent

  // Context
  reason          String?  // "INJURY", "VARIETY", "WEATHER", "PREFERENCE"
  injuryType      String?  // If due to injury
  effectiveness   String?  // "EXCELLENT", "GOOD", "MODERATE", "POOR" (post-session rating)

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([clientId, date])
  @@index([modality, date])
}

// ============================================
// STRENGTH TRAINING & PLYOMETRICS ⭐ NEW
// ============================================

/// Periodized strength training sessions
/// Integrates with running periodization phases
model StrengthTrainingSession {
  id              String   @id @default(cuid())
  clientId        String
  date            DateTime
  
  // Session type
  phase           String   // "ANATOMICAL_ADAPTATION", "MAXIMUM_STRENGTH", "POWER", "MAINTENANCE"
  sessionType     String   // "STRENGTH_A", "STRENGTH_B", "PLYOMETRICS", "COMBINED"
  
  // Timing relative to running
  timingRelativeToRun String? // "BEFORE_RUN", "AFTER_RUN_6H", "SEPARATE_DAY"
  runningWorkoutId String?    // Link to running workout if same day

  // Strength exercises (JSON array)
  // Format: [{exercise: "Back Squat", sets: 4, reps: 5, load: "85% 1RM", rpe: 8, rest: 180}, ...]
  strengthExercises Json?

  // Plyometric exercises (JSON array)
  // Format: [{exercise: "Box Jumps", sets: 3, reps: 8, height: "18 inches", contacts: 24, rest: 120}, ...]
  plyometricExercises Json?

  // Running drills (JSON array)
  // Format: [{drill: "A-Skip", sets: 3, distance: 50, focus: "knee lift"}, ...]
  runningDrills   Json?

  // Volume tracking
  totalSets       Int?     // Total sets across all exercises
  totalContacts   Int?     // Total plyometric contacts
  duration        Float    // minutes
  rpe             Int?     // Overall session RPE 1-10

  // Load progression
  strengthLoad    Float?   // Volume load (sets × reps × weight)
  plyometricLoad  Float?   // Contact load
  
  // Integration with running
  runningPhase    String?  // "BASE", "BUILD", "PEAK", "COMPETITION", "RECOVERY"
  priorityLevel   String   // "PRIMARY", "SECONDARY", "MAINTENANCE"

  // Effectiveness
  completionRate  Float?   // % of planned exercises completed
  qualityRating   String?  // "EXCELLENT", "GOOD", "MODERATE", "POOR"
  
  notes           String?

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([clientId, date])
  @@index([phase, date])
}


// ============================================
// EXTEND EXISTING MODELS
// ============================================

// Update existing Workout model with new fields
model Workout {
  id                String   @id @default(cuid())
  // ... existing fields remain unchanged ...

  // NEW FIELDS FOR TRAINING ENGINE:
  programId         String?  // Link to training program
  weekNumber        Int?     // Week within program (1-based)
  dayOfWeek         Int?     // 1-7 (Monday=1, Sunday=7)
  sessionNumber     Int?     // 1 or 2 (for double days)

  // Planned details (from program generation)
  plannedType       String?  // "EASY", "LONG", "THRESHOLD", "INTERVALS", "TEMPO", "RECOVERY", "RACE"
  plannedDuration   Float?   // minutes
  plannedDistance   Float?   // km
  plannedIntensity  String?  // "Z1", "Z2", "Z3", "Z4", "Z5" or specific pace/power
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

  // Relationships
  program           TrainingProgramEngine? @relation(fields: [programId], references: [id], onDelete: SetNull)
  modifications     WorkoutModification[]

  @@index([programId, weekNumber])
}

// Add new fields to existing Test model
model Test {
  // ... existing fields remain unchanged ...

  // NEW FIELD:
  thresholdCalculation ThresholdCalculation?
}

// Add relationships to existing Client model
model Client {
  // ... existing fields remain unchanged ...

  // NEW RELATIONSHIPS:
  athleteProfile       AthleteProfile?
  dailyMetrics         DailyMetrics[]
  trainingLoads        TrainingLoad[]
  programs             TrainingProgramEngine[]
  fieldTests           FieldTest[]
  selfReportedLactates SelfReportedLactate[]
  raceCalendars        RaceCalendar[]
  races                Race[]
  injuryAssessments    InjuryAssessment[]
  crossTrainingSessions CrossTrainingSession[]
  strengthSessions     StrengthTrainingSession[]
  environmentalConditions EnvironmentalConditions[]
  methodologyTransitions MethodologyTransition[]
}
```

### Task 1.3: Generate Prisma Client

```bash
cd /mnt/d/VO2\ max\ report/konditionstest-app
npx prisma generate
```

**Expected output:**
```
✔ Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client in XXXms
```

### Task 1.4: Create Migration

```bash
npx prisma migrate dev --name add_training_engine_foundation
```

**Expected output:**
```
✔ Generated migration files
✔ Applied migration
```

**Verify migration created:** Check `prisma/migrations/` folder for new migration directory

### Task 1.5: Update TypeScript Types

**File:** `types/index.ts`

Add custom types for JSON fields:

```typescript
// ============================================
// TRAINING ENGINE TYPES
// ============================================

// Training Zones
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

// Periodization
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

// Readiness Assessment
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

// Workout Structures
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
    distance: number;  // meters
  };
}

// Self-Reported Lactate
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

### Task 1.6: Verify Database Schema

```bash
# Open Prisma Studio to inspect tables
npx prisma studio
```

**Verify all new tables exist:**
- [ ] ThresholdCalculation
- [ ] AthleteProfile
- [ ] DailyMetrics
- [ ] TrainingLoad
- [ ] TrainingProgramEngine
- [ ] WorkoutModification
- [ ] FieldTest
- [ ] SelfReportedLactate ⭐
- [ ] RaceCalendar
- [ ] Race
- [ ] InjuryAssessment ⭐
- [ ] CrossTrainingSession ⭐
- [ ] StrengthTrainingSession ⭐
- [ ] EnvironmentalConditions ⭐
- [ ] MethodologyTransition ⭐

**Check relationships:**
- [ ] Client → AthleteProfile (one-to-one)
- [ ] Client → DailyMetrics (one-to-many)
- [ ] Client → SelfReportedLactate (one-to-many)
- [ ] Test → ThresholdCalculation (one-to-one)
- [ ] Workout → WorkoutModification (one-to-many)

### Task 1.7: Create Seed Data (Optional)

**File:** `prisma/seed-training-engine.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding training engine test data...');

  // Create test client
  const client = await prisma.client.create({
    data: {
      name: 'Test Runner',
      email: 'test@runner.com',
      gender: 'MALE',
      birthYear: 1990,
      userId: 'test-user-id',
    },
  });

  // Create athlete profile
  await prisma.athleteProfile.create({
    data: {
      clientId: client.id,
      category: 'RECREATIONAL',
      vo2maxPercentile: 75,
      lt2AsPercentVO2max: 88,
      hasLactateMeter: true,  // Enable self-service lactate
      hasHRVMonitor: true,
      trainingZones: {
        zone1: { hrMin: 0, hrMax: 140, paceMin: 360, paceMax: 420 },
        zone2: { hrMin: 140, hrMax: 155, paceMin: 330, paceMax: 360 },
        zone3: { hrMin: 155, hrMax: 165, paceMin: 300, paceMax: 330 },
        zone4: { hrMin: 165, hrMax: 175, paceMin: 270, paceMax: 300 },
        zone5: { hrMin: 175, hrMax: 190, paceMin: 240, paceMax: 270 },
      },
    },
  });

  console.log('✅ Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run seed:**
```bash
npx ts-node prisma/seed-training-engine.ts
```

---

## Acceptance Criteria

- [ ] All 15 new models added to Prisma schema (including injury, cross-training, strength, environmental, transition models)
- [ ] Migration runs without errors
- [ ] Prisma Studio shows all new tables with correct columns
- [ ] TypeScript types compile without errors
- [ ] No breaking changes to existing models
- [ ] All relationships correctly defined
- [ ] Cascade deletes configured appropriately
- [ ] Indexes created on frequently queried fields
- [ ] SelfReportedLactate model includes validation workflow
- [ ] InjuryAssessment model implements University of Delaware Soreness Rules
- [ ] CrossTrainingSession model supports all modalities with TSS equivalencies
- [ ] StrengthTrainingSession model supports periodized training phases
- [ ] EnvironmentalConditions model enables WBGT and altitude adjustments
- [ ] MethodologyTransition model supports sequential blending protocols
- [ ] Database backup created before migration

---

## Testing

### Manual Testing

1. **Prisma Studio Verification:**
   - Open Prisma Studio
   - Navigate to each new table
   - Verify columns match schema
   - Check relationships work (create/delete test records)

2. **TypeScript Compilation:**
   ```bash
   npm run build
   # Should complete without type errors
   ```

3. **Relationship Testing:**
   ```typescript
   // Test cascade delete
   const client = await prisma.client.findFirst();
   await prisma.client.delete({ where: { id: client.id } });
   // Verify all related records deleted
   ```

### Automated Testing (Optional)

**File:** `__tests__/database/schema.test.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Training Engine Database Schema', () => {
  test('can create athlete profile', async () => {
    const client = await prisma.client.create({
      data: { name: 'Test', email: 'test@test.com', userId: 'test' },
    });

    const profile = await prisma.athleteProfile.create({
      data: {
        clientId: client.id,
        category: 'RECREATIONAL',
        hasLactateMeter: true,
      },
    });

    expect(profile).toBeDefined();
    expect(profile.category).toBe('RECREATIONAL');

    // Cleanup
    await prisma.client.delete({ where: { id: client.id } });
  });

  test('can create self-reported lactate measurement', async () => {
    const client = await prisma.client.create({
      data: { name: 'Test', email: 'test2@test.com', userId: 'test2' },
    });

    const lactate = await prisma.selfReportedLactate.create({
      data: {
        clientId: client.id,
        date: new Date(),
        measurementType: 'WORKOUT',
        intensity: 14.5,  // km/h
        lactate: 2.8,     // mmol/L
        heartRate: 165,
        meterBrand: 'Lactate Plus',
        calibrated: true,
        qualityRating: 'GOOD',
      },
    });

    expect(lactate).toBeDefined();
    expect(lactate.lactate).toBe(2.8);

    // Cleanup
    await prisma.client.delete({ where: { id: client.id } });
  });
});
```

---

## Related Phases

**Depends on:**
- None (this is the foundation)

**Required by:**
- [Phase 2: Core Calculations](./PHASE_02_CALCULATIONS.md) - uses ThresholdCalculation, AthleteProfile
- [Phase 3: Monitoring Systems](./PHASE_03_MONITORING.md) - uses DailyMetrics, TrainingLoad
- [Phase 4: Field Testing](./PHASE_04_FIELD_TESTS.md) - uses FieldTest model
- [Phase 5: Self-Service Lactate](./PHASE_05_SELF_SERVICE_LACTATE.md) - uses SelfReportedLactate model
- [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md) - uses TrainingProgramEngine, Workout
- All subsequent phases

**Related documentation:**
- [Master Plan](./MASTER_PLAN.md)
- Original skill documents in `/New engine dev files/`

---

## Troubleshooting

### Migration Fails

**Error:** "Column already exists"
```bash
# Reset database (⚠️ WARNING: Deletes all data)
npx prisma migrate reset
npx prisma migrate dev
```

### Type Errors After Migration

```bash
# Regenerate Prisma Client
npx prisma generate

# Restart TypeScript server in VS Code
# Command Palette → "TypeScript: Restart TS Server"
```

### Relationship Errors

Check foreign key constraints:
```sql
-- View constraints
SELECT * FROM information_schema.table_constraints
WHERE table_name = 'AthleteProfile';
```

---

## Completion Checklist

- [ ] Database backup created
- [ ] Prisma schema updated with all 10 models
- [ ] `npx prisma generate` completed successfully
- [ ] Migration created and applied
- [ ] Prisma Studio shows all new tables
- [ ] TypeScript types added to `types/index.ts`
- [ ] No TypeScript compilation errors
- [ ] All relationships work correctly
- [ ] Seed data created (optional)
- [ ] Manual testing completed
- [ ] Phase marked as complete in Master Plan

---

**Status:** Once all checklist items are complete, update status in [Master Plan](./MASTER_PLAN.md) to ✅ Completed

**Next Phase:** [Phase 2: Core Calculations](./PHASE_02_CALCULATIONS.md)
