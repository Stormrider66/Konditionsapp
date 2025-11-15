/**
 * Training Methodology Type Definitions
 */

export type MethodologyType = 'POLARIZED' | 'NORWEGIAN' | 'CANOVA' | 'PYRAMIDAL'
export type AthleteLevel = 'BEGINNER' | 'RECREATIONAL' | 'ADVANCED' | 'ELITE'
export type TrainingPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY'
export type GoalDistance = '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'ULTRAMARATHON' | 'GENERAL_FITNESS'

export interface ZoneDistribution3 {
  zone1Percent: number  // Below LT1
  zone2Percent: number  // Between LT1 and LT2
  zone3Percent: number  // Above LT2
}

export interface ZoneDistribution5 {
  zone1Percent: number
  zone2Percent: number
  zone3Percent: number
  zone4Percent: number
  zone5Percent: number
}

export interface AthleteCategory {
  level: AthleteLevel
  vo2max: number
  lt2PercentOfVO2max: number
  lactateProfile: 'POOR' | 'AVERAGE' | 'GOOD' | 'EXCELLENT'
  reasoning: string[]
}

export interface MethodologySelection {
  recommended: MethodologyType
  alternatives: MethodologyType[]
  rationale: string
  prerequisites: {
    met: string[]
    missing: string[]
  }
  warnings: string[]
}

export interface WeeklyStructure {
  totalSessions: number
  easyRuns: number
  qualitySessions: number
  longRun: boolean
  doubleThresholdDays?: number
  restDays: number
}

export interface MethodologyConfig {
  type: MethodologyType
  name: string
  description: string
  zoneDistribution3?: ZoneDistribution3
  zoneDistribution5?: ZoneDistribution5
  weeklyStructure: WeeklyStructure
  minWeeklySessions: number
  maxWeeklySessions: number
  requiresLactateTest: boolean
  targetDistances: GoalDistance[]
  minAthleteLevel: AthleteLevel
  deloadFrequencyWeeks: number
  volumeReductionPercent: number
  strengths: string[]
  limitations: string[]
}
