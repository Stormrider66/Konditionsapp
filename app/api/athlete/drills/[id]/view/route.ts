/**
 * Athlete Drill View API
 *
 * POST - Mark a published drill as viewed by the current athlete.
 *        Body: { acknowledge?: true } — also records explicit acknowledgement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let locale: AppLocale = 'en'

  try {
    const { clientId, user } = await requireAthleteOrCoachInAthleteMode()
    locale = resolveRequestLocale(req, user.language)
    const { id } = await params

    if (!clientId) {
      return NextResponse.json({ error: t(locale, 'No athlete profile', 'Ingen atletprofil') }, { status: 400 })
    }

    let acknowledge = false
    try {
      const body = await req.json()
      acknowledge = body?.acknowledge === true
    } catch {
      // empty body = view-only (no acknowledge)
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { teamId: true, businessId: true },
    })
    if (!client) {
      return NextResponse.json({ error: t(locale, 'No athlete profile', 'Ingen atletprofil') }, { status: 400 })
    }

    // Only drills the athlete can actually see may be marked as viewed
    const drill = await prisma.teamDrill.findFirst({
      where: {
        id,
        isPublished: true,
        OR: [
          ...(client.teamId ? [{ teamId: client.teamId }] : []),
          ...(client.businessId ? [{ businessId: client.businessId, teamId: null }] : []),
        ],
      },
      select: { id: true },
    })
    if (!drill) {
      return NextResponse.json({ error: t(locale, 'Drill not found', 'Övningen hittades inte') }, { status: 404 })
    }

    const view = await prisma.teamDrillView.upsert({
      where: { drillId_clientId: { drillId: drill.id, clientId } },
      create: {
        drillId: drill.id,
        clientId,
        acknowledgedAt: acknowledge ? new Date() : null,
      },
      update: acknowledge
        ? { acknowledgedAt: new Date() }
        : {}, // view-only: don't overwrite an existing acknowledgement
    })

    return NextResponse.json({
      viewedAt: view.viewedAt,
      acknowledgedAt: view.acknowledgedAt,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error marking drill as viewed:', error)
    return NextResponse.json({ error: t(locale, 'Failed to mark drill as viewed', 'Kunde inte markera övningen som visad') }, { status: 500 })
  }
}
