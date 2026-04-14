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

  // Upsert by unique (businessId, scope, targetId, sport)
  const template = await prisma.coachDashboardTemplate.upsert({
    where: {
      businessId_scope_targetId_sport: {
        businessId,
        scope,
        targetId: targetId ?? null,
        sport: (sport as SportType | null) ?? null,
      },
    },
    update: {
      name,
      widgets: widgets as any,
    },
    create: {
      coachId: user.id,
      businessId,
      name,
      scope,
      targetId: targetId ?? null,
      sport: (sport as SportType | null) ?? null,
      widgets: widgets as any,
    },
  })

  return NextResponse.json({ template })
}
