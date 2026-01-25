/**
 * Seed Rehab Exercises
 *
 * Seeds the exercise library with rehabilitation-specific exercises.
 * Run with: npx ts-node prisma/seed-rehab-exercises.ts
 *
 * Categories:
 * - Hip/Glute Activation (10+ exercises)
 * - Ankle Mobility (8+ exercises)
 * - Knee Stability (10+ exercises)
 * - Core Stability (10+ exercises)
 * - Shoulder Rehab (10+ exercises)
 */

import { PrismaClient, RehabPhase, WorkoutType, BiomechanicalPillar, ProgressionLevel } from '@prisma/client'

const prisma = new PrismaClient()

interface RehabExercise {
  name: string
  nameSv: string
  description: string
  instructions: string
  category: WorkoutType
  muscleGroup: string
  equipment: string | null
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  biomechanicalPillar?: BiomechanicalPillar
  progressionLevel?: ProgressionLevel

  // Rehab-specific fields
  isRehabExercise: boolean
  rehabPhases: RehabPhase[]
  targetBodyParts: string[]
  contraindications: string[]

  // For linking progressions (by name reference)
  progressionName?: string
  regressionName?: string
}

// ============================================
// HIP/GLUTE ACTIVATION EXERCISES
// ============================================

const hipGluteExercises: RehabExercise[] = [
  {
    name: 'Clam Shell',
    nameSv: 'Mussla',
    description: 'Gluteus medius activation exercise performed lying on side.',
    instructions: `1. Lie on your side with knees bent at 45 degrees
2. Keep feet together and hips stacked
3. Slowly rotate top knee up toward ceiling
4. Hold for 2 seconds at the top
5. Lower with control
6. Keep pelvis stable throughout`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['hip', 'glutes'],
    contraindications: ['Acute hip fracture', 'Hip replacement (first 6 weeks)'],
    progressionName: 'Banded Clam Shell',
  },
  {
    name: 'Banded Clam Shell',
    nameSv: 'Mussla med band',
    description: 'Clam shell with resistance band for increased gluteus medius activation.',
    instructions: `1. Place resistance band around thighs above knees
2. Lie on your side with knees bent at 45 degrees
3. Slowly rotate top knee up against band resistance
4. Hold for 2 seconds at the top
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: 'Resistance band',
    difficulty: 'Beginner',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['hip', 'glutes'],
    contraindications: ['Acute hip fracture'],
    regressionName: 'Clam Shell',
    progressionName: 'Side Lying Hip Abduction',
  },
  {
    name: 'Side Lying Hip Abduction',
    nameSv: 'Höftabduktion i sidoläge',
    description: 'Hip abduction exercise for gluteus medius strengthening.',
    instructions: `1. Lie on your side with bottom leg bent for stability
2. Keep top leg straight and slightly behind body
3. Lift top leg toward ceiling, leading with heel
4. Keep hips stacked and avoid rotating
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['hip', 'glutes'],
    contraindications: ['Acute hip bursitis'],
    regressionName: 'Banded Clam Shell',
    progressionName: 'Standing Hip Abduction',
  },
  {
    name: 'Glute Bridge',
    nameSv: 'Höftlyft',
    description: 'Basic glute activation and hip extension exercise.',
    instructions: `1. Lie on back with knees bent, feet flat on floor
2. Arms at sides for stability
3. Drive through heels and lift hips toward ceiling
4. Squeeze glutes at the top for 2 seconds
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['hip', 'glutes', 'lower_back'],
    contraindications: ['Acute lumbar disc herniation'],
    progressionName: 'Single Leg Glute Bridge',
  },
  {
    name: 'Single Leg Glute Bridge',
    nameSv: 'Höftlyft på ett ben',
    description: 'Unilateral glute bridge for strength and stability.',
    instructions: `1. Lie on back with one knee bent, foot flat
2. Extend other leg straight or bent toward chest
3. Drive through planted heel and lift hips
4. Keep pelvis level throughout
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: null,
    difficulty: 'Intermediate',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['hip', 'glutes', 'core'],
    contraindications: ['Acute hamstring strain'],
    regressionName: 'Glute Bridge',
    progressionName: 'Hip Thrust',
  },
  {
    name: 'Quadruped Hip Circle',
    nameSv: 'Höftcirkel på alla fyra',
    description: 'Hip mobility and glute activation in quadruped position.',
    instructions: `1. Start on hands and knees
2. Lift one knee off ground, keeping it bent
3. Draw circles with the knee (forward, out, back, in)
4. Perform 5 circles each direction
5. Keep spine neutral throughout`,
    category: 'RECOVERY',
    muscleGroup: 'Glutes',
    equipment: null,
    difficulty: 'Beginner',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['hip', 'glutes'],
    contraindications: ['Acute hip labral tear'],
  },
  {
    name: 'Fire Hydrant',
    nameSv: 'Brandpost',
    description: 'Hip abduction in quadruped position.',
    instructions: `1. Start on hands and knees
2. Keep knee bent at 90 degrees
3. Lift knee out to the side
4. Keep hips level and spine neutral
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING'],
    targetBodyParts: ['hip', 'glutes'],
    contraindications: ['Knee pain in quadruped position'],
    progressionName: 'Banded Fire Hydrant',
  },
  {
    name: 'Standing Hip Abduction',
    nameSv: 'Stående höftabduktion',
    description: 'Standing hip abduction for functional strength.',
    instructions: `1. Stand on one leg, holding support if needed
2. Keep standing knee slightly bent
3. Lift other leg out to the side
4. Keep hips level and torso upright
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: null,
    difficulty: 'Intermediate',
    biomechanicalPillar: 'UNILATERAL',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['hip', 'glutes'],
    contraindications: ['Balance impairment without support'],
    regressionName: 'Side Lying Hip Abduction',
  },
  {
    name: 'Monster Walk',
    nameSv: 'Monster Walk',
    description: 'Lateral walking with resistance band for glute activation.',
    instructions: `1. Place band around ankles or above knees
2. Stand in half squat position
3. Take small steps sideways
4. Keep tension on band throughout
5. Maintain squat depth`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: 'Resistance band',
    difficulty: 'Intermediate',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['hip', 'glutes', 'upper_legs'],
    contraindications: ['Acute knee injury'],
  },
  {
    name: 'Hip Thrust',
    nameSv: 'Höftstöt',
    description: 'Advanced glute strengthening with upper back elevated.',
    instructions: `1. Sit with upper back against bench
2. Feet flat on floor, knees bent at 90 degrees
3. Drive through heels and lift hips
4. Squeeze glutes at the top
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: 'Bench',
    difficulty: 'Advanced',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_3',
    isRehabExercise: true,
    rehabPhases: ['FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['hip', 'glutes'],
    contraindications: ['Acute lumbar injury'],
    regressionName: 'Single Leg Glute Bridge',
  },
]

// ============================================
// ANKLE MOBILITY EXERCISES
// ============================================

const ankleMobilityExercises: RehabExercise[] = [
  {
    name: 'Ankle Alphabet',
    nameSv: 'Fotledsbokstäver',
    description: 'Ankle mobility exercise tracing letters with foot.',
    instructions: `1. Sit with leg extended or elevated
2. Use big toe to trace alphabet letters
3. Move through full range of motion
4. Keep leg still, move only ankle
5. Complete A-Z`,
    category: 'RECOVERY',
    muscleGroup: 'Ankle',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'FOOT_ANKLE',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['ankle', 'foot'],
    contraindications: ['Acute ankle fracture'],
  },
  {
    name: 'Towel Calf Stretch',
    nameSv: 'Vadsträck med handduk',
    description: 'Gentle calf and Achilles stretch using towel.',
    instructions: `1. Sit with leg extended
2. Loop towel around ball of foot
3. Gently pull towel toward you
4. Keep knee straight
5. Hold 30 seconds`,
    category: 'RECOVERY',
    muscleGroup: 'Calf',
    equipment: 'Towel',
    difficulty: 'Beginner',
    biomechanicalPillar: 'FOOT_ANKLE',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['ankle', 'lower_legs'],
    contraindications: ['Acute Achilles rupture'],
    progressionName: 'Wall Calf Stretch',
  },
  {
    name: 'Wall Calf Stretch',
    nameSv: 'Vadstretch mot vägg',
    description: 'Standing calf stretch against wall.',
    instructions: `1. Stand facing wall, hands on wall
2. Step one foot back, keeping heel down
3. Bend front knee, keep back knee straight
4. Lean into wall until stretch is felt
5. Hold 30 seconds each side`,
    category: 'RECOVERY',
    muscleGroup: 'Calf',
    equipment: 'Wall',
    difficulty: 'Beginner',
    biomechanicalPillar: 'FOOT_ANKLE',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['ankle', 'lower_legs'],
    contraindications: ['Acute calf strain'],
    regressionName: 'Towel Calf Stretch',
    progressionName: 'Heel Drop',
  },
  {
    name: 'Ankle Dorsiflexion with Band',
    nameSv: 'Dorsalflexion med band',
    description: 'Improve ankle dorsiflexion using resistance band.',
    instructions: `1. Sit with band anchored behind you
2. Loop band around top of foot
3. Pull foot toward you against band
4. Hold 5 seconds, return slowly
5. Repeat 10-15 times`,
    category: 'RECOVERY',
    muscleGroup: 'Ankle',
    equipment: 'Resistance band',
    difficulty: 'Beginner',
    biomechanicalPillar: 'FOOT_ANKLE',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING'],
    targetBodyParts: ['ankle'],
    contraindications: ['Anterior ankle impingement'],
  },
  {
    name: 'Seated Ankle Circles',
    nameSv: 'Sittande fotledscirklar',
    description: 'Basic ankle mobility exercise.',
    instructions: `1. Sit with leg extended or crossed
2. Slowly rotate ankle clockwise
3. Complete 10 circles
4. Reverse direction for 10 circles
5. Keep movement smooth and controlled`,
    category: 'RECOVERY',
    muscleGroup: 'Ankle',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'FOOT_ANKLE',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['ankle'],
    contraindications: [],
  },
  {
    name: 'Heel Drop',
    nameSv: 'Hälsänkning',
    description: 'Eccentric calf exercise for Achilles rehab.',
    instructions: `1. Stand on step with heels hanging off edge
2. Rise up onto toes (use rail for balance)
3. Slowly lower heels below step level
4. Take 3-5 seconds to lower
5. Rise back up and repeat`,
    category: 'STRENGTH',
    muscleGroup: 'Calf',
    equipment: 'Step',
    difficulty: 'Intermediate',
    biomechanicalPillar: 'FOOT_ANKLE',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['ankle', 'lower_legs'],
    contraindications: ['Acute Achilles rupture', 'Acute calf strain'],
    regressionName: 'Wall Calf Stretch',
    progressionName: 'Single Leg Heel Drop',
  },
  {
    name: 'Single Leg Heel Drop',
    nameSv: 'Hälsänkning på ett ben',
    description: 'Single leg eccentric calf exercise.',
    instructions: `1. Stand on step on one leg
2. Rise up onto toes
3. Slowly lower heel below step level
4. Take 3-5 seconds to lower
5. Use other leg to help rise back up`,
    category: 'STRENGTH',
    muscleGroup: 'Calf',
    equipment: 'Step',
    difficulty: 'Advanced',
    biomechanicalPillar: 'FOOT_ANKLE',
    progressionLevel: 'LEVEL_3',
    isRehabExercise: true,
    rehabPhases: ['FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['ankle', 'lower_legs'],
    contraindications: ['Achilles tendinopathy (high pain phase)'],
    regressionName: 'Heel Drop',
  },
  {
    name: 'Toe Raises',
    nameSv: 'Tålyft',
    description: 'Strengthen tibialis anterior for ankle stability.',
    instructions: `1. Stand with back against wall
2. Lift toes off ground, keeping heels down
3. Hold 2 seconds at top
4. Lower with control
5. Repeat 15-20 times`,
    category: 'STRENGTH',
    muscleGroup: 'Tibialis',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'FOOT_ANKLE',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['ankle', 'lower_legs'],
    contraindications: [],
  },
]

// ============================================
// KNEE STABILITY EXERCISES
// ============================================

const kneeStabilityExercises: RehabExercise[] = [
  {
    name: 'Terminal Knee Extension',
    nameSv: 'Terminal knäextension',
    description: 'VMO strengthening in terminal range.',
    instructions: `1. Place resistance band behind knee
2. Anchor band behind you
3. Stand on slight bend
4. Straighten knee fully against band
5. Hold 5 seconds, repeat 10-15 times`,
    category: 'STRENGTH',
    muscleGroup: 'Quadriceps',
    equipment: 'Resistance band',
    difficulty: 'Beginner',
    biomechanicalPillar: 'KNEE_DOMINANCE',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING'],
    targetBodyParts: ['knee', 'upper_legs'],
    contraindications: ['Acute knee effusion'],
    progressionName: 'Straight Leg Raise',
  },
  {
    name: 'Straight Leg Raise',
    nameSv: 'Rakt benlyft',
    description: 'Quad strengthening without knee flexion.',
    instructions: `1. Lie on back with one knee bent
2. Keep other leg straight
3. Tighten quad and lift leg 12 inches
4. Hold 5 seconds
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Quadriceps',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'KNEE_DOMINANCE',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['knee', 'upper_legs', 'hip'],
    contraindications: [],
    regressionName: 'Terminal Knee Extension',
    progressionName: 'Seated Knee Extension',
  },
  {
    name: 'Seated Knee Extension',
    nameSv: 'Sittande knäextension',
    description: 'Quad strengthening through range of motion.',
    instructions: `1. Sit on chair with feet hanging
2. Slowly straighten one knee
3. Hold at top for 3 seconds
4. Lower with control
5. Repeat 10-15 times each leg`,
    category: 'STRENGTH',
    muscleGroup: 'Quadriceps',
    equipment: 'Chair',
    difficulty: 'Beginner',
    biomechanicalPillar: 'KNEE_DOMINANCE',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['knee', 'upper_legs'],
    contraindications: ['Patellofemoral pain (may need limited range)'],
    regressionName: 'Straight Leg Raise',
    progressionName: 'Wall Sit',
  },
  {
    name: 'Wall Sit',
    nameSv: 'Vägg-sitt',
    description: 'Isometric quad strengthening.',
    instructions: `1. Stand with back against wall
2. Slide down until thighs parallel to floor
3. Keep knees at 90 degrees
4. Hold for 30-60 seconds
5. Slide back up`,
    category: 'STRENGTH',
    muscleGroup: 'Quadriceps',
    equipment: 'Wall',
    difficulty: 'Intermediate',
    biomechanicalPillar: 'KNEE_DOMINANCE',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['knee', 'upper_legs'],
    contraindications: ['Acute patellofemoral syndrome'],
    regressionName: 'Seated Knee Extension',
    progressionName: 'Single Leg Wall Sit',
  },
  {
    name: 'Hamstring Curl Standing',
    nameSv: 'Stående hamstringscurl',
    description: 'Standing hamstring strengthening.',
    instructions: `1. Stand holding onto support
2. Bend one knee bringing heel toward glutes
3. Hold briefly at top
4. Lower with control
5. Repeat 10-15 times each leg`,
    category: 'STRENGTH',
    muscleGroup: 'Hamstrings',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['knee', 'upper_legs'],
    contraindications: ['Acute hamstring strain'],
    progressionName: 'Nordic Hamstring Curl',
  },
  {
    name: 'Step Ups',
    nameSv: 'Uppsteg',
    description: 'Functional knee strengthening.',
    instructions: `1. Stand in front of step or box
2. Step up with one foot
3. Drive through heel to stand up
4. Step down with control
5. Alternate legs or complete one side`,
    category: 'STRENGTH',
    muscleGroup: 'Quadriceps',
    equipment: 'Step',
    difficulty: 'Intermediate',
    biomechanicalPillar: 'KNEE_DOMINANCE',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['knee', 'upper_legs', 'hip'],
    contraindications: ['Acute knee pain on stairs'],
    progressionName: 'Lateral Step Ups',
  },
  {
    name: 'Lateral Step Ups',
    nameSv: 'Sidobena uppsteg',
    description: 'Lateral step up for hip and knee stability.',
    instructions: `1. Stand beside step or box
2. Step up sideways onto step
3. Drive through hip to stand
4. Step down with control
5. Repeat 10-12 times each side`,
    category: 'STRENGTH',
    muscleGroup: 'Glutes',
    equipment: 'Step',
    difficulty: 'Intermediate',
    biomechanicalPillar: 'UNILATERAL',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['knee', 'hip', 'upper_legs'],
    contraindications: ['Acute IT band syndrome'],
    regressionName: 'Step Ups',
  },
  {
    name: 'Mini Squats',
    nameSv: 'Mini-squats',
    description: 'Partial range squat for knee rehab.',
    instructions: `1. Stand with feet hip width apart
2. Bend knees to 45-60 degrees
3. Keep weight in heels
4. Push back up
5. Repeat 15-20 times`,
    category: 'STRENGTH',
    muscleGroup: 'Quadriceps',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'KNEE_DOMINANCE',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING'],
    targetBodyParts: ['knee', 'upper_legs'],
    contraindications: ['Acute knee effusion'],
    progressionName: 'Goblet Squat',
  },
  {
    name: 'Single Leg Balance',
    nameSv: 'Enbensstående',
    description: 'Basic single leg balance for knee stability.',
    instructions: `1. Stand on one leg
2. Keep knee slightly bent
3. Hold position for 30-60 seconds
4. Use wall for support if needed
5. Progress to eyes closed`,
    category: 'CORE',
    muscleGroup: 'Full Body',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'UNILATERAL',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['knee', 'ankle', 'hip'],
    contraindications: [],
    progressionName: 'Single Leg Balance on Foam',
  },
  {
    name: 'Single Leg Balance on Foam',
    nameSv: 'Enbensstående på skumgummi',
    description: 'Advanced balance challenge on unstable surface.',
    instructions: `1. Stand on foam pad or balance disc
2. Lift one foot off ground
3. Maintain balance for 30-60 seconds
4. Keep knee slightly bent
5. Progress to eyes closed or arm movements`,
    category: 'CORE',
    muscleGroup: 'Full Body',
    equipment: 'Balance pad',
    difficulty: 'Intermediate',
    biomechanicalPillar: 'UNILATERAL',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['knee', 'ankle', 'hip'],
    contraindications: ['Severe balance impairment'],
    regressionName: 'Single Leg Balance',
  },
]

// ============================================
// CORE STABILITY EXERCISES
// ============================================

const coreStabilityExercises: RehabExercise[] = [
  {
    name: 'Dead Bug',
    nameSv: 'Död Insekt',
    description: 'Core stability exercise maintaining neutral spine.',
    instructions: `1. Lie on back with arms straight up
2. Legs in tabletop position (90/90)
3. Lower opposite arm and leg
4. Keep lower back pressed into floor
5. Return and alternate sides`,
    category: 'CORE',
    muscleGroup: 'Core',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'ANTI_ROTATION_CORE',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['core', 'lower_back'],
    contraindications: [],
    progressionName: 'Dead Bug with Band',
  },
  {
    name: 'Bird Dog',
    nameSv: 'Fågelhund',
    description: 'Core and back stability in quadruped.',
    instructions: `1. Start on hands and knees
2. Extend opposite arm and leg
3. Keep spine neutral and hips level
4. Hold 5 seconds
5. Return and alternate sides`,
    category: 'CORE',
    muscleGroup: 'Core',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'ANTI_ROTATION_CORE',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['core', 'lower_back', 'hip'],
    contraindications: [],
    progressionName: 'Bird Dog with Resistance',
  },
  {
    name: 'Plank',
    nameSv: 'Planka',
    description: 'Isometric core strengthening.',
    instructions: `1. Start in push-up position on forearms
2. Keep body in straight line
3. Engage core and glutes
4. Hold for 30-60 seconds
5. Avoid sagging or piking`,
    category: 'CORE',
    muscleGroup: 'Core',
    equipment: null,
    difficulty: 'Intermediate',
    biomechanicalPillar: 'ANTI_ROTATION_CORE',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['core', 'shoulder'],
    contraindications: ['Acute shoulder injury'],
    progressionName: 'Side Plank',
  },
  {
    name: 'Side Plank',
    nameSv: 'Sidoplanka',
    description: 'Lateral core stability exercise.',
    instructions: `1. Lie on side with elbow under shoulder
2. Lift hips off ground
3. Keep body in straight line
4. Hold 20-45 seconds
5. Repeat on other side`,
    category: 'CORE',
    muscleGroup: 'Obliques',
    equipment: null,
    difficulty: 'Intermediate',
    biomechanicalPillar: 'ANTI_ROTATION_CORE',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['core', 'hip'],
    contraindications: ['Acute shoulder injury'],
    regressionName: 'Plank',
    progressionName: 'Side Plank with Hip Drop',
  },
  {
    name: 'Pallof Press',
    nameSv: 'Pallof Press',
    description: 'Anti-rotation core exercise with band.',
    instructions: `1. Stand sideways to cable or band anchor
2. Hold handle at chest level
3. Press arms straight out
4. Resist rotation for 3 seconds
5. Return and repeat`,
    category: 'CORE',
    muscleGroup: 'Core',
    equipment: 'Resistance band',
    difficulty: 'Intermediate',
    biomechanicalPillar: 'ANTI_ROTATION_CORE',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['core'],
    contraindications: [],
  },
  {
    name: 'Cat Cow',
    nameSv: 'Katt-Ko',
    description: 'Spinal mobility exercise.',
    instructions: `1. Start on hands and knees
2. Arch back up like a cat (exhale)
3. Lower belly and look up (inhale)
4. Move smoothly between positions
5. Repeat 10-15 cycles`,
    category: 'RECOVERY',
    muscleGroup: 'Spine',
    equipment: null,
    difficulty: 'Beginner',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['lower_back', 'core'],
    contraindications: ['Acute disc herniation'],
  },
  {
    name: 'Pelvic Tilts',
    nameSv: 'Bäckentilts',
    description: 'Basic pelvic mobility and lumbar control.',
    instructions: `1. Lie on back with knees bent
2. Flatten lower back into floor
3. Hold 5 seconds
4. Release to neutral
5. Repeat 10-15 times`,
    category: 'RECOVERY',
    muscleGroup: 'Core',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'ANTI_ROTATION_CORE',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['core', 'lower_back'],
    contraindications: [],
    progressionName: 'Dead Bug',
  },
  {
    name: 'Supine Twist',
    nameSv: 'Liggande vridning',
    description: 'Gentle spinal rotation stretch.',
    instructions: `1. Lie on back with arms out to sides
2. Bring knees to chest
3. Lower knees to one side
4. Keep shoulders on floor
5. Hold 30 seconds each side`,
    category: 'RECOVERY',
    muscleGroup: 'Spine',
    equipment: null,
    difficulty: 'Beginner',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['lower_back', 'core'],
    contraindications: ['Acute disc herniation with radicular symptoms'],
  },
  {
    name: 'McGill Curl Up',
    nameSv: 'McGill Curl Up',
    description: 'Spine-sparing abdominal exercise.',
    instructions: `1. Lie on back with one knee bent
2. Place hands under lower back
3. Slightly lift head and shoulders
4. Keep lower back in neutral
5. Hold 10 seconds, repeat 5 times`,
    category: 'CORE',
    muscleGroup: 'Core',
    equipment: null,
    difficulty: 'Beginner',
    biomechanicalPillar: 'ANTI_ROTATION_CORE',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING'],
    targetBodyParts: ['core'],
    contraindications: ['Acute neck pain'],
  },
  {
    name: 'Stir the Pot',
    nameSv: 'Rör i Grytan',
    description: 'Advanced core stability on stability ball.',
    instructions: `1. Plank position with forearms on stability ball
2. Make small circles with forearms
3. Keep hips stable and core engaged
4. Circle 10 times each direction
5. Maintain neutral spine`,
    category: 'CORE',
    muscleGroup: 'Core',
    equipment: 'Stability ball',
    difficulty: 'Advanced',
    biomechanicalPillar: 'ANTI_ROTATION_CORE',
    progressionLevel: 'LEVEL_3',
    isRehabExercise: true,
    rehabPhases: ['FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['core', 'shoulder'],
    contraindications: ['Acute shoulder injury', 'Acute low back pain'],
  },
]

// ============================================
// SHOULDER REHAB EXERCISES
// ============================================

const shoulderRehabExercises: RehabExercise[] = [
  {
    name: 'Pendulum Swings',
    nameSv: 'Pendelsvängningar',
    description: 'Gentle shoulder mobility exercise.',
    instructions: `1. Lean forward supporting on table
2. Let affected arm hang down
3. Swing arm gently in circles
4. Then forward/back, side to side
5. Keep movement passive (use body)`,
    category: 'RECOVERY',
    muscleGroup: 'Shoulder',
    equipment: null,
    difficulty: 'Beginner',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE'],
    targetBodyParts: ['shoulder'],
    contraindications: [],
    progressionName: 'Assisted Shoulder Flexion',
  },
  {
    name: 'Assisted Shoulder Flexion',
    nameSv: 'Assisterad axelflexion',
    description: 'Using other arm to assist shoulder flexion.',
    instructions: `1. Use good arm to hold injured arm wrist
2. Slowly raise both arms together
3. Go as high as comfortable
4. Lower with control
5. Repeat 10-15 times`,
    category: 'RECOVERY',
    muscleGroup: 'Shoulder',
    equipment: null,
    difficulty: 'Beginner',
    isRehabExercise: true,
    rehabPhases: ['ACUTE', 'SUBACUTE', 'REMODELING'],
    targetBodyParts: ['shoulder'],
    contraindications: ['Post-surgical restrictions'],
    regressionName: 'Pendulum Swings',
    progressionName: 'Wall Slides',
  },
  {
    name: 'Wall Slides',
    nameSv: 'Väggglid',
    description: 'Shoulder flexion against wall for control.',
    instructions: `1. Face wall with forearms on wall
2. Slowly slide arms up wall
3. Keep shoulder blades back and down
4. Go as high as comfortable
5. Slide back down`,
    category: 'RECOVERY',
    muscleGroup: 'Shoulder',
    equipment: 'Wall',
    difficulty: 'Beginner',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING'],
    targetBodyParts: ['shoulder'],
    contraindications: ['Shoulder impingement (may need modification)'],
    regressionName: 'Assisted Shoulder Flexion',
    progressionName: 'Band Pull Aparts',
  },
  {
    name: 'Shoulder External Rotation',
    nameSv: 'Axelutåtrotation',
    description: 'Rotator cuff strengthening with band.',
    instructions: `1. Hold band with elbows at sides at 90 degrees
2. Rotate forearms outward
3. Keep elbows tucked to body
4. Return slowly
5. Repeat 15-20 times`,
    category: 'STRENGTH',
    muscleGroup: 'Rotator Cuff',
    equipment: 'Resistance band',
    difficulty: 'Beginner',
    biomechanicalPillar: 'UPPER_BODY',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['shoulder'],
    contraindications: ['Acute rotator cuff tear'],
    progressionName: 'Side Lying External Rotation',
  },
  {
    name: 'Side Lying External Rotation',
    nameSv: 'Sidoliggande utåtrotation',
    description: 'External rotation with gravity resistance.',
    instructions: `1. Lie on side with towel under elbow
2. Hold light dumbbell in top hand
3. Rotate forearm up toward ceiling
4. Keep elbow at 90 degrees
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Rotator Cuff',
    equipment: 'Light dumbbell',
    difficulty: 'Intermediate',
    biomechanicalPillar: 'UPPER_BODY',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['shoulder'],
    contraindications: ['Acute rotator cuff tear'],
    regressionName: 'Shoulder External Rotation',
  },
  {
    name: 'Band Pull Aparts',
    nameSv: 'Banddrag isär',
    description: 'Scapular retraction and rotator cuff exercise.',
    instructions: `1. Hold band in front at shoulder height
2. Pull band apart squeezing shoulder blades
3. Keep arms straight
4. Return with control
5. Repeat 15-20 times`,
    category: 'STRENGTH',
    muscleGroup: 'Upper Back',
    equipment: 'Resistance band',
    difficulty: 'Beginner',
    biomechanicalPillar: 'UPPER_BODY',
    progressionLevel: 'LEVEL_1',
    isRehabExercise: true,
    rehabPhases: ['SUBACUTE', 'REMODELING', 'FUNCTIONAL'],
    targetBodyParts: ['shoulder'],
    contraindications: [],
    regressionName: 'Wall Slides',
    progressionName: 'Face Pulls',
  },
  {
    name: 'Face Pulls',
    nameSv: 'Face Pulls',
    description: 'Rotator cuff and scapular stability.',
    instructions: `1. Set cable or band at face height
2. Pull toward face with elbows high
3. Squeeze shoulder blades
4. Return with control
5. Repeat 15-20 times`,
    category: 'STRENGTH',
    muscleGroup: 'Rotator Cuff',
    equipment: 'Cable or band',
    difficulty: 'Intermediate',
    biomechanicalPillar: 'UPPER_BODY',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['shoulder'],
    contraindications: ['Acute shoulder impingement'],
    regressionName: 'Band Pull Aparts',
  },
  {
    name: 'Prone Y Raise',
    nameSv: 'Prone Y-lyft',
    description: 'Lower trapezius strengthening.',
    instructions: `1. Lie face down on bench or floor
2. Raise arms in Y shape (thumbs up)
3. Squeeze shoulder blades
4. Hold 3 seconds at top
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Upper Back',
    equipment: null,
    difficulty: 'Intermediate',
    biomechanicalPillar: 'UPPER_BODY',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['shoulder'],
    contraindications: ['Acute shoulder injury'],
  },
  {
    name: 'Prone T Raise',
    nameSv: 'Prone T-lyft',
    description: 'Middle trapezius and rhomboid strengthening.',
    instructions: `1. Lie face down on bench or floor
2. Raise arms in T shape (thumbs up)
3. Squeeze shoulder blades
4. Hold 3 seconds at top
5. Lower with control`,
    category: 'STRENGTH',
    muscleGroup: 'Upper Back',
    equipment: null,
    difficulty: 'Intermediate',
    biomechanicalPillar: 'UPPER_BODY',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['shoulder'],
    contraindications: ['Acute shoulder injury'],
  },
  {
    name: 'Scapular Push Ups',
    nameSv: 'Skulderblads push-ups',
    description: 'Serratus anterior strengthening.',
    instructions: `1. Start in push-up position or on wall
2. Keep arms straight throughout
3. Let shoulder blades come together
4. Push through to spread blades apart
5. Repeat 15-20 times`,
    category: 'STRENGTH',
    muscleGroup: 'Serratus',
    equipment: null,
    difficulty: 'Intermediate',
    biomechanicalPillar: 'UPPER_BODY',
    progressionLevel: 'LEVEL_2',
    isRehabExercise: true,
    rehabPhases: ['REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT'],
    targetBodyParts: ['shoulder'],
    contraindications: ['Acute wrist injury'],
  },
]

// ============================================
// SEEDING FUNCTION
// ============================================

async function seedRehabExercises() {
  console.log('Starting rehab exercise seeding...\n')

  const allExercises = [
    ...hipGluteExercises,
    ...ankleMobilityExercises,
    ...kneeStabilityExercises,
    ...coreStabilityExercises,
    ...shoulderRehabExercises,
  ]

  console.log(`Total exercises to seed: ${allExercises.length}`)

  // First pass: Create all exercises without progression links
  const createdExercises = new Map<string, string>() // name -> id

  for (const exercise of allExercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name },
    })

    if (existing) {
      console.log(`  Updating: ${exercise.name}`)
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          nameSv: exercise.nameSv,
          description: exercise.description,
          instructions: exercise.instructions,
          category: exercise.category,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          biomechanicalPillar: exercise.biomechanicalPillar,
          progressionLevel: exercise.progressionLevel,
          isRehabExercise: exercise.isRehabExercise,
          rehabPhases: exercise.rehabPhases,
          targetBodyParts: exercise.targetBodyParts,
          contraindications: exercise.contraindications,
          isPublic: true,
        },
      })
      createdExercises.set(exercise.name, existing.id)
    } else {
      console.log(`  Creating: ${exercise.name}`)
      const created = await prisma.exercise.create({
        data: {
          name: exercise.name,
          nameSv: exercise.nameSv,
          description: exercise.description,
          instructions: exercise.instructions,
          category: exercise.category,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          biomechanicalPillar: exercise.biomechanicalPillar,
          progressionLevel: exercise.progressionLevel,
          isRehabExercise: exercise.isRehabExercise,
          rehabPhases: exercise.rehabPhases,
          targetBodyParts: exercise.targetBodyParts,
          contraindications: exercise.contraindications,
          isPublic: true,
        },
      })
      createdExercises.set(exercise.name, created.id)
    }
  }

  // Second pass: Link progressions
  console.log('\nLinking progression paths...')

  for (const exercise of allExercises) {
    const exerciseId = createdExercises.get(exercise.name)
    if (!exerciseId) continue

    const progressionId = exercise.progressionName ? createdExercises.get(exercise.progressionName) : null
    const regressionId = exercise.regressionName ? createdExercises.get(exercise.regressionName) : null

    if (progressionId || regressionId) {
      await prisma.exercise.update({
        where: { id: exerciseId },
        data: {
          progressionExerciseId: progressionId,
          regressionExerciseId: regressionId,
        },
      })
      console.log(`  ${exercise.name}: progression=${exercise.progressionName || 'none'}, regression=${exercise.regressionName || 'none'}`)
    }
  }

  console.log('\n✅ Rehab exercise seeding complete!')
  console.log(`   Total: ${allExercises.length} exercises`)
  console.log(`   Categories: Hip/Glute (${hipGluteExercises.length}), Ankle (${ankleMobilityExercises.length}), Knee (${kneeStabilityExercises.length}), Core (${coreStabilityExercises.length}), Shoulder (${shoulderRehabExercises.length})`)
}

// Run the seed
seedRehabExercises()
  .catch((e) => {
    console.error('Error seeding rehab exercises:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
