// scripts/test-multi-sport-generator.ts
// Comprehensive test for multi-sport program generation (Phase 6)

import { generateSportProgram, SportProgramParams } from '@/lib/program-generator/sport-router'
import { Client, Test, TrainingZone } from '@/types'

// ==========================================
// TEST DATA
// ==========================================

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

const sampleRunningTest: Test = {
  id: 'test-running-123',
  userId: 'user-123',
  clientId: 'client-123',
  testDate: new Date('2025-09-15'),
  testType: 'RUNNING',
  status: 'COMPLETED',
  location: 'Test Lab',
  notes: 'Running test data',
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

const sampleCyclingTest: Test = {
  id: 'test-cycling-123',
  userId: 'user-123',
  clientId: 'client-123',
  testDate: new Date('2025-09-15'),
  testType: 'CYCLING',
  status: 'COMPLETED',
  location: 'Test Lab',
  notes: 'Cycling test data',
  testStages: [],
  vo2max: 52.0,
  maxHR: 180,
  aerobicThreshold: {
    heartRate: 145,
    value: 200,
    unit: 'watt',
    lactate: 2.0,
    percentOfMax: 80,
  },
  anaerobicThreshold: {
    heartRate: 168,
    value: 280,
    unit: 'watt',
    lactate: 4.0,
    percentOfMax: 93,
  },
  trainingZones: [] as TrainingZone[],
}

// ==========================================
// TEST CONFIGURATION
// ==========================================

interface TestCase {
  name: string
  sport: SportProgramParams['sport']
  goal: string
  params: Partial<SportProgramParams>
  expectedOutcome?: 'success' | 'failure'
}

const testCases: TestCase[] = [
  // RUNNING Tests
  {
    name: 'Running - Marathon (Polarized)',
    sport: 'RUNNING',
    goal: 'marathon',
    params: {
      durationWeeks: 16,
      sessionsPerWeek: 5,
      methodology: 'POLARIZED',
    },
  },
  {
    name: 'Running - 5K (Norwegian)',
    sport: 'RUNNING',
    goal: '5k',
    params: {
      durationWeeks: 12,
      sessionsPerWeek: 6,
      methodology: 'NORWEGIAN',
    },
  },
  {
    name: 'Running - Custom (Manual Data)',
    sport: 'RUNNING',
    goal: 'custom',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 4,
      dataSource: 'MANUAL',
    },
  },

  // CYCLING Tests
  {
    name: 'Cycling - FTP Builder',
    sport: 'CYCLING',
    goal: 'ftp-builder',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 4,
      manualFtp: 250,
      weeklyHours: 8,
    },
  },
  {
    name: 'Cycling - Base Builder',
    sport: 'CYCLING',
    goal: 'base-builder',
    params: {
      durationWeeks: 12,
      sessionsPerWeek: 5,
      weeklyHours: 10,
    },
  },
  {
    name: 'Cycling - Gran Fondo',
    sport: 'CYCLING',
    goal: 'gran-fondo',
    params: {
      durationWeeks: 12,
      sessionsPerWeek: 4,
      weeklyHours: 10,
    },
  },
  {
    name: 'Cycling - Custom',
    sport: 'CYCLING',
    goal: 'custom',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 3,
    },
  },

  // SWIMMING Tests
  {
    name: 'Swimming - CSS Builder',
    sport: 'SWIMMING',
    goal: 'css-builder',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 4,
      manualCss: '1:45',
    },
  },
  {
    name: 'Swimming - Distance (1500m)',
    sport: 'SWIMMING',
    goal: 'distance',
    params: {
      durationWeeks: 12,
      sessionsPerWeek: 5,
    },
  },
  {
    name: 'Swimming - Sprint (100m)',
    sport: 'SWIMMING',
    goal: 'sprint',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 5,
    },
  },
  {
    name: 'Swimming - Open Water (3km)',
    sport: 'SWIMMING',
    goal: 'open-water',
    params: {
      durationWeeks: 10,
      sessionsPerWeek: 4,
    },
  },

  // TRIATHLON Tests
  {
    name: 'Triathlon - Sprint',
    sport: 'TRIATHLON',
    goal: 'sprint',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 6,
      weeklyHours: 8,
    },
  },
  {
    name: 'Triathlon - Olympic',
    sport: 'TRIATHLON',
    goal: 'olympic',
    params: {
      durationWeeks: 12,
      sessionsPerWeek: 7,
      weeklyHours: 10,
    },
  },
  {
    name: 'Triathlon - 70.3 (Half Ironman)',
    sport: 'TRIATHLON',
    goal: 'half-ironman',
    params: {
      durationWeeks: 16,
      sessionsPerWeek: 8,
      weeklyHours: 12,
    },
  },

  // HYROX Tests
  {
    name: 'HYROX - Beginner',
    sport: 'HYROX',
    goal: 'beginner',
    params: {
      durationWeeks: 12,
      sessionsPerWeek: 4,
    },
  },
  {
    name: 'HYROX - Intermediate',
    sport: 'HYROX',
    goal: 'intermediate',
    params: {
      durationWeeks: 16,
      sessionsPerWeek: 5,
    },
  },
  {
    name: 'HYROX - Custom',
    sport: 'HYROX',
    goal: 'custom',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 4,
    },
  },

  // SKIING Tests
  {
    name: 'Skiing - Threshold Builder',
    sport: 'SKIING',
    goal: 'threshold-builder',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 4,
      weeklyHours: 8,
      technique: 'both',
    },
  },
  {
    name: 'Skiing - Prep Phase',
    sport: 'SKIING',
    goal: 'prep-phase',
    params: {
      durationWeeks: 12,
      sessionsPerWeek: 5,
      weeklyHours: 10,
    },
  },
  {
    name: 'Skiing - Vasaloppet',
    sport: 'SKIING',
    goal: 'vasaloppet',
    params: {
      durationWeeks: 16,
      sessionsPerWeek: 5,
      weeklyHours: 12,
    },
  },

  // STRENGTH Tests
  {
    name: 'Strength - Injury Prevention',
    sport: 'STRENGTH',
    goal: 'injury-prevention',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 2,
    },
  },
  {
    name: 'Strength - Power Development',
    sport: 'STRENGTH',
    goal: 'power-development',
    params: {
      durationWeeks: 12,
      sessionsPerWeek: 3,
    },
  },

  // GENERAL FITNESS Tests
  {
    name: 'General Fitness - Weight Loss',
    sport: 'GENERAL_FITNESS',
    goal: 'weight-loss',
    params: {
      durationWeeks: 12,
      sessionsPerWeek: 4,
    },
  },
  {
    name: 'General Fitness - Cardiovascular',
    sport: 'GENERAL_FITNESS',
    goal: 'cardiovascular',
    params: {
      durationWeeks: 8,
      sessionsPerWeek: 3,
    },
  },

  // Edge Cases
  {
    name: 'Edge Case - Short Program (4 weeks)',
    sport: 'RUNNING',
    goal: '5k',
    params: {
      durationWeeks: 4,
      sessionsPerWeek: 3,
    },
  },
  {
    name: 'Edge Case - Long Program (24 weeks)',
    sport: 'CYCLING',
    goal: 'base-builder',
    params: {
      durationWeeks: 24,
      sessionsPerWeek: 4,
      weeklyHours: 8,
    },
  },
]

// ==========================================
// HELPER FUNCTIONS
// ==========================================

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'EXPECTED_FAIL'
  duration: number
  details: {
    programName?: string
    weeks?: number
    totalWorkouts?: number
    workoutTypes?: Record<string, number>
    hasDetailedContent?: boolean
    error?: string
  }
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  const startTime = performance.now()

  const fullParams: SportProgramParams = {
    clientId: sampleClient.id,
    coachId: 'coach-123',
    sport: testCase.sport,
    goal: testCase.goal,
    durationWeeks: testCase.params.durationWeeks || 8,
    sessionsPerWeek: testCase.params.sessionsPerWeek || 4,
    dataSource: testCase.params.dataSource || 'MANUAL',
    ...testCase.params,
  }

  // Use appropriate test data based on sport
  let test: Test | undefined = undefined
  if (fullParams.dataSource === 'TEST') {
    if (testCase.sport === 'RUNNING' || testCase.sport === 'TRIATHLON') {
      test = sampleRunningTest
    } else if (testCase.sport === 'CYCLING') {
      test = sampleCyclingTest
    }
  }

  try {
    const program = await generateSportProgram(fullParams, sampleClient, test)
    const endTime = performance.now()

    // Analyze the program
    let totalWorkouts = 0
    const workoutTypes: Record<string, number> = {}
    let hasDetailedContent = false

    program.weeks?.forEach(week => {
      week.days?.forEach(day => {
        day.workouts?.forEach(workout => {
          totalWorkouts++
          workoutTypes[workout.type] = (workoutTypes[workout.type] || 0) + 1

          // Check if workout has detailed content (segments, instructions, etc.)
          if (workout.segments && workout.segments.length > 0) {
            hasDetailedContent = true
          }
          if (workout.instructions || workout.description) {
            hasDetailedContent = true
          }
        })
      })
    })

    const result: TestResult = {
      name: testCase.name,
      status: testCase.expectedOutcome === 'failure' ? 'EXPECTED_FAIL' : 'PASS',
      duration: endTime - startTime,
      details: {
        programName: program.name,
        weeks: program.weeks?.length,
        totalWorkouts,
        workoutTypes,
        hasDetailedContent,
      },
    }

    // Validate expected outcomes
    if (program.weeks?.length !== fullParams.durationWeeks) {
      console.warn(`  ⚠️  Week count mismatch: ${program.weeks?.length} vs expected ${fullParams.durationWeeks}`)
    }

    return result
  } catch (error: any) {
    const endTime = performance.now()

    if (testCase.expectedOutcome === 'failure') {
      return {
        name: testCase.name,
        status: 'EXPECTED_FAIL',
        duration: endTime - startTime,
        details: {
          error: error.message,
        },
      }
    }

    return {
      name: testCase.name,
      status: 'FAIL',
      duration: endTime - startTime,
      details: {
        error: error.message,
      },
    }
  }
}

function printResult(result: TestResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'EXPECTED_FAIL' ? '⚠️' : '❌'
  console.log(`\n${icon} ${result.name}`)
  console.log(`   Duration: ${result.duration.toFixed(1)}ms`)

  if (result.details.programName) {
    console.log(`   Program: "${result.details.programName}"`)
  }
  if (result.details.weeks !== undefined) {
    console.log(`   Weeks: ${result.details.weeks}`)
  }
  if (result.details.totalWorkouts !== undefined) {
    console.log(`   Total Workouts: ${result.details.totalWorkouts}`)
  }
  if (result.details.workoutTypes && Object.keys(result.details.workoutTypes).length > 0) {
    const types = Object.entries(result.details.workoutTypes)
      .map(([type, count]) => `${type}=${count}`)
      .join(', ')
    console.log(`   Workout Types: ${types}`)
  }
  if (result.details.hasDetailedContent !== undefined) {
    console.log(`   Has Detailed Content: ${result.details.hasDetailedContent ? 'Yes ✓' : 'No (skeleton only)'}`)
  }
  if (result.details.error) {
    console.log(`   Error: ${result.details.error}`)
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runAllTests() {
  console.log('═'.repeat(60))
  console.log('🏋️ MULTI-SPORT PROGRAM GENERATOR TEST SUITE')
  console.log('═'.repeat(60))
  console.log(`Running ${testCases.length} test cases...\n`)

  const results: TestResult[] = []
  const sportGroups = new Map<string, TestResult[]>()

  for (const testCase of testCases) {
    const result = await runTest(testCase)
    results.push(result)
    printResult(result)

    // Group by sport
    const sport = testCase.sport
    if (!sportGroups.has(sport)) {
      sportGroups.set(sport, [])
    }
    sportGroups.get(sport)!.push(result)
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('═'.repeat(60))

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const expectedFail = results.filter(r => r.status === 'EXPECTED_FAIL').length
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`\n✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)
  if (expectedFail > 0) {
    console.log(`⚠️  Expected Failures: ${expectedFail}/${results.length}`)
  }
  console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`)

  // Per-sport breakdown
  console.log('\n📋 Per-Sport Breakdown:')
  sportGroups.forEach((sportResults, sport) => {
    const sportPassed = sportResults.filter(r => r.status === 'PASS').length
    const sportTotal = sportResults.length
    const hasContent = sportResults.some(r => r.details.hasDetailedContent)
    const contentIcon = hasContent ? '📝' : '📄'
    console.log(`   ${sport}: ${sportPassed}/${sportTotal} passed ${contentIcon}`)
  })

  // Check for template content
  console.log('\n📝 Template Content Status:')
  const sportsWithContent: string[] = []
  const sportsWithoutContent: string[] = []

  sportGroups.forEach((sportResults, sport) => {
    const hasContent = sportResults.some(r => r.details.hasDetailedContent)
    if (hasContent) {
      sportsWithContent.push(sport)
    } else {
      sportsWithoutContent.push(sport)
    }
  })

  if (sportsWithContent.length > 0) {
    console.log(`   ✓ With detailed workouts: ${sportsWithContent.join(', ')}`)
  }
  if (sportsWithoutContent.length > 0) {
    console.log(`   ○ Skeleton only: ${sportsWithoutContent.join(', ')}`)
  }

  // Failed tests detail
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.name}: ${r.details.error}`)
    })
  }

  console.log('\n' + '═'.repeat(60))
  console.log('🏁 TEST SUITE COMPLETE')
  console.log('═'.repeat(60))

  // Exit with error code if any failures
  if (failed > 0) {
    process.exit(1)
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
