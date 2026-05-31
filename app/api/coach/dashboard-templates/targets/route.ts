/**
 * Returns teams + athletes the coach can target with a dashboard template.
 * GET /api/coach/dashboard-templates/targets?businessId=...
 */

import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { prisma } from '@/lib/prisma'

type AppLocale = 'en' | 'sv'

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: Request) {
  const user = await requireCoach()
  const locale = getUserLocale(user.language)
  const url = new URL(request.url)
  const businessId = url.searchParams.get('businessId')

  if (!businessId) {
    return NextResponse.json({ error: t(locale, 'businessId required', 'businessId är obligatoriskt') }, { status: 400 })
  }

  const membership = await prisma.businessMember.findFirst({
    where: { businessId, userId: user.id, isActive: true },
    select: { role: true },
  })
  if (!membership) {
    return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
  }

  const coachIds = await getCoachScopedIds(user.id, businessId, membership.role)

  const [teams, athletes] = await Promise.all([
    prisma.team.findMany({
      where: { userId: { in: coachIds } },
      select: { id: true, name: true, sportType: true, _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.client.findMany({
      where: { userId: { in: coachIds } },
      select: {
        id: true,
        name: true,
        sportProfile: { select: { primarySport: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return NextResponse.json({
    teams: teams.map(t => ({
      id: t.id,
      name: t.name,
      sport: t.sportType,
      memberCount: t._count.members,
    })),
    athletes: athletes.map(a => ({
      id: a.id,
      name: a.name,
      sport: a.sportProfile?.primarySport ?? null,
    })),
  })
}
