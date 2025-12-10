# Hybrid Studio Implementation Plan

## Overview

A comprehensive workout builder for CrossFit-style, HYROX, and functional fitness workouts. Sits alongside Cardio Studio and Strength Studio in the coach interface.

## Core Features

### 1. Workout Formats Supported

| Format | Description | Score Type | Example |
|--------|-------------|------------|---------|
| **AMRAP** | As Many Rounds As Possible | Rounds + Reps | 20 min: 5 Pull-ups, 10 Push-ups, 15 Squats |
| **For Time** | Complete work ASAP | Time (or Reps if DNF) | 21-15-9: Thrusters, Pull-ups |
| **EMOM** | Every Minute On the Minute | Completion + Notes | 10 min: Odd - 10 KB Swings, Even - 5 Burpees |
| **Tabata** | 20s work / 10s rest × 8 | Total Reps | Air Squats |
| **Chipper** | Long sequence, one pass | Time | 50-40-30-20-10: DU, Sit-ups, Box Jumps, Push-ups, Pull-ups |
| **Ladder** | Ascending/Descending reps | Time or Rounds | 1-2-3-4-5-6-7-8-9-10 Clean & Jerk |
| **Intervals** | Work/Rest with movements | Completion | 5×3:00 on / 1:00 off |
| **HYROX Sim** | Run + Station alternating | Total Time | 8 × (1km Run + Station) |

### 2. Scaling System

Three levels per workout:
- **Rx** - Prescribed/Competition standard
- **Scaled** - Reduced load/modified movements
- **Foundations** - Beginner-friendly version

Example (Fran):
```
Rx:         21-15-9 Thrusters (43/30kg), Pull-ups
Scaled:     21-15-9 Thrusters (30/20kg), Jumping Pull-ups
Foundations: 15-12-9 Goblet Squats, Ring Rows
```

### 3. Scoring & PR Tracking

- Time scores (mm:ss.ms)
- Rounds + Reps (e.g., "8+15")
- Load (for max effort workouts)
- PR detection and badges
- Leaderboards (optional, coach-controlled)

---

## Movement Library (200+ Movements)

### Categories & Equipment Types

```typescript
enum EquipmentType {
  BARBELL
  KETTLEBELL
  DUMBBELL
  BODYWEIGHT
  PULL_UP_BAR
  RINGS
  BOX
  ROPE
  MACHINE_ROW
  MACHINE_BIKE
  MACHINE_SKI
  WALL_BALL
  MEDICINE_BALL
  SANDBAG
  SLED
  RUNNING
  JUMP_ROPE
}

enum MovementCategory {
  OLYMPIC_LIFT      // Clean, Snatch, Jerk variations
  POWERLIFTING      // Squat, Deadlift, Bench
  GYMNASTICS        // Pull-ups, Muscle-ups, HSPU
  MONOSTRUCTURAL    // Run, Row, Bike, Ski
  KETTLEBELL        // Swings, Turkish Get-up
  STRONGMAN         // Carries, Sled work
  CORE              // Sit-ups, Toes-to-Bar
  ACCESSORY         // Lunges, Step-ups
}
```

### Movement List by Category

#### BARBELL (35 movements)
- **Olympic Lifts**: Clean, Power Clean, Hang Clean, Squat Clean, Clean & Jerk, Snatch, Power Snatch, Hang Snatch, Squat Snatch, Push Press, Push Jerk, Split Jerk
- **Squats**: Back Squat, Front Squat, Overhead Squat
- **Pulls**: Deadlift, Sumo Deadlift, Romanian Deadlift
- **Presses**: Strict Press, Bench Press, Floor Press, Behind Neck Press
- **Complexes**: Thruster, Cluster, Barbell Cycling
- **Rows**: Barbell Row, Pendlay Row
- **Other**: Good Morning, Barbell Lunge, Barbell Step-Up

#### KETTLEBELL (22 movements)
- Kettlebell Swing (Russian), Kettlebell Swing (American)
- Goblet Squat, KB Front Squat
- Turkish Get-Up (full, half)
- KB Clean, KB Snatch, KB High Pull
- KB Press, KB Push Press, KB Jerk
- KB Deadlift (single, double)
- KB Row, KB Gorilla Row
- KB Thruster
- KB Windmill, KB Halo
- KB Farmer Carry, KB Rack Carry

#### DUMBBELL (28 movements)
- DB Snatch (single arm)
- DB Clean, DB Hang Clean
- DB Thruster
- DB Deadlift
- DB Squat, DB Goblet Squat
- DB Press (strict, push)
- DB Row (single, double)
- Devil Press
- Man Maker
- DB Box Step-Over, DB Step-Up
- DB Lunge (forward, reverse, walking)
- DB Floor Press
- DB Push-Up (on DBs)
- DB Farmer Carry

#### BODYWEIGHT / GYMNASTICS (45 movements)
- **Pull-ups**: Strict Pull-Up, Kipping Pull-Up, Butterfly Pull-Up, Chest-to-Bar Pull-Up, Weighted Pull-Up
- **Muscle-ups**: Bar Muscle-Up, Ring Muscle-Up, Strict Muscle-Up
- **Toes-to-Bar**: Toes-to-Bar, Knees-to-Elbow, Hanging Knee Raise
- **Push**: Push-Up, Hand Release Push-Up, Diamond Push-Up, Clapping Push-Up
- **Dips**: Ring Dip, Bar Dip, Strict Dip
- **Handstands**: Handstand Push-Up (strict, kipping), Handstand Walk, Wall Walk, Handstand Hold
- **Squats**: Air Squat, Pistol Squat, Jumping Squat
- **Burpees**: Burpee, Burpee Box Jump Over, Burpee Pull-Up, Bar-Facing Burpee, Lateral Burpee
- **Box**: Box Jump, Box Step-Up, Box Jump Over, Seated Box Jump
- **Lunges**: Lunge, Walking Lunge, Jumping Lunge
- **Core**: Sit-Up, GHD Sit-Up, V-Up, Hollow Rock, Hollow Hold, L-Sit
- **Back**: Back Extension, GHD Hip Extension
- **Climbing**: Rope Climb (legless), Rope Climb (with legs), Peg Board
- **Jumps**: Broad Jump, Tuck Jump

#### MONOSTRUCTURAL / CARDIO (15 movements)
- **Row**: Row for Calories, Row for Meters
- **Bike**: Assault Bike/Echo Bike Calories, Bike for Calories
- **Ski**: Ski Erg Calories, Ski Erg Meters
- **Run**: Run (various distances: 100m, 200m, 400m, 800m, 1km, 1 mile)
- **Swim**: Swim (meters)
- **Jump Rope**: Single-Under, Double-Under, Triple-Under, Crossover

#### WEIGHTED OBJECTS (20 movements)
- **Wall Ball**: Wall Ball Shot, Wall Ball Clean, Wall Ball Squat
- **Medicine Ball**: Med Ball Clean, Med Ball Slam, Med Ball Sit-Up
- **Sandbag**: Sandbag Clean, Sandbag Carry, Sandbag Lunge, Sandbag Over Shoulder
- **D-Ball/Atlas Stone**: D-Ball Clean, D-Ball Over Shoulder, Atlas Stone
- **Carries**: Farmer Carry, Front Rack Carry, Overhead Carry, Yoke Carry

#### HYROX SPECIFIC (10 movements)
- Sled Push (prescribed distances/weights)
- Sled Pull (hand over hand)
- Burpee Broad Jump
- Roxzone Run (1km segments)
- Wall Ball (HYROX standard: 9kg/6kg)
- Farmer Carry (HYROX standard: 2×24kg/2×16kg)
- Sandbag Lunges (HYROX standard: 20kg/10kg)
- Ski Erg (1000m)
- Row (1000m)

---

## Benchmark Workouts

### CrossFit "The Girls" (12 workouts)
```
Fran:     21-15-9: Thrusters (43/30kg), Pull-ups
Grace:    30 Clean & Jerk (61/43kg) for time
Helen:    3 RFT: 400m Run, 21 KB Swings (24/16kg), 12 Pull-ups
Diane:    21-15-9: Deadlifts (102/70kg), Handstand Push-ups
Elizabeth: 21-15-9: Cleans (61/43kg), Ring Dips
Isabel:   30 Snatches (61/43kg) for time
Jackie:   1000m Row, 50 Thrusters (20/15kg), 30 Pull-ups
Karen:    150 Wall Balls (9/6kg) for time
Annie:    50-40-30-20-10: Double-Unders, Sit-ups
Cindy:    20 min AMRAP: 5 Pull-ups, 10 Push-ups, 15 Air Squats
Mary:     20 min AMRAP: 5 HSPU, 10 Pistols, 15 Pull-ups
Nancy:    5 RFT: 400m Run, 15 Overhead Squats (43/30kg)
```

### CrossFit Hero WODs (10 workouts)
```
Murph:    1 Mile Run, 100 Pull-ups, 200 Push-ups, 300 Squats, 1 Mile Run (20/14lb vest)
DT:       5 RFT: 12 Deadlifts (70/47kg), 9 Hang Cleans, 6 Push Jerks
Michael:  3 RFT: 800m Run, 50 Back Extensions, 50 Sit-ups
Nate:     20 min AMRAP: 2 Muscle-ups, 4 HSPU, 8 KB Swings (32/24kg)
JT:       21-15-9: HSPU, Ring Dips, Push-ups
Ryan:     5 RFT: 7 Muscle-ups, 21 Burpees
The Seven: 7 RFT: 7 HSPU, 7 Thrusters (61/43kg), 7 Knees-to-Elbow, 7 Deadlifts, 7 Burpees, 7 KB Swings, 7 Pull-ups
Badger:   3 RFT: 30 Squat Cleans (43/30kg), 30 Pull-ups, 800m Run
Arnie:    21-15-9-9-15-21: KB Swings (32/24kg), Turkish Get-ups
Luce:     3 RFT: 1000m Run, 10 Muscle-ups, 100 Air Squats
```

### CrossFit Open Standards (5 workouts)
```
Open 23.1: AMRAP 14: 60 Cal Row, 50 T2B, 40 Wall Balls, 30 C2B, 20 Strict HSPU, 10 Muscle-ups
Open 22.1: 15 min AMRAP: 3 Wall Walks, 12 DB Snatches (22.5/15kg), 15 Box Jump-Overs
Open 21.1: 1-2-3-4-5-6-7-8-9-10: Wall Walks, DB Clean & Jerks (22.5/15kg)
Open 20.1: 10 RFT: 8 Ground-to-Overhead (43/29kg), 10 Bar-Facing Burpees
Open 19.1: 15 min AMRAP: 19 Wall Balls (9/6kg), 19 Cal Row
```

### HYROX Benchmarks (8 workouts)
```
Full HYROX Sim:      8 × (1km Run + Station)
Half HYROX:          4 × (1km Run + Station)
HYROX Sprint:        8 × (500m Run + Half Station Reps)
Station Blast:       All 8 stations back-to-back (no runs)
Wall Ball Chipper:   100 Wall Balls, 80 Burpee Broad Jumps, 60 Box Jump-Overs
Sled City:           5 RFT: 50m Sled Push, 50m Sled Pull, 200m Run
Farmer's Hell:       4 RFT: 200m Farmer Carry, 20 Sandbag Lunges, 400m Run
Roxzone Repeats:     10 × 1km Run (track rest intervals)
```

### Classic AMRAPs (5 workouts)
```
Chelsea:   30 min EMOM: 5 Pull-ups, 10 Push-ups, 15 Squats
Lynne:     5 rounds max reps: Bench Press (bodyweight), Pull-ups
Fight Gone Bad: 3 rounds: 1 min each Wall Ball, SDHP, Box Jump, Push Press, Row (cal) + 1 min rest
Death by Pull-ups: EMOM add 1 rep until failure
Filthy Fifty: 50 each: Box Jumps, Jumping Pull-ups, KB Swings, Walking Lunges, Knees-to-Elbow, Push Press, Back Extensions, Wall Balls, Burpees, Double-Unders
```

---

## Database Schema

### New/Modified Models

```prisma
// Extend existing Exercise model
model Exercise {
  // ... existing fields ...

  // New hybrid workout fields
  equipment          EquipmentType?
  movementCategory   MovementCategory?
  isHybridMovement   Boolean @default(false)

  // Default workout parameters
  defaultReps        Int?
  defaultWeightMale  Float?    // kg
  defaultWeightFemale Float?   // kg
  defaultDistance    Float?    // meters
  defaultCalories    Int?
  defaultDuration    Int?      // seconds

  // Scaling relationship
  scaledVersions     Exercise[] @relation("ExerciseScaling")
  rxVersion          Exercise?  @relation("ExerciseScaling", fields: [rxVersionId], references: [id])
  rxVersionId        String?

  // Video/instruction URL
  demoVideoUrl       String?

  hybridWorkoutMovements HybridMovement[]
}

// New Hybrid Workout model
model HybridWorkout {
  id              String   @id @default(uuid())
  name            String
  description     String?

  // Workout format
  format          HybridFormat

  // Time configuration
  timeCap         Int?      // seconds (0 = no cap)
  workTime        Int?      // EMOM/Tabata work portion (seconds)
  restTime        Int?      // EMOM/Tabata rest portion (seconds)
  totalRounds     Int?      // for fixed round workouts

  // Movements in this workout
  movements       HybridMovement[]

  // Scaling
  scalingLevel    ScalingLevel @default(RX)
  rxVersionId     String?
  rxVersion       HybridWorkout? @relation("WorkoutScaling", fields: [rxVersionId], references: [id])
  scaledVersions  HybridWorkout[] @relation("WorkoutScaling")

  // Benchmark/Template info
  isBenchmark     Boolean @default(false)
  benchmarkSource String?   // "CrossFit", "HYROX", "Hero WOD", "Custom"

  // Ownership
  coachId         String?
  coach           User? @relation(fields: [coachId], references: [id])
  isPublic        Boolean @default(false)

  // Stats
  results         HybridWorkoutResult[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([coachId])
  @@index([isBenchmark])
  @@index([format])
}

// Movement within a hybrid workout
model HybridMovement {
  id              String @id @default(uuid())

  workout         HybridWorkout @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  workoutId       String

  exercise        Exercise @relation(fields: [exerciseId], references: [id])
  exerciseId      String

  // Position in workout
  order           Int
  roundNumber     Int?      // for EMOM alternating minutes

  // Movement prescription
  reps            Int?
  calories        Int?
  distance        Float?     // meters
  duration        Int?       // seconds (for holds, cardio)

  // Load
  weightMale      Float?     // kg
  weightFemale    Float?     // kg

  // Notes
  notes           String?

  @@index([workoutId])
}

// Athlete's workout result/score
model HybridWorkoutResult {
  id              String @id @default(uuid())

  workout         HybridWorkout @relation(fields: [workoutId], references: [id])
  workoutId       String

  athlete         Client @relation(fields: [athleteId], references: [id])
  athleteId       String

  // Score
  scoreType       ScoreType
  timeScore       Int?       // seconds (for time-based)
  roundsCompleted Int?       // for AMRAP
  repsCompleted   Int?       // additional reps in AMRAP, or total for Tabata
  loadUsed        Float?     // for max effort

  // Scaling used
  scalingLevel    ScalingLevel

  // Meta
  completedAt     DateTime @default(now())
  isPR            Boolean @default(false)
  notes           String?

  // Optional detailed splits
  movementSplits  Json?      // [{movementId, timeOrReps}]

  @@index([workoutId, athleteId])
  @@index([athleteId, completedAt])
  @@unique([workoutId, athleteId, completedAt])
}

// Enums
enum HybridFormat {
  AMRAP
  FOR_TIME
  EMOM
  TABATA
  CHIPPER
  LADDER
  INTERVALS
  HYROX_SIM
  CUSTOM
}

enum ScalingLevel {
  RX
  SCALED
  FOUNDATIONS
}

enum ScoreType {
  TIME
  ROUNDS_REPS
  LOAD
  CALORIES
  REPS
  COMPLETION
}

enum EquipmentType {
  BARBELL
  KETTLEBELL
  DUMBBELL
  BODYWEIGHT
  PULL_UP_BAR
  RINGS
  BOX
  ROPE
  GHD
  MACHINE_ROW
  MACHINE_BIKE
  MACHINE_SKI
  WALL_BALL
  MEDICINE_BALL
  SANDBAG
  SLED
  RUNNING
  JUMP_ROPE
  YOKE
  SWIMMING
}

enum MovementCategory {
  OLYMPIC_LIFT
  POWERLIFTING
  GYMNASTICS
  MONOSTRUCTURAL
  KETTLEBELL_WORK
  STRONGMAN
  CORE
  ACCESSORY
  HYROX_STATION
}
```

---

## UI Components

### Coach Interface

```
/coach/hybrid/
├── page.tsx                    # Hybrid Studio dashboard
├── builder/
│   └── page.tsx               # Workout builder
├── library/
│   └── page.tsx               # Movement library browser
├── benchmarks/
│   └── page.tsx               # Browse benchmark workouts
└── templates/
    └── page.tsx               # Saved templates
```

### Components Structure

```
components/coach/hybrid/
├── HybridStudioDashboard.tsx   # Main dashboard with tabs
├── builder/
│   ├── WorkoutBuilder.tsx      # Main builder orchestrator
│   ├── FormatSelector.tsx      # Choose AMRAP/ForTime/etc
│   ├── TimerSettings.tsx       # Configure time cap, work/rest
│   ├── MovementPicker.tsx      # Search and add movements
│   ├── MovementConfigurator.tsx # Set reps/weight for each
│   ├── ScalingEditor.tsx       # Define Rx/Scaled/Foundations
│   ├── WorkoutPreview.tsx      # Live preview of workout text
│   └── RepSchemeSelector.tsx   # 21-15-9, ladder patterns, etc.
├── library/
│   ├── MovementLibrary.tsx     # Browse all movements
│   ├── MovementCard.tsx        # Single movement display
│   └── MovementFilters.tsx     # Filter by equipment/category
├── benchmarks/
│   ├── BenchmarkBrowser.tsx    # Browse classics
│   ├── BenchmarkCard.tsx       # Single benchmark display
│   └── BenchmarkImporter.tsx   # Import and customize
└── shared/
    ├── HybridWorkoutCard.tsx   # Workout display card
    ├── ScoreDisplay.tsx        # Format-specific score display
    └── LeaderboardTable.tsx    # Results comparison
```

### Athlete Interface

```
components/athlete/hybrid/
├── HybridWorkoutCard.tsx       # View assigned workout
├── ScoreLogger.tsx             # Log results by format
├── PRBoard.tsx                 # Personal records display
├── WorkoutHistory.tsx          # Past results
└── ScalingSelector.tsx         # Choose scaling level
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema changes (Prisma migration)
- [ ] Extend Exercise model with hybrid fields
- [ ] Create HybridWorkout and related models
- [ ] Seed movement library (200+ movements)
- [ ] Basic API endpoints (CRUD for hybrid workouts)

### Phase 2: Movement Library (Week 2-3)
- [ ] Movement library browser component
- [ ] Filter by equipment, category
- [ ] Movement details modal with demo video
- [ ] Movement search with fuzzy matching
- [ ] Import existing 84 exercises into unified library

### Phase 3: Workout Builder (Week 3-4)
- [ ] Format selector component
- [ ] Timer settings per format
- [ ] Movement picker with drag-drop
- [ ] Rep scheme templates (21-15-9, etc.)
- [ ] Live workout preview
- [ ] Save workout (template or assign)

### Phase 4: Scaling System (Week 4)
- [ ] Scaling editor for 3 levels
- [ ] Link scaled versions
- [ ] Movement substitution suggestions
- [ ] Auto-scale weight percentages

### Phase 5: Benchmark Library (Week 5)
- [ ] Seed benchmark workouts (50+)
- [ ] Benchmark browser with search
- [ ] Import and customize benchmarks
- [ ] Category filters (Girls, Heroes, HYROX)

### Phase 6: Scoring & Results (Week 5-6)
- [ ] Score logger per format type
- [ ] PR detection algorithm
- [ ] Result history display
- [ ] Optional leaderboards

### Phase 7: Integration (Week 6)
- [ ] Add to program wizard
- [ ] Integrate with training calendar
- [ ] Athlete workout view
- [ ] Coach monitoring dashboard

---

## API Endpoints

```
# Hybrid Workouts
GET    /api/hybrid-workouts              # List workouts (with filters)
POST   /api/hybrid-workouts              # Create workout
GET    /api/hybrid-workouts/:id          # Get workout details
PUT    /api/hybrid-workouts/:id          # Update workout
DELETE /api/hybrid-workouts/:id          # Delete workout

# Movements
GET    /api/movements                     # List movements (with filters)
GET    /api/movements/:id                 # Movement details
POST   /api/movements                     # Create custom movement (coach)

# Benchmarks
GET    /api/hybrid-workouts/benchmarks   # List benchmark workouts
POST   /api/hybrid-workouts/benchmarks/:id/clone  # Clone and customize

# Results
POST   /api/hybrid-workouts/:id/results  # Log result
GET    /api/hybrid-workouts/:id/results  # Get results (leaderboard)
GET    /api/clients/:id/hybrid-results   # Athlete's PR board
```

---

## Example Workout JSON

### AMRAP Example (Cindy)
```json
{
  "name": "Cindy",
  "format": "AMRAP",
  "timeCap": 1200,
  "scalingLevel": "RX",
  "isBenchmark": true,
  "benchmarkSource": "CrossFit",
  "movements": [
    {
      "order": 1,
      "exerciseId": "pull-up-id",
      "reps": 5
    },
    {
      "order": 2,
      "exerciseId": "push-up-id",
      "reps": 10
    },
    {
      "order": 3,
      "exerciseId": "air-squat-id",
      "reps": 15
    }
  ]
}
```

### For Time Example (Fran)
```json
{
  "name": "Fran",
  "format": "FOR_TIME",
  "timeCap": 600,
  "scalingLevel": "RX",
  "isBenchmark": true,
  "benchmarkSource": "CrossFit",
  "description": "21-15-9 reps of:",
  "movements": [
    {
      "order": 1,
      "exerciseId": "thruster-id",
      "reps": 21,
      "weightMale": 43,
      "weightFemale": 30,
      "notes": "Round 1"
    },
    {
      "order": 2,
      "exerciseId": "pull-up-id",
      "reps": 21,
      "notes": "Round 1"
    },
    {
      "order": 3,
      "exerciseId": "thruster-id",
      "reps": 15,
      "weightMale": 43,
      "weightFemale": 30,
      "notes": "Round 2"
    }
    // ... continues for 15 and 9
  ]
}
```

### EMOM Example
```json
{
  "name": "KB Complex EMOM",
  "format": "EMOM",
  "timeCap": 600,
  "workTime": 60,
  "totalRounds": 10,
  "scalingLevel": "RX",
  "movements": [
    {
      "order": 1,
      "roundNumber": 1,
      "exerciseId": "kb-swing-id",
      "reps": 15,
      "notes": "Odd minutes"
    },
    {
      "order": 2,
      "roundNumber": 2,
      "exerciseId": "burpee-id",
      "reps": 10,
      "notes": "Even minutes"
    }
  ]
}
```

---

## UX Flow

### Building a Workout

1. **Select Format** → AMRAP / For Time / EMOM / etc.
2. **Configure Timer** → Time cap, work/rest intervals
3. **Add Movements** → Search, filter, drag to add
4. **Set Prescriptions** → Reps, weight, distance per movement
5. **Choose Rep Scheme** → Custom or template (21-15-9)
6. **Preview Workout** → See formatted description
7. **Create Scaling** → Rx → Scaled → Foundations
8. **Save** → As template or assign to athlete/program

### Athlete Logging a Score

1. **View Workout** → See full description
2. **Select Scaling** → Rx / Scaled / Foundations
3. **Complete Workout** → (external timer/tracking)
4. **Log Score** → Format-specific input
   - AMRAP: Rounds + Reps dropdown
   - For Time: Time picker (mm:ss)
   - EMOM: Completed (yes/no) + notes
5. **PR Check** → Automatic detection and badge
6. **Optional Notes** → Modifications, feelings

---

## Summary

This plan creates a comprehensive Hybrid Studio with:

- **8 workout formats** covering all CrossFit/HYROX styles
- **200+ movements** organized by equipment and category
- **50+ benchmark workouts** from CrossFit and HYROX
- **3-tier scaling system** (Rx/Scaled/Foundations)
- **Full scoring with PR tracking** and optional leaderboards
- **Unified exercise library** with the existing strength exercises

The builder will sit alongside Cardio Studio and Strength Studio, giving coaches complete flexibility to create any type of training program.
