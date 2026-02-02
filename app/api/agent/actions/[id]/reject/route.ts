/**
 * POST /api/agent/actions/[id]/reject
 *
 * Reject an agent recommendation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logActionTaken } from '@/lib/agent/gdpr/audit-logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    // Get the action
    const action = await prisma.agentAction.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true },
        },
      },
    })

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    // Verify user has access
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'No athlete profile found' },
        { status: 404 }
      )
    }

    if (athleteAccount.clientId !== action.clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if action can be rejected
    if (action.status !== 'PROPOSED') {
      return NextResponse.json(
        { error: `Action cannot be rejected (current status: ${action.status})` },
        { status: 400 }
      )
    }

    // Update the action
    const updated = await prisma.agentAction.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decidedAt: new Date(),
        decidedBy: user.id,
        athleteFeedback: reason || null,
      },
    })

    // Log the action
    await logActionTaken(
      action.clientId,
      id,
      action.actionType,
      { rejected: true, reason },
      false
    )

    // Create learning event
    await prisma.agentLearningEvent.create({
      data: {
        clientId: action.clientId,
        actionId: id,
        eventType: 'ATHLETE_REJECTED',
        agentDecision: {
          actionType: action.actionType,
          actionData: action.actionData,
          confidence: action.confidence,
        },
        actualOutcome: { rejected: true, reason },
        contextAtDecision: action.actionData as object,
      },
    })

    return NextResponse.json({
      success: true,
      action: {
        id: updated.id,
        status: updated.status,
        decidedAt: updated.decidedAt,
      },
    })
  } catch (error) {
    console.error('Error rejecting action:', error)
    return NextResponse.json(
      { error: 'Failed to reject action' },
      { status: 500 }
    )
  }
}
