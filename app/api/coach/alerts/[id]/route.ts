/**
 * Coach Alert Detail API
 *
 * PATCH /api/coach/alerts/[id] - Update alert status
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const updateSchema = z.object({
  action: z.enum(['dismiss', 'resolve', 'action']),
  note: z.string().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
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

    const { action, note } = validation.data

    // Update alert based on action
    const updateData: Record<string, unknown> = {}

    switch (action) {
      case 'dismiss':
        updateData.status = 'DISMISSED'
        updateData.dismissedAt = new Date()
        break
      case 'resolve':
        updateData.status = 'RESOLVED'
        updateData.resolvedAt = new Date()
        if (note) updateData.actionNote = note
        break
      case 'action':
        updateData.status = 'ACTIONED'
        updateData.actionedAt = new Date()
        if (note) updateData.actionNote = note
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
