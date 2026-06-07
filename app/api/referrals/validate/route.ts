// app/api/referrals/validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'
import { rateLimitIp } from '@/lib/api/rate-limit'

const validateSchema = z.object({
  code: z.string().min(1, 'Referral code is required'),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * POST /api/referrals/validate
 * Validate a referral code (public endpoint for signup flow)
 * Returns the referrer info if code is valid
 */
export async function POST(request: NextRequest) {
  const locale = resolveRequestLocale(request)
  try {
    const rateLimited = await rateLimitIp(request, {
      limit: 30,
      windowSeconds: 60,
    }, 'referrals:validate')
    if (rateLimited) return rateLimited

    const body = await request.json()

    const validationResult = validateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Referral code is required', 'Värvningskod krävs') },
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
        { success: false, error: t(locale, 'Invalid referral code', 'Ogiltig värvningskod'), valid: false },
        { status: 404 }
      )
    }

    // Check if code is active
    if (!referralCode.isActive) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This referral code is no longer active', 'Den här värvningskoden är inte längre aktiv'), valid: false },
        { status: 400 }
      )
    }

    // Check if code has expired
    if (referralCode.expiresAt && new Date(referralCode.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This referral code has expired', 'Den här värvningskoden har gått ut'), valid: false },
        { status: 400 }
      )
    }

    // Check if code has reached max uses
    if (referralCode.maxUses && referralCode.totalUses >= referralCode.maxUses) {
      return NextResponse.json(
        { success: false, error: t(locale, 'This referral code has reached its usage limit', 'Den här värvningskoden har nått sin användningsgräns'), valid: false },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        code: referralCode.code,
        referrerName: referralCode.user.name,
        benefit: t(locale, 'Get 1 month free when you sign up!', 'Få 1 månad gratis när du registrerar dig!'), // Could be dynamic based on current promotion
      },
    })
  } catch (error) {
    logger.error('Error validating referral code', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to validate referral code', 'Kunde inte validera värvningskoden') },
      { status: 500 }
    )
  }
}
