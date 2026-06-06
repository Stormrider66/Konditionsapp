/**
 * Athlete's Team Plan API (coach-scoped)
 *
 * GET /api/clients/[id]/team-plan
 *
 * Returns the active TeamPlan for the athlete's team plus the block covering
 * "now", so a rostered player's individual profile can show the team plan they
 * are actually following (read-only) instead of looking unplanned.
 *
 * Part of the athlete-profile IA redesign — team-plan inheritance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import type { TeamPlanContext } from '@/lib/coach/team-plan'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { teamId: true },
    })
    if (!client?.teamId) {
      return NextResponse.json({ success: true, teamPlan: null })
    }

    const now = new Date()

    // Prefer a plan whose date range covers today; fall back to the most recent
    // active plan for the team.
    const plans = await prisma.teamPlan.findMany({
      where: { teamId: client.teamId, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        team: { select: { name: true } },
        blocks: {
          orderBy: { order: 'asc' },
          select: { title: true, focus: true, startDate: true, endDate: true, order: true },
        },
      },
    })

    const plan = plans.find((p) => p.startDate <= now && p.endDate >= now) ?? plans[0] ?? null
    if (!plan) {
      return NextResponse.json({ success: true, teamPlan: null })
    }

    const currentBlock =
      plan.blocks.find((b) => b.startDate <= now && b.endDate >= now) ??
      plan.blocks.find((b) => b.startDate > now) ??
      plan.blocks[0] ??
      null

    const teamPlan: TeamPlanContext = {
      id: plan.id,
      name: plan.name,
      teamName: plan.team.name,
      startDate: plan.startDate.toISOString(),
      endDate: plan.endDate.toISOString(),
      blockCount: plan.blocks.length,
      currentBlock: currentBlock
        ? {
            title: currentBlock.title,
            focus: currentBlock.focus,
            startDate: currentBlock.startDate.toISOString(),
            endDate: currentBlock.endDate.toISOString(),
            order: currentBlock.order,
          }
        : null,
    }

    return NextResponse.json({ success: true, teamPlan })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
