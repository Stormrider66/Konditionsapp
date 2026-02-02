/**
 * POST /api/agent/consent/withdraw
 *
 * Withdraw agent consent (stops all agent operations)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { withdrawConsent } from '@/lib/agent/gdpr'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    let clientId = body.clientId

    if (!clientId) {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })

      if (!athleteAccount) {
        return NextResponse.json(
          { error: 'No athlete profile found' },
          { status: 404 }
        )
      }

      clientId = athleteAccount.clientId
    }

    // Get IP and user agent for audit
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Withdraw consent
    const consent = await withdrawConsent(clientId, { ipAddress, userAgent })

    // Expire all pending actions
    await prisma.agentAction.updateMany({
      where: {
        clientId,
        status: 'PROPOSED',
      },
      data: {
        status: 'EXPIRED',
      },
    })

    return NextResponse.json({
      success: true,
      withdrawnAt: consent.consentWithdrawnAt,
      message:
        'Consent withdrawn. All agent operations have been stopped. You can re-enable the agent at any time.',
    })
  } catch (error) {
    console.error('Error withdrawing consent:', error)
    return NextResponse.json(
      { error: 'Failed to withdraw consent' },
      { status: 500 }
    )
  }
}
