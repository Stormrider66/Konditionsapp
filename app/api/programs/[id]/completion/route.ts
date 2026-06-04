// app/api/programs/[id]/completion/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * POST /api/programs/[id]/completion
 * Returns program summary + AI congratulation message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

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
      return NextResponse.json(
        { error: t(locale, 'Program not found', 'Program hittades inte') },
        { status: 404 }
      )
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
          ? t(
              locale,
              `You set a goal of ${raceResult.goalTime} and beat it with a finish time of ${raceResult.finishTime}. That is the result of your hard work.`,
              `Du satte ett mål på ${raceResult.goalTime} och du slog det med en tid på ${raceResult.finishTime}! Det är resultatet av ditt hårda arbete.`
            )
          : t(
              locale,
              `You aimed for ${raceResult.goalTime} and finished in ${raceResult.finishTime}. Whatever the time, you completed the whole journey, and that is an achievement in itself.`,
              `Du siktade på ${raceResult.goalTime} och slutade på ${raceResult.finishTime}. Oavsett tid så har du genomfört hela resan — det är en prestation i sig.`
            )
        : t(
            locale,
            `You finished in ${raceResult.finishTime}, an excellent achievement.`,
            `Du slutade på ${raceResult.finishTime} — en fantastisk prestation!`
          )

      message = t(
        locale,
        `Great work. You completed ${program.name}: ${totalWeeks} weeks of focused training with ${completedWorkouts} of ${totalWorkouts} sessions completed. ${goalPart}\n\nDuring the program you trained for ${Math.round(totalDuration)} minutes in total${totalDistance > 0 ? ` and covered ${totalDistance.toFixed(1)} km` : ''}. Every session helped build the foundation for what you just achieved. Rest, recover, and be proud. You earned it.`,
        `Fantastiskt jobbat! Du har genomfört ${program.name} — ${totalWeeks} veckor av målmedveten träning med ${completedWorkouts} av ${totalWorkouts} pass. ${goalPart}\n\nUnder programmets gång har du tränat totalt ${Math.round(totalDuration)} minuter${totalDistance > 0 ? ` och ${totalDistance.toFixed(1)} km` : ''}. Varje pass har byggt grunden för det du just uppnådde. Vila, återhämta dig och var stolt — du förtjänar det!`
      )
    } else {
      message = t(
        locale,
        `Great work. You completed all of ${program.name}: ${totalWeeks} weeks and ${completedWorkouts} of ${totalWorkouts} training sessions.\n\nDuring the program you put in ${Math.round(totalDuration)} minutes of training${totalDistance > 0 ? ` and covered ${totalDistance.toFixed(1)} km` : ''}. The discipline and consistency you showed are impressive. Rest now and be proud of the journey.`,
        `Fantastiskt jobbat! Du har genomfört hela ${program.name} — ${totalWeeks} veckor och ${completedWorkouts} av ${totalWorkouts} träningspass.\n\nUnder programmets gång har du lagt ner totalt ${Math.round(totalDuration)} minuter av träning${totalDistance > 0 ? ` och tillryggalagt ${totalDistance.toFixed(1)} km` : ''}. Den disciplinen och uthålligheten du har visat är imponerande. Vila nu och var stolt över din resa!`
      )
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
      { error: t(locale, 'Failed to fetch program data', 'Misslyckades med att hämta programdata') },
      { status: 500 }
    )
  }
}
