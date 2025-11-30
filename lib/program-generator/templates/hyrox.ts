/**
 * HYROX Program Templates
 *
 * HYROX is a global fitness race combining running with functional workout stations.
 * Race format: 8 x 1km runs + 8 functional stations
 *
 * Stations (in order):
 * 1. SkiErg - 1000m
 * 2. Sled Push - 50m
 * 3. Sled Pull - 50m
 * 4. Burpee Broad Jump - 80m
 * 5. Rowing - 1000m
 * 6. Farmers Carry - 200m (2x24kg women / 2x32kg men)
 * 7. Sandbag Lunges - 100m (10kg women / 20kg men)
 * 8. Wall Balls - 75 reps women / 100 reps men
 *
 * Categories:
 * - Open: Standard weights
 * - Pro: Heavier weights
 * - Doubles: Pairs (split work)
 * - Relay: Teams of 4
 */

export type HYROXWorkoutType =
  | 'running'
  | 'strength'
  | 'station_practice'
  | 'hyrox_simulation'
  | 'interval'
  | 'endurance'
  | 'recovery'
  | 'mixed'

export type HYROXStation =
  | 'skierg'
  | 'sled_push'
  | 'sled_pull'
  | 'burpee_broad_jump'
  | 'rowing'
  | 'farmers_carry'
  | 'sandbag_lunge'
  | 'wall_balls'

export interface HYROXTemplateWorkout {
  type: HYROXWorkoutType
  name: string
  description: string
  duration: number // minutes
  intensity: 'easy' | 'moderate' | 'hard' | 'race_pace'
  stations?: HYROXStation[]
  runningDistance?: number // meters
  structure?: string
}

export interface HYROXTemplateDay {
  dayNumber: number
  workouts: HYROXTemplateWorkout[]
  isRestDay?: boolean
}

export interface HYROXTemplateWeek {
  weekNumber: number
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE'
  focus: string
  totalHours: number
  days: HYROXTemplateDay[]
}

export interface HYROXTemplate {
  id: string
  name: string
  description: string
  durationWeeks: number
  targetLevel: 'beginner' | 'intermediate' | 'advanced'
  targetTime?: string // e.g., "sub 90 min"
  weeks: HYROXTemplateWeek[]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createRunningWorkout(
  name: string,
  distance: number,
  intensity: HYROXTemplateWorkout['intensity'],
  structure?: string
): HYROXTemplateWorkout {
  const duration = Math.round(distance / 1000 * (intensity === 'easy' ? 6 : intensity === 'moderate' ? 5 : 4.5))
  return {
    type: 'running',
    name,
    description: `${distance / 1000}km löpning`,
    duration,
    intensity,
    runningDistance: distance,
    structure,
  }
}

function createStationWorkout(
  name: string,
  stations: HYROXStation[],
  intensity: HYROXTemplateWorkout['intensity'],
  duration: number,
  description: string
): HYROXTemplateWorkout {
  return {
    type: 'station_practice',
    name,
    description,
    duration,
    intensity,
    stations,
  }
}

function createStrengthWorkout(
  name: string,
  duration: number,
  intensity: HYROXTemplateWorkout['intensity'],
  structure: string
): HYROXTemplateWorkout {
  return {
    type: 'strength',
    name,
    description: 'Styrketräning för HYROX',
    duration,
    intensity,
    structure,
  }
}

function createSimulationWorkout(
  name: string,
  duration: number,
  stations: HYROXStation[],
  structure: string
): HYROXTemplateWorkout {
  return {
    type: 'hyrox_simulation',
    name,
    description: 'HYROX-simulation',
    duration,
    intensity: 'race_pace',
    stations,
    structure,
  }
}

function createRestDay(dayNumber: number): HYROXTemplateDay {
  return {
    dayNumber,
    workouts: [{
      type: 'recovery',
      name: 'Vila',
      description: 'Aktiv återhämtning eller vila',
      duration: 0,
      intensity: 'easy',
    }],
    isRestDay: true,
  }
}

// ============================================================================
// 12-WEEK BEGINNER HYROX PROGRAM
// ============================================================================

export const HYROX_BEGINNER_12_WEEK: HYROXTemplate = {
  id: 'hyrox-beginner-12',
  name: 'HYROX Nybörjarplan',
  description: '12 veckors program för din första HYROX. Bygger upp löpkapacitet och introducerar alla stationer gradvis.',
  durationWeeks: 12,
  targetLevel: 'beginner',
  targetTime: 'Fullföra under 90 min',
  weeks: [
    // WEEK 1 - BASE
    {
      weekNumber: 1,
      phase: 'BASE',
      focus: 'Introduktion till HYROX-format',
      totalHours: 5,
      days: [
        {
          dayNumber: 1,
          workouts: [createRunningWorkout('Lugn löpning', 4000, 'easy')],
        },
        { dayNumber: 2, workouts: [createStrengthWorkout('Grundstyrka', 45, 'moderate', '3x10 squats, push-ups, rows, lunges')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Intervalträning', 3000, 'moderate', '6x400m med 90s vila')] },
        { dayNumber: 5, workouts: [createStationWorkout('SkiErg & Rodd intro', ['skierg', 'rowing'], 'easy', 30, 'Teknikfokus på SkiErg och roddmaskin')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Lång lugn löpning', 6000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 2 - BASE
    {
      weekNumber: 2,
      phase: 'BASE',
      focus: 'Bygga löpbas och stationsteknik',
      totalHours: 5.5,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Tempo-löpning', 4000, 'moderate')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Underkropp', 45, 'moderate', '4x8 goblet squats, RDL, step-ups, wall balls intro')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Fartlek', 5000, 'moderate', '5 min lugnt, 2 min hårt x 4')] },
        { dayNumber: 5, workouts: [createStationWorkout('Sled & Farmers Carry', ['sled_push', 'sled_pull', 'farmers_carry'], 'moderate', 35, 'Introduktion till släde och bärövningar')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Lång lugn löpning', 7000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 3 - BASE
    {
      weekNumber: 3,
      phase: 'BASE',
      focus: 'Alla stationer introducerade',
      totalHours: 6,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Lugn löpning', 5000, 'easy')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Helkropp', 50, 'moderate', 'Circuit: squats, push-ups, lunges, planks x 4 varv')] },
        { dayNumber: 3, workouts: [createStationWorkout('Burpee Broad Jump & Lunges', ['burpee_broad_jump', 'sandbag_lunge'], 'moderate', 30, 'Teknik för burpee broad jump och walking lunges')] },
        createRestDay(4),
        { dayNumber: 5, workouts: [createRunningWorkout('Intervalträning', 4000, 'hard', '8x400m med 60s vila')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Lång lugn löpning', 8000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 4 - BASE (Recovery)
    {
      weekNumber: 4,
      phase: 'BASE',
      focus: 'Återhämtningsvecka',
      totalHours: 4,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Lätt löpning', 4000, 'easy')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Lätt styrka', 30, 'easy', 'Mobility och lätta övningar')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Lugn löpning', 5000, 'easy')] },
        { dayNumber: 5, workouts: [createStationWorkout('Wall Balls intro', ['wall_balls'], 'easy', 20, '5x10 wall balls med fokus på teknik')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Lätt löpning', 5000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 5 - BUILD
    {
      weekNumber: 5,
      phase: 'BUILD',
      focus: 'Öka intensitet och volym',
      totalHours: 6.5,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Tempo', 5000, 'moderate')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('HYROX-styrka', 50, 'moderate', 'Wall balls, farmers carry, sled work')] },
        { dayNumber: 3, workouts: [createStationWorkout('Halv HYROX', ['skierg', 'sled_push', 'rowing', 'wall_balls'], 'moderate', 45, '4 stationer + 4x1km löpning')] },
        createRestDay(4),
        { dayNumber: 5, workouts: [createRunningWorkout('Intervaller', 5000, 'hard', '5x1km med 2 min vila')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Lång löpning', 10000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 6 - BUILD
    {
      weekNumber: 6,
      phase: 'BUILD',
      focus: 'Stationsuthållighet',
      totalHours: 7,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Fartlek', 6000, 'moderate', '1km lugnt, 500m hårt x 4')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Överkropp & Core', 45, 'moderate', 'Pull-ups, push-ups, KB swings, planks')] },
        { dayNumber: 3, workouts: [createStationWorkout('Roxzone-träning', ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump'], 'hard', 40, 'Stationer 1-4 i race-tempo')] },
        createRestDay(4),
        { dayNumber: 5, workouts: [createRunningWorkout('Tempo', 6000, 'moderate')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Lång löpning', 12000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 7 - BUILD
    {
      weekNumber: 7,
      phase: 'BUILD',
      focus: 'Race-simulation',
      totalHours: 7,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Tempo-intervaller', 5000, 'moderate', '5x1km @ race pace')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('HYROX-specifik', 50, 'moderate', 'Focus på svaga stationer')] },
        { dayNumber: 3, workouts: [createStationWorkout('Roxzone stationer 5-8', ['rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'], 'hard', 45, 'Stationer 5-8 i race-tempo')] },
        createRestDay(4),
        { dayNumber: 5, workouts: [createRunningWorkout('Intervaller', 6000, 'hard', '6x1km med 90s vila')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Lång löpning', 14000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 8 - BUILD (Recovery)
    {
      weekNumber: 8,
      phase: 'BUILD',
      focus: 'Återhämtningsvecka',
      totalHours: 5,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Lätt löpning', 5000, 'easy')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Lätt styrka', 35, 'easy', 'Mobility och teknikarbete')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Lugn löpning', 6000, 'easy')] },
        { dayNumber: 5, workouts: [createStationWorkout('Teknikfokus', ['wall_balls', 'burpee_broad_jump'], 'easy', 25, 'Fokus på effektiv teknik')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Lätt lång löpning', 8000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 9 - PEAK
    {
      weekNumber: 9,
      phase: 'PEAK',
      focus: 'Full HYROX-simulation',
      totalHours: 8,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Race-pace löpning', 6000, 'hard', '6x1km @ målpace')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('HYROX-prep', 45, 'moderate', 'Alla stationsmuskler')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createSimulationWorkout('Full HYROX-sim', 90, ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'], 'Komplett HYROX med 8x1km + alla stationer')] },
        createRestDay(5),
        { dayNumber: 6, workouts: [createRunningWorkout('Återhämtningslöpning', 5000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 10 - PEAK
    {
      weekNumber: 10,
      phase: 'PEAK',
      focus: 'Finslipa race-strategier',
      totalHours: 7,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Tempo', 5000, 'moderate')] },
        { dayNumber: 2, workouts: [createStationWorkout('Race-pace stationer', ['sled_push', 'sled_pull', 'farmers_carry'], 'hard', 35, 'Fokus på svagaste stationer')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Intervaller', 5000, 'hard', '10x500m')] },
        { dayNumber: 5, workouts: [createStrengthWorkout('Underhållsstyrka', 40, 'moderate', 'Lätt men effektiv')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Lång löpning', 12000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 11 - TAPER
    {
      weekNumber: 11,
      phase: 'TAPER',
      focus: 'Nedtrappning - behåll intensitet, minska volym',
      totalHours: 5,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Race-pace', 4000, 'hard', '4x1km @ målpace')] },
        { dayNumber: 2, workouts: [createStationWorkout('Stationsgenomgång', ['skierg', 'rowing', 'wall_balls'], 'moderate', 25, 'Korta, intensiva intervaller')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Lätt tempo', 4000, 'moderate')] },
        { dayNumber: 5, workouts: [createStrengthWorkout('Aktivering', 25, 'easy', 'Lätta aktiveringsövningar')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Kort löpning', 3000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 12 - RACE
    {
      weekNumber: 12,
      phase: 'RACE',
      focus: 'Tävlingsvecka',
      totalHours: 3,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Lätt shakeout', 2000, 'easy')] },
        { dayNumber: 2, workouts: [createStationWorkout('Mini-aktivering', ['wall_balls'], 'easy', 15, '2x10 wall balls, lätt jogg')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Openers', 2000, 'moderate', '4x200m strides')] },
        createRestDay(5),
        {
          dayNumber: 6,
          workouts: [{
            type: 'hyrox_simulation',
            name: 'HYROX RACE DAY',
            description: 'Tävlingsdag! Ge allt du har!',
            duration: 90,
            intensity: 'race_pace',
            stations: ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'],
            structure: 'Full HYROX Race',
          }],
        },
        createRestDay(7),
      ],
    },
  ],
}

// ============================================================================
// 16-WEEK INTERMEDIATE HYROX PROGRAM
// ============================================================================

export const HYROX_INTERMEDIATE_16_WEEK: HYROXTemplate = {
  id: 'hyrox-intermediate-16',
  name: 'HYROX Medelplan',
  description: '16 veckors program för erfarna atleter som vill förbättra sin HYROX-tid. Fokus på specifika svagheter och race-strategi.',
  durationWeeks: 16,
  targetLevel: 'intermediate',
  targetTime: 'Sub 75 min',
  weeks: generateIntermediateWeeks(),
}

function generateIntermediateWeeks(): HYROXTemplateWeek[] {
  const weeks: HYROXTemplateWeek[] = []

  // BASE PHASE (Weeks 1-4)
  for (let i = 1; i <= 4; i++) {
    weeks.push({
      weekNumber: i,
      phase: 'BASE',
      focus: i === 4 ? 'Återhämtning' : 'Bygga konditionsbas',
      totalHours: i === 4 ? 5 : 7 + (i - 1) * 0.5,
      days: generateBaseWeekDays(i),
    })
  }

  // BUILD PHASE (Weeks 5-10)
  for (let i = 5; i <= 10; i++) {
    weeks.push({
      weekNumber: i,
      phase: 'BUILD',
      focus: i === 8 ? 'Återhämtning' : 'HYROX-specifik träning',
      totalHours: i === 8 ? 5.5 : 8 + ((i - 5) * 0.3),
      days: generateBuildWeekDays(i),
    })
  }

  // PEAK PHASE (Weeks 11-14)
  for (let i = 11; i <= 14; i++) {
    weeks.push({
      weekNumber: i,
      phase: 'PEAK',
      focus: i === 14 ? 'Sista simuleringen' : 'Maximal HYROX-förberedelse',
      totalHours: 9 - (i - 11) * 0.5,
      days: generatePeakWeekDays(i),
    })
  }

  // TAPER & RACE (Weeks 15-16)
  weeks.push({
    weekNumber: 15,
    phase: 'TAPER',
    focus: 'Nedtrappning med bibehållen intensitet',
    totalHours: 5,
    days: generateTaperWeekDays(),
  })

  weeks.push({
    weekNumber: 16,
    phase: 'RACE',
    focus: 'Tävlingsvecka - prestera!',
    totalHours: 3,
    days: generateRaceWeekDays(),
  })

  return weeks
}

function generateBaseWeekDays(week: number): HYROXTemplateDay[] {
  const isRecoveryWeek = week === 4
  const distanceMultiplier = isRecoveryWeek ? 0.7 : 0.8 + (week * 0.05)

  return [
    {
      dayNumber: 1,
      workouts: [createRunningWorkout('Tempolöpning', Math.round(6000 * distanceMultiplier), isRecoveryWeek ? 'easy' : 'moderate')],
    },
    {
      dayNumber: 2,
      workouts: [createStrengthWorkout('HYROX-styrka A', isRecoveryWeek ? 35 : 50, isRecoveryWeek ? 'easy' : 'moderate', 'Squats, deadlifts, push-ups, pull-ups')],
    },
    {
      dayNumber: 3,
      workouts: [createStationWorkout('Stationsträning', ['skierg', 'rowing'], isRecoveryWeek ? 'easy' : 'moderate', isRecoveryWeek ? 25 : 40, 'SkiErg och rodd intervaller')],
    },
    createRestDay(4),
    {
      dayNumber: 5,
      workouts: [createRunningWorkout('Intervaller', Math.round(5000 * distanceMultiplier), isRecoveryWeek ? 'moderate' : 'hard', isRecoveryWeek ? '4x800m' : '6x1km')],
    },
    {
      dayNumber: 6,
      workouts: [
        createRunningWorkout('Lång löpning', Math.round(14000 * distanceMultiplier), 'easy'),
        createStrengthWorkout('HYROX-styrka B', isRecoveryWeek ? 25 : 40, 'moderate', 'Wall balls, farmers carry, lunges'),
      ],
    },
    createRestDay(7),
  ]
}

function generateBuildWeekDays(week: number): HYROXTemplateDay[] {
  const isRecoveryWeek = week === 8

  return [
    {
      dayNumber: 1,
      workouts: [createRunningWorkout('Race-pace intervaller', isRecoveryWeek ? 4000 : 6000, isRecoveryWeek ? 'moderate' : 'hard', `${isRecoveryWeek ? 4 : 6}x1km @ race pace`)],
    },
    {
      dayNumber: 2,
      workouts: [createStrengthWorkout('Specifik styrka', isRecoveryWeek ? 35 : 55, isRecoveryWeek ? 'easy' : 'moderate', 'HYROX-stationsmuskulatur')],
    },
    {
      dayNumber: 3,
      workouts: [
        createStationWorkout(
          isRecoveryWeek ? 'Lätt stationsarbete' : 'Halv HYROX',
          ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump'],
          isRecoveryWeek ? 'easy' : 'hard',
          isRecoveryWeek ? 30 : 50,
          isRecoveryWeek ? 'Teknikfokus' : 'Stationer 1-4 + 4x1km löpning'
        ),
      ],
    },
    createRestDay(4),
    {
      dayNumber: 5,
      workouts: [
        createRunningWorkout('Tempo', isRecoveryWeek ? 5000 : 8000, isRecoveryWeek ? 'easy' : 'moderate'),
        createStationWorkout('Stationer 5-8', ['rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'], isRecoveryWeek ? 'easy' : 'moderate', isRecoveryWeek ? 25 : 40, 'Fokus på senare stationer'),
      ],
    },
    {
      dayNumber: 6,
      workouts: [createRunningWorkout('Lång löpning', isRecoveryWeek ? 10000 : 16000, 'easy')],
    },
    createRestDay(7),
  ]
}

function generatePeakWeekDays(week: number): HYROXTemplateDay[] {
  const fullSimulation = week === 11 || week === 14

  return [
    {
      dayNumber: 1,
      workouts: [createRunningWorkout('Race-pace', 5000, 'hard', '5x1km @ målpace')],
    },
    {
      dayNumber: 2,
      workouts: [createStrengthWorkout('Aktivering', 40, 'moderate', 'Explosiv styrka')],
    },
    {
      dayNumber: 3,
      workouts: fullSimulation
        ? [createSimulationWorkout('Full HYROX', 85, ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'], 'Komplett race-simulation')]
        : [createStationWorkout('Race-pace stationer', ['sled_push', 'sled_pull', 'wall_balls'], 'hard', 45, 'Fokus på svaga stationer')],
    },
    createRestDay(4),
    {
      dayNumber: 5,
      workouts: [createRunningWorkout('Fartlek', 6000, 'moderate', 'Varierande tempo')],
    },
    {
      dayNumber: 6,
      workouts: fullSimulation
        ? [createRunningWorkout('Återhämtning', 5000, 'easy')]
        : [createRunningWorkout('Lång löpning', 12000, 'easy')],
    },
    createRestDay(7),
  ]
}

function generateTaperWeekDays(): HYROXTemplateDay[] {
  return [
    { dayNumber: 1, workouts: [createRunningWorkout('Race-pace openers', 4000, 'hard', '4x1km')] },
    { dayNumber: 2, workouts: [createStationWorkout('Stationsaktivering', ['skierg', 'wall_balls'], 'moderate', 25, 'Korta, snabba intervaller')] },
    createRestDay(3),
    { dayNumber: 4, workouts: [createRunningWorkout('Lätt tempo', 4000, 'moderate')] },
    { dayNumber: 5, workouts: [createStrengthWorkout('Aktivering', 20, 'easy', 'Dynamiska övningar')] },
    { dayNumber: 6, workouts: [createRunningWorkout('Shakeout', 3000, 'easy')] },
    createRestDay(7),
  ]
}

function generateRaceWeekDays(): HYROXTemplateDay[] {
  return [
    { dayNumber: 1, workouts: [createRunningWorkout('Lätt jogg', 2500, 'easy')] },
    { dayNumber: 2, workouts: [createStationWorkout('Mini-aktivering', ['wall_balls'], 'easy', 15, '3x8 wall balls')] },
    createRestDay(3),
    { dayNumber: 4, workouts: [createRunningWorkout('Strides', 2000, 'moderate', '6x100m')] },
    createRestDay(5),
    {
      dayNumber: 6,
      workouts: [{
        type: 'hyrox_simulation',
        name: 'HYROX RACE DAY',
        description: 'Tävlingsdag - KROSSA DIN MÅLTID!',
        duration: 75,
        intensity: 'race_pace',
        stations: ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'],
        structure: 'Full HYROX Race',
      }],
    },
    createRestDay(7),
  ]
}

// ============================================================================
// EXPORTS
// ============================================================================

export const HYROX_TEMPLATES: HYROXTemplate[] = [
  HYROX_BEGINNER_12_WEEK,
  HYROX_INTERMEDIATE_16_WEEK,
]

export function getHYROXTemplateById(id: string): HYROXTemplate | undefined {
  return HYROX_TEMPLATES.find(t => t.id === id)
}

export function getHYROXTemplatesByLevel(level: 'beginner' | 'intermediate' | 'advanced'): HYROXTemplate[] {
  return HYROX_TEMPLATES.filter(t => t.targetLevel === level)
}

export function getRecommendedWeeklyHours(level: 'beginner' | 'intermediate' | 'advanced' | 'elite'): { min: number; max: number } {
  switch (level) {
    case 'beginner':
      return { min: 5, max: 7 }
    case 'intermediate':
      return { min: 7, max: 10 }
    case 'advanced':
      return { min: 10, max: 14 }
    case 'elite':
      return { min: 14, max: 20 }
    default:
      return { min: 6, max: 8 }
  }
}
