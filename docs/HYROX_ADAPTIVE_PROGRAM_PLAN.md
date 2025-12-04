# HYROX Adaptive Program Generation Plan

## Overview
Enhance the HYROX program generator to create truly individualized programs based on athlete's running capacity, station performance, and goal times.

---

## Phase 1: Athlete Profiling System

### 1.1 Create Athlete Profile Analyzer
**File:** `lib/program-generator/hyrox-athlete-profiler.ts`

```typescript
interface HyroxAthleteProfile {
  // Running ability
  runnerType: 'FAST_RUNNER' | 'AVERAGE_RUNNER' | 'SLOW_RUNNER'
  vdot: number
  pureRunPacePerKm: number // from 10K/5K
  hyroxRunPacePerKm: number // from HYROX race
  paceDegradation: number // % slower in HYROX vs pure running

  // Station ability
  stationType: 'STRONG_STATIONS' | 'AVERAGE_STATIONS' | 'WEAK_STATIONS'
  weakStations: string[]
  strongStations: string[]
  stationScore: number // 0-100 vs benchmarks

  // Overall profile
  athleteType: 'FAST_WEAK' | 'SLOW_STRONG' | 'BALANCED' | 'NEEDS_BOTH'

  // Training capacity
  currentWeeklyKm: number
  recommendedWeeklyKm: number // Based on goal
  volumeScaleFactor: number // 0.7-1.3
}
```

### 1.2 Profile Classification Logic
- **FAST_WEAK**: 10K pace < 4:30/km BUT station times >20% slower than benchmark
- **SLOW_STRONG**: 10K pace > 5:00/km BUT station times at/above benchmark
- **BALANCED**: Both running and stations within 10% of each other vs benchmarks
- **NEEDS_BOTH**: Both running and stations significantly below benchmark

### 1.3 Pace Degradation Analysis
Compare pure running pace vs HYROX running pace:
- Elite: 3-5% degradation (strong stations, fast recovery)
- Advanced: 5-10% degradation
- Intermediate: 10-20% degradation
- Beginner: 20-30% degradation

---

## Phase 2: Volume Scaling System

### 2.1 Scale Running Volume to Athlete Capacity
**In:** `hyrox-generator.ts`

```typescript
function scaleRunningVolume(
  templateDistance: number,
  currentWeeklyKm: number,
  weekNumber: number,
  totalWeeks: number
): number {
  // Start at 80% of template or athlete's current, whichever is lower
  const startFactor = Math.min(0.8, currentWeeklyKm / 50)

  // Progressive build: 5-10% per week
  const progressionFactor = 1 + (weekNumber / totalWeeks) * 0.3

  return Math.round(templateDistance * startFactor * progressionFactor)
}
```

### 2.2 Weekly Volume Targets by Phase
| Phase | % of Peak Volume | Focus |
|-------|------------------|-------|
| BASE (1-4) | 70-85% | Build aerobic foundation |
| BUILD (5-10) | 85-100% | Peak training load |
| PEAK (11-14) | 90-100% | Race-specific intensity |
| TAPER (15-16) | 50-70% | Freshness for race |

### 2.3 Adjust Based on Athlete Type
- **FAST_WEAK**: Keep running volume lower, add station practice
- **SLOW_STRONG**: Increase running volume +20%, reduce station work
- **BALANCED**: Standard template
- **NEEDS_BOTH**: Gradual build on both fronts

---

## Phase 3: Weak/Strong Station Adaptation

### 3.1 Running Workouts with Station Work
For FAST_WEAK athletes, add "compromised running" sessions:
```typescript
// After station work, immediately run
{
  name: 'Kompromisslöpning',
  structure: [
    { type: 'station', exercise: 'sled_push', duration: '50m' },
    { type: 'run', distance: 1000, pace: 'race_pace' },
    // Repeat 4x
  ]
}
```

### 3.2 Station Practice Frequency
| Athlete Type | Station Sessions/Week | Running Sessions/Week |
|--------------|----------------------|----------------------|
| FAST_WEAK | 3-4 | 3 |
| SLOW_STRONG | 1-2 | 4-5 |
| BALANCED | 2-3 | 3-4 |
| NEEDS_BOTH | 2-3 | 3-4 |

### 3.3 Strong Station Handling
- Reduce practice volume for strong stations
- Maintain 1x/week for technique retention
- Focus conditioning finishers on weak stations only

---

## Phase 4: Goal-Based Progressive Pacing

### 4.1 Calculate Progressive Pace Targets
```typescript
function calculateProgressivePace(
  currentPace: number, // seconds/km
  goalPace: number,
  weekNumber: number,
  totalWeeks: number,
  phase: string
): number {
  const paceGap = currentPace - goalPace

  if (phase === 'BASE') {
    // Train at current pace
    return currentPace
  } else if (phase === 'BUILD') {
    // Progress 50% toward goal
    return currentPace - (paceGap * 0.5 * (weekNumber / totalWeeks))
  } else if (phase === 'PEAK') {
    // Train at or slightly faster than goal
    return goalPace * 0.98
  } else {
    // TAPER: easy paces only
    return currentPace * 1.1
  }
}
```

### 4.2 Goal Time Breakdown
From goal total time, calculate target splits:
- Running: 45-55% of total time (depending on athlete type)
- Stations: 35-45% of total time
- Transitions: 5-10% of total time

### 4.3 Workout Pace Prescription
```
Week 1 (BASE):  Tempo @ 4:45/km (current)
Week 6 (BUILD): Tempo @ 4:35/km (progressing)
Week 12 (PEAK): Tempo @ 4:20/km (goal pace)
```

---

## Phase 5: Implementation Checklist

### Files to Modify:

| File | Changes |
|------|---------|
| `lib/program-generator/hyrox-athlete-profiler.ts` | NEW - Athlete profiling logic |
| `lib/program-generator/generators/hyrox-generator.ts` | Use profiler, scale volume, adapt template |
| `lib/program-generator/hyrox-benchmarks.ts` | Add running benchmarks by level |
| `lib/program-generator/templates/hyrox.ts` | Add volume multipliers to workouts |
| `components/programs/wizard/ConfigurationForm.tsx` | Add goal time input for HYROX |

### Implementation Order:
1. [x] Create `hyrox-athlete-profiler.ts` with classification logic ✅
2. [x] Update `hyrox-benchmarks.ts` with running benchmarks ✅ (already existed)
3. [x] Add volume scaling to `hyrox-generator.ts` ✅
4. [x] Add athlete type detection to generator ✅
5. [x] Implement template adaptation based on type ✅
6. [x] Add goal time parsing and progressive pacing ✅
7. [x] Update wizard to show athlete profile analysis ✅
8. [x] Add program notes explaining adaptations ✅

---

## Data Flow

```
Wizard Inputs:
├── 10K time: 41:32 → VDOT 48.7 → Paces
├── HYROX avg pace: 4:22/km → Degradation analysis
├── Station times → Weakness analysis
├── Weekly km: 50 → Volume scaling
└── Goal time: 1:15:00 → Progressive pacing

↓

Athlete Profiler:
├── runnerType: AVERAGE_RUNNER (4:09/km 10K)
├── stationType: STRONG_STATIONS (only 3% degradation)
├── athleteType: SLOW_STRONG
└── volumeScaleFactor: 1.0 (50km is appropriate)

↓

Template Adaptation:
├── Running volume: +10% (needs more running work)
├── Station sessions: -1 per week (already efficient)
├── Tempo paces: Progress from 4:27 → 4:15/km
└── Add: More long runs, lactate threshold work

↓

Generated Program:
├── Week 1: 45km total (90% of 50)
├── Week 8: 55km total (110% of 50)
├── Week 14: 50km total (100%, peak week)
└── Week 16: 35km total (70%, taper)
```

---

## Example Output

For athlete with:
- 10K: 41:32 (4:09/km)
- HYROX pace: 4:22/km (3% degradation)
- Weekly km: 50
- Weak stations: Wall Balls, Sled Pull
- Goal: 1:15:00

**Generated Program Notes:**
```
Atletprofil: SLOW_STRONG
- Din löpkapacitet är genomsnittlig (VDOT 48.7)
- Dina stationer är starka (endast 3% tempotapp)
- Fokus: Öka löpkapacitet, bibehåll stationsstyrka

Volymplan:
- Startar på 45 km/vecka (90% av din nuvarande)
- Bygger till 55 km/vecka i vecka 8
- Taper till 35 km/vecka inför tävling

Tempoträning:
- Vecka 1-4: 4:27/km (nuvarande tröskel)
- Vecka 5-10: 4:20/km (progression)
- Vecka 11-14: 4:12/km (måltempo)

Svaga stationer att prioritera:
- Wall Balls: Extra uthållighetsträning
- Sled Pull: Fokus på bakre kedjan
```

---

## Status

**Created:** 2024-12-03
**Updated:** 2024-12-03
**Status:** FULLY COMPLETE ✅ (All phases including UI enhancement)
**Priority:** HIGH - Core feature gap identified

## Implementation Summary

### Files Created/Modified:

| File | Status | Description |
|------|--------|-------------|
| `lib/program-generator/hyrox-athlete-profiler.ts` | ✅ NEW | Complete athlete profiling system (~550 lines) |
| `lib/program-generator/generators/hyrox-generator.ts` | ✅ MODIFIED | Integrated profiler, volume scaling, progressive pacing |
| `lib/program-generator/hyrox-benchmarks.ts` | ✅ EXISTS | Already had running benchmarks |
| `components/programs/wizard/HyroxAthleteProfileCard.tsx` | ✅ NEW | Real-time athlete profile analysis display (~340 lines) |
| `components/programs/wizard/ConfigurationForm.tsx` | ✅ MODIFIED | Integrated HyroxAthleteProfileCard component |

### Features Implemented:

1. **Athlete Classification** (`hyrox-athlete-profiler.ts`)
   - `FAST_WEAK`: Fast runner but weak stations
   - `SLOW_STRONG`: Slow runner but strong stations
   - `BALANCED`: Both running and stations at similar level
   - `NEEDS_BOTH`: Both areas need development

2. **Pace Degradation Analysis**
   - Compares pure running pace (from 5K/10K races) vs HYROX running pace
   - Classifies as ELITE (3-5%), ADVANCED (5-10%), INTERMEDIATE (10-20%), BEGINNER (20-30%)

3. **Volume Scaling** (`scaleRunningVolume()`)
   - Scales template distances based on athlete's current weekly km
   - Applies phase-based multipliers (BASE 85%, BUILD 100%, PEAK 95%, TAPER 60%)
   - Adjusts based on athlete type (SLOW_STRONG +15%, FAST_WEAK -10%)

4. **Goal Analysis**
   - Parses goal time and estimates current race time
   - Calculates time gap and assesses goal realism
   - Provides Swedish assessment text

5. **Progressive Pacing** (`calculateProgressivePaces()`)
   - BASE phase: Train at current pace
   - BUILD phase: Progress 50% toward goal
   - PEAK phase: Train at/slightly faster than goal
   - TAPER phase: Easy paces, maintain sharpness

6. **Program Notes**
   - Athlete profile type and description
   - Volume adjustment percentage
   - Goal assessment
   - Training focus areas
   - Weak station recommendations

### UI Enhancement (Completed):
- [x] `HyroxAthleteProfileCard` component displays real-time athlete profile analysis in wizard ✅
  - Athlete type classification with visual badges and icons
  - VDOT and pace metrics display
  - Pace degradation analysis with color-coded indicators
  - Volume recommendations based on athlete capacity
  - Goal assessment with time gap analysis
  - Training focus recommendations for weak areas
