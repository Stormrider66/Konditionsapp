/**
 * Public Join API
 *
 * GET  - Validate invite code and return team info
 * POST - Register athlete and join team
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getAthleteSubscriptionDataForTier, type AthleteTier } from '@/lib/athlete-account-utils'

const VALID_ATHLETE_TIERS: readonly AthleteTier[] = ['FREE', 'STANDARD', 'PRO', 'ELITE']

interface RouteContext {
  params: Promise<{ code: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { code } = await context.params

    const invite = await prisma.invitation.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Ogiltig inbjudningskod' }, { status: 404 })
    }

    if (invite.type !== 'ATHLETE_SIGNUP') {
      return NextResponse.json({ error: 'Ogiltig inbjudningstyp' }, { status: 400 })
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Inbjudan har gått ut' }, { status: 410 })
    }

    if (invite.currentUses >= invite.maxUses) {
      return NextResponse.json({ error: 'Inbjudan är full' }, { status: 410 })
    }

    const meta = invite.metadata as { teamId?: string; teamName?: string } | null

    return NextResponse.json({
      valid: true,
      teamName: meta?.teamName || 'Lag',
      businessId: invite.businessId,
    })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

const joinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  birthDate: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
})

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { code } = await context.params
    const body = await req.json()
    const data = joinSchema.parse(body)

    // Validate invite
    const invite = await prisma.invitation.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!invite || invite.type !== 'ATHLETE_SIGNUP') {
      return NextResponse.json({ error: 'Ogiltig inbjudningskod' }, { status: 404 })
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Inbjudan har gått ut' }, { status: 410 })
    }

    if (invite.currentUses >= invite.maxUses) {
      return NextResponse.json({ error: 'Inbjudan är full' }, { status: 410 })
    }

    const meta = invite.metadata as
      | { teamId?: string; teamName?: string; athleteTier?: string; trialDays?: number }
      | null
    const teamId = meta?.teamId
    const inviteTier: AthleteTier =
      meta?.athleteTier && (VALID_ATHLETE_TIERS as readonly string[]).includes(meta.athleteTier)
        ? (meta.athleteTier as AthleteTier)
        : 'FREE'
    const inviteTrialDays =
      typeof meta?.trialDays === 'number' && meta.trialDays >= 0 ? meta.trialDays : undefined

    // Get team to find the coach (userId)
    let coachUserId: string | null = null
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { userId: true },
      })
      coachUserId = team?.userId || null
    }

    if (!coachUserId) {
      return NextResponse.json({ error: 'Laget hittades inte' }, { status: 404 })
    }

    // Create Supabase auth account
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError || !authData.user) {
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json({ error: 'E-postadressen är redan registrerad. Logga in istället.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError?.message || 'Registrering misslyckades' }, { status: 400 })
    }

    const supabaseUserId = authData.user.id

    // Create User, Client, and AthleteAccount in a transaction
    await prisma.$transaction(async (tx) => {
      // Create User record
      const user = await tx.user.create({
        data: {
          id: supabaseUserId,
          email: data.email,
          name: data.name,
          role: 'ATHLETE',
        },
      })

      // Create Client (athlete profile) under the coach
      const client = await tx.client.create({
        data: {
          userId: coachUserId!,
          businessId: invite.businessId,
          teamId: teamId || null,
          name: data.name,
          email: data.email,
          gender: data.gender || 'MALE',
          birthDate: data.birthDate ? new Date(data.birthDate) : new Date('2000-01-01'),
          height: 175,
          weight: 70,
          isDirect: true,
        },
      })

      // Create AthleteAccount linking User ↔ Client
      await tx.athleteAccount.create({
        data: {
          clientId: client.id,
          userId: user.id,
        },
      })

      // Create athlete subscription at the tier the inviter selected (default FREE).
      await tx.athleteSubscription.create({
        data: {
          clientId: client.id,
          ...getAthleteSubscriptionDataForTier(inviteTier, {
            trialDays: inviteTrialDays,
            businessId: invite.businessId ?? undefined,
          }),
        },
      })

      // Join business if present
      if (invite.businessId) {
        await tx.businessMember.create({
          data: {
            businessId: invite.businessId,
            userId: user.id,
            role: 'MEMBER',
            isActive: true,
          },
        })
      }

      // Update invite usage
      await tx.invitation.update({
        where: { id: invite.id },
        data: {
          currentUses: { increment: 1 },
          usedByClientId: client.id,
        },
      })
    })

    logger.info('Athlete self-registered via invite', {
      code,
      email: data.email,
      teamId,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Join error:', error)
    return NextResponse.json({ error: 'Registrering misslyckades' }, { status: 500 })
  }
}
