/**
 * POST /api/coach/agent/oversight/[id]/modify
 *
 * Modify and approve an agent action (coach override)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { executeAction } from '@/lib/agent/execution'
import { logAgentAudit } from '@/lib/agent/gdpr/audit-logger'
import { actionAlreadyMessage, resolveLocale, t, type AppLocale } from '@/lib/agent/api-locale'
import type { Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const coachUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { language: true },
    })
    locale = resolveLocale(coachUser?.language)

    const scope = getRequestedBusinessScope(request)
    const body = await request.json()
    const { notes, adjustedIntensityReduction, adjustedDuration, overrideReason } = body

    // Verify action exists and belongs to coach's athlete
    const action = await prisma.agentAction.findFirst({
      where: {
        id,
        client: {
          userId: user.id,
          ...(scope.businessSlug
            ? { business: { slug: scope.businessSlug, isActive: true } }
            : {}),
        },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })

    if (!action) {
      return NextResponse.json({ error: t(locale, 'Action not found', 'Åtgärden hittades inte') }, { status: 404 })
    }

    if (action.status !== 'PROPOSED') {
      return NextResponse.json(
        { error: actionAlreadyMessage(locale, action.status) },
        { status: 400 }
      )
    }

    // Update action data with coach modifications
    const originalData = action.actionData as Record<string, unknown>
    const modifiedData = { ...originalData }

    if (adjustedIntensityReduction !== undefined) {
      modifiedData.reductionPercent = adjustedIntensityReduction
    }
    if (adjustedDuration !== undefined) {
      modifiedData.newDuration = adjustedDuration
    }

    // Update action with modifications and mark as coach override
    await prisma.agentAction.update({
      where: { id },
      data: {
        actionData: modifiedData as Prisma.InputJsonValue,
        status: 'ACCEPTED',
        decidedAt: new Date(),
        decidedBy: user.id,
        coachOverride: true,
        coachOverrideReason: overrideReason || notes,
        athleteFeedback: notes,
      },
    })

    // Execute the modified action
    const updatedAction = await prisma.agentAction.findUnique({
      where: { id },
    })

    const result = await executeAction(updatedAction!)

    // Log learning event for coach override
    await prisma.agentLearningEvent.create({
      data: {
        clientId: action.clientId,
        actionId: action.id,
        eventType: 'COACH_OVERRIDE',
        agentDecision: {
          actionType: action.actionType,
          originalData: action.actionData as Prisma.InputJsonValue,
          confidence: action.confidence,
        } as Prisma.InputJsonValue,
        actualOutcome: {
          modified: true,
          modifiedData: modifiedData as Prisma.InputJsonValue,
          overrideReason: overrideReason || notes,
        } as Prisma.InputJsonValue,
        contextAtDecision: {
          originalConfidence: action.confidenceScore,
        } as Prisma.InputJsonValue,
      },
    })

    // Log audit
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'AgentAction',
      details: {
        oversight: 'COACH_OVERRIDE',
        actionId: id,
        actionType: action.actionType,
        originalData: action.actionData,
        modifiedData,
        overrideReason: overrideReason || notes,
        executionResult: result,
      },
      actorType: 'COACH',
      actorId: user.id,
    })

    return NextResponse.json({
      success: result.executed,
      result,
    })
  } catch (error) {
    console.error('Error modifying action:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to modify action', 'Kunde inte ändra åtgärden') },
      { status: 500 }
    )
  }
}
