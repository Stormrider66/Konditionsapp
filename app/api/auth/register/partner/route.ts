import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  language: z.enum(['sv', 'en']).default('sv'),
  businessSlug: z.string().min(1, 'Business slug is required'),
  referralSource: z.enum(['link', 'code', 'api', 'manual']).default('link'),
  referralCode: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    // Find the business
    const business = await prisma.business.findUnique({
      where: { slug: data.businessSlug, isActive: true },
      include: {
        enterpriseContract: {
          select: {
            id: true,
            status: true,
            revenueSharePercent: true,
          }
        }
      }
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Check if business has active contract
    if (!business.enterpriseContract || business.enterpriseContract.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Partner registration not available' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth using server-only admin client
    const supabaseAdmin = createAdminSupabaseClient()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false, // Require email verification for security
      user_metadata: {
        name: data.name,
        language: data.language,
        referred_by_business: business.slug,
      }
    })

    if (authError || !authData?.user) {
      logger.error('Partner registration auth error', { email: data.email }, authError)
      return NextResponse.json(
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // Calculate revenue share (business gets revenueSharePercent, platform gets the rest)
    const businessShare = business.enterpriseContract.revenueSharePercent
    const platformShare = 100 - businessShare

    // Create user in database with referral tracking
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        role: 'ATHLETE', // Partner referrals are typically athletes
        language: data.language,
        referredByBusinessId: business.id,
      }
    })

    // Create partner referral record
    await prisma.partnerReferral.create({
      data: {
        businessId: business.id,
        userId: user.id,
        referralCode: data.referralCode,
        referralSource: data.referralSource,
        landingPage: request.headers.get('referer'),
        status: 'PENDING', // Will become ACTIVE when they subscribe
        revenueSharePercent: businessShare,
        platformSharePercent: platformShare,
      }
    })

    // Add user as MEMBER of the business
    await prisma.businessMember.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: 'MEMBER',
        isActive: true,
        acceptedAt: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        business: business.name,
      },
      message: 'Account created successfully'
    }, { status: 201 })

  } catch (error) {
    return handleApiError(error, 'POST /api/auth/register/partner')
  }
}
