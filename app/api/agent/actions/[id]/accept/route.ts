/**
 * POST /api/agent/actions/[id]/accept
 *
 * Accept an agent recommendation
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
    const { feedback } = body

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

    // Verify user has access to this action
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

    // Check if action can be accepted
    if (action.status !== 'PROPOSED') {
      return NextResponse.json(
        { error: `Action cannot be accepted (current status: ${action.status})` },
        { status: 400 }
      )
    }

    // Update the action
    const updated = await prisma.agentAction.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        decidedAt: new Date(),
        decidedBy: user.id,
        athleteFeedback: feedback || null,
      },
    })

    // Log the action
    await logActionTaken(
      action.clientId,
      id,
      action.actionType,
      { accepted: true, feedback },
      false
    )

    // Create learning event for future improvement
    await prisma.agentLearningEvent.create({
      data: {
        clientId: action.clientId,
        actionId: id,
        eventType: 'ATHLETE_ACCEPTED',
        agentDecision: {
          actionType: action.actionType,
          actionData: action.actionData,
          confidence: action.confidence,
        },
        actualOutcome: { accepted: true, feedback },
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
    console.error('Error accepting action:', error)
    return NextResponse.json(
      { error: 'Failed to accept action' },
      { status: 500 }
    )
  }
}
