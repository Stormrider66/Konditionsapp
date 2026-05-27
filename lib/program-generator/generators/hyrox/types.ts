export interface HyroxProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  locale?: 'en' | 'sv'
  notes?: string
  targetRaceDate?: Date
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  includeStrength?: boolean
  strengthSessionsPerWeek?: number

  // Race results for VDOT calculation (pure running races only, NOT HYROX times).
  recentRaceDistance?: 'NONE' | '5K' | '10K' | 'HALF' | 'MARATHON'
  recentRaceTime?: string // HH:MM:SS or MM:SS format
  currentWeeklyKm?: number
  /** Target HYROX total time, H:MM:SS format. */
  goalTime?: string

  hyroxStationTimes?: {
    skierg?: number | null
    sledPush?: number | null
    sledPull?: number | null
    burpeeBroadJump?: number | null
    rowing?: number | null
    farmersCarry?: number | null
    sandbagLunge?: number | null
    wallBalls?: number | null
    averageRunPace?: number | null
  }

  hyroxDivision?: 'open' | 'pro' | 'doubles'
  hyroxGender?: 'male' | 'female'
  hyroxBodyweight?: number

  /** 1RM or max reps (for pull-ups). */
  strengthPRs?: {
    deadlift?: number
    backSquat?: number
    benchPress?: number
    overheadPress?: number
    barbellRow?: number
    pullUps?: number
  }
}
