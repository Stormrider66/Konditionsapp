import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Gender } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { sendWelcomeEmail } from '@/lib/email'
import {
  createSelfAthleteProfileTx,
  getCoachTrialSubscriptionData,
} from '@/lib/user-provisioning'

const signupPhysioSchema = z.object({
  name: z.string().min(1),
  createAthleteProfile: z.boolean().default(false),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  birthDate: z.string().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
}).superRefine((data, ctx) => {
  if (!data.createAthleteProfile) return

  if (!data.gender) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gender'], message: 'Gender is required when creating an athlete profile' })
  }
  if (!data.birthDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['birthDate'], message: 'Birth date is required when creating an athlete profile' })
  }
  if (!data.height) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['height'], message: 'Height is required when creating an athlete profile' })
  }
  if (!data.weight) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weight'], message: 'Weight is required when creating an athlete profile' })
  }
})

export async function POST(request: NextRequest) {
  let createdFreshUser = false
  let authUserId: string | null = null

  try {
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser?.id || !supabaseUser.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    authUserId = supabaseUser.id
    const supabaseEmail = supabaseUser.email
    const body = await request.json().catch(() => ({}))
    const validation = signupPhysioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const {
      name,
      createAthleteProfile,
      gender,
      birthDate,
      height,
      weight,
    } = validation.data

    const existingUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: {
        id: true,
        role: true,
        selfAthleteClientId: true,
        subscription: { select: { userId: true } },
      },
    })

    const emailConflict = await prisma.user.findUnique({
      where: { email: supabaseEmail },
      select: { id: true },
    })

    if (emailConflict && emailConflict.id !== supabaseUser.id) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    const trialSubscriptionData = getCoachTrialSubscriptionData(supabaseUser.id)

    const result = await prisma.$transaction(async (tx) => {
      if (existingUser) {
        const updatedUser = await tx.user.update({
          where: { id: supabaseUser.id },
          data: {
            name,
            role: 'PHYSIO',
            language: 'sv',
          },
        })

        if (!existingUser.subscription) {
          await tx.subscription.create({ data: trialSubscriptionData })
        }

        if (createAthleteProfile && !existingUser.selfAthleteClientId) {
          await createSelfAthleteProfileTx(tx, {
            userId: updatedUser.id,
            name,
            email: supabaseEmail,
            gender: gender as Gender,
            birthDate: new Date(birthDate as string),
            height: height as number,
            weight: weight as number,
            subscriptionSeed: {
              tier: 'PRO',
              status: 'TRIAL',
              paymentSource: 'DIRECT',
              trialEndsAt: trialSubscriptionData.trialEndsAt,
            },
          })
        }

        return updatedUser
      }

      createdFreshUser = true

      const createdUser = await tx.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseEmail,
          name,
          role: 'PHYSIO',
          language: 'sv',
        },
      })

      await tx.subscription.create({ data: trialSubscriptionData })

      if (createAthleteProfile) {
        await createSelfAthleteProfileTx(tx, {
          userId: createdUser.id,
          name,
          email: supabaseEmail,
          gender: gender as Gender,
          birthDate: new Date(birthDate as string),
          height: height as number,
          weight: weight as number,
          subscriptionSeed: {
            tier: 'PRO',
            status: 'TRIAL',
            paymentSource: 'DIRECT',
            trialEndsAt: trialSubscriptionData.trialEndsAt,
          },
        })
      }

      return createdUser
    })

    try {
      await sendWelcomeEmail(supabaseEmail, name, 'sv')
    } catch (emailError) {
      logger.error('Failed to send physio welcome email', { userId: result.id }, emailError)
    }

    return NextResponse.json(
      { success: true, data: { id: result.id, role: 'PHYSIO' } },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Physio signup provisioning error', { authUserId }, error)

    if (createdFreshUser && authUserId) {
      const supabaseAdmin = createAdminSupabaseClient()
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((cleanupError) => {
        logger.error('Failed to clean up auth user after physio signup failure', { authUserId }, cleanupError)
      })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create physio account' },
      { status: 500 }
    )
  }
}
