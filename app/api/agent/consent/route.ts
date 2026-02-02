/**
 * GET/POST /api/agent/consent
 *
 * Get or grant agent consent
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getConsentStatus, grantConsent, updateConsent } from '@/lib/agent/gdpr'
import { CONSENT_EXPLANATIONS } from '@/lib/agent/guardrails/consent'

/**
 * GET - Get current consent status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get client ID
    const searchParams = request.nextUrl.searchParams
    let clientId = searchParams.get('clientId')

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

    const status = await getConsentStatus(clientId)

    return NextResponse.json({
      ...status,
      explanations: CONSENT_EXPLANATIONS,
    })
  } catch (error) {
    console.error('Error getting consent:', error)
    return NextResponse.json(
      { error: 'Failed to get consent status' },
      { status: 500 }
    )
  }
}

/**
 * POST - Grant or update consent
 */
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
    const {
      clientId: bodyClientId,
      dataProcessingConsent,
      automatedDecisionConsent,
      healthDataProcessingConsent,
      learningContributionConsent,
      anonymizedResearchConsent,
    } = body

    // Get client ID
    let clientId = bodyClientId

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

    // Check if consent exists
    const existing = await prisma.agentConsent.findUnique({
      where: { clientId },
    })

    const consents = {
      dataProcessingConsent,
      automatedDecisionConsent,
      healthDataProcessingConsent,
      learningContributionConsent,
      anonymizedResearchConsent,
    }

    let consent
    if (!existing) {
      // Grant new consent
      consent = await grantConsent(clientId, consents, { ipAddress, userAgent })
    } else {
      // Update existing consent
      consent = await updateConsent(clientId, consents, { ipAddress, userAgent })
    }

    // Get updated status
    const status = await getConsentStatus(clientId)

    return NextResponse.json({
      success: true,
      consent: {
        id: consent.id,
        consentVersion: consent.consentVersion,
        consentGivenAt: consent.consentGivenAt,
      },
      status,
    })
  } catch (error) {
    console.error('Error granting consent:', error)
    return NextResponse.json(
      { error: 'Failed to grant consent' },
      { status: 500 }
    )
  }
}
