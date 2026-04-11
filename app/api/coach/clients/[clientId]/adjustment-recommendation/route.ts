/**
 * Readiness-driven plan adjustment recommendation
 *
 * GET /api/coach/clients/:clientId/adjustment-recommendation
 *
 * Composes the three signal sources (most recent TrainingLoad, most
 * recent DailyCheckIn, recent pain/injury mentions) into a snapshot,
 * runs it through the pure decideAdjustment() engine, and returns
 * the proposed action plus context.
 *
 * This route is read-only. It does NOT mutate any assignment or
 * create any CoachAlert. The coach consumes the recommendation in
 * the UI and decides whether to apply it. The "apply" path is a
 * deliberate follow-up so we never auto-mutate training data without
 * a product/opt-in decision first.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api/utils'
import { prisma } from '@/lib/prisma'
import { decideAdjustment } from '@/lib/training-engine/plan-adjustment/decide-adjustment'
import { getNextPendingAssignment } from '@/lib/training-engine/plan-adjustment/get-next-pending-assignment'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { clientId } = await params
    const user = await requireCoach()

    const allowed = await canAccessClient(user.id, clientId)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Most recent TrainingLoad row with a computed ACWR.
    const latestLoad = await prisma.trainingLoad.findFirst({
      where: { clientId, acwr: { not: null } },
      orderBy: { date: 'desc' },
      select: { date: true, acwr: true, acwrZone: true, injuryRisk: true },
    })

    // Most recent DailyCheckIn in the last 48 hours — older check-ins
    // aren't fresh enough to drive an auto-adjustment decision.
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const latestCheckIn = await prisma.dailyCheckIn.findFirst({
      where: { clientId, date: { gte: twoDaysAgo } },
      orderBy: { date: 'desc' },
      select: { date: true, readinessScore: true, readinessDecision: true },
    })

    // Recent pain mentions from conversation memory (reuses the
    // INJURY_MENTION signal the coach-alerts cron already reads).
    const recentInjuryMention = await prisma.conversationMemory.findFirst({
      where: {
        clientId,
        memoryType: 'INJURY_MENTION',
        extractedAt: { gte: twoDaysAgo },
      },
      orderBy: { extractedAt: 'desc' },
      select: { importance: true, content: true },
    })

    // We don't have a structured pain score — translate the AI-rated
    // importance (1–5) to a 0–10 pain band as a coarse proxy.
    const recentPainLevel = recentInjuryMention
      ? Math.min(10, recentInjuryMention.importance * 2)
      : null

    const decision = decideAdjustment({
      acwrZone: latestLoad?.acwrZone ?? null,
      acwrValue: latestLoad?.acwr ?? null,
      readinessScore: latestCheckIn?.readinessScore ?? null,
      readinessDecision: latestCheckIn?.readinessDecision ?? null,
      recentPainLevel,
    })

    const nextAssignment = await getNextPendingAssignment(clientId, {
      horizonDays: 7,
    })

    return NextResponse.json({
      client,
      signals: {
        acwr: latestLoad
          ? {
              value: latestLoad.acwr,
              zone: latestLoad.acwrZone,
              injuryRisk: latestLoad.injuryRisk,
              date: latestLoad.date.toISOString(),
            }
          : null,
        readiness: latestCheckIn
          ? {
              score: latestCheckIn.readinessScore,
              decision: latestCheckIn.readinessDecision,
              date: latestCheckIn.date.toISOString(),
            }
          : null,
        recentPainLevel,
      },
      decision,
      nextAssignment: nextAssignment
        ? {
            kind: nextAssignment.kind,
            id: nextAssignment.id,
            sessionId: nextAssignment.sessionId,
            sessionName: nextAssignment.sessionName,
            assignedDate: nextAssignment.assignedDate.toISOString(),
            status: nextAssignment.status,
            notes: nextAssignment.notes,
          }
        : null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
