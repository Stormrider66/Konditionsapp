// app/api/athlete-mode/setup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { Gender } from '@prisma/client'
import {
  buildSelfAthleteSubscriptionSeedForUser,
  createSelfAthleteProfileTx,
  ensureAthleteClientDefaultsTx,
} from '@/lib/user-provisioning'

const setupAthleteProfileSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthDate: z.string().transform((str) => new Date(str)),
  height: z.number().positive(),
  weight: z.number().positive(),
})

/**
 * POST /api/athlete-mode/setup
 * Create the coach's personal athlete profile (Client record)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only COACH and ADMIN can set up athlete profile
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only coaches and admins can set up athlete mode' },
        { status: 403 }
      )
    }

    // Check if user already has an athlete profile
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { selfAthleteClientId: true },
    })

    if (existingUser?.selfAthleteClientId) {
      return NextResponse.json(
        { success: false, error: 'Athlete profile already exists' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = setupAthleteProfileSchema.parse(body)
    const subscriptionSeed = await buildSelfAthleteSubscriptionSeedForUser(user.id)
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
      orderBy: { createdAt: 'asc' },
    })

    // Create the Client record, AthleteAccount, subscription defaults, and link to user
    const result = await prisma.$transaction(async (tx) => {
      return createSelfAthleteProfileTx(tx, {
        userId: user.id,
        name: user.name,
        email: user.email,
        gender: validatedData.gender as Gender,
        birthDate: validatedData.birthDate,
        height: validatedData.height,
        weight: validatedData.weight,
        businessId: membership?.businessId ?? null,
        subscriptionSeed,
      })
    })

    logger.info('Coach created self-athlete profile', { userId: user.id, clientId: result.id })

    return NextResponse.json({
      success: true,
      data: {
        clientId: result.id,
        message: 'Athlete profile created successfully',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Error setting up athlete profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to create athlete profile' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/athlete-mode/setup
 * Fix existing coach athlete profile by creating missing AthleteAccount
 */
export async function PATCH() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has a selfAthleteClientId but no AthleteAccount
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { selfAthleteClientId: true },
    })

    const selfAthleteClientId = existingUser?.selfAthleteClientId

    if (!selfAthleteClientId) {
      return NextResponse.json(
        { success: false, error: 'No athlete profile found. Use POST to create one.' },
        { status: 400 }
      )
    }

    const subscriptionSeed = await buildSelfAthleteSubscriptionSeedForUser(user.id)

    // Check if AthleteAccount already exists
    const existingAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
    })

    if (existingAccount) {
      await prisma.$transaction(async (tx) => {
        await ensureAthleteClientDefaultsTx(tx, existingAccount.clientId, {
          subscriptionSeed,
        })
      })
      return NextResponse.json({
        success: true,
        message: 'Athlete profile is already complete',
        data: { clientId: existingAccount.clientId },
      })
    }

    // Create the missing AthleteAccount and any missing athlete-side defaults
    const athleteAccount = await prisma.$transaction(async (tx) => {
      const account = await tx.athleteAccount.create({
        data: {
          userId: user.id,
          clientId: selfAthleteClientId,
        },
      })

      await ensureAthleteClientDefaultsTx(tx, selfAthleteClientId, {
        subscriptionSeed,
      })

      return account
    })

    logger.info('Fixed coach athlete profile defaults', {
      userId: user.id,
      clientId: athleteAccount.clientId,
    })

    return NextResponse.json({
      success: true,
      message: 'Athlete profile repaired successfully',
      data: { clientId: athleteAccount.clientId },
    })
  } catch (error) {
    logger.error('Error fixing athlete profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fix athlete profile' },
      { status: 500 }
    )
  }
}
