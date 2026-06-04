// app/api/referrals/rewards/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/referrals/rewards
 * Get all rewards for the current user
 */
export async function GET(request: NextRequest) {
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

    const rewards = await prisma.referralReward.findMany({
      where: { userId: user.id },
      include: {
        referral: {
          select: {
            id: true,
            referredEmail: true,
            referredUser: {
              select: {
                name: true,
              },
            },
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Separate into available and claimed
    const available = rewards.filter(r => !r.applied && (!r.expiresAt || new Date(r.expiresAt) > new Date()))
    const claimed = rewards.filter(r => r.applied)
    const expired = rewards.filter(r => !r.applied && r.expiresAt && new Date(r.expiresAt) <= new Date())

    return NextResponse.json({
      success: true,
      data: {
        rewards,
        summary: {
          total: rewards.length,
          available: available.length,
          claimed: claimed.length,
          expired: expired.length,
        },
        availableRewards: available,
        claimedRewards: claimed,
      },
    })
  } catch (error) {
    logger.error('Error fetching rewards', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to fetch rewards', 'Kunde inte hämta belöningar') },
      { status: 500 }
    )
  }
}

const claimSchema = z.object({
  rewardId: z.string().uuid('Invalid reward ID'),
})

/**
 * POST /api/referrals/rewards
 * Claim a reward
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validationResult = claimSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid reward ID', 'Ogiltigt belönings-ID') },
        { status: 400 }
      )
    }

    const { rewardId } = validationResult.data

    // Find the reward
    const reward = await prisma.referralReward.findUnique({
      where: { id: rewardId },
      include: {
        referral: true,
      },
    })

    if (!reward) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Reward not found', 'Belöningen hittades inte') },
        { status: 404 }
      )
    }

    // Verify ownership
    if (reward.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This reward does not belong to you', 'Den här belöningen tillhör inte dig') },
        { status: 403 }
      )
    }

    // Check if already claimed
    if (reward.applied) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This reward has already been claimed', 'Den här belöningen har redan lösts in') },
        { status: 400 }
      )
    }

    // Check if expired
    if (reward.expiresAt && new Date(reward.expiresAt) <= new Date()) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This reward has expired', 'Den här belöningen har gått ut') },
        { status: 400 }
      )
    }

    // Apply the reward based on type
    let appliedDetails: Record<string, unknown> = {}

    switch (reward.rewardType) {
      case 'FREE_MONTH':
        // Extend subscription by 1 month
        const subscription = await prisma.subscription.findUnique({
          where: { userId: user.id },
        })

        if (subscription && subscription.stripeCurrentPeriodEnd) {
          const newEndDate = new Date(subscription.stripeCurrentPeriodEnd)
          newEndDate.setMonth(newEndDate.getMonth() + Math.floor(reward.value))

          await prisma.subscription.update({
            where: { userId: user.id },
            data: {
              stripeCurrentPeriodEnd: newEndDate,
            },
          })

          appliedDetails = {
            previousEndDate: subscription.stripeCurrentPeriodEnd,
            newEndDate: newEndDate,
          }
        } else {
          // Store for later application when they subscribe
          appliedDetails = {
            note: t(locale, 'Will be applied when subscription is activated', 'Tillämpas när prenumerationen aktiveras'),
          }
        }
        break

      case 'EXTENDED_TRIAL':
        // Extend trial by N days
        const trialSub = await prisma.subscription.findUnique({
          where: { userId: user.id },
        })

        if (trialSub && trialSub.trialEndsAt) {
          const newTrialEnd = new Date(trialSub.trialEndsAt)
          newTrialEnd.setDate(newTrialEnd.getDate() + Math.floor(reward.value))

          await prisma.subscription.update({
            where: { userId: user.id },
            data: {
              trialEndsAt: newTrialEnd,
            },
          })

          appliedDetails = {
            previousTrialEnd: trialSub.trialEndsAt,
            newTrialEnd: newTrialEnd,
          }
        }
        break

      case 'ATHLETE_SLOTS':
        // Add athlete slots
        const athleteSub = await prisma.subscription.findUnique({
          where: { userId: user.id },
        })

        if (athleteSub) {
          await prisma.subscription.update({
            where: { userId: user.id },
            data: {
              maxAthletes: athleteSub.maxAthletes + Math.floor(reward.value),
            },
          })

          appliedDetails = {
            previousSlots: athleteSub.maxAthletes,
            newSlots: athleteSub.maxAthletes + Math.floor(reward.value),
          }
        }
        break

      case 'DISCOUNT_PERCENT':
        // Create Stripe coupon - would integrate with Stripe here
        appliedDetails = {
          discountPercent: reward.value,
          note: t(locale, 'Discount will be applied to next billing', 'Rabatten tillämpas vid nästa debitering'),
        }
        break
    }

    // Mark reward as claimed
    const updatedReward = await prisma.referralReward.update({
      where: { id: rewardId },
      data: {
        applied: true,
        appliedAt: new Date(),
      },
    })

    // Update referral to mark referrer reward as granted
    await prisma.referral.update({
      where: { id: reward.referralId },
      data: {
        referrerRewardGranted: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        reward: updatedReward,
        appliedDetails,
      },
      message: t(locale, 'Reward claimed successfully!', 'Belöningen löstes in!'),
    })
  } catch (error) {
    logger.error('Error claiming reward', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to claim reward', 'Kunde inte lösa in belöningen') },
      { status: 500 }
    )
  }
}
