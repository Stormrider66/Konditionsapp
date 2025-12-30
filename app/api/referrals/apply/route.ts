// app/api/referrals/apply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { sendReferralRewardEmail } from '@/lib/email'
import { z } from 'zod'

const applySchema = z.object({
  code: z.string().min(1, 'Referral code is required'),
  email: z.string().email('Valid email is required'),
})

/**
 * POST /api/referrals/apply
 * Apply a referral code for a new signup
 * Creates a pending referral record
 * Called during signup process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = applySchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { code, email } = validationResult.data
    const normalizedCode = code.toUpperCase()
    const normalizedEmail = email.toLowerCase()

    // Find the referral code
    const referralCode = await prisma.referralCode.findUnique({
      where: { code: normalizedCode },
    })

    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid referral code' },
        { status: 404 }
      )
    }

    // Validate code is still usable
    if (!referralCode.isActive) {
      return NextResponse.json(
        { success: false, error: 'This referral code is no longer active' },
        { status: 400 }
      )
    }

    if (referralCode.expiresAt && new Date(referralCode.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This referral code has expired' },
        { status: 400 }
      )
    }

    if (referralCode.maxUses && referralCode.totalUses >= referralCode.maxUses) {
      return NextResponse.json(
        { success: false, error: 'This referral code has reached its usage limit' },
        { status: 400 }
      )
    }

    // Check if this email has already been referred with this code
    const existingReferral = await prisma.referral.findUnique({
      where: {
        referralCodeId_referredEmail: {
          referralCodeId: referralCode.id,
          referredEmail: normalizedEmail,
        },
      },
    })

    if (existingReferral) {
      // Already exists, just return success
      return NextResponse.json({
        success: true,
        data: { referralId: existingReferral.id },
        message: 'Referral already applied',
      })
    }

    // Check user isn't referring themselves
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser && existingUser.id === referralCode.userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot refer yourself' },
        { status: 400 }
      )
    }

    // Create the referral record
    const referral = await prisma.referral.create({
      data: {
        referralCodeId: referralCode.id,
        referrerUserId: referralCode.userId,
        referredEmail: normalizedEmail,
        referredUserId: existingUser?.id || null,
        status: 'PENDING',
        signupAt: new Date(),
      },
    })

    // Increment the totalUses counter
    await prisma.referralCode.update({
      where: { id: referralCode.id },
      data: { totalUses: { increment: 1 } },
    })

    return NextResponse.json(
      {
        success: true,
        data: { referralId: referral.id },
        message: 'Referral applied successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error applying referral', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to apply referral' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/referrals/apply
 * Complete a referral when user finishes signup/subscription
 * Creates rewards for both referrer and referred user
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find pending referral for this user's email
    const referral = await prisma.referral.findFirst({
      where: {
        referredEmail: user.email.toLowerCase(),
        status: 'PENDING',
      },
      include: {
        referralCode: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!referral) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No pending referral found',
      })
    }

    // Update referral to completed
    const updatedReferral = await prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredUserId: user.id,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Update successful referrals counter
    await prisma.referralCode.update({
      where: { id: referral.referralCodeId },
      data: { successfulReferrals: { increment: 1 } },
    })

    // Create rewards for both parties
    // Referrer gets 1 free month
    await prisma.referralReward.create({
      data: {
        referralId: referral.id,
        userId: referral.referrerUserId,
        rewardType: 'FREE_MONTH',
        value: 1, // 1 month
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days to claim
      },
    })

    // Referred user gets extended trial (7 extra days)
    await prisma.referralReward.create({
      data: {
        referralId: referral.id,
        userId: user.id,
        rewardType: 'EXTENDED_TRIAL',
        value: 7, // 7 extra days
        applied: true, // Auto-applied
        appliedAt: new Date(),
      },
    })

    // Update referral flags
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredRewardGranted: true,
      },
    })

    // Send email notification to referrer
    const referrer = referral.referralCode.user
    if (referrer.email) {
      const referredName = user.name || user.email.split('@')[0]
      try {
        await sendReferralRewardEmail(
          referrer.email,
          referrer.name || referrer.email.split('@')[0],
          referredName,
          'FREE_MONTH',
          1,
          'sv' // Default to Swedish, could be determined from user preferences
        )
        logger.info('Referral reward email sent', { referrerId: referrer.id, referredEmail: user.email })
      } catch (emailError) {
        // Don't fail the whole request if email fails
        logger.error('Failed to send referral reward email', { referrerId: referrer.id }, emailError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        referralId: updatedReferral.id,
        status: 'COMPLETED',
        yourReward: {
          type: 'EXTENDED_TRIAL',
          value: 7,
          description: '7 extra trial days',
        },
      },
      message: 'Referral completed! You received 7 extra trial days.',
    })
  } catch (error) {
    logger.error('Error completing referral', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete referral' },
      { status: 500 }
    )
  }
}
