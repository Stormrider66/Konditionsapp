/**
 * GET /api/agent/status
 *
 * Get agent status for the current athlete
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getConsentStatus } from '@/lib/agent/gdpr'

export async function GET(request: NextRequest) {
  try {
    // Get client ID from query or resolve from auth
    const searchParams = request.nextUrl.searchParams
    let clientId = searchParams.get('clientId')

    if (!clientId) {
      const resolved = await resolveAthleteClientId()

      if (!resolved) {
        return NextResponse.json(
          { error: 'No athlete profile found' },
          { status: 404 }
        )
      }

      clientId = resolved.clientId
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
