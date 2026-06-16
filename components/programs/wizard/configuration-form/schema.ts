import { z } from 'zod'

export const configSchema = z.object({
  clientId: z.string().min(1, 'Choose an athlete'),
  clientIds: z.array(z.string()).optional(),
  assignmentScope: z.enum(['INDIVIDUAL', 'TEAM', 'SELECTED']).optional(),
  teamId: z.string().optional(),
  testId: z.string().optional(),
  hockeyTestId: z.string().optional(),
  hockeyTestIdsByClient: z.record(z.string()).optional(),
  durationWeeks: z.coerce.number().min(4).max(52),
  targetRaceDate: z.date().optional(),
  sessionsPerWeek: z.coerce.number().min(2).max(14),

  // Methodology (for running)
  methodology: z.enum(['AUTO', 'POLARIZED', 'NORWEGIAN', 'NORWEGIAN_SINGLES', 'CANOVA', 'PYRAMIDAL']).optional(),

  // Manual values
  manualFtp: z.coerce.number().optional(),
  manualCss: z.string().optional(),
  manualVdot: z.coerce.number().optional(),

  // Cycling specific
  weeklyHours: z.coerce.number().optional(),
  bikeType: z.enum(['road', 'mtb', 'gravel', 'indoor']).optional(),

  // Skiing specific
  technique: z.enum(['classic', 'skating', 'both']).optional(),

  // Swimming specific
  poolLength: z.enum(['25', '50']).optional(),

  // Court, team and racket sports
  courtPosition: z.string().optional(),
  courtPlayStyle: z.string().optional(),
  seasonPhase: z.enum(['off_season', 'pre_season', 'in_season', 'playoffs', 'tournament']).optional(),
  matchesPerWeek: z.coerce.number().min(0).max(3).optional(),

  // Strength integration
  includeStrength: z.boolean(),
  strengthSessionsPerWeek: z.coerce.number().min(0).max(3),

  // ===== NEW FIELDS =====

  // Athlete Profile (Running/HYROX/Triathlon)
  // 4 tiers aligned with vLT2-based classification:
  // - recreational: vLT2 < 10 km/h, marathon 4:30+
  // - intermediate: vLT2 10-13 km/h, marathon 3:30-4:30
  // - advanced: vLT2 13-16 km/h, marathon 3:00-3:30
  // - elite: vLT2 >= 16 km/h, marathon sub-3h
  experienceLevel: z.enum(['recreational', 'intermediate', 'advanced', 'elite']).optional(),
  currentWeeklyVolume: z.coerce.number().min(0).max(300).optional(),

  // Race Results for VDOT (Running/HYROX/Triathlon - pure running races only)
  recentRaceDistance: z.enum(['NONE', '5K', '10K', 'HALF', 'MARATHON']).optional(),
  recentRaceTime: z.string().optional(), // HH:MM:SS format

  // Target Race Goal Time (for progressive pace calculation)
  targetTime: z.string().optional(), // HH:MM:SS format - the goal time for the target race

  // Core & Alternative Training
  coreSessionsPerWeek: z.coerce.number().min(0).max(7).optional(),
  alternativeTrainingSessionsPerWeek: z.coerce.number().min(0).max(7).optional(),
  scheduleStrengthAfterRunning: z.boolean().optional(),
  scheduleCoreAfterRunning: z.boolean().optional(),

  // Equipment
  hasLactateMeter: z.boolean().optional(),
  hasPowerMeter: z.boolean().optional(), // Cycling/Triathlon only

  // ===== HYROX Station Times (MM:SS format) =====
  hyroxStationTimes: z.object({
    skierg: z.string().optional(),          // 1000m time
    sledPush: z.string().optional(),        // 50m time
    sledPull: z.string().optional(),        // 50m time
    burpeeBroadJump: z.string().optional(), // 80m time
    rowing: z.string().optional(),          // 1000m time
    farmersCarry: z.string().optional(),    // 200m time
    sandbagLunge: z.string().optional(),    // 100m time
    wallBalls: z.string().optional(),       // 75/100 reps time
    averageRunPace: z.string().optional(),  // Average 1km run pace
  }).optional(),

  // HYROX Division
  hyroxDivision: z.enum(['open', 'pro', 'doubles']).optional(),
  hyroxGender: z.enum(['male', 'female']).optional(),
  hyroxBodyweight: z.coerce.number().min(30).max(200).optional(), // kg

  // ===== Strength PRs (kg) =====
  strengthPRs: z.object({
    deadlift: z.coerce.number().optional(),
    backSquat: z.coerce.number().optional(),
    benchPress: z.coerce.number().optional(),
    overheadPress: z.coerce.number().optional(),
    barbellRow: z.coerce.number().optional(),
    pullUps: z.coerce.number().optional(), // max reps
  }).optional(),

  basketballSettings: z.record(z.unknown()).optional(),
  handballSettings: z.record(z.unknown()).optional(),
  floorballSettings: z.record(z.unknown()).optional(),
  volleyballSettings: z.record(z.unknown()).optional(),
  tennisSettings: z.record(z.unknown()).optional(),
  padelSettings: z.record(z.unknown()).optional(),

  notes: z.string().optional(),
})

export type ConfigFormData = z.infer<typeof configSchema>

export type ProgramAssignmentScope = 'INDIVIDUAL' | 'TEAM' | 'SELECTED'

export interface HockeyTestMetricOption {
  key: string
  label: string
  unit: string
  value: number
  lowerIsBetter?: boolean
}

export interface HockeyTestOption {
  id: string
  testDate: Date
  label: string
  metricCount: number
  metrics: HockeyTestMetricOption[]
}

export interface Client {
  id: string
  name: string
  teamId?: string | null
  position?: string | null
  tests: {
    id: string
    testDate: Date
    testType: string
    qualityReviewStatus?: string | null
    qualityWarningCount?: number
  }[]
  hockeyTests?: HockeyTestOption[]
  sportProfile?: {
    hockeySettings?: Record<string, unknown> | null
    footballSettings?: Record<string, unknown> | null
    basketballSettings?: Record<string, unknown> | null
    handballSettings?: Record<string, unknown> | null
    floorballSettings?: Record<string, unknown> | null
    volleyballSettings?: Record<string, unknown> | null
    tennisSettings?: Record<string, unknown> | null
    padelSettings?: Record<string, unknown> | null
  } | null
}

export interface TeamOption {
  id: string
  name: string
  sportType?: import('@prisma/client').SportType | null
  members: Array<{
    id: string
    name: string
    position?: string | null
  }>
}

// Calendar constraints API response
export interface CalendarConstraintsResponse {
  constraints: {
    blockedDates: string[]
    reducedDates: string[]
    altitudePeriods: { start: string; end: string; altitude: number; phase: string }[]
    illnessRecoveryPeriods: { start: string; end: string; returnDate: string }[]
  }
  availability: {
    totalDays: number
    availableCount: number
    blockedCount: number
    reducedCount: number
    availablePercent: number
  }
  recommendation: {
    shouldUse: boolean
    reason: string
    hasBlockers: boolean
    hasAltitude: boolean
    hasIllness: boolean
  }
  upcomingEvents?: {
    title: string
    type: string
    startDate: string
    endDate: string
    impact: string
  }[]
}



export interface ConfigurationFormProps {
  sport: import('@prisma/client').SportType
  goal: string
  dataSource: import('../DataSourceSelector').DataSourceType
  clients: Client[]
  teams?: TeamOption[]
  selectedTeamId?: string
  onTeamChange?: (teamId: string) => void
  selectedClientId?: string
  onClientChange?: (clientId: string) => void
  onSubmit: (data: ConfigFormData) => Promise<void>
  isSubmitting: boolean
}
