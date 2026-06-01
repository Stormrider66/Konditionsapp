/**
 * POST /api/coach/agent/oversight/[id]/approve
 *
 * Approve an agent action
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { acceptAction } from '@/lib/agent/execution'
import { logAgentAudit } from '@/lib/agent/gdpr/audit-logger'
import { actionAlreadyMessage, resolveLocale, t, type AppLocale } from '@/lib/agent/api-locale'

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
    const body = await request.json().catch(() => ({}))
    const { notes } = body

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

    // Accept and execute the action
    const result = await acceptAction(id, user.id, notes)

    // Log audit
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'AgentAction',
      details: {
        oversight: 'COACH_APPROVED',
        actionId: id,
        actionType: action.actionType,
        notes,
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
    console.error('Error approving action:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to approve action', 'Kunde inte godkänna åtgärden') },
      { status: 500 }
    )
  }
}
