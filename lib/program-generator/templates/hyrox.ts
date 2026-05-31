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
 * 6. Farmers Carry - 200m (2 x 24kg women / 2 x 32kg men)
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
    description: `${distance / 1000} km running`,
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
    description: 'Strength training for HYROX',
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
    description: 'HYROX simulation',
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
      name: 'Rest',
      description: 'Active recovery or rest',
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
  name: 'HYROX Beginner Plan',
  description: '12-week program for your first HYROX. Builds running capacity and gradually introduces all stations.',
  durationWeeks: 12,
  targetLevel: 'beginner',
  targetTime: 'Complete under 90 min',
  weeks: [
    // WEEK 1 - BASE
    {
      weekNumber: 1,
      phase: 'BASE',
      focus: 'Introduction to the HYROX format',
      totalHours: 5,
      days: [
        {
          dayNumber: 1,
          workouts: [createRunningWorkout('Easy running', 4000, 'easy')],
        },
        { dayNumber: 2, workouts: [createStrengthWorkout('Base strength', 45, 'moderate', '3 x 10 squats, push-ups, rows, lunges')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Interval training', 3000, 'moderate', '6 x 400 m with 90 s recovery')] },
        { dayNumber: 5, workouts: [createStationWorkout('SkiErg & Rowing intro', ['skierg', 'rowing'], 'easy', 30, 'Technique focus on SkiErg and rowing machine')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Long easy run', 6000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 2 - BASE
    {
      weekNumber: 2,
      phase: 'BASE',
      focus: 'Build running base and station technique',
      totalHours: 5.5,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Tempo running', 4000, 'hard')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Lower body', 45, 'moderate', '4 x 8 goblet squats, RDL, step-ups, wall balls intro')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Fartlek', 5000, 'moderate', '5 min easy, 2 min hard x 4')] },
        { dayNumber: 5, workouts: [createStationWorkout('Sled & Farmers Carry', ['sled_push', 'sled_pull', 'farmers_carry'], 'moderate', 35, 'Introduction to sled and carry exercises')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Long easy run', 7000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 3 - BASE
    {
      weekNumber: 3,
      phase: 'BASE',
      focus: 'All stations introduced',
      totalHours: 6,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Easy running', 5000, 'easy')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Full body', 50, 'moderate', 'Circuit: squats, push-ups, lunges, planks x 4 rounds')] },
        { dayNumber: 3, workouts: [createStationWorkout('Burpee Broad Jump & Lunges', ['burpee_broad_jump', 'sandbag_lunge'], 'moderate', 30, 'Technique for burpee broad jump and walking lunges')] },
        createRestDay(4),
        { dayNumber: 5, workouts: [createRunningWorkout('Interval training', 4000, 'hard', '8 x 400 m with 60 s recovery')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Long easy run', 8000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 4 - BASE (Recovery)
    {
      weekNumber: 4,
      phase: 'BASE',
      focus: 'Recovery week',
      totalHours: 4,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Easy running', 4000, 'easy')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Easy strength', 30, 'easy', 'Mobility and easy exercises')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Easy running', 5000, 'easy')] },
        { dayNumber: 5, workouts: [createStationWorkout('Wall Balls intro', ['wall_balls'], 'easy', 20, '5 x 10 wall balls with a technique focus')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Easy running', 5000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 5 - BUILD
    {
      weekNumber: 5,
      phase: 'BUILD',
      focus: 'Increase intensity and volume',
      totalHours: 6.5,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Tempo', 5000, 'hard')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('HYROX strength', 50, 'moderate', 'Wall balls, farmers carry, sled work')] },
        { dayNumber: 3, workouts: [createStationWorkout('Half HYROX', ['skierg', 'sled_push', 'rowing', 'wall_balls'], 'moderate', 45, '4 stations + 4 x 1 km running')] },
        createRestDay(4),
        { dayNumber: 5, workouts: [createRunningWorkout('Intervals', 5000, 'hard', '5 x 1 km with 2 min recovery')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Long run', 10000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 6 - BUILD
    {
      weekNumber: 6,
      phase: 'BUILD',
      focus: 'Station endurance',
      totalHours: 7,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Fartlek', 6000, 'moderate', '1 km easy, 500 m hard x 4')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Upper body & Core', 45, 'moderate', 'Pull-ups, push-ups, KB swings, planks')] },
        { dayNumber: 3, workouts: [createStationWorkout('Roxzone training', ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump'], 'hard', 40, 'Stations 1-4 at race pace')] },
        createRestDay(4),
        { dayNumber: 5, workouts: [createRunningWorkout('Tempo', 6000, 'hard')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Long run', 12000, 'easy')] },
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
        { dayNumber: 1, workouts: [createRunningWorkout('Tempo intervals', 5000, 'race_pace', '5 x 1 km @ race pace')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('HYROX-specific', 50, 'moderate', 'Focus on weak stations')] },
        { dayNumber: 3, workouts: [createStationWorkout('Roxzone stations 5-8', ['rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'], 'hard', 45, 'Stations 5-8 at race pace')] },
        createRestDay(4),
        { dayNumber: 5, workouts: [createRunningWorkout('Intervals', 6000, 'hard', '6 x 1 km with 90 s recovery')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Long run', 14000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 8 - BUILD (Recovery)
    {
      weekNumber: 8,
      phase: 'BUILD',
      focus: 'Recovery week',
      totalHours: 5,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Easy running', 5000, 'easy')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('Easy strength', 35, 'easy', 'Mobility and technique work')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Easy running', 6000, 'easy')] },
        { dayNumber: 5, workouts: [createStationWorkout('Technique focus', ['wall_balls', 'burpee_broad_jump'], 'easy', 25, 'Focus on efficient technique')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Easy long run', 8000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 9 - PEAK
    {
      weekNumber: 9,
      phase: 'PEAK',
      focus: 'Full HYROX simulation',
      totalHours: 8,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Race-pace running', 6000, 'hard', '6 x 1 km @ target pace')] },
        { dayNumber: 2, workouts: [createStrengthWorkout('HYROX prep', 45, 'moderate', 'All station muscles')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createSimulationWorkout('Full HYROX sim', 90, ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'], 'Complete HYROX with 8 x 1 km + all stations')] },
        createRestDay(5),
        { dayNumber: 6, workouts: [createRunningWorkout('Recovery running', 5000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 10 - PEAK
    {
      weekNumber: 10,
      phase: 'PEAK',
      focus: 'Refine race strategies',
      totalHours: 7,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Tempo', 5000, 'hard')] },
        { dayNumber: 2, workouts: [createStationWorkout('Race-pace stations', ['sled_push', 'sled_pull', 'farmers_carry'], 'hard', 35, 'Focus on weakest stations')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Intervals', 5000, 'hard', '10 x 500 m')] },
        { dayNumber: 5, workouts: [createStrengthWorkout('Maintenance strength', 40, 'moderate', 'Easy but effective')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Long run', 12000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 11 - TAPER
    {
      weekNumber: 11,
      phase: 'TAPER',
      focus: 'Taper - maintain intensity, reduce volume',
      totalHours: 5,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Race pace', 4000, 'hard', '4 x 1 km @ target pace')] },
        { dayNumber: 2, workouts: [createStationWorkout('Station walkthrough', ['skierg', 'rowing', 'wall_balls'], 'moderate', 25, 'Short, intensive intervals')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Easy tempo', 4000, 'moderate')] },
        { dayNumber: 5, workouts: [createStrengthWorkout('Activation', 25, 'easy', 'Easy activation exercises')] },
        { dayNumber: 6, workouts: [createRunningWorkout('Short run', 3000, 'easy')] },
        createRestDay(7),
      ],
    },
    // WEEK 12 - RACE
    {
      weekNumber: 12,
      phase: 'RACE',
      focus: 'Race week',
      totalHours: 3,
      days: [
        { dayNumber: 1, workouts: [createRunningWorkout('Easy shakeout', 2000, 'easy')] },
        { dayNumber: 2, workouts: [createStationWorkout('Mini activation', ['wall_balls'], 'easy', 15, '2 x 10 wall balls, easy jog')] },
        createRestDay(3),
        { dayNumber: 4, workouts: [createRunningWorkout('Openers', 2000, 'moderate', '4 x 200 m strides')] },
        createRestDay(5),
        {
          dayNumber: 6,
          workouts: [{
            type: 'hyrox_simulation',
            name: 'HYROX RACE DAY',
            description: 'Race day! Give it everything you have!',
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
  name: 'HYROX Intermediate Plan',
  description: '16-week program for experienced athletes who want to improve their HYROX time. Focus on specific weaknesses and race strategy.',
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
      focus: i === 4 ? 'Recovery' : 'Build fitness base',
      totalHours: i === 4 ? 5 : 7 + (i - 1) * 0.5,
      days: generateBaseWeekDays(i),
    })
  }

  // BUILD PHASE (Weeks 5-10)
  for (let i = 5; i <= 10; i++) {
    weeks.push({
      weekNumber: i,
      phase: 'BUILD',
      focus: i === 8 ? 'Recovery' : 'HYROX-specific training',
      totalHours: i === 8 ? 5.5 : 8 + ((i - 5) * 0.3),
      days: generateBuildWeekDays(i),
    })
  }

  // PEAK PHASE (Weeks 11-14)
  for (let i = 11; i <= 14; i++) {
    weeks.push({
      weekNumber: i,
      phase: 'PEAK',
      focus: i === 14 ? 'Final simulation' : 'Maximum HYROX preparation',
      totalHours: 9 - (i - 11) * 0.5,
      days: generatePeakWeekDays(i),
    })
  }

  // TAPER & RACE (Weeks 15-16)
  weeks.push({
    weekNumber: 15,
    phase: 'TAPER',
    focus: 'Taper with maintained intensity',
    totalHours: 5,
    days: generateTaperWeekDays(),
  })

  weeks.push({
    weekNumber: 16,
    phase: 'RACE',
    focus: 'Race week - perform!',
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
      workouts: [createRunningWorkout('Tempo running', Math.round(6000 * distanceMultiplier), isRecoveryWeek ? 'easy' : 'hard')],
    },
    {
      dayNumber: 2,
      workouts: [createStrengthWorkout('HYROX strength A', isRecoveryWeek ? 35 : 50, isRecoveryWeek ? 'easy' : 'moderate', 'Squats, deadlifts, push-ups, pull-ups')],
    },
    {
      dayNumber: 3,
      workouts: [createStationWorkout('Station training', ['skierg', 'rowing'], isRecoveryWeek ? 'easy' : 'moderate', isRecoveryWeek ? 25 : 40, 'SkiErg and rowing intervals')],
    },
    createRestDay(4),
    {
      dayNumber: 5,
      workouts: [createRunningWorkout('Intervals', Math.round(5000 * distanceMultiplier), isRecoveryWeek ? 'moderate' : 'hard', isRecoveryWeek ? '4 x 800 m' : '6 x 1 km')],
    },
    {
      dayNumber: 6,
      workouts: [
        createRunningWorkout('Long run', Math.round(14000 * distanceMultiplier), 'easy'),
        createStrengthWorkout('HYROX strength B', isRecoveryWeek ? 25 : 40, 'moderate', 'Wall balls, farmers carry, lunges'),
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
      workouts: [createRunningWorkout('Race-pace intervals', isRecoveryWeek ? 4000 : 6000, isRecoveryWeek ? 'moderate' : 'race_pace', `${isRecoveryWeek ? 4 : 6} x 1 km @ race pace`)],
    },
    {
      dayNumber: 2,
      workouts: [createStrengthWorkout('Specific strength', isRecoveryWeek ? 35 : 55, isRecoveryWeek ? 'easy' : 'moderate', 'HYROX station musculature')],
    },
    {
      dayNumber: 3,
      workouts: [
        createStationWorkout(
          isRecoveryWeek ? 'Easy station work' : 'Half HYROX',
          ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump'],
          isRecoveryWeek ? 'easy' : 'hard',
          isRecoveryWeek ? 30 : 50,
          isRecoveryWeek ? 'Technique focus' : 'Stations 1-4 + 4 x 1 km running'
        ),
      ],
    },
    createRestDay(4),
    {
      dayNumber: 5,
      workouts: [
        createRunningWorkout('Tempo', isRecoveryWeek ? 5000 : 8000, isRecoveryWeek ? 'easy' : 'hard'),
        createStationWorkout('Stations 5-8', ['rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'], isRecoveryWeek ? 'easy' : 'moderate', isRecoveryWeek ? 25 : 40, 'Focus on later stations'),
      ],
    },
    {
      dayNumber: 6,
      workouts: [createRunningWorkout('Long run', isRecoveryWeek ? 10000 : 16000, 'easy')],
    },
    createRestDay(7),
  ]
}

function generatePeakWeekDays(week: number): HYROXTemplateDay[] {
  const fullSimulation = week === 11 || week === 14

  return [
    {
      dayNumber: 1,
      workouts: [createRunningWorkout('Race pace', 5000, 'hard', '5 x 1 km @ target pace')],
    },
    {
      dayNumber: 2,
      workouts: [createStrengthWorkout('Activation', 40, 'moderate', 'Explosive strength')],
    },
    {
      dayNumber: 3,
      workouts: fullSimulation
        ? [createSimulationWorkout('Full HYROX', 85, ['skierg', 'sled_push', 'sled_pull', 'burpee_broad_jump', 'rowing', 'farmers_carry', 'sandbag_lunge', 'wall_balls'], 'Complete race simulation')]
        : [createStationWorkout('Race-pace stations', ['sled_push', 'sled_pull', 'wall_balls'], 'hard', 45, 'Focus on weak stations')],
    },
    createRestDay(4),
    {
      dayNumber: 5,
      workouts: [createRunningWorkout('Fartlek', 6000, 'moderate', 'Variable pace')],
    },
    {
      dayNumber: 6,
      workouts: fullSimulation
        ? [createRunningWorkout('Recovery', 5000, 'easy')]
        : [createRunningWorkout('Long run', 12000, 'easy')],
    },
    createRestDay(7),
  ]
}

function generateTaperWeekDays(): HYROXTemplateDay[] {
  return [
    { dayNumber: 1, workouts: [createRunningWorkout('Race-pace openers', 4000, 'hard', '4 x 1 km')] },
    { dayNumber: 2, workouts: [createStationWorkout('Station activation', ['skierg', 'wall_balls'], 'moderate', 25, 'Short, fast intervals')] },
    createRestDay(3),
    { dayNumber: 4, workouts: [createRunningWorkout('Easy tempo', 4000, 'moderate')] },
    { dayNumber: 5, workouts: [createStrengthWorkout('Activation', 20, 'easy', 'Dynamic exercises')] },
    { dayNumber: 6, workouts: [createRunningWorkout('Shakeout', 3000, 'easy')] },
    createRestDay(7),
  ]
}

function generateRaceWeekDays(): HYROXTemplateDay[] {
  return [
    { dayNumber: 1, workouts: [createRunningWorkout('Easy jog', 2500, 'easy')] },
    { dayNumber: 2, workouts: [createStationWorkout('Mini activation', ['wall_balls'], 'easy', 15, '3 x 8 wall balls')] },
    createRestDay(3),
    { dayNumber: 4, workouts: [createRunningWorkout('Strides', 2000, 'moderate', '6 x 100 m')] },
    createRestDay(5),
    {
      dayNumber: 6,
      workouts: [{
        type: 'hyrox_simulation',
        name: 'HYROX RACE DAY',
        description: 'Race day - CRUSH YOUR GOAL!',
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
