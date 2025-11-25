// lib/program-generator/workout-distribution/types.ts
// Shared types for workout distribution modules

import { PeriodPhase, Test } from '@/types'
import { MethodologyConfig, AthleteLevel } from '@/lib/training-engine/methodologies'
import { ProgramGenerationParams } from '../index'
import { EliteZonePaces } from '../elite-pace-integration'

export interface WorkoutSlot {
  dayNumber: number
  type: string
  params: any
}

export interface WorkoutDistributionParams {
  phase: PeriodPhase
  trainingDays: number
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  goalType: string
  volumePercentage: number
  methodologyConfig: MethodologyConfig
  athleteLevel: AthleteLevel
  weekInPhase: number
  test: Test
  params: ProgramGenerationParams
  elitePaces: EliteZonePaces | null
}

export interface IntensityDistribution {
  easyWorkouts: number
  moderateWorkouts: number
  hardWorkouts: number
}
