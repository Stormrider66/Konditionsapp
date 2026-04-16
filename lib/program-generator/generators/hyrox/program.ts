import { logger } from '@/lib/logger'
import type { Client, CreateTrainingProgramDTO } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../../date-utils'
import {
  HYROX_BEGINNER_12_WEEK,
  HYROX_INTERMEDIATE_16_WEEK,
} from '../../templates/hyrox'
import { mapHyroxWeekToWorkouts } from '../../workout-mapper'
import { fetchElitePacesServer, validateEliteZones, type EliteZonePaces } from '../../elite-pace-integration'
import {
  analyzeStationWeaknesses,
  getStrengthRequirements,
  estimateRaceTime,
  getPerformanceLevel,
  formatTime,
  type StationTimes,
  type Gender,
  type PerformanceLevel,
  type Division,
} from '../../hyrox-benchmarks'
import {
  analyzeAthleteProfile,
  scaleRunningVolume,
  type HyroxAthleteProfile,
  type AthleteProfileInput,
} from '../../hyrox-athlete-profiler'
import type { StrengthPRs } from '../../templates/hyrox-strength'
import { createEmptyHyroxProgram } from './empty-program'
import { mapHyroxWorkoutType, mapIntensity, mapPhase, getAthleteTypeLabel } from './mappers'
import { calculateTotalsFromSegments, createRunningSegments } from './running-segments'
import { createStationSegments } from './stations'
import { addStrengthWorkoutsToProgram } from './strength'
import { calculateVDOTFromWizardRace, convertVDOTToEliteZones } from './vdot-paces'
import type { HyroxProgramParams } from './types'

/** Generate a HYROX training program end-to-end. */
export async function generateHyroxProgram(
  params: HyroxProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  logger.debug('[HYROX Generator] Starting program generation', {
    goal: params.goal,
    experienceLevel: params.experienceLevel || 'beginner',
    division: params.hyroxDivision || 'open',
    gender: params.hyroxGender || 'not specified',
  })

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  // ── HYROX station times analysis ────────────────────────────────────
  let weaknessAnalysis: ReturnType<typeof analyzeStationWeaknesses> | null = null
  let raceTimeEstimate: ReturnType<typeof estimateRaceTime> | null = null
  let strengthRequirements: ReturnType<typeof getStrengthRequirements> | null = null
  const programNotes: string[] = []

  if (params.hyroxStationTimes && params.hyroxGender) {
    const stationTimes: StationTimes = {
      skierg: params.hyroxStationTimes.skierg ?? null,
      sledPush: params.hyroxStationTimes.sledPush ?? null,
      sledPull: params.hyroxStationTimes.sledPull ?? null,
      burpeeBroadJump: params.hyroxStationTimes.burpeeBroadJump ?? null,
      rowing: params.hyroxStationTimes.rowing ?? null,
      farmersCarry: params.hyroxStationTimes.farmersCarry ?? null,
      sandbagLunge: params.hyroxStationTimes.sandbagLunge ?? null,
      wallBalls: params.hyroxStationTimes.wallBalls ?? null,
      roxzone: null, // not collected in wizard yet
    }

    const hasAnyTimes = Object.values(stationTimes).some((t) => t !== null)

    if (hasAnyTimes) {
      logger.debug('[HYROX Generator] Station times analysis started')

      const targetLevel: PerformanceLevel =
        params.experienceLevel === 'advanced' ? 'elite'
          : params.experienceLevel === 'intermediate' ? 'advanced'
            : 'intermediate'

      weaknessAnalysis = analyzeStationWeaknesses(
        stationTimes,
        params.hyroxGender as Gender,
        targetLevel
      )

      logger.debug('[HYROX Generator] Weakness analysis completed', {
        targetLevel,
        weakStations: weaknessAnalysis.weakStations.join(', ') || 'None identified',
        strongStations: weaknessAnalysis.strongStations.join(', ') || 'None identified',
      })

      if (weaknessAnalysis.recommendations.length > 0) {
        logger.debug('[HYROX Generator] Recommendations', {
          recommendations: weaknessAnalysis.recommendations,
        })
      }

      if (params.hyroxStationTimes.averageRunPace) {
        raceTimeEstimate = estimateRaceTime(stationTimes, params.hyroxStationTimes.averageRunPace)
        const performanceLevel = getPerformanceLevel(
          raceTimeEstimate.totalTime,
          params.hyroxGender as Gender
        )
        logger.debug('[HYROX Generator] Race time estimate', {
          estimatedRaceTime: raceTimeEstimate.formatted,
          breakdown: {
            running: formatTime(raceTimeEstimate.breakdown.running),
            stations: formatTime(raceTimeEstimate.breakdown.stations),
            transitions: formatTime(raceTimeEstimate.breakdown.transitions),
          },
          currentPerformanceLevel: performanceLevel,
        })
      }

      if (weaknessAnalysis.weakStations.length > 0) {
        const stationLabels: Record<string, string> = {
          skierg: 'SkiErg',
          sledPush: 'Sled Push',
          sledPull: 'Sled Pull',
          burpeeBroadJump: 'Burpee Broad Jump',
          rowing: 'Rowing',
          farmersCarry: 'Farmers Carry',
          sandbagLunge: 'Sandbag Lunge',
          wallBalls: 'Wall Balls',
        }
        const weakLabels = weaknessAnalysis.weakStations.map((s) => stationLabels[s] || s)
        programNotes.push(`⚠️ Prioritera: ${weakLabels.join(', ')}`)
      }

      if (raceTimeEstimate) {
        programNotes.push(`📊 Beräknad tävlingstid: ${raceTimeEstimate.formatted}`)
      }

      logger.debug('[HYROX Generator] Station analysis completed')
    }
  }

  // ── Strength requirements analysis ──────────────────────────────────
  if (params.hyroxGender && params.hyroxBodyweight) {
    strengthRequirements = getStrengthRequirements(
      params.hyroxGender as Gender,
      (params.hyroxDivision || 'open') as Division,
      params.hyroxBodyweight
    )

    const strengthLogContext: Record<string, unknown> = {
      division: params.hyroxDivision || 'open',
      bodyweight: params.hyroxBodyweight,
      minDeadlift: Math.round(strengthRequirements.deadliftMin),
      minSquat: Math.round(strengthRequirements.squatMin),
      recommendation: strengthRequirements.recommendation,
    }

    if (params.strengthPRs) {
      const prStatus: Record<string, unknown> = {}
      if (params.strengthPRs.deadlift) {
        const meets = params.strengthPRs.deadlift >= strengthRequirements.deadliftMin
        prStatus.deadlift = {
          current: params.strengthPRs.deadlift,
          min: Math.round(strengthRequirements.deadliftMin),
          meetsRequirement: meets,
        }
        if (!meets) {
          programNotes.push(
            `💪 Öka marklyft: ${params.strengthPRs.deadlift} → ${Math.round(strengthRequirements.deadliftMin)} kg`
          )
        }
      }
      if (params.strengthPRs.backSquat) {
        const meets = params.strengthPRs.backSquat >= strengthRequirements.squatMin
        prStatus.squat = {
          current: params.strengthPRs.backSquat,
          min: Math.round(strengthRequirements.squatMin),
          meetsRequirement: meets,
        }
        if (!meets) {
          programNotes.push(
            `💪 Öka knäböj: ${params.strengthPRs.backSquat} → ${Math.round(strengthRequirements.squatMin)} kg`
          )
        }
      }
      strengthLogContext.athletePRs = prStatus
    }

    logger.debug('[HYROX Generator] Strength requirements analysis', strengthLogContext)
  }

  // ── Athlete profile analysis ────────────────────────────────────────
  let athleteProfile: HyroxAthleteProfile | null = null
  if (params.hyroxGender) {
    logger.debug('[HYROX Generator] Starting athlete profile analysis')

    const profileInput: AthleteProfileInput = {
      gender: params.hyroxGender as Gender,
      experienceLevel: params.experienceLevel,
      currentWeeklyKm: params.currentWeeklyKm,
      goalTime: params.goalTime,
      hyroxAverageRunPace: params.hyroxStationTimes?.averageRunPace || undefined,
      stationTimes: params.hyroxStationTimes ? {
        skierg: params.hyroxStationTimes.skierg ?? null,
        sledPush: params.hyroxStationTimes.sledPush ?? null,
        sledPull: params.hyroxStationTimes.sledPull ?? null,
        burpeeBroadJump: params.hyroxStationTimes.burpeeBroadJump ?? null,
        rowing: params.hyroxStationTimes.rowing ?? null,
        farmersCarry: params.hyroxStationTimes.farmersCarry ?? null,
        sandbagLunge: params.hyroxStationTimes.sandbagLunge ?? null,
        wallBalls: params.hyroxStationTimes.wallBalls ?? null,
        roxzone: null,
      } : undefined,
    }

    if (params.recentRaceDistance && params.recentRaceDistance !== 'NONE' && params.recentRaceTime) {
      profileInput.recentRaceDistance = params.recentRaceDistance as '5K' | '10K' | 'HALF' | 'MARATHON'
      profileInput.recentRaceTime = params.recentRaceTime
    }

    athleteProfile = analyzeAthleteProfile(profileInput)

    const profileLogContext: Record<string, unknown> = {
      athleteType: athleteProfile.athleteType,
      runnerType: athleteProfile.runnerType,
      stationType: athleteProfile.stationType,
      vdot: athleteProfile.vdot || 'Not calculated',
      volumeScaleFactor: athleteProfile.volumeScaleFactor,
      recommendedWeeklyKm: athleteProfile.recommendedWeeklyKm,
      trainingFocus: athleteProfile.trainingFocus,
    }
    if (athleteProfile.paceDegradation) {
      profileLogContext.paceDegradation = `${athleteProfile.paceDegradation.toFixed(1)}% (${athleteProfile.paceDegradationLevel})`
    }
    if (athleteProfile.goalTimeSeconds) {
      profileLogContext.goalTime = formatTime(athleteProfile.goalTimeSeconds)
      profileLogContext.currentEstimated = athleteProfile.currentEstimatedTime
        ? formatTime(athleteProfile.currentEstimatedTime)
        : 'N/A'
      profileLogContext.goalAssessment = athleteProfile.goalAssessment
    }
    logger.debug('[HYROX Generator] Athlete profile analysis completed', profileLogContext)

    programNotes.push(`🏃 Atletprofil: ${getAthleteTypeLabel(athleteProfile.athleteType)}`)
    programNotes.push(`   ${athleteProfile.profileDescription}`)
    if (athleteProfile.volumeScaleFactor !== 1.0) {
      const scalePercent = Math.round((athleteProfile.volumeScaleFactor - 1) * 100)
      const direction = scalePercent > 0 ? '+' : ''
      programNotes.push(`📊 Volymjustering: ${direction}${scalePercent}% vs standardprogram`)
    }
    if (athleteProfile.goalTimeSeconds && athleteProfile.currentEstimatedTime) {
      programNotes.push(`🎯 ${athleteProfile.goalAssessment}`)
    }
  }

  // ── Elite pace resolution (wizard race → DB fallback) ───────────────
  let elitePaces: EliteZonePaces | null = null

  if (params.recentRaceDistance && params.recentRaceDistance !== 'NONE' && params.recentRaceTime) {
    const vdotFromWizard = calculateVDOTFromWizardRace(params.recentRaceDistance, params.recentRaceTime)
    if (vdotFromWizard) {
      elitePaces = convertVDOTToEliteZones(vdotFromWizard.vdot, vdotFromWizard.paces)
      logger.debug('[HYROX Generator] Paces calculated from wizard race result (VDOT)', {
        race: `${params.recentRaceDistance} in ${params.recentRaceTime}`,
        vdot: vdotFromWizard.vdot,
      })
    }
  }

  if (!elitePaces) {
    try {
      logger.debug('[HYROX Generator] Fetching elite paces from database', { clientId: client.id })
      elitePaces = await fetchElitePacesServer(client.id)

      if (elitePaces && validateEliteZones(elitePaces)) {
        logger.debug('[HYROX Generator] Elite paces fetched from database', {
          source: elitePaces.source,
          confidence: elitePaces.confidence,
        })
      } else {
        logger.debug(
          '[HYROX Generator] No elite paces available - workouts will not include pace targets'
        )
      }
    } catch (error) {
      logger.error('[HYROX Generator] Error fetching elite paces', { clientId: client.id }, error)
    }
  }

  // ── Template selection ─────────────────────────────────────────────
  let template
  if (params.goal === 'beginner' || params.experienceLevel === 'beginner') {
    template = HYROX_BEGINNER_12_WEEK
  } else if (
    params.goal === 'pro' ||
    params.goal === 'age-group' ||
    params.goal === 'intermediate' ||
    params.experienceLevel === 'intermediate' ||
    params.experienceLevel === 'advanced'
  ) {
    template = HYROX_INTERMEDIATE_16_WEEK
  } else if (params.goal === 'custom') {
    return createEmptyHyroxProgram(params, client, startDate, endDate)
  } else {
    template = HYROX_INTERMEDIATE_16_WEEK
  }

  // When detailed strength is enabled, filter out the template's built-in
  // strength workouts so we can replace them in addStrengthWorkoutsToProgram.
  const useDetailedStrength =
    !!params.includeStrength && !!params.strengthSessionsPerWeek && params.strengthSessionsPerWeek > 0

  const volumeScaleFactor = athleteProfile?.volumeScaleFactor ?? 1.0
  const currentAthleteType = athleteProfile?.athleteType ?? 'BALANCED'

  // Use params.durationWeeks rather than template length to respect the
  // user's race date. If durationWeeks < template length, use the last N
  // weeks (peak/taper); otherwise use the full template.
  const targetWeeks = params.durationWeeks
  const templateLength = template.weeks.length
  const totalWeeks = targetWeeks

  logger.debug('[HYROX Generator] Program duration set', { targetWeeks, templateLength })
  if (athleteProfile) {
    logger.debug('[HYROX Generator] Volume scaling applied', {
      athleteType: currentAthleteType,
      volumeScaleFactor,
      currentWeeklyKm: athleteProfile.currentWeeklyKm || 'Not provided',
      recommendedWeeklyKm: athleteProfile.recommendedWeeklyKm,
    })
  }

  const weeksToUse = targetWeeks <= templateLength
    ? template.weeks.slice(templateLength - targetWeeks)
    : template.weeks

  const weeks = weeksToUse.map((week, index) => {
    const weekPhase = mapPhase(week.phase)
    const weekNumber = index + 1

    const days = week.days.map((day) => {
      const filteredWorkouts = day.isRestDay
        ? []
        : day.workouts
            .filter((w) => {
              if (useDetailedStrength && w.type === 'strength') {
                logger.debug('[HYROX Generator] Filtering out template strength workout', {
                  workoutName: w.name,
                })
                return false
              }
              return true
            })
            .map((w) => {
              let scaledDistance = w.runningDistance
              let scaledDuration = w.duration

              if (athleteProfile && w.runningDistance && w.type === 'running') {
                const originalDistanceKm = w.runningDistance / 1000
                const scaledDistanceKm = scaleRunningVolume(
                  originalDistanceKm,
                  volumeScaleFactor,
                  currentAthleteType,
                  weekPhase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
                  weekNumber,
                  totalWeeks
                )
                scaledDistance = Math.round(scaledDistanceKm * 1000)

                if (w.duration && originalDistanceKm > 0) {
                  scaledDuration = Math.round(w.duration * (scaledDistanceKm / originalDistanceKm))
                }
              }

              const segments =
                w.type === 'station_practice' || w.type === 'hyrox_simulation' || w.type === 'mixed'
                  ? createStationSegments(w, params.hyroxDivision, params.hyroxGender, params.experienceLevel)
                  : createRunningSegments(
                      { ...w, runningDistance: scaledDistance, duration: scaledDuration },
                      elitePaces,
                      params.hyroxDivision
                    )

              const calculatedTotals = calculateTotalsFromSegments(segments, scaledDuration, scaledDistance)

              return {
                type: mapHyroxWorkoutType(w.type),
                name: w.name,
                description: w.description,
                intensity: mapIntensity(w.intensity, w.structure),
                duration: calculatedTotals.totalDuration,
                distance: calculatedTotals.totalDistance,
                instructions: w.structure,
                segments,
              }
            })

      return {
        dayNumber: day.dayNumber,
        notes: day.isRestDay ? 'Vilodag' : '',
        workouts: filteredWorkouts,
      }
    })

    let weeklyVolume = 0
    days.forEach((day) => {
      day.workouts.forEach((workout: { type: string; duration?: number }) => {
        if (workout.type === 'RUNNING' && workout.duration) {
          weeklyVolume += workout.duration
        }
      })
    })

    let adjustedFocus = week.focus
    if (athleteProfile) {
      if (currentAthleteType === 'FAST_WEAK') {
        adjustedFocus = `${week.focus} (Fokus: stationsträning)`
      } else if (currentAthleteType === 'SLOW_STRONG') {
        adjustedFocus = `${week.focus} (Fokus: löpvolym)`
      }
    }

    // mapHyroxWeekToWorkouts is used for side effects (logging/validation) by
    // upstream template code; keep the call site in sync with the pre-split
    // version.
    mapHyroxWeekToWorkouts(week)

    return {
      weekNumber: week.weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000),
      phase: weekPhase,
      volume: weeklyVolume,
      focus: adjustedFocus,
      days,
    }
  })

  // ── Optional detailed strength workouts ────────────────────────────
  if (params.includeStrength && params.strengthSessionsPerWeek && params.strengthSessionsPerWeek > 0) {
    const strengthPRs: StrengthPRs = params.strengthPRs || {}
    const weakStationsList = weaknessAnalysis?.weakStations || []

    logger.debug('[HYROX Generator] Adding strength workouts', {
      sessionsPerWeek: params.strengthSessionsPerWeek,
      strengthPRsProvided: Object.keys(strengthPRs).filter((k) => strengthPRs[k as keyof StrengthPRs]),
      weakStationsToPrioritize: weakStationsList.length > 0 ? weakStationsList : 'None',
    })

    addStrengthWorkoutsToProgram(weeks, params.strengthSessionsPerWeek, strengthPRs, weakStationsList)

    logger.debug('[HYROX Generator] Strength workouts added')

    programNotes.push(
      `💪 Styrketräning: ${params.strengthSessionsPerWeek}x/vecka med ${
        Object.keys(strengthPRs).length > 0 ? '% av 1RM' : 'relativ belastning'
      }`
    )
  }

  const goalLabels: Record<string, string> = {
    'beginner': 'Nybörjare',
    'intermediate': 'Mellanliggande',
    'pro': 'Pro Division',
    'age-group': 'Age Group',
    'doubles': 'Doubles',
    'custom': 'Anpassad',
  }

  const baseNotes = params.notes || template.description || 'HYROX-träningsprogram med löpning och funktionella stationer'
  const analysisNotes = programNotes.length > 0 ? '\n\n--- Analys ---\n' + programNotes.join('\n') : ''
  const finalNotes = baseNotes + analysisNotes

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `HYROX ${goalLabels[params.goal] || template.name} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: finalNotes,
    weeks,
  }
}
