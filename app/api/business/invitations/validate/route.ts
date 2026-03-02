/**
 * Business Invitation Validate API
 *
 * GET /api/business/invitations/validate?code=xxx - Validate an invitation code (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.json({ valid: false, error: 'Missing code' }, { status: 400 })
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
    return NextResponse.json({ valid: false, error: 'Invitation not found' })
  }

  if (invitation.usedAt) {
    return NextResponse.json({ valid: false, error: 'Invitation already used' })
  }

  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: 'Invitation expired' })
  }

  if (invitation.type !== 'BUSINESS_CLAIM') {
    return NextResponse.json({ valid: false, error: 'Invalid invitation type' })
  }

  const metadata = invitation.metadata as Record<string, unknown> | null

  return NextResponse.json({
    valid: true,
    businessName: invitation.business?.name || (metadata?.businessName as string) || null,
    role: (metadata?.role as string) || 'MEMBER',
  })
}
