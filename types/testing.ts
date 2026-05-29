// types/testing.ts

import type { AdminRole } from './admin'
import type {
  Gender,
  InclineUnit,
  SportType,
  TestStatus,
  TestType,
  UserRole,
} from './core'

// Organization groups multiple teams (e.g., "IFK Göteborg" with U19, U21, Senior)
export interface Organization {
  id: string
  userId: string
  name: string
  description?: string
  sportType?: SportType
  teams?: Team[]
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  id: string
  userId: string
  name: string
  description?: string
  organizationId?: string | null
  organization?: Organization | null
  sportType?: SportType | null
  members?: Client[]
  createdAt: Date
  updatedAt: Date
}

// Tracks when a workout was assigned to an entire team
export interface TeamWorkoutBroadcast {
  id: string
  teamId: string
  coachId: string
  strengthSessionId?: string | null
  cardioSessionId?: string | null
  hybridWorkoutId?: string | null
  assignedDate: Date
  notes?: string | null
  totalAssigned: number
  totalCompleted: number
  createdAt: Date
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
  adminRole: AdminRole | null
  language: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Extended user type for business admins (OWNER or ADMIN role)
 * Includes business context for scoped queries
 */
export interface BusinessAdminUser extends User {
  businessId: string
  businessRole: 'OWNER' | 'ADMIN'
  business: { id: string; name: string; slug: string }
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
  publicToken?: string | null
  publicExpiresAt?: Date | null
  // Pre-test baseline
  restingLactate?: number | null
  restingHeartRate?: number | null
  // Post-test measurements (peak lactate after max effort)
  postTestMeasurements?: Array<{ timeMin: number; lactate: number; heartRate?: number }> | null
  // Recommended next test
  recommendedNextTestDate?: Date | string | null
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
  // Metabol data (spirometri)
  rer?: number // Respiratory Exchange Ratio
  ve?: number // Minutventilation (L/min)
  vco2?: number // VCO2 (ml/min)
  fatPercent?: number // Fettförbränning (%)
  choPercent?: number // Kolhydratförbränning (%)
  respiratoryRate?: number // Andningsfrekvens (andetag/min)
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
  // D-max specific fields (optional)
  method?: 'DMAX' | 'MOD_DMAX' | 'LINEAR_INTERPOLATION' | 'FIXED_4MMOL' | 'DMAX_LT1' | 'EXPONENTIAL_RISE' | (string & {})
  confidence?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  r2?: number
  coefficients?: {
    a: number
    b: number
    c: number
    d: number
  }
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
  warnings?: CalculationWarning[]
}

export interface CalculationWarning {
  type: 'BASELINE_CORRECTION' | 'LOW_CONFIDENCE' | 'DATA_QUALITY' | 'LACTATE_DROP'
  severity: 'info' | 'warning'
  message: string
  details?: {
    correctedStages?: { stage: number; original: number; corrected: number }[]
    trueBaseline?: number
    /** Sequence numbers of stages that were skipped during a calculation (e.g. missing VO2) */
    skippedStages?: number[]
    lactateDrops?: { fromStage: number; toStage: number; drop: number }[]
  }
}

export interface EconomyData {
  speed?: number
  power?: number
  vo2: number
  economy: number // ml/kg/km för löpning
  efficiency: 'Excellent' | 'Very good' | 'Good' | 'Fair' | 'Needs improvement' | 'Utmärkt' | 'Mycket god' | 'God' | 'Acceptabel' | 'Behöver förbättring'
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
  organizationId?: string
  sportType?: SportType
}

export interface CreateOrganizationDTO {
  name: string
  description?: string
  sportType?: SportType
}

export interface TeamAssignWorkoutDTO {
  workoutType: 'strength' | 'cardio' | 'hybrid'
  workoutId: string
  assignedDate: string
  notes?: string
  excludeAthleteIds?: string[]
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
