/**
 * POST /api/coach/agent/oversight/[id]/reject
 *
 * Reject an agent action
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { rejectAction } from '@/lib/agent/execution'
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
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: t(locale, 'Rejection reason is required', 'Avvisningsorsak krävs') },
        { status: 400 }
      )
    }

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

    // Reject the action
    await rejectAction(id, user.id, reason)

    // Log audit
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'AgentAction',
      details: {
        oversight: 'COACH_REJECTED',
        actionId: id,
        actionType: action.actionType,
        reason,
      },
      actorType: 'COACH',
      actorId: user.id,
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error rejecting action:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to reject action', 'Kunde inte avvisa åtgärden') },
      { status: 500 }
    )
  }
}
