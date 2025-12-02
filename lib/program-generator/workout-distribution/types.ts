// lib/program-generator/workout-distribution/types.ts
// Shared types for workout distribution modules

import { PeriodPhase, Test } from '@/types'
import { MethodologyConfig, AthleteLevel } from '@/lib/training-engine/methodologies'
import { ProgramGenerationParams } from '../index'
import { EliteZonePaces } from '../elite-pace-integration'
import { RaceResultForPace } from '../pace-validator'
import { ProgressivePaces } from '../pace-progression'

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
  weekNumber: number       // Overall week number in program
  totalWeeks: number       // Total weeks in program
  test: Test
  params: ProgramGenerationParams
  elitePaces: EliteZonePaces | null
  recentRaceResult?: RaceResultForPace
  progressivePaces?: ProgressivePaces  // NEW: Progressive pace data
  currentMarathonPaceKmh?: number      // Current fitness pace
  targetMarathonPaceKmh?: number       // Target race pace
}

export interface IntensityDistribution {
  easyWorkouts: number
  moderateWorkouts: number
  hardWorkouts: number
}
