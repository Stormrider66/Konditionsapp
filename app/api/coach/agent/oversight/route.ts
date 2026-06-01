/**
 * GET /api/coach/agent/oversight
 *
 * Get all pending agent actions for the coach's athletes
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { safeParseInt } from '@/lib/utils/parse'
import { resolveLocale, t, type AppLocale } from '@/lib/agent/api-locale'
import type { AgentActionStatus, Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const scope = getRequestedBusinessScope(request)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status') || 'PROPOSED'
    const limit = safeParseInt(searchParams.get('limit'), 50, 1, 100)

    // Get coach's user record
    const coachUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, language: true },
    })
    locale = resolveLocale(coachUser?.language)

    if (!coachUser || coachUser.role !== 'COACH') {
      return NextResponse.json({ error: t(locale, 'Not a coach', 'Inte coach') }, { status: 403 })
    }

    const clientWhere: Prisma.ClientWhereInput = {
      userId: user.id,
      ...(scope.businessSlug
        ? { business: { slug: scope.businessSlug, isActive: true } }
        : {}),
    }

    // Build where clause
    const where: Prisma.AgentActionWhereInput = {
      client: clientWhere, // Only actions for coach's athletes in this business
      status: status === 'all'
        ? { in: ['PROPOSED', 'ACCEPTED', 'REJECTED', 'AUTO_APPLIED'] as AgentActionStatus[] }
        : status as AgentActionStatus,
    }

    if (clientId) {
      const hasAccess = await canAccessClient(user.id, clientId)
      const inBusiness = await prisma.client.findFirst({
        where: { ...clientWhere, id: clientId },
        select: { id: true },
      })
      if (!hasAccess || !inBusiness) {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
      }
      where.clientId = clientId
    }

    // Fetch actions with client info
    const actions = await prisma.agentAction.findMany({
      where,
      orderBy: [
        { priority: 'asc' }, // CRITICAL first
        { proposedAt: 'desc' },
      ],
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        perception: {
          select: {
            readinessScore: true,
            acwr: true,
            acwrZone: true,
          },
        },
      },
    })

    // Transform response
    const response = actions.map((action) => ({
      id: action.id,
      actionType: action.actionType,
      actionData: action.actionData,
      reasoning: action.reasoning,
      confidence: action.confidence,
      confidenceScore: action.confidenceScore,
      priority: action.priority,
      status: action.status,
      targetDate: action.targetDate,
      proposedAt: action.proposedAt,
      expiresAt: action.expiresAt,
      client: {
        id: action.client.id,
        name: action.client.name,
        email: action.client.email,
      },
      perception: action.perception,
    }))

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

    return NextResponse.json({
      actions: response,
      counts: {
        proposed,
        accepted,
        rejected,
        autoApplied,
      },
    })
  } catch (error) {
    console.error('Error getting oversight queue:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to get oversight queue', 'Kunde inte hämta agentkön') },
      { status: 500 }
    )
  }
}
