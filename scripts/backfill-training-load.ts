/**
 * Backfill TrainingLoad for completed workouts
 *
 * Run with: npx tsx scripts/backfill-training-load.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillWorkoutLogs() {
  console.log('=== Backfilling TrainingLoad from WorkoutLogs ===\n')

  // Find all completed workout logs that don't have TrainingLoad entries
  const completedLogs = await prisma.workoutLog.findMany({
    where: {
      completed: true,
      completedAt: { not: null },
      duration: { not: null },
    },
    include: {
      workout: {
        select: { name: true, type: true },
      },
      athlete: {
        select: {
          id: true,
          name: true,
          athleteAccount: {
            select: { clientId: true },
          },
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  })

  console.log(`Found ${completedLogs.length} completed workout logs with duration\n`)

  let created = 0
  let skipped = 0
  let noClient = 0

  // Map workout type to training load workout type
  const workoutTypeMap: Record<string, string> = {
    STRENGTH: 'STRENGTH',
    CARDIO: 'CARDIO',
    RUNNING: 'CARDIO',
    CYCLING: 'CARDIO',
    SWIMMING: 'CARDIO',
    SKIING: 'CARDIO',
    HYROX: 'HYBRID',
    FLEXIBILITY: 'RECOVERY',
    RECOVERY: 'RECOVERY',
  }

  for (const log of completedLogs) {
    const clientId = log.athlete?.athleteAccount?.clientId
    if (!clientId) {
      console.log(`  [NO CLIENT] ${log.workout.name} - athlete ${log.athlete?.name} has no clientId`)
      noClient++
      continue
    }

    const completedDate = new Date(log.completedAt!)
    completedDate.setHours(0, 0, 0, 0)

    const loadWorkoutType = workoutTypeMap[log.workout.type] || 'GENERAL'

    // Check if TrainingLoad already exists for this day/type
    const existingLoad = await prisma.trainingLoad.findFirst({
      where: {
        clientId,
        date: completedDate,
        workoutType: loadWorkoutType,
      },
    })

    if (existingLoad) {
      console.log(`  [SKIP] ${log.workout.name} (${completedDate.toISOString().split('T')[0]}) - TrainingLoad already exists`)
      skipped++
      continue
    }

    // Calculate TSS from duration and RPE
    const duration = log.duration!
    const rpe = log.perceivedEffort || 6
    const estimatedTSS = Math.round(duration * (rpe / 10) * 0.9)

    // Map RPE to intensity
    let intensity = 'MODERATE'
    if (rpe <= 3) intensity = 'EASY'
    else if (rpe <= 5) intensity = 'MODERATE'
    else if (rpe <= 7) intensity = 'HARD'
    else intensity = 'VERY_HARD'

    // Create TrainingLoad entry
    await prisma.trainingLoad.create({
      data: {
        clientId,
        date: completedDate,
        dailyLoad: estimatedTSS,
        loadType: 'RPE_BASED',
        duration: duration,
        distance: log.distance || undefined,
        avgHR: log.avgHR || undefined,
        maxHR: log.maxHR || undefined,
        avgPace: typeof log.avgPace === 'number' && log.avgPace > 0 ? log.avgPace : undefined,
        intensity,
        workoutType: loadWorkoutType,
        workoutId: log.workoutId,
      },
    })

    console.log(`  [CREATE] ${log.workout.name} (${log.workout.type})`)
    console.log(`           Athlete: ${log.athlete?.name}`)
    console.log(`           Date: ${completedDate.toISOString().split('T')[0]}, Duration: ${duration}min, RPE: ${rpe}, TSS: ${estimatedTSS}`)
    created++
  }

  console.log(`\n✅ WorkoutLog backfill: ${created} created, ${skipped} skipped, ${noClient} no client`)
}

async function backfillStrengthSessions() {
  console.log('\n=== Backfilling TrainingLoad from Strength Sessions ===\n')

  const completedAssignments = await prisma.strengthSessionAssignment.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { not: null },
    },
    include: {
      session: { select: { name: true, estimatedDuration: true } },
      athlete: { select: { id: true, name: true } },
    },
    orderBy: { completedAt: 'desc' },
  })

  console.log(`Found ${completedAssignments.length} completed strength sessions`)

  let created = 0
  let skipped = 0

  for (const assignment of completedAssignments) {
    const completedDate = new Date(assignment.completedAt!)
    completedDate.setHours(0, 0, 0, 0)

    const existingLoad = await prisma.trainingLoad.findFirst({
      where: {
        clientId: assignment.athleteId,
        date: completedDate,
        workoutType: 'STRENGTH',
      },
    })

    if (existingLoad) {
      console.log(`  [SKIP] ${assignment.session.name} - already exists`)
      skipped++
      continue
    }

    const duration = assignment.duration || assignment.session.estimatedDuration || 45
    const rpe = assignment.rpe || 6
    const strengthTSS = Math.round(duration * (rpe / 10) * 0.8)

    let intensity = 'MODERATE'
    if (rpe <= 3) intensity = 'EASY'
    else if (rpe <= 5) intensity = 'MODERATE'
    else if (rpe <= 7) intensity = 'HARD'
    else intensity = 'VERY_HARD'

    await prisma.trainingLoad.create({
      data: {
        clientId: assignment.athleteId,
        date: completedDate,
        dailyLoad: strengthTSS,
        loadType: 'STRENGTH_TSS',
        duration: duration,
        intensity,
        workoutType: 'STRENGTH',
      },
    })

    console.log(`  [CREATE] ${assignment.session.name} - TSS: ${strengthTSS}`)
    created++
  }

  console.log(`\n✅ Strength session backfill: ${created} created, ${skipped} skipped`)
}

async function main() {
  try {
    await backfillWorkoutLogs()
    await backfillStrengthSessions()

    console.log('\n=== Final TrainingLoad Summary ===\n')
    const recentLoads = await prisma.trainingLoad.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      include: { client: { select: { name: true } } },
    })

    for (const l of recentLoads) {
      console.log(`${l.date.toISOString().split('T')[0]} | ${l.client.name} | ${l.workoutType} | ${l.dailyLoad} TSS | ${l.duration}min`)
    }
  } catch (error) {
    console.error('Error during backfill:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
