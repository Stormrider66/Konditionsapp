// scripts/test-program-generation.ts
// Test script for program generation
// Run with: npx ts-node scripts/test-program-generation.ts

import { generateBaseProgram, ProgramGenerationParams } from '@/lib/program-generator'
import { Test, Client, TrainingZone } from '@/types'

// Sample test data from a VO2max test
const sampleTest: Test = {
  id: 'test-123',
  userId: 'user-123',
  clientId: 'client-123',
  testDate: new Date('2025-09-15'),
  testType: 'RUNNING',
  status: 'COMPLETED',
  location: 'Test Lab',
  notes: 'Sample test data for program generation',
  testStages: [],
  // VO2max and thresholds
  vo2max: 55.2,
  maxHR: 185,
  aerobicThreshold: {
    heartRate: 150,
    value: 12.5,
    unit: 'km/h',
    lactate: 2.0,
    percentOfMax: 81,
  },
  anaerobicThreshold: {
    heartRate: 170,
    value: 14.2,
    unit: 'km/h',
    lactate: 4.0,
    percentOfMax: 92,
  },
  // Training zones
  trainingZones: [
    {
      zone: 1,
      name: 'Återhämtning',
      intensity: 'Mycket lätt',
      hrMin: 93,
      hrMax: 111,
      percentMin: 50,
      percentMax: 60,
      speedMin: 9.0,
      speedMax: 10.5,
      effect: 'Återhämtning och grundträning',
    },
    {
      zone: 2,
      name: 'Grundkondition',
      intensity: 'Lätt',
      hrMin: 111,
      hrMax: 130,
      percentMin: 60,
      percentMax: 70,
      speedMin: 10.5,
      speedMax: 12.0,
      effect: 'Grundkondition och fettförbränning',
    },
    {
      zone: 3,
      name: 'Tempo',
      intensity: 'Måttlig',
      hrMin: 130,
      hrMax: 148,
      percentMin: 70,
      percentMax: 80,
      speedMin: 12.0,
      speedMax: 13.5,
      effect: 'Aerob kapacitet',
    },
    {
      zone: 4,
      name: 'Tröskel',
      intensity: 'Hård',
      hrMin: 148,
      hrMax: 167,
      percentMin: 80,
      percentMax: 90,
      speedMin: 13.5,
      speedMax: 14.5,
      effect: 'Laktattolerans',
    },
    {
      zone: 5,
      name: 'VO2max',
      intensity: 'Maximal',
      hrMin: 167,
      hrMax: 185,
      percentMin: 90,
      percentMax: 100,
      speedMin: 14.5,
      speedMax: 16.0,
      effect: 'Maximal syreupptagning',
    },
  ] as TrainingZone[],
}

// Sample client
const sampleClient: Client = {
  id: 'client-123',
  userId: 'user-123',
  name: 'Joakim Hällgren',
  email: 'joakim@example.com',
  gender: 'MALE',
  birthDate: new Date('1985-03-15'),
  height: 186,
  weight: 88,
  notes: 'Experienced runner, training for marathon',
  createdAt: new Date(),
  updatedAt: new Date(),
}

async function testMarathonProgram() {
  console.log('🏃 Testing Marathon Program Generation\n')

  const params: ProgramGenerationParams = {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-123',
    goalType: 'marathon',
    targetRaceDate: new Date('2026-06-15'), // 9 months from now
    durationWeeks: 16,
    trainingDaysPerWeek: 5,
    experienceLevel: 'intermediate',
    currentWeeklyVolume: 45, // km per week
    notes: 'First marathon, aiming for sub-3:30',
  }

  try {
    const program = await generateBaseProgram(sampleTest, sampleClient, params)

    console.log('✅ Program generated successfully!\n')
    console.log('Program Details:')
    console.log(`  Name: ${program.name}`)
    console.log(`  Duration: ${program.weeks?.length || 0} weeks`)
    console.log(`  Start Date: ${typeof program.startDate === 'string' ? program.startDate : program.startDate.toLocaleDateString('sv-SE')}`)
    console.log(`  End Date: ${typeof program.endDate === 'string' ? program.endDate : program.endDate.toLocaleDateString('sv-SE')}`)
    console.log(`  Goal: ${program.goalType}\n`)

    if (!program.weeks || program.weeks.length === 0) {
      console.log('⚠️  No weeks generated')
      return
    }

    // Show sample week structure
    const week1 = program.weeks[0]
    const week8 = program.weeks[7]
    const week16 = program.weeks[15]

    console.log('Week 1 (BASE):')
    console.log(`  Phase: ${week1.phase}`)
    console.log(`  Focus: ${week1.focus}`)
    console.log(`  Volume: ${week1.volume.toFixed(1)}%`)
    console.log(`  Training Days: ${week1.days.filter((d: any) => d.workouts.length > 0).length}`)
    week1.days.forEach((day: any) => {
      if (day.workouts.length > 0) {
        day.workouts.forEach((workout: any) => {
          console.log(`    Day ${day.dayOfWeek}: ${workout.name} (${workout.type})`)
        })
      }
    })

    console.log('\nWeek 8 (BUILD):')
    console.log(`  Phase: ${week8.phase}`)
    console.log(`  Focus: ${week8.focus}`)
    console.log(`  Volume: ${week8.volume.toFixed(1)}%`)
    console.log(`  Training Days: ${week8.days.filter((d: any) => d.workouts.length > 0).length}`)

    console.log('\nWeek 16 (TAPER):')
    console.log(`  Phase: ${week16.phase}`)
    console.log(`  Focus: ${week16.focus}`)
    console.log(`  Volume: ${week16.volume.toFixed(1)}%`)
    console.log(`  Training Days: ${week16.days.filter((d: any) => d.workouts.length > 0).length}`)

    // Show sample workout detail
    const sampleWorkout = week1.days.find((d: any) => d.workouts.length > 0)?.workouts[0]
    if (sampleWorkout) {
      console.log('\nSample Workout Detail:')
      console.log(`  ${sampleWorkout.name}`)
      console.log(`  Type: ${sampleWorkout.type}`)
      console.log(`  Intensity: ${sampleWorkout.intensity}`)
      console.log(`  Duration: ${sampleWorkout.duration} min`)
      console.log(`  Instructions: ${sampleWorkout.instructions}`)
      console.log(`  Segments: ${sampleWorkout.segments?.length || 0}`)
      if (sampleWorkout.segments && sampleWorkout.segments.length > 0) {
        sampleWorkout.segments.forEach((segment: any) => {
          console.log(`    - ${segment.description} (${segment.duration} min, ${segment.pace || 'N/A'})`)
        })
      }
    }

    console.log('\n✅ Marathon program test completed successfully!')
  } catch (error: any) {
    console.error('❌ Error generating program:', error.message)
    console.error(error.stack)
  }
}

async function test10KProgram() {
  console.log('\n🏃 Testing 10K Program Generation\n')

  const params: ProgramGenerationParams = {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-123',
    goalType: '10k',
    targetRaceDate: new Date('2026-01-15'),
    durationWeeks: 8,
    trainingDaysPerWeek: 4,
    experienceLevel: 'intermediate',
    currentWeeklyVolume: 35,
    notes: 'Training for 10K PR',
  }

  try {
    const program = await generateBaseProgram(sampleTest, sampleClient, params)

    console.log('✅ 10K Program generated successfully!')
    console.log(`  Name: ${program.name}`)
    console.log(`  Duration: ${program.weeks?.length || 0} weeks`)
    if (program.weeks) {
      console.log(`  Total workouts: ${program.weeks.reduce((sum: number, week: any) =>
        sum + week.days.reduce((daySum: number, day: any) => daySum + day.workouts.length, 0), 0
      )}`)
    }

    console.log('\n✅ 10K program test completed successfully!')
  } catch (error: any) {
    console.error('❌ Error generating 10K program:', error.message)
  }
}

async function testFitnessProgram() {
  console.log('\n💪 Testing Fitness Program Generation\n')

  const params: ProgramGenerationParams = {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-123',
    goalType: 'fitness',
    durationWeeks: 12,
    trainingDaysPerWeek: 3,
    experienceLevel: 'beginner',
    notes: 'General fitness and health',
  }

  try {
    const program = await generateBaseProgram(sampleTest, sampleClient, params)

    console.log('✅ Fitness Program generated successfully!')
    console.log(`  Name: ${program.name}`)
    console.log(`  Duration: ${program.weeks?.length || 0} weeks`)
    console.log(`  Training days per week: 3`)

    console.log('\n✅ Fitness program test completed successfully!')
  } catch (error: any) {
    console.error('❌ Error generating fitness program:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log('======================================')
  console.log('   PROGRAM GENERATION TEST SUITE')
  console.log('======================================\n')

  await testMarathonProgram()
  await test10KProgram()
  await testFitnessProgram()

  console.log('\n======================================')
  console.log('   ALL TESTS COMPLETED')
  console.log('======================================\n')
}

// Run tests
runAllTests().catch(console.error)
