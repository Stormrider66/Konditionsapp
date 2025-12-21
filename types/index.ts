// types/index.ts

// Bas-typer
export type Gender = 'MALE' | 'FEMALE'
export type TestType = 'RUNNING' | 'CYCLING' | 'SKIING'
export type TestStatus = 'DRAFT' | 'COMPLETED' | 'ARCHIVED'
export type InclineUnit = 'PERCENT' | 'DEGREES'
export type UserRole = 'ADMIN' | 'COACH' | 'ATHLETE'
export type WorkoutType = 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'RECOVERY' | 'CYCLING' | 'SKIING' | 'SWIMMING' | 'HYROX' | 'TRIATHLON' | 'ALTERNATIVE' | 'OTHER'
export type WorkoutIntensity = 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'
export type PeriodPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION'
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL'

export interface Team {
  id: string
  userId: string
  name: string
  description?: string
  members?: Client[]
  createdAt: Date
  updatedAt: Date
}

export interface Client {
  id: string
  userId: string
  teamId?: string | null
  name: string
  email?: string
  phone?: string
  gender: Gender
  birthDate: Date
  height: number // cm
  weight: number // kg
  notes?: string
  team?: Team | null
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  language: string
  createdAt: Date
  updatedAt: Date
}

// Test-typer
export interface Test {
  id: string
  clientId: string
  userId: string
  testDate: Date
  testType: TestType
  status: TestStatus
  location?: string
  testLeader?: string
  inclineUnit?: InclineUnit
  maxHR?: number
  maxLactate?: number
  vo2max?: number
  aerobicThreshold?: Threshold
  anaerobicThreshold?: Threshold
  trainingZones?: TrainingZone[]
  notes?: string
  client?: Client
  user?: User
  testStages: TestStage[]
}

export interface TestStage {
  id: string
  testId: string
  sequence: number
  duration: number // minuter
  heartRate: number
  lactate: number
  vo2?: number
  // Löpning
  speed?: number // km/h
  incline?: number // %
  // Cykling
  power?: number // watt
  cadence?: number // rpm
  // Skidåkning (Cross-country skiing)
  pace?: number // min/km
  // Beräknade
  economy?: number // ml/kg/km
  wattsPerKg?: number // watt/kg
}

// Tröskel-typer
export interface Threshold {
  heartRate: number
  value: number // hastighet, watt eller pace
  unit: 'km/h' | 'watt' | 'min/km'
  lactate?: number
  percentOfMax: number
}

// Träningszon-typer
export interface TrainingZone {
  zone: number // 1-5
  name: string // "Mycket lätt", "Lätt", etc
  intensity: string
  hrMin: number
  hrMax: number
  percentMin: number
  percentMax: number
  // Löpning
  speedMin?: number
  speedMax?: number
  // Cykling
  powerMin?: number
  powerMax?: number
  // Skidåkning (Cross-country skiing)
  paceMin?: number // min/km
  paceMax?: number // min/km
  effect: string // "Återhämtning", "Grundkondition", etc
}

// D-max visualization data (always calculated when possible, regardless of threshold method used)
export interface DmaxVisualization {
  intensity: number
  lactate: number
  heartRate: number
  r2: number
  confidence: string
  coefficients: { a: number; b: number; c: number; d: number }
  unit: 'km/h' | 'watt' | 'min/km'
}

// Beräkningsresultat
export interface TestCalculations {
  bmi: number
  aerobicThreshold: Threshold | null
  anaerobicThreshold: Threshold | null
  trainingZones: TrainingZone[]
  vo2max: number
  maxHR: number
  maxLactate: number
  economyData?: EconomyData[]
  cyclingData?: CyclingData
  dmaxVisualization?: DmaxVisualization | null  // Always stored for chart display
}

export interface EconomyData {
  speed?: number
  power?: number
  vo2: number
  economy: number // ml/kg/km för löpning
  efficiency: 'Utmärkt' | 'Mycket god' | 'God' | 'Acceptabel' | 'Behöver förbättring'
}

// Cykel-specifika typer
export interface PowerZone {
  zone: number // 1-7
  name: string // "Active Recovery", "Endurance", etc
  percentMin: number
  percentMax: number
  powerMin: number
  powerMax: number
  description: string
}

export interface CyclingData {
  ftp: number // Functional Threshold Power (watt)
  wattsPerKg: number // Genomsnittlig watt/kg
  powerZones: PowerZone[]
  evaluation: string // Bedömning av cykelkraft
}

// Form DTOs
export interface CreateClientDTO {
  name: string
  email?: string
  phone?: string
  gender: Gender
  birthDate: string
  height: number
  weight: number
  teamId?: string | null
  notes?: string
}

export interface CreateTeamDTO {
  name: string
  description?: string
}

export interface CreateTestDTO {
  clientId: string
  testDate: string
  testType: TestType
  location?: string
  testLeader?: string
  stages: CreateTestStageDTO[]
  notes?: string
}

export interface CreateTestStageDTO {
  duration: number
  heartRate: number
  lactate: number
  vo2?: number
  speed?: number
  incline?: number
  power?: number
  cadence?: number
  pace?: number
}

// Rapport-typer
export interface Report {
  id: string
  testId: string
  htmlContent: string
  pdfUrl?: string
  generatedAt: Date
  generatedBy: string
  customNotes?: string
  recommendations?: string
}

export interface ReportData {
  client: Client
  test: Test
  calculations: TestCalculations
  testLeader: string
  organization: string
  reportDate: Date
}

// Test Template typer
export interface TestTemplate {
  id: string
  userId: string
  name: string
  testType: TestType
  description?: string
  stages: CreateTestStageDTO[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateTestTemplateDTO {
  name: string
  testType: TestType
  description?: string
  stages: CreateTestStageDTO[]
}

// ==================== SUBSCRIPTION & BILLING ====================

export interface Subscription {
  id: string
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  maxAthletes: number
  currentAthletes: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  stripeCurrentPeriodEnd?: Date
  trialEndsAt?: Date
  cancelAt?: Date
  createdAt: Date
  updatedAt: Date
}

// ==================== ATHLETE ACCOUNTS ====================

export interface AthleteAccount {
  id: string
  clientId: string
  userId: string
  notificationPrefs?: {
    email: boolean
    push: boolean
    workoutReminders: boolean
  }
  createdAt: Date
  updatedAt: Date
  client?: Client
  user?: User
}

export interface CreateAthleteAccountDTO {
  clientId: string
  email: string
  temporaryPassword?: string
  notificationPrefs?: {
    email: boolean
    push: boolean
    workoutReminders: boolean
  }
}

// ==================== TRAINING PROGRAMS ====================

export interface TrainingProgram {
  id: string
  clientId: string
  coachId: string
  testId?: string
  name: string
  description?: string
  goalRace?: string
  goalDate?: Date
  goalType?: string
  startDate: Date
  endDate: Date
  isActive: boolean
  isTemplate: boolean
  generatedFromTest: boolean
  createdAt: Date
  updatedAt: Date
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
  endDate: Date
  phase: PeriodPhase
  focus?: string
  weeklyVolume?: number
  notes?: string
  program?: TrainingProgram
  days?: TrainingDay[]
}

export interface TrainingDay {
  id: string
  weekId: string
  dayNumber: number
  date: Date
  notes?: string
  week?: TrainingWeek
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
  isCustom: boolean
  day?: TrainingDay
  segments?: WorkoutSegment[]
  logs?: WorkoutLog[]
  createdAt: Date
  updatedAt: Date
}

export interface WorkoutSegment {
  id: string
  workoutId: string
  order: number
  type: 'warmup' | 'interval' | 'cooldown' | 'exercise' | 'rest' | 'work'
  // Running/Cycling
  duration?: number
  distance?: number
  pace?: string
  zone?: number
  heartRate?: string
  power?: number
  reps?: number
  // Strength/Plyo/Core
  exerciseId?: string
  sets?: number
  repsCount?: string
  weight?: string
  tempo?: string
  rest?: number
  // General
  description?: string
  notes?: string
  workout?: Workout
  exercise?: Exercise
  createdAt: Date
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
  nameSv?: string
  nameEn?: string
  coach?: User
  createdAt: Date
  updatedAt: Date
}

export interface WorkoutLog {
  id: string
  workoutId: string
  athleteId: string
  completed: boolean
  completedAt?: Date
  // Actual values
  duration?: number
  distance?: number
  avgPace?: string
  avgHR?: number
  maxHR?: number
  // Subjective feedback
  perceivedEffort?: number
  difficulty?: number
  feeling?: string
  notes?: string
  dataFileUrl?: string
  stravaUrl?: string
  coachFeedback?: string
  coachViewedAt?: Date
  workout?: Workout
  athlete?: User
  createdAt: Date
  updatedAt: Date
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
  workout?: Workout
  createdAt: Date
}

// ==================== DTOs for Training Programs ====================

export interface CreateTrainingProgramDTO {
  clientId: string
  coachId: string
  testId?: string
  name: string
  description?: string
  goalType?: string
  startDate: Date
  endDate: Date
  notes?: string
  weeks?: CreateTrainingWeekDTO[]
}

export interface CreateTrainingWeekDTO {
  weekNumber: number
  startDate?: Date
  phase: PeriodPhase
  volume: number
  focus?: string
  days: CreateTrainingDayDTO[]
}

export interface CreateTrainingDayDTO {
  dayNumber: number
  notes?: string
  workouts: CreateWorkoutDTO[]
}

// ProgramGenerationParams is now defined in @/lib/program-generator/index.ts
// Import from there to use the correct interface

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
  type: 'warmup' | 'interval' | 'cooldown' | 'exercise' | 'rest' | 'work'
  duration?: number
  distance?: number
  pace?: string
  zone?: number
  heartRate?: string
  power?: number
  reps?: number
  exerciseId?: string
  sets?: number
  repsCount?: string
  weight?: string
  tempo?: string
  rest?: number
  description?: string
  notes?: string
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

export interface CreateExerciseDTO {
  name: string
  category: WorkoutType
  muscleGroup?: string
  description?: string
  instructions?: string
  videoUrl?: string
  equipment?: string
  difficulty?: string
  nameSv?: string
  nameEn?: string
}

export interface CreateMessageDTO {
  receiverId: string
  subject?: string
  content: string
  workoutId?: string
}

// ==================== Hybrid Workout Section Types ====================

export type HybridFormat = 'AMRAP' | 'FOR_TIME' | 'EMOM' | 'TABATA' | 'CHIPPER' | 'LADDER' | 'INTERVALS' | 'HYROX_SIM' | 'CUSTOM'
export type ScalingLevel = 'RX' | 'SCALED' | 'FOUNDATIONS' | 'CUSTOM'
export type HybridSectionType = 'WARMUP' | 'STRENGTH' | 'METCON' | 'COOLDOWN'

export interface HybridSectionMovement {
  exerciseId: string
  exerciseName: string
  order: number
  sets?: number
  reps?: number
  duration?: number  // seconds
  distance?: number  // meters
  weightMale?: number
  weightFemale?: number
  restSeconds?: number
  notes?: string
}

export interface HybridSectionData {
  notes?: string
  duration?: number  // expected section duration in seconds
  movements?: HybridSectionMovement[]
}

export interface HybridWorkoutWithSections {
  id: string
  name: string
  description?: string
  format: HybridFormat
  timeCap?: number
  workTime?: number
  restTime?: number
  totalRounds?: number
  totalMinutes?: number
  repScheme?: string
  scalingLevel: ScalingLevel
  isBenchmark: boolean
  benchmarkSource?: string
  tags: string[]
  coachId?: string
  isPublic: boolean
  // Section data
  warmupData?: HybridSectionData
  strengthData?: HybridSectionData
  cooldownData?: HybridSectionData
  // Metcon movements (existing)
  movements: HybridMovementData[]
  // Stats
  _count?: {
    results: number
  }
  // Versioning
  version?: number
  versionNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface HybridMovementData {
  id: string
  order: number
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weightMale?: number
  weightFemale?: number
  exercise: {
    id: string
    name: string
    nameSv?: string
    standardAbbreviation?: string
    equipmentTypes: string[]
    // Icon fields
    iconUrl?: string | null
    iconCategory?: string | null
    movementCategory?: string | null
  }
}

// ============================================
// STRENGTH SESSION TYPES
// ============================================

export interface StrengthSessionExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number
  weight?: number
  restSeconds?: number
  notes?: string
}

export interface StrengthSessionData {
  id: string
  name: string
  description?: string
  phase: string
  timingRelativeToRun?: string
  exercises: StrengthSessionExercise[]
  totalSets?: number
  totalExercises?: number
  estimatedDuration?: number
  volumeLoad?: number
  tags: string[]
  coachId: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    assignments: number
  }
}

export interface StrengthSessionAssignmentData {
  id: string
  sessionId: string
  athleteId: string
  assignedDate: Date
  assignedBy: string
  notes?: string
  status: string
  completedAt?: Date
  actualExercises?: StrengthSessionExercise[]
  rpe?: number
  duration?: number
  session?: StrengthSessionData
  athlete?: {
    id: string
    name: string
  }
}

// ============================================
// CARDIO SESSION TYPES
// ============================================

export type CardioSegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'

export interface CardioSegment {
  id: string
  type: CardioSegmentType
  duration?: number // seconds
  distance?: number // meters
  pace?: string
  zone?: number
  notes?: string
}

export interface CardioSessionData {
  id: string
  name: string
  description?: string
  sport: string
  segments: CardioSegment[]
  totalDuration?: number // seconds
  totalDistance?: number // meters
  avgZone?: number
  tags: string[]
  coachId: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    assignments: number
  }
}

export interface CardioSessionAssignmentData {
  id: string
  sessionId: string
  athleteId: string
  assignedDate: Date
  assignedBy: string
  notes?: string
  status: string
  completedAt?: Date
  actualDuration?: number
  actualDistance?: number
  avgHeartRate?: number
  actualSegments?: CardioSegment[]
  session?: CardioSessionData
  athlete?: {
    id: string
    name: string
  }
}
