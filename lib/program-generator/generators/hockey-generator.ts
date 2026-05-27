import type { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, PeriodPhase, WorkoutIntensity } from '@/types'
import { getProgramEndDate, getProgramStartDate } from '../date-utils'
import type { SportProgramParams } from '../sport-router/types'
import {
  type HockeyPosition,
  type SeasonPhase,
} from '@/lib/training-engine/hockey'
import { logger } from '@/lib/logger'
import { buildHockeyPlanningContext, type HockeyPlanningContext } from '../team-sports/planning-context'
import { buildHockeyPlanningMetadata, type HockeyTestPlanningMetadata } from '../team-sports/planning-metadata'

const DAY_MS = 24 * 60 * 60 * 1000
type AppLocale = 'en' | 'sv'

export async function generateHockeyProgram(
  params: SportProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  const locale: AppLocale = params.locale === 'sv' ? 'sv' : 'en'
  const planning = buildHockeyPlanningContext({ ...params, locale })
  const testEvidence = buildHockeyTestEvidence(params, locale)
  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  logger.debug('Starting hockey program generation', {
    goal: params.goal,
    position: planning.position,
    phase: planning.phase,
    requestedSessions: planning.requestedSessions,
    matchesThisWeek: planning.matchesThisWeek,
  })

  const weeks = Array.from({ length: params.durationWeeks }).map((_, index) => {
    const weekNumber = index + 1
    const periodPhase = getProgramPhase(weekNumber, params.durationWeeks)
    const intensityFactor = getWeekIntensityFactor(weekNumber, params.durationWeeks, params.goal) * planning.loadGuidance.intensityMultiplier
    const days = buildHockeyWeek({
      goal: params.goal,
      phase: planning.phase,
      position: planning.position,
      requestedSessions: planning.requestedSessions,
      hasIce: planning.settings.hasAccessToIce !== false,
      hasGym: planning.settings.hasAccessToGym !== false,
      matchesThisWeek: planning.matchesThisWeek,
      profile: planning.profile,
      phaseTraining: planning.phaseTraining,
      prevention: planning.prevention,
      strengthSessions: planning.trainingLoad.strengthSessions,
      conditioningSessions: planning.trainingLoad.conditioningSessions,
      intensityFactor,
      loadNotes: [...planning.loadGuidance.notes, ...testEvidence.notes],
      testPriorities: testEvidence.priorities,
      locale,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * DAY_MS),
      phase: periodPhase,
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: `${planning.phaseTraining.primaryGoals[0] || t(locale, 'Ice hockey', 'Ishockey')} - ${planning.profile.primaryConditioningFocus[0] || planning.position}`,
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: params.testId,
    name: `${hockeyGoalLabel(params.goal, locale)} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || [
      planning.profile.description,
      t(locale, 'The program is guided by season phase, match load, and position-specific injury prevention.', 'Programmet styrs av säsongsfas, matchbelastning och positionsspecifik skadeprevention.'),
      testEvidence.notes.length > 0
        ? `${t(locale, 'Hockey test evidence', 'Hockeytest som underlag')}: ${testEvidence.notes.join(' ')}`
        : '',
      ...planning.trainingLoad.notes,
      ...planning.loadGuidance.notes,
    ].filter(Boolean).join(' '),
    planningMetadata: buildHockeyPlanningMetadata(planning, testEvidence.availableMetrics.length > 0 ? testEvidence : undefined),
    weeks,
  }
}

function buildHockeyTestEvidence(
  params: SportProgramParams,
  locale: AppLocale
): HockeyTestPlanningMetadata {
  const metrics = params.hockeyTestMetrics ?? {}
  const availableMetrics = Object.entries(metrics)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([key]) => key)
  const priorities: string[] = []
  const notes: string[] = []

  const hasAny = (keys: string[]) => keys.some((key) => typeof metrics[key] === 'number' && Number.isFinite(metrics[key]))
  const value = (key: string) => {
    const raw = metrics[key]
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
  }

  if (hasAny(['sprint5m', 'sprint10m', 'sprint20m', 'sprint30m', 'sprint20mFly', 'sprint30mFly'])) {
    priorities.push(t(locale, 'acceleration and top-speed exposure', 'acceleration och toppfartsexponering'))
    notes.push(t(locale, 'Ice sprint data is included for speed-dose decisions.', 'Issprintdata tas med för dosering av snabbhet.'))
  }

  if (hasAny(['agilityBest'])) {
    priorities.push(t(locale, '5-10-5 change-of-direction quality', '5-10-5 och riktningsförändring'))
    notes.push(t(locale, '5-10-5 agility data is included for lateral power and braking work.', '5-10-5-agility tas med för lateral power och bromsarbete.'))
  }

  if (hasAny(['endurance7x40Best', 'endurance7x40Average', 'endurance7x40AverageKmh', 'endurance7x40Drop', 'endurance7x40Score'])) {
    priorities.push(t(locale, 'repeated-sprint durability', 'upprepad sprintförmåga'))
    const drop = value('endurance7x40Drop')
    notes.push(drop != null && drop >= 8
      ? t(locale, '7x40 drop is elevated: keep repeated-sprint work high quality with enough recovery.', '7x40-drop är förhöjt: håll repeated-sprint-arbetet kvalitativt med tillräcklig vila.')
      : t(locale, '7x40 repeated-sprint data is included for conditioning volume.', '7x40-data tas med för konditionsvolym.'))
  }

  if (hasAny(['muscleLabWkg', 'backSquat1RM', 'powerClean1RM', 'benchPress1RM', 'pullUp1RM', 'standingLongJump', 'threeJumpBest', 'wingate30sAveragePower'])) {
    priorities.push(t(locale, 'strength and power transfer', 'styrka och poweröverföring'))
    notes.push(t(locale, 'Strength, jump, MuscleLab, or Wingate data is included for gym and power emphasis.', 'Styrke-, hopp-, MuscleLab- eller Wingatedata tas med för gym- och powerfokus.'))
  }

  if (hasAny(['beepScore', 'vo2Max', 'lt1SpeedKmh', 'lt2SpeedKmh', 'lt1HeartRate', 'lt2HeartRate', 'maxHeartRate'])) {
    priorities.push(t(locale, 'aerobic support for shift recovery', 'aerobt stöd för återhämtning mellan byten'))
    notes.push(t(locale, 'Aerobic ramp, LT, VO2max, or beep-test data is included for recovery and conditioning intensity.', 'Ramp-, LT-, VO2max- eller beeptestdata tas med för återhämtning och konditionsintensitet.'))
  }

  return {
    testId: params.hockeyTestId,
    testDate: params.hockeyTestDate?.toISOString(),
    availableMetrics,
    priorities: Array.from(new Set(priorities)),
    notes,
  }
}

function buildHockeyWeek(input: {
  goal: string
  phase: SeasonPhase
  position: HockeyPosition
  requestedSessions: number
  hasIce: boolean
  hasGym: boolean
  matchesThisWeek: number
  profile: HockeyPlanningContext['profile']
  phaseTraining: HockeyPlanningContext['phaseTraining']
  prevention: HockeyPlanningContext['prevention']
  strengthSessions: number
  conditioningSessions: number
  intensityFactor: number
  loadNotes: string[]
  testPriorities: string[]
  locale: AppLocale
}): CreateTrainingDayDTO[] {
  const days: CreateTrainingDayDTO[] = Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: '',
    workouts: [],
  }))

  if (input.phase === 'in_season' || input.phase === 'playoffs' || input.matchesThisWeek >= 2) {
    days[0] = withWorkout(1, recoveryWorkout(t(input.locale, 'Post-match recovery', 'Återhämtning efter match'), t(input.locale, 'Easy bike/walk, mobility, and fluids/nutrition.', 'Lätt cykel/promenad, mobilitet och vätska/nutrition.')))
    days[1] = input.hasGym
      ? withWorkout(2, strengthWorkout(t(input.locale, 'Short strength/prehab', 'Kort styrka/prehab'), input.profile.primaryStrengthFocus, input.prevention, 'MODERATE', input.position, input.locale))
      : withWorkout(2, mobilityWorkout(t(input.locale, 'Prehab and mobility', 'Prehab och mobilitet'), input.prevention, input.position, input.locale))
    days[2] = input.hasIce
      ? withWorkout(3, iceWorkout(t(input.locale, 'Ice: technique and match tempo', 'Is: teknik och matchtempo'), input.position, input.intensityFactor, input.locale, input.loadNotes))
      : withWorkout(3, conditioningWorkout(t(input.locale, 'Shift intervals off-ice', 'Bytesintervaller off-ice'), input.position, input.intensityFactor, input.locale, input.loadNotes))
    days[4] = withWorkout(5, activationWorkout(t(input.locale, 'Match-prep activation', 'Matchförberedande aktivering'), input.position, input.locale))
    days[5] = withWorkout(6, matchWorkout(t(input.locale, 'Match', 'Match'), input.position, input.locale))
    if (input.matchesThisWeek >= 2) {
      days[6] = withWorkout(7, matchWorkout('Match 2', input.position, input.locale))
    }
    return trimToSessions(days, Math.max(2, Math.min(input.requestedSessions, input.matchesThisWeek >= 2 ? 5 : 4)), [6, 7, 5, 2, 3, 1], input.locale)
  }

  days[0] = input.hasGym
    ? withWorkout(1, strengthWorkout(t(input.locale, 'Maximum strength and acceleration', 'Maxstyrka och acceleration'), input.profile.primaryStrengthFocus, input.prevention, 'THRESHOLD', input.position, input.locale))
    : withWorkout(1, mobilityWorkout(t(input.locale, 'Prehab and mobility', 'Prehab och mobilitet'), input.prevention, input.position, input.locale))
  days[1] = withWorkout(2, conditioningWorkout(t(input.locale, 'Hockey-specific conditioning', 'Hockeyspecifik kondition'), input.position, input.intensityFactor, input.locale, input.loadNotes))
  days[2] = withWorkout(3, recoveryWorkout(t(input.locale, 'Active recovery', 'Aktiv återhämtning'), t(input.locale, 'Easy aerobic activity and mobility.', 'Lätt aerob aktivitet och rörlighet.')))
  days[3] = withWorkout(4, powerWorkout(input.position, input.locale, input.testPriorities))
  days[4] = input.hasIce
    ? withWorkout(5, iceWorkout(t(input.locale, 'Ice: skills and high speed', 'Is: skills och hög fart'), input.position, input.intensityFactor, input.locale))
    : withWorkout(5, conditioningWorkout(t(input.locale, 'Agility and changes of direction', 'Agility och riktningsförändringar'), input.position, input.intensityFactor, input.locale, input.loadNotes))
  days[5] = input.hasGym
    ? withWorkout(6, strengthWorkout(t(input.locale, 'Unilateral strength/prehab', 'Unilateral styrka/prehab'), input.profile.primaryStrengthFocus, input.prevention, 'MODERATE', input.position, input.locale))
    : withWorkout(6, mobilityWorkout(t(input.locale, 'Mobility and trunk', 'Rörlighet och bål'), input.prevention, input.position, input.locale))

  return trimToSessions(days, input.requestedSessions, [1, 2, 4, 5, 6, 3], input.locale)
}

function withWorkout(dayNumber: number, workout: CreateWorkoutDTO): CreateTrainingDayDTO {
  return { dayNumber, notes: '', workouts: [workout] }
}

function trimToSessions(days: CreateTrainingDayDTO[], sessionsPerWeek: number, priorityDays: number[], locale: AppLocale): CreateTrainingDayDTO[] {
  const keep = new Set(priorityDays.slice(0, sessionsPerWeek))
  return days.map((day) => keep.has(day.dayNumber) ? day : { ...day, notes: t(locale, 'Rest day', 'Vilodag'), workouts: [] })
}

function strengthWorkout(
  name: string,
  focusAreas: string[],
  prevention: HockeyPlanningContext['prevention'],
  intensity: WorkoutIntensity,
  position: HockeyPosition,
  locale: AppLocale
): CreateWorkoutDTO {
  const mainFocus = focusAreas.slice(0, 3).join(', ')
  const prehab = prevention.slice(0, position === 'goalie' ? 4 : 3).map((exercise) => `${exercise.name} (${exercise.sets || ''}x${exercise.reps || exercise.frequency || ''})`).join(', ')
  return {
    type: 'STRENGTH',
    name,
    intensity,
    duration: position === 'goalie' ? 40 : 50,
    instructions: `${t(locale, 'Focus', 'Fokus')}: ${mainFocus}. ${t(locale, 'Injury prevention', 'Skadeprevention')}: ${prehab}.`,
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: t(locale, 'Dynamic warm-up and hip/groin activation', 'Dynamisk uppvärmning och höft/ljumske-aktivering') },
      { order: 2, type: 'exercise', duration: 30, description: mainFocus || t(locale, 'Full-body strength', 'Helkroppsstyrka') },
      { order: 3, type: 'exercise', duration: 10, description: prehab || 'Hockeyprehab' },
    ],
  }
}

function conditioningWorkout(name: string, position: HockeyPosition, factor: number, locale: AppLocale, loadNotes: string[] = []): CreateWorkoutDTO {
  const isGoalie = position === 'goalie'
  const duration = Math.round((isGoalie ? 35 : 45) * factor)
  const description = isGoalie
    ? t(locale, 'Short lateral explosive intervals and reaction work with long recoveries.', 'Korta laterala explosiva intervaller och reaktion med lång vila.')
    : t(locale, '30-60 sec shift simulation with controlled recovery and high quality.', '30-60 sek bytessimulering med kontrollerad vila och bra kvalitet.')
  return {
    type: 'CYCLING',
    name,
    intensity: 'INTERVAL',
    duration,
    instructions: [description, ...loadNotes].join(' '),
    segments: [
      { order: 1, type: 'warmup', duration: 10, zone: 1, description: t(locale, 'Easy warm-up', 'Lätt uppvärmning') },
      { order: 2, type: 'interval', duration: Math.max(15, duration - 20), zone: 4, description },
      { order: 3, type: 'cooldown', duration: 10, zone: 1, description: t(locale, 'Cooldown', 'Nedvarvning') },
    ],
  }
}

function powerWorkout(position: HockeyPosition, locale: AppLocale, testPriorities: string[] = []): CreateWorkoutDTO {
  const description = position === 'goalie'
    ? t(locale, 'Lateral push, reaction, and trunk stability.', 'Lateral push, reaktion och bålstabilitet.')
    : position === 'defense'
      ? t(locale, 'Lateral power, hip strength, and explosive changes of direction.', 'Lateral power, höftstyrka och explosiva riktningsförändringar.')
      : t(locale, 'Acceleration, rotation, and explosive leg power.', 'Acceleration, rotation och explosiv benkraft.')
  const priorityText = testPriorities.length > 0
    ? `${t(locale, 'Test focus', 'Testfokus')}: ${testPriorities.slice(0, 3).join(', ')}.`
    : ''
  return {
    type: 'PLYOMETRIC',
    name: t(locale, 'Explosiveness and power', 'Explosivitet och power'),
    intensity: 'INTERVAL',
    duration: 40,
    instructions: [description, priorityText].filter(Boolean).join(' '),
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: t(locale, 'Dynamic warm-up', 'Dynamisk uppvärmning') },
      { order: 2, type: 'work', duration: 20, description },
      { order: 3, type: 'cooldown', duration: 10, description: t(locale, 'Hip/groin mobility', 'Rörlighet höft/ljumske') },
    ],
  }
}

function iceWorkout(name: string, position: HockeyPosition, factor: number, locale: AppLocale, loadNotes: string[] = []): CreateWorkoutDTO {
  const duration = Math.round(60 * factor)
  const baseInstructions = position === 'goalie'
    ? t(locale, 'Goalie-specific ice work: angles, reaction, lateral movement, and controlled volume.', 'Målvaktsspecifik is: vinklar, reaktion, lateral förflyttning och kontrollerad volym.')
    : t(locale, 'Ice session with skating economy, changes of direction, and position-specific elements.', 'Is-pass med skridskoekonomi, riktningsförändringar och positionsspecifika moment.')
  return {
    type: 'OTHER',
    name,
    intensity: 'MODERATE',
    duration,
    instructions: [baseInstructions, ...loadNotes].join(' '),
    segments: [{ order: 1, type: 'work', duration, description: t(locale, 'Ice-specific training', 'Is-specifik träning') }],
  }
}

function mobilityWorkout(name: string, prevention: HockeyPlanningContext['prevention'], position: HockeyPosition, locale: AppLocale): CreateWorkoutDTO {
  const exercises = prevention.map((exercise) => exercise.name).join(', ')
  return {
    type: 'RECOVERY',
    name,
    intensity: 'EASY',
    duration: position === 'goalie' ? 35 : 25,
    instructions: `${t(locale, 'Focus on', 'Fokus på')} ${exercises}.`,
    segments: [{ order: 1, type: 'work', duration: position === 'goalie' ? 35 : 25, description: exercises }],
  }
}

function activationWorkout(name: string, position: HockeyPosition, locale: AppLocale): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name,
    intensity: 'EASY',
    duration: 25,
    instructions: position === 'goalie'
      ? t(locale, 'Hip mobility, reaction, and light lateral activation.', 'Höftmobilitet, reaktion och lätt lateral aktivering.')
      : t(locale, 'Mobility, short strides, and light puck/stick preparation.', 'Rörlighet, korta stegringar och lätt puck-/klubbförberedelse.'),
    segments: [{ order: 1, type: 'work', duration: 25, description: t(locale, 'Activation', 'Aktivering') }],
  }
}

function recoveryWorkout(name: string, instructions: string): CreateWorkoutDTO {
  return {
    type: 'RECOVERY',
    name,
    intensity: 'RECOVERY',
    duration: 30,
    instructions,
    segments: [{ order: 1, type: 'work', duration: 30, zone: 1, description: instructions }],
  }
}

function matchWorkout(name: string, position: HockeyPosition, locale: AppLocale): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name,
    intensity: 'MAX',
    duration: position === 'goalie' ? 60 : 45,
    instructions: t(locale, 'Match day. Log ice time, shifts, RPE, any pain, and recovery.', 'Matchdag. Logga istid, byten, RPE, eventuell smärta och återhämtning.'),
    segments: [{ order: 1, type: 'work', duration: 60, description: 'Match' }],
  }
}

function getProgramPhase(week: number, totalWeeks: number): PeriodPhase {
  const progress = week / totalWeeks
  if (week % 4 === 0 && week < totalWeeks) return 'RECOVERY'
  if (progress <= 0.35) return 'BASE'
  if (progress <= 0.75) return 'BUILD'
  if (progress <= 0.9) return 'PEAK'
  return 'TAPER'
}

function getWeekIntensityFactor(week: number, totalWeeks: number, goal: string): number {
  if (goal === 'return-to-play') return Math.min(1, 0.6 + week * 0.08)
  if (week % 4 === 0 && week < totalWeeks) return 0.75
  return 1
}

function hockeyGoalLabel(goal: string, locale: AppLocale): string {
  const labels: Record<string, { en: string; sv: string }> = {
    'off-season-build': { en: 'Hockey off-season', sv: 'Hockey off-season' },
    'pre-season-readiness': { en: 'Hockey pre-season', sv: 'Hockey försäsong' },
    'in-season-maintenance': { en: 'Hockey in-season maintenance', sv: 'Hockey säsongsunderhåll' },
    conditioning: { en: 'Hockey conditioning', sv: 'Hockey kondition' },
    'speed-power': { en: 'Hockey speed & power', sv: 'Hockey snabbhet & power' },
    'injury-prevention': { en: 'Hockey injury prevention', sv: 'Hockey skadeprevention' },
    'return-to-play': { en: 'Hockey return to play', sv: 'Hockey return to play' },
    custom: { en: 'Hockey program', sv: 'Hockeyprogram' },
  }
  return labels[goal]?.[locale] || t(locale, 'Hockey program', 'Hockeyprogram')
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
