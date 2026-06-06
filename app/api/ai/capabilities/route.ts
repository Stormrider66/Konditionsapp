import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getRequestedBusinessScope, resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import {
  getAvailableAiCapabilities,
} from '@/lib/ai/capabilities/registry'
import { isAiAssistantOperationsEnabled } from '@/lib/ai/capabilities/feature-gate'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const url = new URL(request.url)
    const isAthleteChat = url.searchParams.get('isAthleteChat') === 'true'

    if (isAthleteChat) {
      const resolved = await resolveAthleteClientId()
      if (!resolved) {
        return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
      }
      locale = resolveRequestLocale(request, resolved.user.language)

      const client = await prisma.client.findUnique({
        where: { id: resolved.clientId },
        select: {
          businessId: true,
          agentConsent: {
            select: {
              dataProcessingConsent: true,
              healthDataProcessingConsent: true,
              consentWithdrawnAt: true,
            },
          },
          trainingPrograms: {
            where: { isActive: true },
            select: { id: true },
            take: 1,
          },
          athleteSubscription: {
            select: { tier: true, assignedCoachId: true },
          },
        },
      })

      const operationsEnabled = await isAiAssistantOperationsEnabled(client?.businessId)
      const rawTier = client?.athleteSubscription?.tier || 'FREE'
      const subscriptionTier = (rawTier === 'ELITE' ? 'PRO' : rawTier) as 'FREE' | 'STANDARD' | 'PRO'
      const isSelfCoached = !client?.athleteSubscription?.assignedCoachId
      const hasRequiredConsent = Boolean(
        client?.agentConsent?.dataProcessingConsent &&
        client.agentConsent.healthDataProcessingConsent &&
        !client.agentConsent.consentWithdrawnAt
      )
      const capabilities = getAvailableAiCapabilities({
        role: 'ATHLETE',
        operationsEnabled,
        hasAthleteConsent: hasRequiredConsent,
        athleteCapabilities: {
          canGenerateProgram: isSelfCoached && (subscriptionTier === 'STANDARD' || subscriptionTier === 'PRO'),
          hasActiveProgram: Boolean(client?.trainingPrograms.length),
          subscriptionTier,
          isSelfCoached,
        },
      })

      return NextResponse.json({
        success: true,
        operationsEnabled,
        capabilities,
      })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const hasCoachAccess = await canAccessCoachPlatform(user.id)
    if (!hasCoachAccess) {
      return NextResponse.json({ success: false, error: t(locale, 'Coach access required', 'Coachbehörighet krävs') }, { status: 403 })
    }

    const scope = getRequestedBusinessScope(request)
    const businessSlug = scope.businessSlug || url.searchParams.get('businessSlug') || undefined
    const business = businessSlug
      ? await prisma.business.findUnique({ where: { slug: businessSlug }, select: { id: true } })
      : null
    const operationsEnabled = await isAiAssistantOperationsEnabled(business?.id)
    const staffPermissions = await getStaffPermissions(user.id, businessSlug)
    const capabilities = getAvailableAiCapabilities({
      role: 'COACH',
      operationsEnabled,
      staffPermissions,
      hasAthleteConsent: true,
    })

    return NextResponse.json({
      success: true,
      operationsEnabled,
      capabilities,
    })
  } catch (error) {
    console.error('AI capabilities error:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to get AI capabilities', 'Kunde inte hämta AI-förmågor') },
      { status: 500 }
    )
  }
}
