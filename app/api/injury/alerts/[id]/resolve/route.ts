/**
 * Resolve Injury Alert API
 *
 * PUT /api/injury/alerts/[id]/resolve
 *
 * Marks an injury assessment as resolved or transitions to monitoring status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only coaches can resolve injury alerts
    if (dbUser.role !== 'COACH') {
      return NextResponse.json(
        { error: 'Access denied. Coach role required.' },
        { status: 403 }
      )
    }

    const { id } = params

    // Verify injury assessment exists and belongs to this coach's athlete
    const injury = await prisma.injuryAssessment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!injury) {
      return NextResponse.json({ error: 'Injury assessment not found' }, { status: 404 })
    }

    if (injury.client.userId !== dbUser.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse request body for resolution details
    const body = await request.json().catch(() => ({}))
    const { status = 'RESOLVED', notes } = body

    // Valid status transitions: ACTIVE → MONITORING → RESOLVED
    const validStatuses = ['MONITORING', 'RESOLVED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be MONITORING or RESOLVED.' },
        { status: 400 }
      )
    }

    // Update injury assessment
    const updatedInjury = await prisma.injuryAssessment.update({
      where: { id },
      data: {
        status,
        resolved: status === 'RESOLVED',
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
        coachNotes: notes || null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      injury: updatedInjury,
      message: `Injury assessment marked as ${status.toLowerCase()}`,
    })
  } catch (error) {
    console.error('Error resolving injury alert:', error)
    return NextResponse.json(
      {
        error: 'Failed to resolve injury alert',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
