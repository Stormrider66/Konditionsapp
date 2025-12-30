// app/api/referrals/validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const validateSchema = z.object({
  code: z.string().min(1, 'Referral code is required'),
})

/**
 * POST /api/referrals/validate
 * Validate a referral code (public endpoint for signup flow)
 * Returns the referrer info if code is valid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = validateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { code } = validationResult.data

    // Find the referral code
    const referralCode = await prisma.referralCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid referral code', valid: false },
        { status: 404 }
      )
    }

    // Check if code is active
    if (!referralCode.isActive) {
      return NextResponse.json(
        { success: false, error: 'This referral code is no longer active', valid: false },
        { status: 400 }
      )
    }

    // Check if code has expired
    if (referralCode.expiresAt && new Date(referralCode.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This referral code has expired', valid: false },
        { status: 400 }
      )
    }

    // Check if code has reached max uses
    if (referralCode.maxUses && referralCode.totalUses >= referralCode.maxUses) {
      return NextResponse.json(
        { success: false, error: 'This referral code has reached its usage limit', valid: false },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        code: referralCode.code,
        referrerName: referralCode.user.name,
        benefit: 'Get 1 month free when you sign up!', // Could be dynamic based on current promotion
      },
    })
  } catch (error) {
    logger.error('Error validating referral code', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate referral code' },
      { status: 500 }
    )
  }
}
