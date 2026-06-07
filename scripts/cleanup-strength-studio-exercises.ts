/**
 * Cleanup script: remove orphan cardio/HYROX rows from the Strength Studio exercise pool.
 *
 * Safety:
 * - Dry-run by default; pass --execute or --apply to delete.
 * - Only considers rows that are obvious non-strength-library candidates.
 * - Deletes only rows with zero direct relation counts and zero JSON references
 *   in strength sessions/templates, logged strength assignments, generated WODs,
 *   or exercise substitute/progression JSON.
 *
 * Usage:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs)
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/cleanup-strength-studio-exercises.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/cleanup-strength-studio-exercises.ts --execute
 */

import { PrismaClient } from '@prisma/client'

import {
  STRENGTH_STUDIO_CARDIO_EQUIPMENT_TYPES,
  STRENGTH_STUDIO_EXCLUDED_MOVEMENT_CATEGORIES,
  isStrengthStudioExercise,
  isStrengthStudioExerciseNameCandidate,
} from '../lib/strength/exercise-library-filters'

const prisma = new PrismaClient()
const execute = process.argv.includes('--execute') || process.argv.includes('--apply')

const NON_STRENGTH_CATEGORIES = new Set([
  'HYROX',
  'RUNNING',
  'CYCLING',
  'SKIING',
  'SWIMMING',
  'TRIATHLON',
  'ALTERNATIVE',
])

function normalize(value: string | null | undefined): string {
  return value
    ?.toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim() ?? ''
}

function hasCardioEquipment(equipmentTypes: string[]): boolean {
  const cardioEquipment = new Set<string>(STRENGTH_STUDIO_CARDIO_EQUIPMENT_TYPES)
  return equipmentTypes.some((equipmentType) => cardioEquipment.has(equipmentType))
}

function isObviousCleanupCandidate(exercise: {
  name: string
  nameSv: string | null
  nameEn: string | null
  category: string
  muscleGroup: string | null
  movementCategory: string | null
  equipmentTypes: string[]
  iconCategory: string | null
}): boolean {
  if (isStrengthStudioExercise(exercise)) return false

  const category = exercise.category.toUpperCase()
  const muscleGroup = normalize(exercise.muscleGroup)
  const iconCategory = normalize(exercise.iconCategory)
  const movementCategory = exercise.movementCategory?.toUpperCase() ?? ''

  return (
    NON_STRENGTH_CATEGORIES.has(category) ||
    (category === 'OTHER' && !isStrengthStudioExerciseNameCandidate(exercise.name)) ||
    muscleGroup === 'cardio' ||
    muscleGroup === 'kondition' ||
    iconCategory === 'cardio' ||
    STRENGTH_STUDIO_EXCLUDED_MOVEMENT_CATEGORIES.includes(
      movementCategory as typeof STRENGTH_STUDIO_EXCLUDED_MOVEMENT_CATEGORIES[number]
    ) ||
    hasCardioEquipment(exercise.equipmentTypes) ||
    !isStrengthStudioExerciseNameCandidate(exercise.name)
  )
}

function directRefCount(counts: object): number {
  return Object.values(counts).reduce((sum, count) => sum + Number(count), 0)
}

function addJsonRefs(
  value: unknown,
  candidateIds: Set<string>,
  refs: Map<string, string[]>,
  source: string
) {
  if (value == null) return

  if (typeof value === 'string') {
    if (candidateIds.has(value)) {
      refs.set(value, [...(refs.get(value) ?? []), source])
      return
    }
    for (const id of candidateIds) {
      if (value.includes(id)) {
        refs.set(id, [...(refs.get(id) ?? []), source])
      }
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) addJsonRefs(item, candidateIds, refs, source)
    return
  }

  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      addJsonRefs(item, candidateIds, refs, source)
    }
  }
}

async function findJsonRefs(candidateIds: Set<string>): Promise<Map<string, string[]>> {
  const refs = new Map<string, string[]>()

  const [
    strengthSessions,
    strengthAssignments,
    strengthTemplates,
    strengthTrainingSessions,
    generatedWods,
    exercises,
  ] = await Promise.all([
    prisma.strengthSession.findMany({
      select: {
        id: true,
        name: true,
        exercises: true,
        warmupData: true,
        prehabData: true,
        coreData: true,
        cooldownData: true,
      },
    }),
    prisma.strengthSessionAssignment.findMany({
      select: { id: true, actualExercises: true },
    }),
    prisma.strengthTemplate.findMany({
      select: { id: true, name: true, sessions: true, progressionRules: true },
    }),
    prisma.strengthTrainingSession.findMany({
      select: {
        id: true,
        strengthExercises: true,
        plyometricExercises: true,
        runningDrills: true,
      },
    }),
    prisma.aIGeneratedWOD.findMany({
      select: { id: true, title: true, workoutJson: true, exerciseLogs: true },
    }),
    prisma.exercise.findMany({
      select: { id: true, name: true, substitutes: true, progressionPath: true },
    }),
  ])

  for (const session of strengthSessions) {
    addJsonRefs(session.exercises, candidateIds, refs, `StrengthSession ${session.name} (${session.id}) exercises`)
    addJsonRefs(session.warmupData, candidateIds, refs, `StrengthSession ${session.name} (${session.id}) warmupData`)
    addJsonRefs(session.prehabData, candidateIds, refs, `StrengthSession ${session.name} (${session.id}) prehabData`)
    addJsonRefs(session.coreData, candidateIds, refs, `StrengthSession ${session.name} (${session.id}) coreData`)
    addJsonRefs(session.cooldownData, candidateIds, refs, `StrengthSession ${session.name} (${session.id}) cooldownData`)
  }

  for (const assignment of strengthAssignments) {
    addJsonRefs(assignment.actualExercises, candidateIds, refs, `StrengthSessionAssignment ${assignment.id} actualExercises`)
  }

  for (const template of strengthTemplates) {
    addJsonRefs(template.sessions, candidateIds, refs, `StrengthTemplate ${template.name} (${template.id}) sessions`)
    addJsonRefs(template.progressionRules, candidateIds, refs, `StrengthTemplate ${template.name} (${template.id}) progressionRules`)
  }

  for (const session of strengthTrainingSessions) {
    addJsonRefs(session.strengthExercises, candidateIds, refs, `StrengthTrainingSession ${session.id} strengthExercises`)
    addJsonRefs(session.plyometricExercises, candidateIds, refs, `StrengthTrainingSession ${session.id} plyometricExercises`)
    addJsonRefs(session.runningDrills, candidateIds, refs, `StrengthTrainingSession ${session.id} runningDrills`)
  }

  for (const wod of generatedWods) {
    addJsonRefs(wod.workoutJson, candidateIds, refs, `AIGeneratedWOD ${wod.title} (${wod.id}) workoutJson`)
    addJsonRefs(wod.exerciseLogs, candidateIds, refs, `AIGeneratedWOD ${wod.title} (${wod.id}) exerciseLogs`)
  }

  for (const exercise of exercises) {
    addJsonRefs(exercise.substitutes, candidateIds, refs, `Exercise ${exercise.name} (${exercise.id}) substitutes`)
    addJsonRefs(exercise.progressionPath, candidateIds, refs, `Exercise ${exercise.name} (${exercise.id}) progressionPath`)
  }

  return refs
}

async function main() {
  console.log(
    execute
      ? '=== EXECUTE MODE - orphan Strength Studio junk rows will be deleted ==='
      : '=== DRY RUN - pass --execute to actually delete ==='
  )
  console.log()

  const exercises = await prisma.exercise.findMany({
    select: {
      id: true,
      name: true,
      nameSv: true,
      nameEn: true,
      category: true,
      muscleGroup: true,
      isPublic: true,
      coachId: true,
      businessId: true,
      movementCategory: true,
      equipmentTypes: true,
      iconCategory: true,
      _count: {
        select: {
          segments: true,
          progressionTracking: true,
          oneRepMaxHistory: true,
          videoAnalyses: true,
          hybridMovements: true,
          vbtMeasurements: true,
          loadVelocityProfiles: true,
          setLogs: true,
          effectivenessRecords: true,
          outcomePatterns: true,
          rehabExercises: true,
          progressionOf: true,
          regressionOf: true,
          favorites: true,
          hiddenByUsers: true,
          nameAliases: true,
        },
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  const candidates = exercises.filter(isObviousCleanupCandidate)
  const candidateIds = new Set(candidates.map((exercise) => exercise.id))
  const jsonRefs = await findJsonRefs(candidateIds)

  const deletable = candidates.filter((exercise) => {
    const directRefs = directRefCount(exercise._count)
    const jsonRefCount = jsonRefs.get(exercise.id)?.length ?? 0
    return directRefs === 0 && jsonRefCount === 0
  })
  const blocked = candidates.filter((exercise) => !deletable.some((item) => item.id === exercise.id))

  console.log(`Total exercises: ${exercises.length}`)
  console.log(`Obvious non-strength candidates: ${candidates.length}`)
  console.log(`Deletable orphan candidates: ${deletable.length}`)
  console.log(`Kept because referenced: ${blocked.length}`)
  console.log()

  for (const exercise of deletable) {
    console.log(
      `DELETE ${exercise.id} | ${exercise.name} | ${exercise.category} | ` +
      `${exercise.isPublic ? 'system' : 'custom'} | ${exercise.coachId ?? exercise.businessId ?? 'global'}`
    )
  }

  if (blocked.length > 0) {
    console.log()
    console.log('Referenced candidates kept:')
    for (const exercise of blocked) {
      const directRefs = directRefCount(exercise._count)
      const refs = jsonRefs.get(exercise.id) ?? []
      console.log(
        `KEEP   ${exercise.id} | ${exercise.name} | ${exercise.category} | ` +
        `directRefs=${directRefs} jsonRefs=${refs.length}`
      )
      for (const ref of refs.slice(0, 3)) {
        console.log(`       - ${ref}`)
      }
      if (refs.length > 3) console.log(`       - ...${refs.length - 3} more`)
    }
  }

  if (!execute || deletable.length === 0) return

  const result = await prisma.exercise.deleteMany({
    where: { id: { in: deletable.map((exercise) => exercise.id) } },
  })
  console.log()
  console.log(`Deleted ${result.count} exercise row(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
