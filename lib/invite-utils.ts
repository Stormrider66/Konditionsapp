// lib/invite-utils.ts
// Reusable utility for inviting new users to a business

import 'server-only'

import { prisma } from '@/lib/prisma'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { sendCoachInviteEmail } from '@/lib/email'

type BusinessMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'COACH'

export interface InviteUserResult {
  success: boolean
  userId?: string
  memberId?: string
  error?: string
  emailSent?: boolean
}

/**
 * Invite a new user to a business. Creates Supabase Auth account + DB records.
 *
 * If the user already exists in DB by email, just adds them as a BusinessMember.
 * If the user is new, creates Supabase Auth account (no password), DB User + BusinessMember,
 * generates a recovery link, and sends an invite email.
 */
export async function inviteUserToBusiness({
  email,
  name,
  businessId,
  role,
}: {
  email: string
  name: string
  businessId: string
  role: BusinessMemberRole
}): Promise<InviteUserResult> {
  try {
    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    // Check if user already exists in DB
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    })

    if (existingUser) {
      // User exists - just add as BusinessMember
      const existingMember = await prisma.businessMember.findUnique({
        where: {
          businessId_userId: {
            businessId,
            userId: existingUser.id,
          },
        },
      })

      if (existingMember) {
        return { success: false, error: 'Användaren är redan medlem i denna verksamhet' }
      }

      const member = await prisma.businessMember.create({
        data: {
          businessId,
          userId: existingUser.id,
          role,
          isActive: true,
          acceptedAt: new Date(),
        },
      })

      return { success: true, userId: existingUser.id, memberId: member.id }
    }

    // New user - create Supabase Auth account
    const supabaseAdmin = createAdminSupabaseClient()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'COACH',
      },
    })

    if (authError || !authData.user) {
      logger.error('Invite: auth user creation failed', { email }, authError)
      return { success: false, error: `Kunde inte skapa konto: ${authError?.message}` }
    }

    // Create DB records in a transaction
    let memberId: string
    try {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: authData.user.id,
            email,
            name,
            role: 'COACH',
            language: 'sv',
          },
        })

        const member = await tx.businessMember.create({
          data: {
            businessId,
            userId: user.id,
            role,
            isActive: true,
            acceptedAt: new Date(),
          },
        })

        return { userId: user.id, memberId: member.id }
      })

      memberId = result.memberId
    } catch (txError) {
      // Clean up Supabase Auth user if DB transaction failed
      logger.error('Invite: DB transaction failed, cleaning up auth user', { email }, txError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch((cleanupErr) => {
        logger.error('Invite: failed to clean up auth user', { userId: authData.user.id }, cleanupErr)
      })
      return { success: false, error: 'Databasfel vid skapande av användare' }
    }

    // Generate recovery link for password setup
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/reset-password`,
      },
    })

    if (linkError) {
      logger.error('Invite: recovery link generation failed', { email }, linkError)
    }

    // Use generated recovery link, or fall back to forgot-password page
    const setPasswordUrl = linkData?.properties?.action_link
      || `${appUrl}/forgot-password`

    // Always send invite email
    const emailResult = await sendCoachInviteEmail(email, name, business.name, setPasswordUrl).catch((emailErr) => {
      logger.error('Invite: failed to send invite email', { email }, emailErr)
      return { success: false, error: 'Email send failed' }
    })

    const emailSent = emailResult?.success ?? false
    if (!emailSent) {
      logger.warn('Invite: user created but invite email not sent', { email, userId: authData.user.id })
    }

    return { success: true, userId: authData.user.id, memberId, emailSent }
  } catch (error) {
    logger.error('Invite: unexpected error', { email, businessId }, error)
    return { success: false, error: 'Ett oväntat fel inträffade' }
  }
}
