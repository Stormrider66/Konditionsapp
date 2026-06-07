/**
 * Business Invitation Validate API
 *
 * GET /api/business/invitations/validate?code=xxx - Validate an invitation code (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { rateLimitIp } from '@/lib/api/rate-limit'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  const locale = resolveRequestLocale(request)
  const rateLimited = await rateLimitIp(request, {
    limit: 30,
    windowSeconds: 60,
  }, 'business-invitations:validate')
  if (rateLimited) return rateLimited

  const code = request.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.json({ valid: false, error: t(locale, 'Missing code', 'Kod saknas') }, { status: 400 })
  }

  const invitation = await prisma.invitation.findUnique({
    where: { code },
    select: {
      type: true,
      usedAt: true,
      expiresAt: true,
      metadata: true,
      business: { select: { name: true } },
    },
  })

  if (!invitation) {
    return NextResponse.json({ valid: false, error: t(locale, 'Invitation not found', 'Inbjudan hittades inte') })
  }

  if (invitation.usedAt) {
    return NextResponse.json({ valid: false, error: t(locale, 'Invitation already used', 'Inbjudan har redan använts') })
  }

  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: t(locale, 'Invitation expired', 'Inbjudan har gått ut') })
  }

  if (invitation.type !== 'BUSINESS_CLAIM') {
    return NextResponse.json({ valid: false, error: t(locale, 'Invalid invitation type', 'Ogiltig inbjudningstyp') })
  }

  const metadata = invitation.metadata as Record<string, unknown> | null

  return NextResponse.json({
    valid: true,
    businessName: invitation.business?.name || (metadata?.businessName as string) || null,
    role: (metadata?.role as string) || 'MEMBER',
  })
}
