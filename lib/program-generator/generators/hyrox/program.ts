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
import { mapHyroxWorkoutType, mapIntensity, mapPhase, getAthleteTypeLabel, type AppLocale } from './mappers'
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
  const locale: AppLocale = params.locale === 'sv' ? 'sv' : 'en'

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
        programNotes.push(`${t(locale, 'Prioritize', 'Prioritera')}: ${weakLabels.join(', ')}`)
      }

      if (raceTimeEstimate) {
        programNotes.push(`${t(locale, 'Estimated race time', 'Beräknad tävlingstid')}: ${raceTimeEstimate.formatted}`)
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
            `${t(locale, 'Increase deadlift', 'Öka marklyft')}: ${params.strengthPRs.deadlift} -> ${Math.round(strengthRequirements.deadliftMin)} kg`
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
            `${t(locale, 'Increase back squat', 'Öka knäböj')}: ${params.strengthPRs.backSquat} -> ${Math.round(strengthRequirements.squatMin)} kg`
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

    programNotes.push(`${t(locale, 'Athlete profile', 'Atletprofil')}: ${getAthleteTypeLabel(athleteProfile.athleteType, locale)}`)
    programNotes.push(`   ${localizeHyroxAnalysisText(athleteProfile.profileDescription, locale)}`)
    if (athleteProfile.volumeScaleFactor !== 1.0) {
      const scalePercent = Math.round((athleteProfile.volumeScaleFactor - 1) * 100)
      const direction = scalePercent > 0 ? '+' : ''
      programNotes.push(`${t(locale, 'Volume adjustment', 'Volymjustering')}: ${direction}${scalePercent}% vs ${t(locale, 'standard program', 'standardprogram')}`)
    }
    if (athleteProfile.goalTimeSeconds && athleteProfile.currentEstimatedTime) {
      programNotes.push(localizeHyroxAnalysisText(athleteProfile.goalAssessment, locale))
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
                  ? createStationSegments(w, params.hyroxDivision, params.hyroxGender, params.experienceLevel, locale)
                  : createRunningSegments(
                      {
                        ...w,
                        name: localizeHyroxTemplateText(w.name, locale),
                        runningDistance: scaledDistance,
                        duration: scaledDuration,
                      },
                      elitePaces,
                      params.hyroxDivision,
                      locale
                    )

              const calculatedTotals = calculateTotalsFromSegments(segments, scaledDuration, scaledDistance)

              return {
                type: mapHyroxWorkoutType(w.type),
                name: localizeHyroxTemplateText(w.name, locale),
                description: localizeHyroxTemplateText(w.description, locale),
                intensity: mapIntensity(w.intensity, w.structure),
                duration: calculatedTotals.totalDuration,
                distance: calculatedTotals.totalDistance,
                instructions: w.structure ? localizeHyroxTemplateText(w.structure, locale) : undefined,
                segments,
              }
            })

      return {
        dayNumber: day.dayNumber,
        notes: day.isRestDay ? t(locale, 'Rest day', 'Vilodag') : '',
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
        adjustedFocus = `${week.focus} (${t(locale, 'Focus: station training', 'Fokus: stationsträning')})`
      } else if (currentAthleteType === 'SLOW_STRONG') {
        adjustedFocus = `${week.focus} (${t(locale, 'Focus: running volume', 'Fokus: löpvolym')})`
      }
    }
    adjustedFocus = localizeHyroxTemplateText(adjustedFocus, locale)

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

    addStrengthWorkoutsToProgram(weeks, params.strengthSessionsPerWeek, strengthPRs, weakStationsList, locale)

    logger.debug('[HYROX Generator] Strength workouts added')

    programNotes.push(
      `${t(locale, 'Strength training', 'Styrketräning')}: ${params.strengthSessionsPerWeek}x/${t(locale, 'week', 'vecka')} ${t(locale, 'with', 'med')} ${
        Object.keys(strengthPRs).length > 0 ? '% of 1RM' : t(locale, 'relative loading', 'relativ belastning')
      }`
    )
  }

  const goalLabels: Record<string, { en: string; sv: string }> = {
    'beginner': { en: 'Beginner', sv: 'Nybörjare' },
    'intermediate': { en: 'Intermediate', sv: 'Mellanliggande' },
    'pro': { en: 'Pro Division', sv: 'Pro Division' },
    'age-group': { en: 'Age Group', sv: 'Age Group' },
    'doubles': { en: 'Doubles', sv: 'Doubles' },
    'custom': { en: 'Custom', sv: 'Anpassad' },
  }

  const goalLabel = goalLabels[params.goal]?.[locale] || localizeHyroxTemplateText(template.name, locale)
  const baseNotes = params.notes || localizeHyroxTemplateText(template.description, locale) || t(locale, 'HYROX training program with running and functional stations', 'HYROX-träningsprogram med löpning och funktionella stationer')
  const analysisNotes = programNotes.length > 0 ? `\n\n--- ${t(locale, 'Analysis', 'Analys')} ---\n` + programNotes.join('\n') : ''
  const finalNotes = baseNotes + analysisNotes

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `HYROX ${goalLabel} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: finalNotes,
    weeks,
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const HYROX_TEMPLATE_TRANSLATIONS: Record<string, string> = {
  'Styrketräning för HYROX': 'Strength training for HYROX',
  'Aktiv återhämtning eller vila': 'Active recovery or rest',
  'HYROX Nybörjarplan': 'HYROX Beginner Plan',
  '12 veckors program för din första HYROX. Bygger upp löpkapacitet och introducerar alla stationer gradvis.': '12-week program for your first HYROX. Builds running capacity and introduces all stations gradually.',
  'Fullföra under 90 min': 'Finish under 90 min',
  'Introduktion till HYROX-format': 'Introduction to the HYROX format',
  'Lugn löpning': 'Easy run',
  'Intervalträning': 'Interval training',
  'SkiErg & Rodd intro': 'SkiErg & rowing intro',
  'Lång lugn löpning': 'Long easy run',
  'Bygga löpbas och stationsteknik': 'Build running base and station technique',
  'Tempo-löpning': 'Tempo run',
  'Introduktion till släde och bärövningar': 'Introduction to sled and carry work',
  'Alla stationer introducerade': 'All stations introduced',
  'Teknik för burpee broad jump och walking lunges': 'Technique for burpee broad jump and walking lunges',
  'Återhämtningsvecka': 'Recovery week',
  'Lätt löpning': 'Easy run',
  'Lätt styrka': 'Light strength',
  'Wall Balls intro': 'Wall balls intro',
  'Öka intensitet och volym': 'Increase intensity and volume',
  'Halv HYROX': 'Half HYROX',
  'Lång löpning': 'Long run',
  'Stationsuthållighet': 'Station endurance',
  'Överkropp & Core': 'Upper body & core',
  'Roxzone-träning': 'Roxzone training',
  'HYROX-specifik': 'HYROX-specific',
  'Teknikfokus': 'Technique focus',
  'Lätt lång löpning': 'Light long run',
  'Race-pace löpning': 'Race-pace running',
  'Återhämtningslöpning': 'Recovery run',
  'Race-pace stationer': 'Race-pace stations',
  'Underhållsstyrka': 'Maintenance strength',
  'Nedtrappning - behåll intensitet, minska volym': 'Taper - keep intensity, reduce volume',
  'Stationsgenomgång': 'Station walkthrough',
  'Lätt tempo': 'Light tempo',
  'Aktivering': 'Activation',
  'Kort löpning': 'Short run',
  'Tävlingsvecka': 'Race week',
  'Lätt shakeout': 'Easy shakeout',
  'Mini-aktivering': 'Mini activation',
  'Tävlingsdag! Ge allt du har!': 'Race day! Give it everything you have!',
  'HYROX Medelplan': 'HYROX Intermediate Plan',
  '16 veckors program för erfarna atleter som vill förbättra sin HYROX-tid. Fokus på specifika svagheter och race-strategi.': '16-week program for experienced athletes who want to improve their HYROX time. Focus on specific weaknesses and race strategy.',
  'Återhämtning': 'Recovery',
  'Bygga konditionsbas': 'Build aerobic base',
  'HYROX-specifik träning': 'HYROX-specific training',
  'Sista simuleringen': 'Final simulation',
  'Maximal HYROX-förberedelse': 'Maximum HYROX preparation',
  'Nedtrappning med bibehållen intensitet': 'Taper while maintaining intensity',
  'Tävlingsvecka - prestera!': 'Race week - perform!',
  'Tempolöpning': 'Tempo run',
  'Stationsträning': 'Station training',
  'Lätt stationsarbete': 'Light station work',
  'Stationer 1-4 + 4x1km löpning': 'Stations 1-4 + 4x1 km running',
  'Stationer 5-8': 'Stations 5-8',
  'Lätt jogg': 'Easy jog',
  'Tävlingsdag - KROSSA DIN MÅLTID!': 'Race day - crush your target!',
}

function localizeHyroxTemplateText(text: string | undefined, locale: AppLocale): string {
  if (!text || locale === 'sv') return text || ''

  return (HYROX_TEMPLATE_TRANSLATIONS[text] || text)
    .replace(/(\d+(?:\.\d+)?)km löpning/g, '$1 km running')
    .replace(/(\d+) stationer \+ (\d+)x1km löpning/g, '$1 stations + $2x1 km running')
    .replace(/(\d+) min lugnt, (\d+) min hårt x (\d+)/g, '$1 min easy, $2 min hard x $3')
    .replace(/(\d+)km lugnt, (\d+)m hårt x (\d+)/g, '$1 km easy, $2 m hard x $3')
    .replace(/ med (\d+)s vila/g, ' with $1s rest')
    .replace(/ med (\d+) min vila/g, ' with $1 min rest')
    .replace(/x(\d+) varv/g, 'x$1 rounds')
    .replace(/målpace/g, 'target pace')
    .replace(/Lätta övningar/g, 'light exercises')
    .replace(/Dynamiska övningar/g, 'dynamic exercises')
    .replace(/Focus på/g, 'Focus on')
    .replace(/Fokus på/g, 'Focus on')
    .replace(/Teknikfokus på/g, 'Technique focus on')
    .replace(/svaga stationer/g, 'weak stations')
    .replace(/senare stationer/g, 'later stations')
    .replace(/lätt jogg/g, 'easy jog')
    .replace(/lätt/g, 'easy')
    .replace(/hårt/g, 'hard')
    .replace(/ och /g, ' and ')
    .replace(/släde/g, 'sled')
    .replace(/bärövningar/g, 'carry work')
    .replace(/löpning/g, 'running')
    .replace(/stationer/g, 'stations')
    .replace(/varv/g, 'rounds')
    .replace(/vila/g, 'rest')
}

function localizeHyroxAnalysisText(text: string, locale: AppLocale): string {
  if (locale === 'sv') return text

  return text
    .replace('Din löpkapacitet är stark, men stationerna bromsar dig. Fokusera på stationsträning och "kompromisslöpning" efter stationer.', 'Your running capacity is strong, but the stations are slowing you down. Focus on station training and compromised running after stations.')
    .replace('Dina stationer är effektiva, men löpningen begränsar din totaltid. Öka löpvolymen och laktattröskelträning.', 'Your stations are efficient, but running limits your total time. Increase running volume and lactate-threshold training.')
    .replace('Både löpning och stationer behöver utvecklas. Bygg gradvis upp kapacitet på båda fronterna.', 'Both running and stations need development. Build capacity gradually in both areas.')
    .replace('Balanserad profil med jämn fördelning mellan löpning och stationer.', 'Balanced profile with an even split between running and stations.')
    .replace('Ingen måltid angiven', 'No target time provided')
    .replace('Kunde inte tolka måltid', 'Could not parse target time')
    .replace('Du är redan', 'You are already')
    .replace('under måltiden', 'under the target time')
    .replace('Målet är nåbart', 'The goal is achievable')
    .replace('Ambitiöst mål', 'Ambitious goal')
    .replace('Mycket ambitiöst', 'Very ambitious')
    .replace('Orealistiskt mål', 'Unrealistic goal')
    .replace('att förbättra', 'to improve')
    .replace('Möjligt med dedikerad träning.', 'Possible with dedicated training.')
    .replace('Kan kräva längre förberedelse.', 'May require a longer preparation period.')
    .replace('Överväg ett närmare delmål.', 'Consider a closer intermediate target.')
    .replace('Måltid:', 'Target time:')
    .replace('Ange stationstider för fullständig analys.', 'Enter station times for a full analysis.')
}
