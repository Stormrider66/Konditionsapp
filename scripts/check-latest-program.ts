// Check the latest program's workout segments
import { prisma } from '../lib/prisma'

async function checkLatestProgram() {
  console.log('Fetching latest program...\n')

  const program = await prisma.trainingProgram.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { name: true } },
      weeks: {
        take: 1,
        include: {
          days: {
            take: 1,
            include: {
              workouts: {
                take: 1,
                include: {
                  segments: {
                    include: {
                      exercise: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!program) {
    console.log('❌ No programs found')
    return
  }

  console.log(`Program: ${program.name}`)
  console.log(`Client: ${program.client.name}`)
  console.log(`Created: ${program.createdAt}\n`)

  const firstWorkout = program.weeks[0]?.days[0]?.workouts[0]
  if (!firstWorkout) {
    console.log('❌ No workouts found in first week/day')
    return
  }

  console.log(`First workout: ${firstWorkout.name || firstWorkout.type}`)
  console.log(`Type: ${firstWorkout.type}`)
  console.log(`Segments: ${firstWorkout.segments.length}\n`)

  console.log('--- SEGMENT DETAILS ---')
  firstWorkout.segments.forEach((segment: any, index: number) => {
    console.log(`\nSegment ${index + 1}:`)
    console.log(`  Type: ${segment.type}`)
    console.log(`  ExerciseId: ${segment.exerciseId || 'NULL'}`)
    console.log(`  Exercise Name: ${segment.exercise?.nameSv || 'NULL'}`)
    console.log(`  Heart Rate: ${segment.heartRate || 'NULL'}`)
    console.log(`  Pace: ${segment.pace || 'NULL'}`)
    console.log(`  Duration: ${segment.duration || 'NULL'}`)
    console.log(`  Sets: ${segment.sets || 'NULL'}`)
    console.log(`  Reps: ${segment.repsCount || 'NULL'}`)
  })

  console.log('\n--- EXERCISE TABLE CHECK ---')
  const exerciseCount = await prisma.exercise.count()
  console.log(`Total exercises in DB: ${exerciseCount}`)

  const sampleExercises = await prisma.exercise.findMany({ take: 3 })
  console.log('\nSample exercises:')
  sampleExercises.forEach((ex: any) => {
    console.log(`  - ${ex.nameSv} (${ex.category})`)
  })

  await prisma.$disconnect()
}

checkLatestProgram().catch(console.error)
