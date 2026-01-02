/**
 * AI Configuration Helper
 *
 * Provides AI configuration (API keys, default model) for both coaches and athletes.
 * Athletes use their coach's API keys.
 */

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export interface UserAIConfig {
  userId: string
  coachId: string // The coach whose API keys are used (same as userId for coaches)
  userRole: 'COACH' | 'ATHLETE' | 'ADMIN'
  isAthlete: boolean
  hasApiKeys: boolean
  anthropicConfigured: boolean
  anthropicValid: boolean
  googleConfigured: boolean
  googleValid: boolean
  openaiConfigured: boolean
  openaiValid: boolean
  defaultModel: {
    id: string
    modelId: string
    provider: string
    displayName: string
  } | null
  isExplicitlySet: boolean
}

/**
 * Get AI configuration for the current user.
 * - For coaches: returns their own API keys
 * - For athletes: returns their coach's API keys
 * - Returns null if user not authenticated or no config available
 */
export async function getUserAIConfig(): Promise<UserAIConfig | null> {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  let coachId = user.id

  // If user is an athlete, find their coach
  if (user.role === 'ATHLETE') {
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      include: {
        client: {
          select: { userId: true }
        }
      }
    })

    if (!athleteAccount?.client?.userId) {
      return null
    }

    coachId = athleteAccount.client.userId
  }

  // Get the coach's API keys
  const userKeys = await prisma.userApiKey.findUnique({
    where: { userId: coachId },
    include: {
      defaultModel: true,
    },
  })

  const userRole = user.role as 'COACH' | 'ATHLETE' | 'ADMIN'
  const isAthlete = user.role === 'ATHLETE'

  if (!userKeys) {
    return {
      userId: user.id,
      coachId,
      userRole,
      isAthlete,
      hasApiKeys: false,
      anthropicConfigured: false,
      anthropicValid: false,
      googleConfigured: false,
      googleValid: false,
      openaiConfigured: false,
      openaiValid: false,
      defaultModel: null,
      isExplicitlySet: false,
    }
  }

  // Check which providers are configured
  const anthropicConfigured = !!userKeys.anthropicKeyEncrypted
  const googleConfigured = !!userKeys.googleKeyEncrypted
  const openaiConfigured = !!userKeys.openaiKeyEncrypted

  const hasApiKeys = anthropicConfigured || googleConfigured || openaiConfigured

  // Get effective model (explicit or fallback)
  let effectiveModel = userKeys.defaultModel

  if (!effectiveModel && hasApiKeys) {
    // Determine which providers have valid keys (prioritize Google)
    const validProviders: string[] = []
    if (userKeys.googleKeyValid) validProviders.push('GOOGLE')
    if (userKeys.anthropicKeyValid) validProviders.push('ANTHROPIC')
    if (userKeys.openaiKeyValid) validProviders.push('OPENAI')

    if (validProviders.length > 0) {
      effectiveModel = await prisma.aIModel.findFirst({
        where: {
          provider: { in: validProviders as any },
          isActive: true,
        },
        orderBy: [
          { isDefault: 'desc' },
          { displayName: 'asc' },
        ],
      })
    }
  }

  return {
    userId: user.id,
    coachId,
    userRole,
    isAthlete,
    hasApiKeys,
    anthropicConfigured,
    anthropicValid: userKeys.anthropicKeyValid ?? false,
    googleConfigured,
    googleValid: userKeys.googleKeyValid ?? false,
    openaiConfigured,
    openaiValid: userKeys.openaiKeyValid ?? false,
    defaultModel: effectiveModel ? {
      id: effectiveModel.id,
      modelId: effectiveModel.modelId,
      provider: effectiveModel.provider,
      displayName: effectiveModel.displayName,
    } : null,
    isExplicitlySet: !!userKeys.defaultModelId,
  }
}

/**
 * Get the coach ID for AI operations.
 * - For coaches: returns their own ID
 * - For athletes: returns their coach's ID
 */
export async function getCoachIdForAI(): Promise<string | null> {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  if (user.role === 'COACH' || user.role === 'ADMIN') {
    return user.id
  }

  if (user.role === 'ATHLETE') {
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      include: {
        client: {
          select: { userId: true }
        }
      }
    })

    return athleteAccount?.client?.userId ?? null
  }

  return null
}
