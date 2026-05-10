import type { SportType } from '@prisma/client'
import type { TestStage, TestType } from '@/types'

export type FuelingConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type FuelingScenarioKey = 'CONSERVATIVE' | 'RECOMMENDED' | 'AMBITIOUS'

export interface FuelingTestStage extends Pick<
  TestStage,
  'sequence' | 'duration' | 'heartRate' | 'lactate' | 'vo2' | 'speed' | 'power' | 'pace' | 'rer' | 'vco2' | 'fatPercent' | 'choPercent'
> {}

export interface FuelingAthleteProfile {
  weightKg?: number | null
  currentGutToleranceCarbsPerHour?: number | null
}

export interface FuelingRaceGoal {
  sport: SportType | TestType | string
  distanceKm?: number | null
  durationMinutes?: number | null
  targetSpeedKmh?: number | null
  targetPowerWatts?: number | null
  targetPaceMinPerKm?: number | null
}

export interface SubstrateOxidationEstimate {
  carbohydrateGramsPerMinute: number
  carbohydrateGramsPerHour: number
  fatGramsPerMinute: number
  fatGramsPerHour: number
  energyKcalPerHour: number
  method: 'VO2_VCO2' | 'RER_PERCENT'
  isPhysiologicallyReliable: boolean
  warning?: string
}

export interface FuelingScenario {
  key: FuelingScenarioKey
  labelSv: string
  carbsPerHour: number
  totalCarbs: number
  intakeEvery20Min: number
  requiresGutTraining: boolean
  noteSv: string
}

export interface RaceFuelingEstimate {
  sport: string
  estimatedDurationMinutes: number | null
  targetIntensity: number | null
  targetIntensityUnit: string
  carbohydrateDemandPerHour: number | null
  carbohydrateDemandTotal: number | null
  recommendedCarbsPerHour: number | null
  confidence: FuelingConfidence
  scenarios: FuelingScenario[]
  assumptionsSv: string[]
  warningsSv: string[]
  sourceStage?: FuelingTestStage
  sourceOxidation?: SubstrateOxidationEstimate
}
