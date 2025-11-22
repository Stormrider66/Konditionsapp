# Elite Training Zone & Pace Calculation: Comprehensive Implementation Plan

## Executive Summary

This document outlines the complete implementation of a scientifically-validated training zone and pace calculation system for elite, sub-elite, and recreational runners. The system addresses the critical flaw in existing implementations: **fixed lactate thresholds (2/4 mmol/L) are physiologically meaningless across different athlete populations**.

**Core Principle**: Training zones must be calculated using a **hierarchical multi-source approach** that prioritizes race performance while intelligently interpreting individual lactate profiles as **percentages of maximum lactate production**, not absolute values.

---

## 1. Scientific Foundation

### 1.1 The LT2:Peak Lactate Ratio

From *Metabolic_Equilibrium_Lactate_Analysis.md*, the ratio of LT2 to maximum lactate reveals metabolic specialization:

| Population | LT2 (mmol/L) | Peak La (mmol/L) | Ratio | Physiological Driver |
|------------|--------------|------------------|-------|---------------------|
| **Elite Marathon** | 2.5-3.5 | 6-9 | **35-50%** | Suppressed glycolysis (low VLamax) |
| **Elite 800m** | 4.0-6.0 | 18-25 | **18-25%** | Massive anaerobic reserve (high VLamax) |
| **Sub-Elite** | ~4.0 | 11-14 | **30-35%** | Incomplete specialization |
| **Recreational** | ~4.0 | 8-12 | **33-50%** | Low aerobic base + neuromuscular limitation |

**Critical Insight**: Paula Radcliffe (2:15 marathon) had LT2 <2 mmol/L, max ~5 mmol/L. Kenyan elites: LT2 6-8 mmol/L. Same performance, vastly different lactate profiles.

**Implementation Requirement**: System must calculate LT2 as **% of individual max lactate**, not use fixed values.

### 1.2 Marathon Pace Compression by Level

From *Elite_Training_Zone_Frameworks.md*, the relationship between Marathon Pace (MP) and LT2 pace changes dramatically:

| Level | Marathon Time | MP as % of LT2 Pace | LT2 as % VO2max | Weekly Volume |
|-------|---------------|---------------------|-----------------|---------------|
| **Elite** | <2:30 | **96-98%** | 85-92% | >100 km |
| **Advanced** | 2:30-3:30 | **88-92%** | 80-85% | 60-100 km |
| **Intermediate** | 3:30-4:30 | **82-88%** | 75-82% | 40-60 km |
| **Recreational** | >4:30 | **75-82%** | 65-75% | <40 km |

**Implementation Requirement**: Dynamic compression factor based on athlete level.

### 1.3 Real-World Example: The Fast Twitch Marathoner

**Athlete Profile** (from user):
- Half Marathon: 1:28:00 (4:10/km = 14.4 km/h)
- Race HR: 181/194 bpm (93% max)
- Max lactate: 20.3 mmol/L (at 13 km/h, 6° incline)
- LT2 lactate: ~10 mmol/L
- **Ratio: 10/20.3 = 49.3%** (compressed, like elite marathoner)

**Analysis**:
- High max lactate (>20 mmol) = Fast twitch (Type A) profile
- Compressed ratio (49%) = Elite adaptation
- But absolute values HIGH = Needs glycolytic suppression training
- Expected marathon pace: ~4:25-4:30/km (13.5-13.6 km/h) ✓

**Implementation Requirement**: Detect metabolic type from max lactate, adjust training recommendations.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   DATA COLLECTION LAYER                      │
│  - Race Results (VDOT calculation)                          │
│  - Lactate Test (D-max, manual, or ratio-based)            │
│  - Athlete Profile (volume, years, HR, VO2max)             │
│  - Training History (metabolic type inference)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              INTELLIGENT SOURCE PRIORITIZATION               │
│  Tier 1: Race Performance → VDOT (⭐⭐⭐⭐⭐)                   │
│  Tier 2: Lactate Test (individualized) (⭐⭐⭐⭐)              │
│  Tier 3: HR-Based Estimation (⭐⭐⭐)                          │
│  Tier 4: Profile-Based Estimation (⭐⭐)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                ATHLETE CLASSIFICATION                        │
│  - Level Detection (Elite/Advanced/Intermediate/Rec)        │
│  - Metabolic Type (Fast Twitch vs Slow Twitch)             │
│  - Compression Factor Assignment                            │
│  - Gender & Age Adjustments                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           PHASE-AWARE ZONE CALCULATION                       │
│  BASE PHASE: Physiological Anchor (HR/Lactate zones)       │
│  SPECIFIC PHASE: Performance Anchor (Race pace zones)      │
│  RECOVERY: Autoregulated (RPE + HR caps)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              VALIDATION & WARNING SYSTEM                     │
│  - Consistency checks across data sources                   │
│  - Test age warnings                                        │
│  - Profile mismatch alerts                                  │
│  - Confidence scoring                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 TRAINING ZONE OUTPUT                         │
│  - 5 Daniels zones (E, M, T, I, R) with paces              │
│  - HR zones (LT1, LT2, Max)                                │
│  - Canova zones (7 zones: Regeneration → Lactic/Alactic)  │
│  - Norwegian zones (Green, Threshold, Red)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Modules

### Module 1: VDOT Calculator (`lib/training-engine/calculations/vdot.ts`)

**Purpose**: Gold standard for race-based training zones (Jack Daniels method)

**Input**:
```typescript
interface RacePerformance {
  distance: 'MARATHON' | 'HALF_MARATHON' | '10K' | '5K' | 'CUSTOM'
  distanceKm?: number  // For custom
  timeMinutes: number
  date: Date
}
```

**Output**:
```typescript
interface VDOTResult {
  vdot: number  // 30-85 range
  trainingPaces: {
    easy: { minKmh: number, maxKmh: number, minPace: string, maxPace: string }
    marathon: { kmh: number, pace: string }
    threshold: { kmh: number, pace: string }
    interval: { kmh: number, pace: string }
    repetition: { kmh: number, pace: string }
  }
  equivalentTimes: {
    marathon: number  // minutes
    halfMarathon: number
    tenK: number
    fiveK: number
  }
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM'
  ageInDays: number
}
```

**Key Functions**:
- `calculateVDOT(distance: number, timeMinutes: number): number`
- `getTrainingPaces(vdot: number): TrainingPaces`
- `getEquivalentTimes(vdot: number): EquivalentTimes`

**Formulas** (from Daniels' Running Formula, 3rd ed.):
```typescript
// VDOT calculation (oxygen cost model)
// Simplified: Use lookup tables for accuracy
const vdotTables = {
  marathon: { /* time → VDOT mappings */ },
  halfMarathon: { /* ... */ },
  // etc.
}

// Training pace percentages
const pacePercentages = {
  easy: { min: 0.59, max: 0.74 },      // 59-74% of VDOT velocity
  marathon: 0.84,                       // 84% of VDOT velocity
  threshold: 0.88,                      // 88% of VDOT velocity (comfortably hard)
  interval: 1.0,                        // 100% of VDOT velocity
  repetition: 1.10                      // 110% of VDOT velocity
}
```

---

### Module 2: Lactate Profile Analyzer (`lib/training-engine/calculations/lactate-profile.ts`)

**Purpose**: Intelligent lactate threshold detection using individual ratios

**Input**:
```typescript
interface LactateTest {
  testStages: Array<{
    sequence: number
    speed?: number  // km/h
    incline?: number  // degrees or %
    power?: number  // watts
    lactate: number  // mmol/L
    heartRate: number  // bpm
    vo2?: number  // ml/kg/min
  }>
  maxHR: number
  date: Date
}
```

**Output**:
```typescript
interface LactateProfile {
  // Detected thresholds
  lt1: {
    lactate: number
    lactatPercent: number  // % of max
    speed: number
    heartRate: number
    confidence: ConfidenceLevel
    method: 'DMAX' | 'RATIO' | 'MANUAL' | 'FIXED_2MMOL'
  }

  lt2: {
    lactate: number
    lactatePercent: number  // % of max
    speed: number
    heartRate: number
    confidence: ConfidenceLevel
    method: 'DMAX' | 'RATIO' | 'MANUAL' | 'FIXED_4MMOL'
  }

  // Metabolic characteristics
  maxLactate: number
  lt2Ratio: number  // LT2 / maxLactate
  metabolicType: 'SLOW_TWITCH' | 'MIXED' | 'FAST_TWITCH'
  athleteLevel: 'ELITE' | 'SUB_ELITE' | 'RECREATIONAL'

  // Warnings
  warnings: string[]
  errors: string[]
}
```

**Key Functions**:

```typescript
/**
 * Calculate LT1 and LT2 using hierarchical method selection
 */
function analyzeLactateProfile(test: LactateTest): LactateProfile {
  const maxLactate = Math.max(...test.testStages.map(s => s.lactate))

  // 1. Try D-max first (best method)
  const dmaxResult = calculateDmax(test.testStages)
  if (dmaxResult.rSquared >= 0.90) {
    return {
      lt2: {
        lactate: dmaxResult.dmaxLactate,
        lactatePercent: (dmaxResult.dmaxLactate / maxLactate) * 100,
        speed: dmaxResult.dmaxSpeed,
        heartRate: dmaxResult.dmaxHR,
        confidence: 'VERY_HIGH',
        method: 'DMAX'
      },
      // ... calculate LT1
    }
  }

  // 2. Use ratio-based method (individual %)
  const lt2Ratio = estimateLT2Ratio(maxLactate, test.testStages)
  const lt2Lactate = maxLactate * lt2Ratio
  const lt2Stage = findStageAtLactate(test.testStages, lt2Lactate)

  if (lt2Stage) {
    return {
      lt2: {
        lactate: lt2Lactate,
        lactatePercent: lt2Ratio * 100,
        speed: lt2Stage.speed,
        heartRate: lt2Stage.heartRate,
        confidence: 'HIGH',
        method: 'RATIO'
      },
      // ...
    }
  }

  // 3. Fallback: traditional crossing (with warnings)
  // ...
}

/**
 * Estimate LT2 ratio based on max lactate and curve pattern
 */
function estimateLT2Ratio(maxLactate: number, stages: TestStage[]): number {
  // Elite marathoner profile: max < 10, ratio 40-50%
  if (maxLactate < 10) {
    return 0.45  // 45% of max
  }

  // Elite 800m profile: max > 18, ratio 20-25%
  if (maxLactate > 18) {
    return 0.22  // 22% of max
  }

  // Fast twitch marathoner: max 15-20, ratio 45-55%
  if (maxLactate >= 15 && maxLactate <= 20) {
    return 0.50  // 50% of max
  }

  // Sub-elite: max 11-14, ratio 30-35%
  if (maxLactate >= 11 && maxLactate <= 14) {
    return 0.33  // 33% of max
  }

  // Recreational: max 8-12, ratio 33-50%
  // But likely "false peak" - use conservative
  return 0.44  // 44% of max
}

/**
 * Detect metabolic type from lactate profile
 */
function detectMetabolicType(maxLactate: number, lt2Ratio: number): MetabolicType {
  if (maxLactate > 15) {
    // High glycolytic capacity
    if (lt2Ratio > 0.40) {
      return 'FAST_TWITCH_ENDURANCE'  // Like user's athlete
    } else {
      return 'FAST_TWITCH_POWER'  // 800m specialist
    }
  } else if (maxLactate < 10) {
    return 'SLOW_TWITCH'  // Elite marathoner
  } else {
    return 'MIXED'  // Sub-elite
  }
}
```

---

### Module 3: Athlete Classifier (`lib/training-engine/calculations/athlete-classifier.ts`)

**Purpose**: Classify athlete level from all available data

**Input**:
```typescript
interface AthleteProfile {
  // Training history
  weeklyKm: number
  yearsRunning: number

  // Physiological data
  maxHR: number
  restingHR?: number
  vo2max?: number

  // Performance data
  recentRaces?: RacePerformance[]
  lactateProfile?: LactateProfile

  // Demographics
  age: number
  gender: 'MALE' | 'FEMALE'
}
```

**Output**:
```typescript
interface AthleteClassification {
  level: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'RECREATIONAL'
  vdot?: number

  compressionFactor: number  // MP as % of LT2
  lt2PercentVO2max: number   // Expected LT2 intensity

  metabolicType: MetabolicType
  trainingRecommendations: {
    recoveryDays: number  // Between hard sessions
    intervalType: 'EXTENSIVE' | 'INTENSIVE' | 'MIXED'
    taperLength: number  // weeks
    volumeTolerance: 'HIGH' | 'MEDIUM' | 'LOW'
  }

  confidence: ConfidenceLevel
  dataQuality: {
    hasRecentRace: boolean
    hasLactateTest: boolean
    hasVO2max: boolean
    completeness: number  // 0-100%
  }
}
```

**Classification Logic**:

```typescript
function classifyAthlete(profile: AthleteProfile): AthleteClassification {
  let score = 0
  let level: AthleteLevel = 'RECREATIONAL'
  let compressionFactor = 0.75

  // === VDOT-based classification (most reliable) ===
  if (profile.recentRaces && profile.recentRaces.length > 0) {
    const vdot = calculateVDOT(
      profile.recentRaces[0].distanceKm,
      profile.recentRaces[0].timeMinutes
    )

    if (vdot >= 65) {
      level = 'ELITE'
      compressionFactor = 0.96
    } else if (vdot >= 55) {
      level = 'ADVANCED'
      compressionFactor = 0.88
    } else if (vdot >= 45) {
      level = 'INTERMEDIATE'
      compressionFactor = 0.85
    } else {
      level = 'RECREATIONAL'
      compressionFactor = 0.78
    }

    return { level, compressionFactor, vdot, /* ... */ }
  }

  // === Profile-based estimation (no race data) ===

  // Weekly volume indicator
  if (profile.weeklyKm > 100) score += 30
  else if (profile.weeklyKm > 70) score += 20
  else if (profile.weeklyKm > 40) score += 10

  // Training age
  if (profile.yearsRunning >= 5) score += 20
  else if (profile.yearsRunning >= 3) score += 10

  // VO2max (if available)
  if (profile.vo2max) {
    if (profile.vo2max > 65) score += 25
    else if (profile.vo2max > 55) score += 15
    else if (profile.vo2max > 45) score += 5
  }

  // Lactate profile (if available)
  if (profile.lactateProfile) {
    const lt2HR = profile.lactateProfile.lt2.heartRate
    const lt2Percent = (lt2HR / profile.maxHR) * 100

    if (lt2Percent > 92) score += 25  // Elite
    else if (lt2Percent > 88) score += 15  // Advanced
    else if (lt2Percent > 82) score += 5   // Intermediate
  }

  // Convert score to level
  if (score >= 70) {
    level = 'ELITE'
    compressionFactor = 0.96
  } else if (score >= 45) {
    level = 'ADVANCED'
    compressionFactor = 0.88
  } else if (score >= 25) {
    level = 'INTERMEDIATE'
    compressionFactor = 0.85
  } else {
    level = 'RECREATIONAL'
    compressionFactor = 0.78
  }

  return { level, compressionFactor, /* ... */ }
}
```

---

### Module 4: Comprehensive Pace Selector (`lib/training-engine/calculations/pace-selector.ts`)

**Purpose**: Unified system that selects optimal training paces from all sources

**Input**: All available data (races, lactate, profile)

**Output**:
```typescript
interface PaceSelection {
  // Primary training paces
  marathonPace: { kmh: number, pace: string }
  thresholdPace: { kmh: number, pace: string }

  // Complete zone system
  zones: {
    daniels: DanielsZones      // E, M, T, I, R
    canova: CanovaZones        // 7 zones
    norwegian: NorwegianZones  // Green, Threshold, Red
    hrBased: HRZones           // 5 zones by HR %
  }

  // Source information
  primarySource: 'VDOT' | 'LACTATE_RATIO' | 'HR_ESTIMATION' | 'PROFILE_ESTIMATION'
  confidence: ConfidenceLevel

  // Metadata
  athleteClassification: AthleteClassification
  validationResults: ValidationResults
  warnings: string[]
  errors: string[]
}
```

**Selection Hierarchy**:

```typescript
async function selectOptimalPaces(
  profile: AthleteProfile,
  test?: Test,
  recentRaces?: RacePerformance[]
): Promise<PaceSelection> {

  // === TIER 1: VDOT from Race Performance (HIGHEST PRIORITY) ===
  if (recentRaces && recentRaces.length > 0) {
    const mostRecent = recentRaces[0]
    const ageInDays = daysSince(mostRecent.date)

    if (ageInDays < 90) {  // Recent race
      const vdotResult = calculateVDOTFromRace(mostRecent)
      const classification = classifyAthlete({ ...profile, recentRaces })

      return {
        marathonPace: vdotResult.trainingPaces.marathon,
        thresholdPace: vdotResult.trainingPaces.threshold,
        zones: {
          daniels: vdotResult.trainingPaces,
          canova: calculateCanovaZones(vdotResult.trainingPaces.marathon.kmh),
          norwegian: calculateNorwegianZones(test, vdotResult),
          hrBased: calculateHRZones(profile.maxHR, classification.lt2PercentVO2max)
        },
        primarySource: 'VDOT',
        confidence: 'VERY_HIGH',
        athleteClassification: classification,
        warnings: [],
        errors: []
      }
    }
  }

  // === TIER 2: Lactate Test (Individualized) ===
  if (test && test.testStages && test.testStages.length >= 4) {
    const lactateProfile = analyzeLactateProfile({
      testStages: test.testStages,
      maxHR: profile.maxHR,
      date: new Date(test.date)
    })

    if (lactateProfile.lt2.confidence === 'VERY_HIGH' || lactateProfile.lt2.confidence === 'HIGH') {
      const classification = classifyAthlete({ ...profile, lactateProfile })

      // Calculate MP from LT2 using compression factor
      const lt2Pace = lactateProfile.lt2.speed
      const marathonPaceKmh = lt2Pace * classification.compressionFactor

      return {
        marathonPace: { kmh: marathonPaceKmh, pace: kmhToPace(marathonPaceKmh) },
        thresholdPace: { kmh: lt2Pace, pace: kmhToPace(lt2Pace) },
        zones: {
          daniels: calculateDanielsZonesFromLT2(lt2Pace, marathonPaceKmh),
          canova: calculateCanovaZones(marathonPaceKmh),
          norwegian: calculateNorwegianZonesFromLactate(lactateProfile),
          hrBased: calculateHRZones(profile.maxHR, lactateProfile.lt2.heartRate / profile.maxHR)
        },
        primarySource: 'LACTATE_RATIO',
        confidence: lactateProfile.lt2.confidence,
        athleteClassification: classification,
        warnings: lactateProfile.warnings,
        errors: lactateProfile.errors
      }
    }
  }

  // === TIER 3: HR-Based Estimation ===
  if (test && test.testStages && test.testStages.length > 0) {
    // Find highest HR stage (proxy for threshold)
    const maxHRStage = test.testStages.reduce((max, stage) =>
      stage.heartRate > max.heartRate ? stage : max
    )

    const classification = classifyAthlete(profile)
    const lt2HR = maxHRStage.heartRate
    const lt2Speed = maxHRStage.speed || 12  // Fallback
    const marathonPaceKmh = lt2Speed * classification.compressionFactor

    return {
      marathonPace: { kmh: marathonPaceKmh, pace: kmhToPace(marathonPaceKmh) },
      thresholdPace: { kmh: lt2Speed, pace: kmhToPace(lt2Speed) },
      zones: { /* ... */ },
      primarySource: 'HR_ESTIMATION',
      confidence: 'MEDIUM',
      athleteClassification: classification,
      warnings: ['No recent race or reliable lactate test - using HR estimation'],
      errors: []
    }
  }

  // === TIER 4: Profile-Based Estimation (LOWEST CONFIDENCE) ===
  const classification = classifyAthlete(profile)

  // Estimate LT2 from VO2max if available
  let estimatedLT2Speed = 12  // Conservative default
  if (profile.vo2max) {
    // Running economy approximation: 1 km/h ≈ 3.5 ml/kg/min
    const vo2AtLT2 = profile.vo2max * (classification.lt2PercentVO2max / 100)
    estimatedLT2Speed = vo2AtLT2 / 3.5
  }

  const marathonPaceKmh = estimatedLT2Speed * classification.compressionFactor

  return {
    marathonPace: { kmh: marathonPaceKmh, pace: kmhToPace(marathonPaceKmh) },
    thresholdPace: { kmh: estimatedLT2Speed, pace: kmhToPace(estimatedLT2Speed) },
    zones: { /* ... */ },
    primarySource: 'PROFILE_ESTIMATION',
    confidence: 'LOW',
    athleteClassification: classification,
    warnings: ['No race or test data - using profile estimation', 'Verify paces in first training weeks'],
    errors: ['CRITICAL: Limited data - results may be inaccurate']
  }
}
```

---

## 4. User Interface Components

### 4.1 Enhanced Program Generation Form

**New Fields Required**:

```typescript
// Race Performance Section (Highest Priority)
interface RaceDataSection {
  hasRecentRace: boolean
  races: Array<{
    distance: 'MARATHON' | 'HALF_MARATHON' | '10K' | '5K'
    time: { hours: number, minutes: number, seconds: number }
    date: Date
    averageHR?: number  // Optional but valuable
  }>
}

// Athlete Profile Section (For Classification)
interface ProfileSection {
  weeklyKm: number
  yearsRunning: number
  maxHR: number  // Required
  restingHR?: number
  age: number
  gender: 'MALE' | 'FEMALE'
}

// Lactate Test Section (Existing but enhanced)
interface LactateSection {
  hasLactateTest: boolean
  testId?: string
  manualThresholds?: {
    lt1Stage: number  // Sequence number of LT1 stage
    lt2Stage: number  // Sequence number of LT2 stage
  }
}
```

**UI Flow**:

1. **Step 1: Athlete Profile** (New)
   - Weekly training volume
   - Years of consistent training
   - Max HR (with calculator: 220 - age or tested)
   - Resting HR
   - Age, gender

2. **Step 2: Recent Race Results** (New - Highest Priority)
   - "Do you have race results from the last 90 days?"
   - If YES → Race entry form
   - Display calculated VDOT
   - Show equivalent times for validation
   - **Confidence indicator**: ⭐⭐⭐⭐⭐

3. **Step 3: Lactate Test** (Enhanced)
   - "Do you have a lactate test?"
   - If YES → Select test from database
   - Show D-max calculation results (if R² ≥ 0.90)
   - If D-max failed:
     - Display lactate curve chart
     - Allow manual threshold selection
     - Show max lactate value
     - Calculate ratio automatically
   - **Confidence indicator**: ⭐⭐⭐⭐ (if D-max) or ⭐⭐⭐ (if manual)

4. **Step 4: Goal & Program Details** (Existing)
   - Goal type, duration, etc.

5. **Step 5: Pace Validation Summary** (New - Critical)
   ```
   📊 TRAINING PACE CALCULATION

   ✅ Primary Source: Recent Half Marathon (1:28:00)
      VDOT: 56
      Confidence: ⭐⭐⭐⭐⭐ (Race-based - highest reliability)

   📈 Calculated Training Paces:
      Easy:       5:45-6:15 /km (11.0-10.0 km/h)
      Marathon:   4:26 /km (13.5 km/h)
      Threshold:  4:12 /km (14.3 km/h)
      Interval:   3:54 /km (15.4 km/h)
      Repetition: 3:38 /km (16.5 km/h)

   🔬 Athlete Classification:
      Level: ADVANCED (VDOT 56)
      Metabolic Type: Fast Twitch Marathoner
      MP/LT2 Compression: 94% (advanced level)

   ⚙️ Alternative Data Sources:
      ✓ Lactate Test: LT2 @ 14.8 km/h, 10 mmol/L (50% of max)
        → Estimated MP: 13.9 km/h (VERY CLOSE ✓)
      ✓ Max HR: 194 bpm
        → Race HR 181 (93%) validates elite effort ✓

   ⚠️ Warnings:
      - Max lactate 20.3 mmol/L indicates HIGH glycolytic capacity
      - Recommend extensive intervals (longer reps, moderate pace)
      - Recovery: 3-4 days between hard sessions

   [Use These Paces] [Adjust Manually]
   ```

### 4.2 Pace Validation Dashboard

**Location**: Shown after program generation, available in program view

**Components**:
- Primary source card (green)
- Alternative sources (gray)
- Consistency checks (warnings in yellow/red)
- Confidence meter (visual indicator)
- Historical comparison (if multiple tests)

---

## 5. Database Schema Updates

### 5.1 New Tables

```sql
-- Race results for VDOT calculation
CREATE TABLE race_results (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  distance TEXT NOT NULL,  -- 'MARATHON', 'HALF_MARATHON', '10K', '5K'
  distance_km REAL,
  time_minutes REAL NOT NULL,
  race_date DATE NOT NULL,
  average_hr INTEGER,
  max_hr INTEGER,
  notes TEXT,
  vdot REAL,  -- Calculated and stored
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_race_client (client_id),
  INDEX idx_race_date (client_id, race_date DESC)
);

-- Athlete profile (extended from Client)
CREATE TABLE athlete_profiles (
  id TEXT PRIMARY KEY,
  client_id TEXT UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Training history
  weekly_km_average REAL,
  years_running REAL,

  -- Physiological
  max_hr INTEGER NOT NULL,
  resting_hr INTEGER,
  vo2max REAL,

  -- Classification (calculated and cached)
  athlete_level TEXT,  -- 'ELITE', 'ADVANCED', 'INTERMEDIATE', 'RECREATIONAL'
  vdot REAL,  -- From most recent race
  metabolic_type TEXT,  -- 'SLOW_TWITCH', 'MIXED', 'FAST_TWITCH'
  compression_factor REAL,  -- MP as % of LT2

  -- Lactate profile (from most recent test)
  max_lactate REAL,
  lt2_ratio REAL,  -- LT2 / max lactate

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pace calculation history (audit trail)
CREATE TABLE pace_calculations (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,

  -- Source data used
  primary_source TEXT NOT NULL,  -- 'VDOT', 'LACTATE_RATIO', 'HR_ESTIMATION', 'PROFILE_ESTIMATION'
  race_id TEXT REFERENCES race_results(id),
  test_id TEXT REFERENCES tests(id),

  -- Calculated paces (stored for audit)
  marathon_pace_kmh REAL NOT NULL,
  threshold_pace_kmh REAL NOT NULL,

  -- Athlete classification at time of calculation
  athlete_level TEXT NOT NULL,
  compression_factor REAL NOT NULL,

  -- Quality metrics
  confidence TEXT NOT NULL,  -- 'VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'
  warnings JSONB,  -- Array of warning messages
  errors JSONB,    -- Array of error messages

  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 Updated Test Table

```sql
-- Add lactate profile fields to Test
ALTER TABLE tests ADD COLUMN max_lactate REAL;
ALTER TABLE tests ADD COLUMN lt2_ratio REAL;
ALTER TABLE tests ADD COLUMN metabolic_type TEXT;

-- Add manual threshold overrides
ALTER TABLE tests ADD COLUMN lt1_manual_stage INTEGER;  -- Sequence number
ALTER TABLE tests ADD COLUMN lt2_manual_stage INTEGER;
```

---

## 6. Training Recommendations by Metabolic Type

### 6.1 Fast Twitch Marathoner (Type A)

**Profile**: Max lactate >15 mmol/L, LT2 ratio >40%

**Like**: User's 1:28 HM athlete (max 20.3, LT2 10, ratio 49%)

**Training Strategy**:
- **Goal**: Suppress VLamax (lower glycolytic enzyme activity)
- **Interval Type**: EXTENSIVE (longer reps, moderate pace)
  - 4×5km @ marathon pace (not faster!)
  - 5×3km @ 102% MP
  - Long tempo runs (16-20km @ 95% MP)
- **Recovery**: 3-4 days between hard sessions (glycolytic fatigue takes longer)
- **Volume**: High (70-100+ km/week)
- **Taper**: 2-3 weeks (needs extra time to clear fatigue)
- **Avoid**: Short, fast intervals (200m, 400m reps) - these increase VLamax

### 6.2 Slow Twitch Diesel (Type B)

**Profile**: Max lactate <10 mmol/L, LT2 ratio 35-45%

**Training Strategy**:
- **Goal**: Raise ceiling (VO2max) without ruining economy
- **Interval Type**: INTENSIVE (shorter reps, faster pace, short rest)
  - 10×1km @ 105-110% MP with 60s rest
  - 20×400m @ 115% MP with 45s rest
- **Recovery**: 2-3 days between hard sessions (recovers faster)
- **Volume**: Very high tolerance (can handle 100-120 km/week)
- **Taper**: 1-2 weeks (feels stale if too long)

### 6.3 Mixed Profile (Sub-Elite)

**Profile**: Max lactate 11-14 mmol/L, LT2 ratio 30-35%

**Training Strategy**:
- **Goal**: Specialize based on goal event
- **Interval Type**: MIXED (vary session types)
- **Recovery**: 3 days between hard sessions
- **Volume**: Moderate-high (60-80 km/week)

---

## 7. Implementation Roadmap

### Phase 1: Core Calculation Engine (Week 1-2)
- [x] Module 1: VDOT Calculator
- [x] Module 2: Lactate Profile Analyzer
- [x] Module 3: Athlete Classifier
- [x] Module 4: Comprehensive Pace Selector

### Phase 2: Database & API (Week 2-3)
- [ ] Database schema updates
- [ ] Race results CRUD endpoints
- [ ] Athlete profile endpoints
- [ ] Pace calculation endpoints with audit logging

### Phase 3: UI Components (Week 3-4)
- [ ] Enhanced program generation form
- [ ] Pace validation dashboard
- [ ] Race results management
- [ ] Lactate test manual threshold selector

### Phase 4: Integration (Week 4-5)
- [ ] Update program generator to use new pace selector
- [ ] Apply metabolic type to Canova/Norwegian/Polarized generators
- [ ] Update workout builders with phase-aware zones
- [ ] Comprehensive testing

### Phase 5: Validation & Refinement (Week 5-6)
- [ ] Test with real athlete data
- [ ] Validate against known performances
- [ ] Refine classification algorithms
- [ ] Documentation

---

## 8. Testing Scenarios

### Scenario 1: Elite Fast Twitch Marathoner (Real User Data)
```typescript
const athlete = {
  profile: {
    weeklyKm: 80,
    yearsRunning: 4,
    maxHR: 194,
    age: 30,
    gender: 'MALE'
  },
  race: {
    distance: 'HALF_MARATHON',
    timeMinutes: 88,  // 1:28:00
    date: new Date('2024-10-15'),
    averageHR: 181
  },
  lactateTest: {
    maxLactate: 20.3,
    stages: [
      { speed: 10, lactate: 2.0, hr: 150 },
      { speed: 11, lactate: 3.5, hr: 160 },
      { speed: 12, lactate: 5.5, hr: 168 },
      { speed: 13, lactate: 10.0, hr: 178 },  // LT2
      { speed: 14, lactate: 16.5, hr: 187 },
      { speed: 13, lactate: 20.3, hr: 185, incline: 6 }  // Max
    ]
  }
}

// Expected Output:
const expected = {
  primarySource: 'VDOT',
  vdot: 55.8,
  marathonPace: { kmh: 13.5, pace: '4:26/km' },  // ✓ Matches user expectation
  thresholdPace: { kmh: 14.3, pace: '4:12/km' },

  athleteClassification: {
    level: 'ADVANCED',
    metabolicType: 'FAST_TWITCH_ENDURANCE',
    compressionFactor: 0.94,  // Elite-like compression
    trainingRecommendations: {
      intervalType: 'EXTENSIVE',
      recoveryDays: 3-4,
      taperLength: 2-3
    }
  },

  validation: {
    lactateBasedMP: 13.7,  // From LT2 @ 14.5 km/h × 0.94 - VERY CLOSE! ✓
    raceHRPercent: 93,  // 181/194 - validates elite compression ✓
    consistency: 'EXCELLENT'
  },

  warnings: [
    'Max lactate 20.3 mmol/L indicates HIGH glycolytic capacity',
    'Use EXTENSIVE intervals to suppress VLamax'
  ]
}
```

### Scenario 2: Elite Marathoner (Low Lactate)
```typescript
const paulaRadcliffe = {
  lactateTest: {
    maxLactate: 5.0,
    lt2Lactate: 2.0,  // 40% ratio
    lt2Speed: 17.5  // 3:26/km
  },
  // Expected MP: 17.5 × 0.97 = 17.0 km/h (3:32/km) - realistic for 2:15 marathon
}
```

### Scenario 3: Recreational Runner (No Test Data)
```typescript
const recreational = {
  profile: {
    weeklyKm: 30,
    yearsRunning: 1,
    maxHR: 185,
    vo2max: 42,
    age: 35,
    gender: 'MALE'
  },
  // Expected classification: RECREATIONAL
  // Expected MP: ~10-11 km/h (5:27-5:50/km)
  // Compression factor: 0.78
}
```

---

## 9. Open Questions for User

1. **Manual Threshold Selection UI**: When D-max fails, should we show the lactate curve as an interactive chart where the coach clicks on the LT1 and LT2 points? Or dropdown selection of stage numbers?

2. **Race Result Entry**: Should we auto-import from Strava/Garmin if user connects? Or manual entry only?

3. **Metabolic Type Override**: Should coaches be able to manually override the detected metabolic type, or always auto-detect?

4. **Pace Adjustment During Program**: If an athlete consistently beats/misses target paces in first 2 weeks, should the system auto-recalculate and adjust future weeks?

5. **Historical Comparison**: When athlete has multiple tests over time, should we show trending (e.g., "LT2 improved from 13 km/h to 14 km/h over 12 weeks")?

6. **Gender-Specific Adjustments**: The document mentions females have naturally higher LT2 % of VO2max. Should we apply gender-specific compression factors?

7. **Age Adjustments**: Masters athletes (>40) tend toward compressed profiles. Should we adjust expected LT2 % based on age?

---

## 10. Success Metrics

**System is successful when:**
- ✅ 1:28 HM athlete gets 4:25-4:30/km marathon pace (13.5-13.6 km/h)
- ✅ Paula Radcliffe profile (2 mmol LT2, 5 mmol max) generates correct zones
- ✅ Kenyan elite (8 mmol LT2, 14 mmol max) generates correct zones
- ✅ Consistency check catches >15% mismatch between race and test
- ✅ No athlete gets zones based on "4 mmol/L" assumption
- ✅ Metabolic type correctly influences training recommendations
- ✅ Confidence levels accurately reflect data quality

---

## 11. References

- Jack Daniels' Running Formula (3rd Edition)
- Elite_Training_Zone_Frameworks.md
- Metabolic_Equilibrium_Lactate_Analysis.md
- Canova_Algorithmic_Architecture.md
- Norwegian_Double_Threshold_Training_Protocol.md
