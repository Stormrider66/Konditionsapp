import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

/**
 * POST /api/programs/[id]/request-next
 * Athlete requests next program from their coach after completing a program.
 * Creates an AINotification for the coach to see.
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
            athleteSubscription: {
              select: { assignedCoachId: true },
            },
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Programmet hittades inte' }, { status: 404 })
    }

    const coachId = program.client.athleteSubscription?.assignedCoachId
    if (!coachId) {
      return NextResponse.json({ error: 'Ingen coach kopplad' }, { status: 400 })
    }

    // Create notification for the athlete's client record (coach will see it via alerts)
    await prisma.aINotification.create({
      data: {
        clientId: program.clientId,
        notificationType: 'NEXT_PROGRAM_REQUEST',
        priority: 'HIGH',
        title: 'Nytt program efterfrågas',
        message: `${program.client.name} har slutfört "${program.name}" och vill ha ett nytt träningsprogram.`,
        actionUrl: `/coach/clients/${program.clientId}`,
        actionLabel: 'Visa atlet',
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
      { error: 'Kunde inte skicka förfrågan' },
      { status: 500 }
    )
  }
}
