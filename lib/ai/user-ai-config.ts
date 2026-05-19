/**
 * AI Configuration Helper
 *
 * Provides AI configuration (API keys, default model) for both coaches and athletes.
 * Athletes use their coach's API keys.
 */

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { getPlatformAiKeyOwnerId } from '@/lib/user-api-keys'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { normalizeAIModelDisplayName, normalizeAIModelId } from '@/lib/ai/model-compat'

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

    // If client.userId is the athlete themselves (direct registration, no coach),
    // fall back to platform admin
    if (athleteAccount.client.userId === user.id) {
      coachId = (await getPlatformAiKeyOwnerId()) ?? user.id
    } else {
      coachId = athleteAccount.client.userId
    }
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

  // Check personal keys first
  let anthropicConfigured = !!userKeys?.anthropicKeyEncrypted
  let googleConfigured = !!userKeys?.googleKeyEncrypted
  let openaiConfigured = !!userKeys?.openaiKeyEncrypted
  let anthropicValid = userKeys?.anthropicKeyValid ?? false
  let googleValid = userKeys?.googleKeyValid ?? false
  let openaiValid = userKeys?.openaiKeyValid ?? false

  // Fallback: check business-level keys if no personal keys configured
  if (!anthropicConfigured && !googleConfigured && !openaiConfigured) {
    const businessKeys = await prisma.businessAiKeys.findFirst({
      where: {
        business: {
          members: { some: { userId: coachId, isActive: true } },
        },
      },
    })
    if (businessKeys) {
      anthropicConfigured = !!businessKeys.anthropicKeyEncrypted
      googleConfigured = !!businessKeys.googleKeyEncrypted
      openaiConfigured = !!businessKeys.openaiKeyEncrypted
      anthropicValid = businessKeys.anthropicKeyValid ?? false
      googleValid = businessKeys.googleKeyValid ?? false
      openaiValid = businessKeys.openaiKeyValid ?? false
    }
  }

  const hasApiKeys = anthropicConfigured || googleConfigured || openaiConfigured

  // Get effective model (explicit or fallback)
  let effectiveModel = userKeys?.defaultModel ?? null

  if (!effectiveModel && hasApiKeys) {
    // Priority order mirrors resolveModel()/resolveModelForClient() in
    // types/ai-models.ts: Google → Anthropic → OpenAI. A single findFirst
    // with `provider: { in: [...] }` does NOT honor this order — it falls
    // back to displayName ASC, which puts "Claude …" before "Gemini …"
    // and silently routes every new coach to Anthropic. Query in order
    // and take the first hit instead.
    const providerPriority: Array<'GOOGLE' | 'ANTHROPIC' | 'OPENAI'> = []
    if (googleValid) providerPriority.push('GOOGLE')
    if (anthropicValid) providerPriority.push('ANTHROPIC')
    if (openaiValid) providerPriority.push('OPENAI')

    for (const provider of providerPriority) {
      const candidate = await prisma.aIModel.findFirst({
        where: { provider: provider as any, isActive: true },
        orderBy: [
          { isDefault: 'desc' },
          { displayName: 'asc' },
        ],
      })
      if (candidate) {
        effectiveModel = candidate
        break
      }
    }
  }

  return {
    userId: user.id,
    coachId,
    userRole,
    isAthlete,
    hasApiKeys,
    anthropicConfigured,
    anthropicValid,
    googleConfigured,
    googleValid,
    openaiConfigured,
    openaiValid,
    defaultModel: effectiveModel ? {
      id: effectiveModel.id,
      modelId: normalizeAIModelId(effectiveModel.modelId),
      provider: effectiveModel.provider,
      displayName: normalizeAIModelDisplayName(effectiveModel.modelId, effectiveModel.displayName),
    } : null,
    isExplicitlySet: !!userKeys?.defaultModelId,
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

  if (user.role === 'ADMIN' || await canAccessCoachPlatform(user.id)) {
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
