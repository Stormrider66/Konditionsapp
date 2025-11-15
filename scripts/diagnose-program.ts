// Diagnostic script to check program generation issues
import { prisma } from '../lib/prisma'

async function diagnoseProgramIssues() {
  console.log('🔍 Diagnosing program generation issues...\n')

  // 1. Check if exercises exist
  console.log('1️⃣ Checking Exercise table:')
  const allExercises = await prisma.exercise.findMany({
    where: { isPublic: true },
    select: { id: true, name: true, category: true, muscleGroup: true }
  })
  console.log(`   Total public exercises: ${allExercises.length}`)

  if (allExercises.length === 0) {
    console.log('   ❌ NO EXERCISES FOUND! Run: npx ts-node prisma/seed-exercises.ts\n')
    await prisma.$disconnect()
    return
  }

  const strengthExercises = allExercises.filter(e => e.category === 'STRENGTH')
  const coreExercises = allExercises.filter(e => e.category === 'CORE')
  const plyoExercises = allExercises.filter(e => e.category === 'PLYOMETRIC')

  console.log(`   - STRENGTH: ${strengthExercises.length} exercises`)
  console.log(`   - CORE: ${coreExercises.length} exercises`)
  console.log(`   - PLYOMETRIC: ${plyoExercises.length} exercises`)

  // Show first 3 strength exercises
  if (strengthExercises.length > 0) {
    console.log(`   Examples: ${strengthExercises.slice(0, 3).map(e => e.name).join(', ')}`)
  }

  // 2. Check latest program
  console.log('\n2️⃣ Checking latest training program:')
  const latestProgram = await prisma.trainingProgram.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { name: true } },
      weeks: {
        take: 1,
        include: {
          days: {
            take: 7,
            include: {
              workouts: {
                include: {
                  segments: {
                    include: {
                      exercise: { select: { id: true, name: true } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  if (!latestProgram) {
    console.log('   ❌ No programs found!')
    await prisma.$disconnect()
    return
  }

  console.log(`   Program: ${latestProgram.name}`)
  console.log(`   Client: ${latestProgram.client.name}`)
  console.log(`   Created: ${latestProgram.createdAt.toLocaleString('sv-SE')}`)

  // 3. Check workout segments
  console.log('\n3️⃣ Analyzing workout segments:')
  let totalSegments = 0
  let segmentsWithHR = 0
  let segmentsWithExercise = 0
  let segmentsWithPace = 0
  let strengthSegments = 0

  for (const week of latestProgram.weeks) {
    for (const day of week.days) {
      for (const workout of day.workouts) {
        for (const segment of workout.segments) {
          totalSegments++
          if (segment.heartRate) segmentsWithHR++
          if (segment.exerciseId) segmentsWithExercise++
          if (segment.pace) segmentsWithPace++
          if (segment.type?.toLowerCase() === 'exercise' || segment.type?.toLowerCase() === 'strength') {
            strengthSegments++
            console.log(`      ${workout.name} segment:`)
            console.log(`        - Type: ${segment.type}`)
            console.log(`        - ExerciseId: ${segment.exerciseId || 'MISSING'}`)
            console.log(`        - Exercise name: ${segment.exercise?.name || 'N/A'}`)
          }
        }
      }
    }
  }

  console.log(`   Total segments: ${totalSegments}`)
  console.log(`   Segments with heart rate: ${segmentsWithHR}`)
  console.log(`   Segments with pace: ${segmentsWithPace}`)
  console.log(`   Segments with exercise ID: ${segmentsWithExercise}`)
  console.log(`   Strength/exercise type segments: ${strengthSegments}`)

  // 4. Summary
  console.log('\n📋 Summary:')
  if (allExercises.length === 0) {
    console.log('❌ Problem: No exercises in database')
    console.log('   Solution: Run npx ts-node prisma/seed-exercises.ts')
  } else if (segmentsWithExercise === 0 && strengthSegments > 0) {
    console.log('❌ Problem: Exercises exist but not linked to workout segments')
    console.log('   Solution: Program was generated incorrectly. Check server console for errors during generation.')
  } else if (segmentsWithHR === 0) {
    console.log('❌ Problem: No heart rate data in segments')
    console.log('   Solution: Program was generated incorrectly. Check test has training zones.')
  } else {
    console.log('✅ Everything looks correct! Check display components.')
  }

  await prisma.$disconnect()
}

diagnoseProgramIssues().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
