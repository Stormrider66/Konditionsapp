// lib/athlete-account-utils.ts
import { prisma } from '@/lib/prisma'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { ATHLETE_TIER_FEATURES } from '@/lib/subscription/feature-access'
import { resolveHockeyBetaSubscriptionInput } from '@/lib/hockey-beta'
import { syncClientSportProfileToTeam } from '@/lib/coach/team-sport-profile'
import type { AthleteAccount, Client, User } from '@prisma/client'

const COACH_CREATED_ATHLETE_TRIAL_DAYS = 14

export type AthleteTier = 'FREE' | 'STANDARD' | 'PRO' | 'ELITE'

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
 * Build AthleteSubscription column values for a given tier.
 * STANDARD with no explicit trialDays falls back to a 14-day trial
 * (default for coach-created athletes — preserves existing onboarding UX).
 */
export function getAthleteSubscriptionDataForTier(
  tier: AthleteTier,
  options?: { trialDays?: number; businessId?: string },
) {
  const features = ATHLETE_TIER_FEATURES[tier]

  // Default trial only applies to STANDARD when caller didn't specify
  const trialDays =
    options?.trialDays ?? (tier === 'STANDARD' ? COACH_CREATED_ATHLETE_TRIAL_DAYS : 0)

  return {
    tier,
    status: trialDays > 0 ? ('TRIAL' as const) : ('ACTIVE' as const),
    paymentSource: options?.businessId ? ('BUSINESS' as const) : ('DIRECT' as const),
    businessId: options?.businessId ?? null,
    customAiAllowanceSek: null as number | null,
    trialEndsAt:
      trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null,
    aiChatEnabled: features.ai_chat.enabled,
    aiChatMessagesLimit: features.ai_chat.limit,
    videoAnalysisEnabled: features.video_analysis.enabled,
    garminEnabled: features.garmin.enabled,
    stravaEnabled: features.strava.enabled,
    workoutLoggingEnabled: tier !== 'FREE',
    dailyCheckInEnabled: tier !== 'FREE',
  }
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
    /** Subscription tier to assign. Defaults to STANDARD (with 14-day trial) for backwards compat. */
    tier?: AthleteTier
    /** Override trial length in days. Pass 0 to skip the trial entirely (e.g. PRO/ELITE comp accounts). */
    trialDays?: number
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

    const betaSubscriptionInput = await resolveHockeyBetaSubscriptionInput({
      businessId: client.businessId,
      teamId: client.teamId,
      requestedTier: options?.tier,
      requestedTrialDays: options?.trialDays,
      fallbackTier: 'STANDARD',
    })
    const subscriptionData = getAthleteSubscriptionDataForTier(betaSubscriptionInput.tier, {
      trialDays: betaSubscriptionInput.trialDays,
      businessId: client.businessId ?? undefined,
    })
    if (betaSubscriptionInput.aiChatMessagesLimitOverride !== undefined) {
      subscriptionData.aiChatMessagesLimit = betaSubscriptionInput.aiChatMessagesLimitOverride
    }
    if (betaSubscriptionInput.customAiAllowanceSekOverride !== undefined) {
      subscriptionData.customAiAllowanceSek = betaSubscriptionInput.customAiAllowanceSekOverride
    }

    // Wrap all DB operations in a transaction to prevent partial state
    let athleteAccount
    try {
      athleteAccount = await prisma.$transaction(async (tx) => {
        // Create user in our database
        const athleteUser = await tx.user.create({
          data: {
            id: authData.user.id,
            email: client.email!,
            name: client.name,
            role: 'ATHLETE',
            language: coach.language, // Inherit coach's language
          },
        })

        // Create athlete account linking
        const account = await tx.athleteAccount.create({
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

        const existingSubscription = await tx.athleteSubscription.findUnique({
          where: { clientId },
          select: { id: true },
        })

        if (!existingSubscription) {
          await tx.athleteSubscription.create({
            data: {
              clientId,
              ...subscriptionData,
            },
          })
        }

        // Auto-add the new athlete User to the parent Client's Business
        // so they appear in the business member list and inherit business-scoped access.
        if (client.businessId) {
          const existingMembership = await tx.businessMember.findUnique({
            where: {
              businessId_userId: {
                businessId: client.businessId,
                userId: athleteUser.id,
              },
            },
            select: { id: true },
          })

          if (!existingMembership) {
            await tx.businessMember.create({
              data: {
                businessId: client.businessId,
                userId: athleteUser.id,
                role: 'MEMBER',
                isActive: true,
                acceptedAt: new Date(),
              },
            })
          }
        }

        const existingPreferences = await tx.agentPreferences.findUnique({
          where: { clientId },
          select: { id: true },
        })

        if (!existingPreferences) {
          await tx.agentPreferences.create({
            data: {
              clientId,
              autonomyLevel: 'ADVISORY',
              allowWorkoutModification: false,
              allowRestDayInjection: false,
              maxIntensityReduction: 10,
              dailyBriefingEnabled: false,
              proactiveNudgesEnabled: false,
            },
          })
        }

        if (client.teamId) {
          const team = await tx.team.findUnique({
            where: { id: client.teamId },
            select: { sportType: true },
          })
          await syncClientSportProfileToTeam(clientId, team?.sportType, tx)
        }

        const existingSportProfile = await tx.sportProfile.findUnique({
          where: { clientId },
          select: { id: true },
        })

        if (!existingSportProfile) {
          await tx.sportProfile.create({
            data: {
              clientId,
              primarySport: 'RUNNING',
              onboardingCompleted: false,
              onboardingStep: 0,
            },
          })
        }

        // Update subscription athlete count
        const subscription = await tx.subscription.findUnique({
          where: { userId: coachId },
        })

        if (subscription) {
          await tx.subscription.update({
            where: { userId: coachId },
            data: {
              currentAthletes: {
                increment: 1,
              },
            },
          })
        }

        return account
      })
    } catch (txError) {
      // Clean up Supabase user if DB transaction failed
      logger.error('Athlete account DB transaction failed, cleaning up auth user', { clientId, coachId }, txError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch((cleanupErr) => {
        logger.error('Failed to clean up Supabase user after transaction failure', { userId: authData.user.id }, cleanupErr)
      })
      return { success: false, error: 'Database transaction failed while creating athlete account' }
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
