/**
 * Coach Dashboard Templates API
 *
 * Coaches define templates that apply to their athletes' dashboards.
 * Scope determines who the template applies to:
 *   - BUSINESS_DEFAULT: all athletes in the business without a more specific template
 *   - TEAM:             all members of targetId (Team.id)
 *   - INDIVIDUAL:       one specific athlete (targetId = Client.id)
 *
 * GET    /api/coach/dashboard-templates?businessId=...
 * POST   /api/coach/dashboard-templates
 */

import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { prisma } from '@/lib/prisma'
import { upsertCoachTemplateSchema } from '@/lib/validations/dashboard-preferences'
import type { SportType } from '@prisma/client'

export async function GET(request: Request) {
  const user = await requireCoach()
  const url = new URL(request.url)
  const businessId = url.searchParams.get('businessId')

  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  // Verify the coach belongs to this business
  const membership = await prisma.businessMember.findFirst({
    where: { businessId, userId: user.id, isActive: true },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const templates = await prisma.coachDashboardTemplate.findMany({
    where: { businessId },
    orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ templates })
}

export async function POST(request: Request) {
  const user = await requireCoach()
  const url = new URL(request.url)
  const businessId = url.searchParams.get('businessId')

  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  const membership = await prisma.businessMember.findFirst({
    where: { businessId, userId: user.id, isActive: true },
    select: { role: true },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = upsertCoachTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, scope, targetId, sport, widgets } = parsed.data

  // Validate that the target (team or athlete) belongs to this coach.
  // Without this check, a coach could create a template for someone else's
  // team/athlete in the same business.
  if (scope !== 'BUSINESS_DEFAULT' && targetId) {
    const coachIds = await getCoachScopedIds(user.id, businessId, membership.role)
    if (scope === 'TEAM') {
      const team = await prisma.team.findFirst({
        where: { id: targetId, userId: { in: coachIds } },
        select: { id: true },
      })
      if (!team) {
        return NextResponse.json(
          { error: 'Team not found or not owned by this coach' },
          { status: 403 }
        )
      }
    } else if (scope === 'INDIVIDUAL') {
      const client = await prisma.client.findFirst({
        where: { id: targetId, userId: { in: coachIds } },
        select: { id: true },
      })
      if (!client) {
        return NextResponse.json(
          { error: 'Athlete not found or not coached by this coach' },
          { status: 403 }
        )
      }
    }
  }

  // Server-side enforcement: required widgets are always visible regardless
  // of what the client sends.
  const { WIDGET_REGISTRY } = await import('@/lib/dashboard/widget-registry')
  const sanitizedWidgets = widgets.map(w => ({
    ...w,
    visible: WIDGET_REGISTRY[w.widgetKey]?.required ? true : w.visible,
  }))

  // Find existing template matching the unique tuple. Prisma's compound unique
  // typing rejects nullable fields in `findUnique`, so we use findFirst + then
  // update/create.
  const normalizedTargetId = targetId ?? null
  const normalizedSport = (sport as SportType | null) ?? null

  const existing = await prisma.coachDashboardTemplate.findFirst({
    where: {
      businessId,
      scope,
      targetId: normalizedTargetId,
      sport: normalizedSport,
    },
    select: { id: true },
  })

  const template = existing
    ? await prisma.coachDashboardTemplate.update({
        where: { id: existing.id },
        data: { name, widgets: sanitizedWidgets as any },
      })
    : await prisma.coachDashboardTemplate.create({
        data: {
          coachId: user.id,
          businessId,
          name,
          scope,
          targetId: normalizedTargetId,
          sport: normalizedSport,
          widgets: sanitizedWidgets as any,
        },
      })

  return NextResponse.json({ template })
}
