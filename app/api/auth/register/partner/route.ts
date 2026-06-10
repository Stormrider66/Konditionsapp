import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { rateLimitJsonResponse, getRequestIp } from '@/lib/api/rate-limit'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  language: z.enum(['sv', 'en']).default('en'),
  businessSlug: z.string().min(1, 'Business slug is required'),
  referralSource: z.enum(['link', 'code', 'api', 'manual']).default('link'),
  referralCode: z.string().optional(),
})

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const ip = getRequestIp(request)
    const rateLimited = await rateLimitJsonResponse('auth:register-partner', ip, {
      limit: 5,
      windowSeconds: 60 * 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const data = registerSchema.parse(body)
    locale = resolveRequestLocale(request, data.language)

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
        { success: false, error: t(locale, 'Partner not found', 'Partnern hittades inte') },
        { status: 404 }
      )
    }

    // Check if business has active contract
    if (!business.enterpriseContract || business.enterpriseContract.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: t(locale, 'Partner registration not available', 'Partnerregistrering är inte tillgänglig') },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: t(locale, 'An account with this email already exists', 'Det finns redan ett konto med den här e-postadressen') },
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
        { success: false, error: t(locale, 'Failed to create account', 'Kunde inte skapa konto') },
        { status: 500 }
      )
    }

    // Calculate revenue share (business gets revenueSharePercent, platform gets the rest)
    const businessShare = business.enterpriseContract.revenueSharePercent
    const platformShare = 100 - businessShare
    const referer = request.headers.get('referer')

    // Wrap all DB operations in a transaction to prevent partial state
    let user
    try {
      user = await prisma.$transaction(async (tx) => {
        // Create user in database with referral tracking
        const newUser = await tx.user.create({
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
        await tx.partnerReferral.create({
          data: {
            businessId: business.id,
            userId: newUser.id,
            referralCode: data.referralCode,
            referralSource: data.referralSource,
            landingPage: referer,
            status: 'PENDING', // Will become ACTIVE when they subscribe
            revenueSharePercent: businessShare,
            platformSharePercent: platformShare,
          }
        })

        // Add user as MEMBER of the business
        await tx.businessMember.create({
          data: {
            businessId: business.id,
            userId: newUser.id,
            role: 'MEMBER',
            isActive: true,
            acceptedAt: new Date(),
          }
        })

        // Create required athlete entities so athlete features (AI chat, onboarding, etc.)
        // work immediately after partner registration.
        const client = await tx.client.create({
          data: {
            userId: newUser.id,
            businessId: business.id,
            name: newUser.name || newUser.email,
            email: newUser.email,
            gender: 'MALE',
            birthDate: new Date('1990-01-01'),
            height: 170,
            weight: 70,
            isDirect: true,
          },
        })

        await tx.athleteAccount.create({
          data: {
            userId: newUser.id,
            clientId: client.id,
          },
        })

        await tx.athleteSubscription.create({
          data: {
            clientId: client.id,
            tier: 'FREE',
            status: 'ACTIVE',
            paymentSource: 'DIRECT',
            aiChatEnabled: true,
            aiChatMessagesLimit: -1, // message counters retired; SEK allowance is the gate
            videoAnalysisEnabled: false,
            garminEnabled: false,
            stravaEnabled: false,
          },
        })

        await tx.agentPreferences.create({
          data: {
            clientId: client.id,
            autonomyLevel: 'ADVISORY',
            allowWorkoutModification: false,
            allowRestDayInjection: false,
            maxIntensityReduction: 10,
            dailyBriefingEnabled: false,
            proactiveNudgesEnabled: false,
          },
        })

        await tx.sportProfile.create({
          data: {
            clientId: client.id,
            primarySport: 'RUNNING',
            onboardingCompleted: false,
            onboardingStep: 0,
          },
        })

        return newUser
      })
    } catch (txError) {
      // Clean up Supabase user if DB transaction failed
      logger.error('Partner registration DB transaction failed, cleaning up auth user', { email: data.email }, txError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch((cleanupErr: unknown) => {
        logger.error('Failed to clean up Supabase user after transaction failure', { userId: authData.user.id }, cleanupErr)
      })
      throw txError
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        business: business.name,
      },
      message: t(locale, 'Account created successfully', 'Kontot har skapats')
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: error.flatten() },
        { status: 400 }
      )
    }

    return handleApiError(error, 'POST /api/auth/register/partner')
  }
}
