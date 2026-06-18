/**
 * Manual WHOOP sync.
 *
 * POST /api/integrations/whoop/sync  body: { clientId, daysBack? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { syncWhoopData } from '@/lib/integrations/whoop/sync'
import { logError } from '@/lib/logger-console'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const syncSchema = z.object({
  clientId: z.string().uuid(),
  daysBack: z.number().min(1).max(30).optional().default(7),
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

    const denied = await requireFeatureAccess(clientId, 'whoop')
    if (denied) return denied

    const token = await prisma.integrationToken.findUnique({
      where: { clientId_type: { clientId, type: 'WHOOP' } },
    })
    if (!token) {
      return NextResponse.json(
        { error: t(locale, 'WHOOP not connected for this client', 'WHOOP är inte anslutet för den här klienten') },
        { status: 404 },
      )
    }
    if (!token.syncEnabled) {
      return NextResponse.json({ error: t(locale, 'Sync is disabled for this client', 'Synk är inaktiverad för den här klienten') }, { status: 400 })
    }

    const result = await syncWhoopData(clientId, { daysBack })

    return NextResponse.json({
      success: true,
      synced: result.sleepsSynced + result.recoveriesSynced + result.cyclesSynced,
      cyclesSynced: result.cyclesSynced,
      sleepsSynced: result.sleepsSynced,
      recoveriesSynced: result.recoveriesSynced,
      workoutsSynced: result.workoutsSynced,
      appliedRecoveryWrites: result.appliedRecoveryWrites,
      errors: result.errors,
    })
  } catch (error) {
    logError('Sync WHOOP error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to sync WHOOP data', 'Kunde inte synka WHOOP-data') }, { status: 500 })
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
