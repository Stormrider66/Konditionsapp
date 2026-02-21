/**
 * Business Signup API
 *
 * POST /api/auth/signup-business - Create gym/club account with business
 *
 * Combined endpoint that creates:
 * - Supabase auth user
 * - User record (COACH role)
 * - Business record (GYM or CLUB)
 * - BusinessMember (OWNER)
 * - Coach trial subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimitJsonResponse, getRequestIp } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { createCoachTrialSubscription } from '@/lib/subscription/feature-access'

const signupBusinessSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(2, 'Business name is required'),
  businessType: z.enum(['GYM', 'CLUB']),
  city: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  primarySport: z.string().optional(),
})

/**
 * Generate a URL-safe slug from a business name.
 * Handles Swedish characters and ensures uniqueness.
 */
async function generateUniqueSlug(name: string): Promise<string> {
  let slug = name
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  if (slug.length < 3) slug = slug + '-gym'

  // Ensure uniqueness
  let candidate = slug
  let counter = 1
  while (await prisma.business.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${counter}`
    counter++
  }

  return candidate
}

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request)
    const rateLimited = await rateLimitJsonResponse('auth:signup-business', ip, {
      limit: 5,
      windowSeconds: 3600,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()

    const validationResult = signupBusinessSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, password, businessName, businessType, city, phone, website, primarySport } =
      validationResult.data

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create Supabase auth user
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: 'COACH' },
      },
    })

    if (authError || !authData.user) {
      logger.error('Supabase auth error during business signup', {}, authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    const slug = await generateUniqueSlug(businessName)

    // Create all records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: authData.user!.id,
          email,
          name,
          role: 'COACH',
        },
      })

      const business = await tx.business.create({
        data: {
          name: businessName,
          slug,
          type: businessType,
          city: city || null,
          phone: phone || null,
          website: website || null,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      })

      return { user, business }
    })

    // Create coach trial subscription (outside transaction as it uses its own prisma call)
    await createCoachTrialSubscription(result.user.id, 14)

    const redirectUrl = `/${result.business.slug}/coach/dashboard`

    return NextResponse.json(
      {
        success: true,
        message: 'Business account created successfully.',
        redirectUrl,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Business signup error', {}, error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
