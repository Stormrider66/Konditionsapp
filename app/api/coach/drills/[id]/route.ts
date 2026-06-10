/**
 * Team Drill API (single drill)
 *
 * PATCH  - Update a drill (publish/unpublish, schedule, edit details)
 * DELETE - Remove a drill
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { notifyDrillPublished } from '@/lib/notifications/drills'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

async function findOwnedDrill(userId: string, drillId: string) {
  const membership = await prisma.businessMember.findFirst({
    where: { userId, isActive: true },
    select: { businessId: true },
  })
  if (!membership) return null

  const drill = await prisma.teamDrill.findFirst({
    where: { id: drillId, businessId: membership.businessId },
  })
  return drill
}

function parseScheduledDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { id } = await params

    const drill = await findOwnedDrill(user.id, id)
    if (!drill) {
      return NextResponse.json({ error: t(locale, 'Drill not found', 'Övningen hittades inte') }, { status: 404 })
    }

    const body = await req.json()
    const scheduledDate = parseScheduledDate(body.scheduledDate)
    const wasPublished = drill.isPublished
    const isPublished = typeof body.isPublished === 'boolean' ? body.isPublished : undefined

    const updated = await prisma.teamDrill.update({
      where: { id: drill.id },
      data: {
        ...(typeof body.title === 'string' && body.title.trim() ? { title: body.title.trim() } : {}),
        ...(typeof body.description === 'string' ? { description: body.description || null } : {}),
        ...(body.teamId !== undefined ? { teamId: body.teamId || null } : {}),
        ...(scheduledDate !== undefined ? { scheduledDate } : {}),
        ...(isPublished !== undefined
          ? { isPublished, publishedAt: isPublished ? drill.publishedAt ?? new Date() : null }
          : {}),
      },
      include: {
        team: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    })

    if (!wasPublished && updated.isPublished) {
      await notifyDrillPublished(updated.id)
    }

    return NextResponse.json({ drill: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error updating drill:', error)
    return NextResponse.json({ error: t(locale, 'Failed to update drill', 'Kunde inte uppdatera övningen') }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { id } = await params

    const drill = await findOwnedDrill(user.id, id)
    if (!drill) {
      return NextResponse.json({ error: t(locale, 'Drill not found', 'Övningen hittades inte') }, { status: 404 })
    }

    await prisma.teamDrill.delete({ where: { id: drill.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error deleting drill:', error)
    return NextResponse.json({ error: t(locale, 'Failed to delete drill', 'Kunde inte ta bort övningen') }, { status: 500 })
  }
}
