// lib/training-engine/generators/auto-strength-generator.ts
/**
 * Auto-Generated Strength Program Generator
 *
 * Automatically creates strength sessions based on:
 * - Athlete profile and progression history
 * - Training goal (strength, power, injury prevention, running economy)
 * - Available equipment
 * - Session duration constraints
 * - Section preferences (warmup, prehab, core, cooldown)
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
  includePrehab?: boolean
  includeCore: boolean
  includeCooldown: boolean
  sport?: string | null
  riskBodyParts?: string[]
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
  section: 'WARMUP' | 'MAIN' | 'PREHAB' | 'CORE' | 'COOLDOWN'
}

export interface GeneratedSection {
  type: 'WARMUP' | 'MAIN' | 'PREHAB' | 'CORE' | 'COOLDOWN'
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
  rationale?: string // Brief explanation of exercise choices
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

// Stability / prehab templates used when the library does not contain enough
// matching sport-specific exercises yet. IDs are stable pseudo-ids so the
// builder can still render and the coach can replace them from the library.
const PREHAB_EXERCISES: Record<string, {
  name: string
  nameSv: string
  sets: number
  reps: string
  restSeconds: number
  notes?: string
  tags: string[]
}> = {
  'prehab-groin-1': {
    name: 'Copenhagen Plank',
    nameSv: 'Copenhagen plank',
    sets: 2,
    reps: '20-30s each side',
    restSeconds: 45,
    notes: 'Ljumske/adduktor. Håll smärta max 0-3/10.',
    tags: ['groin', 'adductor', 'hip', 'hockey'],
  },
  'prehab-hip-1': {
    name: '90-90 Hip Bridge',
    nameSv: '90-90 höftbrygga',
    sets: 2,
    reps: '8-10',
    restSeconds: 30,
    notes: 'Säte och bäckenkontroll före tyngre benarbete.',
    tags: ['hip', 'glute', 'groin', 'hockey'],
  },
  'prehab-trunk-1': {
    name: 'Dead Bug with Lateral Band',
    nameSv: 'Dead bug med sidoband',
    sets: 2,
    reps: '8 each side',
    restSeconds: 30,
    notes: 'Anti-rotation och revbenskontroll.',
    tags: ['trunk', 'core', 'shoulder'],
  },
  'prehab-shoulder-1': {
    name: 'Band Pull-Apart to External Rotation',
    nameSv: 'Band pull-apart till utrotation',
    sets: 2,
    reps: '12-15',
    restSeconds: 30,
    notes: 'Rotatorkuff och skulderbladskontroll.',
    tags: ['shoulder', 'upper body', 'hockey'],
  },
  'prehab-ankle-1': {
    name: 'Single-Leg Calf Raise Iso Hold',
    nameSv: 'Enbens tåhävning isohåll',
    sets: 2,
    reps: '20-30s each side',
    restSeconds: 30,
    notes: 'Fot/ankelstyvhet och kontroll.',
    tags: ['ankle', 'foot', 'calf', 'hockey'],
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
    includePrehab,
    includeCore,
    includeCooldown,
    sport,
    riskBodyParts = [],
    recentExerciseIds = [],
    oneRmData = {},
  } = params

  const phaseProtocol = STRENGTH_PHASES[phase]
  const goalWeights = GOAL_EXERCISE_WEIGHTS[goal]
  const shouldIncludePrehab = includePrehab ?? shouldAutoIncludePrehab(goal, sport, riskBodyParts)

  // Calculate available time for main exercises
  let mainExerciseTime = timePerSession
  if (includeWarmup) mainExerciseTime -= 8 // 8 min warmup
  if (shouldIncludePrehab) mainExerciseTime -= 6 // 6 min stability/prehab
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

  // 3. Generate stability / prehab section
  if (shouldIncludePrehab) {
    const prehabExercises = selectPrehabExercises({
      exerciseLibrary,
      athleteLevel,
      goal,
      sport,
      riskBodyParts,
    })

    if (prehabExercises.length > 0) {
      const prehabSection: GeneratedSection = {
        type: 'PREHAB',
        exercises: prehabExercises,
        notes: prehabSectionNotes(goal, sport, riskBodyParts),
        duration: 6,
      }
      sections.push(prehabSection)
      allExercises.push(...prehabExercises)
    }
  }

  // 4. Generate core section
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

  // 5. Generate cooldown section
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

  // Generate rationale
  const rationaleExercises = allExercises.filter((e) => e.section === 'MAIN')
  const pillarCounts: Record<string, number> = {}
  for (const ex of rationaleExercises) {
    const found = exerciseLibrary.find((e) => e.id === ex.exerciseId)
    if (found?.biomechanicalPillar) {
      const label = found.biomechanicalPillar.replace(/_/g, ' ').toLowerCase()
      pillarCounts[label] = (pillarCounts[label] || 0) + 1
    }
  }
  const pillarSummary = Object.entries(pillarCounts)
    .map(([pillar, count]) => `${count}x ${pillar}`)
    .join(', ')

  const goalLabels: Record<string, string> = {
    strength: 'maximal styrka',
    power: 'kraft och explosivitet',
    'injury-prevention': 'skadeförebyggande och stabilitet',
    'running-economy': 'löpekonomi',
  }

  const prehabSummary = shouldIncludePrehab ? ' Prehab-sektion tillagd för ledkontroll, vävnadskapacitet och riskområden.' : ''
  const rationale = `${totalExercises} övningar valda för ${goalLabels[goal] || goal}. Pillarfördelning: ${pillarSummary}. Fas: ${phase.replace(/_/g, ' ').toLowerCase()} med ${phaseProtocol.reps.min}-${phaseProtocol.reps.max} reps @ ${phaseProtocol.intensity.min}-${phaseProtocol.intensity.max}% 1RM.${prehabSummary}`

  return {
    name: sessionName,
    description,
    phase,
    estimatedDuration: timePerSession,
    sections,
    exercises: allExercises,
    totalExercises,
    totalSets,
    rationale,
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
  isRehabExercise?: boolean
  targetBodyParts?: string[] | null
}

function isHockeySport(sport?: string | null): boolean {
  return /hockey|ishockey|ice_hockey|team_ice_hockey/i.test(sport || '')
}

function shouldAutoIncludePrehab(
  goal: AutoGenerateParams['goal'],
  sport?: string | null,
  riskBodyParts: string[] = []
): boolean {
  return goal === 'injury-prevention' || isHockeySport(sport) || riskBodyParts.length > 0
}

function normalizedBodyPartSet(parts: string[] = []): Set<string> {
  const mapped = parts.flatMap((part) => {
    const value = part.toLowerCase()
    const aliases = [value]
    if (/ljumske|groin|adductor/.test(value)) aliases.push('groin', 'adductor')
    if (/höft|hoft|hip/.test(value)) aliases.push('hip')
    if (/axel|shoulder|rotator/.test(value)) aliases.push('shoulder')
    if (/fot|ankle|achilles|vad|calf/.test(value)) aliases.push('ankle', 'foot', 'calf')
    if (/bål|bal|trunk|core|rygg|back/.test(value)) aliases.push('trunk', 'core')
    return aliases
  })
  return new Set(mapped)
}

function selectPrehabExercises(params: {
  exerciseLibrary: ExerciseFromLibrary[]
  athleteLevel: string
  goal: string
  sport?: string | null
  riskBodyParts?: string[]
}): GeneratedExercise[] {
  const { exerciseLibrary, goal, sport, riskBodyParts = [] } = params
  const riskParts = normalizedBodyPartSet(riskBodyParts)
  const hockey = isHockeySport(sport)
  const wantedCount = goal === 'injury-prevention' || hockey ? 3 : 2

  const scored = exerciseLibrary
    .filter((ex) =>
      ex.isRehabExercise ||
      ex.category === 'CORE' ||
      ex.biomechanicalPillar === 'ANTI_ROTATION_CORE' ||
      ex.biomechanicalPillar === 'FOOT_ANKLE'
    )
    .map((ex) => {
      const haystack = [
        ex.name,
        ex.nameSv || '',
        ...(ex.targetBodyParts || []),
      ].join(' ').toLowerCase()
      let score = ex.isRehabExercise ? 4 : 0
      if (hockey && /copenhagen|köpenhamn|ljumske|groin|adductor|hip|höft|shoulder|axel|ankle|fot|calf|vad|kbox|flywheel/.test(haystack)) score += 3
      for (const part of riskParts) {
        if (haystack.includes(part)) score += 5
      }
      if (ex.biomechanicalPillar === 'ANTI_ROTATION_CORE') score += 1
      if (ex.biomechanicalPillar === 'FOOT_ANKLE') score += 1
      return { ex, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  const selected = scored.slice(0, wantedCount).map(({ ex }) => ({
    exerciseId: ex.id,
    exerciseName: ex.nameSv || ex.name,
    sets: 2,
    reps: ex.biomechanicalPillar === 'ANTI_ROTATION_CORE' ? '8-12 each side' : '10-15',
    restSeconds: 45,
    notes: 'Stabilitet/prehab: kontroll före belastning.',
    section: 'PREHAB' as const,
  }))

  if (selected.length >= wantedCount) return selected

  const fallbackParts = riskParts.size > 0 ? riskParts : normalizedBodyPartSet(hockey ? ['groin', 'hip', 'shoulder', 'ankle'] : ['trunk', 'hip'])
  const fallback = Object.entries(PREHAB_EXERCISES)
    .filter(([, ex]) => ex.tags.some((tag) => fallbackParts.has(tag)) || selected.length === 0)
    .slice(0, wantedCount - selected.length)
    .map(([id, ex]) => ({
      exerciseId: id,
      exerciseName: ex.nameSv,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.restSeconds,
      notes: ex.notes,
      section: 'PREHAB' as const,
    }))

  return [...selected, ...fallback]
}

function prehabSectionNotes(goal: string, sport?: string | null, riskBodyParts: string[] = []): string {
  const focus = riskBodyParts.length > 0
    ? ` Fokus: ${riskBodyParts.join(', ')}.`
    : isHockeySport(sport)
      ? ' Hockeyfokus: ljumske, höft, axel och fot/ankel.'
      : ''
  const base = goal === 'injury-prevention'
    ? 'Skadeförebyggande kontrollblock före huvudlyften.'
    : 'Stabilitetsblock före tyngre arbete.'
  return `${base}${focus}`
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

// Session focus patterns for A/B/C variation
// Each session shifts pillar emphasis for complementary training
const SESSION_FOCUS_SHIFTS: Record<number, Array<{
  label: string
  focusDescription: string
  goalModifier: (base: typeof GOAL_EXERCISE_WEIGHTS['strength']) => typeof GOAL_EXERCISE_WEIGHTS['strength']
}>> = {
  1: [
    {
      label: 'A',
      focusDescription: 'Helkropp',
      goalModifier: (base) => ({ ...base }),
    },
  ],
  2: [
    {
      label: 'A',
      focusDescription: 'Posterior chain & höft',
      goalModifier: (base) => ({
        ...base,
        posteriorChain: base.posteriorChain + 1,
        kneeDominance: Math.max(1, base.kneeDominance - 1),
      }),
    },
    {
      label: 'B',
      focusDescription: 'Knädominant & unilateral',
      goalModifier: (base) => ({
        ...base,
        kneeDominance: base.kneeDominance + 1,
        unilateral: base.unilateral + 1,
        posteriorChain: Math.max(1, base.posteriorChain - 1),
      }),
    },
  ],
  3: [
    {
      label: 'A',
      focusDescription: 'Posterior chain & styrka',
      goalModifier: (base) => ({
        ...base,
        posteriorChain: base.posteriorChain + 1,
      }),
    },
    {
      label: 'B',
      focusDescription: 'Knädominant & explosivitet',
      goalModifier: (base) => ({
        ...base,
        kneeDominance: base.kneeDominance + 1,
        plyometric: base.plyometric + 1,
      }),
    },
    {
      label: 'C',
      focusDescription: 'Unilateral & stabilitet',
      goalModifier: (base) => ({
        ...base,
        unilateral: base.unilateral + 1,
        core: base.core + 1,
      }),
    },
  ],
}

/**
 * Generate multiple sessions for a week with complementary focus
 * Each session emphasizes different pillars for balanced development.
 * Optionally calendar-aware: avoids blocked dates and adjusts for reduced days.
 */
export async function generateWeeklyProgram(
  params: AutoGenerateParams,
  exerciseLibrary: ExerciseFromLibrary[],
  calendarConstraints?: {
    blockedDates: string[]
    reducedDates: string[]
    startDate?: string // ISO date for the week start
  }
): Promise<GeneratedSession[]> {
  const sessions: GeneratedSession[] = []
  const focusPatterns = SESSION_FOCUS_SHIFTS[params.sessionsPerWeek] || SESSION_FOCUS_SHIFTS[1]
  const baseGoalWeights = GOAL_EXERCISE_WEIGHTS[params.goal]

  for (let i = 0; i < params.sessionsPerWeek; i++) {
    const focus = focusPatterns[i]

    // Rotate recent exercises to ensure variety between sessions
    const recentFromPreviousSessions = sessions.flatMap((s) =>
      s.exercises.map((e) => e.exerciseId)
    )

    // Temporarily override goal weights by modifying the goal lookup
    const modifiedWeights = focus.goalModifier(baseGoalWeights)
    const originalWeights = GOAL_EXERCISE_WEIGHTS[params.goal]
    GOAL_EXERCISE_WEIGHTS[params.goal] = modifiedWeights

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

    // Restore original weights
    GOAL_EXERCISE_WEIGHTS[params.goal] = originalWeights

    // Name with A/B/C label and focus description
    session.name = session.name.replace(
      /\(\d+x\/vecka\)/,
      `Pass ${focus.label} — ${focus.focusDescription}`
    )

    // Enrich rationale with session focus
    session.rationale = `${focus.label}: Fokus på ${focus.focusDescription.toLowerCase()}. ${session.rationale || ''}`

    sessions.push(session)
  }

  return sessions
}

export default generateStrengthSession
