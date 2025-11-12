// scripts/test-e2e-program-generation.ts
// Comprehensive end-to-end test for program generation
// Creates real data in database, generates program, verifies structure
// Run with: npx ts-node scripts/test-e2e-program-generation.ts

import { PrismaClient } from '@prisma/client'
import { generateBaseProgram, ProgramGenerationParams } from '@/lib/program-generator'
import { performAllCalculations } from '@/lib/calculations'

const prisma = new PrismaClient()

async function main() {
  console.log('=� Starting Program Generation End-to-End Test\n')
  console.log('This test will:')
  console.log('  1. Create test user (coach)')
  console.log('  2. Create test client (athlete)')
  console.log('  3. Create running test with 7 stages')
  console.log('  4. Calculate training zones')
  console.log('  5. Generate 16-week marathon program')
  console.log('  6. Save to database')
  console.log('  7. Verify program structure\n')
  console.log('='.repeat(70) + '\n')

  // ==================== Step 1: Create Test Coach ====================
  console.log('=� Step 1: Creating test coach user...')

  const testEmail = `test-coach-${Date.now()}@example.com`

  const coach = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'Test Coach E2E',
      role: 'COACH',
      language: 'sv',
    },
  })
  console.log(`    Coach created: ${coach.name} (${coach.email})`)

  // Create subscription
  await prisma.subscription.create({
    data: {
      userId: coach.id,
      tier: 'PRO',
      status: 'ACTIVE',
      maxAthletes: 50,
      currentAthletes: 0,
    },
  })
  console.log(`    Subscription created (PRO tier)\n`)

  // ==================== Step 2: Create Test Client ====================
  console.log('=� Step 2: Creating test client (athlete)...')

  const client = await prisma.client.create({
    data: {
      userId: coach.id,
      name: 'Emma Johansson',
      email: 'emma.johansson@example.com',
      gender: 'FEMALE',
      birthDate: new Date('1992-06-20'),
      height: 168,
      weight: 62,
      notes: 'Experienced runner, targeting Stockholm Marathon',
    },
  })
  console.log(`    Client created: ${client.name}\n`)

  // ==================== Step 3: Create Running Test ====================
  console.log('=� Step 3: Creating running test with 7 stages...')

  const test = await prisma.test.create({
    data: {
      clientId: client.id,
      userId: coach.id,
      testDate: new Date(),
      testType: 'RUNNING',
      status: 'COMPLETED',
      location: 'Skellefte� Performance Lab',
      testLeader: coach.name,
      testStages: {
        create: [
          {
            sequence: 1,
            duration: 5,
            speed: 7.5,
            incline: 0,
            heartRate: 115,
            lactate: 1.1,
            vo2: 26.3,
          },
          {
            sequence: 2,
            duration: 5,
            speed: 9.5,
            incline: 0,
            heartRate: 135,
            lactate: 1.7,
            vo2: 33.8,
          },
          {
            sequence: 3,
            duration: 5,
            speed: 11.0,
            incline: 0,
            heartRate: 150,
            lactate: 2.2, // Aerobic threshold
            vo2: 40.5,
          },
          {
            sequence: 4,
            duration: 5,
            speed: 12.5,
            incline: 0,
            heartRate: 160,
            lactate: 3.0,
            vo2: 46.2,
          },
          {
            sequence: 5,
            duration: 5,
            speed: 13.8,
            incline: 0,
            heartRate: 170,
            lactate: 4.3, // Anaerobic threshold
            vo2: 51.8,
          },
          {
            sequence: 6,
            duration: 5,
            speed: 15.0,
            incline: 0,
            heartRate: 180,
            lactate: 6.5,
            vo2: 55.9,
          },
          {
            sequence: 7,
            duration: 3,
            speed: 16.2,
            incline: 0,
            heartRate: 188,
            lactate: 9.2,
            vo2: 59.1, // VO2max
          },
        ],
      },
    },
    include: {
      testStages: {
        orderBy: { sequence: 'asc' },
      },
    },
  })

  console.log(`    Test created with ${test.testStages.length} stages`)
  console.log(`      Location: ${test.location}`)
  console.log(`      Test Type: ${test.testType}\n`)

  // ==================== Step 4: Calculate Training Zones ====================
  console.log('=� Step 4: Calculating training zones from test data...')

  const calculations = await performAllCalculations(test as any, client as any)

  console.log(`   =� Test Results:`)
  console.log(`      Max HR: ${calculations.maxHR} bpm`)
  console.log(`      VO2max: ${calculations.vo2max.toFixed(1)} ml/kg/min`)
  console.log(`      Max Lactate: ${calculations.maxLactate.toFixed(1)} mmol/L`)

  if (calculations.aerobicThreshold) {
    console.log(`      Aerobic Threshold: ${calculations.aerobicThreshold.value.toFixed(1)} km/h @ ${calculations.aerobicThreshold.heartRate} bpm (${calculations.aerobicThreshold.lactate?.toFixed(1)} mmol/L)`)
  }

  if (calculations.anaerobicThreshold) {
    console.log(`      Anaerobic Threshold: ${calculations.anaerobicThreshold.value.toFixed(1)} km/h @ ${calculations.anaerobicThreshold.heartRate} bpm (${calculations.anaerobicThreshold.lactate?.toFixed(1)} mmol/L)`)
  }

  console.log(`      Training Zones: ${calculations.trainingZones.length} zones`)

  // Save calculations to test
  await prisma.test.update({
    where: { id: test.id },
    data: {
      maxHR: calculations.maxHR,
      vo2max: calculations.vo2max,
      maxLactate: calculations.maxLactate,
      aerobicThreshold: calculations.aerobicThreshold as any,
      anaerobicThreshold: calculations.anaerobicThreshold as any,
      trainingZones: calculations.trainingZones as any,
    },
  })

  console.log(`    Training zones saved to test\n`)

  // ==================== Step 5: Generate Program ====================
  console.log('=� Step 5: Generating 16-week marathon program...')

  const programParams: ProgramGenerationParams = {
    testId: test.id,
    clientId: client.id,
    coachId: coach.id,
    goalType: 'marathon',
    targetRaceDate: new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000), // 16 weeks from now
    durationWeeks: 16,
    trainingDaysPerWeek: 5,
    experienceLevel: 'intermediate',
    currentWeeklyVolume: 42, // km/week
    notes: 'Stockholm Marathon preparation - Target: Sub 3:45',
  }

  // Reload test with zones
  const testWithZones = await prisma.test.findUnique({
    where: { id: test.id },
    include: {
      testStages: {
        orderBy: { sequence: 'asc' },
      },
    },
  })

  const programData = await generateBaseProgram(
    testWithZones as any,
    client as any,
    programParams
  )

  console.log(`   =� Program Details:`)
  console.log(`      Name: "${programData.name}"`)
  console.log(`      Goal: ${programData.goalType}`)
  console.log(`      Duration: ${programData.weeks?.length || 0} weeks`)
  console.log(`      Start: ${programData.startDate.toLocaleDateString('sv-SE')}`)
  console.log(`      End: ${programData.endDate.toLocaleDateString('sv-SE')}`)
  console.log(`      Training days/week: ${programParams.trainingDaysPerWeek}\n`)

  if (!programData.weeks || programData.weeks.length === 0) {
    throw new Error('No weeks generated in program!')
  }

  // ==================== Step 6: Save to Database ====================
  console.log('=� Step 6: Saving program to database...')

  const savedProgram = await prisma.trainingProgram.create({
    data: {
      clientId: programData.clientId,
      coachId: programData.coachId,
      testId: programData.testId,
      name: programData.name,
      goalType: programData.goalType,
      startDate: programData.startDate,
      endDate: programData.endDate,
      description: programData.notes || null,
      generatedFromTest: true,
      weeks: {
        create: programData.weeks.map((week) => ({
          weekNumber: week.weekNumber,
          startDate: new Date(
            programData.startDate.getTime() + (week.weekNumber - 1) * 7 * 24 * 60 * 60 * 1000
          ),
          endDate: new Date(
            programData.startDate.getTime() + week.weekNumber * 7 * 24 * 60 * 60 * 1000
          ),
          phase: week.phase,
          weeklyVolume: week.volume,
          focus: week.focus,
          days: {
            create: week.days.map((day) => ({
              dayNumber: day.dayNumber,
              date: new Date(
                programData.startDate.getTime() +
                  (week.weekNumber - 1) * 7 * 24 * 60 * 60 * 1000 +
                  (day.dayNumber - 1) * 24 * 60 * 60 * 1000
              ),
              notes: day.notes,
              workouts: {
                create: day.workouts.map((workout, index) => ({
                  type: workout.type,
                  name: workout.name,
                  order: index + 1,
                  intensity: workout.intensity,
                  duration: workout.duration,
                  distance: workout.distance,
                  instructions: workout.instructions,
                  segments: {
                    create:
                      workout.segments?.map((segment) => ({
                        order: segment.order,
                        type: segment.type,
                        duration: segment.duration,
                        distance: segment.distance,
                        zone: segment.zone,
                        pace: segment.pace,
                        power: segment.power,
                        heartRate: segment.heartRate,
                        reps: segment.reps,
                        sets: segment.sets,
                        repsCount: segment.repsCount,
                        rest: segment.rest,
                        tempo: segment.tempo,
                        weight: segment.weight,
                        exerciseId: segment.exerciseId,
                        description: segment.description,
                        notes: segment.notes,
                      })) || [],
                  },
                })),
              },
            })),
          },
        })),
      },
    },
    include: {
      weeks: {
        include: {
          days: {
            include: {
              workouts: {
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

  console.log(`    Program saved (ID: ${savedProgram.id})\n`)

  // ==================== Step 7: Verify Structure ====================
  console.log('=� Step 7: Verifying program structure...')

  let totalWorkouts = 0
  let totalSegments = 0
  const phaseBreakdown: Record<string, number> = {}
  const workoutTypeBreakdown: Record<string, number> = {}

  for (const week of savedProgram.weeks) {
    phaseBreakdown[week.phase] = (phaseBreakdown[week.phase] || 0) + 1

    for (const day of week.days) {
      for (const workout of day.workouts) {
        totalWorkouts++
        workoutTypeBreakdown[workout.type] = (workoutTypeBreakdown[workout.type] || 0) + 1
        totalSegments += workout.segments.length
      }
    }
  }

  console.log(`    ${savedProgram.weeks.length} weeks created`)
  console.log(`    ${totalWorkouts} total workouts created`)
  console.log(`    ${totalSegments} workout segments created`)
  console.log(`\n   =� Phase Distribution:`)
  Object.entries(phaseBreakdown).forEach(([phase, count]) => {
    const percentage = ((count / savedProgram.weeks.length) * 100).toFixed(0)
    console.log(`      ${phase.padEnd(12)}: ${count.toString().padStart(2)} weeks (${percentage}%)`)
  })

  console.log(`\n   <� Workout Type Distribution:`)
  Object.entries(workoutTypeBreakdown).forEach(([type, count]) => {
    const percentage = ((count / totalWorkouts) * 100).toFixed(0)
    console.log(`      ${type.padEnd(12)}: ${count.toString().padStart(3)} workouts (${percentage}%)`)
  })

  // ==================== Sample Week Details ====================
  console.log('\n=� Step 8: Sample week breakdown...')

  const week1 = savedProgram.weeks.find((w) => w.weekNumber === 1)
  const week8 = savedProgram.weeks.find((w) => w.weekNumber === 8)
  const week16 = savedProgram.weeks.find((w) => w.weekNumber === 16)

  if (week1) {
    console.log(`\n   =�  Week 1 (${week1.phase} Phase):`)
    console.log(`      Focus: ${week1.focus}`)
    console.log(`      Volume: ${week1.weeklyVolume?.toFixed(0)}% of peak`)
    const daysWithWorkouts = week1.days.filter((d) => d.workouts.length > 0).length
    console.log(`      Active days: ${daysWithWorkouts}/7`)

    console.log(`      Workouts:`)
    week1.days.forEach((day) => {
      if (day.workouts.length > 0) {
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        day.workouts.forEach((workout) => {
          const duration = workout.duration ? `${workout.duration}min` : ''
          const distance = workout.distance ? `${workout.distance.toFixed(1)}km` : ''
          console.log(`         ${dayNames[day.dayNumber - 1]}: ${workout.name} (${workout.intensity}) ${distance} ${duration}`)
        })
      }
    })
  }

  if (week8) {
    console.log(`\n   =�  Week 8 (${week8.phase} Phase):`)
    console.log(`      Focus: ${week8.focus}`)
    console.log(`      Volume: ${week8.weeklyVolume?.toFixed(0)}% of peak`)
  }

  if (week16) {
    console.log(`\n   =�  Week 16 (${week16.phase} Phase):`)
    console.log(`      Focus: ${week16.focus}`)
    console.log(`      Volume: ${week16.weeklyVolume?.toFixed(0)}% of peak (taper)`)
  }

  // ==================== Success Summary ====================
  console.log('\n' + '='.repeat(70))
  console.log(' END-TO-END TEST COMPLETED SUCCESSFULLY!')
  console.log('='.repeat(70))

  console.log(`
=� Test Summary:
   " Coach: ${coach.name} (${coach.email})
   " Client: ${client.name} (${client.gender}, ${new Date().getFullYear() - client.birthDate.getFullYear()} years)
   " Test: ${test.testType} with ${test.testStages.length} stages
   " VO2max: ${calculations.vo2max.toFixed(1)} ml/kg/min
   " Program: ${savedProgram.name}
   " Duration: ${savedProgram.weeks.length} weeks
   " Total Workouts: ${totalWorkouts}
   " Total Segments: ${totalSegments}

= Database IDs (for reference):
   " Coach ID: ${coach.id}
   " Client ID: ${client.id}
   " Test ID: ${test.id}
   " Program ID: ${savedProgram.id}

( All systems operational! The complete flow is working:
    User & Client Management
    Test Creation & Calculation
    Training Zone Generation
    Program Generation Algorithm
    Database Persistence
    Nested Data Structure (Program � Weeks � Days � Workouts � Segments)

=� Next Steps:
   1. View in Prisma Studio: npx prisma studio
   2. Navigate to TrainingProgram table
   3. Find Program ID: ${savedProgram.id}
   4. Explore the complete nested structure

>� Cleanup:
   To remove test data, delete the coach user and cascade will handle the rest.
   Coach email: ${coach.email}
`)
}

main()
  .then(() => {
    console.log(' Test completed successfully\n')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\nL TEST FAILED:', e.message)
    console.error(e.stack)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
