/**
 * Team Drills API
 *
 * GET  - List drills (filterable by team/sport)
 * POST - Create a drill (manual or from AI analysis)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { notifyDrillPublished } from '@/lib/notifications/drills'

function parseScheduledDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('teamId')
    const sportType = searchParams.get('sportType')
    const shared = searchParams.get('shared') === 'true'

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ drills: [] })
    }

    const drills = await prisma.teamDrill.findMany({
      where: {
        businessId: membership.businessId,
        ...(shared ? { isPublished: true } : {}),
        ...(teamId ? { teamId } : {}),
        ...(sportType ? { sportType } : {}),
      },
      include: {
        team: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ drills })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json({ error: t(locale, 'Failed to load drills', 'Kunde inte läsa in övningar') }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const body = await req.json()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: t(locale, 'No business found', 'Ingen verksamhet hittades') }, { status: 400 })
    }

    const drill = await prisma.teamDrill.create({
      data: {
        businessId: membership.businessId,
        createdById: user.id,
        teamId: body.teamId || null,
        title: body.title || (locale === 'sv' ? 'Övning' : 'Drill'),
        description: body.description || null,
        sportType: body.sportType || 'ICE_HOCKEY',
        structure: body.structure,
        sourceType: body.sourceType || 'MANUAL',
        sourceImageUrl: body.sourceImageUrl || null,
        aiAnalysis: body.aiAnalysis || null,
        isPublished: body.isPublished || false,
        publishedAt: body.isPublished ? new Date() : null,
        scheduledDate: parseScheduledDate(body.scheduledDate),
      },
    })

    if (drill.isPublished) {
      await notifyDrillPublished(drill.id)
    }

    return NextResponse.json({ drill }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error creating drill:', error)
    return NextResponse.json({ error: t(locale, 'Failed to save drill', 'Kunde inte spara övningen') }, { status: 500 })
  }
}
