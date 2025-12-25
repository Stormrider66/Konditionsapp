// lib/training-engine/generators/auto-strength-generator.ts
/**
 * Auto-Generated Strength Program Generator
 *
 * Automatically creates strength sessions based on:
 * - Athlete profile and progression history
 * - Training goal (strength, power, injury prevention, running economy)
 * - Available equipment
 * - Session duration constraints
 * - Section preferences (warmup, core, cooldown)
 */

import type { StrengthPhase, BiomechanicalPillar, ProgressionLevel } from '@prisma/client'
import { STRENGTH_PHASES, type PhaseProtocol } from '../quality-programming/strength-periodization'

// Types for auto-generation
export interface AutoGenerateParams {
  athleteId: string
  goal: 'strength' | 'power' | 'injury-prevention' | 'running-economy'
  phase: StrengthPhase
  sessionsPerWeek: 1 | 2 | 3
  equipmentAvailable: string[]
  timePerSession: number // minutes
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  includeWarmup: boolean
  includeCore: boolean
  includeCooldown: boolean
  // Optional: Recent exercises to avoid
  recentExerciseIds?: string[]
  // Optional: 1RM data for loading calculations
  oneRmData?: Record<string, number>
}

export interface GeneratedExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number | string
  weight?: number
  restSeconds: number
  tempo?: string
  notes?: string
  section: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
}

export interface GeneratedSection {
  type: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  exercises: GeneratedExercise[]
  notes?: string
  duration?: number
}

export interface GeneratedSession {
  name: string
  description: string
  phase: StrengthPhase
  estimatedDuration: number
  sections: GeneratedSection[]
  exercises: GeneratedExercise[] // Flat list of all exercises
  totalExercises: number
  totalSets: number
}

// Warmup exercise templates (dynamic stretches and activation)
const WARMUP_EXERCISES: Record<string, {
  name: string
  nameSv: string
  sets: number
  reps: string
  restSeconds: number
  notes?: string
}> = {
  'warmup-1': {
    name: 'Hip Circles',
    nameSv: 'Höftcirklar',
    sets: 1,
    reps: '10 each direction',
    restSeconds: 0,
    notes: 'Mobilisera höftleden',
  },
  'warmup-2': {
    name: 'Leg Swings',
    nameSv: 'Benpendel',
    sets: 1,
    reps: '10 each leg',
    restSeconds: 0,
    notes: 'Framåt/bakåt och i sidled',
  },
  'warmup-3': {
    name: 'Bodyweight Squats',
    nameSv: 'Knäböj utan vikt',
    sets: 2,
    reps: '10',
    restSeconds: 30,
  },
  'warmup-4': {
    name: 'Glute Bridges',
    nameSv: 'Glutebryggga',
    sets: 2,
    reps: '10',
    restSeconds: 30,
    notes: 'Aktivera gluteus',
  },
  'warmup-5': {
    name: 'Walking Lunges',
    nameSv: 'Gående utfallssteg',
    sets: 1,
    reps: '8 each leg',
    restSeconds: 0,
  },
  'warmup-6': {
    name: 'Inchworms',
    nameSv: 'Inchworms',
    sets: 1,
    reps: '5',
    restSeconds: 30,
    notes: 'Aktiverar core och hamstrings',
  },
}

// Cooldown/stretching templates
const COOLDOWN_EXERCISES: Record<string, {
  name: string
  nameSv: string
  sets: number
  reps: string
  restSeconds: number
  notes?: string
}> = {
  'cooldown-1': {
    name: 'Pigeon Stretch',
    nameSv: 'Duvstretch',
    sets: 1,
    reps: '60s each side',
    restSeconds: 0,
    notes: 'Höftböjare och gluteus',
  },
  'cooldown-2': {
    name: 'Hip Flexor Stretch',
    nameSv: 'Höftböjarstretch',
    sets: 1,
    reps: '45s each side',
    restSeconds: 0,
  },
  'cooldown-3': {
    name: 'Hamstring Stretch',
    nameSv: 'Hamstringsstretch',
    sets: 1,
    reps: '45s each side',
    restSeconds: 0,
  },
  'cooldown-4': {
    name: 'Quad Stretch',
    nameSv: 'Quadstretch',
    sets: 1,
    reps: '45s each side',
    restSeconds: 0,
  },
  'cooldown-5': {
    name: 'Calf Stretch',
    nameSv: 'Vadstretch',
    sets: 1,
    reps: '30s each side',
    restSeconds: 0,
  },
  'cooldown-6': {
    name: "Child's Pose",
    nameSv: 'Barnets position',
    sets: 1,
    reps: '60s',
    restSeconds: 0,
    notes: 'Avslappning av rygg',
  },
}

// Goal-specific exercise emphasis
const GOAL_EXERCISE_WEIGHTS: Record<string, {
  posteriorChain: number
  kneeDominance: number
  unilateral: number
  core: number
  plyometric: number
}> = {
  strength: {
    posteriorChain: 2,
    kneeDominance: 2,
    unilateral: 1,
    core: 1,
    plyometric: 0,
  },
  power: {
    posteriorChain: 1,
    kneeDominance: 1,
    unilateral: 0,
    core: 1,
    plyometric: 2,
  },
  'injury-prevention': {
    posteriorChain: 1,
    kneeDominance: 1,
    unilateral: 2,
    core: 2,
    plyometric: 0,
  },
  'running-economy': {
    posteriorChain: 1,
    kneeDominance: 1,
    unilateral: 1,
    core: 1,
    plyometric: 1,
  },
}

/**
 * Generate a complete strength session automatically
 */
export async function generateStrengthSession(
  params: AutoGenerateParams,
  exerciseLibrary: ExerciseFromLibrary[]
): Promise<GeneratedSession> {
  const {
    goal,
    phase,
    timePerSession,
    athleteLevel,
    equipmentAvailable,
    includeWarmup,
    includeCore,
    includeCooldown,
    recentExerciseIds = [],
    oneRmData = {},
  } = params

  const phaseProtocol = STRENGTH_PHASES[phase]
  const goalWeights = GOAL_EXERCISE_WEIGHTS[goal]

  // Calculate available time for main exercises
  let mainExerciseTime = timePerSession
  if (includeWarmup) mainExerciseTime -= 8 // 8 min warmup
  if (includeCooldown) mainExerciseTime -= 7 // 7 min cooldown
  if (includeCore) mainExerciseTime -= 5 // 5 min core

  const sections: GeneratedSection[] = []
  const allExercises: GeneratedExercise[] = []

  // 1. Generate warmup section
  if (includeWarmup) {
    const warmupSection = generateWarmupSection(phase)
    sections.push(warmupSection)
    allExercises.push(...warmupSection.exercises)
  }

  // 2. Generate main exercises
  const mainExercises = await selectMainExercises({
    exerciseLibrary,
    phaseProtocol,
    goalWeights,
    athleteLevel,
    equipmentAvailable,
    recentExerciseIds,
    oneRmData,
    maxDuration: mainExerciseTime,
  })

  const mainSection: GeneratedSection = {
    type: 'MAIN',
    exercises: mainExercises,
  }
  sections.push(mainSection)
  allExercises.push(...mainExercises)

  // 3. Generate core section
  if (includeCore) {
    const coreExercises = selectCoreExercises({
      exerciseLibrary,
      phaseProtocol,
      athleteLevel,
      goal,
    })

    const coreSection: GeneratedSection = {
      type: 'CORE',
      exercises: coreExercises,
      notes: 'Fokusera på kontroll och andning',
      duration: 5,
    }
    sections.push(coreSection)
    allExercises.push(...coreExercises)
  }

  // 4. Generate cooldown section
  if (includeCooldown) {
    const cooldownSection = generateCooldownSection()
    sections.push(cooldownSection)
    allExercises.push(...cooldownSection.exercises)
  }

  // Calculate totals
  const totalSets = allExercises.reduce((sum, ex) => sum + ex.sets, 0)
  const totalExercises = allExercises.length

  // Generate session name and description
  const sessionName = generateSessionName(goal, phase, params.sessionsPerWeek)
  const description = generateSessionDescription(goal, phase, athleteLevel)

  return {
    name: sessionName,
    description,
    phase,
    estimatedDuration: timePerSession,
    sections,
    exercises: allExercises,
    totalExercises,
    totalSets,
  }
}

/**
 * Generate warmup section based on phase
 */
function generateWarmupSection(phase: StrengthPhase): GeneratedSection {
  const exercises: GeneratedExercise[] = []

  // Select 3-4 warmup exercises
  const warmupKeys = Object.keys(WARMUP_EXERCISES)
  const selectedKeys = warmupKeys.slice(0, phase === 'POWER' ? 4 : 3)

  selectedKeys.forEach((key) => {
    const warmup = WARMUP_EXERCISES[key]
    exercises.push({
      exerciseId: key,
      exerciseName: warmup.nameSv,
      sets: warmup.sets,
      reps: warmup.reps,
      restSeconds: warmup.restSeconds,
      notes: warmup.notes,
      section: 'WARMUP',
    })
  })

  return {
    type: 'WARMUP',
    exercises,
    notes: 'Öka gradvis intensiteten',
    duration: 8,
  }
}

/**
 * Generate cooldown section
 */
function generateCooldownSection(): GeneratedSection {
  const exercises: GeneratedExercise[] = []

  // Select 3-4 cooldown stretches
  const cooldownKeys = Object.keys(COOLDOWN_EXERCISES)
  const selectedKeys = cooldownKeys.slice(0, 4)

  selectedKeys.forEach((key) => {
    const cooldown = COOLDOWN_EXERCISES[key]
    exercises.push({
      exerciseId: key,
      exerciseName: cooldown.nameSv,
      sets: cooldown.sets,
      reps: cooldown.reps,
      restSeconds: cooldown.restSeconds,
      notes: cooldown.notes,
      section: 'COOLDOWN',
    })
  })

  return {
    type: 'COOLDOWN',
    exercises,
    notes: 'Stretcha alla stora muskelgrupper',
    duration: 7,
  }
}

interface ExerciseFromLibrary {
  id: string
  name: string
  nameSv?: string | null
  biomechanicalPillar: BiomechanicalPillar | null
  progressionLevel: ProgressionLevel | null
  equipment?: string | null
  category?: string | null
  isPlyometric?: boolean
}

/**
 * Select main exercises based on criteria
 */
async function selectMainExercises(params: {
  exerciseLibrary: ExerciseFromLibrary[]
  phaseProtocol: PhaseProtocol
  goalWeights: typeof GOAL_EXERCISE_WEIGHTS['strength']
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  equipmentAvailable: string[]
  recentExerciseIds: string[]
  oneRmData: Record<string, number>
  maxDuration: number
}): Promise<GeneratedExercise[]> {
  const {
    exerciseLibrary,
    phaseProtocol,
    goalWeights,
    athleteLevel,
    equipmentAvailable,
    recentExerciseIds,
    oneRmData,
    maxDuration,
  } = params

  const exercises: GeneratedExercise[] = []
  const usedExerciseIds = new Set<string>()

  // Determine progression level based on athlete level
  const progressionLevels = getProgressionLevels(athleteLevel, phaseProtocol.phase)

  // Filter exercises by equipment availability
  const availableExercises = exerciseLibrary.filter((ex) => {
    if (!ex.equipment) return true
    const requiredEquipment = ex.equipment.toLowerCase()
    return equipmentAvailable.some((avail) =>
      requiredEquipment.includes(avail.toLowerCase()) ||
      avail.toLowerCase() === 'all' ||
      avail.toLowerCase() === 'none'
    )
  })

  // Select exercises by pillar according to goal weights
  const pillarsToSelect: Array<{ pillar: BiomechanicalPillar; count: number }> = [
    { pillar: 'POSTERIOR_CHAIN', count: goalWeights.posteriorChain },
    { pillar: 'KNEE_DOMINANCE', count: goalWeights.kneeDominance },
    { pillar: 'UNILATERAL', count: goalWeights.unilateral },
  ]

  for (const { pillar, count } of pillarsToSelect) {
    for (let i = 0; i < count; i++) {
      const candidates = availableExercises.filter(
        (ex) =>
          ex.biomechanicalPillar === pillar &&
          !usedExerciseIds.has(ex.id) &&
          !recentExerciseIds.includes(ex.id) &&
          (ex.progressionLevel === null || progressionLevels.includes(ex.progressionLevel))
      )

      if (candidates.length > 0) {
        // Select randomly for variety
        const selected = candidates[Math.floor(Math.random() * candidates.length)]
        usedExerciseIds.add(selected.id)

        // Calculate load if 1RM data available
        const weight = oneRmData[selected.id]
          ? calculateLoad(oneRmData[selected.id], phaseProtocol)
          : undefined

        exercises.push({
          exerciseId: selected.id,
          exerciseName: selected.nameSv || selected.name,
          sets: phaseProtocol.sets.min,
          reps: phaseProtocol.reps.min,
          weight,
          restSeconds: phaseProtocol.restPeriod.min,
          tempo: phaseProtocol.tempo,
          section: 'MAIN',
        })
      }
    }
  }

  // Add plyometrics if power goal
  if (goalWeights.plyometric > 0) {
    const plyoExercises = availableExercises.filter(
      (ex) => ex.isPlyometric && !usedExerciseIds.has(ex.id)
    )

    for (let i = 0; i < Math.min(goalWeights.plyometric, plyoExercises.length); i++) {
      const selected = plyoExercises[i]
      usedExerciseIds.add(selected.id)

      exercises.push({
        exerciseId: selected.id,
        exerciseName: selected.nameSv || selected.name,
        sets: 3,
        reps: '5-8',
        restSeconds: 90,
        notes: 'Fokus på explosivitet',
        section: 'MAIN',
      })
    }
  }

  return exercises
}

/**
 * Select core exercises
 */
function selectCoreExercises(params: {
  exerciseLibrary: ExerciseFromLibrary[]
  phaseProtocol: PhaseProtocol
  athleteLevel: string
  goal: string
}): GeneratedExercise[] {
  const { exerciseLibrary, phaseProtocol, goal } = params
  const exercises: GeneratedExercise[] = []

  // Filter to core exercises
  const coreExercises = exerciseLibrary.filter(
    (ex) => ex.biomechanicalPillar === 'ANTI_ROTATION_CORE' || ex.category === 'CORE'
  )

  // Select 2-3 core exercises
  const count = goal === 'injury-prevention' ? 3 : 2
  const selectedCores = coreExercises.slice(0, Math.min(count, coreExercises.length))

  for (const ex of selectedCores) {
    exercises.push({
      exerciseId: ex.id,
      exerciseName: ex.nameSv || ex.name,
      sets: 2,
      reps: phaseProtocol.phase === 'POWER' ? '10-12' : '12-15',
      restSeconds: 45,
      section: 'CORE',
    })
  }

  return exercises
}

/**
 * Get appropriate progression levels for athlete
 */
function getProgressionLevels(
  athleteLevel: string,
  phase: StrengthPhase
): ProgressionLevel[] {
  if (phase === 'ANATOMICAL_ADAPTATION') {
    if (athleteLevel === 'BEGINNER') return ['LEVEL_1']
    if (athleteLevel === 'INTERMEDIATE') return ['LEVEL_1', 'LEVEL_2']
    return ['LEVEL_2']
  }

  if (phase === 'MAXIMUM_STRENGTH') {
    if (athleteLevel === 'BEGINNER') return ['LEVEL_2']
    if (athleteLevel === 'INTERMEDIATE') return ['LEVEL_2']
    return ['LEVEL_2', 'LEVEL_3']
  }

  if (phase === 'POWER') {
    if (athleteLevel === 'BEGINNER') return ['LEVEL_2']
    return ['LEVEL_3']
  }

  // Maintenance/Taper
  if (athleteLevel === 'BEGINNER') return ['LEVEL_2']
  return ['LEVEL_2', 'LEVEL_3']
}

/**
 * Calculate working weight based on 1RM
 */
function calculateLoad(oneRm: number, phaseProtocol: PhaseProtocol): number {
  const targetPercentage = (phaseProtocol.intensity.min + phaseProtocol.intensity.max) / 2 / 100
  return Math.round(oneRm * targetPercentage / 2.5) * 2.5 // Round to nearest 2.5kg
}

/**
 * Generate session name
 */
function generateSessionName(
  goal: string,
  phase: StrengthPhase,
  sessionsPerWeek: number
): string {
  const phaseLabels: Record<StrengthPhase, string> = {
    ANATOMICAL_ADAPTATION: 'Grundläggande',
    MAXIMUM_STRENGTH: 'Maxstyrka',
    POWER: 'Explosivitet',
    MAINTENANCE: 'Underhåll',
    TAPER: 'Taper',
  }

  const goalLabels: Record<string, string> = {
    strength: 'Styrka',
    power: 'Power',
    'injury-prevention': 'Skadeförebyggande',
    'running-economy': 'Löpekonomi',
  }

  return `${phaseLabels[phase]} - ${goalLabels[goal]} (${sessionsPerWeek}x/vecka)`
}

/**
 * Generate session description
 */
function generateSessionDescription(
  goal: string,
  phase: StrengthPhase,
  athleteLevel: string
): string {
  const descriptions: Record<string, string> = {
    strength: 'Fokus på att bygga maximal styrka genom tunga lyft med längre vila.',
    power: 'Explosiva rörelser för att konvertera styrka till kraft och hastighet.',
    'injury-prevention': 'Balanserat program med fokus på stabilitet och unilateral styrka.',
    'running-economy': 'Styrketräning anpassad för löpare med fokus på löpekonomi.',
  }

  const levelNote =
    athleteLevel === 'BEGINNER'
      ? ' Anpassat för nybörjare med fokus på teknik.'
      : athleteLevel === 'ELITE'
      ? ' Avancerat program för elitidrottare.'
      : ''

  return descriptions[goal] + levelNote
}

/**
 * Generate multiple sessions for a week
 */
export async function generateWeeklyProgram(
  params: AutoGenerateParams,
  exerciseLibrary: ExerciseFromLibrary[]
): Promise<GeneratedSession[]> {
  const sessions: GeneratedSession[] = []

  for (let i = 0; i < params.sessionsPerWeek; i++) {
    // Rotate recent exercises to ensure variety
    const recentFromPreviousSessions = sessions.flatMap((s) =>
      s.exercises.map((e) => e.exerciseId)
    )

    const session = await generateStrengthSession(
      {
        ...params,
        recentExerciseIds: [
          ...(params.recentExerciseIds || []),
          ...recentFromPreviousSessions,
        ],
      },
      exerciseLibrary
    )

    sessions.push(session)
  }

  return sessions
}

export default generateStrengthSession
