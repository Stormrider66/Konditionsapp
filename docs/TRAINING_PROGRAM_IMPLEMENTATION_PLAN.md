# Training Program & Athlete Portal - Implementation Plan

## Executive Summary

Transform the konditionstest-app from a test report generator into a comprehensive coaching platform with:
- **Training program creation** with automatic base generation from test results + manual customization
- **Athlete portal** for viewing programs, logging workouts, and tracking progress
- **Multi-month periodized programs** (running, strength, plyometrics, core, recovery)
- **Structured workout details** (intervals, sets/reps, zones, instructions)
- **Full workout logging** (completion, notes, difficulty rating, data upload)
- **Built-in messaging** between coaches and athletes

---

## Phase 1: Foundation (2-3 weeks)

### 1.1 Database Schema Expansion

Add these models to `prisma/schema.prisma`:

```prisma
enum UserRole {
  ADMIN
  COACH      // Test leaders who create programs
  ATHLETE    // Test subjects who view programs
}

enum WorkoutType {
  RUNNING
  STRENGTH
  PLYOMETRIC
  CORE
  RECOVERY
  CYCLING
  SKIING
}

enum WorkoutIntensity {
  RECOVERY      // Very easy
  EASY          // Zone 1-2
  MODERATE      // Zone 3
  THRESHOLD     // Zone 4
  INTERVAL      // Zone 5
  MAX           // All-out
}

enum PeriodPhase {
  BASE          // Building aerobic base
  BUILD         // Increasing intensity
  PEAK          // Race-specific training
  TAPER         // Pre-race recovery
  RECOVERY      // Post-race recovery
  TRANSITION    // Off-season
}

// Links Client to User account (one Client can have one Athlete login)
model AthleteAccount {
  id        String   @id @default(uuid())
  clientId  String   @unique
  userId    String   @unique

  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([clientId])
  @@index([userId])
}

// Main training program
model TrainingProgram {
  id          String   @id @default(uuid())
  clientId    String
  coachId     String   // User who created it
  testId      String?  // Optional: linked to specific test results

  name        String   // "Marathon Training - Spring 2025"
  description String?  @db.Text
  goalRace    String?  // "Stockholm Marathon"
  goalDate    DateTime?

  startDate   DateTime
  endDate     DateTime

  // Metadata
  isActive    Boolean  @default(true)
  isTemplate  Boolean  @default(false) // Can be reused

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  coach       User     @relation("CoachPrograms", fields: [coachId], references: [id])
  test        Test?    @relation(fields: [testId], references: [id], onDelete: SetNull)

  weeks       TrainingWeek[]

  @@index([clientId])
  @@index([coachId])
  @@index([testId])
  @@index([startDate, endDate])
}

// Week within a program (Week 1, Week 2, etc.)
model TrainingWeek {
  id        String   @id @default(uuid())
  programId String

  weekNumber Int     // 1, 2, 3...
  startDate  DateTime

  phase      PeriodPhase
  focus      String? // "Build endurance", "Taper week"
  weeklyVolume Float? // Total planned hours/km

  notes      String? @db.Text

  program    TrainingProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  days       TrainingDay[]

  @@unique([programId, weekNumber])
  @@index([programId, startDate])
}

// Day within a week (Monday, Tuesday, etc.)
model TrainingDay {
  id      String   @id @default(uuid())
  weekId  String

  dayNumber Int    // 1=Monday, 2=Tuesday, etc.
  date      DateTime

  week     TrainingWeek @relation(fields: [weekId], references: [id], onDelete: Cascade)
  workouts Workout[]

  @@unique([weekId, dayNumber])
  @@index([weekId, date])
}

// Individual workout session
model Workout {
  id          String   @id @default(uuid())
  dayId       String

  type        WorkoutType
  name        String   // "Long Run", "Tempo Run", "Upper Body Strength"
  description String?  @db.Text

  intensity   WorkoutIntensity
  duration    Int?     // Total planned minutes
  distance    Float?   // Planned km (for running)

  // Coach instructions
  instructions String? @db.Text
  coachNotes   String? @db.Text

  // Ordering (if multiple workouts in one day)
  order       Int     @default(1)

  day         TrainingDay @relation(fields: [dayId], references: [id], onDelete: Cascade)
  segments    WorkoutSegment[]
  logs        WorkoutLog[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([dayId, order])
}

// Segments within a workout (warm-up, intervals, cool-down, exercises)
model WorkoutSegment {
  id        String   @id @default(uuid())
  workoutId String

  order     Int      // 1, 2, 3...
  type      String   // "warmup", "interval", "cooldown", "exercise", "rest"

  // Running/Cycling specific
  duration  Int?     // minutes
  distance  Float?   // km
  pace      String?  // "5:00/km" or calculated from zone
  zone      Int?     // Training zone 1-5
  heartRate String?  // "140-150 bpm" or zone-based
  power     Int?     // watts (cycling)

  // Strength/Plyo/Core specific
  exerciseId String? // FK to Exercise library
  sets       Int?
  reps       String? // "10" or "10-12" or "AMRAP"
  weight     String? // "80kg" or "BW" or "50% 1RM"
  tempo      String? // "3-1-1" (eccentric-pause-concentric)
  rest       Int?    // seconds between sets

  // General
  description String? @db.Text
  notes       String? @db.Text

  workout     Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exercise    Exercise? @relation(fields: [exerciseId], references: [id], onDelete: SetNull)

  @@index([workoutId, order])
}

// Exercise library for strength/plyo/core
model Exercise {
  id          String   @id @default(uuid())
  coachId     String?  // NULL = system exercise, else custom

  name        String   // "Back Squat", "Box Jump", "Plank"
  category    WorkoutType // STRENGTH, PLYOMETRIC, CORE
  muscleGroup String?  // "Legs", "Core", "Upper Body"

  description String?  @db.Text
  instructions String? @db.Text
  videoUrl    String?  // YouTube/Vimeo link
  equipment   String?  // "Barbell, Rack", "Box", "None"

  difficulty  String?  // "Beginner", "Intermediate", "Advanced"

  isPublic    Boolean  @default(true)

  coach       User?    @relation(fields: [coachId], references: [id], onDelete: SetNull)
  segments    WorkoutSegment[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([coachId])
  @@index([category])
  @@index([name])
}

// Athlete's completed workout log
model WorkoutLog {
  id          String   @id @default(uuid())
  workoutId   String
  athleteId   String   // User with ATHLETE role

  completed   Boolean  @default(false)
  completedAt DateTime?

  // Actual values
  duration    Int?     // actual minutes
  distance    Float?   // actual km
  avgPace     String?  // "5:15/km"
  avgHR       Int?     // bpm
  maxHR       Int?     // bpm

  // Subjective feedback
  perceivedEffort Int? // 1-10 RPE scale
  difficulty      Int? // 1-5 stars
  feeling         String? // "Good", "Tired", "Great"
  notes           String? @db.Text

  // File uploads (Garmin .fit, Strava link, etc.)
  dataFileUrl     String?
  stravaUrl       String?

  workout    Workout @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  athlete    User    @relation(fields: [athleteId], references: [id])

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([workoutId])
  @@index([athleteId])
  @@index([completedAt])
}

// Coach-Athlete messaging
model Message {
  id         String   @id @default(uuid())
  senderId   String
  receiverId String

  subject    String?
  content    String   @db.Text

  // Optional: link to specific workout
  workoutId  String?

  isRead     Boolean  @default(false)
  readAt     DateTime?

  sender     User    @relation("SentMessages", fields: [senderId], references: [id])
  receiver   User    @relation("ReceivedMessages", fields: [receiverId], references: [id])
  workout    Workout? @relation(fields: [workoutId], references: [id], onDelete: SetNull)

  createdAt  DateTime @default(now())

  @@index([senderId])
  @@index([receiverId])
  @@index([workoutId])
  @@index([createdAt])
}
```

**Schema updates to existing models**:

```prisma
model User {
  role      UserRole @default(COACH)

  // Add relations
  coachPrograms     TrainingProgram[] @relation("CoachPrograms")
  exercises         Exercise[]
  workoutLogs       WorkoutLog[]
  sentMessages      Message[]         @relation("SentMessages")
  receivedMessages  Message[]         @relation("ReceivedMessages")
  athleteAccount    AthleteAccount?
}

model Client {
  // Add relation
  trainingPrograms TrainingProgram[]
  athleteAccount   AthleteAccount?
}

model Test {
  // Add relation
  trainingPrograms TrainingProgram[]
}
```

### 1.2 Type System Updates

Add to `types/index.ts`:

```typescript
export type UserRole = 'ADMIN' | 'COACH' | 'ATHLETE'
export type WorkoutType = 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'RECOVERY' | 'CYCLING' | 'SKIING'
export type WorkoutIntensity = 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'
export type PeriodPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION'

export interface TrainingProgram {
  id: string
  clientId: string
  coachId: string
  testId?: string
  name: string
  description?: string
  goalRace?: string
  goalDate?: Date
  startDate: Date
  endDate: Date
  isActive: boolean
  isTemplate: boolean
  client?: Client
  coach?: User
  test?: Test
  weeks?: TrainingWeek[]
}

export interface TrainingWeek {
  id: string
  programId: string
  weekNumber: number
  startDate: Date
  phase: PeriodPhase
  focus?: string
  weeklyVolume?: number
  notes?: string
  days?: TrainingDay[]
}

export interface TrainingDay {
  id: string
  weekId: string
  dayNumber: number
  date: Date
  workouts?: Workout[]
}

export interface Workout {
  id: string
  dayId: string
  type: WorkoutType
  name: string
  description?: string
  intensity: WorkoutIntensity
  duration?: number
  distance?: number
  instructions?: string
  coachNotes?: string
  order: number
  segments?: WorkoutSegment[]
  logs?: WorkoutLog[]
}

export interface WorkoutSegment {
  id: string
  workoutId: string
  order: number
  type: 'warmup' | 'interval' | 'cooldown' | 'exercise' | 'rest'
  // Running/Cycling
  duration?: number
  distance?: number
  pace?: string
  zone?: number
  heartRate?: string
  power?: number
  // Strength/Plyo/Core
  exerciseId?: string
  sets?: number
  reps?: string
  weight?: string
  tempo?: string
  rest?: number
  // General
  description?: string
  notes?: string
  exercise?: Exercise
}

export interface Exercise {
  id: string
  coachId?: string
  name: string
  category: WorkoutType
  muscleGroup?: string
  description?: string
  instructions?: string
  videoUrl?: string
  equipment?: string
  difficulty?: string
  isPublic: boolean
}

export interface WorkoutLog {
  id: string
  workoutId: string
  athleteId: string
  completed: boolean
  completedAt?: Date
  duration?: number
  distance?: number
  avgPace?: string
  avgHR?: number
  maxHR?: number
  perceivedEffort?: number
  difficulty?: number
  feeling?: string
  notes?: string
  dataFileUrl?: string
  stravaUrl?: string
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  subject?: string
  content: string
  workoutId?: string
  isRead: boolean
  readAt?: Date
  sender?: User
  receiver?: User
  createdAt: Date
}

// DTOs
export interface CreateTrainingProgramDTO {
  clientId: string
  testId?: string
  name: string
  description?: string
  goalRace?: string
  goalDate?: string
  startDate: string
  endDate: string
}

export interface CreateWorkoutDTO {
  type: WorkoutType
  name: string
  description?: string
  intensity: WorkoutIntensity
  duration?: number
  distance?: number
  instructions?: string
  segments: CreateWorkoutSegmentDTO[]
}

export interface CreateWorkoutSegmentDTO {
  order: number
  type: 'warmup' | 'interval' | 'cooldown' | 'exercise' | 'rest'
  duration?: number
  distance?: number
  zone?: number
  exerciseId?: string
  sets?: number
  reps?: string
  weight?: string
  tempo?: string
  rest?: number
  description?: string
}

export interface WorkoutLogDTO {
  workoutId: string
  completed: boolean
  completedAt?: string
  duration?: number
  distance?: number
  avgPace?: string
  avgHR?: number
  maxHR?: number
  perceivedEffort?: number
  difficulty?: number
  feeling?: string
  notes?: string
}
```

### 1.3 Authentication & Authorization Updates

**Update `middleware.ts`**:
- Add role-based route protection
- `/athlete/*` routes require ATHLETE role
- `/coach/*` routes require COACH role
- `/admin/*` routes require ADMIN role

**Create `lib/auth-utils.ts`**:
```typescript
export async function getCurrentUser(): Promise<User | null>
export async function requireRole(role: UserRole): Promise<User>
export async function canAccessProgram(userId: string, programId: string): Promise<boolean>
export async function canAccessWorkout(userId: string, workoutId: string): Promise<boolean>
```

### 1.4 Athlete Account Creation

**Create `/app/api/athlete-accounts/route.ts`**:
- POST: Create athlete account linked to client
- GET: Get athlete account for client

**Flow**:
1. Coach creates Client (already exists)
2. Coach clicks "Create Athlete Account" for client
3. System creates User with role=ATHLETE
4. Creates AthleteAccount linking Client ↔ User
5. Send invitation email with temporary password
6. Athlete logs in, sets permanent password

---

## Phase 2: Program Generation Engine (2 weeks)

### 2.1 Program Generator Algorithm

**Create `lib/program-generator/index.ts`**:

```typescript
export interface ProgramGenerationParams {
  clientId: string
  testId: string
  goalDate: Date
  goalRace: string // "marathon", "half-marathon", "10k", "5k"
  currentWeeklyVolume: number // hours or km
  peakWeeklyVolume: number // target max volume
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  trainingDaysPerWeek: number
  includeStrength: boolean
  includePlyometrics: boolean
  includeCore: boolean
}

export async function generateBaseProgram(
  params: ProgramGenerationParams
): Promise<TrainingProgram>
```

**Algorithm flow**:
1. Load test results (zones, thresholds, VO2max)
2. Calculate program duration (weeks from today to goal date)
3. Apply periodization model:
   - Base phase (50-60% of program): Build aerobic foundation
   - Build phase (25-30%): Increase intensity and volume
   - Peak phase (10-15%): Race-specific training
   - Taper phase (5-10%): Reduce volume, maintain intensity
4. Generate weekly structure:
   - Long run (progressive increase)
   - Tempo/threshold run (Zone 4)
   - Interval workout (Zone 5)
   - Easy runs (Zone 1-2)
   - Strength sessions (2-3x/week)
   - Recovery days
5. Populate workout segments with zone-based paces
6. Add strength exercises from library

**Create `lib/program-generator/periodization.ts`**:
```typescript
export function calculatePhases(totalWeeks: number): {
  base: number
  build: number
  peak: number
  taper: number
}

export function calculateWeeklyVolume(
  weekNumber: number,
  phase: PeriodPhase,
  baseVolume: number,
  peakVolume: number
): number
```

**Create `lib/program-generator/workout-builder.ts`**:
```typescript
export function buildLongRun(week: number, distance: number, zones: TrainingZone[]): Workout
export function buildTempoRun(thresholdPace: string, duration: number): Workout
export function buildIntervalWorkout(zones: TrainingZone[], intervalType: string): Workout
export function buildStrengthWorkout(phase: PeriodPhase, focus: string): Workout
```

### 2.2 Template Library

**Create `lib/program-generator/templates/`**:
- `marathon-beginner.ts`
- `marathon-intermediate.ts`
- `marathon-advanced.ts`
- `half-marathon.ts`
- `strength-base.ts`
- `strength-maintenance.ts`
- `plyometrics-library.ts`
- `core-routines.ts`

Each template exports:
```typescript
export const marathonBeginnerTemplate: ProgramTemplate = {
  name: "Marathon - Beginner",
  duration: 16, // weeks
  weeklyStructure: {
    runDays: 4,
    strengthDays: 2,
    restDays: 1
  },
  weeklyProgression: {
    longRunIncrement: 1.5, // km per week
    totalVolumeIncrement: 5 // km per week
  },
  workoutTypes: {
    longRun: { frequency: 1, intensityZone: 2 },
    tempoRun: { frequency: 1, intensityZone: 4 },
    easyRun: { frequency: 2, intensityZone: 2 },
    strength: { frequency: 2 }
  }
}
```

### 2.3 Exercise Library Seeding

**Create `prisma/seed-exercises.ts`**:

Populate database with ~50 standard exercises:

**Strength** (20 exercises):
- Lower body: Back squat, front squat, deadlift, lunges, step-ups, box jumps
- Upper body: Bench press, rows, pull-ups, shoulder press
- Olympic: Clean, snatch, clean pulls

**Plyometrics** (15 exercises):
- Box jumps, depth jumps, broad jumps, single-leg hops, hurdle hops
- Medicine ball throws, bounding

**Core** (15 exercises):
- Plank variations, dead bug, bird dog, pallof press, Russian twists
- Leg raises, bicycle crunches, mountain climbers

Each with:
- Clear instructions
- Video links (YouTube)
- Equipment needed
- Difficulty level
- Sets/reps recommendations

---

## Phase 3: Coach Interface - Program Builder (3 weeks)

### 3.1 Program Creation Wizard

**Create `/app/coach/programs/new/page.tsx`**:

**Step 1: Program Setup**
- Client selection
- Test selection (dropdown of their tests)
- Goal race type (marathon, half, 10k, etc.)
- Goal date picker
- Program name

**Step 2: Generation Parameters**
- Current weekly volume (auto-suggest from recent activity?)
- Target peak volume
- Experience level dropdown
- Training days per week (4-7)
- Checkboxes: Include strength, plyometrics, core

**Step 3: Review Generated Program**
- Calendar view of entire program
- Week-by-week breakdown
- Workout summaries
- Phase indicators

**Step 4: Customize**
- Edit weeks/workouts before finalizing
- Drag-and-drop to reorganize
- Add/remove workouts
- Adjust volumes

**Create `/app/api/programs/generate/route.ts`**:
```typescript
POST /api/programs/generate
Body: ProgramGenerationParams
Response: { program: TrainingProgram }
```

### 3.2 Program Calendar View

**Create `/app/coach/programs/[id]/page.tsx`**:

Main program management interface:
- **Monthly calendar view** showing all workouts
- Color-coded by workout type
- Week numbers and phase labels
- Click workout to edit
- Drag-and-drop to move workouts
- Right-click context menu (copy, delete, duplicate)

**Components**:
- `<ProgramCalendar />` - Main calendar grid
- `<WorkoutCard />` - Individual workout in calendar
- `<WeekSummary />` - Sidebar showing weekly totals
- `<PhaseIndicator />` - Visual phase timeline

### 3.3 Workout Builder

**Create `components/coach/WorkoutBuilder.tsx`**:

Modal/drawer for creating/editing workouts:

**For Running workouts**:
1. **Header**: Name, type, intensity, total duration/distance
2. **Segment builder**:
   - Add warm-up (duration, zone, auto-calculate pace)
   - Add intervals (repeat count, work duration, rest duration, zone)
   - Add cool-down
   - Preview: Total time, distance, avg pace
3. **Instructions**: Rich text editor for coach notes

**For Strength workouts**:
1. **Header**: Name, focus (upper/lower/full body)
2. **Exercise selector**: Search exercise library
3. **For each exercise**:
   - Sets, reps, weight prescription (%, 1RM, BW)
   - Tempo (3-1-1)
   - Rest between sets
   - Notes
4. **Superset grouping**: Drag exercises together
5. **Preview**: Total estimated time

**Create `components/coach/SegmentBuilder.tsx`**:
- Reusable component for adding workout segments
- Pre-built segment templates (warm-up presets, common intervals)
- Zone calculator: "Zone 2 @ 8 km/h = 7:30/km"

### 3.4 Quick Actions & Templates

**Create `/app/coach/templates/page.tsx`**:
- Library of workout templates
- "Standard Long Run", "Threshold Intervals", "Full Body Strength"
- Create custom templates
- Drag template into program calendar

**Bulk operations**:
- Copy entire week and paste to another week
- Apply workout to multiple weeks
- Bulk adjust intensities (e.g., "increase all Z2 runs by 10%")

---

## Phase 4: Athlete Portal (2-3 weeks)

### 4.1 Athlete Dashboard

**Create `/app/athlete/dashboard/page.tsx`**:

**Today's Workouts Section**:
- Cards for each workout scheduled today
- Status: Not started, In progress, Completed
- Quick view: Type, duration, key segments
- "Start Workout" button → opens workout detail
- "Mark Complete" quick button

**Upcoming Week Preview**:
- Mini calendar showing next 7 days
- Workout type indicators
- Total weekly volume

**Recent Activity**:
- Last 5 completed workouts
- Completion percentage
- Recent feedback/RPE

**Progress Widgets**:
- Weekly volume trend (line chart)
- Completion rate (this week/month)
- Recent test results

**Messages**:
- Unread message count
- Latest message from coach

### 4.2 Athlete Calendar

**Create `/app/athlete/calendar/page.tsx`**:

- Month view of training program
- Week view with daily details
- Color-coded by workout type
- Click workout to view details
- Completed workouts have checkmark badge
- Missed workouts have alert indicator

### 4.3 Workout Detail & Logging

**Create `/app/athlete/workouts/[id]/page.tsx`**:

**Pre-Workout View**:

**Header**:
- Workout name, type, date
- Estimated duration, distance
- Coach instructions (highlighted)

**Segments Table**:
- Running: Warm-up 10 min Zone 2 (7:30/km, 135-145 bpm)
- Running: 5 × (4 min Zone 4 + 2 min rest)
- Running: Cool-down 10 min Zone 1
- Collapsible "Show Details" for each segment

**Strength**: Exercise list with sets/reps/weight/tempo

**Actions**:
- "Start Workout" button (starts timer?)
- "Mark Complete" button → opens logging form
- "Unable to Complete" → prompts for reason

**Post-Workout Logging Form**:

**Actual Data**:
- Duration (auto-filled if timer used)
- Distance
- Avg pace (auto-calculated or manual)
- Avg HR / Max HR

**Subjective Feedback**:
- RPE slider (1-10)
- Difficulty rating (1-5 stars)
- Feeling dropdown (Great, Good, Okay, Tired, Struggled)
- Notes textarea

**File Upload** (optional):
- Drag-drop .fit file (Garmin/Wahoo)
- Strava activity link
- Parse file → auto-fill actual data

**Create `lib/workout-file-parser.ts`**:
```typescript
export async function parseFitFile(file: File): Promise<WorkoutData>
export async function parseStravaActivity(url: string): Promise<WorkoutData>
```

**Create `/app/api/workouts/[id]/log/route.ts`**:
```typescript
POST /api/workouts/[id]/log
Body: WorkoutLogDTO
Response: { log: WorkoutLog }
```

### 4.4 Test Results View

**Create `/app/athlete/tests/page.tsx`**:

- List of all their tests (chronological)
- Click test → view full report (ReportTemplate component)
- Compare tests side-by-side
- Download PDF

### 4.5 Profile & Settings

**Create `/app/athlete/settings/page.tsx`**:

- Personal info (read-only, managed by coach)
- Change password
- Notification preferences
- Connect Strava/Garmin accounts (future)

---

## Phase 5: Communication System (1-2 weeks)

### 5.1 Messaging Interface

**Create `/app/coach/messages/page.tsx` and `/app/athlete/messages/page.tsx`**:

**Inbox/Conversation List**:
- List of message threads
- Unread indicator
- Last message preview
- Filter: All, Unread, Workout-related

**Conversation View**:
- Message thread
- Reply box
- Link to workout if applicable

**Create `/app/api/messages/route.ts`**:
```typescript
GET /api/messages - Get user's messages
POST /api/messages - Send new message
PATCH /api/messages/[id]/read - Mark as read
```

### 5.2 Workout Comments

**Add to workout detail page**:
- Comments section below workout
- Coach can leave notes before/after
- Athlete can ask questions
- Threaded conversation

**Create `components/shared/WorkoutComments.tsx`**:
- Comment list
- Reply functionality
- Real-time updates (or refresh on interval)

### 5.3 Notifications

**Create `lib/notifications/index.ts`**:

Trigger notifications for:
- New message from coach
- Workout day reminders (morning of)
- Program updates (coach edited workout)
- Coach feedback on logged workout
- Upcoming race reminder (1 week out)

**Implementation options**:
1. **In-app**: Notification bell icon, dropdown list
2. **Email**: Send via Resend API
3. **Push**: Web Push API (future, advanced)

**Create `app/api/notifications/route.ts`**:
```typescript
GET /api/notifications - Get user's notifications
PATCH /api/notifications/[id]/read - Mark as read
```

---

## Phase 6: Analytics & Progress Tracking (1-2 weeks)

### 6.1 Athlete Progress Dashboard

**Create `/app/athlete/progress/page.tsx`**:

**Training Load Chart**:
- Weekly volume over time (line chart)
- Planned vs actual comparison
- Phase indicators

**Completion Rate**:
- Percentage of workouts completed
- Breakdown by workout type
- Month-by-month comparison

**Performance Trends**:
- Avg HR trend for Zone 2 runs (should decrease over time)
- Avg pace trend for Zone 2 runs (should increase)
- RPE trend (should decrease for same workouts)

**Recent Tests**:
- Timeline of test results
- Key metrics comparison (VO2max, thresholds)
- Visual improvement indicators

### 6.2 Coach Analytics

**Create `/app/coach/clients/[id]/analytics/page.tsx`**:

**Program Adherence**:
- Completion percentage
- Most missed workout types
- Consistency score

**Training Load Analysis**:
- Planned vs actual volume
- Acute:Chronic Workload Ratio (ACWR) - injury risk indicator
- Training stress balance

**Performance Indicators**:
- Pace/HR improvements
- RPE trends
- Workout difficulty ratings

**Export Data**:
- CSV export of all workout logs
- Generate progress report PDF

### 6.3 Comparative Analytics

**Create `lib/analytics/calculations.ts`**:
```typescript
export function calculateACWR(logs: WorkoutLog[]): number
export function calculateTrainingLoad(logs: WorkoutLog[]): number
export function detectAnomalies(logs: WorkoutLog[]): Alert[]
export function predictFitnessLevel(tests: Test[], logs: WorkoutLog[]): Prediction
```

---

## Phase 7: Advanced Features (Optional, 1-2 weeks each)

### 7.1 Program Adjustments & Auto-Adaptation

**Dynamic program updates**:
- If athlete misses workouts → suggest makeup workouts
- If athlete consistently underperforming → reduce volume
- If athlete exceeding expectations → adjust up

**Create `lib/program-adjuster/index.ts`**:
```typescript
export function suggestProgramAdjustments(
  program: TrainingProgram,
  recentLogs: WorkoutLog[]
): Adjustment[]
```

### 7.2 Race Day Features

**Create `/app/athlete/race/[programId]/page.tsx`**:

**Pre-Race Checklist**:
- Taper week reminders
- Nutrition tips
- Packing list
- Weather forecast

**Race Day Page**:
- Goal times based on training
- Pacing strategy (split calculator)
- Countdown timer

**Post-Race**:
- Log race result
- Compare to goal
- Recovery protocol
- Schedule new test

### 7.3 Integrations

**Strava Integration**:
- OAuth connection
- Auto-import completed workouts
- Auto-log from Strava activities
- Sync training calendar to Strava

**Garmin Connect**:
- Import .fit files
- Send workouts to Garmin watch
- Auto-sync completed activities

**Create `/app/api/integrations/strava/` and `/garmin/`**:
- OAuth callback handlers
- Webhook receivers
- Sync endpoints

### 7.4 Team/Group Features

**Multi-athlete program management**:
- Apply same program to team
- Group workouts
- Team leaderboards (optional)
- Team messages/announcements

**Create `/app/coach/teams/[id]/program/page.tsx`**:
- Manage program for entire team
- Individual adjustments per athlete
- Team-wide analytics

---

## Implementation Priorities & Timeline

### Phase 1: Foundation (2-3 weeks) - MUST HAVE
- Database schema
- Authentication updates
- Athlete account creation
✅ **Deliverable**: Athletes can create accounts and log in

### Phase 2: Program Generation (2 weeks) - MUST HAVE
- Algorithm for base program generation
- Exercise library seeding
- Template library
✅ **Deliverable**: Generate basic program from test results

### Phase 3: Coach Builder (3 weeks) - MUST HAVE
- Program creation wizard
- Calendar view
- Workout builder
- Edit/customize programs
✅ **Deliverable**: Coach can create and customize programs

### Phase 4: Athlete Portal (2-3 weeks) - MUST HAVE
- Athlete dashboard
- Calendar view
- Workout detail
- Workout logging
- Test results view
✅ **Deliverable**: Athletes can view and log workouts

### Phase 5: Communication (1-2 weeks) - SHOULD HAVE
- Messaging system
- Workout comments
- Notifications
✅ **Deliverable**: Coach and athlete can communicate

### Phase 6: Analytics (1-2 weeks) - SHOULD HAVE
- Progress tracking
- Coach analytics
- Performance trends
✅ **Deliverable**: Both can see training progress

### Phase 7: Advanced (2-4 weeks) - NICE TO HAVE
- Auto-adaptation
- Race features
- Integrations
- Team features

**Total Estimated Timeline**: 11-15 weeks for Phases 1-6 (core features)

---

## Technical Considerations

### Database Performance

**Indexes needed** (add to schema):
- `@@index([clientId, startDate])` on TrainingProgram
- `@@index([dayId, order])` on Workout
- `@@index([athleteId, completedAt])` on WorkoutLog
- `@@index([startDate, endDate])` on TrainingProgram (for finding active programs)

**Query optimization**:
- Use `include` to eager-load relations (avoid N+1)
- Paginate workout logs (don't load all at once)
- Cache training zones calculations

### Data Migration

**Migration strategy**:
1. Run `npx prisma migrate dev` to create new tables
2. Existing Users: Default role='COACH'
3. No data loss (additive changes only)
4. Create athlete accounts manually for existing clients

### Security

**Access control checks**:
- Athletes can only access their own data
- Coaches can access their clients' data
- Admin can access all data
- Use RLS policies or application-level checks

**Middleware protection**:
```typescript
// middleware.ts
if (pathname.startsWith('/athlete')) {
  if (user.role !== 'ATHLETE') redirect('/coach')
}
if (pathname.startsWith('/coach')) {
  if (user.role !== 'COACH' && user.role !== 'ADMIN') redirect('/athlete')
}
```

### File Upload Strategy

**Workout data files**:
- Store in Supabase Storage or S3
- Max file size: 10 MB
- Allowed types: .fit, .gpx, .tcx
- Parse on upload, extract summary data
- Delete file after parsing (keep summary only)

### Real-time Updates (Optional)

**Supabase Realtime**:
- Subscribe to message inserts
- Subscribe to workout log updates
- Live notification badges

**Implementation**:
```typescript
const subscription = supabase
  .channel('messages')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'Message' },
    (payload) => {
      if (payload.new.receiverId === userId) {
        // Show notification
      }
    }
  )
  .subscribe()
```

---

## UI/UX Design Guidelines

### Coach Interface

**Design philosophy**: Power user, data-dense, efficiency-focused
- Calendar as primary navigation
- Keyboard shortcuts (copy/paste workouts)
- Bulk operations
- Multi-select
- Drag-and-drop

**Color scheme**:
- Phase colors: Base=blue, Build=orange, Peak=red, Taper=green
- Workout type colors: Running=blue, Strength=purple, Core=yellow, Recovery=gray
- Intensity: Recovery=green, Easy=light blue, Moderate=yellow, Threshold=orange, Interval=red, Max=dark red

### Athlete Interface

**Design philosophy**: Simple, motivating, mobile-first
- Large touch targets
- Minimal clicks to log workout
- Visual progress indicators
- Encouraging language
- Clean, uncluttered

**Mobile considerations**:
- Responsive calendar (switches to list view on mobile)
- Thumb-friendly buttons
- Offline support (cache workouts, sync later)
- Native app feel (PWA)

### Shared Components

**Use existing shadcn/ui components**:
- Calendar → build custom with shadcn primitives
- Forms → existing form components
- Dialogs, dropdowns, tooltips
- Charts → Recharts (already used)

**New components needed**:
- `<WorkoutCard />`
- `<ProgramCalendar />`
- `<WorkoutSegmentList />`
- `<ExerciseSelector />`
- `<WorkoutLogger />`
- `<MessageThread />`

---

## Testing Strategy

### Unit Tests

**Core calculation functions**:
- `generateBaseProgram()` - verify periodization logic
- `calculateWeeklyVolume()` - verify progressive overload
- `buildIntervalWorkout()` - verify segment generation
- Zone/pace calculations

### Integration Tests

**API endpoints**:
- Create program → verify database structure
- Generate program → verify all segments created
- Log workout → verify calculations
- Send message → verify delivery

### E2E Tests (Playwright)

**Critical user flows**:
1. Coach creates program for client
2. Coach customizes workout
3. Athlete logs in and views program
4. Athlete logs workout
5. Coach views athlete progress
6. Coach sends message to athlete

---

## Questions for You

Before starting implementation, please confirm:

1. **Program Duration**: Most marathon programs are 12-20 weeks. Should we support longer programs (e.g., year-round training)? This affects database design (potentially need "Season" or "Macrocycle" level above Program).

2. **Workout Logging Enforcement**: Should athletes be able to log workouts in advance, or only mark as complete after the scheduled date? Should they be able to log workouts not in their program?

3. **Program Visibility**: When should athletes see future workouts? All at once, or week-by-week (unlock next week after current week is complete)?

4. **Payment/Access Control**: Will this be a paid feature? Do you need subscription management, trial periods, or limit program features by plan tier?

5. **Multi-Language**: Swedish and English? This affects UI text, workout instructions, exercise names.

6. **Mobile Apps**: Is a native mobile app (iOS/Android) a future goal? This affects whether we should build a separate API or use Next.js API routes.

7. **Coach-Athlete Ratio**: Will one coach manage 5 athletes? 50? 500? This affects performance optimization priorities.

8. **Program Templates**: Should the system ship with pre-built programs (e.g., "Couch to 5K", "Sub-3 Marathon"), or just generation tools?

---

## Next Steps

1. **Review this plan** and provide feedback
2. **Answer clarifying questions** above
3. **Prioritize phases** - confirm if Phase 1-6 is correct priority
4. **Start Phase 1**: Database schema migration
5. **Set up development workflow**: Feature branches, PR reviews, staging environment

---

## Success Metrics

How we'll measure success:

- **Coach efficiency**: Time to create program <10 minutes
- **Athlete engagement**: >80% workout completion rate
- **Communication**: <2 hour response time on messages
- **Retention**: Athletes stay on programs for full duration
- **Performance**: Page load <2 seconds, no timeouts
- **Satisfaction**: Positive feedback from both coaches and athletes

---

This is a comprehensive, production-ready plan. Let me know your thoughts and we can start building!
