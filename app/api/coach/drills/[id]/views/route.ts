/**
 * Team Drill Views API
 *
 * GET - Roster view status for a drill: which athletes have opened it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { id } = await params

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })
    if (!membership) {
      return NextResponse.json({ error: t(locale, 'No business found', 'Ingen verksamhet hittades') }, { status: 400 })
    }

    const drill = await prisma.teamDrill.findFirst({
      where: { id, businessId: membership.businessId },
      select: { id: true, teamId: true, businessId: true },
    })
    if (!drill) {
      return NextResponse.json({ error: t(locale, 'Drill not found', 'Övningen hittades inte') }, { status: 404 })
    }

    const [roster, views] = await Promise.all([
      prisma.client.findMany({
        where: drill.teamId ? { teamId: drill.teamId } : { businessId: drill.businessId },
        select: { id: true, name: true, jerseyNumber: true, position: true },
        orderBy: { name: 'asc' },
      }),
      prisma.teamDrillView.findMany({
        where: { drillId: drill.id },
        select: { clientId: true, viewedAt: true },
      }),
    ])

    const viewedAtByClient = new Map(views.map((v) => [v.clientId, v.viewedAt]))

    const athletes = roster.map((client) => ({
      clientId: client.id,
      name: client.name,
      jerseyNumber: client.jerseyNumber,
      position: client.position,
      viewedAt: viewedAtByClient.get(client.id) ?? null,
    }))

    return NextResponse.json({
      total: athletes.length,
      viewed: athletes.filter((a) => a.viewedAt !== null).length,
      athletes,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error fetching drill views:', error)
    return NextResponse.json({ error: t(locale, 'Failed to load view status', 'Kunde inte läsa in visningsstatus') }, { status: 500 })
  }
}
