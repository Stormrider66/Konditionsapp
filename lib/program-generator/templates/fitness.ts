// lib/program-generator/templates/fitness.ts
// General fitness and health training templates

import { PeriodPhase } from '@/types'

export interface FitnessTemplateWeek {
  week: number
  phase: PeriodPhase
  focus: string
  weeklyVolume: string // More flexible for mixed activities
  keyWorkouts: {
    type: 'cardio' | 'strength' | 'hiit' | 'mobility' | 'active-rest'
    description: string
    details: string
    duration: number // minutes
  }[]
}

/**
 * 8-week general fitness program
 * Balanced approach: cardio, strength, mobility
 * 3-5 days per week
 */
export function get8WeekFitnessTemplate(
  frequency: 3 | 4 | 5,
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
): FitnessTemplateWeek[] {
  const templates = {
    3: get3DayFitnessWeek,
    4: get4DayFitnessWeek,
    5: get5DayFitnessWeek,
  }

  const getWeekTemplate = templates[frequency]

  return [
    // PHASE 1: Foundation (Weeks 1-3)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Build base fitness and learn the exercises',
      weeklyVolume: '2-3 hours',
      keyWorkouts: getWeekTemplate(1, 'BASE', fitnessLevel),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Increase volume gradually and focus on technique',
      weeklyVolume: '2.5-3.5 hours',
      keyWorkouts: getWeekTemplate(2, 'BASE', fitnessLevel),
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Continue building the aerobic base',
      weeklyVolume: '3-4 hours',
      keyWorkouts: getWeekTemplate(3, 'BASE', fitnessLevel),
    },

    // PHASE 2: Build (Weeks 4-6)
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Recovery week - reduce intensity',
      weeklyVolume: '2-3 hours',
      keyWorkouts: getWeekTemplate(4, 'RECOVERY', fitnessLevel),
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Increase intensity - add HIIT',
      weeklyVolume: '3-4 hours',
      keyWorkouts: getWeekTemplate(5, 'BUILD', fitnessLevel),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Maximum intensity and variety',
      weeklyVolume: '3.5-4.5 hours',
      keyWorkouts: getWeekTemplate(6, 'BUILD', fitnessLevel),
    },

    // PHASE 3: Peak & Recovery (Weeks 7-8)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Test your progress - challenge yourself',
      weeklyVolume: '4-5 hours',
      keyWorkouts: getWeekTemplate(7, 'PEAK', fitnessLevel),
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Recovery and evaluation',
      weeklyVolume: '2-3 hours',
      keyWorkouts: getWeekTemplate(8, 'RECOVERY', fitnessLevel),
    },
  ]
}

/**
 * 3-day per week fitness template
 */
function get3DayFitnessWeek(
  weekNum: number,
  phase: PeriodPhase,
  level: 'beginner' | 'intermediate' | 'advanced'
): FitnessTemplateWeek['keyWorkouts'] {
  const durations = {
    beginner: { cardio: 30, strength: 40, hiit: 20 },
    intermediate: { cardio: 40, strength: 50, hiit: 25 },
    advanced: { cardio: 50, strength: 60, hiit: 30 },
  }

  const d = durations[level]

  if (phase === 'BASE') {
    return [
      {
        type: 'cardio',
        description: 'Monday cardio',
        details: 'Running, cycling, or swimming at an easy pace (Zone 2)',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Wednesday strength',
        details: 'Full-body strength: squat, deadlift, bench, row',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Friday cardio',
        details: 'Varied cardio training, slightly higher intensity',
        duration: d.cardio,
      },
    ]
  }

  if (phase === 'BUILD') {
    return [
      {
        type: 'hiit',
        description: 'HIIT session',
        details: 'High-intensity interval training (Tabata, 30/30 intervals)',
        duration: d.hiit,
      },
      {
        type: 'strength',
        description: 'Full-body strength',
        details: 'Heavier weights, fewer reps (6-8 reps)',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Longer cardio session',
        details: 'Steady state in Zone 3',
        duration: d.cardio + 10,
      },
    ]
  }

  if (phase === 'PEAK') {
    return [
      {
        type: 'hiit',
        description: 'Max HIIT',
        details: 'All-out intervals for maximum effect',
        duration: d.hiit + 5,
      },
      {
        type: 'strength',
        description: 'Strength + power',
        details: 'Combine strength with explosive exercises',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Fitness test',
        details: 'Test your VO2max or time trial',
        duration: d.cardio,
      },
    ]
  }

  // RECOVERY phase
  return [
    {
      type: 'active-rest',
      description: 'Easy walk or cycling',
      details: 'Active recovery, Zone 1',
      duration: 30,
    },
    {
      type: 'mobility',
      description: 'Yoga eller stretching',
      details: 'Mobility and recovery',
      duration: 45,
    },
    {
      type: 'cardio',
      description: 'Easy cardio',
      details: 'Easy pace, enjoy the training',
      duration: 30,
    },
  ]
}

/**
 * 4-day per week fitness template
 */
function get4DayFitnessWeek(
  weekNum: number,
  phase: PeriodPhase,
  level: 'beginner' | 'intermediate' | 'advanced'
): FitnessTemplateWeek['keyWorkouts'] {
  const durations = {
    beginner: { cardio: 30, strength: 40, hiit: 20 },
    intermediate: { cardio: 40, strength: 50, hiit: 25 },
    advanced: { cardio: 50, strength: 60, hiit: 30 },
  }

  const d = durations[level]

  if (phase === 'BASE') {
    return [
      {
        type: 'cardio',
        description: 'Easy cardio',
        details: 'Running or cycling (Zone 2)',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Upper-body strength',
        details: 'Push/pull exercises',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Moderate cardio',
        details: 'Zone 2-3, varied pace',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Leg strength + core',
        details: 'Squats, lunges, core stability',
        duration: d.strength,
      },
    ]
  }

  if (phase === 'BUILD') {
    return [
      {
        type: 'hiit',
        description: 'HIIT intervals',
        details: 'High-intensity training',
        duration: d.hiit,
      },
      {
        type: 'strength',
        description: 'Upper-body strength',
        details: 'Focus on power',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Tempo session',
        details: 'Zone 3-4, challenging pace',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Leg strength + plyometrics',
        details: 'Explosive exercises',
        duration: d.strength,
      },
    ]
  }

  if (phase === 'PEAK') {
    return [
      {
        type: 'hiit',
        description: 'Max intervals',
        details: 'Fullgas HIIT',
        duration: d.hiit + 5,
      },
      {
        type: 'strength',
        description: 'Helkroppsstyrka',
        details: 'Heavy training',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Longer cardio session',
        details: 'Zone 2-3, build endurance',
        duration: d.cardio + 15,
      },
      {
        type: 'strength',
        description: 'Power training',
        details: 'Fast, explosive exercises',
        duration: d.strength - 10,
      },
    ]
  }

  // RECOVERY
  return [
    {
      type: 'mobility',
      description: 'Yoga',
      details: 'Mobility and stretching',
      duration: 45,
    },
    {
      type: 'cardio',
      description: 'Easy walk',
      details: 'Active recovery',
      duration: 30,
    },
    {
      type: 'active-rest',
      description: 'Light activity',
      details: 'Something you enjoy',
      duration: 30,
    },
    {
      type: 'mobility',
      description: 'Stretching',
      details: 'Loosen the muscles',
      duration: 30,
    },
  ]
}

/**
 * 5-day per week fitness template
 */
function get5DayFitnessWeek(
  weekNum: number,
  phase: PeriodPhase,
  level: 'beginner' | 'intermediate' | 'advanced'
): FitnessTemplateWeek['keyWorkouts'] {
  const durations = {
    beginner: { cardio: 35, strength: 45, hiit: 20 },
    intermediate: { cardio: 45, strength: 55, hiit: 25 },
    advanced: { cardio: 55, strength: 65, hiit: 30 },
  }

  const d = durations[level]

  if (phase === 'BASE') {
    return [
      {
        type: 'cardio',
        description: 'Easy running',
        details: 'Zone 2',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Upper body',
        details: 'Push exercises',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Cykling eller simning',
        details: 'Cross-training',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Legs + core',
        details: 'Lower-body strength',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Longer cardio session',
        details: 'Zone 2-3',
        duration: d.cardio + 15,
      },
    ]
  }

  if (phase === 'BUILD') {
    return [
      {
        type: 'hiit',
        description: 'Morning HIIT',
        details: 'Fast start to the week',
        duration: d.hiit,
      },
      {
        type: 'strength',
        description: 'Upper-body strength',
        details: 'Heavy training',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Tempo session',
        details: 'Zone 3-4',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Leg strength',
        details: 'Power and stability',
        duration: d.strength,
      },
      {
        type: 'hiit',
        description: 'Friday HIIT',
        details: 'Finish the week strong',
        duration: d.hiit + 5,
      },
    ]
  }

  if (phase === 'PEAK') {
    return [
      {
        type: 'hiit',
        description: 'Max intervals',
        details: 'All-out effort',
        duration: d.hiit + 5,
      },
      {
        type: 'strength',
        description: 'Heavy lifting',
        details: 'Maximum strength',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Steady state',
        details: 'Build aerobic base',
        duration: d.cardio + 10,
      },
      {
        type: 'strength',
        description: 'Power + plyometrics',
        details: 'Explosive training',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Fitness test',
        details: 'Measure your progress',
        duration: d.cardio,
      },
    ]
  }

  // RECOVERY
  return [
    {
      type: 'mobility',
      description: 'Yoga',
      details: 'Stretching and breathing',
      duration: 45,
    },
    {
      type: 'active-rest',
      description: 'Walk',
      details: 'Active rest',
      duration: 30,
    },
    {
      type: 'cardio',
      description: 'Easy cycling',
      details: 'Zone 1',
      duration: 30,
    },
    {
      type: 'mobility',
      description: 'Stretching',
      details: 'Loosen the body',
      duration: 30,
    },
    {
      type: 'active-rest',
      description: 'Optional activity',
      details: 'Something fun',
      duration: 30,
    },
  ]
}

/**
 * Get fitness assessment benchmarks
 */
export function getFitnessAssessments(): {
  category: string
  tests: { name: string; description: string; benchmark: string }[]
}[] {
  return [
    {
      category: 'Cardiovascular fitness',
      tests: [
        {
          name: 'Cooper-test',
          description: 'Run as far as possible in 12 minutes',
          benchmark: 'Men 30-39: >2600 m = Excellent',
        },
        {
          name: 'VO2max-test',
          description: 'Fitness test on treadmill or bike',
          benchmark: 'Men 30-39: >45 ml/kg/min = Excellent',
        },
        {
          name: 'Resting heart rate',
          description: 'Measure pulse after 5 min rest',
          benchmark: '<60 bpm = Good fitness',
        },
      ],
    },
    {
      category: 'Strength',
      tests: [
        {
          name: 'Push-ups',
          description: 'Maximum number of push-ups',
          benchmark: 'Men 30-39: >35 = Excellent',
        },
        {
          name: 'Plank',
          description: 'How long can you hold the plank?',
          benchmark: '>2 minutes = Good core strength',
        },
        {
          name: 'Squat 1RM',
          description: 'Maximum squat',
          benchmark: '1.5 x bodyweight = Strong',
        },
      ],
    },
    {
      category: 'Mobility',
      tests: [
        {
          name: 'Sit-and-reach',
          description: 'Seated forward bend',
          benchmark: '>10 cm past toes = Good mobility',
        },
        {
          name: 'Shoulder mobility',
          description: 'Can you touch your hands behind your back?',
          benchmark: 'Hands meet = Good mobility',
        },
      ],
    },
  ]
}

/**
 * Get nutrition guidance for fitness goals
 */
export function getFitnessNutritionGuidance(): {
  goal: string
  calories: string
  protein: string
  carbs: string
  tips: string[]
}[] {
  return [
    {
      goal: 'Weight loss',
      calories: '15-20% calorie deficit',
      protein: '1.8-2.2 g/kg bodyweight',
      carbs: 'Moderate carbohydrates around training',
      tips: [
        'Eat a protein-rich breakfast',
        'Drink plenty of water',
        'Distribute food evenly through the day',
        'Avoid empty calories (candy, soda)',
      ],
    },
    {
      goal: 'Muscle gain',
      calories: '10-15% calorie surplus',
      protein: '2.0-2.5 g/kg bodyweight',
      carbs: 'High carbohydrate intake around training',
      tips: [
        'Eat protein at every meal',
        'Lift heavy 3-4 times/week',
        'Sleep at least 7-8 hours',
        'Protein supplement after training',
      ],
    },
    {
      goal: 'Fitness improvement',
      calories: 'Maintenance or slight surplus',
      protein: '1.6-2.0 g/kg bodyweight',
      carbs: 'High carbohydrate intake for training',
      tips: [
        'Carb-load before longer sessions',
        'Replenish glycogen after training',
        'Use electrolytes during long sessions',
        'Vary protein sources',
      ],
    },
  ]
}
