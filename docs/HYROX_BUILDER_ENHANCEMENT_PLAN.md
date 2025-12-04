# HYROX Builder Enhancement Plan

## Overview
Enhance the HYROX program generator with station split times, strength PRs, weakness analysis, and structured strength sessions with % of 1RM.

---

## Phase 1: Enhanced Program Wizard Inputs ✅ COMPLETE

### 1.1 Add Station Split Times to ConfigurationForm
- [x] Add `hyroxStationTimes` object to ConfigurationForm schema
- [x] Add collapsible "HYROX Stationstider" section (only shows when sport === 'HYROX')
- [x] Add input fields for all 8 stations:
  - [x] SkiErg 1km (MM:SS)
  - [x] Sled Push 50m (MM:SS)
  - [x] Sled Pull 50m (MM:SS)
  - [x] Burpee Broad Jump 80m (MM:SS)
  - [x] Rowing 1km (MM:SS)
  - [x] Farmers Carry 200m (MM:SS)
  - [x] Sandbag Lunge 100m (MM:SS)
  - [x] Wall Balls 75/100 reps (MM:SS)
- [x] Add running tempo input (average 1km time)
- [x] Add division selector (Open/Pro/Doubles)
- [x] Add gender selector (for benchmarks)
- [x] Add bodyweight input (for strength requirements)

### 1.2 Add Strength PR Inputs
- [x] Add `strengthPRs` object to ConfigurationForm schema
- [x] Add collapsible "Styrke-PRs" section
- [x] Add input fields for key lifts:
  - [x] Deadlift (kg)
  - [x] Back Squat (kg)
  - [x] Bench Press (kg)
  - [x] Overhead Press (kg)
  - [x] Barbell Row (kg)
  - [x] Pull-ups (max reps)
- [ ] Add checkbox "Beräkna från tidigare loggning" to auto-fill from workout history (FUTURE)

### 1.3 Update SportProgramParams
- [x] Add `hyroxStationTimes` to `SportProgramParams` interface in sport-router.ts
- [x] Add `strengthPRs` to `SportProgramParams` interface
- [x] Add `hyroxDivision`, `hyroxGender`, `hyroxBodyweight` to interface
- [x] Update API route to accept new parameters
- [x] Add time parsing (MM:SS to seconds)

---

## Phase 2: Weakness Analysis System ✅ COMPLETE

### 2.1 Create HYROX Benchmark Data ✅ COMPLETE
- [x] Create `lib/program-generator/hyrox-benchmarks.ts`
- [x] Add benchmark times by level (World Class, Elite, Advanced, Intermediate, Beginner)
- [x] Add gender-specific benchmarks (Men, Women)
- [x] Add station weights by category (Open/Pro)
- [x] Add strength benchmarks with bodyweight ratios
- [x] Add periodization phases
- [x] Add training volume recommendations

### 2.2 Create Weakness Analyzer ✅ COMPLETE
- [x] Create `analyzeHyroxWeaknesses()` function
- [x] Compare athlete times to benchmarks
- [x] Identify weak stations (>20% slower than benchmark)
- [x] Identify strong stations (faster than min benchmark)
- [x] Generate training recommendations
- [x] Highlight time sink stations (Sled Pull, Wall Balls)

### 2.3 Update HYROX Generator ✅ COMPLETE
- [x] Pass station times to generator
- [x] Use weakness analysis to prioritize stations in program
- [x] Add comprehensive logging of station analysis
- [x] Generate program notes with priorities and recommendations
- [x] Integrate strength requirements checking

---

## Phase 3: Structured Strength Sessions ✅ COMPLETE

### 3.1 Create HYROX Strength Templates ✅ COMPLETE
- [x] Create `lib/program-generator/templates/hyrox-strength.ts` (750+ lines)
- [x] Define strength workouts by phase:
  - [x] Anatomical Adaptation (12-20 reps, 40-60% 1RM)
  - [x] Max Strength (3-6 reps, 80-95% 1RM)
  - [x] Power (3-6 reps, 30-60% 1RM, explosive)
  - [x] Maintenance (5-8 reps, 70-85% 1RM)
  - [x] Taper (reduced volume)

### 3.2 Create Warmup Templates ✅ COMPLETE
- [x] General warmup (5-6 min cardio - rowing/SkiErg)
- [x] Activation exercises (band walks, glute bridges, arm circles, etc.)
- [x] Ramp-up sets (40% x8, 60% x5, 75% x3)
- [x] Session-type specific warmups (lower, upper, full_body, power)

### 3.3 Generate % of 1RM Prescriptions ✅ COMPLETE
- [x] Use athlete's strengthPRs
- [x] Calculate working weights per phase with `calculateWorkingWeight()`
- [x] Include rest periods (30-180 seconds based on phase)
- [x] Include tempo prescriptions (e.g., "3-1-1-0")
- [x] Format: "Knäböj: 4×5 @ 85% (136kg) - Vila 2 min [Tempo: 3-1-1-0]"

### 3.4 Update HYROX Generator for Strength ✅ COMPLETE
- [x] `addStrengthWorkoutsToProgram()` function
- [x] Maps running phase to strength phase
- [x] Intelligent day scheduling (avoids hard running days)
- [x] Swedish instructions with warmup, main workout, and finisher
- [x] Weakness-aware exercise selection
- [x] Conditioning finishers (EMOM, circuits, HYROX simulation)

---

## Phase 4: Race Time Estimator

### 4.1 Create Race Time Calculator ✅ COMPLETE
- [x] `estimateRaceTime()` function created
- [x] Sum all station times
- [x] Add running times (8 x average pace)
- [x] Add transition time estimates (configurable, default 45s)
- [x] Return breakdown (running/stations/transitions)

### 4.2 Create Comparison Display ✅ COMPLETE
- [x] Show breakdown by category (running vs stations)
- [x] Compare to target time
- [x] Highlight areas to improve
- [x] Show potential time savings per station
- [x] Real-time analysis integrated into wizard
- [x] Performance level badges (World Class → Beginner)
- [x] Weak station identification with progress bars
- [x] Visual time breakdown with icons

---

## Files Modified/Created

| File | Changes |
|------|---------|
| `components/programs/wizard/ConfigurationForm.tsx` | Added station times, strength PR inputs, race time analysis ✅ |
| `components/programs/wizard/HyroxRaceTimeAnalysis.tsx` | NEW - Real-time race time analysis component (350+ lines) ✅ |
| `components/athlete/HyroxRaceAnalysisCard.tsx` | NEW - Reusable race analysis card for athlete views (300 lines) ✅ |
| `components/athlete/HYROXDashboard.tsx` | Integrated HyroxRaceAnalysisCard for athlete dashboard ✅ |
| `components/athlete/AthleteProgramOverview.tsx` | Integrated HyroxRaceAnalysisCard for program view ✅ |
| `lib/program-generator/sport-router.ts` | Extended SportProgramParams ✅ |
| `app/api/programs/generate/route.ts` | Accept new parameters, parse time strings ✅ |
| `lib/program-generator/generators/hyrox-generator.ts` | Extended HyroxProgramParams, weakness analysis, strength workout generation ✅ |
| `lib/program-generator/hyrox-benchmarks.ts` | NEW - Comprehensive benchmark data (580+ lines) ✅ |
| `lib/program-generator/templates/hyrox-strength.ts` | NEW - HYROX strength templates (750+ lines) ✅ |

---

## Progress Tracking

**Current Phase:** ALL PHASES COMPLETE ✅
**Status:** HYROX Builder Enhancement fully implemented
**Last Updated:** 2025-12-03

### Implementation Summary

- **Phase 1**: Complete wizard inputs for station times, strength PRs, division/gender/bodyweight ✅
- **Phase 2**: Complete weakness analysis with benchmark comparison and recommendations ✅
- **Phase 3**: Complete strength training with % 1RM, phase-appropriate programming, Swedish instructions ✅
- **Phase 4**: Race time estimation + visual comparison display with real-time analysis ✅

---

## Notes

- Station times from HYROXOnboarding.tsx can be pre-filled if athlete has completed onboarding
- Strength PRs can be auto-calculated from OneRepMaxHistory table
- Use existing strength-periodization.ts for phase protocols
- Use existing rm-estimation.ts for 1RM calculations
- Time sink stations (Sled Pull, Wall Balls) are highlighted in benchmarks
- Pro Division has stricter strength requirements (1.5x+ BW deadlift)

## New Features Added

### HYROX Station Times Input
- Division selector (Open/Pro/Doubles)
- Gender selector for benchmarks
- Bodyweight input for strength requirements
- All 8 station time inputs (MM:SS format)
- Average run pace input

### Strength PRs Input
- 6 key lifts with 1RM input
- Pull-ups max reps
- Shows when HYROX or strength training is enabled

### Benchmarks File (`hyrox-benchmarks.ts`)
- 580+ lines of benchmark data
- Station weights by division
- Running benchmarks by tier
- Station benchmarks by tier
- Strength benchmarks with BW ratios
- Analysis functions:
  - `analyzeStationWeaknesses()`
  - `getStrengthRequirements()`
  - `estimateRaceTime()`
  - `getPerformanceLevel()`
  - `parseTime()` / `formatTime()`
