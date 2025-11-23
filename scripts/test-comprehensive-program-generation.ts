
import { generateBaseProgram, ProgramGenerationParams } from '@/lib/program-generator'
import { Test, Client, TrainingZone } from '@/types'

// ==========================================
// TEST DATA
// ==========================================

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
  trainingZones: [
    { zone: 1, name: 'Återhämtning', intensity: 'Mycket lätt', hrMin: 93, hrMax: 111, percentMin: 50, percentMax: 60, speedMin: 9.0, speedMax: 10.5 },
    { zone: 2, name: 'Grundkondition', intensity: 'Lätt', hrMin: 111, hrMax: 130, percentMin: 60, percentMax: 70, speedMin: 10.5, speedMax: 12.0 },
    { zone: 3, name: 'Tempo', intensity: 'Måttlig', hrMin: 130, hrMax: 148, percentMin: 70, percentMax: 80, speedMin: 12.0, speedMax: 13.5 },
    { zone: 4, name: 'Tröskel', intensity: 'Hård', hrMin: 148, hrMax: 167, percentMin: 80, percentMax: 90, speedMin: 13.5, speedMax: 14.5 },
    { zone: 5, name: 'VO2max', intensity: 'Maximal', hrMin: 167, hrMax: 185, percentMin: 90, percentMax: 100, speedMin: 14.5, speedMax: 16.0 },
  ] as TrainingZone[],
}

const sampleClient: Client = {
  id: 'client-123',
  userId: 'user-123',
  name: 'Test Athlete',
  email: 'test@example.com',
  gender: 'MALE',
  birthDate: new Date('1990-01-01'),
  height: 180,
  weight: 75,
  notes: 'Test athlete',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function runTest(name: string, params: ProgramGenerationParams, expectedOutcome: 'success' | 'failure' = 'success') {
  console.log(`\n--------------------------------------------------`)
  console.log(`🧪 TEST: ${name}`)
  console.log(`   Params: ${params.goalType}, ${params.durationWeeks}w, ${params.methodology || 'Auto'}, ${params.experienceLevel}`)
  
  try {
    const start = performance.now()
    const program = await generateBaseProgram(sampleTest, sampleClient, params)
    const end = performance.now()
    
    if (expectedOutcome === 'failure') {
      console.log(`❌ FAILED (Expected failure but got success)`)
      return
    }

    console.log(`✅ SUCCESS (${(end - start).toFixed(1)}ms)`)
    console.log(`   Name: "${program.name}"`)
    console.log(`   Weeks: ${program.weeks?.length}`)
    
    // Calculate total volume and workouts
    let totalDistance = 0
    let totalWorkouts = 0
    const typeCount: Record<string, number> = {}
    
    program.weeks?.forEach(week => {
      week.days.forEach(day => {
        day.workouts.forEach(workout => {
          totalWorkouts++
          typeCount[workout.type] = (typeCount[workout.type] || 0) + 1
          if (workout.distance) totalDistance += workout.distance
        })
      })
    })

    console.log(`   Stats: ${totalWorkouts} workouts, ~${Math.round(totalDistance)}km total`)
    console.log(`   Types: ${Object.entries(typeCount).map(([k, v]) => `${k}=${v}`).join(', ')}`)
    
    // Validation checks
    if (program.weeks?.length !== params.durationWeeks) {
      console.warn(`⚠️  WARNING: Generated weeks (${program.weeks?.length}) != Requested (${params.durationWeeks})`)
    }
    
  } catch (error: any) {
    if (expectedOutcome === 'failure') {
      console.log(`✅ SUCCESS (Expected failure: "${error.message}")`)
    } else {
      console.error(`❌ FAILED: ${error.message}`)
      // console.error(error) 
    }
  }
}

// ==========================================
// TEST SUITE
// ==========================================

async function runSuite() {
  console.log('🚀 STARTING COMPREHENSIVE PROGRAM GENERATION TESTS')

  // 1. Standard Use Case
  await runTest('Standard Marathon (Polarized)', {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-1',
    goalType: 'marathon',
    durationWeeks: 16,
    trainingDaysPerWeek: 4,
    experienceLevel: 'intermediate',
    methodology: 'POLARIZED'
  })

  // 2. Elite High Volume (Norwegian)
  await runTest('Elite 5K (Norwegian Double Threshold)', {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-1',
    goalType: '5k',
    durationWeeks: 12,
    trainingDaysPerWeek: 6,
    runningSessionsPerWeek: 10, // Double days
    experienceLevel: 'advanced',
    athleteLevel: 'ELITE',
    methodology: 'NORWEGIAN'
  })

  // 3. Beginner Fitness (Minimums)
  await runTest('Beginner Fitness (Min Constraints)', {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-1',
    goalType: 'fitness',
    durationWeeks: 4, // Min weeks
    trainingDaysPerWeek: 2, // Min days
    experienceLevel: 'beginner',
    methodology: 'PYRAMIDAL' // Using Pyramidal as fallback
  })

  // 4. Long Duration Outlier
  await runTest('Year Long Plan (Max Duration)', {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-1',
    goalType: 'marathon',
    durationWeeks: 52,
    trainingDaysPerWeek: 5,
    experienceLevel: 'advanced',
    methodology: 'PYRAMIDAL'
  })

  // 5. Canova Marathon Block
  await runTest('Canova Marathon Specific', {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-1',
    goalType: 'marathon',
    durationWeeks: 12,
    trainingDaysPerWeek: 6,
    experienceLevel: 'advanced',
    methodology: 'CANOVA'
  })

  // 6. Invalid Duration (Too Short)
  // Note: Validation happens in the API handler usually, but let's see if the generator handles it or throws
  // The generator itself might not throw on weeks < 4 if validateProgramParams isn't called inside it
  // But let's test the limits.
  await runTest('Invalid Duration (<4 weeks)', {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-1',
    goalType: '5k',
    durationWeeks: 2, 
    trainingDaysPerWeek: 3,
    experienceLevel: 'intermediate'
  })

  // 7. Invalid Days (Too Few)
  await runTest('Invalid Days (1 day/week)', {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-1',
    goalType: 'fitness',
    durationWeeks: 8, 
    trainingDaysPerWeek: 1,
    experienceLevel: 'beginner'
  })

  // 8. Granular Sessions (Heavy Strength Focus)
  await runTest('Hybrid Runner (Heavy Strength)', {
    testId: sampleTest.id,
    clientId: sampleClient.id,
    coachId: 'coach-1',
    goalType: 'half-marathon',
    durationWeeks: 10,
    trainingDaysPerWeek: 5,
    runningSessionsPerWeek: 3,
    strengthSessionsPerWeek: 3, // Heavy strength
    experienceLevel: 'intermediate',
    methodology: 'POLARIZED'
  })

  console.log('\n🏁 ALL TESTS COMPLETED')
}

runSuite().catch(console.error)

