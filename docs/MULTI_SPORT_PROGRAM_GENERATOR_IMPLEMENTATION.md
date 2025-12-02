# Multi-Sport Program Generator Implementation

> **Status**: ✅ Core Implementation Complete
> **Started**: 2025-12-01
> **Completed**: 2025-12-02
> **Actual Time**: ~8 hours

---

## Overview

Transform the program generator from running-focused to true multi-sport platform by:
1. ✅ Creating a visual sport selection wizard
2. ✅ Creating sport-specific generators
3. ✅ Integrating the strength training system
4. ✅ Supporting multiple data sources (test/profile/manual)

---

## Phase 1: Wizard UI Framework ✅ COMPLETE

### 1.1 Create Wizard Page ✅
- [x] Create `app/coach/programs/new/page.tsx`
- [x] Set up wizard state management (currentStep, wizardData)
- [x] Add back navigation to `/coach/programs`
- [x] Add progress indicator component

### 1.2 Sport Selector Component ✅
- [x] Create `components/programs/wizard/SportSelector.tsx`
- [x] Add 8 sport cards with icons:
  - [x] 🏃 Löpning (RUNNING)
  - [x] 🚴 Cykling (CYCLING)
  - [x] 💪 Styrka (STRENGTH)
  - [x] ⛷️ Skidåkning (SKIING)
  - [x] 🏊 Simning (SWIMMING)
  - [x] 🏃‍♂️🚴🏊 Triathlon (TRIATHLON)
  - [x] 🏋️ HYROX (HYROX)
  - [x] 🎯 Allmän Fitness (GENERAL_FITNESS)
- [x] Style cards with hover effects and selection state
- [x] Swedish labels and descriptions

### 1.3 Goal Selector Component ✅
- [x] Create `components/programs/wizard/GoalSelector.tsx`
- [x] Define goal options per sport:
  - [x] Running: Marathon, Halvmaraton, 10K, 5K, Custom
  - [x] Cycling: FTP Builder, Base Builder, Gran Fondo, Custom
  - [x] Strength: Skadeprevention, Kraftutveckling, Löparekonomi, Allmän
  - [x] Skiing: Tröskelbyggare, Förberedelse, Vasaloppet, Custom
  - [x] Swimming: Sprint, Distans, Open Water, Custom
  - [x] Triathlon: Sprint, Olympic, 70.3, Ironman, Custom
  - [x] HYROX: Pro Division, Age Group, Custom
  - [x] Fitness: (skip - has own sub-goals in form)
- [x] Dynamic rendering based on selected sport

### 1.4 Data Source Selector Component ✅
- [x] Create `components/programs/wizard/DataSourceSelector.tsx`
- [x] Three options with availability checking:
  - [x] 🧪 Labtest - show available tests count
  - [x] 📊 Profil - show saved values (FTP/CSS/VDOT)
  - [x] ✏️ Manuellt - always available
- [x] Fetch client's available data sources
- [x] Show relevant data preview for each option

### 1.5 Configuration Form Component ✅
- [x] Create `components/programs/wizard/ConfigurationForm.tsx`
- [x] Base fields (all sports):
  - [x] Client selector
  - [x] Duration (weeks)
  - [x] Target date (optional)
  - [x] Sessions per week
- [x] Sport-specific fields (conditional rendering)
- [x] Strength integration toggle
- [x] Notes field

### 1.6 Wizard Progress Component ✅
- [x] Create `components/programs/wizard/WizardProgress.tsx`
- [x] Step indicators (1-4)
- [x] Current step highlighting
- [x] Step labels

---

## Phase 2: Sport Router & Generators ✅ COMPLETE

### 2.1 Sport Router ✅
- [x] Create `lib/program-generator/sport-router.ts`
- [x] Add `generateSportProgram()` main routing function
- [x] Add switch statement for all 8 sports
- [x] Export `SportProgramParams` and `DataSourceType` types

### 2.2 Running Generator ✅
- [x] Uses existing `generateBaseProgram()` from index.ts
- [x] Keep all methodology support (Polarized, Norwegian, Canova, etc.)
- [x] Maintain backward compatibility
- [x] Custom running program support for manual data

### 2.3 Cycling Generator ✅
- [x] Create `lib/program-generator/generators/cycling-generator.ts`
- [x] FTP-based power zone workouts
- [x] Goals: ftp-builder, base-builder, gran-fondo, custom
- [x] Periodization: BASE → BUILD → PEAK → TAPER

### 2.4 Skiing Generator ✅
- [x] Create `lib/program-generator/generators/skiing-generator.ts`
- [x] Handle technique (classic/skating/both)
- [x] Goals: threshold-builder, prep-phase, vasaloppet, custom

### 2.5 Swimming Generator ✅
- [x] Create `lib/program-generator/generators/swimming-generator.ts`
- [x] Handle CSS (Critical Swim Speed) zones
- [x] Pool length support (25m/50m)
- [x] Goals: sprint, distance, open-water, custom

### 2.6 Triathlon Generator ✅
- [x] Create `lib/program-generator/generators/triathlon-generator.ts`
- [x] Multi-discipline support (FTP, CSS, VDOT)
- [x] Goals: sprint, olympic, half-ironman, ironman, custom
- [x] Distance labels for each format

### 2.7 HYROX Generator ✅
- [x] Create `lib/program-generator/generators/hyrox-generator.ts`
- [x] Categories: pro, age-group, custom
- [x] Balanced running + functional training

### 2.8 Strength Generator ✅
- [x] Create `lib/program-generator/generators/strength-generator.ts`
- [x] Goals: injury-prevention, power-development, running-economy, general
- [x] Periodization support

### 2.9 General Fitness Generator ✅
- [x] Integrated into sport-router.ts
- [x] Uses existing templates from `templates/general-fitness.ts`
- [x] All 6 goal types working

---

## Phase 3: Data Source Handling ✅ COMPLETE

### 3.1 API Endpoint Update ✅
- [x] Update `app/api/programs/generate/route.ts`
- [x] Add `dataSource` parameter: 'TEST' | 'PROFILE' | 'MANUAL'
- [x] Add manual value parameters (manualFtp, manualCss, manualVdot)
- [x] Sport router integration with full parameter passing

### 3.2 Data Source Support ✅
- [x] TEST: Fetches test from database and passes to generators
- [x] PROFILE: Values passed through configuration form
- [x] MANUAL: Values passed through manual input fields

### 3.3 Zone Calculation from Sources ✅
- [x] Handle TEST source: uses existing zone calculation
- [x] Handle MANUAL source: generators accept manual values (FTP, CSS, VDOT)
- [x] Generators create appropriate workouts based on provided data

### 3.4 Backward Compatibility ✅
- [x] Legacy API format still works (without `sport` field)
- [x] New sport-based format detected and routed appropriately

---

## Phase 4: Strength Integration ✅ COMPLETE

### 4.1 Standalone Strength Programs ✅
- [x] STRENGTH added to SportType enum in Prisma
- [x] Strength generator created at `lib/program-generator/generators/strength-generator.ts`
- [x] Sport router routes STRENGTH sport to generator
- [x] Uses main program generation API

### 4.2 Strength in Wizard ✅
- [x] Strength appears as selectable sport in SportSelector
- [x] Goals: injury-prevention, power-development, running-economy, general
- [x] Generates periodized strength program structure

### 4.3 Integrated Strength Toggle ✅
- [x] "Inkludera styrketräning" toggle in ConfigurationForm
- [x] Strength frequency selector (sessions per week)
- [x] Parameters passed through API to generators

### 4.4 Future Enhancement (Not Implemented)
- [ ] Advanced exercise selection with biomechanical balance
- [ ] Exercise rotation to prevent repeats
- [ ] Interference management with running/cycling

---

## Phase 5: Connect All Templates ✅ COMPLETE

> **Completed**: 2025-12-02
> All sport templates are now connected to their generators via the workout-mapper.ts

### 5.1 Template-to-Program Mapper ✅
- [x] Created `lib/program-generator/workout-mapper.ts`
- [x] Function: `mapCyclingWorkoutToDTO()` - Cycling workouts with FTP-based power zones
- [x] Function: `mapSkiingWorkoutToDTO()` - Skiing workouts with technique support
- [x] Function: `mapSwimmingWorkoutToDTO()` - Swimming workouts with CSS-based paces
- [x] Function: `mapTriathlonWorkoutToDTO()` - Multi-discipline workout mapping
- [x] Function: `mapHyroxWeekToWorkouts()` - HYROX station + running workouts
- [x] Handle sport-specific workout types → WorkoutType enum
- [x] Handle intensity mapping (EASY → THRESHOLD → INTERVAL → etc.)
- [x] Utility: `distributeWorkoutsAcrossWeek()` for workout placement
- [x] Utility: `mapPhase()` for period phase normalization

### 5.2 Cycling Template Connection ✅
- [x] Map `CyclingTemplateWorkout` → `CreateWorkoutDTO`
- [x] Power zones → WorkoutSegments with FTP percentages
- [x] TSS tracking in week data
- [x] All 3 cycling templates connected (FTP Builder, Base Builder, Gran Fondo)

### 5.3 Skiing Template Connection ✅
- [x] Map `SkiingTemplateWorkout` → `CreateWorkoutDTO`
- [x] Technique (classic/skating) in workout data
- [x] Surface (snow/roller) tracking
- [x] All 3 skiing templates connected (Threshold Builder, Prep Phase, Vasaloppet)

### 5.4 Swimming Template Connection ✅
- [x] Map swimming workouts → `CreateWorkoutDTO`
- [x] CSS-based pace zones with seconds calculation
- [x] Stroke-specific segments
- [x] All 4 swimming templates connected (CSS Builder, Distance, Sprint, Open Water)

### 5.5 Triathlon Template Connection ✅
- [x] Map multi-discipline workouts (swim/bike/run)
- [x] Brick workout support
- [x] Balance tracking per discipline
- [x] All 3 triathlon templates connected (Sprint, Olympic, Half Ironman)

### 5.6 HYROX Template Connection ✅
- [x] Map station workouts with functional training
- [x] Running segments between stations
- [x] Both templates connected (Beginner 12-week, Intermediate 16-week)

---

## Phase 6: Testing & Polish ✅ COMPLETE

> **Completed**: 2025-12-02
> All 26 test cases pass with detailed workout content for 6/8 sports

### 6.1 Build Verification ✅
- [x] TypeScript compilation passes
- [x] No type errors in generators
- [x] No type errors in wizard components
- [x] Next.js build succeeds

### 6.2 Automated Testing ✅
- [x] Created `scripts/test-multi-sport-generator.ts`
- [x] 26 test cases covering all 8 sports
- [x] All tests pass (26/26)
- [x] Verified workout content generation

**Test Results Summary:**
```
✅ Passed: 26/26
❌ Failed: 0/26
⏱️  Total Time: 0.04s

📋 Per-Sport Results:
   RUNNING: 4/4 passed (skeleton only - uses legacy generator)
   CYCLING: 5/5 passed with detailed workouts ✓
   SWIMMING: 4/4 passed with detailed workouts ✓
   TRIATHLON: 3/3 passed with detailed workouts ✓
   HYROX: 3/3 passed with detailed workouts ✓
   SKIING: 3/3 passed with detailed workouts ✓
   STRENGTH: 2/2 passed (skeleton only - by design)
   GENERAL_FITNESS: 2/2 passed with detailed workouts ✓
```

**Run tests with:**
```bash
npx ts-node -r tsconfig-paths/register scripts/test-multi-sport-generator.ts
```

### 6.3 Edge Cases Tested ✅
- [x] Short programs (4 weeks) - Works correctly
- [x] Long programs (24 weeks) - Templates generate their fixed duration
- [x] Manual data source - All sports work without test data
- [x] Custom goals - Returns skeleton structure for coach to fill

### 6.4 Known Template Duration Limitations
Some templates have fixed durations that override user requests:
- Gran Fondo: Always 8 weeks (from template)
- Triathlon Sprint: Always 12 weeks
- Triathlon Olympic: Always 16 weeks
- Triathlon 70.3: Always 20 weeks
- Open Water Swimming: Always 8 weeks

### 6.5 UI Polish (Future Enhancement)
- [ ] Mobile responsiveness for wizard
- [ ] Loading states for each step
- [ ] Error handling and messages
- [ ] Success toast on program creation
- [ ] Redirect to new program after creation

---

## File Checklist

### Files Created ✅
```
[x] app/coach/programs/new/page.tsx
[x] components/programs/wizard/SportSelector.tsx
[x] components/programs/wizard/GoalSelector.tsx
[x] components/programs/wizard/DataSourceSelector.tsx
[x] components/programs/wizard/ConfigurationForm.tsx
[x] components/programs/wizard/WizardProgress.tsx
[x] lib/program-generator/sport-router.ts
[x] lib/program-generator/generators/cycling-generator.ts
[x] lib/program-generator/generators/skiing-generator.ts
[x] lib/program-generator/generators/swimming-generator.ts
[x] lib/program-generator/generators/triathlon-generator.ts
[x] lib/program-generator/generators/hyrox-generator.ts
[x] lib/program-generator/generators/strength-generator.ts
[x] lib/program-generator/pace-progression.ts
```

### Files Modified ✅
```
[x] app/api/programs/generate/route.ts (sport router integration)
[x] prisma/schema.prisma (STRENGTH enum, WorkoutType enum)
[x] types/index.ts (WorkoutType updates)
```

### Phase 5 Files Created ✅
```
[x] lib/program-generator/workout-mapper.ts
```

### Phase 6 Files Created ✅
```
[x] scripts/test-multi-sport-generator.ts
```

### Future Files (Not Created)
```
[ ] lib/program-generator/shared/data-source-checker.ts
```

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Wizard UI | ✅ Complete | All 6 components created |
| Phase 2: Sport Router | ✅ Complete | 8 sport generators + router |
| Phase 3: Data Sources | ✅ Complete | API supports TEST/PROFILE/MANUAL |
| Phase 4: Strength | ✅ Complete | Standalone + integrated toggle |
| Phase 5: Templates | ✅ Complete | All templates connected via workout-mapper.ts |
| Phase 6: Testing | ✅ Complete | 26/26 tests pass, 6/8 sports with detailed content |

---

## What's Working

1. **Wizard UI** - Visual 4-step program creation at `/coach/programs/new`
2. **All 8 Sports** - RUNNING, CYCLING, SKIING, SWIMMING, TRIATHLON, HYROX, STRENGTH, GENERAL_FITNESS
3. **Sport Router** - Automatic routing to appropriate generator
4. **API Integration** - Both legacy and new request formats supported
5. **Data Sources** - TEST, PROFILE, and MANUAL input options
6. **Periodization** - Programs include BASE → BUILD → PEAK → TAPER phases
7. **Template Connection** - All sport templates connected via workout-mapper.ts
8. **Detailed Workouts** - 6/8 sports generate full workout content with segments
9. **Automated Testing** - 26 test cases pass covering all sports and edge cases

## What's Pending

1. **Exercise Selection** - Advanced biomechanical balance for strength
2. **Running Templates** - Connect to detailed templates (currently skeleton only)
3. **Strength Templates** - Create detailed workout templates
4. **UI Polish** - Mobile responsiveness, loading states, toast notifications

---

## Key Files Reference
- Sport Router: `lib/program-generator/sport-router.ts`
- Generators: `lib/program-generator/generators/`
- Workout Mapper: `lib/program-generator/workout-mapper.ts`
- Wizard: `components/programs/wizard/`
- API Route: `app/api/programs/generate/route.ts`
- Templates: `lib/program-generator/templates/`
- Test Script: `scripts/test-multi-sport-generator.ts`
