// lib/program-generator/templates/hyrox-strength.ts
/**
 * HYROX-Specific Strength Training Templates
 *
 * Designed for HYROX athletes with focus on:
 * - Station-specific strength work
 * - Functional movements for all 8 stations
 * - % of 1RM prescriptions
 * - Warmup templates
 * - Phase-appropriate programming
 */

import type { StrengthPhase } from '@prisma/client'

// ============================================================================
// TYPES
// ============================================================================

export interface StrengthPRs {
  deadlift?: number
  backSquat?: number
  benchPress?: number
  overheadPress?: number
  barbellRow?: number
  pullUps?: number // max reps
}

export interface HyroxStrengthExercise {
  id: string
  name: string
  nameSv: string
  targetStation: HyroxStation | 'general' | 'conditioning'
  sets: number
  reps: number | string // string for "AMRAP", "8-12", etc.
  percentOf1RM?: number
  restSeconds: number
  tempo?: string // e.g., "3-1-1-0" (eccentric-pause-concentric-pause)
  notes?: string
  notesSv?: string
  alternatives?: string[]
}

export interface HyroxStrengthSession {
  name: string
  nameSv: string
  type: 'upper' | 'lower' | 'full_body' | 'power' | 'station_specific'
  phase: StrengthPhase
  durationMinutes: number
  warmup: WarmupBlock
  mainWorkout: HyroxStrengthExercise[]
  finisher?: ConditioningFinisher
}

export interface WarmupBlock {
  generalCardio: {
    exercise: string
    exerciseSv: string
    durationMinutes: number
  }
  activation: Array<{
    exercise: string
    exerciseSv: string
    sets: number
    reps: number
  }>
  rampUpSets?: Array<{
    percentOf1RM: number
    reps: number
  }>
}

export interface ConditioningFinisher {
  name: string
  nameSv: string
  format: string // e.g., "EMOM 10", "AMRAP 8", "3 rounds"
  exercises: Array<{
    exercise: string
    exerciseSv: string
    reps: number | string
  }>
}

export type HyroxStation =
  | 'skierg'
  | 'sled_push'
  | 'sled_pull'
  | 'burpee_broad_jump'
  | 'rowing'
  | 'farmers_carry'
  | 'sandbag_lunge'
  | 'wall_balls'

// ============================================================================
// WARMUP TEMPLATES
// ============================================================================

export const WARMUP_TEMPLATES: Record<'lower' | 'upper' | 'full_body' | 'power', WarmupBlock> = {
  lower: {
    generalCardio: {
      exercise: 'Rowing or SkiErg',
      exerciseSv: 'Rodd eller SkiErg',
      durationMinutes: 5,
    },
    activation: [
      { exercise: 'Band walks', exerciseSv: 'Gummibandsgang', sets: 2, reps: 10 },
      { exercise: 'Glute bridges', exerciseSv: 'Glutebrygga', sets: 2, reps: 12 },
      { exercise: 'Walking lunges', exerciseSv: 'Gångutfall', sets: 1, reps: 10 },
      { exercise: 'Leg swings', exerciseSv: 'Bensvingar', sets: 1, reps: 10 },
    ],
    rampUpSets: [
      { percentOf1RM: 40, reps: 8 },
      { percentOf1RM: 60, reps: 5 },
      { percentOf1RM: 75, reps: 3 },
    ],
  },
  upper: {
    generalCardio: {
      exercise: 'SkiErg or rowing',
      exerciseSv: 'SkiErg eller rodd',
      durationMinutes: 5,
    },
    activation: [
      { exercise: 'Band pull-aparts', exerciseSv: 'Gummibandsisärningar', sets: 2, reps: 15 },
      { exercise: 'Scapular push-ups', exerciseSv: 'Skulderbladsarmhävningar', sets: 2, reps: 10 },
      { exercise: 'Cat-cow stretch', exerciseSv: 'Katt-ko stretch', sets: 1, reps: 10 },
      { exercise: 'Arm circles', exerciseSv: 'Armcirklar', sets: 1, reps: 10 },
    ],
    rampUpSets: [
      { percentOf1RM: 40, reps: 8 },
      { percentOf1RM: 60, reps: 5 },
      { percentOf1RM: 75, reps: 3 },
    ],
  },
  full_body: {
    generalCardio: {
      exercise: 'Mixed machine (row/ski)',
      exerciseSv: 'Blandad maskin (rodd/ski)',
      durationMinutes: 6,
    },
    activation: [
      { exercise: 'World\'s greatest stretch', exerciseSv: 'Världens bästa stretch', sets: 1, reps: 6 },
      { exercise: 'Inchworms', exerciseSv: 'Maskar', sets: 2, reps: 5 },
      { exercise: 'Band walks', exerciseSv: 'Gummibandsgang', sets: 1, reps: 10 },
      { exercise: 'Band pull-aparts', exerciseSv: 'Gummibandsisärningar', sets: 1, reps: 15 },
    ],
    rampUpSets: [
      { percentOf1RM: 40, reps: 6 },
      { percentOf1RM: 55, reps: 4 },
      { percentOf1RM: 70, reps: 2 },
    ],
  },
  power: {
    generalCardio: {
      exercise: 'Dynamic warm-up circuit',
      exerciseSv: 'Dynamisk uppvärmningscirkel',
      durationMinutes: 5,
    },
    activation: [
      { exercise: 'High knees', exerciseSv: 'Höga knän', sets: 2, reps: 20 },
      { exercise: 'Butt kicks', exerciseSv: 'Hälsparkar', sets: 2, reps: 20 },
      { exercise: 'A-skips', exerciseSv: 'A-skip', sets: 2, reps: 15 },
      { exercise: 'Pogo jumps', exerciseSv: 'Pogohopp', sets: 2, reps: 10 },
    ],
    rampUpSets: [
      { percentOf1RM: 30, reps: 5 },
      { percentOf1RM: 45, reps: 4 },
      { percentOf1RM: 55, reps: 3 },
    ],
  },
}

// ============================================================================
// STATION-SPECIFIC EXERCISES
// ============================================================================

/**
 * Exercises mapped to HYROX stations
 */
export const STATION_EXERCISES: Record<HyroxStation, Array<{
  id: string
  name: string
  nameSv: string
  primary: boolean
  notes?: string
}>> = {
  skierg: [
    { id: 'lat_pulldown', name: 'Lat Pulldown', nameSv: 'Latsdrag', primary: true },
    { id: 'straight_arm_pulldown', name: 'Straight Arm Pulldown', nameSv: 'Raka armar nedåtdrag', primary: true },
    { id: 'pull_ups', name: 'Pull-ups', nameSv: 'Pullups', primary: false },
    { id: 'barbell_row', name: 'Barbell Row', nameSv: 'Skivstångsrodd', primary: false },
  ],
  sled_push: [
    { id: 'back_squat', name: 'Back Squat', nameSv: 'Knäböj', primary: true },
    { id: 'leg_press', name: 'Leg Press', nameSv: 'Benpress', primary: true },
    { id: 'goblet_squat', name: 'Goblet Squat', nameSv: 'Bägarknäböj', primary: false },
    { id: 'wall_sit', name: 'Wall Sit', nameSv: 'Väggsittning', primary: false, notes: 'Isometric hold' },
  ],
  sled_pull: [
    { id: 'deadlift', name: 'Deadlift', nameSv: 'Marklyft', primary: true },
    { id: 'romanian_deadlift', name: 'Romanian Deadlift', nameSv: 'Rumänsk marklyft', primary: true },
    { id: 'barbell_row', name: 'Barbell Row', nameSv: 'Skivstångsrodd', primary: true },
    { id: 'cable_row', name: 'Seated Cable Row', nameSv: 'Sittande kabelrodd', primary: false },
  ],
  burpee_broad_jump: [
    { id: 'box_jump', name: 'Box Jump', nameSv: 'Lådhopp', primary: true },
    { id: 'broad_jump', name: 'Standing Broad Jump', nameSv: 'Stående längdhopp', primary: true },
    { id: 'burpee', name: 'Burpee', nameSv: 'Burpee', primary: true },
    { id: 'jump_squat', name: 'Jump Squat', nameSv: 'Hoppknäböj', primary: false },
  ],
  rowing: [
    { id: 'barbell_row', name: 'Barbell Row', nameSv: 'Skivstångsrodd', primary: true },
    { id: 'seated_row', name: 'Seated Cable Row', nameSv: 'Sittande kabelrodd', primary: true },
    { id: 'single_arm_row', name: 'Single Arm Dumbbell Row', nameSv: 'Enarmad hantelrodd', primary: false },
    { id: 'hip_drive', name: 'Barbell Hip Thrust', nameSv: 'Höftstöt', primary: false, notes: 'For drive power' },
  ],
  farmers_carry: [
    { id: 'farmers_walk', name: 'Farmer\'s Walk', nameSv: 'Farmers walk', primary: true },
    { id: 'deadlift', name: 'Deadlift', nameSv: 'Marklyft', primary: true },
    { id: 'grip_trainer', name: 'Plate Pinch', nameSv: 'Viktskivenyp', primary: false, notes: 'Grip strength' },
    { id: 'shrugs', name: 'Barbell Shrugs', nameSv: 'Skivstångsryckningar', primary: false },
  ],
  sandbag_lunge: [
    { id: 'walking_lunge', name: 'Walking Lunge', nameSv: 'Gångutfall', primary: true },
    { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', nameSv: 'Bulgarisk split squat', primary: true },
    { id: 'front_squat', name: 'Front Squat', nameSv: 'Frontknäböj', primary: false },
    { id: 'sandbag_carry', name: 'Sandbag Front Carry', nameSv: 'Sandsäcksbärning fram', primary: true },
  ],
  wall_balls: [
    { id: 'front_squat', name: 'Front Squat', nameSv: 'Frontknäböj', primary: true },
    { id: 'overhead_press', name: 'Overhead Press', nameSv: 'Axelpress', primary: true },
    { id: 'thruster', name: 'Thruster', nameSv: 'Thruster', primary: true },
    { id: 'wall_ball', name: 'Wall Ball', nameSv: 'Wall ball', primary: true },
  ],
}

// ============================================================================
// PHASE-SPECIFIC STRENGTH SESSIONS
// ============================================================================

/**
 * Get protocol parameters for a given phase
 */
export function getPhaseProtocol(phase: StrengthPhase): {
  sets: { min: number; max: number }
  reps: { min: number; max: number }
  intensity: { min: number; max: number }
  restSeconds: { min: number; max: number }
  tempo: string
} {
  switch (phase) {
    case 'ANATOMICAL_ADAPTATION':
      return {
        sets: { min: 2, max: 3 },
        reps: { min: 12, max: 20 },
        intensity: { min: 40, max: 60 },
        restSeconds: { min: 30, max: 60 },
        tempo: '2-0-2-0',
      }
    case 'MAXIMUM_STRENGTH':
      return {
        sets: { min: 3, max: 5 },
        reps: { min: 3, max: 6 },
        intensity: { min: 80, max: 95 },
        restSeconds: { min: 120, max: 180 },
        tempo: '3-1-1-0',
      }
    case 'POWER':
      return {
        sets: { min: 3, max: 5 },
        reps: { min: 3, max: 6 },
        intensity: { min: 30, max: 60 },
        restSeconds: { min: 90, max: 120 },
        tempo: 'X-0-X-0',
      }
    case 'MAINTENANCE':
    case 'TAPER':
    default:
      return {
        sets: { min: 2, max: 3 },
        reps: { min: 5, max: 8 },
        intensity: { min: 70, max: 85 },
        restSeconds: { min: 90, max: 120 },
        tempo: '2-0-1-0',
      }
  }
}

// ============================================================================
// HYROX STRENGTH SESSION TEMPLATES
// ============================================================================

/**
 * Generate a HYROX-specific strength session based on phase and weaknesses
 */
export function generateHyroxStrengthSession(
  phase: StrengthPhase,
  sessionType: 'lower' | 'upper' | 'full_body' | 'power' | 'station_specific',
  strengthPRs: StrengthPRs,
  weakStations?: HyroxStation[]
): HyroxStrengthSession {
  const protocol = getPhaseProtocol(phase)
  const warmup = WARMUP_TEMPLATES[sessionType === 'station_specific' ? 'full_body' : sessionType]

  let exercises: HyroxStrengthExercise[] = []

  switch (sessionType) {
    case 'lower':
      exercises = generateLowerBodySession(phase, protocol, strengthPRs, weakStations)
      break
    case 'upper':
      exercises = generateUpperBodySession(phase, protocol, strengthPRs, weakStations)
      break
    case 'full_body':
      exercises = generateFullBodySession(phase, protocol, strengthPRs, weakStations)
      break
    case 'power':
      exercises = generatePowerSession(phase, protocol, strengthPRs)
      break
    case 'station_specific':
      exercises = generateStationSpecificSession(protocol, strengthPRs, weakStations || [])
      break
  }

  const sessionNames: Record<string, { en: string; sv: string }> = {
    lower: { en: 'HYROX Lower Body', sv: 'HYROX Underkropp' },
    upper: { en: 'HYROX Upper Body', sv: 'HYROX Överkropp' },
    full_body: { en: 'HYROX Full Body', sv: 'HYROX Helkropp' },
    power: { en: 'HYROX Power', sv: 'HYROX Kraft' },
    station_specific: { en: 'HYROX Station Work', sv: 'HYROX Stationsarbete' },
  }

  return {
    name: sessionNames[sessionType].en,
    nameSv: sessionNames[sessionType].sv,
    type: sessionType,
    phase,
    durationMinutes: calculateSessionDuration(exercises, warmup),
    warmup,
    mainWorkout: exercises,
    finisher: phase !== 'TAPER' ? generateConditioningFinisher(phase, weakStations) : undefined,
  }
}

function generateLowerBodySession(
  phase: StrengthPhase,
  protocol: ReturnType<typeof getPhaseProtocol>,
  prs: StrengthPRs,
  weakStations?: HyroxStation[]
): HyroxStrengthExercise[] {
  const exercises: HyroxStrengthExercise[] = []
  const intensity = Math.round((protocol.intensity.min + protocol.intensity.max) / 2)
  const reps = Math.round((protocol.reps.min + protocol.reps.max) / 2)
  const sets = Math.round((protocol.sets.min + protocol.sets.max) / 2)
  const rest = Math.round((protocol.restSeconds.min + protocol.restSeconds.max) / 2)

  // Primary: Back Squat (Sled Push)
  exercises.push({
    id: 'back_squat',
    name: 'Back Squat',
    nameSv: 'Knäböj',
    targetStation: 'sled_push',
    sets,
    reps,
    percentOf1RM: intensity,
    restSeconds: rest,
    tempo: protocol.tempo,
    notes: prs.backSquat ? `Working weight: ${Math.round(prs.backSquat * intensity / 100)}kg` : undefined,
    notesSv: prs.backSquat ? `Arbetsvikt: ${Math.round(prs.backSquat * intensity / 100)}kg` : undefined,
  })

  // Primary: Romanian Deadlift (Sled Pull, Farmers)
  exercises.push({
    id: 'romanian_deadlift',
    name: 'Romanian Deadlift',
    nameSv: 'Rumänsk marklyft',
    targetStation: 'sled_pull',
    sets,
    reps,
    percentOf1RM: intensity - 10, // Slightly lower for RDL
    restSeconds: rest,
    tempo: protocol.tempo,
    notes: prs.deadlift ? `Working weight: ${Math.round(prs.deadlift * (intensity - 10) / 100)}kg` : undefined,
    notesSv: prs.deadlift ? `Arbetsvikt: ${Math.round(prs.deadlift * (intensity - 10) / 100)}kg` : undefined,
  })

  // Add weak station emphasis
  if (weakStations?.includes('sandbag_lunge')) {
    exercises.push({
      id: 'bulgarian_split_squat',
      name: 'Bulgarian Split Squat',
      nameSv: 'Bulgarisk split squat',
      targetStation: 'sandbag_lunge',
      sets: sets + 1, // Extra sets for weak stations
      reps: phase === 'MAXIMUM_STRENGTH' ? '6 each leg' : '10 each leg',
      restSeconds: rest,
      tempo: protocol.tempo,
      notes: 'Priority exercise - weak station',
      notesSv: 'Prioriterad övning - svag station',
    })
  } else {
    exercises.push({
      id: 'walking_lunge',
      name: 'Walking Lunge',
      nameSv: 'Gångutfall',
      targetStation: 'sandbag_lunge',
      sets,
      reps: '10 each leg',
      restSeconds: rest - 30,
      tempo: protocol.tempo,
    })
  }

  // Core
  exercises.push({
    id: 'front_plank',
    name: 'Front Plank',
    nameSv: 'Plankan',
    targetStation: 'general',
    sets: 3,
    reps: '30-45 sec',
    restSeconds: 45,
  })

  return exercises
}

function generateUpperBodySession(
  phase: StrengthPhase,
  protocol: ReturnType<typeof getPhaseProtocol>,
  prs: StrengthPRs,
  weakStations?: HyroxStation[]
): HyroxStrengthExercise[] {
  const exercises: HyroxStrengthExercise[] = []
  const intensity = Math.round((protocol.intensity.min + protocol.intensity.max) / 2)
  const reps = Math.round((protocol.reps.min + protocol.reps.max) / 2)
  const sets = Math.round((protocol.sets.min + protocol.sets.max) / 2)
  const rest = Math.round((protocol.restSeconds.min + protocol.restSeconds.max) / 2)

  // Primary: Barbell Row (SkiErg, Rowing, Sled Pull)
  exercises.push({
    id: 'barbell_row',
    name: 'Barbell Row',
    nameSv: 'Skivstångsrodd',
    targetStation: 'rowing',
    sets,
    reps,
    percentOf1RM: prs.barbellRow ? intensity : undefined,
    restSeconds: rest,
    tempo: protocol.tempo,
    notes: prs.barbellRow ? `Working weight: ${Math.round(prs.barbellRow * intensity / 100)}kg` : undefined,
    notesSv: prs.barbellRow ? `Arbetsvikt: ${Math.round(prs.barbellRow * intensity / 100)}kg` : undefined,
  })

  // Primary: Overhead Press (Wall Balls)
  exercises.push({
    id: 'overhead_press',
    name: 'Overhead Press',
    nameSv: 'Axelpress',
    targetStation: 'wall_balls',
    sets,
    reps,
    percentOf1RM: prs.overheadPress ? intensity : undefined,
    restSeconds: rest,
    tempo: protocol.tempo,
    notes: prs.overheadPress ? `Working weight: ${Math.round(prs.overheadPress * intensity / 100)}kg` : undefined,
    notesSv: prs.overheadPress ? `Arbetsvikt: ${Math.round(prs.overheadPress * intensity / 100)}kg` : undefined,
  })

  // Lat Pulldown (SkiErg)
  exercises.push({
    id: 'lat_pulldown',
    name: 'Lat Pulldown',
    nameSv: 'Latsdrag',
    targetStation: 'skierg',
    sets,
    reps: reps + 2, // Slightly higher reps for accessory
    restSeconds: rest - 30,
    tempo: '2-0-2-0',
  })

  // Pull-ups if strong enough
  if (prs.pullUps && prs.pullUps >= 5) {
    exercises.push({
      id: 'pull_ups',
      name: 'Pull-ups',
      nameSv: 'Pullups',
      targetStation: 'skierg',
      sets,
      reps: Math.max(3, Math.floor(prs.pullUps * 0.6)),
      restSeconds: rest,
      notes: `Based on max: ${prs.pullUps} reps`,
      notesSv: `Baserat på max: ${prs.pullUps} reps`,
    })
  }

  // Grip work (Farmers Carry)
  exercises.push({
    id: 'farmers_hold',
    name: 'Farmer\'s Hold',
    nameSv: 'Farmers hold',
    targetStation: 'farmers_carry',
    sets: 3,
    reps: '30-45 sec',
    restSeconds: 60,
    notes: 'Heavy as possible with good posture',
    notesSv: 'Så tungt som möjligt med god hållning',
  })

  return exercises
}

function generateFullBodySession(
  phase: StrengthPhase,
  protocol: ReturnType<typeof getPhaseProtocol>,
  prs: StrengthPRs,
  weakStations?: HyroxStation[]
): HyroxStrengthExercise[] {
  const exercises: HyroxStrengthExercise[] = []
  const intensity = Math.round((protocol.intensity.min + protocol.intensity.max) / 2)
  const reps = Math.round((protocol.reps.min + protocol.reps.max) / 2)
  const sets = Math.round((protocol.sets.min + protocol.sets.max) / 2)
  const rest = Math.round((protocol.restSeconds.min + protocol.restSeconds.max) / 2)

  // Deadlift (Sled Pull, Farmers)
  exercises.push({
    id: 'deadlift',
    name: 'Deadlift',
    nameSv: 'Marklyft',
    targetStation: 'sled_pull',
    sets,
    reps,
    percentOf1RM: intensity,
    restSeconds: rest,
    tempo: protocol.tempo,
    notes: prs.deadlift ? `Working weight: ${Math.round(prs.deadlift * intensity / 100)}kg` : undefined,
    notesSv: prs.deadlift ? `Arbetsvikt: ${Math.round(prs.deadlift * intensity / 100)}kg` : undefined,
  })

  // Front Squat (Wall Balls, Sandbag)
  exercises.push({
    id: 'front_squat',
    name: 'Front Squat',
    nameSv: 'Frontknäböj',
    targetStation: 'wall_balls',
    sets,
    reps,
    percentOf1RM: prs.backSquat ? intensity - 15 : undefined, // Front squat ~85% of back squat
    restSeconds: rest,
    tempo: protocol.tempo,
    notes: prs.backSquat ? `Working weight: ${Math.round(prs.backSquat * (intensity - 15) / 100)}kg` : undefined,
    notesSv: prs.backSquat ? `Arbetsvikt: ${Math.round(prs.backSquat * (intensity - 15) / 100)}kg` : undefined,
  })

  // Bench Press (General push strength)
  exercises.push({
    id: 'bench_press',
    name: 'Bench Press',
    nameSv: 'Bänkpress',
    targetStation: 'general',
    sets,
    reps,
    percentOf1RM: intensity,
    restSeconds: rest,
    tempo: protocol.tempo,
    notes: prs.benchPress ? `Working weight: ${Math.round(prs.benchPress * intensity / 100)}kg` : undefined,
    notesSv: prs.benchPress ? `Arbetsvikt: ${Math.round(prs.benchPress * intensity / 100)}kg` : undefined,
  })

  // Barbell Row
  exercises.push({
    id: 'barbell_row',
    name: 'Barbell Row',
    nameSv: 'Skivstångsrodd',
    targetStation: 'rowing',
    sets,
    reps,
    percentOf1RM: prs.barbellRow ? intensity : undefined,
    restSeconds: rest,
    tempo: protocol.tempo,
  })

  // Core
  exercises.push({
    id: 'dead_bug',
    name: 'Dead Bug',
    nameSv: 'Död skalbagge',
    targetStation: 'general',
    sets: 3,
    reps: '10 each side',
    restSeconds: 45,
  })

  return exercises
}

function generatePowerSession(
  phase: StrengthPhase,
  protocol: ReturnType<typeof getPhaseProtocol>,
  prs: StrengthPRs
): HyroxStrengthExercise[] {
  const exercises: HyroxStrengthExercise[] = []

  // Box Jumps (Burpee Broad Jump)
  exercises.push({
    id: 'box_jump',
    name: 'Box Jump',
    nameSv: 'Lådhopp',
    targetStation: 'burpee_broad_jump',
    sets: 4,
    reps: 5,
    restSeconds: 90,
    tempo: 'X-0-X-0',
    notes: 'Focus on explosive hip extension, step down',
    notesSv: 'Fokus på explosiv höftextension, kliv ner',
  })

  // Jump Squat
  exercises.push({
    id: 'jump_squat',
    name: 'Jump Squat',
    nameSv: 'Hoppknäböj',
    targetStation: 'burpee_broad_jump',
    sets: 4,
    reps: 6,
    percentOf1RM: 30, // Light load for velocity
    restSeconds: 90,
    tempo: 'X-0-X-0',
    notes: prs.backSquat ? `Working weight: ${Math.round(prs.backSquat * 0.30)}kg` : 'Bodyweight or light load',
    notesSv: prs.backSquat ? `Arbetsvikt: ${Math.round(prs.backSquat * 0.30)}kg` : 'Kroppsvikt eller lätt belastning',
  })

  // Broad Jump
  exercises.push({
    id: 'broad_jump',
    name: 'Standing Broad Jump',
    nameSv: 'Stående längdhopp',
    targetStation: 'burpee_broad_jump',
    sets: 4,
    reps: 5,
    restSeconds: 90,
    tempo: 'X-0-X-0',
    notes: 'Max effort each rep',
    notesSv: 'Maximal ansträngning varje rep',
  })

  // Med Ball Throw (Wall Balls)
  exercises.push({
    id: 'med_ball_throw',
    name: 'Med Ball Slam',
    nameSv: 'Medicinbollsslam',
    targetStation: 'wall_balls',
    sets: 3,
    reps: 8,
    restSeconds: 60,
    notes: 'Explosive overhead throw to ground',
    notesSv: 'Explosivt kast från overhead till golv',
  })

  // Kettlebell Swing (Sled Pull, Hip power)
  exercises.push({
    id: 'kb_swing',
    name: 'Kettlebell Swing',
    nameSv: 'Kettlebellsving',
    targetStation: 'sled_pull',
    sets: 4,
    reps: 12,
    restSeconds: 60,
    notes: 'Powerful hip snap',
    notesSv: 'Kraftfull höftextension',
  })

  return exercises
}

function generateStationSpecificSession(
  protocol: ReturnType<typeof getPhaseProtocol>,
  prs: StrengthPRs,
  weakStations: HyroxStation[]
): HyroxStrengthExercise[] {
  const exercises: HyroxStrengthExercise[] = []
  const rest = Math.round((protocol.restSeconds.min + protocol.restSeconds.max) / 2)

  // Focus on weak stations
  for (const station of weakStations.slice(0, 3)) { // Max 3 stations per session
    const stationExercises = STATION_EXERCISES[station]
    const primaryExercise = stationExercises.find(e => e.primary)

    if (primaryExercise) {
      exercises.push({
        id: primaryExercise.id,
        name: primaryExercise.name,
        nameSv: primaryExercise.nameSv,
        targetStation: station,
        sets: 4,
        reps: protocol.reps.max,
        restSeconds: rest,
        tempo: protocol.tempo,
        notes: `Priority: Weak station - ${station.replace('_', ' ')}`,
        notesSv: `Prioritet: Svag station - ${getStationNameSv(station)}`,
      })
    }
  }

  // Add general conditioning
  exercises.push({
    id: 'farmers_walk',
    name: 'Farmer\'s Walk',
    nameSv: 'Farmers walk',
    targetStation: 'farmers_carry',
    sets: 4,
    reps: '40m',
    restSeconds: 90,
    notes: 'Heavy, controlled pace',
    notesSv: 'Tungt, kontrollerat tempo',
  })

  return exercises
}

function generateConditioningFinisher(
  phase: StrengthPhase,
  weakStations?: HyroxStation[]
): ConditioningFinisher | undefined {
  if (phase === 'MAXIMUM_STRENGTH') {
    // Skip finisher during max strength - preserve neural adaptations
    return undefined
  }

  if (phase === 'ANATOMICAL_ADAPTATION') {
    return {
      name: 'Metabolic Circuit',
      nameSv: 'Metabolisk cirkel',
      format: '3 rounds',
      exercises: [
        { exercise: 'Wall Ball', exerciseSv: 'Wall ball', reps: 15 },
        { exercise: 'Rowing', exerciseSv: 'Rodd', reps: '200m' },
        { exercise: 'Burpee', exerciseSv: 'Burpee', reps: 8 },
      ],
    }
  }

  if (phase === 'POWER') {
    return {
      name: 'HYROX Simulation',
      nameSv: 'HYROX-simulering',
      format: 'EMOM 10',
      exercises: [
        { exercise: 'Odd: SkiErg', exerciseSv: 'Udda: SkiErg', reps: '15 cal' },
        { exercise: 'Even: Burpee Broad Jump', exerciseSv: 'Jämna: Burpee bred hopp', reps: 5 },
      ],
    }
  }

  // Maintenance phase - light conditioning
  return {
    name: 'Station Practice',
    nameSv: 'Stationsträning',
    format: '2 rounds',
    exercises: [
      { exercise: 'SkiErg', exerciseSv: 'SkiErg', reps: '200m' },
      { exercise: 'Wall Ball', exerciseSv: 'Wall ball', reps: 10 },
      { exercise: 'Row', exerciseSv: 'Rodd', reps: '200m' },
    ],
  }
}

function calculateSessionDuration(exercises: HyroxStrengthExercise[], warmup: WarmupBlock): number {
  // Warmup time
  let duration = warmup.generalCardio.durationMinutes
  duration += warmup.activation.length * 1.5 // ~1.5 min per activation exercise
  if (warmup.rampUpSets) {
    duration += warmup.rampUpSets.length * 2 // ~2 min per ramp-up set
  }

  // Main workout time
  for (const exercise of exercises) {
    const setsCount = typeof exercise.sets === 'number' ? exercise.sets : 3
    const repTime = typeof exercise.reps === 'number' ? exercise.reps * 3 : 30 // ~3 sec per rep or 30 sec
    const workTime = setsCount * (repTime + exercise.restSeconds)
    duration += workTime / 60
  }

  return Math.round(duration)
}

function getStationNameSv(station: HyroxStation): string {
  const names: Record<HyroxStation, string> = {
    skierg: 'SkiErg',
    sled_push: 'Släde push',
    sled_pull: 'Släde pull',
    burpee_broad_jump: 'Burpee bred hopp',
    rowing: 'Rodd',
    farmers_carry: 'Farmers carry',
    sandbag_lunge: 'Sandsäcksutfall',
    wall_balls: 'Wall balls',
  }
  return names[station]
}

// ============================================================================
// CALCULATE WORKING WEIGHTS
// ============================================================================

/**
 * Calculate working weight for an exercise based on % of 1RM
 */
export function calculateWorkingWeight(
  exerciseId: string,
  percentOf1RM: number,
  strengthPRs: StrengthPRs
): number | null {
  const prMap: Record<string, keyof StrengthPRs> = {
    back_squat: 'backSquat',
    front_squat: 'backSquat', // Use back squat and adjust
    goblet_squat: 'backSquat',
    deadlift: 'deadlift',
    romanian_deadlift: 'deadlift',
    bench_press: 'benchPress',
    overhead_press: 'overheadPress',
    barbell_row: 'barbellRow',
  }

  const prKey = prMap[exerciseId]
  if (!prKey) return null

  const pr = strengthPRs[prKey]
  if (typeof pr !== 'number') return null

  // Adjustment factors for variations
  const adjustments: Record<string, number> = {
    front_squat: 0.85, // Front squat ~85% of back squat
    romanian_deadlift: 0.75, // RDL ~75% of deadlift
    goblet_squat: 0.40, // Goblet squat much lighter
  }

  const adjustment = adjustments[exerciseId] || 1.0
  const workingWeight = pr * adjustment * (percentOf1RM / 100)

  // Round to nearest 2.5kg
  return Math.round(workingWeight / 2.5) * 2.5
}

/**
 * Format weight prescription string
 */
export function formatWeightPrescription(
  sets: number,
  reps: number | string,
  percentOf1RM: number,
  workingWeight: number | null,
  restSeconds: number
): string {
  const repStr = typeof reps === 'number' ? reps : reps
  const weightStr = workingWeight ? `${workingWeight}kg` : `${percentOf1RM}%`
  const restStr = restSeconds >= 60 ? `${Math.round(restSeconds / 60)} min` : `${restSeconds}s`

  return `${sets}×${repStr} @ ${percentOf1RM}% (${weightStr}) - Vila ${restStr}`
}

// ============================================================================
// WEEKLY TEMPLATES
// ============================================================================

export interface HyroxStrengthWeek {
  weekNumber: number
  phase: StrengthPhase
  sessions: Array<{
    dayOfWeek: number // 1-7 (Monday-Sunday)
    session: HyroxStrengthSession
  }>
  weeklyVolume: {
    totalSets: number
    totalReps: number
    averageIntensity: number
  }
}

/**
 * Generate a week of HYROX strength training
 */
export function generateHyroxStrengthWeek(
  weekNumber: number,
  phase: StrengthPhase,
  sessionsPerWeek: 2 | 3,
  strengthPRs: StrengthPRs,
  weakStations?: HyroxStation[]
): HyroxStrengthWeek {
  const sessions: HyroxStrengthWeek['sessions'] = []

  if (sessionsPerWeek === 2) {
    // 2 sessions: Full body split
    sessions.push({
      dayOfWeek: 2, // Tuesday
      session: generateHyroxStrengthSession(phase, 'lower', strengthPRs, weakStations),
    })
    sessions.push({
      dayOfWeek: 5, // Friday
      session: generateHyroxStrengthSession(phase, 'upper', strengthPRs, weakStations),
    })
  } else {
    // 3 sessions: Lower/Upper/Power or Station-specific
    sessions.push({
      dayOfWeek: 2, // Tuesday
      session: generateHyroxStrengthSession(phase, 'lower', strengthPRs, weakStations),
    })
    sessions.push({
      dayOfWeek: 4, // Thursday
      session: generateHyroxStrengthSession(phase, 'upper', strengthPRs, weakStations),
    })

    const thirdSession = phase === 'POWER'
      ? generateHyroxStrengthSession(phase, 'power', strengthPRs)
      : generateHyroxStrengthSession(phase, 'station_specific', strengthPRs, weakStations)

    sessions.push({
      dayOfWeek: 6, // Saturday
      session: thirdSession,
    })
  }

  // Calculate weekly volume
  let totalSets = 0
  let totalReps = 0
  let totalIntensity = 0
  let intensityCount = 0

  for (const { session } of sessions) {
    for (const exercise of session.mainWorkout) {
      totalSets += exercise.sets
      if (typeof exercise.reps === 'number') {
        totalReps += exercise.sets * exercise.reps
      }
      if (exercise.percentOf1RM) {
        totalIntensity += exercise.percentOf1RM
        intensityCount++
      }
    }
  }

  return {
    weekNumber,
    phase,
    sessions,
    weeklyVolume: {
      totalSets,
      totalReps,
      averageIntensity: intensityCount > 0 ? Math.round(totalIntensity / intensityCount) : 0,
    },
  }
}
