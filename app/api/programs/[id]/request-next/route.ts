import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * POST /api/programs/[id]/request-next
 * Athlete requests next program from their coach after completing a program.
 * Creates an AINotification for the coach to see.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params

    // Verify athlete owns this program
    const program = await prisma.trainingProgram.findFirst({
      where: {
        id,
        client: { userId: user.id },
      },
      select: {
        id: true,
        name: true,
        clientId: true,
        client: {
          select: {
            name: true,
            business: {
              select: { slug: true },
            },
            athleteSubscription: {
              select: { assignedCoachId: true },
            },
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json(
        { error: t(locale, 'Program not found', 'Programmet hittades inte') },
        { status: 404 }
      )
    }

    const coachId = program.client.athleteSubscription?.assignedCoachId
    if (!coachId) {
      return NextResponse.json(
        { error: t(locale, 'No coach connected', 'Ingen coach kopplad') },
        { status: 400 }
      )
    }

    const coach = await prisma.user.findUnique({
      where: { id: coachId },
      select: { language: true },
    })
    const coachLocale: AppLocale = coach?.language === 'sv' ? 'sv' : 'en'

    const businessSlug =
      program.client.business?.slug ?? (await getUserPrimaryBusinessSlug(coachId))
    const actionUrl = businessSlug
      ? `/${businessSlug}/coach/clients/${program.clientId}`
      : '/'

    // Create notification for the athlete's client record (coach will see it via alerts)
    await prisma.aINotification.create({
      data: {
        clientId: program.clientId,
        notificationType: 'NEXT_PROGRAM_REQUEST',
        priority: 'HIGH',
        title: t(coachLocale, 'New program requested', 'Nytt program efterfrågas'),
        message: t(
          coachLocale,
          `${program.client.name} has completed "${program.name}" and wants a new training program.`,
          `${program.client.name} har slutfört "${program.name}" och vill ha ett nytt träningsprogram.`
        ),
        actionUrl,
        actionLabel: t(coachLocale, 'View athlete', 'Visa atlet'),
        triggeredBy: 'event',
        triggerReason: 'program_completed',
        contextData: {
          completedProgramId: program.id,
          completedProgramName: program.name,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error requesting next program:', error)
    return NextResponse.json(
      { error: t(locale, 'Could not send request', 'Kunde inte skicka förfrågan') },
      { status: 500 }
    )
  }
}
