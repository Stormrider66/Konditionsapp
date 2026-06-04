/**
 * Manual "Sync now" trigger for Oura.
 *
 * POST /api/integrations/oura/sync  body: { clientId, daysBack? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { syncOuraData } from '@/lib/integrations/oura/sync'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const syncSchema = z.object({
  clientId: z.string().uuid(),
  daysBack: z.number().min(1).max(30).optional().default(3),
})

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const body = await request.json()
    const validation = syncSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig indata'), details: validation.error.flatten() },
        { status: 400 },
      )
    }

    const { clientId, daysBack } = validation.data

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    const token = await prisma.integrationToken.findUnique({
      where: { clientId_type: { clientId, type: 'OURA' } },
    })
    if (!token) {
      return NextResponse.json(
        { error: t(locale, 'Oura not connected for this client', 'Oura är inte anslutet för den här klienten') },
        { status: 404 },
      )
    }
    if (!token.syncEnabled) {
      return NextResponse.json({ error: t(locale, 'Sync is disabled for this client', 'Synk är inaktiverad för den här klienten') }, { status: 400 })
    }

    const result = await syncOuraData(clientId, { daysBack })

    return NextResponse.json({
      success: true,
      synced: result.daysProcessed,
      hrvRecords: result.hrvRecords,
      sleepRecords: result.sleepRecords,
      readinessRecords: result.readinessRecords,
      workoutsSynced: result.workoutsSynced,
      appliedRecoveryWrites: result.appliedRecoveryWrites,
      errors: result.errors,
    })
  } catch (error) {
    logError('Sync Oura error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to sync Oura data', 'Kunde inte synka Oura-data') }, { status: 500 })
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
