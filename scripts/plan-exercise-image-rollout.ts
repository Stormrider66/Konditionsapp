import { PrismaClient, type BiomechanicalPillar, type MovementCategory, type WorkoutType } from '@prisma/client'

const prisma = new PrismaClient()

type FrameCount = 1 | 2 | 3
type Subject = 'woman' | 'man'

type ExerciseRow = {
  name: string
  nameSv: string | null
  nameEn: string | null
  category: WorkoutType
  biomechanicalPillar: BiomechanicalPillar | null
  movementCategory: MovementCategory | null
  equipment: string | null
  equipmentTypes: string[]
  imageUrls: unknown
}

type PlannedExercise = ExerciseRow & {
  frames: FrameCount
  subject: Subject
  priority: number
  currentImageCount: number
  reason: string
}

const FRAME_OVERRIDES: Record<string, { frames: FrameCount; reason: string }> = {
  'Back Squat': { frames: 2, reason: 'controlled strength: top and bottom' },
  'Bänkpress': { frames: 2, reason: 'controlled strength: lockout and chest touch' },
  'Bench Press': { frames: 2, reason: 'controlled strength: lockout and chest touch' },
  'Deadlift': { frames: 3, reason: 'technical hinge: setup, knee height, lockout' },
  'Marklyft': { frames: 3, reason: 'technical hinge: setup, knee height, lockout' },
  'Kettlebell Swing': { frames: 3, reason: 'dynamic hinge: backswing, hip snap, float' },
  'Pull-Up': { frames: 3, reason: 'bodyweight pull: hang, mid-pull, chin over bar' },
  'Push-Up': { frames: 2, reason: 'controlled bodyweight strength: top and bottom' },
  'Single Under': { frames: 3, reason: 'coordination movement: takeoff, rope pass, landing' },
  'Double Under': { frames: 3, reason: 'coordination movement: takeoff, rope pass, landing' },
  'Triple Under': { frames: 3, reason: 'coordination movement: takeoff, rope pass, landing' },
  'Hip Thrust med skivstång': { frames: 2, reason: 'controlled strength: bottom and lockout' },
  'Benpress': { frames: 2, reason: 'machine strength: bent-knee and press position' },
  'Leg Press': { frames: 2, reason: 'machine strength: bent-knee and press position' },
  'Split Squat': { frames: 2, reason: 'controlled unilateral strength: top and bottom' },
}

const STATIC_TERMS = [
  'hold',
  'plank',
  'wall sit',
  'carry',
  'farmer',
  'suitcase',
  'yoke',
  'pallof',
  'hollow',
  'l-sit',
  'dead bug',
  'bird dog',
  'foam rolling',
  'mobility',
  'stretch',
  'toe yoga',
  'wall angel',
  'skierg',
]

const TECHNICAL_TERMS = [
  'clean',
  'snatch',
  'jerk',
  'swing',
  'burpee',
  'muscle-up',
  'pull-up',
  'rope climb',
  'wall walk',
  'handstand walk',
  'toes-to-bar',
  'knees-to-elbow',
  'box jump',
  'broad jump',
  'bound',
  'hop',
  'jump',
  'under',
  'thruster',
  'cluster',
  'turkish get-up',
  'man maker',
]

const CONTROLLED_TWO_FRAME_TERMS = [
  'squat',
  'knäböj',
  'lunge',
  'utfall',
  'step-up',
  'row',
  'rodd',
  'press',
  'push-up',
  'armhäv',
  'dip',
  'bridge',
  'brygga',
  'deadlift',
  'marklyft',
  'rdl',
  'raise',
  'tåhäv',
  'curl',
  'extension',
  'rotation',
  'pulldown',
  'latsdrag',
]

const FOUNDATION_TERMS = [
  'squat',
  'knäböj',
  'deadlift',
  'marklyft',
  'bench',
  'bänkpress',
  'press',
  'row',
  'rodd',
  'pull-up',
  'push-up',
  'armhäv',
  'lunge',
  'utfall',
  'split squat',
  'step-up',
  'hip thrust',
  'bridge',
  'brygga',
  'plank',
  'leg press',
  'benpress',
  'calf',
  'tåhäv',
  'single under',
  'double under',
  'kettlebell swing',
]

function parseLimit(args: string[]): number | null {
  const arg = args.find((value) => value.startsWith('--limit='))
  if (!arg) return null
  const parsed = Number.parseInt(arg.replace('--limit=', ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle))
}

function normalizedNames(exercise: ExerciseRow): string {
  return [exercise.name, exercise.nameSv, exercise.nameEn].filter(Boolean).join(' ').toLowerCase()
}

function getCurrentImageCount(value: unknown): number {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.length > 0).length : 0
}

function inferFrameCount(exercise: ExerciseRow): { frames: FrameCount; reason: string } {
  const override =
    FRAME_OVERRIDES[exercise.name] ??
    (exercise.nameSv ? FRAME_OVERRIDES[exercise.nameSv] : undefined) ??
    (exercise.nameEn ? FRAME_OVERRIDES[exercise.nameEn] : undefined)

  if (override) return override

  const names = normalizedNames(exercise)
  const movementCategory = exercise.movementCategory

  if (
    exercise.movementCategory === 'MONOSTRUCTURAL' ||
    exercise.category === 'RUNNING' ||
    exercise.category === 'CYCLING' ||
    exercise.category === 'SWIMMING'
  ) {
    return { frames: 1, reason: 'cyclic station movement reads best as one hero frame' }
  }

  if (includesAny(names, STATIC_TERMS)) {
    return { frames: 1, reason: 'simple hold, station, carry, or mobility frame' }
  }

  if (
    movementCategory === 'OLYMPIC_LIFT' ||
    includesAny(names, TECHNICAL_TERMS)
  ) {
    return { frames: 3, reason: 'technical or dynamic movement needs middle frame' }
  }

  if (exercise.category === 'PLYOMETRIC') {
    return { frames: 3, reason: 'plyometric movement needs load, flight, and landing' }
  }

  if (includesAny(names, CONTROLLED_TWO_FRAME_TERMS)) {
    return { frames: 2, reason: 'controlled strength movement with start and end position' }
  }

  if (exercise.category === 'CORE') {
    return { frames: 1, reason: 'core movement usually reads best as one clear hero frame' }
  }

  return { frames: 2, reason: 'controlled strength movement with start and end position' }
}

function inferPriority(exercise: ExerciseRow, frames: FrameCount): number {
  const names = normalizedNames(exercise)
  const foundation = includesAny(names, FOUNDATION_TERMS)

  if (foundation && frames === 2) return 1
  if (foundation && frames === 3) return 2
  if (frames === 2 && exercise.category === 'STRENGTH') return 3
  if (frames === 3) return 4
  if (frames === 1) return 5
  return 5
}

function assignSubjects<T extends { priority: number; name: string }>(rows: T[]): Array<T & { subject: Subject }> {
  return rows.map((row, index) => ({
    ...row,
    subject: index % 2 === 0 ? 'woman' : 'man',
  }))
}

function toMarkdown(rows: PlannedExercise[], total: number): string {
  const frameCounts = rows.reduce<Record<FrameCount, number>>(
    (acc, row) => {
      acc[row.frames] += 1
      return acc
    },
    { 1: 0, 2: 0, 3: 0 }
  )

  const lines = [
    `Scope: public system exercises only (coachId=null, businessId=null, isPublic=true), classified non-warmups.`,
    `Planned rows shown: ${rows.length} of ${total}. Frame mix in shown rows: 1 image=${frameCounts[1]}, 2 images=${frameCounts[2]}, 3 images=${frameCounts[3]}.`,
    '',
    '| # | Exercise | Swedish | Pillar | Frames | Subject | Current | Reason |',
    '| ---: | --- | --- | --- | ---: | --- | ---: | --- |',
  ]

  rows.forEach((row, index) => {
    lines.push(
      `| ${index + 1} | ${row.name} | ${row.nameSv ?? ''} | ${row.biomechanicalPillar ?? ''} | ${row.frames} | ${row.subject} | ${row.currentImageCount} | ${row.reason} |`
    )
  })

  return lines.join('\n')
}

async function main() {
  const args = process.argv.slice(2)
  const limit = parseLimit(args)
  const includeWarmups = args.includes('--include-warmups')
  const json = args.includes('--json')

  const where = {
    coachId: null,
    businessId: null,
    isPublic: true,
    biomechanicalPillar: { not: null },
    ...(includeWarmups ? {} : { category: { not: 'WARMUP' as WorkoutType } }),
  }

  const exercises = await prisma.exercise.findMany({
    where,
    select: {
      name: true,
      nameSv: true,
      nameEn: true,
      category: true,
      biomechanicalPillar: true,
      movementCategory: true,
      equipment: true,
      equipmentTypes: true,
      imageUrls: true,
    },
    orderBy: [{ biomechanicalPillar: 'asc' }, { category: 'asc' }, { name: 'asc' }],
  })

  const plannedWithoutSubjects = exercises.map((exercise) => {
    const { frames, reason } = inferFrameCount(exercise)
    return {
      ...exercise,
      frames,
      priority: inferPriority(exercise, frames),
      currentImageCount: getCurrentImageCount(exercise.imageUrls),
      reason,
    }
  })

  const planned = assignSubjects(
    plannedWithoutSubjects.sort((a, b) => a.priority - b.priority || a.frames - b.frames || a.name.localeCompare(b.name))
  )

  const shown = limit ? planned.slice(0, limit) : planned

  if (json) {
    console.log(JSON.stringify({ total: planned.length, shown }, null, 2))
  } else {
    console.log(toMarkdown(shown, planned.length))
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
