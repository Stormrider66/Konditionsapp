// app/api/referrals/apply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { sendReferralRewardEmail } from '@/lib/email'
import { sendEmailAfter } from '@/lib/email/after'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

const applySchema = z.object({
  code: z.string().min(1, 'Referral code is required'),
  email: z.string().email('Valid email is required'),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * POST /api/referrals/apply
 * Apply a referral code for a new signup
 * Creates a pending referral record
 * Called during signup process
 */
export async function POST(request: NextRequest) {
  const locale = resolveRequestLocale(request)
  try {
    const body = await request.json()

    const validationResult = applySchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Referral code and a valid email are required', 'Värvningskod och giltig e-postadress krävs') },
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
        { success: false, error: t(locale, 'Invalid referral code', 'Ogiltig värvningskod') },
        { status: 404 }
      )
    }

    // Validate code is still usable
    if (!referralCode.isActive) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This referral code is no longer active', 'Den här värvningskoden är inte längre aktiv') },
        { status: 400 }
      )
    }

    if (referralCode.expiresAt && new Date(referralCode.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This referral code has expired', 'Den här värvningskoden har gått ut') },
        { status: 400 }
      )
    }

    if (referralCode.maxUses && referralCode.totalUses >= referralCode.maxUses) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This referral code has reached its usage limit', 'Den här värvningskoden har nått sin användningsgräns') },
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
        message: t(locale, 'Referral already applied', 'Värvningen är redan registrerad'),
      })
    }

    // Check user isn't referring themselves
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser && existingUser.id === referralCode.userId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'You cannot refer yourself', 'Du kan inte värva dig själv') },
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
        message: t(locale, 'Referral applied successfully', 'Värvningen registrerades'),
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error applying referral', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to apply referral', 'Kunde inte registrera värvningen') },
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
  let locale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    locale = resolveRequestLocale(request, user?.language)

    if (!user) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
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
        message: t(locale, 'No pending referral found', 'Ingen väntande värvning hittades'),
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

    // Send email notification to referrer (after response — non-critical)
    const referrer = referral.referralCode.user
    if (referrer.email) {
      const referredName = user.name || user.email.split('@')[0]
      const referrerEmail = referrer.email
      const referrerName = referrer.name || referrer.email.split('@')[0]
      sendEmailAfter(
        () => sendReferralRewardEmail(
          referrerEmail,
          referrerName,
          referredName,
          'FREE_MONTH',
          1,
          'sv',
        ),
        { route: 'referrals/apply', emailKind: 'referral_reward' },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        referralId: updatedReferral.id,
        status: 'COMPLETED',
        yourReward: {
          type: 'EXTENDED_TRIAL',
          value: 7,
          description: t(locale, '7 extra trial days', '7 extra provdagar'),
        },
      },
      message: t(
        locale,
        'Referral completed! You received 7 extra trial days.',
        'Värvningen slutfördes! Du fick 7 extra provdagar.'
      ),
    })
  } catch (error) {
    logger.error('Error completing referral', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to complete referral', 'Kunde inte slutföra värvningen') },
      { status: 500 }
    )
  }
}
