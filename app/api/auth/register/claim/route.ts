/**
 * Business Claim Registration API
 *
 * POST /api/auth/register/claim - Register and claim an approved business
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { createCoachTrialSubscription } from '@/lib/subscription/feature-access'
import { createClient } from '@/lib/supabase/server'

const claimSchema = z.object({
  code: z.string().min(1, 'Claim code is required'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimited = await rateLimitJsonResponse('claim-registration', ip, {
      limit: 5,
      windowSeconds: 3600,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const data = claimSchema.parse(body)

    // Validate invitation
    const invitation = await prisma.invitation.findUnique({
      where: { code: data.code },
      include: {
        business: true,
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid claim code' }, { status: 400 })
    }

    if (invitation.type !== 'BUSINESS_CLAIM') {
      return NextResponse.json({ error: 'Invalid invitation type' }, { status: 400 })
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: 'This claim code has already been used' }, { status: 400 })
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This claim code has expired' }, { status: 400 })
    }

    if (!invitation.business) {
      return NextResponse.json({ error: 'Business not found for this claim' }, { status: 400 })
    }

    // Create auth user via Supabase
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name },
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    // Create user, business member, and update invitation in a transaction
    await prisma.$transaction(async (tx) => {
      // Create/upsert user record
      const user = await tx.user.upsert({
        where: { id: authData.user!.id },
        update: { name: data.name, role: 'COACH' },
        create: {
          id: authData.user!.id,
          email: data.email,
          name: data.name,
          role: 'COACH',
        },
      })

      // Add as OWNER of the business
      await tx.businessMember.create({
        data: {
          userId: user.id,
          businessId: invitation.business!.id,
          role: 'OWNER',
        },
      })

      // Mark invitation as used
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          usedAt: new Date(),
          currentUses: { increment: 1 },
        },
      })

      // Update application status to COMPLETED
      await tx.businessApplication.updateMany({
        where: { businessId: invitation.business!.id },
        data: { status: 'COMPLETED' },
      })

      // Create coach trial subscription
      await createCoachTrialSubscription(user.id)
    })

    return NextResponse.json({
      success: true,
      businessSlug: invitation.business.slug,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Claim registration error', {}, error)
    return NextResponse.json(
      { error: 'Failed to complete registration' },
      { status: 500 }
    )
  }
}
