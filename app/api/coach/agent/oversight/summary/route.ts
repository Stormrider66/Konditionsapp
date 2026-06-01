/**
 * GET /api/coach/agent/oversight/summary
 *
 * Get summary of pending agent actions for dashboard widget
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { resolveLocale, t, type AppLocale } from '@/lib/agent/api-locale'
import type { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const scope = getRequestedBusinessScope(request)
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

    const clientWhere: Prisma.ClientWhereInput = {
      userId: user.id,
      ...(scope.businessSlug
        ? { business: { slug: scope.businessSlug, isActive: true } }
        : {}),
    }

    // Get counts
    const [proposed, accepted, rejected, autoApplied] = await Promise.all([
      prisma.agentAction.count({
        where: {
          client: clientWhere,
          status: 'PROPOSED',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      prisma.agentAction.count({
        where: { client: clientWhere, status: 'ACCEPTED' },
      }),
      prisma.agentAction.count({
        where: { client: clientWhere, status: 'REJECTED' },
      }),
      prisma.agentAction.count({
        where: { client: clientWhere, status: 'AUTO_APPLIED' },
      }),
    ])

    // Get recent pending actions
    const recentActions = await prisma.agentAction.findMany({
      where: {
        client: clientWhere,
        status: 'PROPOSED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ priority: 'asc' }, { proposedAt: 'desc' }],
      take: 5,
      include: {
        client: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({
      counts: {
        proposed,
        accepted,
        rejected,
        autoApplied,
      },
      recentActions: recentActions.map((a) => ({
        id: a.id,
        actionType: a.actionType,
        clientName: a.client.name,
        priority: a.priority,
      })),
    })
  } catch (error) {
    console.error('Error getting oversight summary:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to get summary', 'Kunde inte hämta sammanfattningen') },
      { status: 500 }
    )
  }
}
