import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { addDays } from 'date-fns'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const { 
      programId, 
      date, 
      name, 
      type, 
      intensity, 
      segments,
      repeatCount = 1,
      repeatInterval = 7 // days
    } = body

    if (!programId || !date) {
      return NextResponse.json(
        { error: 'Program ID and Date are required' },
        { status: 400 }
      )
    }

    // Verify program belongs to coach (or is accessible)
    const program = await prisma.trainingProgram.findFirst({
      where: { 
        id: programId,
        // coachId: user.id // Optional: restrict to owner
      },
      include: {
        weeks: {
          include: {
            days: true
          }
        }
      }
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const createdWorkouts = []
    let currentDate = new Date(date)

    // Loop for repeats
    for (let i = 0; i < repeatCount; i++) {
      // 1. Find or Create TrainingWeek
      // We need to find which week this date falls into
      // Simplification: We assume the program has weeks generated or we find the best fit
      
      // Calculate week number based on program start
      const programStart = new Date(program.startDate)
      const diffTime = currentDate.getTime() - programStart.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const weekNumber = Math.floor(diffDays / 7) + 1

      if (weekNumber < 1) {
        // Date is before program start
        continue 
      }

      let week = program.weeks.find(w => w.weekNumber === weekNumber)

      if (!week) {
        // If week doesn't exist (e.g. extending program), we might need to create it
        // For now, skip if week not found to avoid complex logic
        // Alternatively, find the closest week or throw error
        // Let's try to create it if it's within reasonable bounds? 
        // Or just error out. Let's error for now if week not found.
        
        // Actually, better to create if possible, but complex.
        // Let's find week by date range if weekNumber logic is fuzzy
        week = program.weeks.find(w => 
          currentDate >= new Date(w.startDate) && 
          currentDate <= new Date(w.endDate)
        )
        
        if (!week) {
           // Try to find by week number again if dates are slightly off
           // Or just skip
           logger.warn(`Week not found for date`, { weekNumber, currentDate: currentDate.toISOString() })
           currentDate = addDays(currentDate, repeatInterval)
           continue
        }
      }

      // 2. Find or Create TrainingDay
      const dayNumber = (currentDate.getDay() + 6) % 7 + 1 // 1=Monday, 7=Sunday
      
      let day = week.days.find(d => d.dayNumber === dayNumber)
      
      if (!day) {
        // Create day if it doesn't exist
        day = await prisma.trainingDay.create({
          data: {
            weekId: week.id,
            dayNumber,
            date: currentDate
          }
        })
      }

      // 3. Create Workout
      // Calculate totals
      const totalDuration = segments.reduce((acc: number, s: any) => acc + (Number(s.duration) || 0), 0)
      const totalDistance = segments.reduce((acc: number, s: any) => acc + (Number(s.distance) || 0), 0)

      const workout = await prisma.workout.create({
        data: {
          dayId: day.id,
          name: name,
          type: type || 'RUNNING',
          intensity: intensity || 'EASY',
          duration: totalDuration,
          distance: totalDistance,
          status: 'PLANNED',
          segments: {
            create: segments.flatMap((s: any, index: number) => {
              const baseSegment = {
                order: index + 1, // This will need adjustment if flatMapping
                type: s.type,
                duration: s.duration ? Number(s.duration) : null,
                distance: s.distance ? Number(s.distance) : null,
                zone: s.zone ? Number(s.zone) : null,
                pace: s.pace,
                heartRate: s.heartRate,
                notes: s.notes,
                exerciseId: s.exerciseId,
                sets: s.sets ? Number(s.sets) : null,
                repsCount: s.reps,
                weight: s.weight,
                rest: s.rest ? Number(s.rest) : null
              }

              // If it's an interval with repeats, we expand it
              if (s.type === 'INTERVAL' && s.repeats && s.repeats > 1) {
                const repeatedSegments = []
                for (let r = 0; r < s.repeats; r++) {
                  // 1. Add the Interval
                  repeatedSegments.push({
                    ...baseSegment,
                    notes: s.notes ? `${s.notes} (${r + 1}/${s.repeats})` : `Intervall ${r + 1}/${s.repeats}`
                  })
                  
                  // 2. Add Rest (RECOVERY) if configured
                  // Add rest after every interval, unless we decide otherwise for the last one
                  // But usually "10x400m with 1min rest" means rest after each.
                  if (s.restDuration && s.restDuration > 0) {
                      repeatedSegments.push({
                          type: 'RECOVERY',
                          duration: Number(s.restDuration),
                          zone: 1, // Usually Zone 1 for recovery
                          notes: 'Vila',
                          order: 0, // Will be re-indexed
                          exerciseId: null,
                          sets: null,
                          repsCount: null,
                          weight: null,
                          rest: null
                      })
                  }
                }
                return repeatedSegments
              }
              
              return [baseSegment]
            }).map((s: any, i: number) => ({ ...s, order: i + 1 })) // Re-index order after expansion
          }
        }
      })
      
      createdWorkouts.push(workout)
      
      // Advance date for next iteration
      currentDate = addDays(currentDate, repeatInterval)
    }

    return NextResponse.json({ 
      success: true, 
      count: createdWorkouts.length,
      workouts: createdWorkouts 
    })

  } catch (error) {
    return handleApiError(error)
  }
}


