// app/api/referrals/rewards/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'

/**
 * GET /api/referrals/rewards
 * Get all rewards for the current user
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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
      { success: false, error: 'Failed to fetch rewards' },
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
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = claimSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
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
        { success: false, error: 'Reward not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (reward.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'This reward does not belong to you' },
        { status: 403 }
      )
    }

    // Check if already claimed
    if (reward.applied) {
      return NextResponse.json(
        { success: false, error: 'This reward has already been claimed' },
        { status: 400 }
      )
    }

    // Check if expired
    if (reward.expiresAt && new Date(reward.expiresAt) <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'This reward has expired' },
        { status: 400 }
      )
    }

    // Apply the reward based on type
    let appliedDetails: any = {}

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
            note: 'Will be applied when subscription is activated',
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
          note: 'Discount will be applied to next billing',
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
      message: `Reward claimed successfully!`,
    })
  } catch (error) {
    logger.error('Error claiming reward', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to claim reward' },
      { status: 500 }
    )
  }
}
