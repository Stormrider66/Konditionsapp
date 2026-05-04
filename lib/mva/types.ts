import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

export type VariableCategory =
  | 'PHYSIOLOGICAL'
  | 'BODY_COMPOSITION'
  | 'TRAINING_LOAD'
  | 'DAILY_MONITORING'
  | 'PERFORMANCE'
  | 'STRENGTH'
  | 'RECOVERY'
  | 'GAIT'
  | 'INTEGRATION'
  | 'TEMPORAL'

export interface MVAVariable {
  id: string
  name: string
  nameSv: string
  category: VariableCategory
  unit: string
  extractor: (bundle: AthleteDataBundle) => number | null
  sportRelevance?: string[] // SportType values where this variable is especially relevant
}

// Lightweight summary interfaces for integration data — only fields extractors need
export interface StravaActivitySummary {
  id: string
  startDate: Date
  distance: number | null
  movingTime: number | null
  averageHeartrate: number | null
  type: string | null
}

export interface GarminActivitySummary {
  id: string
  startDate: Date
  distance: number | null
  duration: number | null
  averageHeartrate: number | null
  trainingEffect: number | null
  type: string | null
}

export interface Concept2ResultSummary {
  id: string
  date: Date
  distance: number | null
  time: number | null
  strokeRate: number | null
  type: string | null
}

export interface WeeklyTrainingSummarySummary {
  id: string
  weekStart: Date
  totalTSS: number | null
  totalDistance: number | null
  totalDuration: number | null
  workoutCount: number | null
  completedWorkoutCount: number | null
  plannedWorkoutCount: number | null
  compliancePercent: number | null
  avgReadiness: number | null
  avgSleepQuality: number | null
  avgFatigue: number | null
}

export interface SportTestSummary {
  id: string
  testDate: Date
  category: string           // POWER, SPEED, AGILITY, STRENGTH, ENDURANCE_FIELD, SPORT_SPECIFIC
  protocol: string           // VERTICAL_JUMP_CMJ, SPRINT_20M, T_TEST, etc.
  primaryResult: number | null
  primaryUnit: string | null
  secondaryResult: number | null
  peakPower: number | null
  avgPower: number | null
  relativePower: number | null
  acceleration: number | null
  maxVelocity: number | null
  estimatedVO2max: number | null
  distance: number | null
  level: number | null
  bestAttempt: boolean
}

export interface ErgometerTestSummary {
  id: string
  testDate: Date
  ergometerType: string      // CONCEPT2_ROW, CONCEPT2_SKI, WATTBIKE, etc.
  testProtocol: string
  peakPower: number | null
  avgPower: number | null
  criticalPower: number | null
  wPrime: number | null
  totalDistance: number | null
  avgPace: number | null
  avgHR: number | null
  maxHR: number | null
}

export interface TimingGateResultSummary {
  id: string
  sessionDate: Date
  testProtocol: string | null
  splitTimes: number[]
  totalTime: number
  acceleration: number | null
  maxVelocity: number | null
  codDeficit: number | null
  valid: boolean
}

export interface MovementScreenSummary {
  id: string
  screenDate: Date
  screenType: string
  totalScore: number | null
  asymmetryFlag: boolean
  improvement: string | null  // IMPROVED, STABLE, DECLINED
}

export interface HockeyPhysicalTestSummary {
  id: string
  testDate: Date
  agility505Left: number | null
  agility505Right: number | null
  sprint5m: number | null
  sprint10m: number | null
  sprint20m: number | null
  sprint30m: number | null
  sprint20mFly: number | null
  sprint30mFly: number | null
  endurance7x40: unknown | null
  jumpSquatLadder: unknown | null
  gripStrengthLeft: number | null
  gripStrengthRight: number | null
  standingLongJump: number | null
  threeJumpLeft: number | null
  threeJumpRight: number | null
  beepTestLevel: number | null
  beepTestShuttle: number | null
  vo2max: number | null
  lt1HeartRate: number | null
  lt1SpeedKmh: number | null
  lt1Lactate: number | null
  lt2HeartRate: number | null
  lt2SpeedKmh: number | null
  lt2Lactate: number | null
  maxHeartRate: number | null
  maxLactate: number | null
  rampDurationSec: number | null
  peakSpeedKmh: number | null
  rerMax: number | null
  veMax: number | null
  breathingFrequencyMax: number | null
  economyMlKgKm: number | null
  hrRecovery1Min: number | null
  hrRecovery2Min: number | null
  lactateClearance3Min: number | null
  lactateClearance5Min: number | null
  lactateClearance10Min: number | null
  backSquat1RM: number | null
  powerClean1RM: number | null
  benchPress1RM: number | null
  pullUp1RM: number | null
  muscleLabMaxima: unknown | null
}

export interface AthleteDataBundle {
  clientId: string
  clientName: string
  position?: string | null
  data: AthleteProfileData
  strava?: StravaActivitySummary[]
  garmin?: GarminActivitySummary[]
  concept2?: Concept2ResultSummary[]
  weeklySummaries?: WeeklyTrainingSummarySummary[]
  sportSettings?: Record<string, unknown> | null
  sportTests?: SportTestSummary[]
  ergometerTests?: ErgometerTestSummary[]
  timingGateResults?: TimingGateResultSummary[]
  movementScreens?: MovementScreenSummary[]
  hockeyTests?: HockeyPhysicalTestSummary[]
}

export interface PreprocessingConfig {
  centering: boolean
  scaling: 'uv' | 'pareto' | 'none' // uv = unit variance (SIMCA standard)
  minVariableCoverage: number // 0-1, exclude variable if coverage below this
  minAthleteCoverage: number // 0-1, exclude athlete if coverage below this
  imputeMethod: 'mean' | 'median'
}

export interface PreprocessedData {
  matrix: number[][] // [observations x variables]
  athleteIds: string[]
  athleteNames: string[]
  variableIds: string[]
  variableNames: string[]
  means: number[]
  stds: number[]
  excludedAthletes: { clientId: string; name: string; reason: string }[]
  excludedVariables: { variableId: string; name: string; reason: string }[]
  imputedCells: number
}

export interface PCAModelResult {
  scores: number[][] // [observations x components]
  loadings: number[][] // [variables x components]
  eigenvalues: number[]
  explainedVariance: number[] // per component, fraction 0-1
  cumulativeVariance: number[] // cumulative fraction
  nComponents: number
  athleteIds: string[]
  athleteNames: string[]
  variableIds: string[]
  variableNames: string[]
  diagnostics: AthleteDiagnostics[]
  t2Limit95: number
  t2Limit99: number
  dmodxLimit: number
  preprocessedData: PreprocessedData
}

export interface AthleteDiagnostics {
  clientId: string
  clientName: string
  scores: number[]
  hotellingT2: number
  dmodx: number
  isOutlierT2: boolean
  isOutlierDModX: boolean
  topContributors: VariableContribution[]
}

export interface VariableContribution {
  variableId: string
  variableName: string
  contribution: number
  direction: 'positive' | 'negative'
}

export interface MVAVariableInfo {
  id: string
  name: string
  nameSv: string
  category: VariableCategory
  unit: string
  coverage: number // fraction of athletes with data
  athleteCount: number
  totalAthletes: number
  sportRelevance?: string[]
}

export interface PLSModelResult {
  xScores: number[][]          // T matrix [obs x comp]
  xLoadings: number[][]        // P matrix [xVars x comp]
  xWeights: number[][]         // W matrix [xVars x comp]
  coefficients: number[][]     // B matrix
  r2X: number                  // Explained X variance
  r2Y: number                  // R² for Y (model fit)
  q2: number                   // Cross-validated R² (LOO)
  nComponents: number
  vipScores: VIPScore[]        // Sorted descending
  yObserved: number[]          // Actual Y values
  yPredicted: number[]         // Model-predicted Y values
  xVariableIds: string[]
  xVariableNames: string[]
  yVariableId: string
  yVariableName: string
  athleteIds: string[]
  athleteNames: string[]
  preprocessedData: PreprocessedData
  aiInsight?: PLSInsight | null
}

export interface VIPScore {
  variableId: string
  variableName: string
  vip: number
  coefficient: number          // Sign = direction of effect
  category: string
}

export interface PLSInsight {
  summary: string              // 2-3 sentence Swedish summary
  keyDrivers: string[]         // Top driver descriptions
  recommendations: string[]    // Actionable recs
}

export const DEFAULT_PREPROCESSING_CONFIG: PreprocessingConfig = {
  centering: true,
  scaling: 'uv',
  minVariableCoverage: 0.6,
  minAthleteCoverage: 0.5,
  imputeMethod: 'mean',
}
