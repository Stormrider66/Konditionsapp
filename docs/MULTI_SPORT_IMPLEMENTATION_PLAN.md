# Multi-Sport Platform Implementation Plan

## Executive Summary

This document outlines the implementation plan for expanding the Konditionstest app from a running-focused platform to a comprehensive multi-sport training system supporting:

- **Running** (existing)
- **Cycling** (road, indoor, MTB)
- **Cross-Country Skiing** (classic, skate, Vasaloppet-specific)
- **Triathlon** (swim/bike/run)
- **HYROX** (functional fitness racing)
- **General Fitness / CrossFit** (EMOMs, AMRAPs, mixed modality)

### Two Program Delivery Models

1. **Standard Programs** - Pre-built templates athletes can purchase instantly
2. **Custom Programs** - Personalized programs created by coaches

---

## Implementation Progress Tracker

> **Last Updated:** November 2024
> **Overall Progress:** 0% (0/147 tasks)

### Phase Overview

| Phase | Name | Status | Progress | Tasks |
|-------|------|--------|----------|-------|
| 1 | Foundation | 🔴 Not Started | 0% | 0/18 |
| 2 | Cycling | 🔴 Not Started | 0% | 0/15 |
| 3 | CrossFit Formats | 🔴 Not Started | 0% | 0/16 |
| 4 | HYROX | 🔴 Not Started | 0% | 0/22 |
| 5 | Swimming & Triathlon | 🔴 Not Started | 0% | 0/24 |
| 6 | Cross-Country Skiing | 🔴 Not Started | 0% | 0/20 |
| 7 | Program Marketplace | 🔴 Not Started | 0% | 0/18 |
| 8 | Polish & Launch | 🔴 Not Started | 0% | 0/14 |

**Status Legend:** 🔴 Not Started | 🟡 In Progress | 🟢 Complete | ⏸️ Blocked

---

### Phase 1: Foundation (Sport Profile System)

#### Database & Schema
- [ ] Add `SportType` enum to schema
- [ ] Create `SportProfile` model
- [ ] Add sport-specific settings JSON fields
- [ ] Create migration and apply
- [ ] Generate Prisma client

#### API Endpoints
- [ ] `POST /api/sport-profile` - Create profile
- [ ] `GET /api/sport-profile/[clientId]` - Get profile
- [ ] `PUT /api/sport-profile/[clientId]` - Update profile
- [ ] Add sport profile to client fetch queries

#### UI Components
- [ ] Create `SportSelector` component
- [ ] Create `OnboardingWizard` component
- [ ] Create sport-specific question forms
- [ ] Build dashboard variant system (context/provider)
- [ ] Update navigation to be sport-aware

#### Integration
- [ ] Update `Client` detail page with sport profile
- [ ] Add sport context to athlete dashboard
- [ ] Implement dashboard switching logic
- [ ] Test onboarding flow end-to-end

---

### Phase 2: Cycling

#### Database & Schema
- [ ] Add cycling-specific fields to `SportProfile`
- [ ] Create `CyclingZones` model (FTP-based)
- [ ] Add `CYCLING` workout subtypes
- [ ] Migration and Prisma generate

#### Training Engine
- [ ] Implement FTP zone calculator
- [ ] Add 20-min FTP test protocol
- [ ] Add ramp test protocol
- [ ] Implement cycling TSS calculation
- [ ] Add power-based workout prescriptions

#### UI Components
- [ ] Create cycling dashboard variant
- [ ] Build FTP test input form
- [ ] Create power zone display component
- [ ] Add indoor/outdoor toggle to workouts
- [ ] Build cycling workout card variant

---

### Phase 3: CrossFit/Functional Formats

#### Database & Schema
- [ ] Add `WorkoutFormat` enum
- [ ] Add `formatSettings` JSON to Workout model
- [ ] Add format-specific fields to WorkoutSegment
- [ ] Migration and Prisma generate

#### Workout Builder
- [ ] Create EMOM workout builder
- [ ] Create AMRAP workout builder
- [ ] Create For Time workout builder
- [ ] Create Tabata builder
- [ ] Create Chipper builder

#### Logging & Scoring
- [ ] Build EMOM round logger
- [ ] Build AMRAP rounds+reps logger
- [ ] Build For Time completion logger
- [ ] Create PR tracking for formats
- [ ] Build format-specific workout cards

#### Exercise Library
- [ ] Add 15+ functional exercises
- [ ] Add exercise scaling options
- [ ] Add equipment categorization

---

### Phase 4: HYROX

#### Database & Schema
- [ ] Create `HyroxStation` model with all 8 stations
- [ ] Create `HyroxProfile` model
- [ ] Add division specifications
- [ ] Seed station data
- [ ] Migration and Prisma generate

#### Training Engine
- [ ] Implement compromised running algorithm
- [ ] Build weakness identification system
- [ ] Create race time predictor
- [ ] Add station benchmark tracking
- [ ] Implement degradation coefficients

#### Workout Generation
- [ ] Build HYROX station workout generator
- [ ] Create race simulation workout type
- [ ] Add Roxzone transition workouts
- [ ] Build half-sim generator

#### UI Components
- [ ] Create HYROX dashboard
- [ ] Build station weakness heatmap
- [ ] Create benchmark entry forms
- [ ] Build station-specific workout cards
- [ ] Add race countdown widget

#### Testing
- [ ] Test race predictor accuracy
- [ ] Validate compromised running logic

---

### Phase 5: Swimming & Triathlon

#### Swimming - Database
- [ ] Create `SwimmingZones` model
- [ ] Create `SwimDrill` model
- [ ] Add swimming-specific WorkoutSegment fields
- [ ] Migration and Prisma generate

#### Swimming - Training Engine
- [ ] Implement CSS calculator
- [ ] Build CSS test protocol
- [ ] Create 5-zone swim system
- [ ] Add swim-specific TSS/load

#### Swimming - Content
- [ ] Seed 10+ swim drills
- [ ] Add drill descriptions (EN/SV)
- [ ] Add drill videos (links)
- [ ] Create drill progression system

#### Triathlon - Features
- [ ] Create triathlon dashboard (3-column)
- [ ] Build brick session support
- [ ] Add discipline balance tracking
- [ ] Create T1/T2 transition workouts
- [ ] Implement multi-discipline calendar
- [ ] Add weekly hours by discipline

#### UI Components
- [ ] Create swimming workout card
- [ ] Build swim drill selector
- [ ] Create CSS test input form
- [ ] Build triathlon calendar view
- [ ] Add discipline filter to calendar

---

### Phase 6: Cross-Country Skiing

#### Database & Schema
- [ ] Create `SkiingProfile` model
- [ ] Create `SkiingZones` model (8-zone)
- [ ] Add technique type fields
- [ ] Add season tracking
- [ ] Migration and Prisma generate

#### Training Engine
- [ ] Implement Olympiatoppen zone calculator
- [ ] Add HR offset for skiing
- [ ] Create SkiErg test protocol
- [ ] Build seasonal periodization logic
- [ ] Add dryland vs snow phase detection

#### Workout Types
- [ ] Add roller ski workouts
- [ ] Add SkiErg workouts
- [ ] Add running with poles (skidgång)
- [ ] Add classic technique drills
- [ ] Add skate technique drills

#### UI Components
- [ ] Create skiing dashboard
- [ ] Build season phase indicator
- [ ] Create technique balance display
- [ ] Add Vasaloppet countdown
- [ ] Build skiing workout cards

#### Content
- [ ] Seed skiing drill library
- [ ] Add Vasaloppet-specific content

---

### Phase 7: Program Marketplace

#### Database & Schema
- [ ] Create `ProgramTemplate` model
- [ ] Create `ProgramPurchase` model
- [ ] Add pricing fields
- [ ] Add rating/review fields
- [ ] Migration and Prisma generate

#### Template System
- [ ] Build template creation wizard (coach)
- [ ] Create template preview component
- [ ] Build program generation from template
- [ ] Add template duplication

#### Marketplace UI
- [ ] Create template browser page
- [ ] Build category filters
- [ ] Add search functionality
- [ ] Create template detail page
- [ ] Build purchase/unlock flow

#### Content
- [ ] Create 2-3 running templates
- [ ] Create 1-2 HYROX templates
- [ ] Create 1 Vasaloppet template
- [ ] Create 1 triathlon template
- [ ] Create 2-3 fitness templates

---

### Phase 8: Polish & Launch

#### Testing
- [ ] Cross-sport integration tests
- [ ] E2E: HYROX athlete flow
- [ ] E2E: Triathlete season flow
- [ ] E2E: Vasaloppet prep flow
- [ ] E2E: CrossFit AMRAP flow
- [ ] Performance testing

#### Documentation
- [ ] Update CLAUDE.md with new features
- [ ] Update API documentation
- [ ] Create user guide for new sports
- [ ] Document template creation

#### Final Polish
- [ ] UI consistency review
- [ ] Mobile responsiveness check
- [ ] Error handling review
- [ ] Loading states audit

---

### Quick Reference: File Locations

| Feature | Key Files |
|---------|-----------|
| Sport Profile | `prisma/schema.prisma`, `app/api/sport-profile/`, `components/onboarding/` |
| Cycling | `lib/training-engine/cycling/`, `components/coach/cycling/` |
| CrossFit Formats | `lib/workout-formats/`, `components/workouts/formats/` |
| HYROX | `lib/training-engine/hyrox/`, `components/coach/hyrox/` |
| Swimming | `lib/training-engine/swimming/`, `components/coach/swimming/` |
| Triathlon | `lib/training-engine/triathlon/`, `components/athlete/triathlon/` |
| Skiing | `lib/training-engine/skiing/`, `components/coach/skiing/` |
| Marketplace | `app/marketplace/`, `components/templates/` |

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Sport Profile System](#2-sport-profile-system)
3. [Data Model Changes](#3-data-model-changes)
4. [Per-Sport Implementation](#4-per-sport-implementation)
5. [Workout Format System (CrossFit-style)](#5-workout-format-system)
6. [Standard Program Templates](#6-standard-program-templates)
7. [UI/UX Adaptations](#7-uiux-adaptations)
8. [Training Engine Extensions](#8-training-engine-extensions)
9. [Payment & Subscription Model](#9-payment--subscription-model)
10. [Implementation Phases](#10-implementation-phases)
11. [Testing Strategy](#11-testing-strategy)

---

## 1. Current State Analysis

### What We Have

**Database Models:**
- `TestType` enum: RUNNING, CYCLING, SKIING
- `WorkoutType` enum: RUNNING, STRENGTH, PLYOMETRIC, CORE, RECOVERY, CYCLING, SKIING, ALTERNATIVE
- `TrainingProgram`, `TrainingWeek`, `TrainingDay`, `Workout`, `WorkoutSegment`
- 84-exercise library with biomechanical pillars
- Full strength training periodization system

**Training Engine:**
- Methodologies: Polarized, Norwegian, Canova, Pyramidal
- TSS/TRIMP load calculations
- Readiness monitoring (HRV, RHR)
- Injury management system
- Field test protocols

**Zone Systems:**
- Running pace zones (VDOT, lactate-based)
- HR zones (5-zone system)
- Power zones for cycling (FTP-based)

### What We Need to Add

- Sport Profile system
- Swimming workouts & CSS zones
- HYROX stations & compromised running logic
- CrossFit workout formats (EMOM, AMRAP, For Time)
- Skiing-specific zones (8-zone Olympiatoppen scale)
- Multi-discipline calendars
- Standard program marketplace
- Triathlon brick sessions

---

## 2. Sport Profile System

### Concept

A unified profile that determines the athlete's experience throughout the app. Stored on the `Client` or `AthleteProfile` model.

### Schema Addition

```prisma
enum SportType {
  RUNNING
  CYCLING
  CROSS_COUNTRY_SKIING
  TRIATHLON
  HYROX
  GENERAL_FITNESS
  SWIMMING  // For standalone or triathlon
}

model SportProfile {
  id        String   @id @default(uuid())
  clientId  String   @unique

  // Primary sport determines dashboard & navigation
  primarySport     SportType
  secondarySports  SportType[]  // For multi-sport athletes

  // Sport-specific settings
  cyclingSettings  Json?  // { hasPowerMeter, ftp, indoorTrainer, bikeType }
  swimmingSettings Json?  // { cssTime400, cssTime200, poolLength, openWaterAccess }
  skiingSettings   Json?  // { technique: 'classic'|'skate'|'both', hasRollerskis, skiErgAccess }
  hyroxSettings    Json?  // { division, targetTime, weakStations }
  fitnessSettings  Json?  // { gymAccess, equipmentList, goals }
  triathlonSettings Json? // { primaryDistance, strongestDiscipline, weakestDiscipline }

  // Experience & onboarding
  experienceLevel  String  // 'beginner', 'intermediate', 'advanced'
  trainingAge      Int?    // Years of structured training
  weeklyHours      Float?  // Available training hours

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
```

### Onboarding Flow

```
Entry Point Selection
├── "I just did a test" → Sport auto-detected → Minimal onboarding
├── "I need a program" → Sport selection → Full onboarding
└── "Just browsing" → Guest experience

Sport Selection
├── Running (existing)
├── Cycling
├── Cross-Country Skiing
├── Triathlon
├── HYROX
└── General Fitness / CrossFit

Sport-Specific Questions
├── Experience level
├── Current fitness (volume/week, recent tests)
├── Goals (race, fitness, time targets)
├── Equipment access
├── Training availability (days/week, hours)
└── Special considerations
```

---

## 3. Data Model Changes

### 3.1 Extended Enums

```prisma
// Extend TestType
enum TestType {
  RUNNING
  CYCLING
  SKIING
  SWIMMING      // NEW: CSS test, pool test
  HYROX_SIM     // NEW: Full or partial HYROX simulation
  SKIERG        // NEW: SkiErg test (5000m)
  ROWING        // NEW: 2000m row test
}

// Extend WorkoutType
enum WorkoutType {
  RUNNING
  STRENGTH
  PLYOMETRIC
  CORE
  RECOVERY
  CYCLING
  SKIING
  ALTERNATIVE
  OTHER
  // NEW types
  SWIMMING
  HYROX_STATION    // Sled, Wall Balls, etc.
  HYROX_SIMULATION // Full race sim
  BRICK            // Multi-sport (T2 transitions)
  SKIERG
  ROWING
  FUNCTIONAL       // CrossFit-style mixed
  DRILLS           // Technique work (swim drills, ski drills)
  ROLLERSKI
}

// NEW: Workout Format for CrossFit-style
enum WorkoutFormat {
  STANDARD         // Traditional sets x reps
  EMOM             // Every Minute On the Minute
  AMRAP            // As Many Rounds As Possible
  FOR_TIME         // Complete as fast as possible
  TABATA           // 20s work / 10s rest
  LADDER           // Ascending/descending
  CHIPPER          // Long list, one time through
  INTERVAL         // Timed work/rest intervals
}
```

### 3.2 Swimming Models

```prisma
model SwimmingZones {
  id        String   @id @default(uuid())
  clientId  String   @unique

  // CSS Test Results
  time400m    Int      // seconds
  time200m    Int      // seconds
  cssSpeed    Float    // meters/second
  cssPace100m Int      // seconds per 100m

  // Derived Zones (pace per 100m in seconds)
  zone1Pace   Int      // CSS + 15-20s (Recovery)
  zone2Pace   Int      // CSS + 5-10s (Endurance)
  zone3Pace   Int      // CSS + 3-5s (Tempo)
  zone4Pace   Int      // CSS (Threshold)
  zone5Pace   Int      // CSS - 3-5s (VO2max)

  testedAt  DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

model SwimDrill {
  id          String @id @default(uuid())
  name        String // "Fist Drill", "6-1-6", "Catch-up"
  nameSv      String // Swedish name
  category    String // "catch", "rotation", "kick", "breathing"
  description String @db.Text
  videoUrl    String?
  cuesEn      String[] // Coaching cues in English
  cuesSv      String[] // Coaching cues in Swedish
  targetLevel String   // "beginner", "intermediate", "advanced"
}
```

### 3.3 HYROX Models

```prisma
model HyroxStation {
  id        String @id @default(uuid())

  // Static station data
  name      String    // "SkiErg", "Sled Push", etc.
  order     Int       // 1-8
  type      String    // "skierg", "sled_push", "sled_pull", "burpee", "row", "farmers", "lunges", "wall_balls"

  // Specifications by division
  specifications Json  // { "men_open": { weight: 152, distance: 50 }, ... }

  // Training guidance
  physiologicalLimiter String  // "Upper Body Aerobic Power", "Concentric Leg Strength"
  commonMistakes       String[]
  techniqueCues        String[]

  // Run degradation coefficient
  postStationRunDegradation Float  // +5 to +30 seconds per km
}

model HyroxProfile {
  id        String @id @default(uuid())
  clientId  String @unique

  division       String   // "men_open", "women_open", "men_pro", etc.
  targetTime     Int?     // Target finish time in seconds
  bestTime       Int?     // PR time in seconds

  // Station benchmarks (seconds)
  skiergTime     Int?
  sledPushTime   Int?
  sledPullTime   Int?
  burpeeTime     Int?
  rowTime        Int?
  farmersTime    Int?
  lungesTime     Int?
  wallBallsTime  Int?

  // Identified weaknesses
  weakStations   String[]  // ["sled_push", "wall_balls"]
  strongStations String[]  // ["skierg", "row"]

  // Running baseline
  baseline10kPace Int?    // seconds per km

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
```

### 3.4 Skiing Models

```prisma
model SkiingProfile {
  id        String @id @default(uuid())
  clientId  String @unique

  // Technique preferences
  primaryTechnique   String   // "classic", "skate", "both"

  // Equipment
  hasRollerskis      Boolean @default(false)
  hasSkiErg          Boolean @default(false)

  // Season tracking
  currentSeason      String   // "snow", "dryland"

  // Vasaloppet-specific
  targetVasaTime     Int?     // Target time in minutes
  vasaStartGroup     String?  // Seeding group

  // SkiErg benchmarks
  skierg5000mTime    Int?     // seconds

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

// 8-zone Norwegian/Olympiatoppen system
model SkiingZones {
  id        String @id @default(uuid())
  clientId  String @unique

  // HR-based zones (bpm)
  i1HrMax   Int    // Zone I-1 ceiling (typically 72% HRmax)
  i2HrMax   Int    // Zone I-2 ceiling (82%)
  i3HrMax   Int    // Zone I-3 ceiling (87%)
  i4HrMax   Int    // Zone I-4 ceiling (92%)
  i5HrMax   Int    // Zone I-5 ceiling (97%)

  // Lactate anchors (mmol/L)
  lt1Lactate Float  // ~1.5-2.0
  lt2Lactate Float  // ~3.0-4.0

  // Skiing-specific HR offset (typically -5 to -10 from running)
  hrOffset  Int     @default(-7)

  testedAt  DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
```

### 3.5 Enhanced Workout Model

```prisma
model Workout {
  id    String @id @default(uuid())
  dayId String

  type        WorkoutType
  format      WorkoutFormat @default(STANDARD)  // NEW
  name        String
  description String?  @db.Text
  status      String   @default("PLANNED")

  intensity WorkoutIntensity
  duration  Int?
  distance  Float?

  // NEW: Format-specific settings
  formatSettings Json?  // { timeLimit: 20, rounds: 5 } for AMRAP/EMOM

  // NEW: Multi-sport support
  discipline    String?  // "swim", "bike", "run", "ski", etc.
  isBrickStart  Boolean @default(false)  // Starts a brick session
  isBrickEnd    Boolean @default(false)  // Ends a brick session

  // NEW: HYROX specifics
  hyroxStationType String?  // "sled_push", "wall_balls", etc.
  isRaceSimulation Boolean @default(false)

  // Existing fields...
  instructions String? @db.Text
  coachNotes   String? @db.Text
  order        Int @default(1)
  isCustom     Boolean @default(false)

  day      TrainingDay      @relation(fields: [dayId], references: [id], onDelete: Cascade)
  segments WorkoutSegment[]
  logs     WorkoutLog[]
  messages Message[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3.6 Enhanced WorkoutSegment

```prisma
model WorkoutSegment {
  id        String @id @default(uuid())
  workoutId String

  order Int
  type  String  // "warmup", "work", "rest", "transition", "station", "round"

  // Duration/Distance
  duration  Int?     // minutes or seconds
  distance  Float?   // km or meters

  // Running/Cycling/Skiing
  pace      String?  // "5:00/km" or zone-based
  zone      Int?     // Training zone 1-8
  heartRate String?  // "140-150 bpm"
  power     Int?     // watts (cycling)

  // Swimming-specific
  strokeType  String?  // "freestyle", "backstroke", etc.
  poolLength  Int?     // 25 or 50 meters
  swimPace    Int?     // seconds per 100m
  drillName   String?  // For drill segments

  // Strength/CrossFit
  exerciseId  String?
  sets        Int?
  repsCount   String?  // "10" or "10-12" or "AMRAP"
  weight      String?  // "80kg" or "BW" or "50%"
  tempo       String?  // "3-1-1"
  rest        Int?     // seconds

  // NEW: CrossFit format support
  roundNumber Int?     // Which round (for AMRAP logging)
  timeCapSeconds Int?  // Time cap for this segment
  targetScore String?  // "Complete 5 rounds", "For time"

  // NEW: HYROX station
  stationType    String?  // "sled_push", "skierg", etc.
  stationWeight  Float?   // kg
  stationDistance Float?  // meters
  stationReps    Int?     // For wall balls, burpees

  description String? @db.Text
  notes       String? @db.Text

  workout  Workout   @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exercise Exercise? @relation(fields: [exerciseId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())
}
```

---

## 4. Per-Sport Implementation

### 4.1 Running (Existing - Enhancements)

**Current State:** Fully implemented with Polarized, Norwegian, Canova methodologies.

**Enhancements:**
- Add support for treadmill workouts with incline
- Trail running profile option
- Ultra-marathon specific periodization

---

### 4.2 Cycling

**Zone System:** 7-zone FTP-based (Coggan model)

| Zone | Name | % FTP | Description |
|------|------|-------|-------------|
| Z1 | Active Recovery | <55% | Easy spinning |
| Z2 | Endurance | 56-75% | Base building |
| Z3 | Tempo | 76-90% | Sustained effort |
| Z4 | Threshold | 91-105% | FTP work |
| Z5 | VO2max | 106-120% | 3-8 min intervals |
| Z6 | Anaerobic | 121-150% | 30s-2min efforts |
| Z7 | Neuromuscular | Max | Sprints |

**Workout Types:**
- Endurance rides (Z2)
- Sweet spot (88-94% FTP)
- Threshold intervals
- VO2max intervals (4x4, 5x5)
- Over-unders
- Hill repeats (simulated or real)
- Recovery spins

**Testing Protocols:**
- 20-minute FTP test
- Ramp test
- 8-minute test (2x8min)

**Indoor vs Outdoor:**
- Flag workouts as indoor/outdoor
- Adjust RPE expectations (indoor typically feels harder)
- TrainerRoad-style progression model

---

### 4.3 Cross-Country Skiing

**Zone System:** Olympiatoppen 8-zone (I-Scale)

| Zone | Name | HR %max | Lactate | Duration Possible |
|------|------|---------|---------|-------------------|
| I-1 | Low Intensity | 55-72% | <1.5 | Hours |
| I-2 | Moderate | 72-82% | 1.0-2.0 | 1-3 hours |
| I-3 | Threshold | 82-87% | 1.5-3.5 | 45-60 min |
| I-4 | High (VO2) | 87-92% | 3.0-6.0 | 8-15 min |
| I-5 | Max Aerobic | 92-97% | 6-10+ | 3-8 min |
| I-6 | Short Intervals | >97% | High | 30s-2min |
| I-7 | Speed | Max | N/A | <30s |
| I-8 | Sprint | Max | N/A | <15s |

**Training Modes:**
- On-snow skiing (classic, skate)
- Roller skiing
- Running with poles (skidgång/elghufs)
- SkiErg
- Strength for skiing

**Seasonal Periodization:**
- Phase 1: Dryland (May-Aug) - Build base, strength
- Phase 2: Specific Prep (Sep-Nov) - SkiErg, roller ski intervals
- Phase 3: Snow/Volume (Dec-Feb) - On-snow volume + races
- Phase 4: Competition (Feb-Mar) - Vasaloppet, races

**Vasaloppet-Specific:**
- Double poling (stakning) emphasis
- 3-5 hour long sessions
- Seeding race integration
- Fueling practice

**Technical Drills:**
- Locked arm stakning
- One-arm poling
- No-pole skiing
- Technique intervals

---

### 4.4 Triathlon

**Multi-Discipline Management:**
- Separate zones for each discipline
- Weekly volume by discipline (swim km, bike km, run km)
- Discipline balance tracking

**Swimming Component:**
- CSS-based zones (see Section 3.2)
- Pool vs open water designation
- Drill integration (fist, 6-1-6, sculling)
- Wetsuit considerations

**Brick Sessions:**
- Bike → Run transitions (T2)
- Swim → Bike transitions (T1)
- "Tired legs" running
- Nutrition practice

**Race Distance Profiles:**

| Distance | Swim | Bike | Run | Total Time |
|----------|------|------|-----|------------|
| Sprint | 750m | 20km | 5km | 1-1.5h |
| Olympic | 1500m | 40km | 10km | 2-3h |
| 70.3 | 1900m | 90km | 21km | 4-7h |
| Ironman | 3800m | 180km | 42km | 8-17h |

**Periodization:**
- Base: Build each discipline separately
- Build: Introduce bricks, increase intensity
- Peak: Race-specific sessions, simulations
- Taper: Volume reduction, maintain intensity

---

### 4.5 HYROX

**Station Database:**

| # | Station | Men Open | Women Open | Key Muscles |
|---|---------|----------|------------|-------------|
| 1 | SkiErg | 1000m | 1000m | Lats, triceps, core |
| 2 | Sled Push | 152kg/50m | 102kg/50m | Quads, glutes |
| 3 | Sled Pull | 103kg/50m | 78kg/50m | Back, biceps, grip |
| 4 | Burpee Broad Jump | 80m | 80m | Full body |
| 5 | Rowing | 1000m | 1000m | Full body |
| 6 | Farmers Carry | 2x24kg/200m | 2x16kg/200m | Grip, core, traps |
| 7 | Lunges | 20kg/100m | 10kg/100m | Quads, glutes |
| 8 | Wall Balls | 100x6kg | 75x4kg | Shoulders, quads |

**Compromised Running Algorithm:**
Post-station run pace adjustments:
- Post-SkiErg: +0-5 sec/km
- Post-Sled Push: +15-30 sec/km
- Post-Sled Pull: +10-15 sec/km
- Post-Burpees: +10-15 sec/km
- Post-Rowing: +5-10 sec/km
- Post-Farmers: +5-10 sec/km
- Post-Lunges: +15-25 sec/km
- Post-Wall Balls: +10-20 sec/km

**Training Structure:**
- Running days (base + intervals)
- Station practice days
- Strength days (upper/lower split)
- Simulation days (full or half)
- Roxzone transition practice

**Weakness Identification:**
- Benchmark each station
- Compare to target time
- Auto-identify bottlenecks
- Prescribe corrective blocks

---

### 4.6 General Fitness / CrossFit

**Workout Formats:**

**EMOM (Every Minute On the Minute)**
```
Format: X rounds, Y exercises per round
Timing: New round starts every 60 seconds
Rest: Remaining time after completing exercises
Example: 12-min EMOM
  Min 1: 10 KB Swings
  Min 2: 10 Push-ups
  Min 3: 10 Air Squats
```

**AMRAP (As Many Rounds As Possible)**
```
Format: Time cap, list of exercises
Goal: Complete maximum rounds
Scoring: Rounds + reps
Example: 20-min AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
```

**For Time**
```
Format: Fixed work, complete as fast as possible
Time cap: Optional maximum time
Scoring: Total time
Example: For Time (15 min cap)
  21-15-9 reps of:
  Thrusters (43kg)
  Pull-ups
```

**Tabata**
```
Format: 20s work / 10s rest × 8 rounds
Duration: 4 minutes per exercise
Scoring: Lowest rep count
```

**Chipper**
```
Format: Long list of exercises, one time through
Example:
  50 Double Unders
  40 Wall Balls
  30 Box Jumps
  20 KB Swings
  10 Burpees
```

**Mixed Modality Sessions:**
- Cardio + Strength in same workout
- Running + Lifting combinations
- Functional fitness circuits
- Metabolic conditioning

**Equipment Categories:**
- Barbell movements
- Dumbbell/Kettlebell
- Bodyweight
- Cardio machines (rower, bike, ski)
- Gymnastics (pull-ups, muscle-ups, HSPUs)

---

## 5. Workout Format System

### Database Model for Formats

```prisma
model WorkoutTemplate {
  id        String @id @default(uuid())
  coachId   String?  // NULL = system template

  name        String
  format      WorkoutFormat
  sport       SportType

  // Format configuration
  timeCapMinutes  Int?     // For AMRAP, For Time
  roundCount      Int?     // For EMOM
  intervalWork    Int?     // seconds (for Tabata)
  intervalRest    Int?     // seconds

  // Template content
  segments    Json       // Array of segment definitions
  scalingOptions Json?    // { "rx": {...}, "scaled": {...}, "beginner": {...} }

  // Categorization
  difficulty     String    // "beginner", "intermediate", "advanced"
  muscleGroups   String[]
  equipment      String[]
  estimatedTime  Int       // minutes

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  creator User? @relation(fields: [coachId], references: [id])
}
```

### Segment Types for Different Formats

**Standard Segment:**
```json
{
  "type": "exercise",
  "exerciseId": "uuid",
  "sets": 3,
  "reps": "10",
  "weight": "80kg",
  "rest": 90
}
```

**EMOM Segment:**
```json
{
  "type": "emom_round",
  "exercises": [
    { "exerciseId": "uuid", "reps": 10 },
    { "exerciseId": "uuid", "reps": 15 }
  ],
  "minuteAllocation": 1
}
```

**AMRAP Segment:**
```json
{
  "type": "amrap_circuit",
  "timeCapMinutes": 20,
  "exercises": [
    { "exerciseId": "uuid", "reps": 5 },
    { "exerciseId": "uuid", "reps": 10 },
    { "exerciseId": "uuid", "reps": 15 }
  ]
}
```

**For Time Segment:**
```json
{
  "type": "for_time",
  "timeCapMinutes": 15,
  "scheme": "21-15-9",
  "exercises": [
    { "exerciseId": "uuid", "reps": "scheme" },
    { "exerciseId": "uuid", "reps": "scheme" }
  ]
}
```

---

## 6. Standard Program Templates

### Marketplace Concept

Pre-built programs that athletes can purchase/access:

**Categories:**
- Running (5K, 10K, Half, Marathon, Ultra)
- Cycling (FTP Builder, Century Prep, Crit Racing)
- Triathlon (Sprint, Olympic, 70.3, Ironman)
- Skiing (Vasaloppet 16-week, Base Building)
- HYROX (Beginner, Sub-90, Sub-75, Elite)
- General Fitness (Weight Loss, Muscle Building, Metabolic)

### Template Structure

```prisma
model ProgramTemplate {
  id        String @id @default(uuid())

  // Metadata
  name        String
  description String @db.Text
  sport       SportType
  subCategory String?   // "marathon", "70.3", "vasaloppet"

  // Configuration
  durationWeeks   Int
  weeksPerPhase   Json     // { "base": 4, "build": 6, "peak": 3, "taper": 2 }
  hoursPerWeek    Float    // Average weekly volume
  daysPerWeek     Int      // Training days

  // Target audience
  experienceLevel String   // "beginner", "intermediate", "advanced"
  prerequisites   String[] // "run 5km", "swim 400m continuous"

  // Content
  structure       Json     // Week-by-week structure template

  // Commercial
  price           Float?   // NULL = free, else price in SEK
  isPublished     Boolean @default(false)

  // Stats
  purchaseCount   Int @default(0)
  averageRating   Float?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  purchases ProgramPurchase[]
}

model ProgramPurchase {
  id          String @id @default(uuid())
  templateId  String
  clientId    String

  purchasedAt DateTime @default(now())
  startDate   DateTime

  // Generated program reference
  programId   String? @unique

  template ProgramTemplate @relation(fields: [templateId], references: [id])
  client   Client          @relation(fields: [clientId], references: [id])
  program  TrainingProgram? @relation(fields: [programId], references: [id])
}
```

### Example Templates

**HYROX Sub-90 (12 weeks)**
- Week 1-4: Base building (running + strength foundation)
- Week 5-8: Station specificity (weakness targeting)
- Week 9-11: Race simulation + Roxzone
- Week 12: Taper

**Vasaloppet First Timer (16 weeks)**
- Week 1-6: Dryland base (roller ski, SkiErg, running)
- Week 7-10: Specific prep (intervals, technique)
- Week 11-14: Volume accumulation (on snow)
- Week 15-16: Taper + race

**Olympic Triathlon Beginner (12 weeks)**
- Each week: 2 swims, 2 bikes, 2 runs + 1 brick
- Progressive volume increase
- Technique focus in swim
- Open water sessions in final weeks

---

## 7. UI/UX Adaptations

### 7.1 Dashboard Variants

**Running Dashboard** (existing)
- Pace zones
- Weekly km
- Race countdown
- Zone distribution chart

**Cycling Dashboard**
- Power zones
- FTP trend
- TSS tracking
- Indoor/outdoor toggle

**Triathlon Dashboard**
- Three-column discipline view
- Weekly hours by sport
- Brick session tracker
- Balance indicators

**HYROX Dashboard**
- Station weakness heatmap
- Running vs station balance
- Race time predictor
- Simulation countdown

**Skiing Dashboard**
- Season phase indicator (snow/dryland)
- Technique balance (classic/skate)
- SkiErg benchmarks
- Vasaloppet countdown

**CrossFit/Fitness Dashboard**
- Workout history (scores)
- PR board
- Workout streak
- Format distribution

### 7.2 Calendar Adaptations

**Multi-Sport Calendar View**
- Color-coded by discipline
- Icons for workout types
- Brick session linking
- Volume summaries

**HYROX Week View**
- Station practice slots
- Running mileage
- Simulation placement
- Recovery balance

### 7.3 Navigation Structure

```
Coach Portal
├── Athletes
├── Programs
│   ├── Create Custom
│   └── Assign Template
├── Tests (all sports)
├── Exercise Library
│   ├── Strength
│   ├── Swimming Drills
│   ├── Skiing Drills
│   └── HYROX Stations
├── Templates (marketplace)
└── Settings

Athlete Portal
├── Dashboard (sport-specific)
├── Today's Workout
├── Calendar
├── Progress
│   ├── By Discipline
│   └── PRs & Benchmarks
├── Programs
│   ├── Current
│   └── Browse Templates
└── Check-in
```

---

## 8. Training Engine Extensions

### 8.1 New Zone Calculators

**CSS Calculator (Swimming)**
```typescript
function calculateCSS(time400m: number, time200m: number) {
  const distanceDiff = 200; // meters
  const timeDiff = time400m - time200m;
  const cssSpeed = distanceDiff / timeDiff; // m/s
  const cssPace100m = 100 / cssSpeed;

  return {
    cssSpeed,
    cssPace100m,
    zones: {
      z1: cssPace100m + 17,  // +15-20s
      z2: cssPace100m + 8,   // +5-10s
      z3: cssPace100m + 4,   // +3-5s
      z4: cssPace100m,       // CSS
      z5: cssPace100m - 4,   // -3-5s
    }
  };
}
```

**Olympiatoppen Zones (Skiing)**
```typescript
function calculateSkiingZones(hrMax: number, runningHrMax?: number) {
  // Apply offset if running HR known
  const offset = runningHrMax ? Math.min(hrMax - runningHrMax, -5) : -7;
  const adjustedMax = hrMax + offset;

  return {
    i1: { min: Math.round(adjustedMax * 0.55), max: Math.round(adjustedMax * 0.72) },
    i2: { min: Math.round(adjustedMax * 0.72), max: Math.round(adjustedMax * 0.82) },
    i3: { min: Math.round(adjustedMax * 0.82), max: Math.round(adjustedMax * 0.87) },
    i4: { min: Math.round(adjustedMax * 0.87), max: Math.round(adjustedMax * 0.92) },
    i5: { min: Math.round(adjustedMax * 0.92), max: Math.round(adjustedMax * 0.97) },
  };
}
```

### 8.2 Load Normalization

From the physiological framework document:

| Zone | Load Coefficient | Examples |
|------|------------------|----------|
| Z1 | 1.0 | Easy work, recovery |
| Z2 | 1.2 | Endurance, base |
| Z3 | 2.0 | Threshold, CSS, I-3 |
| Z4 | 3.0 | VO2, I-4 |
| Z5 | 5.0 | Anaerobic, sprints |

This allows cross-sport load tracking (ATL/CTL).

### 8.3 HYROX Race Predictor

```typescript
function predictHyroxTime(profile: HyroxProfile) {
  const runTime = profile.baseline10kPace * 8; // 8km total
  const degradation = calculateTotalDegradation(profile);
  const stationTime = sumStationTimes(profile);
  const transitionTime = 8 * 30; // Estimate 30s per transition

  return runTime + degradation + stationTime + transitionTime;
}

function calculateTotalDegradation(profile: HyroxProfile) {
  // Apply degradation coefficients based on weakness
  const coefficients = {
    skierg: 3,
    sled_push: 22,
    sled_pull: 12,
    burpee: 12,
    row: 7,
    farmers: 7,
    lunges: 20,
    wall_balls: 15,
  };

  // Adjust based on relative weakness
  return Object.entries(coefficients).reduce((total, [station, coef]) => {
    const weakness = profile.weakStations.includes(station) ? 1.3 : 1.0;
    return total + (coef * weakness);
  }, 0);
}
```

---

## 9. Payment & Subscription Model

### Tier Structure

| Tier | Monthly Price | Features |
|------|---------------|----------|
| **Free** | 0 SEK | View tests, basic logging, 1 sport |
| **Athlete** | 99 SEK | All sports, standard programs, progress tracking |
| **Premium** | 199 SEK | Custom coach programs, advanced analytics |
| **Coach Basic** | 299 SEK | Up to 10 athletes |
| **Coach Pro** | 599 SEK | Up to 50 athletes, team features |
| **Enterprise** | Custom | Unlimited, white-label options |

### Program Purchases

- Standard programs: One-time purchase (99-499 SEK)
- Or included with Athlete tier (access to library)
- Custom programs: Priced per coach

---

## 10. Implementation Phases

### Phase 1: Foundation (4-6 weeks)
**Goal:** Sport profile system + UI adaptation framework

- [ ] Create `SportProfile` model and API
- [ ] Build onboarding wizard component
- [ ] Implement dashboard variant system
- [ ] Update navigation to be sport-aware
- [ ] Add sport selector to existing flows

### Phase 2: Cycling (3-4 weeks)
**Goal:** Full cycling program support

- [ ] FTP zone calculator
- [ ] Cycling workout types & templates
- [ ] Power-based workout segments
- [ ] Indoor/outdoor tracking
- [ ] TSS calculation for cycling
- [ ] Cycling-specific dashboard

### Phase 3: CrossFit Formats (3-4 weeks)
**Goal:** EMOM, AMRAP, For Time support

- [ ] `WorkoutFormat` enum and model updates
- [ ] Format-specific workout builder UI
- [ ] Scoring/logging for each format
- [ ] Exercise library expansion (functional)
- [ ] Format-specific workout cards

### Phase 4: HYROX (4-5 weeks)
**Goal:** Complete HYROX training system

- [ ] HYROX station database
- [ ] `HyroxProfile` model
- [ ] Compromised running algorithm
- [ ] Weakness identification system
- [ ] Race simulation workouts
- [ ] HYROX-specific dashboard
- [ ] Station benchmark tracking

### Phase 5: Swimming & Triathlon (5-6 weeks)
**Goal:** Swimming zones + triathlon integration

- [ ] CSS test and calculator
- [ ] Swimming zone system
- [ ] Swim drill library (10-15 drills)
- [ ] `SwimmingZones` model
- [ ] Brick session support
- [ ] Triathlon dashboard
- [ ] Multi-discipline calendar
- [ ] Discipline balance tracking

### Phase 6: Cross-Country Skiing (4-5 weeks)
**Goal:** Full skiing support

- [ ] Olympiatoppen 8-zone system
- [ ] `SkiingProfile` and `SkiingZones` models
- [ ] Season phase tracking (dryland/snow)
- [ ] SkiErg workout integration
- [ ] Technique types (classic/skate)
- [ ] Vasaloppet program template
- [ ] Skiing-specific dashboard

### Phase 7: Standard Program Marketplace (3-4 weeks)
**Goal:** Template system + purchases

- [ ] `ProgramTemplate` model
- [ ] Template creation UI (coach)
- [ ] Template browser (athlete)
- [ ] Purchase/unlock flow
- [ ] Program generation from template
- [ ] Initial template library (5-10 templates)

### Phase 8: Polish & Launch (2-3 weeks)
**Goal:** Testing, refinement, documentation

- [ ] Cross-sport integration testing
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Migration scripts if needed
- [ ] Beta testing with select users

---

## 11. Testing Strategy

### Unit Tests
- Zone calculators (CSS, FTP, Olympiatoppen)
- Load normalization across sports
- HYROX race predictor
- Workout format scoring

### Integration Tests
- Sport profile creation flow
- Program generation per sport
- Workout logging per format
- Multi-sport calendar rendering

### E2E Test Scenarios

1. **New HYROX Athlete**
   - Onboarding → Sport selection → Benchmark entry → Program assignment → Workout completion → Progress tracking

2. **Triathlete Season**
   - CSS test → Bike FTP test → Running zones → Create 12-week program → Weekly brick sessions → Race day

3. **Vasaloppet Preparation**
   - SkiErg test → Dryland phase → Snow transition → Volume block → Taper → Race

4. **CrossFit AMRAP Workout**
   - Create AMRAP template → Assign to athlete → Complete workout → Log rounds+reps → View PR

---

## Appendix A: Exercise Library Expansion

### Swimming Drills (to add)
1. Fist Drill (Knutna nävar)
2. 6-1-6 Rotation Drill
3. Catch-up Drill
4. Single Arm (Enarms-sim)
5. Sculling (Front, Mid, Rear)
6. Tarzan Drill (Sighting)
7. Fingertip Drag
8. Zipper Drill
9. Kick on Side
10. 3-3-3 Breathing

### HYROX Exercises (to add)
1. SkiErg
2. Sled Push
3. Sled Pull
4. Burpee Broad Jump
5. Wall Balls
6. Farmers Carry (with handles)
7. Sandbag Lunges
8. Rowing (Concept2)
9. Box Step-ups (for scaling)
10. Roxzone Transitions

### CrossFit/Functional (to add)
1. Thrusters
2. Power Clean
3. Snatch
4. Clean & Jerk
5. Toes-to-Bar
6. Muscle-ups
7. Handstand Push-ups
8. Double Unders
9. Box Jumps
10. Kettlebell Swings
11. Turkish Get-ups
12. Assault Bike
13. Echo Bike
14. Battle Ropes
15. Med Ball Slams

---

## Appendix B: References

1. Olympiatoppen Intensity Scale 2024
2. Svenska Skidförbundet - Utvecklingsmodellen
3. CSS Calculator - MyProCoach
4. HYROX Official Rulebook 2024/25
5. Physiological_Frameworks_Algorithmic_Endurance_Training.md (internal)

---

*Document Version: 1.0*
*Created: November 2024*
*Author: Claude Code Assistant*
*Status: Draft - Awaiting Review*
