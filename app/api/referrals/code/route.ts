// app/api/referrals/code/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * Generate a unique referral code
 * Format: STAR-XXXX or NAME-XXXX
 */
function generateReferralCode(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X')
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${suffix}`
}

/**
 * GET /api/referrals/code
 * Get the current user's referral code
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

    // Only coaches can have referral codes
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only coaches can have referral codes' },
        { status: 403 }
      )
    }

    const referralCode = await prisma.referralCode.findUnique({
      where: { userId: user.id },
      include: {
        referrals: {
          select: {
            id: true,
            status: true,
            referredEmail: true,
            createdAt: true,
            completedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!referralCode) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No referral code found. Create one to start referring.',
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: referralCode.id,
        code: referralCode.code,
        isActive: referralCode.isActive,
        totalUses: referralCode.totalUses,
        successfulReferrals: referralCode.successfulReferrals,
        maxUses: referralCode.maxUses,
        expiresAt: referralCode.expiresAt,
        createdAt: referralCode.createdAt,
        recentReferrals: referralCode.referrals,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://star-thomson.se'}/register?ref=${referralCode.code}`,
      },
    })
  } catch (error) {
    logger.error('Error fetching referral code', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch referral code' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/referrals/code
 * Create a referral code for the current user
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

    // Only coaches can create referral codes
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only coaches can create referral codes' },
        { status: 403 }
      )
    }

    // Check if user already has a referral code
    const existingCode = await prisma.referralCode.findUnique({
      where: { userId: user.id },
    })

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: 'You already have a referral code' },
        { status: 400 }
      )
    }

    // Generate unique code
    let code = generateReferralCode(user.name)
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const existing = await prisma.referralCode.findUnique({
        where: { code },
      })
      if (!existing) break
      code = generateReferralCode(user.name)
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate unique code' },
        { status: 500 }
      )
    }

    // Optionally allow custom code from request body
    const body = await request.json().catch(() => ({}))
    if (body.customCode) {
      const customCode = body.customCode.toUpperCase().replace(/[^A-Z0-9-]/g, '')
      if (customCode.length >= 4 && customCode.length <= 20) {
        const existing = await prisma.referralCode.findUnique({
          where: { code: customCode },
        })
        if (!existing) {
          code = customCode
        }
      }
    }

    const referralCode = await prisma.referralCode.create({
      data: {
        userId: user.id,
        code,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: referralCode.id,
          code: referralCode.code,
          isActive: referralCode.isActive,
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://star-thomson.se'}/register?ref=${referralCode.code}`,
        },
        message: 'Referral code created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating referral code', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to create referral code' },
      { status: 500 }
    )
  }
}
