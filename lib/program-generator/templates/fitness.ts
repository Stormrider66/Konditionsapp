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
      focus: 'Bygg grundkondition och lär känna övningarna',
      weeklyVolume: '2-3 timmar',
      keyWorkouts: getWeekTemplate(1, 'BASE', fitnessLevel),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Öka volymen gradvis, fokusera på teknik',
      weeklyVolume: '2.5-3.5 timmar',
      keyWorkouts: getWeekTemplate(2, 'BASE', fitnessLevel),
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Fortsätt bygga aerob bas',
      weeklyVolume: '3-4 timmar',
      keyWorkouts: getWeekTemplate(3, 'BASE', fitnessLevel),
    },

    // PHASE 2: Build (Weeks 4-6)
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Återhämtningsvecka - minska intensitet',
      weeklyVolume: '2-3 timmar',
      keyWorkouts: getWeekTemplate(4, 'RECOVERY', fitnessLevel),
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Öka intensitet - lägg till HIIT',
      weeklyVolume: '3-4 timmar',
      keyWorkouts: getWeekTemplate(5, 'BUILD', fitnessLevel),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Max intensitet och variation',
      weeklyVolume: '3.5-4.5 timmar',
      keyWorkouts: getWeekTemplate(6, 'BUILD', fitnessLevel),
    },

    // PHASE 3: Peak & Recovery (Weeks 7-8)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Test din framgång - utmana dig själv',
      weeklyVolume: '4-5 timmar',
      keyWorkouts: getWeekTemplate(7, 'PEAK', fitnessLevel),
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Återhämtning och utvärdering',
      weeklyVolume: '2-3 timmar',
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
        description: 'Måndags-kondition',
        details: 'Löpning, cykling eller simning i lugnt tempo (Zon 2)',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Onsdags-styrka',
        details: 'Helkroppsstyrka: knäböj, marklyft, bänk, rodd',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Fredags-kondition',
        details: 'Varierad konditionsträning, lite högre intensitet',
        duration: d.cardio,
      },
    ]
  }

  if (phase === 'BUILD') {
    return [
      {
        type: 'hiit',
        description: 'HIIT-session',
        details: 'Högintensiv intervallträning (Tabata, 30/30 intervaller)',
        duration: d.hiit,
      },
      {
        type: 'strength',
        description: 'Helkroppsstyrka',
        details: 'Tyngre vikter, färre reps (6-8 reps)',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Längre konditionspass',
        details: 'Steady state i Zon 3',
        duration: d.cardio + 10,
      },
    ]
  }

  if (phase === 'PEAK') {
    return [
      {
        type: 'hiit',
        description: 'Max HIIT',
        details: 'Fullgas-intervaller för maximal effekt',
        duration: d.hiit + 5,
      },
      {
        type: 'strength',
        description: 'Styrka + power',
        details: 'Kombinera styrka med explosiva övningar',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Konditionstest',
        details: 'Testa din VO2max eller tid trial',
        duration: d.cardio,
      },
    ]
  }

  // RECOVERY phase
  return [
    {
      type: 'active-rest',
      description: 'Lätt promenad eller cykling',
      details: 'Aktiv återhämtning, Zon 1',
      duration: 30,
    },
    {
      type: 'mobility',
      description: 'Yoga eller stretching',
      details: 'Rörlighet och återhämtning',
      duration: 45,
    },
    {
      type: 'cardio',
      description: 'Lätt kondition',
      details: 'Lugnt tempo, njut av träningen',
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
        description: 'Lätt kondition',
        details: 'Löpning eller cykling (Zon 2)',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Överkroppsstyrka',
        details: 'Push/Pull-övningar',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Måttlig kondition',
        details: 'Zon 2-3, varierat tempo',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Benstyrka + core',
        details: 'Knäböj, utfall, core-stabilitet',
        duration: d.strength,
      },
    ]
  }

  if (phase === 'BUILD') {
    return [
      {
        type: 'hiit',
        description: 'HIIT-intervaller',
        details: 'Högintensiv träning',
        duration: d.hiit,
      },
      {
        type: 'strength',
        description: 'Överkroppsstyrka',
        details: 'Fokus på kraft',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Tempopass',
        details: 'Zon 3-4, utmanande tempo',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Benstyrka + plyometri',
        details: 'Explosiva övningar',
        duration: d.strength,
      },
    ]
  }

  if (phase === 'PEAK') {
    return [
      {
        type: 'hiit',
        description: 'Maxintervaller',
        details: 'Fullgas HIIT',
        duration: d.hiit + 5,
      },
      {
        type: 'strength',
        description: 'Helkroppsstyrka',
        details: 'Tung träning',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Längre konditionspass',
        details: 'Zon 2-3, bygg uthållighet',
        duration: d.cardio + 15,
      },
      {
        type: 'strength',
        description: 'Power-träning',
        details: 'Snabba, explosiva övningar',
        duration: d.strength - 10,
      },
    ]
  }

  // RECOVERY
  return [
    {
      type: 'mobility',
      description: 'Yoga',
      details: 'Rörlighet och stretching',
      duration: 45,
    },
    {
      type: 'cardio',
      description: 'Lätt promenad',
      details: 'Aktiv återhämtning',
      duration: 30,
    },
    {
      type: 'active-rest',
      description: 'Lätt aktivitet',
      details: 'Något du tycker om',
      duration: 30,
    },
    {
      type: 'mobility',
      description: 'Stretching',
      details: 'Mjukgör musklerna',
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
        description: 'Lätt löpning',
        details: 'Zon 2',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Överkropp',
        details: 'Push-övningar',
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
        description: 'Ben + core',
        details: 'Underkroppsstyrka',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Längre konditionspass',
        details: 'Zon 2-3',
        duration: d.cardio + 15,
      },
    ]
  }

  if (phase === 'BUILD') {
    return [
      {
        type: 'hiit',
        description: 'Morgon-HIIT',
        details: 'Snabb start på veckan',
        duration: d.hiit,
      },
      {
        type: 'strength',
        description: 'Överkroppsstyrka',
        details: 'Tung träning',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Tempopass',
        details: 'Zon 3-4',
        duration: d.cardio,
      },
      {
        type: 'strength',
        description: 'Benstyrka',
        details: 'Kraft och stabilitet',
        duration: d.strength,
      },
      {
        type: 'hiit',
        description: 'Fredags-HIIT',
        details: 'Avsluta veckan starkt',
        duration: d.hiit + 5,
      },
    ]
  }

  if (phase === 'PEAK') {
    return [
      {
        type: 'hiit',
        description: 'Maxintervaller',
        details: 'All-out effort',
        duration: d.hiit + 5,
      },
      {
        type: 'strength',
        description: 'Heavy lifting',
        details: 'Maximal styrka',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Steady state',
        details: 'Bygg aerob bas',
        duration: d.cardio + 10,
      },
      {
        type: 'strength',
        description: 'Power + plyometri',
        details: 'Explosiv träning',
        duration: d.strength,
      },
      {
        type: 'cardio',
        description: 'Konditionstest',
        details: 'Mät din framgång',
        duration: d.cardio,
      },
    ]
  }

  // RECOVERY
  return [
    {
      type: 'mobility',
      description: 'Yoga',
      details: 'Stretching och andning',
      duration: 45,
    },
    {
      type: 'active-rest',
      description: 'Promenad',
      details: 'Aktiv vila',
      duration: 30,
    },
    {
      type: 'cardio',
      description: 'Lätt cykling',
      details: 'Zon 1',
      duration: 30,
    },
    {
      type: 'mobility',
      description: 'Stretching',
      details: 'Mjukgör kroppen',
      duration: 30,
    },
    {
      type: 'active-rest',
      description: 'Valfri aktivitet',
      details: 'Något roligt',
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
      category: 'Kardiovaskulär kondition',
      tests: [
        {
          name: 'Cooper-test',
          description: 'Löp så långt som möjligt på 12 minuter',
          benchmark: 'Män 30-39 år: >2600m = Excellent',
        },
        {
          name: 'VO2max-test',
          description: 'Konditionstest på löpband eller cykel',
          benchmark: 'Män 30-39 år: >45 ml/kg/min = Utmärkt',
        },
        {
          name: 'Vilopuls',
          description: 'Mät pulsen efter 5 min vila',
          benchmark: '<60 slag/min = Bra kondition',
        },
      ],
    },
    {
      category: 'Styrka',
      tests: [
        {
          name: 'Push-ups',
          description: 'Max antal armhävningar',
          benchmark: 'Män 30-39 år: >35 = Excellent',
        },
        {
          name: 'Plank',
          description: 'Hur länge kan du hålla plankan?',
          benchmark: '>2 minuter = Bra core-styrka',
        },
        {
          name: 'Knäböj 1RM',
          description: 'Maximal knäböj',
          benchmark: '1.5× kroppsvikt = Stark',
        },
      ],
    },
    {
      category: 'Rörlighet',
      tests: [
        {
          name: 'Sit-and-reach',
          description: 'Framåtböjning sittande',
          benchmark: '>10 cm förbi tårna = Bra rörlighet',
        },
        {
          name: 'Shoulder mobility',
          description: 'Kan du röra händerna bakom ryggen?',
          benchmark: 'Händer möts = God rörlighet',
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
      goal: 'Viktminskning',
      calories: '15-20% kalorieunderskott',
      protein: '1.8-2.2 g/kg kroppsvikt',
      carbs: 'Moderera kolhydrater runt träning',
      tips: [
        'Ät proteinrik frukost',
        'Drick mycket vatten',
        'Fördela maten jämnt över dagen',
        'Undvik tomma kalorier (godis, läsk)',
      ],
    },
    {
      goal: 'Muskelökning',
      calories: '10-15% kalorieöverskott',
      protein: '2.0-2.5 g/kg kroppsvikt',
      carbs: 'Högt kolhydratintag runt träning',
      tips: [
        'Ät protein vid varje måltid',
        'Träna tungt 3-4 ggr/vecka',
        'Sov minst 7-8 timmar',
        'Proteintillskott efter träning',
      ],
    },
    {
      goal: 'Konditionsförbättring',
      calories: 'Underhåll eller lätt överskott',
      protein: '1.6-2.0 g/kg kroppsvikt',
      carbs: 'Högt kolhydratintag för träning',
      tips: [
        'Karboladda före längre pass',
        'Återfyll glykogen efter träning',
        'Elektrolyter vid långpass',
        'Variera proteinsorter',
      ],
    },
  ]
}
