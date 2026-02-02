// lib/athlete-account-utils.ts
import { prisma } from '@/lib/prisma'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { AthleteAccount, Client, User } from '@prisma/client'

export interface CreateAthleteAccountResult {
  success: boolean
  athleteAccount?: AthleteAccount & { client: Client; user: User }
  /** @deprecated Passwords are no longer returned - sent via email only */
  temporaryPassword?: string
  error?: string
}

/**
 * Generate a random temporary password
 */
export function generateTemporaryPassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

/**
 * Create an athlete account for a client
 * This is the shared logic used by both the API endpoint and automatic creation
 */
export async function createAthleteAccountForClient(
  clientId: string,
  coachId: string,
  options?: {
    temporaryPassword?: string
    notificationPrefs?: {
      email?: boolean
      push?: boolean
      workoutReminders?: boolean
    }
  }
): Promise<CreateAthleteAccountResult> {
  try {
    // Get client details
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return { success: false, error: 'Client not found' }
    }

    // Check if client has email
    if (!client.email) {
      return { success: false, error: 'Client must have an email address to create an athlete account' }
    }

    // Check if client already has an athlete account
    const existingAccount = await prisma.athleteAccount.findUnique({
      where: { clientId },
    })

    if (existingAccount) {
      return { success: false, error: 'This client already has an athlete account' }
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: client.email },
    })

    if (existingUser) {
      return { success: false, error: 'This email is already in use' }
    }

    // Get coach details for language inheritance
    const coach = await prisma.user.findUnique({
      where: { id: coachId },
    })

    if (!coach) {
      return { success: false, error: 'Coach not found' }
    }

    // Generate temporary password
    const password = options?.temporaryPassword || generateTemporaryPassword()

    // Create user account in Supabase using server-only admin client
    const supabaseAdmin = createAdminSupabaseClient()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: client.email,
      password,
      email_confirm: true, // Auto-confirm email for accounts created by coaches
      user_metadata: {
        name: client.name,
        role: 'ATHLETE',
      },
    })

    if (authError || !authData.user) {
      logger.error('Athlete account creation auth error', { email: client.email, clientId }, authError)
      return { success: false, error: `Failed to create athlete account: ${authError?.message}` }
    }

    // Create user in our database
    const athleteUser = await prisma.user.create({
      data: {
        id: authData.user.id,
        email: client.email,
        name: client.name,
        role: 'ATHLETE',
        language: coach.language, // Inherit coach's language
      },
    })

    // Create athlete account linking
    const athleteAccount = await prisma.athleteAccount.create({
      data: {
        clientId,
        userId: athleteUser.id,
        notificationPrefs: options?.notificationPrefs || {
          email: true,
          push: false,
          workoutReminders: true,
        },
      },
      include: {
        client: true,
        user: true,
      },
    })

    // Update subscription athlete count
    const subscription = await prisma.subscription.findUnique({
      where: { userId: coachId },
    })

    if (subscription) {
      await prisma.subscription.update({
        where: { userId: coachId },
        data: {
          currentAthletes: {
            increment: 1,
          },
        },
      })
    }

    // Note: Password is NOT returned in the result for security
    // It should only be sent via email
    return {
      success: true,
      athleteAccount,
    }
  } catch (error) {
    logger.error('Error creating athlete account', { clientId, coachId }, error)
    return {
      success: false,
      error: 'Internal server error while creating athlete account',
    }
  }
}
