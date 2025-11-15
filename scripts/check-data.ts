// Quick script to check database data
import { prisma } from '../lib/prisma'

async function checkData() {
  console.log('Checking database data...\n')

  // Check exercises
  const exerciseCount = await prisma.exercise.count()
  console.log(`✓ Exercises in database: ${exerciseCount}`)

  if (exerciseCount === 0) {
    console.log('  ⚠️  No exercises found! Run: npx ts-node prisma/seed-exercises.ts')
  }

  // Check programs
  const programCount = await prisma.trainingProgram.count()
  console.log(`✓ Training programs: ${programCount}`)

  // Check workout segments with heart rate
  const segmentsWithHR = await prisma.workoutSegment.count({
    where: {
      heartRate: { not: null }
    }
  })
  console.log(`✓ Workout segments with heart rate: ${segmentsWithHR}`)

  // Check workout segments with exercises
  const segmentsWithExercises = await prisma.workoutSegment.count({
    where: {
      exerciseId: { not: null }
    }
  })
  console.log(`✓ Workout segments with exercises: ${segmentsWithExercises}`)

  // Check total segments
  const totalSegments = await prisma.workoutSegment.count()
  console.log(`✓ Total workout segments: ${totalSegments}`)

  console.log('\n--- Summary ---')
  if (exerciseCount === 0) {
    console.log('❌ Need to seed exercises first')
  }
  if (segmentsWithHR === 0 && totalSegments > 0) {
    console.log('❌ Existing programs need heart rate data (regenerate program)')
  }
  if (segmentsWithExercises === 0 && totalSegments > 0) {
    console.log('❌ Existing programs missing exercises (regenerate program)')
  }
  if (exerciseCount > 0 && (segmentsWithHR > 0 || totalSegments === 0)) {
    console.log('✅ Ready to generate new programs!')
  }

  await prisma.$disconnect()
}

checkData().catch(console.error)
