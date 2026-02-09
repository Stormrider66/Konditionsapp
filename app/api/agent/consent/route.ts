/**
 * GET/POST /api/agent/consent
 *
 * Get or grant agent consent
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getConsentStatus, grantConsent, updateConsent } from '@/lib/agent/gdpr'
import { CONSENT_EXPLANATIONS } from '@/lib/agent/guardrails/consent'

/**
 * GET - Get current consent status
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId } = resolved

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
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId } = resolved

    const body = await request.json()
    const {
      dataProcessingConsent,
      automatedDecisionConsent,
      healthDataProcessingConsent,
      learningContributionConsent,
      anonymizedResearchConsent,
    } = body

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
