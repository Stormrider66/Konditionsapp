// app/api/athlete-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach, hasReachedAthleteLimit, canAccessClient } from '@/lib/auth-utils'
import { CreateAthleteAccountDTO } from '@/types'
import { logger } from '@/lib/logger'
import { createAthleteAccountForClient, type AthleteTier } from '@/lib/athlete-account-utils'
import { sendAthletePlatformInvite } from '@/lib/athlete-platform-invite'

const VALID_ATHLETE_TIERS: readonly AthleteTier[] = ['FREE', 'STANDARD', 'PRO', 'ELITE']
function isValidAthleteTier(value: unknown): value is AthleteTier {
  return typeof value === 'string' && (VALID_ATHLETE_TIERS as readonly string[]).includes(value)
}

function shouldSendEmail(value: unknown): boolean {
  return value !== 'sms' && value !== 'whatsapp' && value !== 'link'
}

type AppLocale = 'en' | 'sv'

/**
 * POST /api/athlete-accounts
 * Create a new athlete account for a client
 * Only coaches can create athlete accounts
 */
export async function POST(request: NextRequest) {
  try {
    // Require coach authentication
    const coach = await requireCoach()
    const locale = getUserLocale(coach.language)

    // Business members are exempt — their limit is managed at the business level
    const businessMembership = await prisma.businessMember.findFirst({
      where: { userId: coach.id, isActive: true },
      select: { businessId: true },
    })

    if (!businessMembership) {
      // Check subscription limits for non-business coaches
      const reachedLimit = await hasReachedAthleteLimit(coach.id)
      if (reachedLimit) {
        return NextResponse.json(
          { error: 'You have reached your athlete limit. Please upgrade your subscription.' },
          { status: 403 }
        )
      }
    }

    const body: CreateAthleteAccountDTO & {
      tier?: string
      trialDays?: number
      deliveryMethod?: string
    } = await request.json()
    const { clientId, email, notificationPrefs } = body

    // Validate required fields
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    const tier: AthleteTier = isValidAthleteTier(body.tier) ? body.tier : 'STANDARD'
    const trialDays = typeof body.trialDays === 'number' ? body.trialDays : undefined

    // Check if coach has access to this client
    const hasAccess = await canAccessClient(coach.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this client' },
        { status: 403 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { athleteAccount: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (client.athleteAccount) {
      return NextResponse.json(
        { error: 'This client already has an athlete account' },
        { status: 400 }
      )
    }

    const profileEmail = email?.trim().toLowerCase() || client.email?.trim().toLowerCase()
    if (!profileEmail) {
      return NextResponse.json(
        { error: t(locale, 'The client must have an email address in the profile', 'Klienten måste ha en e-postadress i profilen') },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: profileEmail, mode: 'insensitive' } },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already in use' },
        { status: 400 }
      )
    }

    if (client.email?.toLowerCase() !== profileEmail) {
      await prisma.client.update({
        where: { id: clientId },
        data: { email: profileEmail },
      })
    }

    const created = await createAthleteAccountForClient(clientId, coach.id, {
      notificationPrefs,
      tier,
      trialDays,
    })

    if (!created.success || !created.athleteAccount) {
      return NextResponse.json(
        { error: created.error || t(locale, 'Could not create athlete account', 'Kunde inte skapa atletkonto') },
        { status: 400 }
      )
    }

    const inviteResult = await sendAthletePlatformInvite(clientId, coach.id, {
      sendEmail: shouldSendEmail(body.deliveryMethod),
    })

    return NextResponse.json(
      {
        athleteAccount: created.athleteAccount,
        emailSent: inviteResult.emailSent ?? false,
        emailPaused: inviteResult.emailPaused ?? false,
        email: profileEmail,
        inviteUrl: inviteResult.inviteUrl,
        inviteText: inviteResult.inviteText,
        businessName: inviteResult.businessName,
        message: inviteResult.emailPaused
          ? t(
              locale,
              `Athlete account created, but outbound email is paused. Send the login link manually to ${profileEmail}.`,
              `Atletkonto skapat, men utgående e-post är pausad. Skicka inloggningslänk manuellt till ${profileEmail}.`
            )
          : inviteResult.success
            ? inviteResult.emailSent
              ? t(
                  locale,
                  `Athlete account created and invite sent to ${profileEmail}.`,
                  `Atletkonto skapat och inbjudan skickad till ${profileEmail}.`
                )
              : t(
                  locale,
                  'Athlete account created. Share the invite link via SMS or WhatsApp.',
                  'Atletkonto skapat. Dela inbjudningslänken via SMS eller WhatsApp.'
                )
            : t(
                locale,
                `Athlete account created, but the invite could not be sent: ${inviteResult.error}`,
                `Atletkonto skapat, men inbjudan kunde inte skickas: ${inviteResult.error}`
              ),
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating athlete account', {}, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/athlete-accounts?clientId=xxx
 * Get athlete account for a client
 */
export async function GET(request: NextRequest) {
  try {
    const coach = await requireCoach()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Check access
    const hasAccess = await canAccessClient(coach.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this client' },
        { status: 403 }
      )
    }

    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { clientId },
      include: {
        client: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            language: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(athleteAccount)
  } catch (error) {
    logger.error('Error fetching athlete account', {}, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
