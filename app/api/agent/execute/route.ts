/**
 * POST /api/agent/execute
 *
 * Execute pending agent actions for an athlete.
 * Can be triggered manually or by cron job.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import {
  executePendingActions,
  executeActionsForAthlete,
  expireOldActions,
} from '@/lib/agent/execution'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { clientId, actionId } = body

    // If specific clientId provided, execute for that athlete
    if (clientId) {
      // Verify user has access to this client
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          OR: [
            { userId: user.id }, // Coach owns client
            { athleteAccount: { userId: user.id } }, // Is the athlete
          ],
        },
      })

      if (!client) {
        return NextResponse.json({ error: 'Client not found or unauthorized' }, { status: 404 })
      }

      // Check consent
      const consentStatus = await getConsentStatus(clientId)
      if (!consentStatus.hasRequiredConsent) {
        return NextResponse.json(
          {
            error: 'Missing required consents',
            details: {
              dataProcessing: consentStatus.dataProcessingConsent,
              healthData: consentStatus.healthDataProcessingConsent,
              isWithdrawn: consentStatus.isWithdrawn,
            },
          },
          { status: 403 }
        )
      }

      const result = await executeActionsForAthlete(clientId)

      return NextResponse.json({
        success: true,
        ...result,
      })
    }

    // If specific actionId provided, execute just that action
    if (actionId) {
      const action = await prisma.agentAction.findUnique({
        where: { id: actionId },
        include: {
          client: {
            select: {
              userId: true,
              athleteAccount: { select: { userId: true } },
            },
          },
        },
      })

      if (!action) {
        return NextResponse.json({ error: 'Action not found' }, { status: 404 })
      }

      // Verify user has access
      const isCoach = action.client.userId === user.id
      const isAthlete = action.client.athleteAccount?.userId === user.id

      if (!isCoach && !isAthlete) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Import and execute
      const { executeAction } = await import('@/lib/agent/execution')
      const result = await executeAction(action)

      return NextResponse.json({
        success: result.executed,
        result,
      })
    }

    // For admin/cron: execute all pending actions
    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required for batch execution' },
        { status: 403 }
      )
    }

    // Expire old actions first
    const expiredCount = await expireOldActions()

    // Execute pending actions
    const result = await executePendingActions(100)

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      ...result,
    })
  } catch (error) {
    console.error('Error executing agent actions:', error)
    return NextResponse.json(
      { error: 'Failed to execute agent actions' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agent/execute
 *
 * Get execution status and history
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId } = resolved

    // Get recent execution history
    const recentActions = await prisma.agentAction.findMany({
      where: {
        clientId,
        status: { in: ['AUTO_APPLIED', 'ACCEPTED', 'REJECTED', 'EXPIRED'] },
      },
      orderBy: { decidedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        actionType: true,
        status: true,
        reasoning: true,
        decidedAt: true,
        decidedBy: true,
        athleteFeedback: true,
      },
    })

    // Get stats
    const [autoApplied, accepted, rejected, expired] = await Promise.all([
      prisma.agentAction.count({
        where: { clientId, status: 'AUTO_APPLIED' },
      }),
      prisma.agentAction.count({
        where: { clientId, status: 'ACCEPTED' },
      }),
      prisma.agentAction.count({
        where: { clientId, status: 'REJECTED' },
      }),
      prisma.agentAction.count({
        where: { clientId, status: 'EXPIRED' },
      }),
    ])

    // Get pending count
    const pending = await prisma.agentAction.count({
      where: {
        clientId,
        status: 'PROPOSED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })

    return NextResponse.json({
      history: recentActions,
      stats: {
        pending,
        autoApplied,
        accepted,
        rejected,
        expired,
        total: autoApplied + accepted + rejected + expired,
        acceptanceRate:
          autoApplied + accepted + rejected > 0
            ? ((autoApplied + accepted) / (autoApplied + accepted + rejected)) * 100
            : 0,
      },
    })
  } catch (error) {
    console.error('Error getting execution status:', error)
    return NextResponse.json(
      { error: 'Failed to get execution status' },
      { status: 500 }
    )
  }
}
