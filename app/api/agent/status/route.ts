/**
 * GET /api/agent/status
 *
 * Get agent status for the current athlete
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getConsentStatus } from '@/lib/agent/gdpr'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get client ID from query or find athlete account
    const searchParams = request.nextUrl.searchParams
    let clientId = searchParams.get('clientId')

    if (!clientId) {
      // Try to find athlete account
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

    // Get consent status
    const consentStatus = await getConsentStatus(clientId)

    // Get preferences
    const preferences = await prisma.agentPreferences.findUnique({
      where: { clientId },
    })

    // Count pending actions
    const pendingActions = await prisma.agentAction.count({
      where: {
        clientId,
        status: 'PROPOSED',
        expiresAt: { gt: new Date() },
      },
    })

    // Get last perception time
    const lastPerception = await prisma.agentPerception.findFirst({
      where: { clientId },
      orderBy: { perceivedAt: 'desc' },
      select: { perceivedAt: true },
    })

    return NextResponse.json({
      isActive: consentStatus.hasRequiredConsent && !consentStatus.isWithdrawn,
      hasConsent: consentStatus.hasRequiredConsent,
      consentWithdrawn: consentStatus.isWithdrawn,
      autonomyLevel: preferences?.autonomyLevel ?? 'ADVISORY',
      pendingActions,
      lastPerception: lastPerception?.perceivedAt ?? null,
    })
  } catch (error) {
    console.error('Error getting agent status:', error)
    return NextResponse.json(
      { error: 'Failed to get agent status' },
      { status: 500 }
    )
  }
}
