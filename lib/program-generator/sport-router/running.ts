import { logger } from '@/lib/logger'
import type { Client, Test, CreateTrainingProgramDTO } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { generateBaseProgram, type ProgramGenerationParams } from '../index'
import { calculatePhases } from '../periodization'
import type { PaceProgression, SportProgramParams } from './types'
import { calculateProgressivePace, createProgressiveWeeks } from './progressive-weeks'
import { estimateMarathonPace, calculateTargetPace, formatPaceMinKm } from './training-paces'


/**
 * Generate running program using existing generator
 */
export async function generateRunningProgram(
  params: SportProgramParams,
  client: Client,
  test?: Test
): Promise<CreateTrainingProgramDTO> {
  // Map goal to legacy goalType
  const goalTypeMap: Record<string, ProgramGenerationParams['goalType']> = {
    'marathon': 'marathon',
    'half-marathon': 'half-marathon',
    '10k': '10k',
    '5k': '5k',
    'custom': 'custom',
  }

  const runningParams: ProgramGenerationParams = {
    testId: params.testId || '',
    clientId: params.clientId,
    coachId: params.coachId,
    goalType: goalTypeMap[params.goal] || 'fitness',
    durationWeeks: params.durationWeeks,
    trainingDaysPerWeek: params.sessionsPerWeek,
    experienceLevel: params.experienceLevel || 'intermediate',
    targetRaceDate: params.targetRaceDate,
    targetTime: params.targetTime, // Goal time for progressive pace calculation
    notes: params.notes,
    methodology: params.methodology as any,
    strengthSessionsPerWeek: params.includeStrength ? (params.strengthSessionsPerWeek || 2) : 0,
    // New fields from wizard
    currentWeeklyVolume: params.currentWeeklyVolume,
    longestLongRun: params.longestLongRun,
    yearsRunning: params.yearsRunning,
    recentRaceDistance: params.recentRaceDistance,
    recentRaceTime: params.recentRaceTime,
    coreSessionsPerWeek: params.coreSessionsPerWeek,
    alternativeTrainingSessionsPerWeek: params.alternativeTrainingSessionsPerWeek,
    scheduleStrengthAfterRunning: params.scheduleStrengthAfterRunning,
    scheduleCoreAfterRunning: params.scheduleCoreAfterRunning,
    hasLactateMeter: params.hasLactateMeter,
    hasHRVMonitor: params.hasHRVMonitor,
  }

  if (!test && params.dataSource === 'TEST') {
    throw new Error('Test required for test-based running program')
  }

  // For MANUAL or PROFILE data source without test, create custom program
  if (!test) {
    return createCustomRunningProgram(params, client)
  }

  return generateBaseProgram(test, client, runningParams)
}

/**
 * Generate custom running program without test data
 * Creates actual workouts based on methodology and athlete profile
 */
export function createCustomRunningProgram(
  params: SportProgramParams,
  client: Client
): CreateTrainingProgramDTO {
  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  const goalLabels: Record<string, string> = {
    'marathon': 'Marathon',
    'half-marathon': 'Halvmaraton',
    '10k': '10K',
    '5k': '5K',
    'custom': 'Anpassad',
  }

  const goalLabel = goalLabels[params.goal] || params.goal

  // Calculate current fitness pace from PB/recent race
  const currentFitnessPaceKmh = estimateMarathonPace(
    params.experienceLevel || 'intermediate',
    params.currentWeeklyVolume,
    params.recentRaceDistance,
    params.recentRaceTime
  )

  // Calculate target pace from goal time if provided
  let targetPaceKmh: number | null = null
  if (params.targetTime && params.goal) {
    targetPaceKmh = calculateTargetPace(params.goal, params.targetTime)
  }

  // Create progressive pace configuration
  const paceProgression: PaceProgression = {
    currentPaceKmh: currentFitnessPaceKmh,
    targetPaceKmh: targetPaceKmh || currentFitnessPaceKmh,
    totalWeeks: params.durationWeeks,
  }

  // Get methodology-specific phase distribution for logging
  const methodology = params.methodology?.toUpperCase() || 'POLARIZED'
  const previewPhases = calculatePhases(params.durationWeeks, methodology)

  const progressivePaceContext: Record<string, unknown> = {
    currentFitness: formatPaceMinKm(currentFitnessPaceKmh)
  }
  if (targetPaceKmh && targetPaceKmh !== currentFitnessPaceKmh) {
    const gapSeconds = (60 / currentFitnessPaceKmh - 60 / targetPaceKmh) * 60
    const buildMidWeek = Math.floor(previewPhases.build / 2)
    const midPace = calculateProgressivePace(paceProgression, buildMidWeek, previewPhases.build, 'BUILD')
    const midWeekOverall = previewPhases.base + buildMidWeek
    progressivePaceContext.targetGoal = formatPaceMinKm(targetPaceKmh)
    progressivePaceContext.gapToCloseSeconds = gapSeconds.toFixed(0)
    progressivePaceContext.weeks = params.durationWeeks
    progressivePaceContext.week1BasePace = formatPaceMinKm(currentFitnessPaceKmh)
    progressivePaceContext.buildMidWeek = midWeekOverall
    progressivePaceContext.buildMidPace = formatPaceMinKm(midPace)
    progressivePaceContext.peakWeek = params.durationWeeks - previewPhases.taper
    progressivePaceContext.peakPace = formatPaceMinKm(targetPaceKmh)
  }
  logger.debug('[Custom Running] Creating program', {
    methodology,
    sessionsPerWeek: params.sessionsPerWeek,
    phaseDistribution: {
      base: previewPhases.base,
      build: previewPhases.build,
      peak: previewPhases.peak,
      taper: previewPhases.taper
    },
    progressivePacePlan: progressivePaceContext
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${goalLabel} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Löpprogram för ${goalLabel.toLowerCase()}`,
    weeks: createProgressiveWeeks(
      params.durationWeeks,
      startDate,
      params.sessionsPerWeek,
      paceProgression,
      params.goal,
      methodology,
      params.targetRaceDate,
      {
        strengthSessionsPerWeek: params.strengthSessionsPerWeek,
        coreSessionsPerWeek: params.coreSessionsPerWeek,
        scheduleStrengthAfterRunning: params.scheduleStrengthAfterRunning,
        scheduleCoreAfterRunning: params.scheduleCoreAfterRunning,
      },
      // Methodology context for LT2-based and MP-based pacing
      {
        test: undefined,  // No test in custom program - will use race result estimates
        experienceLevel: params.experienceLevel,
        currentWeeklyVolume: params.currentWeeklyVolume,
        recentRaceDistance: params.recentRaceDistance,
        recentRaceTime: params.recentRaceTime,
      }
    ),
  }
}

