/**
 * Athlete preference: which connected wearable feeds recovery data
 * (HRV / RHR / sleep) when more than one is linked.
 *
 * GET   /api/integrations/recovery-source?clientId=...
 * PATCH /api/integrations/recovery-source  body: { clientId, source }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRecoverySource } from '@/lib/integrations/recovery-source'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const SOURCES = ['AUTO', 'GARMIN', 'OURA'] as const

const patchSchema = z.object({
  clientId: z.string().uuid(),
  source: z.enum(SOURCES),
})

async function loadConnected(clientId: string) {
  const tokens = await prisma.integrationToken.findMany({
    where: { clientId, type: { in: ['GARMIN', 'OURA'] } },
    select: { type: true },
  })
  return new Set(tokens.map(t => t.type))
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: t(locale, 'clientId is required', 'clientId krävs') }, { status: 400 })
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    const [client, connected, resolved] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: { preferredRecoverySource: true },
      }),
      loadConnected(clientId),
      resolveRecoverySource(clientId),
    ])

    return NextResponse.json({
      preferred: client?.preferredRecoverySource ?? 'AUTO',
      resolved,
      connected: {
        GARMIN: connected.has('GARMIN'),
        OURA: connected.has('OURA'),
      },
    })
  } catch (error) {
    logError('Get recovery source error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to load preference', 'Kunde inte hämta inställningen') }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const body = await request.json()
    const validation = patchSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig indata'), details: validation.error.flatten() },
        { status: 400 },
      )
    }

    const { clientId, source } = validation.data

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    await prisma.client.update({
      where: { id: clientId },
      data: { preferredRecoverySource: source },
    })

    const resolved = await resolveRecoverySource(clientId)
    return NextResponse.json({ success: true, preferred: source, resolved })
  } catch (error) {
    logError('Patch recovery source error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to update preference', 'Kunde inte uppdatera inställningen') }, { status: 500 })
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
