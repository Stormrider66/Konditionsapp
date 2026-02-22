// types/index.ts

// Bas-typer
export type Gender = 'MALE' | 'FEMALE'
export type TestType = 'RUNNING' | 'CYCLING' | 'SKIING'
export type TestStatus = 'DRAFT' | 'COMPLETED' | 'ARCHIVED'
export type InclineUnit = 'PERCENT' | 'DEGREES'
export type UserRole = 'ADMIN' | 'COACH' | 'ATHLETE' | 'PHYSIO'
export type WorkoutType = 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'RECOVERY' | 'CYCLING' | 'SKIING' | 'SWIMMING' | 'HYROX' | 'TRIATHLON' | 'ALTERNATIVE' | 'OTHER'
export type WorkoutIntensity = 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'
export type PeriodPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION'
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL'

// ==================== ADMIN SYSTEM ====================

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT'

export type EnterpriseContractStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED'

export interface EnterpriseContract {
  id: string
  businessId: string
  contractNumber: string
  contractName: string
  contactName: string
  contactEmail: string
  contactPhone?: string | null
  monthlyFee: number
  currency: string
  revenueSharePercent: number
  athleteLimit: number
  coachLimit: number
  billingCycle: string
  paymentTermDays: number
  startDate: string
  endDate?: string | null
  autoRenew: boolean
  noticePeriodDays: number
  status: EnterpriseContractStatus
  customFeatures?: unknown
  createdAt: string
  updatedAt: string
  activatedAt?: string | null
  cancelledAt?: string | null
  business?: {
    id: string
    name: string
    slug: string
  }
}

export interface EnterpriseContractChange {
  id: string
  contractId: string
  changeType: string
  changedById: string
  previousData?: unknown
  newData?: unknown
  notes?: string | null
  createdAt: string
  changedBy?: {
    id: string
    name: string
    email: string
  }
}

export interface PricingTier {
  id: string
  tierType: string
  tierName: string
  displayName: string
  description?: string | null
  features: string[]
  monthlyPriceCents: number
  yearlyPriceCents?: number | null
  currency: string
  stripeProductId?: string | null
  stripePriceIdMonthly?: string | null
  stripePriceIdYearly?: string | null
  maxAthletes: number
  aiChatLimit: number
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PricingOverride {
  id: string
  tierId: string
  businessId: string
  monthlyPriceCents?: number | null
  yearlyPriceCents?: number | null
  maxAthletes?: number | null
  aiChatLimit?: number | null
  validFrom: string
  validUntil?: string | null
  createdAt: string
  updatedAt: string
  tier?: PricingTier
  business?: {
    id: string
    name: string
    slug: string
  }
}

export interface SystemError {
  id: string
  level: string
  message: string
  stack?: string | null
  userId?: string | null
  route?: string | null
  method?: string | null
  statusCode?: number | null
  userAgent?: string | null
  sentryEventId?: string | null
  metadata?: unknown
  isResolved: boolean
  resolvedAt?: string | null
  resolvedById?: string | null
  createdAt: string
  resolvedBy?: {
    id: string
    name: string
    email: string
  } | null
}

export interface SystemMetric {
  id: string
  metricName: string
  value: number
  unit?: string | null
  dimensions?: unknown
  timestamp: string
}

// ==================== PHYSIOTHERAPIST SYSTEM ====================

export type TreatmentType =
  | 'ASSESSMENT'
  | 'MANUAL_THERAPY'
  | 'DRY_NEEDLING'
  | 'EXERCISE_THERAPY'
  | 'ELECTROTHERAPY'
  | 'TAPING'
  | 'EDUCATION'
  | 'DISCHARGE'
  | 'OTHER'

export type PhysioAssignmentRole = 'PRIMARY' | 'SECONDARY' | 'CONSULTANT'

export type RehabPhase =
  | 'ACUTE'
  | 'SUBACUTE'
  | 'REMODELING'
  | 'FUNCTIONAL'
  | 'RETURN_TO_SPORT'

export type RestrictionType =
  | 'NO_RUNNING'
  | 'NO_JUMPING'
  | 'NO_IMPACT'
  | 'NO_UPPER_BODY'
  | 'NO_LOWER_BODY'
  | 'REDUCED_VOLUME'
  | 'REDUCED_INTENSITY'
  | 'MODIFIED_ONLY'
  | 'SPECIFIC_EXERCISES'
  | 'CUSTOM'

export type RestrictionSeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'COMPLETE'

export type RestrictionSource =
  | 'INJURY_CASCADE'
  | 'PHYSIO_MANUAL'
  | 'COACH_MANUAL'
  | 'SYSTEM_AUTO'

export type InjuryMechanism = 'CONTACT' | 'NON_CONTACT' | 'OVERUSE' | 'UNKNOWN'

export type InjuryUrgency = 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'LOW'

export type CareTeamThreadStatus = 'OPEN' | 'RESOLVED' | 'ARCHIVED'

export type CareTeamThreadPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'

export type MovementScreenType = 'FMS' | 'SFMA' | 'Y_BALANCE' | 'CUSTOM'

export interface PhysioAssignment {
  id: string
  physioUserId: string
  clientId?: string | null
  teamId?: string | null
  organizationId?: string | null
  businessId?: string | null
  locationId?: string | null
  role: PhysioAssignmentRole
  canModifyPrograms: boolean
  canCreateRestrictions: boolean
  canViewFullHistory: boolean
  isActive: boolean
  startDate: string
  endDate?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  physio?: {
    id: string
    name: string
    email: string
  }
  client?: {
    id: string
    name: string
  } | null
  team?: {
    id: string
    name: string
  } | null
}

export interface TreatmentSession {
  id: string
  physioUserId: string
  clientId: string
  injuryId?: string | null
  sessionDate: string
  duration?: number | null
  treatmentType: TreatmentType
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  painBefore?: number | null
  painAfter?: number | null
  romMeasurements?: Record<string, unknown> | null
  modalitiesUsed: string[]
  followUpRequired: boolean
  followUpDate?: string | null
  followUpNotes?: string | null
  isBillable: boolean
  billingCode?: string | null
  createdAt: string
  updatedAt: string
  physio?: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
}

export interface RehabProgram {
  id: string
  physioUserId: string
  clientId: string
  injuryId?: string | null
  name: string
  description?: string | null
  currentPhase: RehabPhase
  phaseStartDate: string
  startDate: string
  estimatedEndDate?: string | null
  actualEndDate?: string | null
  shortTermGoals: string[]
  longTermGoals: string[]
  contraindications: string[]
  precautions: string[]
  acceptablePainDuring: number
  acceptablePainAfter: number
  status: string
  notes?: string | null
  createdAt: string
  updatedAt: string
  exercises?: RehabExercise[]
  milestones?: RehabMilestone[]
  physio?: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
}

export interface RehabExercise {
  id: string
  programId: string
  exerciseId: string
  sets?: number | null
  reps?: string | null
  duration?: number | null
  frequency?: string | null
  intensity?: string | null
  progressionCriteria?: string | null
  regressionCriteria?: string | null
  phases: RehabPhase[]
  order: number
  notes?: string | null
  cuePoints: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  exercise?: {
    id: string
    name: string
    videoUrl?: string | null
  }
}

export interface RehabMilestone {
  id: string
  programId: string
  name: string
  description?: string | null
  criteria?: string | null
  criteriaJson?: Record<string, unknown> | null
  phase: RehabPhase
  targetDate?: string | null
  achievedDate?: string | null
  isAchieved: boolean
  notes?: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface RehabProgressLog {
  id: string
  programId: string
  clientId: string
  date: string
  exercisesCompleted: string[]
  completionPercent?: number | null
  painDuring?: number | null
  painAfter?: number | null
  difficultyRating?: number | null
  notes?: string | null
  physioReviewed: boolean
  physioNotes?: string | null
  physioReviewedAt?: string | null
  physioReviewedBy?: string | null
  createdAt: string
}

export interface TrainingRestriction {
  id: string
  clientId: string
  createdById: string
  injuryId?: string | null
  type: RestrictionType
  severity: RestrictionSeverity
  source: RestrictionSource
  bodyParts: string[]
  affectedWorkoutTypes: string[]
  affectedExerciseIds: string[]
  startDate: string
  endDate?: string | null
  volumeReductionPercent?: number | null
  maxIntensityZone?: number | null
  description?: string | null
  reason?: string | null
  isActive: boolean
  clearedAt?: string | null
  clearedById?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    name: string
  }
  createdBy?: {
    id: string
    name: string
  }
}

export interface MovementScreen {
  id: string
  physioUserId: string
  clientId: string
  screenDate: string
  screenType: MovementScreenType
  results: Record<string, unknown>
  totalScore?: number | null
  asymmetryFlag: boolean
  previousScreenId?: string | null
  improvement?: string | null
  recommendations: string[]
  priorityAreas: string[]
  notes?: string | null
  createdAt: string
  updatedAt: string
  physio?: {
    id: string
    name: string
  }
  client?: {
    id: string
    name: string
  }
}

export interface AcuteInjuryReport {
  id: string
  reporterId: string
  clientId: string
  injuryId?: string | null
  reportDate: string
  incidentDate: string
  incidentTime?: string | null
  mechanism: InjuryMechanism
  bodyPart: string
  side?: string | null
  description?: string | null
  urgency: InjuryUrgency
  initialSeverity: number
  activityType?: string | null
  surfaceType?: string | null
  equipmentInvolved?: string | null
  immediateCareGiven?: string | null
  iceApplied: boolean
  removedFromPlay: boolean
  ambulanceCalled: boolean
  referralNeeded: boolean
  referralType?: string | null
  referralUrgency?: string | null
  physioNotified: boolean
  physioNotifiedAt?: string | null
  coachNotified: boolean
  coachNotifiedAt?: string | null
  followUpScheduled?: string | null
  status: string
  notes?: string | null
  createdAt: string
  updatedAt: string
  reporter?: {
    id: string
    name: string
    role: UserRole
  }
  client?: {
    id: string
    name: string
  }
}

export interface CareTeamThread {
  id: string
  clientId: string
  createdById: string
  subject: string
  description?: string | null
  injuryId?: string | null
  rehabProgramId?: string | null
  restrictionId?: string | null
  status: CareTeamThreadStatus
  priority: CareTeamThreadPriority
  lastMessageAt?: string | null
  resolvedAt?: string | null
  resolvedById?: string | null
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    name: string
  }
  createdBy?: {
    id: string
    name: string
  }
  messages?: CareTeamMessage[]
  participants?: CareTeamParticipant[]
}

export interface CareTeamMessage {
  id: string
  threadId: string
  senderId: string
  content: string
  mentionedUserIds: string[]
  attachments?: { url: string; name: string; type: string }[] | null
  readByUserIds: string[]
  createdAt: string
  updatedAt: string
  sender?: {
    id: string
    name: string
    role: UserRole
  }
}

export interface CareTeamParticipant {
  id: string
  threadId: string
  userId: string
  role: string
  notifyEmail: boolean
  notifyPush: boolean
  lastReadAt?: string | null
  lastViewedAt?: string | null
  isActive: boolean
  mutedUntil?: string | null
  joinedAt: string
  user?: {
    id: string
    name: string
    role: UserRole
  }
}

// ==================== BUSINESS ORGANIZATION ====================

export type BusinessMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'COACH' | 'PHYSIO'

export interface Business {
  id: string
  name: string
  slug: string
  description?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  stripeConnectAccountId?: string | null
  stripeConnectStatus?: string | null
  defaultRevenueShare: number
  logoUrl?: string | null
  primaryColor?: string | null
  isActive: boolean
  settings?: unknown
  createdAt: string
  updatedAt: string
  _count?: {
    members: number
    locations: number
    testers?: number
    athleteSubscriptions?: number
    apiKeys?: number
  }
  enterpriseContract?: EnterpriseContract | null
}

export interface BusinessMember {
  id: string
  businessId: string
  userId: string
  role: BusinessMemberRole
  permissions?: Record<string, boolean> | null
  isActive: boolean
  invitedAt: string
  acceptedAt?: string | null
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    name: string | null
    email: string
    role?: string
  }
  business?: Business
}

export interface BusinessApiKey {
  id: string
  businessId: string
  name: string
  keyPrefix: string
  requestsPerMinute: number
  requestsPerDay: number
  scopes: string[]
  isActive: boolean
  lastUsedAt?: string | null
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface BusinessLocation {
  id: string
  businessId: string
  name: string
  city?: string | null
  address?: string | null
  postalCode?: string | null
  latitude?: number | null
  longitude?: number | null
  totalTests: number
  lastTestAt?: string | null
  isActive: boolean
  settings?: unknown
  createdAt: string
  updatedAt: string
}

// ==================== FITNESS LEVEL ESTIMATION ====================

/**
 * Fitness level classification based on estimated VO2max
 * Used for the "Accordion Effect" - zone width varies by fitness level
 */
export type FitnessLevel =
  | 'UNTRAINED'      // VO2max < 35
  | 'BEGINNER'       // VO2max 35-40
  | 'RECREATIONAL'   // VO2max 40-50
  | 'TRAINED'        // VO2max 50-55
  | 'WELL_TRAINED'   // VO2max 55-65
  | 'ELITE'          // VO2max > 65

/**
 * Confidence level for fitness estimation
 */
export type FitnessConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

/**
 * Data source used for fitness estimation
 */
export type FitnessSource =
  | 'VDOT'           // From race results VDOT
  | 'WATCH_ESTIMATE' // From Garmin, Apple Watch, Polar, etc.
  | 'RACE_TIME'      // Calculated from race time
  | 'FTP'            // From cycling FTP/kg
  | 'CSS'            // From swimming Critical Swim Speed
  | 'EXPERIENCE'     // From experience level input
  | 'RESTING_HR'     // From resting heart rate
  | 'COMBINED'       // Multiple sources combined

/**
 * Fitness level estimate with LT1/LT2 percentages
 *
 * Research shows LT1/LT2 as %HRmax varies significantly by fitness level:
 * - Untrained: LT1 ≈ 58%, LT2 ≈ 78% (narrow Zone 2)
 * - Beginner: LT1 ≈ 63%, LT2 ≈ 80%
 * - Recreational: LT1 ≈ 68%, LT2 ≈ 84%
 * - Trained: LT1 ≈ 72%, LT2 ≈ 87%
 * - Well-trained: LT1 ≈ 76%, LT2 ≈ 90%
 * - Elite: LT1 ≈ 78%, LT2 ≈ 93% (wide Zone 2)
 */
export interface FitnessEstimate {
  /** Classified fitness level */
  level: FitnessLevel
  /** Estimated VO2max in ml/kg/min, null if unknown */
  estimatedVO2max: number | null
  /** Confidence in the estimate */
  confidence: FitnessConfidence
  /** Data source used for estimation */
  source: FitnessSource
  /** Estimated LT1 (aerobic threshold) as % of HRmax */
  lt1PercentHRmax: number
  /** Estimated LT2 (anaerobic threshold) as % of HRmax */
  lt2PercentHRmax: number
}

// Multi-sport types (including team sports and racket sports)
export type SportType =
  | 'RUNNING'
  | 'CYCLING'
  | 'SKIING'
  | 'SWIMMING'
  | 'TRIATHLON'
  | 'HYROX'
  | 'GENERAL_FITNESS'
  | 'FUNCTIONAL_FITNESS'
  | 'STRENGTH'
  // Team Sports
  | 'TEAM_FOOTBALL'
  | 'TEAM_ICE_HOCKEY'
  | 'TEAM_HANDBALL'
  | 'TEAM_FLOORBALL'
  | 'TEAM_BASKETBALL'
  | 'TEAM_VOLLEYBALL'
  // Racket Sports
  | 'TENNIS'
  | 'PADEL'

export const TEAM_SPORT_TYPES = [
  'TEAM_FOOTBALL',
  'TEAM_ICE_HOCKEY',
  'TEAM_HANDBALL',
  'TEAM_FLOORBALL',
  'TEAM_BASKETBALL',
  'TEAM_VOLLEYBALL',
] as const

export const RACKET_SPORT_TYPES = [
  'TENNIS',
  'PADEL',
] as const

export function isRacketSport(sport: SportType): boolean {
  return RACKET_SPORT_TYPES.includes(sport as typeof RACKET_SPORT_TYPES[number])
}

export function isTeamSport(sport: SportType): boolean {
  return sport.startsWith('TEAM_')
}

// ==================== INTENSITY DISTRIBUTION TARGETS ====================

/**
 * Training methodology defining the overall intensity distribution philosophy
 */
export type IntensityMethodology =
  | 'POLARIZED'           // 80/20 - High volume of easy work, limited hard efforts
  | 'THRESHOLD_FOCUSED'   // More tempo/threshold work for HYROX, functional fitness
  | 'PYRAMIDAL'           // Traditional pyramid - moderate amount of all intensities
  | 'BALANCED'            // Equal-ish distribution for general fitness
  | 'HIGH_INTENSITY'      // For very low volume (<3h) - maximize stimulus density
  | 'CUSTOM'              // User-defined targets

/**
 * Volume category for determining appropriate intensity distribution
 * Based on research from Muñoz et al. (2014) and Seiler
 */
export type VolumeCategory = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'

/**
 * Frequency category for the "Rule of 6" logic gates
 */
export type FrequencyCategory = 'LOW' | 'MODERATE' | 'HIGH'

/**
 * Intensity distribution targets for training planning
 * Percentages must sum to 100
 */
export interface IntensityTargets {
  /** Zone 1-2 percentage (below LT1, easy/recovery) */
  easyPercent: number
  /** Zone 3 percentage (between LT1 and LT2, tempo/threshold) */
  moderatePercent: number
  /** Zone 4-5 percentage (above LT2, hard/VO2max/anaerobic) */
  hardPercent: number
  /** Training methodology this distribution follows */
  methodology?: IntensityMethodology
  /** Display label for the UI (e.g., "80/20", "HYROX Hybrid") */
  label?: string
}

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
  type: 'BASELINE_CORRECTION' | 'LOW_CONFIDENCE' | 'DATA_QUALITY'
  severity: 'info' | 'warning'
  message: string
  details?: {
    correctedStages?: { stage: number; original: number; corrected: number }[]
    trueBaseline?: number
  }
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

export interface StrengthSessionSectionExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number | string
  restSeconds?: number
  duration?: number
  notes?: string
}

export interface StrengthSessionSectionData {
  notes?: string
  duration?: number
  exercises?: StrengthSessionSectionExercise[]
}

export interface StrengthSessionData {
  id?: string
  name: string
  description?: string
  phase: string
  timingRelativeToRun?: string
  exercises: StrengthSessionExercise[]
  warmupData?: StrengthSessionSectionData
  coreData?: StrengthSessionSectionData
  cooldownData?: StrengthSessionSectionData
  totalSets?: number
  totalExercises?: number
  estimatedDuration?: number
  volumeLoad?: number
  tags?: string[]
  coachId?: string
  isPublic?: boolean
  createdAt?: Date
  updatedAt?: Date
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

// ============================================
// Session Assignment Types (Shared)
// ============================================

/**
 * Generic session assignment for UI display
 * Used across Cardio, Strength, and Hybrid sessions
 */
export interface SessionAssignment {
  id: string
  athleteId: string
  assignedDate: string
  status: string
  completedAt?: string
  athlete?: {
    id: string
    name: string
  }
}

// ============================================
// Hybrid Workout Result Types
// ============================================

/**
 * Hybrid workout result for leaderboard and history display
 */
export interface HybridWorkoutResult {
  id: string
  athleteId: string
  scoreType: string
  timeScore?: number
  roundsCompleted?: number
  repsCompleted?: number
  scalingLevel: string
  completedAt: string
  isPR: boolean
  athlete?: {
    id: string
    name: string
  }
}

// ============================================
// Skiing Video Analysis Types
// ============================================

export type SkiingVideoType = 'SKIING_CLASSIC' | 'SKIING_SKATING' | 'SKIING_DOUBLE_POLE'
export type SkiingTechniqueType = 'CLASSIC' | 'SKATING' | 'DOUBLE_POLE'
export type SkatingVariant = 'V1' | 'V2' | 'V2_ALT'
export type PoleTiming = 'EARLY' | 'ON_TIME' | 'LATE'
export type ForceApplication = 'GOOD' | 'WEAK' | 'INCONSISTENT'
export type KickExtension = 'FULL' | 'PARTIAL' | 'INCOMPLETE'
export type EngagementLevel = 'GOOD' | 'MODERATE' | 'POOR'
export type RecoveryPattern = 'EFFICIENT' | 'MODERATE' | 'INEFFICIENT'
export type LegPath = 'COMPACT' | 'WIDE' | 'INCONSISTENT'
export type CompressionDepth = 'SHALLOW' | 'OPTIMAL' | 'EXCESSIVE'
export type ReturnSpeed = 'FAST' | 'MODERATE' | 'SLOW'
export type LegDriveContribution = 'SIGNIFICANT' | 'MODERATE' | 'MINIMAL'
export type LegDriveTiming = 'SYNCHRONIZED' | 'EARLY' | 'LATE'
export type TerrainType = 'FLAT' | 'UPHILL' | 'DOWNHILL'

export interface SkiingDrill {
  drill: string
  focus: string
  priority: number
}

export interface SkiingTechniqueAnalysis {
  id: string
  videoAnalysisId: string
  techniqueType: SkiingTechniqueType
  skatingVariant?: SkatingVariant
  terrainType?: TerrainType

  // Overall scores (0-100)
  overallScore?: number
  balanceScore?: number
  timingScore?: number
  efficiencyScore?: number

  // Pole mechanics
  poleAngleAtPlant?: number
  poleAngleAtRelease?: number
  polePlantTiming?: PoleTiming
  poleForceApplication?: ForceApplication
  armSwingSymmetry?: number

  // Hip and core
  hipPositionScore?: number
  hipHeightConsistency?: number
  coreEngagement?: EngagementLevel
  forwardLean?: number

  // Weight transfer
  weightTransferScore?: number
  weightShiftTiming?: PoleTiming
  lateralStability?: number

  // Classic-specific
  kickTimingScore?: number
  kickExtension?: KickExtension
  glidePhaseDuration?: number
  legRecoveryPattern?: RecoveryPattern
  waxPocketEngagement?: EngagementLevel

  // Skating-specific
  edgeAngleLeft?: number
  edgeAngleRight?: number
  edgeAngleSymmetry?: number
  pushOffAngle?: number
  vPatternWidth?: number
  skateFrequency?: number
  recoveryLegPath?: LegPath

  // Double pole-specific
  trunkFlexionRange?: number
  compressionDepth?: CompressionDepth
  returnPhaseSpeed?: ReturnSpeed
  legDriveContribution?: LegDriveContribution
  rhythmConsistency?: number

  // AI insights
  primaryStrengths?: string[]
  primaryWeaknesses?: string[]
  techniqueDrills?: SkiingDrill[]
  comparisonToElite?: string

  createdAt: Date
  updatedAt: Date
}

// ============================================
// HYROX Video Analysis Types
// ============================================

export type HyroxStationType =
  | 'SKIERG'
  | 'SLED_PUSH'
  | 'SLED_PULL'
  | 'BURPEE_BROAD_JUMP'
  | 'ROWING'
  | 'FARMERS_CARRY'
  | 'SANDBAG_LUNGE'
  | 'WALL_BALLS'

export type BreathingPattern = 'GOOD' | 'INCONSISTENT' | 'POOR'
export type BenchmarkLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'

// SkiErg specific
export type PullLength = 'SHORT' | 'OPTIMAL' | 'LONG'
export type HipHingeDepth = 'SHALLOW' | 'OPTIMAL' | 'EXCESSIVE'
export type ArmExtension = 'INCOMPLETE' | 'FULL' | 'OVEREXTENDED'

// Sled Push specific
export type ArmLockout = 'BENT' | 'LOCKED' | 'OVEREXTENDED'
export type StrideLength = 'SHORT' | 'OPTIMAL' | 'OVERSTRIDING'
export type DrivePhase = 'WEAK' | 'GOOD' | 'POWERFUL'

// Sled Pull specific
export type PullTechnique = 'ARM_DOMINANT' | 'HIP_DRIVEN' | 'MIXED'
export type RopePath = 'STRAIGHT' | 'DIAGONAL' | 'INCONSISTENT'
export type AnchorStability = 'STABLE' | 'SHIFTING' | 'UNSTABLE'

// Burpee Broad Jump specific
export type BurpeeDepth = 'SHALLOW' | 'FULL' | 'EXCESSIVE'
export type JumpDistance = 'SHORT' | 'GOOD' | 'EXCELLENT'
export type TransitionSpeed = 'SLOW' | 'MODERATE' | 'FAST'
export type LandingMechanics = 'POOR' | 'ACCEPTABLE' | 'GOOD'

// Rowing specific
export type DriveSequence = 'CORRECT' | 'ARMS_EARLY' | 'BACK_EARLY'
export type CatchPosition = 'COMPRESSED' | 'OPTIMAL' | 'OVERREACHING'
export type PowerApplication = 'FRONT_LOADED' | 'EVEN' | 'BACK_LOADED'

// Farmers Carry specific
export type ShoulderPack = 'ELEVATED' | 'PACKED' | 'DEPRESSED'
export type TrunkPosture = 'UPRIGHT' | 'LEANING' | 'SWAYING'
export type StridePattern = 'SHORT_CHOPPY' | 'SMOOTH' | 'OVERSTRIDING'
export type GripFatigue = 'NONE' | 'MODERATE' | 'SIGNIFICANT'

// Sandbag Lunge specific
export type BagPosition = 'HIGH_CHEST' | 'SHOULDER' | 'DROPPING'
export type KneeTracking = 'GOOD' | 'VALGUS' | 'VARUS'
export type TorsoPosition = 'UPRIGHT' | 'FORWARD_LEAN' | 'EXCESSIVE_LEAN'

// Wall Balls specific
export type SquatDepth = 'SHALLOW' | 'PARALLEL' | 'DEEP'
export type ThrowMechanics = 'ARM_DOMINANT' | 'HIP_DRIVEN' | 'COORDINATED'
export type WallBallCatchHeight = 'HIGH' | 'OPTIMAL' | 'LOW'

export interface HyroxDrill {
  drill: string
  focus: string
  priority: number
}

export interface HyroxFatigueIndicators {
  earlyPhase: string[]
  latePhase: string[]
}

export interface HyroxStationAnalysis {
  id: string
  videoAnalysisId: string
  stationType: HyroxStationType

  // Overall assessment (0-100)
  overallScore?: number
  efficiencyScore?: number
  formScore?: number
  paceConsistency?: number

  // Movement quality
  coreStability?: number
  breathingPattern?: BreathingPattern
  movementEconomy?: number

  // Pace analysis
  movementCadence?: number
  cadenceVariation?: number
  restPauses?: number

  // Fatigue indicators
  fatigueIndicators?: HyroxFatigueIndicators
  formDegradation?: number

  // Station-specific metrics (varies by station)
  stationMetrics?: Record<string, unknown>

  // SkiErg specific
  pullLength?: PullLength
  hipHingeDepth?: HipHingeDepth
  armExtension?: ArmExtension
  legDriveContribution?: LegDriveContribution

  // Sled Push specific
  bodyAngle?: number
  armLockout?: ArmLockout
  strideLength?: StrideLength
  drivePhase?: DrivePhase

  // Sled Pull specific
  pullTechnique?: PullTechnique
  ropePath?: RopePath
  anchorStability?: AnchorStability

  // Burpee Broad Jump specific
  burpeeDepth?: BurpeeDepth
  jumpDistance?: JumpDistance
  transitionSpeed?: TransitionSpeed
  landingMechanics?: LandingMechanics

  // Rowing specific
  driveSequence?: DriveSequence
  laybackAngle?: number
  catchPosition?: CatchPosition
  strokeRate?: number
  powerApplication?: PowerApplication

  // Farmers Carry specific
  shoulderPack?: ShoulderPack
  trunkPosture?: TrunkPosture
  stridePattern?: StridePattern
  gripFatigue?: GripFatigue

  // Sandbag Lunge specific
  bagPosition?: BagPosition
  kneeTracking?: KneeTracking
  stepLength?: StrideLength
  torsoPosition?: TorsoPosition

  // Wall Balls specific
  squatDepth?: SquatDepth
  throwMechanics?: ThrowMechanics
  wallBallCatchHeight?: WallBallCatchHeight
  rhythmConsistency?: number

  // Benchmark comparison
  benchmarkLevel?: BenchmarkLevel
  estimatedStationTime?: number

  // Athlete profile integration
  isWeakStation?: boolean
  isStrongStation?: boolean

  // AI insights
  primaryStrengths?: string[]
  primaryWeaknesses?: string[]
  improvementDrills?: HyroxDrill[]
  raceStrategyTips?: string[]

  createdAt: Date
  updatedAt: Date
}

// ==================== AGILITY STUDIO SYSTEM ====================

export type AgilityDrillCategory =
  | 'COD'
  | 'REACTIVE_AGILITY'
  | 'SPEED_ACCELERATION'
  | 'PLYOMETRICS'
  | 'FOOTWORK'
  | 'BALANCE'

export type AgilityWorkoutFormat =
  | 'CIRCUIT'
  | 'STATION_ROTATION'
  | 'INTERVAL'
  | 'PROGRESSIVE'
  | 'REACTIVE'
  | 'TESTING'

export type DevelopmentStage =
  | 'FUNDAMENTALS'        // Ages 6-9
  | 'LEARNING_TO_TRAIN'   // Ages 9-12
  | 'TRAINING_TO_TRAIN'   // Ages 12-16
  | 'TRAINING_TO_COMPETE' // Ages 16-18+
  | 'TRAINING_TO_WIN'     // Ages 18+
  | 'ELITE'               // Professional

export type TimingGateSource =
  | 'CSV_IMPORT'
  | 'VALD_API'
  | 'BROWER'
  | 'FREELAP'
  | 'WITTY'
  | 'MANUAL'

export interface AgilityDrill {
  id: string
  name: string
  nameSv?: string | null
  description?: string | null
  descriptionSv?: string | null
  category: AgilityDrillCategory
  requiredEquipment: string[]
  optionalEquipment: string[]
  distanceMeters?: number | null
  durationSeconds?: number | null
  defaultReps?: number | null
  defaultSets?: number | null
  restSeconds?: number | null
  minDevelopmentStage: DevelopmentStage
  maxDevelopmentStage: DevelopmentStage
  primarySports: SportType[]
  difficultyLevel: number
  videoUrl?: string | null
  animationUrl?: string | null
  diagramUrl?: string | null
  setupInstructions?: string | null
  executionCues: string[]
  progressionDrillId?: string | null
  regressionDrillId?: string | null
  coachId?: string | null
  isSystemDrill: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AgilityWorkout {
  id: string
  name: string
  description?: string | null
  format: AgilityWorkoutFormat
  totalDuration?: number | null
  restBetweenDrills?: number | null
  developmentStage?: DevelopmentStage | null
  targetSports: SportType[]
  primaryFocus?: AgilityDrillCategory | null
  coachId: string
  isTemplate: boolean
  isPublic: boolean
  tags: string[]
  drills?: AgilityWorkoutDrill[]
  createdAt: Date
  updatedAt: Date
  _count?: {
    assignments: number
    results: number
  }
}

export interface AgilityWorkoutDrill {
  id: string
  workoutId: string
  drillId: string
  order: number
  sectionType: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  sets?: number | null
  reps?: number | null
  duration?: number | null
  restSeconds?: number | null
  notes?: string | null
  drill?: AgilityDrill
  createdAt: Date
}

export interface AgilityWorkoutAssignment {
  id: string
  workoutId: string
  athleteId: string
  assignedDate: Date
  assignedBy: string
  notes?: string | null
  status: string
  startedAt?: Date | null
  completedAt?: Date | null
  teamBroadcastId?: string | null
  workout?: AgilityWorkout
  athlete?: {
    id: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface AgilityWorkoutResult {
  id: string
  workoutId: string
  athleteId: string
  completedAt: Date
  totalDuration?: number | null
  perceivedEffort?: number | null
  notes?: string | null
  drillResults?: AgilityDrillResult[] | null
  workout?: AgilityWorkout
  athlete?: {
    id: string
    name: string
  }
  createdAt: Date
}

export interface AgilityDrillResult {
  drillId: string
  completed: boolean
  timeSeconds?: number | null
  notes?: string | null
}

export interface TimingGateSession {
  id: string
  coachId: string
  sessionDate: Date
  sessionName?: string | null
  importSource: TimingGateSource
  importedAt?: Date | null
  rawDataUrl?: string | null
  gateCount?: number | null
  intervalDistances: number[]
  locationId?: string | null
  notes?: string | null
  results?: TimingGateResult[]
  createdAt: Date
  updatedAt: Date
}

export interface TimingGateResult {
  id: string
  sessionId: string
  athleteId?: string | null
  unmatchedAthleteName?: string | null
  unmatchedAthleteId?: string | null
  testProtocol?: string | null
  attemptNumber: number
  splitTimes: number[]
  totalTime: number
  acceleration?: number | null
  maxVelocity?: number | null
  codDeficit?: number | null
  valid: boolean
  invalidReason?: string | null
  notes?: string | null
  athlete?: {
    id: string
    name: string
  } | null
  createdAt: Date
}

// DTOs for Agility Studio

export interface CreateAgilityDrillDTO {
  name: string
  nameSv?: string
  description?: string
  descriptionSv?: string
  category: AgilityDrillCategory
  requiredEquipment?: string[]
  optionalEquipment?: string[]
  distanceMeters?: number
  durationSeconds?: number
  defaultReps?: number
  defaultSets?: number
  restSeconds?: number
  minDevelopmentStage?: DevelopmentStage
  maxDevelopmentStage?: DevelopmentStage
  primarySports?: SportType[]
  difficultyLevel?: number
  videoUrl?: string
  animationUrl?: string
  diagramUrl?: string
  setupInstructions?: string
  executionCues?: string[]
}

export interface CreateAgilityWorkoutDTO {
  name: string
  description?: string
  format: AgilityWorkoutFormat
  totalDuration?: number
  restBetweenDrills?: number
  developmentStage?: DevelopmentStage
  targetSports?: SportType[]
  primaryFocus?: AgilityDrillCategory
  isTemplate?: boolean
  isPublic?: boolean
  tags?: string[]
  drills: CreateAgilityWorkoutDrillDTO[]
}

export interface CreateAgilityWorkoutDrillDTO {
  drillId: string
  order: number
  sectionType?: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  sets?: number
  reps?: number
  duration?: number
  restSeconds?: number
  notes?: string
}

export interface AssignAgilityWorkoutDTO {
  athleteIds: string[]
  assignedDate: string
  notes?: string
}

export interface SubmitAgilityWorkoutResultDTO {
  totalDuration?: number
  perceivedEffort?: number
  notes?: string
  drillResults?: AgilityDrillResult[]
}

export interface CreateTimingGateSessionDTO {
  sessionDate: string
  sessionName?: string
  importSource: TimingGateSource
  gateCount?: number
  intervalDistances?: number[]
  locationId?: string
  notes?: string
}

export interface CreateTimingGateResultDTO {
  athleteId?: string
  unmatchedAthleteName?: string
  testProtocol?: string
  attemptNumber?: number
  splitTimes: number[]
  totalTime: number
  acceleration?: number
  maxVelocity?: number
  codDeficit?: number
  valid?: boolean
  invalidReason?: string
  notes?: string
}
