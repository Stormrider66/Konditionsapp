// lib/program-generator/generators/cycling-generator.ts
// Cycling program generator using FTP-based templates

import { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, WorkoutIntensity } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { get8WeekFtpBuilder, get12WeekBaseBuilder, getGranFondoPrep, CyclingTemplateWorkout } from '../templates/cycling'
import { mapCyclingWorkoutToDTO } from '../workout-mapper'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

export interface CyclingProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  locale?: AppLocale
  notes?: string
  targetRaceDate?: Date
  ftp?: number
  weeklyHours?: number
  bikeType?: 'road' | 'mtb' | 'gravel' | 'indoor'
  includeStrength?: boolean
  strengthSessionsPerWeek?: number
}

/**
 * Generate a cycling training program
 */
export async function generateCyclingProgram(
  params: CyclingProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  logger.debug('Starting cycling program generation', {
    goal: params.goal,
    ftp: params.ftp || 'Not provided',
    weeklyHours: params.weeklyHours || 8,
  })

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)
  const locale: AppLocale = params.locale === 'sv' ? 'sv' : 'en'

  // Select template based on goal
  let templateWeeks
  if (params.goal === 'ftp-builder' && params.ftp) {
    templateWeeks = get8WeekFtpBuilder(
      params.ftp,
      (params.weeklyHours || 8) as 6 | 8 | 10 | 12
    )
  } else if (params.goal === 'base-builder') {
    templateWeeks = get12WeekBaseBuilder(
      (params.weeklyHours || 10) as 6 | 8 | 10 | 12 | 15
    )
  } else if (params.goal === 'gran-fondo') {
    templateWeeks = getGranFondoPrep(
      150 as 100 | 150 | 200, // Default to 150km distance
      (params.weeklyHours || 10) as 8 | 10 | 12 | 15
    )
  } else {
    return createFallbackCyclingProgram(params, client, startDate, endDate)
  }

  // Map template weeks to program structure
  const weeks = templateWeeks.map((week, index) => ({
    weekNumber: week.week,
    startDate: new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000),
    phase: week.phase,
    volume: week.weeklyTss,
    focus: localizeCyclingText(week.focus, locale),
    days: createDaysFromWorkouts(week.keyWorkouts, params.sessionsPerWeek, params.ftp, locale),
  }))

  const goalLabels: Record<string, { en: string; sv: string }> = {
    'ftp-builder': { en: 'FTP Builder', sv: 'FTP Builder' },
    'base-builder': { en: 'Base Builder', sv: 'Basbyggare' },
    'gran-fondo': { en: 'Gran Fondo', sv: 'Gran Fondo' },
    'custom': { en: 'Custom', sv: 'Anpassad' },
  }

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${goalLabels[params.goal]?.[locale] || t(locale, 'Cycling program', 'Cykelprogram')} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || t(locale, `FTP-based cycling program (${params.ftp ? params.ftp + 'W' : 'custom'})`, `FTP-baserat cykelprogram (${params.ftp ? params.ftp + 'W' : 'anpassat'})`),
    weeks,
  }
}

/**
 * Create days from key workouts using the workout mapper
 */
function createDaysFromWorkouts(
  keyWorkouts: CyclingTemplateWorkout[],
  sessionsPerWeek: number,
  ftp?: number,
  locale: AppLocale = 'en'
) {
  const days = []

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const workoutIndex = dayNum - 1
    const hasWorkout = workoutIndex < Math.min(keyWorkouts.length, sessionsPerWeek)
    const workout = hasWorkout ? keyWorkouts[workoutIndex] : null

    days.push({
      dayNumber: dayNum,
      notes: hasWorkout ? '' : t(locale, 'Rest day', 'Vilodag'),
      workouts: workout
        ? [mapCyclingWorkoutToDTO(localizeCyclingWorkout(workout, locale), ftp)]
        : [],
    })
  }

  return days
}

/**
 * Create useful fallback cycling structure for custom/unsupported goals.
 */
function createFallbackCyclingProgram(
  params: CyclingProgramParams,
  client: Client,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const locale: AppLocale = params.locale === 'sv' ? 'sv' : 'en'
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => {
    const weekNumber = i + 1
    const days = createFallbackCyclingDays({
      weekNumber,
      totalWeeks: params.durationWeeks,
      sessionsPerWeek: params.sessionsPerWeek,
      goal: params.goal,
      ftp: params.ftp,
      weeklyHours: params.weeklyHours || 8,
      locale,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase: getCyclingPhase(weekNumber, params.durationWeeks),
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: getCyclingFocus(params.goal, weekNumber, params.durationWeeks, locale),
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${t(locale, 'Cycling program', 'Cykelprogram')} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || t(locale, 'Custom cycling program with progressive endurance, threshold work, recovery, and cycling-specific cadence/technique.', 'Anpassat cykelprogram med progressiv distans, tröskelarbete, återhämtning och cykelspecifik kadens/teknik.'),
    weeks,
  }
}

function createFallbackCyclingDays(input: {
  weekNumber: number
  totalWeeks: number
  sessionsPerWeek: number
  goal: string
  ftp?: number
  weeklyHours: number
  locale: AppLocale
}): CreateTrainingDayDTO[] {
  const sessions = Math.min(7, Math.max(1, input.sessionsPerWeek))
  const loadFactor = getCyclingLoadFactor(input.weekNumber, input.totalWeeks)
  const longRideBase = input.goal === 'gran-fondo' ? 150 : input.weeklyHours >= 10 ? 120 : 90
  const qualityName = input.goal === 'ftp-builder'
    ? t(input.locale, 'FTP threshold intervals', 'FTP-tröskelintervaller')
    : 'Sweet spot / tempo'
  const qualityZone = input.goal === 'ftp-builder' ? 4 : 3

  const planned = [
    {
      day: 2,
      workout: cyclingWorkout({
        name: qualityName,
        intensity: qualityZone === 4 ? 'THRESHOLD' : 'MODERATE',
        duration: Math.round((qualityZone === 4 ? 60 : 70) * loadFactor),
        zone: qualityZone,
        ftp: input.ftp,
        locale: input.locale,
        instructions: qualityZone === 4
          ? t(input.locale, 'Work in control near threshold. Finish feeling like one more interval would have been possible.', 'Arbeta kontrollerat nära tröskel. Avsluta med känslan att ett intervall till hade varit möjligt.')
          : t(input.locale, 'Steady sweet spot/tempo load with smooth cadence and low technical cost.', 'Stabil sweet spot/tempo-belastning med jämn kadens och låg teknisk kostnad.'),
      }),
    },
    {
      day: 6,
      workout: cyclingWorkout({
        name: input.goal === 'gran-fondo' ? t(input.locale, 'Long ride with steady load', 'Långtur med jämn belastning') : t(input.locale, 'Aerobic long ride', 'Aerob långtur'),
        intensity: 'EASY',
        duration: Math.round(longRideBase * loadFactor),
        zone: 2,
        ftp: input.ftp,
        locale: input.locale,
        instructions: t(input.locale, 'Hold zone 2, practice fueling, and keep pressure even across the full ride.', 'Håll zon 2, öva energiintag och håll trycket jämnt över hela passet.'),
      }),
    },
    {
      day: 4,
      workout: cyclingWorkout({
        name: t(input.locale, 'Endurance and cadence', 'Uthållighet och kadens'),
        intensity: 'EASY',
        duration: Math.round(60 * loadFactor),
        zone: 2,
        ftp: input.ftp,
        locale: input.locale,
        instructions: t(input.locale, 'Aerobic endurance ride with 5 x 3 minutes at higher cadence without pushing intensity up.', 'Aerob distans med 5 x 3 minuter högre kadens utan att driva upp intensiteten.'),
      }),
    },
    {
      day: 1,
      workout: cyclingWorkout({
        name: t(input.locale, 'Recovery spin', 'Återhämtningsspin'),
        intensity: 'RECOVERY',
        duration: 35,
        zone: 1,
        ftp: input.ftp,
        locale: input.locale,
        instructions: t(input.locale, 'Very easy spin focused on circulation, mobility, and low muscular load.', 'Mycket lätt rull med fokus på cirkulation, rörlighet och lågt muskulärt tryck.'),
      }),
    },
    {
      day: 5,
      workout: cyclingWorkout({
        name: 'VO2 / backintervaller',
        intensity: 'INTERVAL',
        duration: Math.round(55 * loadFactor),
        zone: 5,
        ftp: input.ftp,
        locale: input.locale,
        instructions: t(input.locale, 'Short hard efforts with good technique. High quality, full control on the final rep.', 'Korta hårda drag med god teknik. Hög kvalitet, full kontroll på sista repetitionen.'),
      }),
    },
    {
      day: 3,
      workout: cyclingWorkout({
        name: t(input.locale, 'Technique and single-leg drills', 'Teknik och enbensdrill'),
        intensity: 'EASY',
        duration: 45,
        zone: 2,
        ftp: input.ftp,
        locale: input.locale,
        instructions: t(input.locale, 'Easy endurance with technique blocks: smooth pedaling, position, cornering, or trainer cadence.', 'Lätt distans med teknikblock: rundtramp, position, kurvtagning eller trainer-kadens.'),
      }),
    },
  ]

  const keep = new Map(planned.slice(0, sessions).map((item) => [item.day, item.workout]))
  return Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: keep.has(index + 1) ? '' : t(input.locale, 'Rest day', 'Vilodag'),
    workouts: keep.get(index + 1) ? [keep.get(index + 1)!] : [],
  }))
}

function cyclingWorkout(input: {
  name: string
  intensity: WorkoutIntensity
  duration: number
  zone: number
  ftp?: number
  instructions: string
  locale: AppLocale
}): CreateWorkoutDTO {
  const mainDuration = Math.max(15, input.duration - 20)
  return {
    type: input.intensity === 'RECOVERY' ? 'RECOVERY' : 'CYCLING',
    name: input.name,
    intensity: input.intensity,
    duration: input.duration,
    instructions: input.instructions,
    segments: [
      { order: 1, type: 'warmup', duration: 10, zone: 1, description: t(input.locale, 'Easy warm-up with progressive cadence', 'Lätt uppvärmning med progressiv kadens') },
      {
        order: 2,
        type: 'work',
        duration: mainDuration,
        zone: input.zone,
        power: input.ftp ? Math.round(input.ftp * getPowerZonePercentage(input.zone)) : undefined,
        description: input.instructions,
      },
      { order: 3, type: 'cooldown', duration: 10, zone: 1, description: t(input.locale, 'Easy cooldown', 'Lätt nedvarvning') },
    ],
  }
}

function getPowerZonePercentage(zone: number): number {
  const percentages: Record<number, number> = {
    1: 0.50,
    2: 0.65,
    3: 0.82,
    4: 0.95,
    5: 1.10,
    6: 1.30,
    7: 1.50,
  }
  return percentages[zone] || 0.75
}

function getCyclingPhase(weekNumber: number, totalWeeks: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 'TAPER'
  if (progress > 0.7) return 'PEAK'
  if (progress > 0.35) return 'BUILD'
  return 'BASE'
}

function getCyclingFocus(goal: string, weekNumber: number, totalWeeks: number, locale: AppLocale = 'en'): string {
  const phase = getCyclingPhase(weekNumber, totalWeeks)
  if (goal === 'gran-fondo') return phase === 'BASE' ? t(locale, 'Aerobic base and technique', 'Aerob bas och teknik') : phase === 'BUILD' ? t(locale, 'Long ride and tempo', 'Långtur och tempo') : t(locale, 'Distance-specific endurance', 'Distansspecifik uthållighet')
  if (goal === 'ftp-builder') return phase === 'BASE' ? t(locale, 'Sweet spot base', 'Sweet spot-bas') : phase === 'BUILD' ? t(locale, 'Threshold progression', 'Tröskelprogression') : t(locale, 'FTP quality', 'FTP-kvalitet')
  return phase === 'BASE' ? t(locale, 'Aerobic foundation', 'Aerob grund') : phase === 'BUILD' ? t(locale, 'Mixed quality', 'Blandad kvalitet') : phase === 'TAPER' ? t(locale, 'Freshness', 'Fräschhet') : t(locale, 'Specific cycling capacity', 'Specifik cykelkapacitet')
}

function getCyclingLoadFactor(weekNumber: number, totalWeeks: number): number {
  if (weekNumber % 4 === 0 && weekNumber < totalWeeks) return 0.75
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 0.65
  if (progress > 0.7) return 1.05
  return 0.9 + progress * 0.25
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function localizeCyclingWorkout(workout: CyclingTemplateWorkout, locale: AppLocale): CyclingTemplateWorkout {
  if (locale === 'sv') return workout
  return {
    ...workout,
    name: localizeCyclingText(workout.name, locale),
    description: localizeCyclingText(workout.description, locale),
    structure: workout.structure ? localizeCyclingText(workout.structure, locale) : workout.structure,
  }
}

const CYCLING_TRANSLATIONS: Record<string, string> = {
  'Bygg aerob grund och testa utgångspunkt': 'Build aerobic base and test starting point',
  'Fortsätt aerob utveckling med längre pass': 'Continue aerobic development with longer rides',
  'Introducera sweet spot-intervaller (88-94% FTP)': 'Introduce sweet spot intervals (88-94% FTP)',
  'Återhämtningsvecka - minska volym 40%': 'Recovery week - reduce volume by 40%',
  'Tröskelintervaller för FTP-höjning': 'Threshold intervals to raise FTP',
  'Längre tröskelintervaller - max adaptation': 'Longer threshold intervals - maximum adaptation',
  'Grundläggande aerob utveckling': 'Basic aerobic development',
  'Återhämtningsvecka': 'Recovery week',
  'Bygg volym och uthållighet': 'Build volume and endurance',
  'Ökad intensitet med tempo': 'Increased intensity with tempo',
  'Utvärdering och vila': 'Evaluation and rest',
  'Bygg distanskapacitet': 'Build distance capacity',
  'Öka långpassets längd': 'Increase long-ride duration',
  'Simulera tävlingsförhållanden': 'Simulate race conditions',
  'Återhämtning och supercompensation': 'Recovery and supercompensation',
  'Peak volym - längsta passet': 'Peak volume - longest ride',
  'Specifik tävlingsförberedelse': 'Specific race preparation',
  'Skärpa utan trötthet': 'Sharpness without fatigue',
  'Tävlingsvecka!': 'Race week!',
  'Långpass': 'Long ride',
  'Uthållighetspass': 'Endurance ride',
  'Tempo-intervaller': 'Tempo intervals',
  'Bygger effektivitet vid tävlingstempo': 'Builds efficiency at race tempo',
  'Medeldistans': 'Medium-distance ride',
  'Steady Z2-träning': 'Steady Z2 training',
  'Effektiv träning nära tröskel': 'Efficient training near threshold',
  'Aktiv återhämtning': 'Active recovery',
  'Höj tröskelkapacitet': 'Raise threshold capacity',
  'Peak långpass': 'Peak long ride',
  'Bygger topkapacitet': 'Builds top-end capacity',
  'Aktiv vila': 'Active rest',
  'Lätt spinning': 'Easy spinning',
  'Långpass med klättring': 'Long ride with climbing',
  'Fokus på kuperad terräng': 'Focus on rolling terrain',
  'Sweet Spot-intervaller': 'Sweet spot intervals',
  'Effektiv intensitet': 'Efficient intensity',
  'Grupptempo': 'Group tempo',
  'Simulera tävlingssituation': 'Simulate race situation',
  'Håll benen igång': 'Keep the legs moving',
  'Opener-intervaller': 'Opener intervals',
  'Aktivera systemen': 'Activate the systems',
  'Håll benen fräscha': 'Keep the legs fresh',
  'Kort aktivering dagen före': 'Short activation the day before',
  'Bygg aerob grund med låg intensitet': 'Build aerobic base at low intensity',
  'Tempo-introduktion': 'Tempo introduction',
  'Första smaken av högre intensitet': 'First taste of higher intensity',
  'Lätt spinning, fokus på kadensarbete': 'Easy spinning, focus on cadence work',
  'Effektiv träning strax under tröskel': 'Efficient training just below threshold',
  'Aerob bas med tempo-stötar': 'Aerobic base with tempo surges',
  'Lär dig hantera tröskelfluktuationer': 'Learn to handle threshold fluctuations',
  'Huvudpass för FTP-utveckling': 'Main session for FTP development',
  'Volym och återhämtning': 'Volume and recovery',
  'Blandad intensitet': 'Mixed intensity',
  'Toppa din kapacitet': 'Sharpen your capacity',
  'Klassisk FTP-höjare': 'Classic FTP builder',
  'Medellångt pass': 'Medium-long ride',
  'Återhämtning mellan hårda pass': 'Recovery between hard sessions',
  'Sprintintervaller': 'Sprint intervals',
  'Neuromuskulär aktivering': 'Neuromuscular activation',
  'Lätt spinning, hög kadans': 'Easy spinning, high cadence',
  'Lätt uthållighet': 'Easy endurance',
  'Steady Z2, njut av cyklingen': 'Steady Z2, enjoy the ride',
  'Teknikpass': 'Technique session',
  'Fokusera på trampning och kadans': 'Focus on pedaling and cadence',
  'Vila inför test': 'Rest before the test',
  '20-min FTP-test (x0.95 = FTP)': '20-min FTP test (x0.95 = FTP)',
  'Vila och fira din nya FTP!': 'Rest and celebrate your new FTP!',
  'Huvudpass för aerob utveckling': 'Main session for aerobic development',
  'Bygg effektivitet': 'Build efficiency',
}

function localizeCyclingText(text: string, locale: AppLocale): string {
  if (locale === 'sv') return text
  return (CYCLING_TRANSLATIONS[text] || text)
    .replace(/(\d+) km i Z2/g, '$1 km in Z2')
    .replace(/(\d+) km med tempo-block/g, '$1 km with tempo blocks')
    .replace(/(\d+) km - simulerar tävling/g, '$1 km - race simulation')
    .replace(/Z2 med/g, 'Z2 with')
    .replace(/Inkludera/g, 'Include')
    .replace(/klättring/g, 'climbing')
    .replace(/höjdmeter/g, 'meters of elevation')
    .replace(/med full vila/g, 'with full recovery')
    .replace(/efter uppvärmning/g, 'after warm-up')
}
