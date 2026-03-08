// app/api/programs/[id]/completion/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * POST /api/programs/[id]/completion
 * Returns program summary + AI congratulation message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Obehörig' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))

    // Fetch program with workout stats
    const program = await prisma.trainingProgram.findFirst({
      where: {
        id,
        client: {
          userId: user.id,
        },
      },
      include: {
        weeks: {
          include: {
            days: {
              include: {
                workouts: {
                  include: {
                    logs: {
                      where: { completed: true },
                      select: {
                        id: true,
                        duration: true,
                        distance: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { weekNumber: 'asc' },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program hittades inte' }, { status: 404 })
    }

    // Calculate stats
    const allWorkouts = program.weeks.flatMap((w) =>
      w.days.flatMap((d) => d.workouts)
    )
    const completedLogs = allWorkouts.flatMap((w) => w.logs)
    const totalWorkouts = allWorkouts.length
    const completedWorkouts = allWorkouts.filter((w) => w.logs.length > 0).length
    const totalWeeks = program.weeks.length
    const totalDuration = completedLogs.reduce((sum, log) => sum + (log.duration || 0), 0)
    const totalDistance = completedLogs.reduce((sum, log) => sum + (log.distance || 0), 0)

    // Build AI message
    const raceResult = body.raceResult
    let message = ''

    if (raceResult?.finishTime) {
      const goalPart = raceResult.goalTime
        ? raceResult.goalAssessment === 'EXCEEDED' || raceResult.goalAssessment === 'MET'
          ? `Du satte ett mål på ${raceResult.goalTime} och du slog det med en tid på ${raceResult.finishTime}! Det är resultatet av ditt hårda arbete.`
          : `Du siktade på ${raceResult.goalTime} och slutade på ${raceResult.finishTime}. Oavsett tid så har du genomfört hela resan — det är en prestation i sig.`
        : `Du slutade på ${raceResult.finishTime} — en fantastisk prestation!`

      message = `Fantastiskt jobbat! Du har genomfört ${program.name} — ${totalWeeks} veckor av målmedveten träning med ${completedWorkouts} av ${totalWorkouts} pass. ${goalPart}\n\nUnder programmets gång har du tränat totalt ${Math.round(totalDuration)} minuter${totalDistance > 0 ? ` och ${totalDistance.toFixed(1)} km` : ''}. Varje pass har byggt grunden för det du just uppnådde. Vila, återhämta dig och var stolt — du förtjänar det!`
    } else {
      message = `Fantastiskt jobbat! Du har genomfört hela ${program.name} — ${totalWeeks} veckor och ${completedWorkouts} av ${totalWorkouts} träningspass.\n\nUnder programmets gång har du lagt ner totalt ${Math.round(totalDuration)} minuter av träning${totalDistance > 0 ? ` och tillryggalagt ${totalDistance.toFixed(1)} km` : ''}. Den disciplinen och uthålligheten du har visat är imponerande. Vila nu och var stolt över din resa!`
    }

    return NextResponse.json({
      success: true,
      message,
      stats: {
        totalWeeks,
        totalWorkouts,
        completedWorkouts,
        totalDuration: Math.round(totalDuration),
        totalDistance: Math.round(totalDistance * 10) / 10,
        completionRate: Math.round((completedWorkouts / totalWorkouts) * 100),
      },
    })
  } catch (error) {
    logger.error('Error fetching program completion', {}, error)
    return NextResponse.json(
      { error: 'Misslyckades med att hämta programdata' },
      { status: 500 }
    )
  }
}
