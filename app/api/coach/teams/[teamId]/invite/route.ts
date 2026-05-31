/**
 * Team Invite Link API
 *
 * POST - Generate a new invite link for athletes to join a team
 * GET  - Get the current active invite link for a team
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { resolveHockeyBetaSubscriptionInput } from '@/lib/hockey-beta'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase() // 8 chars, e.g. "A3F2B1C9"
}

export async function GET(_req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const { teamId } = await context.params

    // Verify coach owns team
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
    })
    if (!team) return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })

    // Get business context
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    // Find active invite for this team
    const invite = await prisma.invitation.findFirst({
      where: {
        type: 'ATHLETE_SIGNUP',
        businessId: membership?.businessId,
        metadata: { path: ['teamId'], equals: teamId },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invite })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    return NextResponse.json({ error: t(locale, 'Failed to fetch invite link', 'Kunde inte hämta inbjudningslänken') }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const { teamId } = await context.params

    // Verify coach owns team
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: { id: true, name: true },
    })
    if (!team) return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    const body = await req.json().catch(() => ({}))
    const maxUses = body.maxUses || 50
    const expiresInDays = body.expiresInDays || 30
    const betaSubscriptionInput = await resolveHockeyBetaSubscriptionInput({
      businessId: membership?.businessId,
      teamId: team.id,
      fallbackTier: 'FREE',
    })

    const invite = await prisma.invitation.create({
      data: {
        code: generateInviteCode(),
        type: 'ATHLETE_SIGNUP',
        senderId: user.id,
        businessId: membership?.businessId,
        maxUses,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
        metadata: {
          teamId: team.id,
          teamName: team.name,
          ...(betaSubscriptionInput.betaApplied
            ? {
                athleteTier: betaSubscriptionInput.tier,
                trialDays: betaSubscriptionInput.trialDays,
                hockeyBeta: true,
              }
            : {}),
        },
      },
    })

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Invite creation error:', error)
    return NextResponse.json({ error: t(locale, 'Failed to create invite link', 'Kunde inte skapa inbjudningslänken') }, { status: 500 })
  }
}
