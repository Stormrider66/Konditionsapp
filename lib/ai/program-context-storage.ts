import type { SportType } from '@prisma/client'
import type { FitnessEstimate } from '@/lib/training/fitness-estimation'

export interface WizardFormData {
  sport: SportType
  goal: string
  dataSource: 'TEST' | 'PROFILE' | 'MANUAL'
  clientId: string
  clientName: string
  testId?: string
  durationWeeks: number
  targetRaceDate?: Date
  sessionsPerWeek: number
  methodology?: string
  manualFtp?: number
  manualCss?: string
  manualVdot?: number
  weeklyHours?: number
  bikeType?: string
  technique?: string
  poolLength?: string
  experienceLevel?: string
  currentWeeklyVolume?: number
  recentRaceDistance?: string
  recentRaceTime?: string
  targetTime?: string
  includeStrength: boolean
  strengthSessionsPerWeek?: number
  coreSessionsPerWeek?: number
  alternativeTrainingSessionsPerWeek?: number
  scheduleStrengthAfterRunning?: boolean
  scheduleCoreAfterRunning?: boolean
  hasLactateMeter?: boolean
  hasPowerMeter?: boolean
  hyroxStationTimes?: {
    skierg?: string
    sledPush?: string
    sledPull?: string
    burpeeBroadJump?: string
    rowing?: string
    farmersCarry?: string
    sandbagLunge?: string
    wallBalls?: string
    averageRunPace?: string
  }
  hyroxDivision?: string
  hyroxGender?: string
  hyroxBodyweight?: number
  strengthPRs?: {
    deadlift?: number
    backSquat?: number
    benchPress?: number
    overheadPress?: number
    barbellRow?: number
    pullUps?: number
  }
  hockeySettings?: Record<string, unknown> | null
  footballSettings?: Record<string, unknown> | null
  basketballSettings?: Record<string, unknown> | null
  handballSettings?: Record<string, unknown> | null
  floorballSettings?: Record<string, unknown> | null
  volleyballSettings?: Record<string, unknown> | null
  tennisSettings?: Record<string, unknown> | null
  padelSettings?: Record<string, unknown> | null
  notes?: string
  locale?: 'en' | 'sv'
}

export interface TestData {
  id: string
  testDate: Date
  testType: string
  maxHR: number | null
  vo2max: number | null
  maxLactate?: number | null
  qualityReviewStatus?: string | null
  aerobicThreshold: { hr?: number; heartRate?: number; value?: number; unit?: string; lactate?: number } | null
  anaerobicThreshold: { hr?: number; heartRate?: number; value?: number; unit?: string; lactate?: number } | null
  trainingZones?: Array<{
    zone: number
    hrMin: number
    hrMax: number
    percentMin: number
    percentMax: number
    effect?: string
  }> | null
}

export interface RaceResultData {
  raceName: string | null
  raceDate: Date
  distance: string
  timeMinutes: number
  timeFormatted: string | null
  vdot: number | null
  avgHeartRate?: number | null
}

export interface AthleteProfileData {
  name: string
  gender?: string | null
  birthDate?: Date | null
  height?: number | null
  weight?: number | null
  sportProfile?: {
    primarySport: SportType
    runningExperience?: string | null
    cyclingExperience?: string | null
    swimmingExperience?: string | null
    strengthExperience?: string | null
    runningSettings?: Record<string, unknown> | null
    cyclingSettings?: Record<string, unknown> | null
    swimmingSettings?: Record<string, unknown> | null
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

export interface InjuryData {
  injuryType: string
  status: string
  painLevel: number
  affectedArea?: string | null
  assessmentDate: Date
}

export interface PainFollowUpData {
  status: string
  message: string
  resolutionOutcome?: string | null
  actionNote?: string | null
  followUpAt?: Date | string | null
  resolvedAt?: Date | string | null
  actionedAt?: Date | string | null
  createdAt: Date | string
}

export interface ProgramContext {
  wizardData: WizardFormData
  locale?: 'en' | 'sv'
  athlete?: AthleteProfileData
  recentTests?: TestData[]
  raceResults?: RaceResultData[]
  injuries?: InjuryData[]
  painFollowUps?: PainFollowUpData[]
  documentIds?: string[]
  fitnessEstimate?: FitnessEstimate
  hockeySettings?: Record<string, unknown> | null
  footballSettings?: Record<string, unknown> | null
  basketballSettings?: Record<string, unknown> | null
  handballSettings?: Record<string, unknown> | null
  floorballSettings?: Record<string, unknown> | null
  volleyballSettings?: Record<string, unknown> | null
  tennisSettings?: Record<string, unknown> | null
  padelSettings?: Record<string, unknown> | null
}

export function storeProgramContext(context: ProgramContext): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem('ai-studio-program-context', JSON.stringify(context))
  } catch {
    // Session storage is a convenience handoff, not a critical persistence path.
  }
}

export function getProgramContext(): ProgramContext | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem('ai-studio-program-context')
    if (!stored) return null
    return JSON.parse(stored) as ProgramContext
  } catch {
    return null
  }
}

export function clearProgramContext(): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.removeItem('ai-studio-program-context')
  } catch {
    // Ignore storage cleanup failures.
  }
}
