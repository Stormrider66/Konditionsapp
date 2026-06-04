/**
 * Single OneRepMaxHistory entry API
 *
 * PATCH  /api/strength-pr/[id] — edit one entry (typo fixes, date corrections)
 * DELETE /api/strength-pr/[id] — remove one entry (e.g. mistyped weight)
 *
 * Only the OneRepMaxHistory row is touched here. The companion
 * ProgressionTracking row that the original POST creates from a logged
 * set is intentionally left alone — it represents what the athlete
 * actually lifted, not the PR claim, so a coach correcting the PR
 * shouldn't retroactively erase the underlying set log.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteContext {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const locale = resolveRequestLocale(request, user.language)
    const { id } = await context.params

    const existing = await prisma.oneRepMaxHistory.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: t(locale, 'Not found', 'Hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessClient(user.id, existing.clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const body = await request.json()
    const { oneRepMax, date, notes, source, bodyWeight, unit } = body

    // Only patch fields explicitly present in the body so partial
    // updates don't accidentally null other columns.
    const data: Record<string, unknown> = {}
    if (typeof oneRepMax === 'number' && oneRepMax > 0) data.oneRepMax = oneRepMax
    if (typeof date === 'string') data.date = new Date(date)
    if (notes !== undefined) data.notes = notes
    if (typeof source === 'string') data.source = source
    if (bodyWeight !== undefined) data.bodyWeight = bodyWeight
    if (typeof unit === 'string') data.unit = unit

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: t(locale, 'No editable fields supplied', 'Inga redigerbara fält angavs') }, { status: 400 })
    }

    const updated = await prisma.oneRepMaxHistory.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const locale = resolveRequestLocale(request, user.language)
    const { id } = await context.params

    const existing = await prisma.oneRepMaxHistory.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: t(locale, 'Not found', 'Hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessClient(user.id, existing.clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    await prisma.oneRepMaxHistory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
