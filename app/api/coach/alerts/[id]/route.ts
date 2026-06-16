/**
 * Coach Alert Detail API
 *
 * PATCH /api/coach/alerts/[id] - Update alert status
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const updateSchema = z.object({
  action: z.enum(['dismiss', 'resolve', 'action', 'snooze']),
  note: z.string().trim().max(1000).optional(),
  outcome: z.string().trim().max(80).optional(),
  followUpAt: z.string().datetime().optional(),
  snoozedUntil: z.string().datetime().optional(),
  snoozeHours: z.number().min(1).max(336).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveSnoozedUntil(input: {
  snoozedUntil?: string
  snoozeHours?: number
  now: Date
}): Date {
  if (input.snoozedUntil) {
    const until = new Date(input.snoozedUntil)
    if (!Number.isNaN(until.getTime()) && until > input.now) {
      return until
    }
  }

  const hours = input.snoozeHours ?? 24
  return new Date(input.now.getTime() + hours * 60 * 60 * 1000)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params

    // Verify alert belongs to this coach
    const alert = await prisma.coachAlert.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    })

    if (!alert) {
      return NextResponse.json({ error: t(locale, 'Alert not found', 'Varningen hittades inte') }, { status: 404 })
    }

    // Parse and validate body
    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request', 'Ogiltig förfrågan'), details: validation.error.errors },
        { status: 400 }
      )
    }

    const { action, note, outcome, followUpAt, snoozedUntil, snoozeHours } = validation.data
    const now = new Date()

    // Update alert based on action
    const updateData: Prisma.CoachAlertUpdateInput = {}
    if (note !== undefined) {
      updateData.actionNote = note || null
    }

    switch (action) {
      case 'dismiss':
        updateData.status = 'DISMISSED'
        updateData.dismissedAt = now
        updateData.dismissedBy = user.id
        updateData.snoozedAt = null
        updateData.snoozedUntil = null
        updateData.snoozedBy = null
        break
      case 'resolve':
        updateData.status = 'RESOLVED'
        updateData.resolvedAt = now
        updateData.resolvedBy = user.id
        updateData.resolutionOutcome = outcome || null
        updateData.followUpAt = followUpAt ? new Date(followUpAt) : null
        updateData.snoozedAt = null
        updateData.snoozedUntil = null
        updateData.snoozedBy = null
        break
      case 'action':
        updateData.status = 'ACTIONED'
        updateData.actionedAt = now
        updateData.actionedBy = user.id
        updateData.followUpAt = followUpAt ? new Date(followUpAt) : null
        updateData.snoozedAt = null
        updateData.snoozedUntil = null
        updateData.snoozedBy = null
        break
      case 'snooze':
        updateData.status = 'SNOOZED'
        updateData.snoozedAt = now
        updateData.snoozedUntil = resolveSnoozedUntil({ snoozedUntil, snoozeHours, now })
        updateData.snoozedBy = user.id
        break
    }

    const updated = await prisma.coachAlert.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      alert: updated,
    })
  } catch (error) {
    // Handle redirect from requireCoach
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    console.error('Error updating coach alert:', error)
    return NextResponse.json({ error: t(locale, 'Failed to update alert', 'Kunde inte uppdatera varningen') }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params

    const alert = await prisma.coachAlert.findFirst({
      where: {
        id,
        coachId: user.id,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            sportProfile: {
              select: {
                primarySport: true,
              },
            },
          },
        },
      },
    })

    if (!alert) {
      return NextResponse.json({ error: t(locale, 'Alert not found', 'Varningen hittades inte') }, { status: 404 })
    }

    return NextResponse.json({ alert })
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    console.error('Error fetching coach alert:', error)
    return NextResponse.json({ error: t(locale, 'Failed to fetch alert', 'Kunde inte hämta varningen') }, { status: 500 })
  }
}
