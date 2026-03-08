// app/api/workouts/[id]/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { canAccessWorkout, getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * POST /api/workouts/[id]/logs
 * Create a new workout log
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig',
        },
        { status: 401 }
      )
    }
    const { user, clientId } = resolved

    const { id } = await params

    const hasAccess = await canAccessWorkout(user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig åtkomst till detta träningspass',
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Fetch workout with program context for completion detection
    const workoutWithProgram = await prisma.workout.findUnique({
      where: { id },
      include: {
        day: {
          include: {
            week: {
              include: {
                program: {
                  select: {
                    id: true,
                    name: true,
                    clientId: true,
                    weeks: {
                      select: {
                        days: {
                          select: {
                            workouts: {
                              select: {
                                id: true,
                                logs: {
                                  where: { athleteId: user.id, completed: true },
                                  select: { id: true },
                                  take: 1,
                                },
                              },
                            },
                          },
                        },
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

    if (!workoutWithProgram) {
      return NextResponse.json(
        {
          success: false,
          error: 'Träningspass hittades inte',
        },
        { status: 404 }
      )
    }

    // Create workout log
    const log = await prisma.workoutLog.create({
      data: {
        workoutId: id,
        athleteId: user.id,
        completed: body.completed ?? true,
        completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
        // Time and distance
        duration: body.duration,
        distance: body.distance,
        avgPace: body.avgPace,
        // Heart rate
        avgHR: body.avgHR,
        maxHR: body.maxHR,
        // Cycling-specific power data
        avgPower: body.avgPower,
        normalizedPower: body.normalizedPower,
        maxPower: body.maxPower,
        avgCadence: body.avgCadence,
        elevation: body.elevation,
        tss: body.tss,
        // Subjective feedback
        perceivedEffort: body.perceivedEffort,
        difficulty: body.difficulty,
        feeling: body.feeling,
        notes: body.notes,
        // External links
        dataFileUrl: body.dataFileUrl,
        stravaUrl: body.stravaUrl,
        // Per-interval results
        intervalResults: body.intervalResults || undefined,
      },
    })

    // Create RaceResult if race data was submitted
    let raceResultId: string | undefined
    if (body.raceResult && body.raceResult.timeMinutes) {
      try {
        const rr = body.raceResult
        const raceResult = await prisma.raceResult.create({
          data: {
            clientId,
            raceName: workoutWithProgram?.day?.week?.program?.name || undefined,
            raceDate: new Date(),
            distance: rr.distance || 'CUSTOM',
            timeMinutes: rr.timeMinutes,
            timeFormatted: rr.finishTime,
            goalTime: rr.goalTime || undefined,
            goalAchieved: rr.goalAssessment === 'EXCEEDED' || rr.goalAssessment === 'MET',
            raceType: 'A_RACE',
            avgHeartRate: rr.avgHR || undefined,
            maxHeartRate: rr.maxHR || undefined,
            trainingProgramId: rr.programId || undefined,
          },
        })
        raceResultId = raceResult.id
      } catch (raceError) {
        logger.error('Error creating race result', {}, raceError)
        // Don't fail the whole request if race result creation fails
      }
    }

    // Detect program completion
    let isProgramCompletion = false
    if (workoutWithProgram?.day?.week?.program && (body.completed ?? true)) {
      const program = workoutWithProgram.day.week.program
      const allWorkouts = program.weeks.flatMap((w: any) =>
        w.days.flatMap((d: any) => d.workouts)
      )
      const completedBefore = allWorkouts.filter(
        (w: any) => w.id !== id && w.logs.length > 0
      ).length

      // This was the last unlogged workout
      if (completedBefore === allWorkouts.length - 1) {
        isProgramCompletion = true

        // Create coach notification for program completion
        try {
          await prisma.aINotification.create({
            data: {
              clientId: program.clientId,
              notificationType: 'PROGRAM_COMPLETION',
              priority: 'HIGH',
              title: `Program slutfört: ${program.name}`,
              message: `Atleten har genomfört alla ${allWorkouts.length} träningspass i programmet.${raceResultId ? ' Ett tävlingsresultat har registrerats.' : ''}`,
              icon: 'trophy',
              contextData: {
                programId: program.id,
                programName: program.name,
                totalWorkouts: allWorkouts.length,
                raceResultId,
              },
              triggeredBy: `PROGRAM_COMPLETION:${program.id}`,
              triggerReason: 'Athlete completed all workouts in program',
              scheduledFor: new Date(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
          })
        } catch (notifError) {
          logger.error('Error creating completion notification', {}, notifError)
        }
      }
    }

    // Create TrainingLoad entry when workout is completed
    // This ensures traditional workouts contribute to weekly load ("Veckobelastning")
    if ((body.completed ?? true) && body.duration) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Use provided TSS if available, otherwise estimate from duration and RPE
      const rpeValue = body.perceivedEffort || 6
      const durationMinutes = body.duration // Already in minutes for WorkoutLog
      const estimatedTSS = body.tss || Math.round(durationMinutes * (rpeValue / 10) * 0.9)

      // Map workout type to training load workout type
      const workoutTypeMap: Record<string, string> = {
        STRENGTH: 'STRENGTH',
        CARDIO: 'CARDIO',
        RUNNING: 'CARDIO',
        CYCLING: 'CARDIO',
        SWIMMING: 'CARDIO',
        SKIING: 'CARDIO',
        FLEXIBILITY: 'RECOVERY',
        RECOVERY: 'RECOVERY',
      }
      const loadWorkoutType = workoutTypeMap[workoutWithProgram.type] || 'GENERAL'

      // Map RPE to intensity label
      let intensity = 'MODERATE'
      if (rpeValue <= 3) intensity = 'EASY'
      else if (rpeValue <= 5) intensity = 'MODERATE'
      else if (rpeValue <= 7) intensity = 'HARD'
      else intensity = 'VERY_HARD'

      // Check if there's already a TrainingLoad entry for today with this workout type
      const existingLoad = await prisma.trainingLoad.findFirst({
        where: {
          clientId,
          date: today,
          workoutType: loadWorkoutType,
        },
      })

      if (existingLoad) {
        // Update existing entry (add load from this workout)
        await prisma.trainingLoad.update({
          where: { id: existingLoad.id },
          data: {
            dailyLoad: existingLoad.dailyLoad + estimatedTSS,
            duration: existingLoad.duration + durationMinutes,
            distance: body.distance
              ? (existingLoad.distance || 0) + body.distance
              : existingLoad.distance,
          },
        })
      } else {
        // Convert pace string (e.g., "5:30") to seconds per km for TrainingLoad
        let avgPaceSeconds: number | undefined = undefined
        if (body.avgPace && typeof body.avgPace === 'string') {
          const paceParts = body.avgPace.replace(/\/km$/, '').split(':')
          if (paceParts.length === 2) {
            const minutes = parseInt(paceParts[0], 10)
            const seconds = parseInt(paceParts[1], 10)
            if (!isNaN(minutes) && !isNaN(seconds)) {
              avgPaceSeconds = minutes * 60 + seconds
            }
          }
        }

        // Create new entry for today's training
        await prisma.trainingLoad.create({
          data: {
            clientId,
            date: today,
            dailyLoad: estimatedTSS,
            loadType: body.tss ? 'TSS' : 'RPE_BASED',
            duration: durationMinutes,
            distance: body.distance,
            avgHR: body.avgHR,
            maxHR: body.maxHR,
            avgPace: avgPaceSeconds,
            intensity,
            workoutType: loadWorkoutType,
            workoutId: id,
          },
        })
      }
    }

    // Revalidate athlete dashboard to show updated training load
    revalidatePath('/athlete/dashboard')

    return NextResponse.json(
      {
        success: true,
        data: log,
        message: 'Träningslogg sparad',
        isProgramCompletion,
        raceResultId,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating workout log', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att spara träningslogg',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workouts/[id]/logs
 * Get all logs for a workout
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig',
        },
        { status: 401 }
      )
    }

    const { id } = await params

    const hasAccess = await canAccessWorkout(user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig åtkomst till detta träningspass',
        },
        { status: 403 }
      )
    }

    const logs = await prisma.workoutLog.findMany({
      where: {
        workoutId: id,
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    logger.error('Error fetching workout logs', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att hämta träningsloggar',
      },
      { status: 500 }
    )
  }
}
