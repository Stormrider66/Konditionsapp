// lib/program-generator/templates/general-fitness.ts
// Goal-specific fitness program templates for General Fitness users

import { PeriodPhase } from '@/types'

export type FitnessGoal = 'weight_loss' | 'general_health' | 'strength' | 'endurance' | 'flexibility' | 'stress_relief'
export type FitnessLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete'

export interface GeneralFitnessWorkout {
  type: 'cardio' | 'strength' | 'hiit' | 'mobility' | 'yoga' | 'active-rest' | 'circuit' | 'core'
  name: string
  description: string
  duration: number // minutes
  intensity: 'low' | 'moderate' | 'high' | 'very_high'
  caloriesBurnEstimate?: number // approximate
  equipment?: string[]
}

export interface GeneralFitnessWeek {
  week: number
  phase: PeriodPhase
  focus: string
  weeklyVolume: string
  targetCalorieBurn?: number
  workouts: GeneralFitnessWorkout[]
  tips: string[]
}

// ============================================
// WEIGHT LOSS PROGRAM (12 weeks)
// Focus: Calorie deficit, HIIT, metabolic conditioning
// ============================================
export function getWeightLossProgram(
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6
): GeneralFitnessWeek[] {
  const intensity = getLevelIntensity(level)
  const baseDuration = getLevelDuration(level)

  return [
    // Phase 1: Foundation (Weeks 1-3)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Bygg träningsvanor och grundkondition',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      targetCalorieBurn: 1500,
      workouts: getWeightLossWeekWorkouts(1, level, daysPerWeek),
      tips: [
        'Fokusera på att skapa rutiner, inte perfektion',
        'Drick minst 2 liter vatten per dag',
        'Gå 7000+ steg dagligen utöver träning',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Öka aktivitetsnivån gradvis',
      weeklyVolume: `${daysPerWeek * (baseDuration + 5)} min`,
      targetCalorieBurn: 1800,
      workouts: getWeightLossWeekWorkouts(2, level, daysPerWeek),
      tips: [
        'Lägg till en extra promenad per dag',
        'Byt ut hiss mot trappor',
        'Planera veckans måltider i förväg',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Etablera NEAT (vardagsaktivitet)',
      weeklyVolume: `${daysPerWeek * (baseDuration + 10)} min`,
      targetCalorieBurn: 2000,
      workouts: getWeightLossWeekWorkouts(3, level, daysPerWeek),
      tips: [
        'NEAT = Non-Exercise Activity Thermogenesis',
        'Små rörelser hela dagen ökar förbränningen',
        'Ta pauser från sittande varje timme',
      ],
    },

    // Phase 2: Build (Weeks 4-6)
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Återhämtningsvecka - konsolidera framsteg',
      weeklyVolume: `${(daysPerWeek - 1) * baseDuration} min`,
      targetCalorieBurn: 1500,
      workouts: getWeightLossWeekWorkouts(4, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6),
      tips: [
        'Lyssna på kroppen - vila är viktigt',
        'Fokusera på sömnkvalitet',
        'Ät näringsrik mat, inte mindre mat',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Introducera HIIT för metabolisk boost',
      weeklyVolume: `${daysPerWeek * (baseDuration + 10)} min`,
      targetCalorieBurn: 2200,
      workouts: getWeightLossWeekWorkouts(5, level, daysPerWeek),
      tips: [
        'HIIT ökar efterförbränningen (EPOC)',
        'Max 2-3 HIIT-pass per vecka',
        'Blanda med lugn träning för balans',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Maximera förbränningen',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      targetCalorieBurn: 2500,
      workouts: getWeightLossWeekWorkouts(6, level, daysPerWeek),
      tips: [
        'Kombinera styrka + kondition samma pass',
        'Supersets och circuits ökar puls',
        'Spåra matintag några dagar för medvetenhet',
      ],
    },

    // Phase 3: Peak (Weeks 7-9)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Högintensiv fas - push boundaries',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      targetCalorieBurn: 2800,
      workouts: getWeightLossWeekWorkouts(7, level, daysPerWeek),
      tips: [
        'Detta är den tuffaste veckan - du klarar det!',
        'Ät tillräckligt med protein (2g/kg)',
        'Sov minst 7 timmar',
      ],
    },
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Håll intensiteten',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      targetCalorieBurn: 2800,
      workouts: getWeightLossWeekWorkouts(8, level, daysPerWeek),
      tips: [
        'Mät framsteg - vikt, mått, energinivå',
        'Fira små vinster',
        'Visualisera ditt mål',
      ],
    },
    {
      week: 9,
      phase: 'PEAK',
      focus: 'Avlastning innan sista pushen',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      targetCalorieBurn: 2000,
      workouts: getWeightLossWeekWorkouts(9, level, daysPerWeek),
      tips: [
        'Minska volym men behåll intensitet',
        'Extra fokus på återhämtning',
        'Förbered dig mentalt för slutspurten',
      ],
    },

    // Phase 4: Final Push (Weeks 10-12)
    {
      week: 10,
      phase: 'PEAK',
      focus: 'Slutspurt - allt du lärt dig',
      weeklyVolume: `${daysPerWeek * (baseDuration + 20)} min`,
      targetCalorieBurn: 3000,
      workouts: getWeightLossWeekWorkouts(10, level, daysPerWeek),
      tips: [
        'Kombinera alla tekniker du lärt dig',
        'Fokusera på att avsluta starkt',
        'Tänk på nya vanor, inte bara siffror',
      ],
    },
    {
      week: 11,
      phase: 'PEAK',
      focus: 'Maximala ansträngningen',
      weeklyVolume: `${daysPerWeek * (baseDuration + 20)} min`,
      targetCalorieBurn: 3000,
      workouts: getWeightLossWeekWorkouts(11, level, daysPerWeek),
      tips: [
        'Denna vecka visar vad du är kapabel till',
        'Push dig själv - du är starkare än du tror',
        'Dokumentera din resa',
      ],
    },
    {
      week: 12,
      phase: 'RECOVERY',
      focus: 'Utvärdering och långsiktig plan',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      targetCalorieBurn: 2000,
      workouts: getWeightLossWeekWorkouts(12, level, daysPerWeek),
      tips: [
        'Jämför före/efter - fira dina framsteg!',
        'Planera nästa fas av din resa',
        'Vanorna du byggt är viktigast',
      ],
    },
  ]
}

function getWeightLossWeekWorkouts(
  week: number,
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6
): GeneralFitnessWorkout[] {
  const d = getLevelDuration(level)
  const isRecoveryWeek = week === 4 || week === 9 || week === 12
  const isPeakWeek = week >= 7 && week <= 8 || week >= 10 && week <= 11

  const workouts: GeneralFitnessWorkout[] = []

  for (let i = 0; i < daysPerWeek; i++) {
    if (isRecoveryWeek) {
      // Recovery week: lighter workouts
      if (i % 2 === 0) {
        workouts.push({
          type: 'cardio',
          name: 'Lätt konditionspass',
          description: 'Lugn promenad, cykling eller simning',
          duration: d - 10,
          intensity: 'low',
          caloriesBurnEstimate: 150,
        })
      } else {
        workouts.push({
          type: 'mobility',
          name: 'Rörlighet och stretching',
          description: 'Yoga-inspirerad stretching och andningsövningar',
          duration: 30,
          intensity: 'low',
          caloriesBurnEstimate: 80,
        })
      }
    } else if (isPeakWeek) {
      // Peak week: high intensity
      if (i % 3 === 0) {
        workouts.push({
          type: 'hiit',
          name: 'HIIT Förbränning',
          description: '30 sek arbete / 15 sek vila × 20-30 omgångar',
          duration: d + 10,
          intensity: 'very_high',
          caloriesBurnEstimate: 400,
          equipment: ['Matta', 'Timer'],
        })
      } else if (i % 3 === 1) {
        workouts.push({
          type: 'circuit',
          name: 'Metabolisk circuit',
          description: 'Styrka + kondition i kombination för maximal förbränning',
          duration: d + 15,
          intensity: 'high',
          caloriesBurnEstimate: 350,
          equipment: ['Hantlar', 'Matta'],
        })
      } else {
        workouts.push({
          type: 'cardio',
          name: 'Steady state kondition',
          description: 'Måttligt tempo för uthållighet och fettförbränning',
          duration: d + 20,
          intensity: 'moderate',
          caloriesBurnEstimate: 300,
        })
      }
    } else {
      // Normal weeks: balanced
      if (i % 3 === 0) {
        workouts.push({
          type: 'cardio',
          name: 'Konditionspass',
          description: 'Löpning, cykling, promenad eller simning',
          duration: d,
          intensity: week > 5 ? 'moderate' : 'low',
          caloriesBurnEstimate: 250,
        })
      } else if (i % 3 === 1) {
        workouts.push({
          type: 'strength',
          name: 'Helkroppsstyrka',
          description: 'Fokus på stora muskelgrupper för ökad metabolism',
          duration: d + 5,
          intensity: 'moderate',
          caloriesBurnEstimate: 200,
          equipment: ['Hantlar eller kroppsvikt'],
        })
      } else {
        workouts.push({
          type: week > 4 ? 'hiit' : 'cardio',
          name: week > 4 ? 'HIIT/Intervaller' : 'Aktiv promenad',
          description: week > 4
            ? 'Korta högintensiva intervaller'
            : 'Rask promenad i naturlig miljö',
          duration: d,
          intensity: week > 4 ? 'high' : 'moderate',
          caloriesBurnEstimate: week > 4 ? 350 : 180,
        })
      }
    }
  }

  return workouts
}

// ============================================
// STRENGTH BUILDING PROGRAM (12 weeks)
// Focus: Progressive overload, muscle building
// ============================================
export function getStrengthBuildingProgram(
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6,
  hasGymAccess: boolean
): GeneralFitnessWeek[] {
  const baseDuration = getLevelDuration(level)

  return [
    // Phase 1: Anatomical Adaptation (Weeks 1-3)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Lär dig teknik och bygga grund',
      weeklyVolume: `${daysPerWeek} pass`,
      workouts: getStrengthWeekWorkouts(1, level, daysPerWeek, hasGymAccess),
      tips: [
        'Fokusera på TEKNIK, inte vikt',
        'Filma dig själv för att kontrollera form',
        'Börja lätt - det finns tid att öka',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Etablera rörelsebanor',
      weeklyVolume: `${daysPerWeek} pass`,
      workouts: getStrengthWeekWorkouts(2, level, daysPerWeek, hasGymAccess),
      tips: [
        'Konsistent träning > perfekt träning',
        'Ät 2g protein per kg kroppsvikt',
        'Sov 7-9 timmar för optimal återhämtning',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Öka volymen försiktigt',
      weeklyVolume: `${daysPerWeek} pass`,
      workouts: getStrengthWeekWorkouts(3, level, daysPerWeek, hasGymAccess),
      tips: [
        'Lägg till ett set per övning',
        'Börja spåra dina vikter i en loggbok',
        'Varm upp ordentligt innan tunga lyft',
      ],
    },

    // Phase 2: Hypertrophy (Weeks 4-7)
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Deload - lätt vecka för återhämtning',
      weeklyVolume: `${Math.max(2, daysPerWeek - 1)} pass`,
      workouts: getStrengthWeekWorkouts(4, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, hasGymAccess),
      tips: [
        'Minska vikten med 40-50%',
        'Fokusera på rörlighet och teknik',
        'Extra vila och återhämtning',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Hypertrofi-fokus börjar',
      weeklyVolume: `${daysPerWeek} pass`,
      workouts: getStrengthWeekWorkouts(5, level, daysPerWeek, hasGymAccess),
      tips: [
        '8-12 reps för muskelväxt',
        '60-90 sek vila mellan set',
        'Kontrollerad negativ fas (sänkning)',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Progressiv överbelastning',
      weeklyVolume: `${daysPerWeek} pass`,
      workouts: getStrengthWeekWorkouts(6, level, daysPerWeek, hasGymAccess),
      tips: [
        'Öka vikten 2.5-5kg på sammansatta övningar',
        'Eller lägg till 1-2 reps per set',
        'Muskelkontakt > vikt',
      ],
    },
    {
      week: 7,
      phase: 'BUILD',
      focus: 'Volymökning',
      weeklyVolume: `${daysPerWeek} pass`,
      workouts: getStrengthWeekWorkouts(7, level, daysPerWeek, hasGymAccess),
      tips: [
        'Lägg till ett extra set på svaga muskelgrupper',
        'Dropsets på sista setet för extra stimulus',
        'Håll proteinintaget högt',
      ],
    },

    // Phase 3: Strength (Weeks 8-10)
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Deload före styrkeblock',
      weeklyVolume: `${Math.max(2, daysPerWeek - 1)} pass`,
      workouts: getStrengthWeekWorkouts(8, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, hasGymAccess),
      tips: [
        'Lätt vecka - kroppen förbereder sig',
        'Mental förberedelse för tunga lyft',
        'Visualisera dina mål',
      ],
    },
    {
      week: 9,
      phase: 'PEAK',
      focus: 'Styrkeblock - tyngre vikter',
      weeklyVolume: `${daysPerWeek} pass`,
      workouts: getStrengthWeekWorkouts(9, level, daysPerWeek, hasGymAccess),
      tips: [
        '4-6 reps för maxstyrka',
        '2-3 min vila mellan tunga set',
        'Fokusera på de stora lyften',
      ],
    },
    {
      week: 10,
      phase: 'PEAK',
      focus: 'Push mot nya PRs',
      weeklyVolume: `${daysPerWeek} pass`,
      workouts: getStrengthWeekWorkouts(10, level, daysPerWeek, hasGymAccess),
      tips: [
        'Testa nya personliga rekord',
        'Ha en spotter vid tunga lyft',
        'Fira dina framsteg!',
      ],
    },

    // Phase 4: Recovery & Retest (Weeks 11-12)
    {
      week: 11,
      phase: 'PEAK',
      focus: 'Testa maxstyrka',
      weeklyVolume: `${Math.max(3, daysPerWeek - 1)} pass`,
      workouts: getStrengthWeekWorkouts(11, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, hasGymAccess),
      tips: [
        'Testa 1RM eller 3RM på huvudövningar',
        'Varm upp grundligt',
        'Dokumentera alla resultat',
      ],
    },
    {
      week: 12,
      phase: 'RECOVERY',
      focus: 'Återhämtning och planering',
      weeklyVolume: `${daysPerWeek} pass`,
      workouts: getStrengthWeekWorkouts(12, level, daysPerWeek, hasGymAccess),
      tips: [
        'Lätt träning för återhämtning',
        'Utvärdera programmet - vad fungerade?',
        'Planera nästa träningscykel',
      ],
    },
  ]
}

function getStrengthWeekWorkouts(
  week: number,
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6,
  hasGym: boolean
): GeneralFitnessWorkout[] {
  const d = getLevelDuration(level)
  const isDeload = week === 4 || week === 8 || week === 12
  const isStrengthPhase = week >= 9 && week <= 11

  const workouts: GeneralFitnessWorkout[] = []

  // Different splits based on training frequency
  if (daysPerWeek <= 3) {
    // Full body split
    for (let i = 0; i < daysPerWeek; i++) {
      workouts.push({
        type: 'strength',
        name: `Helkroppsstyrka ${i + 1}`,
        description: hasGym
          ? 'Knäböj, bänkpress, rodd, marklyft, axelpress'
          : 'Luftknäböj, armhävningar, utfall, planka, dips',
        duration: isDeload ? d - 15 : d + 10,
        intensity: isDeload ? 'low' : isStrengthPhase ? 'very_high' : 'high',
        equipment: hasGym ? ['Skivstång', 'Hantlar', 'Rack'] : ['Matta', 'Eventuellt hantlar'],
      })
    }
  } else if (daysPerWeek === 4) {
    // Upper/Lower split
    const splitNames = ['Överkropp A', 'Underkropp A', 'Överkropp B', 'Underkropp B']
    const splitDescriptions = hasGym
      ? [
          'Bänkpress, rodd, axelpress, biceps, triceps',
          'Knäböj, rumänsk marklyft, utfall, vadpress',
          'Hantelpress, chinups, laterala höjningar, curls',
          'Marklyft, benpress, benspark, hamstrings',
        ]
      : [
          'Armhävningar, rows, pike press, dips',
          'Knäböj, single-leg RDL, utfall, vadresp',
          'Diamond pushups, chinups/rows, lateralt',
          'Hip thrust, pistol squats, hamstring curls',
        ]

    for (let i = 0; i < 4; i++) {
      workouts.push({
        type: 'strength',
        name: splitNames[i],
        description: splitDescriptions[i],
        duration: isDeload ? d - 10 : d + 5,
        intensity: isDeload ? 'low' : isStrengthPhase ? 'very_high' : 'high',
        equipment: hasGym ? ['Skivstång', 'Hantlar', 'Kablar'] : ['Matta', 'Eventuellt resistance band'],
      })
    }
  } else {
    // Push/Pull/Legs or 5-day split
    const splitNames = ['Push', 'Pull', 'Ben', 'Push B', 'Pull B', 'Ben B']
    const splitDescriptions = hasGym
      ? [
          'Bänkpress, axelpress, dips, triceps',
          'Rodd, chinups, face pulls, biceps',
          'Knäböj, marklyft, utfall, vad',
          'Hantelpress, lateralhöjningar, flyes',
          'Kabelrodd, pulldowns, rear delts, curls',
          'Benspark, leg curl, hip thrust, vad',
        ]
      : [
          'Armhävningar varianter, pike press, dips',
          'Chinups/rows, face pulls, curls',
          'Knäböj, utfall, hip thrust, vad',
          'Diamond pushups, shoulder press',
          'Rows, chinups, rear delt',
          'Pistols, nordic curls, glute bridge',
        ]

    for (let i = 0; i < daysPerWeek; i++) {
      workouts.push({
        type: 'strength',
        name: splitNames[i % splitNames.length],
        description: splitDescriptions[i % splitDescriptions.length],
        duration: isDeload ? d - 10 : d,
        intensity: isDeload ? 'low' : isStrengthPhase ? 'very_high' : 'high',
        equipment: hasGym ? ['Skivstång', 'Hantlar', 'Maskiner'] : ['Matta', 'Pullup bar'],
      })
    }
  }

  return workouts
}

// ============================================
// FLEXIBILITY & MOBILITY PROGRAM (8 weeks)
// Focus: Range of motion, injury prevention
// ============================================
export function getFlexibilityProgram(
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6
): GeneralFitnessWeek[] {
  return [
    {
      week: 1,
      phase: 'BASE',
      focus: 'Kartlägg din rörlighet',
      weeklyVolume: `${daysPerWeek * 30} min`,
      workouts: getFlexibilityWeekWorkouts(1, level, daysPerWeek),
      tips: [
        'Ta bilder/filma för att se startpunkt',
        'Notera vilka områden som är strama',
        'Andas djupt under stretching',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Dynamisk rörlighet',
      weeklyVolume: `${daysPerWeek * 35} min`,
      workouts: getFlexibilityWeekWorkouts(2, level, daysPerWeek),
      tips: [
        'Dynamisk stretching före aktivitet',
        'Kontrollerade rörelser, inga ryck',
        'Fokusera på höfter och bröstrygg',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Statisk stretching',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getFlexibilityWeekWorkouts(3, level, daysPerWeek),
      tips: [
        'Håll stretchar 30-60 sekunder',
        'Andas ut och slappna av i positionen',
        'Aldrig stretcha till smärta',
      ],
    },
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Yoga-grunder',
      weeklyVolume: `${daysPerWeek * 45} min`,
      workouts: getFlexibilityWeekWorkouts(4, level, daysPerWeek),
      tips: [
        'Sun salutation är en bra grund',
        'Koppla andning till rörelse',
        'Modifiera positioner efter behov',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Progressiv rörlighet',
      weeklyVolume: `${daysPerWeek * 45} min`,
      workouts: getFlexibilityWeekWorkouts(5, level, daysPerWeek),
      tips: [
        'Öka range of motion gradvis',
        'Loaded stretching för vissa muskler',
        'Myofascial release (foam rolling)',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Fokuserade sessioner',
      weeklyVolume: `${daysPerWeek * 50} min`,
      workouts: getFlexibilityWeekWorkouts(6, level, daysPerWeek),
      tips: [
        'En dag per kroppsområde',
        'Extra tid på problemområden',
        'Kombinera med andningsövningar',
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Avancerade tekniker',
      weeklyVolume: `${daysPerWeek * 50} min`,
      workouts: getFlexibilityWeekWorkouts(7, level, daysPerWeek),
      tips: [
        'PNF-stretching för extra effekt',
        'Partner-stretching om möjligt',
        'Testa dina förbättringar',
      ],
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Underhåll och rutin',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getFlexibilityWeekWorkouts(8, level, daysPerWeek),
      tips: [
        'Skapa en hållbar daglig rutin',
        'Dokumentera dina framsteg',
        'Planera fortsatt rörlighetsarbete',
      ],
    },
  ]
}

function getFlexibilityWeekWorkouts(
  week: number,
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6
): GeneralFitnessWorkout[] {
  const workouts: GeneralFitnessWorkout[] = []

  const focusAreas = [
    { area: 'Höfter & Baksida lår', description: 'Pigeon pose, framåtfällning, hamstring stretch' },
    { area: 'Bröstrygg & Axlar', description: 'Thoracic rotation, cat-cow, chest opener' },
    { area: 'Helkropp', description: 'Sun salutation, full body flow' },
    { area: 'Nedre rygg & Core', description: 'Child pose, sphinx, core rotation' },
    { area: 'Ben & Vader', description: 'Quad stretch, calf stretch, ankle mobility' },
    { area: 'Nacke & Överkropp', description: 'Neck rolls, shoulder circles, arm stretches' },
  ]

  for (let i = 0; i < daysPerWeek; i++) {
    const focus = focusAreas[i % focusAreas.length]

    if (week <= 2) {
      workouts.push({
        type: 'mobility',
        name: `Dynamisk rörlighet: ${focus.area}`,
        description: `Dynamiska övningar för ${focus.area.toLowerCase()}`,
        duration: 30 + (week * 5),
        intensity: 'low',
      })
    } else if (week <= 5) {
      workouts.push({
        type: 'yoga',
        name: `Yoga-session: ${focus.area}`,
        description: focus.description,
        duration: 40 + (week * 2),
        intensity: 'low',
      })
    } else {
      workouts.push({
        type: 'mobility',
        name: `Avancerad rörlighet: ${focus.area}`,
        description: `PNF och loaded stretching för ${focus.area.toLowerCase()}`,
        duration: 45 + (week * 2),
        intensity: 'moderate',
      })
    }
  }

  return workouts
}

// ============================================
// STRESS RELIEF PROGRAM (8 weeks)
// Focus: Mindfulness, low-intensity movement
// ============================================
export function getStressReliefProgram(
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6
): GeneralFitnessWeek[] {
  return [
    {
      week: 1,
      phase: 'BASE',
      focus: 'Introducera mindful rörelse',
      weeklyVolume: `${daysPerWeek * 25} min`,
      workouts: getStressReliefWeekWorkouts(1, level, daysPerWeek),
      tips: [
        'Stäng av telefonen under träning',
        'Fokusera på andningen',
        'Ingen prestation - bara närvaro',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Bygga andningsmedvetenhet',
      weeklyVolume: `${daysPerWeek * 30} min`,
      workouts: getStressReliefWeekWorkouts(2, level, daysPerWeek),
      tips: [
        'Öva 4-7-8 andning dagligen',
        'Börja och avsluta dagen med stillhet',
        'Notera hur kroppen reagerar på stress',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Naturens läkande kraft',
      weeklyVolume: `${daysPerWeek * 35} min`,
      workouts: getStressReliefWeekWorkouts(3, level, daysPerWeek),
      tips: [
        'Träna utomhus när möjligt',
        'Skogsbad (shinrin-yoku) har forskad effekt',
        'Lämna tekniken hemma ibland',
      ],
    },
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Yoga och meditation',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getStressReliefWeekWorkouts(4, level, daysPerWeek),
      tips: [
        'Yin yoga för djup avslappning',
        'Guidad meditation för nybörjare',
        'Kvällsrutin för bättre sömn',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Rörelse som meditation',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getStressReliefWeekWorkouts(5, level, daysPerWeek),
      tips: [
        'Tai Chi eller Qigong',
        'Mindful walking - fokusera på varje steg',
        'Kropp och sinne i synk',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Kombinera tekniker',
      weeklyVolume: `${daysPerWeek * 45} min`,
      workouts: getStressReliefWeekWorkouts(6, level, daysPerWeek),
      tips: [
        'Yoga + meditation + promenad',
        'Skapa din personliga rutin',
        'Vad fungerar bäst för dig?',
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Fördjupad praktik',
      weeklyVolume: `${daysPerWeek * 50} min`,
      workouts: getStressReliefWeekWorkouts(7, level, daysPerWeek),
      tips: [
        'Längre meditationssessioner',
        'Restorative yoga',
        'Journaling efter praktik',
      ],
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Livsstilsintegration',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getStressReliefWeekWorkouts(8, level, daysPerWeek),
      tips: [
        'Gör mindfulness till en vana',
        'Micro-pauser under dagen',
        'Planera fortsatt praktik',
      ],
    },
  ]
}

function getStressReliefWeekWorkouts(
  week: number,
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6
): GeneralFitnessWorkout[] {
  const workouts: GeneralFitnessWorkout[] = []

  const activities = [
    { name: 'Morgonyoga', type: 'yoga' as const, desc: 'Gentle yoga för att starta dagen' },
    { name: 'Mindful promenad', type: 'active-rest' as const, desc: 'Fokuserad promenad i naturen' },
    { name: 'Yin Yoga', type: 'yoga' as const, desc: 'Djup stretching och avslappning' },
    { name: 'Andningsövningar', type: 'mobility' as const, desc: 'Pranayama och breathwork' },
    { name: 'Kvällsmeditation', type: 'active-rest' as const, desc: 'Guidad meditation för vila' },
    { name: 'Restorative session', type: 'yoga' as const, desc: 'Stöttad avslappning med props' },
  ]

  for (let i = 0; i < daysPerWeek; i++) {
    const activity = activities[i % activities.length]
    workouts.push({
      type: activity.type,
      name: activity.name,
      description: activity.desc,
      duration: 25 + (week * 3),
      intensity: 'low',
    })
  }

  return workouts
}

// ============================================
// ENDURANCE PROGRAM (12 weeks)
// Focus: Aerobic capacity, steady state cardio
// ============================================
export function getEnduranceProgram(
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6,
  preferredActivities: string[]
): GeneralFitnessWeek[] {
  const baseDuration = getLevelDuration(level)

  return [
    // Base Phase (Weeks 1-4)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Bygg aerob grund',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      workouts: getEnduranceWeekWorkouts(1, level, daysPerWeek, preferredActivities),
      tips: [
        'All träning i Zon 2 (kan prata)',
        'Bygger mitokondrier och kapillärer',
        'Tålamod - basen tar tid',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Öka volym försiktigt',
      weeklyVolume: `${daysPerWeek * (baseDuration + 5)} min`,
      workouts: getEnduranceWeekWorkouts(2, level, daysPerWeek, preferredActivities),
      tips: [
        'Max 10% volymökning per vecka',
        'Lyssna på kroppen',
        'Kvalitet före kvantitet',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Etablera konsistens',
      weeklyVolume: `${daysPerWeek * (baseDuration + 10)} min`,
      workouts: getEnduranceWeekWorkouts(3, level, daysPerWeek, preferredActivities),
      tips: [
        'Rutiner skapar resultat',
        'Variera aktiviteter för att undvika skador',
        'Spåra din vilopuls',
      ],
    },
    {
      week: 4,
      phase: 'BASE',
      focus: 'Återhämtningsvecka',
      weeklyVolume: `${(daysPerWeek - 1) * baseDuration} min`,
      workouts: getEnduranceWeekWorkouts(4, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, preferredActivities),
      tips: [
        'Minska volym 30-40%',
        'Behåll frekvens, minska duration',
        'Kroppen supercompenserar',
      ],
    },

    // Build Phase (Weeks 5-8)
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Introducera tempo',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      workouts: getEnduranceWeekWorkouts(5, level, daysPerWeek, preferredActivities),
      tips: [
        'Ett tempopass per vecka',
        'Zon 3 - "comfortably hard"',
        'Resten fortfarande lätt',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Bygg tröskel',
      weeklyVolume: `${daysPerWeek * (baseDuration + 20)} min`,
      workouts: getEnduranceWeekWorkouts(6, level, daysPerWeek, preferredActivities),
      tips: [
        'Tröskelpas bygger uthållighet',
        '20-40 min i Zon 4',
        'Utmanande men hållbart',
      ],
    },
    {
      week: 7,
      phase: 'BUILD',
      focus: 'Längre pass',
      weeklyVolume: `${daysPerWeek * (baseDuration + 25)} min`,
      workouts: getEnduranceWeekWorkouts(7, level, daysPerWeek, preferredActivities),
      tips: [
        'Ett långpass per vecka',
        'Bygg upp till 90+ min',
        'Träna näringsintag under längre pass',
      ],
    },
    {
      week: 8,
      phase: 'BUILD',
      focus: 'Deload',
      weeklyVolume: `${(daysPerWeek - 1) * baseDuration} min`,
      workouts: getEnduranceWeekWorkouts(8, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, preferredActivities),
      tips: [
        'Återhämtning inför peak-fasen',
        'Lätt och rolig träning',
        'Mental vila också',
      ],
    },

    // Peak Phase (Weeks 9-11)
    {
      week: 9,
      phase: 'PEAK',
      focus: 'Intensitet ökar',
      weeklyVolume: `${daysPerWeek * (baseDuration + 20)} min`,
      workouts: getEnduranceWeekWorkouts(9, level, daysPerWeek, preferredActivities),
      tips: [
        'Två kvalitetspass per vecka',
        'Tempo + intervaller',
        'Vila mellan hårda pass',
      ],
    },
    {
      week: 10,
      phase: 'PEAK',
      focus: 'Maximal stimulus',
      weeklyVolume: `${daysPerWeek * (baseDuration + 25)} min`,
      workouts: getEnduranceWeekWorkouts(10, level, daysPerWeek, preferredActivities),
      tips: [
        'Din starkaste vecka',
        'Push dig själv',
        'Extra fokus på återhämtning',
      ],
    },
    {
      week: 11,
      phase: 'PEAK',
      focus: 'Testa din kapacitet',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      workouts: getEnduranceWeekWorkouts(11, level, daysPerWeek, preferredActivities),
      tips: [
        'Time trial eller test',
        'Mät dina framsteg',
        'Fira resultaten!',
      ],
    },

    // Recovery (Week 12)
    {
      week: 12,
      phase: 'RECOVERY',
      focus: 'Utvärdering och planering',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      workouts: getEnduranceWeekWorkouts(12, level, daysPerWeek, preferredActivities),
      tips: [
        'Lätt träning',
        'Analysera vad som fungerade',
        'Planera nästa block',
      ],
    },
  ]
}

function getEnduranceWeekWorkouts(
  week: number,
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6,
  preferredActivities: string[]
): GeneralFitnessWorkout[] {
  const d = getLevelDuration(level)
  const isRecoveryWeek = week === 4 || week === 8 || week === 12
  const isBuildOrPeak = week >= 5 && week <= 11

  const workouts: GeneralFitnessWorkout[] = []

  // Map preferred activities to workout types
  const activityMap: Record<string, string> = {
    running: 'Löpning',
    cycling: 'Cykling',
    swimming: 'Simning',
    walking: 'Promenad/Power walk',
    rowing: 'Rodd',
    hiking: 'Vandring',
  }

  const activities = preferredActivities.length > 0
    ? preferredActivities.map(a => activityMap[a] || a)
    : ['Löpning', 'Cykling', 'Promenad']

  for (let i = 0; i < daysPerWeek; i++) {
    const activity = activities[i % activities.length]

    if (isRecoveryWeek) {
      workouts.push({
        type: 'cardio',
        name: `Lätt ${activity}`,
        description: 'Återhämtning - mycket lätt tempo (Zon 1-2)',
        duration: d - 10,
        intensity: 'low',
      })
    } else if (isBuildOrPeak && i === 0) {
      // One quality session per week
      workouts.push({
        type: 'cardio',
        name: week >= 9 ? `Intervall ${activity}` : `Tempo ${activity}`,
        description: week >= 9
          ? '5×5 min i Zon 4 med 2 min vila'
          : '20-30 min i Zon 3-4',
        duration: d + 10,
        intensity: 'high',
      })
    } else if (isBuildOrPeak && i === daysPerWeek - 1) {
      // Long session at end of week
      workouts.push({
        type: 'cardio',
        name: `Långpass ${activity}`,
        description: 'Byggpass - längre duration i Zon 2',
        duration: d + 30,
        intensity: 'moderate',
      })
    } else {
      // Easy sessions
      workouts.push({
        type: 'cardio',
        name: `${activity} Zon 2`,
        description: 'Lätt kondition - bygg aerob bas',
        duration: d + (week * 2),
        intensity: 'low',
      })
    }
  }

  return workouts
}

// ============================================
// GENERAL HEALTH PROGRAM (8 weeks)
// Focus: Balanced fitness, wellbeing
// ============================================
export function getGeneralHealthProgram(
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6
): GeneralFitnessWeek[] {
  const d = getLevelDuration(level)

  return [
    {
      week: 1,
      phase: 'BASE',
      focus: 'Etablera balanserad rutin',
      weeklyVolume: `${daysPerWeek * d} min`,
      workouts: getGeneralHealthWeekWorkouts(1, level, daysPerWeek),
      tips: [
        'Mix av kondition, styrka och rörlighet',
        'Börja med vad du tycker om',
        'Regelbundenhet > intensitet',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Bygg dagliga vanor',
      weeklyVolume: `${daysPerWeek * (d + 5)} min`,
      workouts: getGeneralHealthWeekWorkouts(2, level, daysPerWeek),
      tips: [
        'Lägg till promenader mellan pass',
        'Drick mer vatten',
        'Gå och lägg dig 15 min tidigare',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Öka vardagsaktivitet',
      weeklyVolume: `${daysPerWeek * (d + 10)} min`,
      workouts: getGeneralHealthWeekWorkouts(3, level, daysPerWeek),
      tips: [
        '10 000 steg/dag som mål',
        'Stå upp varje timme',
        'Aktiv transport när möjligt',
      ],
    },
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Konsolidering',
      weeklyVolume: `${daysPerWeek * d} min`,
      workouts: getGeneralHealthWeekWorkouts(4, level, daysPerWeek),
      tips: [
        'Lättare vecka - behåll vanor',
        'Utvärdera vad som fungerar',
        'Njut av processen',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Lägg till utmaning',
      weeklyVolume: `${daysPerWeek * (d + 10)} min`,
      workouts: getGeneralHealthWeekWorkouts(5, level, daysPerWeek),
      tips: [
        'Ett pass med högre intensitet',
        'Prova en ny aktivitet',
        'Utmana dig lagom',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Varierad träning',
      weeklyVolume: `${daysPerWeek * (d + 15)} min`,
      workouts: getGeneralHealthWeekWorkouts(6, level, daysPerWeek),
      tips: [
        'Blanda aktiviteter för helhetshälsa',
        'Prova gruppträning',
        'Träna med en vän',
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Maximal variation',
      weeklyVolume: `${daysPerWeek * (d + 15)} min`,
      workouts: getGeneralHealthWeekWorkouts(7, level, daysPerWeek),
      tips: [
        'Denna vecka - prova allt!',
        'Vad tycker du mest om?',
        'Dokumentera hur du mår',
      ],
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Livsstilsplan',
      weeklyVolume: `${daysPerWeek * d} min`,
      workouts: getGeneralHealthWeekWorkouts(8, level, daysPerWeek),
      tips: [
        'Skapa din hållbara rutin',
        'Vad ska du fortsätta med?',
        'Hälsa är en livsstil, inte ett mål',
      ],
    },
  ]
}

function getGeneralHealthWeekWorkouts(
  week: number,
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6
): GeneralFitnessWorkout[] {
  const d = getLevelDuration(level)
  const workouts: GeneralFitnessWorkout[] = []

  const weeklyPattern = [
    { type: 'cardio' as const, name: 'Konditionspass' },
    { type: 'strength' as const, name: 'Styrkepass' },
    { type: 'mobility' as const, name: 'Rörlighet/Yoga' },
    { type: 'active-rest' as const, name: 'Aktiv vila' },
    { type: 'cardio' as const, name: 'Varierat kondition' },
    { type: 'core' as const, name: 'Core och balans' },
  ]

  for (let i = 0; i < daysPerWeek; i++) {
    const pattern = weeklyPattern[i % weeklyPattern.length]
    workouts.push({
      type: pattern.type,
      name: pattern.name,
      description: getGeneralHealthDescription(pattern.type, week),
      duration: week === 4 || week === 8 ? d - 10 : d + (week * 2),
      intensity: week <= 3 ? 'low' : week === 4 || week === 8 ? 'low' : 'moderate',
    })
  }

  return workouts
}

function getGeneralHealthDescription(type: string, week: number): string {
  const descriptions: Record<string, string[]> = {
    cardio: [
      'Promenad, cykling eller simning i lugnt tempo',
      'Valfri konditionsträning - hitta något du gillar',
    ],
    strength: [
      'Grundläggande styrkeövningar för hela kroppen',
      'Fokus på funktionell styrka för vardagen',
    ],
    mobility: [
      'Stretching och rörlighetsövningar',
      'Yoga eller Pilates-inspirerat',
    ],
    'active-rest': [
      'Lätt aktivitet - promenad, lek, trädgård',
      'Vila aktivt - rör på dig men stressa inte',
    ],
    core: [
      'Planka, bird-dog, dead bug',
      'Stabilitet och balansträning',
    ],
  }

  const options = descriptions[type] || ['Balanserad träning']
  return options[week % options.length]
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getLevelDuration(level: FitnessLevel): number {
  const durations: Record<FitnessLevel, number> = {
    sedentary: 25,
    lightly_active: 35,
    moderately_active: 45,
    very_active: 55,
    athlete: 60,
  }
  return durations[level]
}

function getLevelIntensity(level: FitnessLevel): string {
  const intensities: Record<FitnessLevel, string> = {
    sedentary: 'low',
    lightly_active: 'low-moderate',
    moderately_active: 'moderate',
    very_active: 'moderate-high',
    athlete: 'high',
  }
  return intensities[level]
}

/**
 * Get the appropriate program based on user's primary goal
 */
export function getGeneralFitnessProgram(
  goal: FitnessGoal,
  level: FitnessLevel,
  daysPerWeek: 3 | 4 | 5 | 6,
  options?: {
    hasGymAccess?: boolean
    preferredActivities?: string[]
  }
): GeneralFitnessWeek[] {
  const { hasGymAccess = false, preferredActivities = [] } = options || {}

  switch (goal) {
    case 'weight_loss':
      return getWeightLossProgram(level, daysPerWeek)
    case 'strength':
      return getStrengthBuildingProgram(level, daysPerWeek, hasGymAccess)
    case 'flexibility':
      return getFlexibilityProgram(level, daysPerWeek)
    case 'stress_relief':
      return getStressReliefProgram(level, daysPerWeek)
    case 'endurance':
      return getEnduranceProgram(level, daysPerWeek, preferredActivities)
    case 'general_health':
    default:
      return getGeneralHealthProgram(level, daysPerWeek)
  }
}

/**
 * Get program duration in weeks based on goal
 */
export function getProgramDuration(goal: FitnessGoal): number {
  const durations: Record<FitnessGoal, number> = {
    weight_loss: 12,
    strength: 12,
    endurance: 12,
    general_health: 8,
    flexibility: 8,
    stress_relief: 8,
  }
  return durations[goal]
}

/**
 * Get program description for UI
 */
export function getProgramDescription(goal: FitnessGoal): {
  title: string
  titleSv: string
  description: string
  descriptionSv: string
  duration: number
  focusAreas: string[]
} {
  const descriptions: Record<FitnessGoal, ReturnType<typeof getProgramDescription>> = {
    weight_loss: {
      title: 'Weight Loss Program',
      titleSv: 'Viktminskningsprogram',
      description: 'High-intensity metabolic training combined with strength to maximize calorie burn',
      descriptionSv: 'Högintensiv metabolisk träning kombinerad med styrka för maximal kaloriförbränning',
      duration: 12,
      focusAreas: ['HIIT', 'Circuits', 'Styrka', 'NEAT'],
    },
    strength: {
      title: 'Strength Building Program',
      titleSv: 'Styrkebyggnadsprogram',
      description: 'Progressive overload training to build muscle and increase strength',
      descriptionSv: 'Progressiv överbelastning för att bygga muskler och öka styrka',
      duration: 12,
      focusAreas: ['Styrka', 'Hypertrofi', 'Power', 'Progression'],
    },
    endurance: {
      title: 'Endurance Program',
      titleSv: 'Uthållighetsprogram',
      description: 'Build aerobic capacity and cardiovascular fitness',
      descriptionSv: 'Bygg aerob kapacitet och kardiovaskulär fitness',
      duration: 12,
      focusAreas: ['Zon 2', 'Tempo', 'Långpass', 'Intervaller'],
    },
    general_health: {
      title: 'General Health Program',
      titleSv: 'Allmän hälsa',
      description: 'Balanced training for overall wellbeing and sustainable fitness',
      descriptionSv: 'Balanserad träning för övergripande välmående och hållbar fitness',
      duration: 8,
      focusAreas: ['Kondition', 'Styrka', 'Rörlighet', 'Livsstil'],
    },
    flexibility: {
      title: 'Flexibility & Mobility Program',
      titleSv: 'Rörlighet och mobilitet',
      description: 'Improve range of motion and prevent injuries',
      descriptionSv: 'Förbättra rörelseomfång och förebygg skador',
      duration: 8,
      focusAreas: ['Stretching', 'Yoga', 'Mobility', 'PNF'],
    },
    stress_relief: {
      title: 'Stress Relief Program',
      titleSv: 'Stresshanteringsprogram',
      description: 'Mindful movement and relaxation techniques',
      descriptionSv: 'Mindful rörelse och avslappningstekniker',
      duration: 8,
      focusAreas: ['Yoga', 'Meditation', 'Andning', 'Mindfulness'],
    },
  }

  return descriptions[goal]
}
