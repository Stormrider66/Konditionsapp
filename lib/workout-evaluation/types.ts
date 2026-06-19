export type WorkoutSource =
  | 'GARMIN'
  | 'CONCEPT2_LOGBOOK'
  | 'CONCEPT2_PM5_BLUETOOTH'
  | 'WATTBIKE_BLUETOOTH'
  | 'HR_BELT_BLUETOOTH'
  | 'APP_GPS'
  | 'CARDIO_FOCUS'
  | 'HYBRID_FOCUS'
  | 'MANUAL'
  | 'NATIVE_CAPTURE'

export type EvaluationConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type FatigueLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'

export interface NormalizedSensorSample {
  timeSec: number
  heartRate?: number
  hrPercentMax?: number
  hrZone?: number
  power?: number
  powerZone?: number
  paceSecPerKm?: number
  paceSecPer500m?: number
  speedMps?: number
  cadence?: number
  strokeRate?: number
  distanceMeters?: number
  calories?: number
}

export interface SegmentEvaluation {
  segmentIndex: number
  label: string
  startedAt?: string
  completedAt?: string
  planned: {
    durationSec?: number
    distanceMeters?: number
    hrZone?: number
    power?: number
    paceSecPerKm?: number
    calories?: number
  }
  actual: {
    durationSec?: number
    avgHr?: number
    maxHr?: number
    avgHrPercentMax?: number
    maxHrPercentMax?: number
    zoneSeconds: Record<1 | 2 | 3 | 4 | 5, number>
    avgPower?: number
    maxPower?: number
    normalizedPower?: number
    avgPaceSecPerKm?: number
    avgPaceSecPer500m?: number
    avgSpeedMps?: number
    avgCadence?: number
    avgStrokeRate?: number
    calories?: number
  }
  compliance: {
    intensityHit: boolean | null
    targetHit: boolean | null
    score: number
  }
}

export interface WorkoutFatigueSummary {
  level: FatigueLevel
  score: number
  powerDropPct?: number
  paceDropPct?: number
  hrDriftPct?: number
  avgRecoveryHrDrop?: number
  highIntensitySeconds: number
  notes: string[]
}

export interface WorkoutEvaluationSummary {
  name: string
  type: string
  durationSec: number
  distanceMeters?: number
  calories?: number
  avgHr?: number
  maxHr?: number
  avgHrPercentMax?: number
  maxHrPercentMax?: number
  avgPower?: number
  maxPower?: number
  normalizedPower?: number
  avgPaceSecPerKm?: number
  avgPaceSecPer500m?: number
  avgSpeedMps?: number
  avgCadence?: number
  avgStrokeRate?: number
  tss?: number
  trimp?: number
  rpe?: number
  plannedStructure: 'FOCUS_SEGMENTS' | 'HYBRID_ROUNDS' | 'GARMIN_LAPS' | 'DETECTED_INTERVALS' | 'WHOLE_WORKOUT'
  sourceBadges: WorkoutSource[]
}

export interface WorkoutZoneSummary {
  zone1Seconds: number
  zone2Seconds: number
  zone3Seconds: number
  zone4Seconds: number
  zone5Seconds: number
  totalTrackedSeconds: number
  highIntensitySeconds: number
}

export interface WorkoutSourceLink {
  source: WorkoutSource
  id: string
  label?: string
  confidence: EvaluationConfidence
  startedAt: string
  completedAt?: string
}

export interface WorkoutReadinessContext {
  date: string
  readinessScore?: number | null
  readinessLevel?: string | null
  sleepHours?: number | null
  sleepQuality?: number | null
  hrvRMSSD?: number | null
  restingHR?: number | null
  stress?: number | null
}
