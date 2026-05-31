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
  const _intensity = getLevelIntensity(level)
  const baseDuration = getLevelDuration(level)

  return [
    // Phase 1: Foundation (Weeks 1-3)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Build training habits and base fitness',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      targetCalorieBurn: 1500,
      workouts: getWeightLossWeekWorkouts(1, level, daysPerWeek),
      tips: [
        'Focus on building routines, not perfection',
        'Drink at least 2 liters of water per day',
        'Walk 7000+ steps daily in addition to training',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Increase activity level gradually',
      weeklyVolume: `${daysPerWeek * (baseDuration + 5)} min`,
      targetCalorieBurn: 1800,
      workouts: getWeightLossWeekWorkouts(2, level, daysPerWeek),
      tips: [
        'Add one extra walk per day',
        'Swap elevators for stairs',
        'Plan the week\'s meals in advance',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Establish NEAT (daily activity)',
      weeklyVolume: `${daysPerWeek * (baseDuration + 10)} min`,
      targetCalorieBurn: 2000,
      workouts: getWeightLossWeekWorkouts(3, level, daysPerWeek),
      tips: [
        'NEAT = Non-Exercise Activity Thermogenesis',
        'Small movements throughout the day increase calorie burn',
        'Take breaks from sitting every hour',
      ],
    },

    // Phase 2: Build (Weeks 4-6)
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Recovery week - consolidate progress',
      weeklyVolume: `${(daysPerWeek - 1) * baseDuration} min`,
      targetCalorieBurn: 1500,
      workouts: getWeightLossWeekWorkouts(4, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6),
      tips: [
        'Listen to the body - rest matters',
        'Focus on sleep quality',
        'Eat nutrient-dense food, not less food',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Introduce HIIT for a metabolic boost',
      weeklyVolume: `${daysPerWeek * (baseDuration + 10)} min`,
      targetCalorieBurn: 2200,
      workouts: getWeightLossWeekWorkouts(5, level, daysPerWeek),
      tips: [
        'HIIT increases afterburn (EPOC)',
        'Max 2-3 HIIT sessions per week',
        'Mix with easy training for balance',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Maximize calorie burn',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      targetCalorieBurn: 2500,
      workouts: getWeightLossWeekWorkouts(6, level, daysPerWeek),
      tips: [
        'Combine strength + cardio in the same session',
        'Supersets and circuits raise heart rate',
        'Track food intake for a few days to build awareness',
      ],
    },

    // Phase 3: Peak (Weeks 7-9)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'High-intensity phase - push boundaries',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      targetCalorieBurn: 2800,
      workouts: getWeightLossWeekWorkouts(7, level, daysPerWeek),
      tips: [
        'This is the toughest week - you can do it!',
        'Eat enough protein (2 g/kg)',
        'Sleep at least 7 hours',
      ],
    },
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Hold the intensity',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      targetCalorieBurn: 2800,
      workouts: getWeightLossWeekWorkouts(8, level, daysPerWeek),
      tips: [
        'Measure progress - weight, measurements, energy level',
        'Celebrate small wins',
        'Visualize your goal',
      ],
    },
    {
      week: 9,
      phase: 'PEAK',
      focus: 'Deload before the final push',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      targetCalorieBurn: 2000,
      workouts: getWeightLossWeekWorkouts(9, level, daysPerWeek),
      tips: [
        'Reduce volume but keep intensity',
        'Extra focus on recovery',
        'Prepare mentally for the final push',
      ],
    },

    // Phase 4: Final Push (Weeks 10-12)
    {
      week: 10,
      phase: 'PEAK',
      focus: 'Final push - everything you have learned',
      weeklyVolume: `${daysPerWeek * (baseDuration + 20)} min`,
      targetCalorieBurn: 3000,
      workouts: getWeightLossWeekWorkouts(10, level, daysPerWeek),
      tips: [
        'Combine all the techniques you have learned',
        'Focus on finishing strong',
        'Think about new habits, not only numbers',
      ],
    },
    {
      week: 11,
      phase: 'PEAK',
      focus: 'Maximum effort',
      weeklyVolume: `${daysPerWeek * (baseDuration + 20)} min`,
      targetCalorieBurn: 3000,
      workouts: getWeightLossWeekWorkouts(11, level, daysPerWeek),
      tips: [
        'This week shows what you are capable of',
        'Push yourself - you are stronger than you think',
        'Document your journey',
      ],
    },
    {
      week: 12,
      phase: 'RECOVERY',
      focus: 'Evaluation and long-term plan',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      targetCalorieBurn: 2000,
      workouts: getWeightLossWeekWorkouts(12, level, daysPerWeek),
      tips: [
        'Compare before/after - celebrate your progress!',
        'Plan the next phase of your journey',
        'The habits you built matter most',
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
          name: 'Easy cardio session',
          description: 'Easy walking, cycling, or swimming',
          duration: d - 10,
          intensity: 'low',
          caloriesBurnEstimate: 150,
        })
      } else {
        workouts.push({
          type: 'mobility',
          name: 'Mobility and stretching',
          description: 'Yoga-inspired stretching and breathing exercises',
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
          name: 'HIIT Burn',
          description: '30 s work / 15 s rest x 20-30 rounds',
          duration: d + 10,
          intensity: 'very_high',
          caloriesBurnEstimate: 400,
          equipment: ['Mat', 'Timer'],
        })
      } else if (i % 3 === 1) {
        workouts.push({
          type: 'circuit',
          name: 'Metabolisk circuit',
          description: 'Strength + cardio combined for maximum calorie burn',
          duration: d + 15,
          intensity: 'high',
          caloriesBurnEstimate: 350,
          equipment: ['Dumbbells', 'Mat'],
        })
      } else {
        workouts.push({
          type: 'cardio',
          name: 'Steady state cardio',
          description: 'Moderate pace for endurance and fat burning',
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
          name: 'Cardio session',
          description: 'Running, cycling, walking, or swimming',
          duration: d,
          intensity: week > 5 ? 'moderate' : 'low',
          caloriesBurnEstimate: 250,
        })
      } else if (i % 3 === 1) {
        workouts.push({
          type: 'strength',
          name: 'Full-body strength',
          description: 'Focus on large muscle groups for increased metabolism',
          duration: d + 5,
          intensity: 'moderate',
          caloriesBurnEstimate: 200,
          equipment: ['Dumbbells or bodyweight'],
        })
      } else {
        workouts.push({
          type: week > 4 ? 'hiit' : 'cardio',
          name: week > 4 ? 'HIIT/Intervals' : 'Active walk',
          description: week > 4
            ? 'Short high-intensity intervals'
            : 'Brisk walk in a natural environment',
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
  const _baseDuration = getLevelDuration(level)

  return [
    // Phase 1: Anatomical Adaptation (Weeks 1-3)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Learn technique and build the foundation',
      weeklyVolume: `${daysPerWeek} sessions`,
      workouts: getStrengthWeekWorkouts(1, level, daysPerWeek, hasGymAccess),
      tips: [
        'Focus on TECHNIQUE, not weight',
        'Film yourself to check form',
        'Start easy - there is time to increase',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Establish movement patterns',
      weeklyVolume: `${daysPerWeek} sessions`,
      workouts: getStrengthWeekWorkouts(2, level, daysPerWeek, hasGymAccess),
      tips: [
        'Consistent training > perfect training',
        'Eat 2 g protein per kg bodyweight',
        'Sleep 7-9 hours for optimal recovery',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Increase volume cautiously',
      weeklyVolume: `${daysPerWeek} sessions`,
      workouts: getStrengthWeekWorkouts(3, level, daysPerWeek, hasGymAccess),
      tips: [
        'Add one set per exercise',
        'Start tracking your weights in a logbook',
        'Warm up properly before heavy lifts',
      ],
    },

    // Phase 2: Hypertrophy (Weeks 4-7)
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Deload - easy week for recovery',
      weeklyVolume: `${Math.max(2, daysPerWeek - 1)} sessions`,
      workouts: getStrengthWeekWorkouts(4, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, hasGymAccess),
      tips: [
        'Reduce weight by 40-50%',
        'Focus on mobility and technique',
        'Extra rest and recovery',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Hypertrophy focus begins',
      weeklyVolume: `${daysPerWeek} sessions`,
      workouts: getStrengthWeekWorkouts(5, level, daysPerWeek, hasGymAccess),
      tips: [
        '8-12 reps for muscle growth',
        '60-90 s rest between sets',
        'Controlled eccentric phase (lowering)',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Progressive overload',
      weeklyVolume: `${daysPerWeek} sessions`,
      workouts: getStrengthWeekWorkouts(6, level, daysPerWeek, hasGymAccess),
      tips: [
        'Increase weight 2.5-5 kg on compound exercises',
        'Or add 1-2 reps per set',
        'Muscle connection > weight',
      ],
    },
    {
      week: 7,
      phase: 'BUILD',
      focus: 'Volume increase',
      weeklyVolume: `${daysPerWeek} sessions`,
      workouts: getStrengthWeekWorkouts(7, level, daysPerWeek, hasGymAccess),
      tips: [
        'Add an extra set for weak muscle groups',
        'Use dropsets on the final set for extra stimulus',
        'Keep protein intake high',
      ],
    },

    // Phase 3: Strength (Weeks 8-10)
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Deload before strength block',
      weeklyVolume: `${Math.max(2, daysPerWeek - 1)} sessions`,
      workouts: getStrengthWeekWorkouts(8, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, hasGymAccess),
      tips: [
        'Easy week - the body is preparing',
        'Mental preparation for heavy lifts',
        'Visualize your goals',
      ],
    },
    {
      week: 9,
      phase: 'PEAK',
      focus: 'Strength block - heavier weights',
      weeklyVolume: `${daysPerWeek} sessions`,
      workouts: getStrengthWeekWorkouts(9, level, daysPerWeek, hasGymAccess),
      tips: [
        '4-6 reps for max strength',
        '2-3 min rest between heavy sets',
        'Focus on the big lifts',
      ],
    },
    {
      week: 10,
      phase: 'PEAK',
      focus: 'Push toward new PRs',
      weeklyVolume: `${daysPerWeek} sessions`,
      workouts: getStrengthWeekWorkouts(10, level, daysPerWeek, hasGymAccess),
      tips: [
        'Test new personal records',
        'Use a spotter for heavy lifts',
        'Celebrate your progress!',
      ],
    },

    // Phase 4: Recovery & Retest (Weeks 11-12)
    {
      week: 11,
      phase: 'PEAK',
      focus: 'Test max strength',
      weeklyVolume: `${Math.max(3, daysPerWeek - 1)} sessions`,
      workouts: getStrengthWeekWorkouts(11, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, hasGymAccess),
      tips: [
        'Test 1RM or 3RM on main exercises',
        'Warm up thoroughly',
        'Document all results',
      ],
    },
    {
      week: 12,
      phase: 'RECOVERY',
      focus: 'Recovery and planning',
      weeklyVolume: `${daysPerWeek} sessions`,
      workouts: getStrengthWeekWorkouts(12, level, daysPerWeek, hasGymAccess),
      tips: [
        'Easy training for recovery',
        'Evaluate the program - what worked?',
        'Plan the next training cycle',
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
        name: `Full-body strength ${i + 1}`,
        description: hasGym
          ? 'Squat, bench press, row, deadlift, shoulder press'
          : 'Air squats, push-ups, lunges, plank, dips',
        duration: isDeload ? d - 15 : d + 10,
        intensity: isDeload ? 'low' : isStrengthPhase ? 'very_high' : 'high',
        equipment: hasGym ? ['Barbell', 'Dumbbells', 'Rack'] : ['Mat', 'Optional dumbbells'],
      })
    }
  } else if (daysPerWeek === 4) {
    // Upper/Lower split
    const splitNames = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B']
    const splitDescriptions = hasGym
      ? [
          'Bench press, row, shoulder press, biceps, triceps',
          'Squat, Romanian deadlift, lunges, calf raises',
          'Dumbbell press, chin-ups, lateral raises, curls',
          'Deadlift, leg press, leg extension, hamstrings',
        ]
      : [
          'Push-ups, rows, pike press, dips',
          'Squats, single-leg RDL, lunges, calf raises',
          'Diamond push-ups, chin-ups/rows, lateral work',
          'Hip thrust, pistol squats, hamstring curls',
        ]

    for (let i = 0; i < 4; i++) {
      workouts.push({
        type: 'strength',
        name: splitNames[i],
        description: splitDescriptions[i],
        duration: isDeload ? d - 10 : d + 5,
        intensity: isDeload ? 'low' : isStrengthPhase ? 'very_high' : 'high',
        equipment: hasGym ? ['Barbell', 'Dumbbells', 'Cables'] : ['Mat', 'Optional resistance band'],
      })
    }
  } else {
    // Push/Pull/Legs or 5-day split
    const splitNames = ['Push', 'Pull', 'Legs', 'Push B', 'Pull B', 'Legs B']
    const splitDescriptions = hasGym
      ? [
          'Bench press, shoulder press, dips, triceps',
          'Rows, chin-ups, face pulls, biceps',
          'Squat, deadlift, lunges, calves',
          'Dumbbell press, lateral raises, flyes',
          'Cable row, pulldowns, rear delts, curls',
          'Leg extension, leg curl, hip thrust, calves',
        ]
      : [
          'Push-up variations, pike press, dips',
          'Chinups/rows, face pulls, curls',
          'Squats, lunges, hip thrust, calves',
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
        equipment: hasGym ? ['Barbell', 'Dumbbells', 'Machines'] : ['Mat', 'Pullup bar'],
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
      focus: 'Map your mobility',
      weeklyVolume: `${daysPerWeek * 30} min`,
      workouts: getFlexibilityWeekWorkouts(1, level, daysPerWeek),
      tips: [
        'Take photos/video to see the starting point',
        'Note which areas feel tight',
        'Breathe deeply during stretching',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Dynamic mobility',
      weeklyVolume: `${daysPerWeek * 35} min`,
      workouts: getFlexibilityWeekWorkouts(2, level, daysPerWeek),
      tips: [
        'Dynamic stretching before activity',
        'Controlled movements, no jerking',
        'Focus on hips and thoracic spine',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Static stretching',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getFlexibilityWeekWorkouts(3, level, daysPerWeek),
      tips: [
        'Hold stretches for 30-60 seconds',
        'Exhale and relax into the position',
        'Never stretch into pain',
      ],
    },
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Yoga basics',
      weeklyVolume: `${daysPerWeek * 45} min`,
      workouts: getFlexibilityWeekWorkouts(4, level, daysPerWeek),
      tips: [
        'Sun salutation is a good foundation',
        'Connect breath to movement',
        'Modify positions as needed',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Progressive mobility',
      weeklyVolume: `${daysPerWeek * 45} min`,
      workouts: getFlexibilityWeekWorkouts(5, level, daysPerWeek),
      tips: [
        'Increase range of motion gradually',
        'Loaded stretching for selected muscles',
        'Myofascial release (foam rolling)',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Focused sessions',
      weeklyVolume: `${daysPerWeek * 50} min`,
      workouts: getFlexibilityWeekWorkouts(6, level, daysPerWeek),
      tips: [
        'One day per body area',
        'Extra time on problem areas',
        'Combine with breathing exercises',
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Advanced techniques',
      weeklyVolume: `${daysPerWeek * 50} min`,
      workouts: getFlexibilityWeekWorkouts(7, level, daysPerWeek),
      tips: [
        'PNF stretching for extra effect',
        'Partner stretching if possible',
        'Test your improvements',
      ],
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Maintenance and routine',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getFlexibilityWeekWorkouts(8, level, daysPerWeek),
      tips: [
        'Create a sustainable daily routine',
        'Document your progress',
        'Plan continued mobility work',
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
    { area: 'Hips & Hamstrings', description: 'Pigeon pose, forward fold, hamstring stretch' },
    { area: 'Thoracic Spine & Shoulders', description: 'Thoracic rotation, cat-cow, chest opener' },
    { area: 'Full Body', description: 'Sun salutation, full body flow' },
    { area: 'Lower Back & Core', description: 'Child pose, sphinx, core rotation' },
    { area: 'Legs & Calves', description: 'Quad stretch, calf stretch, ankle mobility' },
    { area: 'Neck & Upper Body', description: 'Neck rolls, shoulder circles, arm stretches' },
  ]

  for (let i = 0; i < daysPerWeek; i++) {
    const focus = focusAreas[i % focusAreas.length]

    if (week <= 2) {
      workouts.push({
        type: 'mobility',
        name: `Dynamic mobility: ${focus.area}`,
        description: `Dynamic exercises for ${focus.area.toLowerCase()}`,
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
        name: `Advanced mobility: ${focus.area}`,
        description: `PNF and loaded stretching for ${focus.area.toLowerCase()}`,
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
      focus: 'Introduce mindful movement',
      weeklyVolume: `${daysPerWeek * 25} min`,
      workouts: getStressReliefWeekWorkouts(1, level, daysPerWeek),
      tips: [
        'Turn off the phone during training',
        'Focus on breathing',
        'No performance pressure - only presence',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Build breathing awareness',
      weeklyVolume: `${daysPerWeek * 30} min`,
      workouts: getStressReliefWeekWorkouts(2, level, daysPerWeek),
      tips: [
        'Practice 4-7-8 breathing daily',
        'Start and end the day with stillness',
        'Notice how the body reacts to stress',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'The healing power of nature',
      weeklyVolume: `${daysPerWeek * 35} min`,
      workouts: getStressReliefWeekWorkouts(3, level, daysPerWeek),
      tips: [
        'Train outdoors when possible',
        'Forest bathing (shinrin-yoku) has researched benefits',
        'Leave technology at home sometimes',
      ],
    },
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Yoga and meditation',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getStressReliefWeekWorkouts(4, level, daysPerWeek),
      tips: [
        'Yin yoga for deep relaxation',
        'Guided meditation for beginners',
        'Evening routine for better sleep',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Movement as meditation',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getStressReliefWeekWorkouts(5, level, daysPerWeek),
      tips: [
        'Tai Chi or Qigong',
        'Mindful walking - focus on every step',
        'Body and mind in sync',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Combine techniques',
      weeklyVolume: `${daysPerWeek * 45} min`,
      workouts: getStressReliefWeekWorkouts(6, level, daysPerWeek),
      tips: [
        'Yoga + meditation + walking',
        'Create your personal routine',
        'What works best for you?',
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Deepened practice',
      weeklyVolume: `${daysPerWeek * 50} min`,
      workouts: getStressReliefWeekWorkouts(7, level, daysPerWeek),
      tips: [
        'Longer meditation sessions',
        'Restorative yoga',
        'Journaling after practice',
      ],
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Lifestyle integration',
      weeklyVolume: `${daysPerWeek * 40} min`,
      workouts: getStressReliefWeekWorkouts(8, level, daysPerWeek),
      tips: [
        'Make mindfulness a habit',
        'Micro-breaks during the day',
        'Plan continued practice',
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
    { name: 'Morning yoga', type: 'yoga' as const, desc: 'Gentle yoga to start the day' },
    { name: 'Mindful walk', type: 'active-rest' as const, desc: 'Focused walk in nature' },
    { name: 'Yin Yoga', type: 'yoga' as const, desc: 'Deep stretching and relaxation' },
    { name: 'Breathing exercises', type: 'mobility' as const, desc: 'Pranayama and breathwork' },
    { name: 'Evening meditation', type: 'active-rest' as const, desc: 'Guided meditation for rest' },
    { name: 'Restorative session', type: 'yoga' as const, desc: 'Supported relaxation with props' },
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
      focus: 'Build aerobic base',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      workouts: getEnduranceWeekWorkouts(1, level, daysPerWeek, preferredActivities),
      tips: [
        'All training in Zone 2 (can talk)',
        'Builds mitochondria and capillaries',
        'Patience - the base takes time',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Increase volume cautiously',
      weeklyVolume: `${daysPerWeek * (baseDuration + 5)} min`,
      workouts: getEnduranceWeekWorkouts(2, level, daysPerWeek, preferredActivities),
      tips: [
        'Max 10% volume increase per week',
        'Listen to the body',
        'Quality before quantity',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Establish consistency',
      weeklyVolume: `${daysPerWeek * (baseDuration + 10)} min`,
      workouts: getEnduranceWeekWorkouts(3, level, daysPerWeek, preferredActivities),
      tips: [
        'Routines create results',
        'Vary activities to avoid injuries',
        'Track your resting heart rate',
      ],
    },
    {
      week: 4,
      phase: 'BASE',
      focus: 'Recovery week',
      weeklyVolume: `${(daysPerWeek - 1) * baseDuration} min`,
      workouts: getEnduranceWeekWorkouts(4, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, preferredActivities),
      tips: [
        'Reduce volume by 30-40%',
        'Keep frequency, reduce duration',
        'The body supercompensates',
      ],
    },

    // Build Phase (Weeks 5-8)
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Introduce tempo',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      workouts: getEnduranceWeekWorkouts(5, level, daysPerWeek, preferredActivities),
      tips: [
        'One tempo session per week',
        'Zone 3 - "comfortably hard"',
        'The rest remains easy',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Build threshold',
      weeklyVolume: `${daysPerWeek * (baseDuration + 20)} min`,
      workouts: getEnduranceWeekWorkouts(6, level, daysPerWeek, preferredActivities),
      tips: [
        'Threshold sessions build endurance',
        '20-40 min in Zone 4',
        'Challenging but sustainable',
      ],
    },
    {
      week: 7,
      phase: 'BUILD',
      focus: 'Longer sessions',
      weeklyVolume: `${daysPerWeek * (baseDuration + 25)} min`,
      workouts: getEnduranceWeekWorkouts(7, level, daysPerWeek, preferredActivities),
      tips: [
        'One long session per week',
        'Build up to 90+ min',
        'Practice fueling during longer sessions',
      ],
    },
    {
      week: 8,
      phase: 'BUILD',
      focus: 'Deload',
      weeklyVolume: `${(daysPerWeek - 1) * baseDuration} min`,
      workouts: getEnduranceWeekWorkouts(8, level, Math.max(3, daysPerWeek - 1) as 3 | 4 | 5 | 6, preferredActivities),
      tips: [
        'Recovery before the peak phase',
        'Easy and enjoyable training',
        'Mental rest too',
      ],
    },

    // Peak Phase (Weeks 9-11)
    {
      week: 9,
      phase: 'PEAK',
      focus: 'Intensity increases',
      weeklyVolume: `${daysPerWeek * (baseDuration + 20)} min`,
      workouts: getEnduranceWeekWorkouts(9, level, daysPerWeek, preferredActivities),
      tips: [
        'Two quality sessions per week',
        'Tempo + intervals',
        'Rest between hard sessions',
      ],
    },
    {
      week: 10,
      phase: 'PEAK',
      focus: 'Maximal stimulus',
      weeklyVolume: `${daysPerWeek * (baseDuration + 25)} min`,
      workouts: getEnduranceWeekWorkouts(10, level, daysPerWeek, preferredActivities),
      tips: [
        'Your strongest week',
        'Push yourself',
        'Extra focus on recovery',
      ],
    },
    {
      week: 11,
      phase: 'PEAK',
      focus: 'Test your capacity',
      weeklyVolume: `${daysPerWeek * (baseDuration + 15)} min`,
      workouts: getEnduranceWeekWorkouts(11, level, daysPerWeek, preferredActivities),
      tips: [
        'Time trial or test',
        'Measure your progress',
        'Celebrate the results!',
      ],
    },

    // Recovery (Week 12)
    {
      week: 12,
      phase: 'RECOVERY',
      focus: 'Evaluation and planning',
      weeklyVolume: `${daysPerWeek * baseDuration} min`,
      workouts: getEnduranceWeekWorkouts(12, level, daysPerWeek, preferredActivities),
      tips: [
        'Easy training',
        'Analyze what worked',
        'Plan the next block',
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
    running: 'Running',
    cycling: 'Cycling',
    swimming: 'Swimming',
    walking: 'Walking/Power walk',
    rowing: 'Rowing',
    hiking: 'Hiking',
  }

  const activities = preferredActivities.length > 0
    ? preferredActivities.map(a => activityMap[a] || a)
    : ['Running', 'Cycling', 'Walking']

  for (let i = 0; i < daysPerWeek; i++) {
    const activity = activities[i % activities.length]

    if (isRecoveryWeek) {
      workouts.push({
        type: 'cardio',
        name: `Easy ${activity}`,
        description: 'Recovery - very easy pace (Zone 1-2)',
        duration: d - 10,
        intensity: 'low',
      })
    } else if (isBuildOrPeak && i === 0) {
      // One quality session per week
      workouts.push({
        type: 'cardio',
        name: week >= 9 ? `Intervall ${activity}` : `Tempo ${activity}`,
        description: week >= 9
          ? '5 x 5 min in Zone 4 with 2 min recovery'
          : '20-30 min in Zone 3-4',
        duration: d + 10,
        intensity: 'high',
      })
    } else if (isBuildOrPeak && i === daysPerWeek - 1) {
      // Long session at end of week
      workouts.push({
        type: 'cardio',
        name: `Long session ${activity}`,
        description: 'Build session - longer duration in Zone 2',
        duration: d + 30,
        intensity: 'moderate',
      })
    } else {
      // Easy sessions
      workouts.push({
        type: 'cardio',
        name: `${activity} Zone 2`,
        description: 'Easy cardio - build aerobic base',
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
      focus: 'Establish a balanced routine',
      weeklyVolume: `${daysPerWeek * d} min`,
      workouts: getGeneralHealthWeekWorkouts(1, level, daysPerWeek),
      tips: [
        'Mix cardio, strength, and mobility',
        'Start with what you enjoy',
        'Consistency > intensity',
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Build daily habits',
      weeklyVolume: `${daysPerWeek * (d + 5)} min`,
      workouts: getGeneralHealthWeekWorkouts(2, level, daysPerWeek),
      tips: [
        'Add walks between sessions',
        'Drink more water',
        'Go to bed 15 min earlier',
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'Increase daily activity',
      weeklyVolume: `${daysPerWeek * (d + 10)} min`,
      workouts: getGeneralHealthWeekWorkouts(3, level, daysPerWeek),
      tips: [
        'Aim for 10,000 steps/day',
        'Stand up every hour',
        'Use active transportation when possible',
      ],
    },
    {
      week: 4,
      phase: 'BUILD',
      focus: 'Consolidation',
      weeklyVolume: `${daysPerWeek * d} min`,
      workouts: getGeneralHealthWeekWorkouts(4, level, daysPerWeek),
      tips: [
        'Easier week - keep the habits',
        'Evaluate what works',
        'Enjoy the process',
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Add challenge',
      weeklyVolume: `${daysPerWeek * (d + 10)} min`,
      workouts: getGeneralHealthWeekWorkouts(5, level, daysPerWeek),
      tips: [
        'One higher-intensity session',
        'Try a new activity',
        'Challenge yourself appropriately',
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Varied training',
      weeklyVolume: `${daysPerWeek * (d + 15)} min`,
      workouts: getGeneralHealthWeekWorkouts(6, level, daysPerWeek),
      tips: [
        'Mix activities for overall health',
        'Try group training',
        'Train with a friend',
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Maximum variation',
      weeklyVolume: `${daysPerWeek * (d + 15)} min`,
      workouts: getGeneralHealthWeekWorkouts(7, level, daysPerWeek),
      tips: [
        'This week - try everything!',
        'What do you enjoy most?',
        'Document how you feel',
      ],
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Lifestyle plan',
      weeklyVolume: `${daysPerWeek * d} min`,
      workouts: getGeneralHealthWeekWorkouts(8, level, daysPerWeek),
      tips: [
        'Create your sustainable routine',
        'What will you continue with?',
        'Health is a lifestyle, not a goal',
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
    { type: 'cardio' as const, name: 'Cardio session' },
    { type: 'strength' as const, name: 'Strength session' },
    { type: 'mobility' as const, name: 'Mobility/Yoga' },
    { type: 'active-rest' as const, name: 'Active rest' },
    { type: 'cardio' as const, name: 'Varied cardio' },
    { type: 'core' as const, name: 'Core and balance' },
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
      'Walking, cycling, or swimming at an easy pace',
      'Optional cardio - find something you enjoy',
    ],
    strength: [
      'Basic strength exercises for the whole body',
      'Focus on functional strength for daily life',
    ],
    mobility: [
      'Stretching and mobility exercises',
      'Yoga or Pilates-inspired',
    ],
    'active-rest': [
      'Light activity - walking, play, gardening',
      'Rest actively - move but do not stress',
    ],
    core: [
      'Planka, bird-dog, dead bug',
      'Stability and balance training',
    ],
  }

  const options = descriptions[type] || ['Balanced training']
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
      focusAreas: ['HIIT', 'Circuits', 'Strength', 'NEAT'],
    },
    strength: {
      title: 'Strength Building Program',
      titleSv: 'Styrkebyggnadsprogram',
      description: 'Progressive overload training to build muscle and increase strength',
      descriptionSv: 'Progressiv överbelastning för att bygga muskler och öka styrka',
      duration: 12,
      focusAreas: ['Strength', 'Hypertrophy', 'Power', 'Progression'],
    },
    endurance: {
      title: 'Endurance Program',
      titleSv: 'Uthållighetsprogram',
      description: 'Build aerobic capacity and cardiovascular fitness',
      descriptionSv: 'Bygg aerob kapacitet och kardiovaskulär fitness',
      duration: 12,
      focusAreas: ['Zone 2', 'Tempo', 'Long sessions', 'Intervals'],
    },
    general_health: {
      title: 'General Health Program',
      titleSv: 'Allmän hälsa',
      description: 'Balanced training for overall wellbeing and sustainable fitness',
      descriptionSv: 'Balanserad träning för övergripande välmående och hållbar fitness',
      duration: 8,
      focusAreas: ['Cardio', 'Strength', 'Mobility', 'Lifestyle'],
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
      focusAreas: ['Yoga', 'Meditation', 'Breathing', 'Mindfulness'],
    },
  }

  return descriptions[goal]
}
