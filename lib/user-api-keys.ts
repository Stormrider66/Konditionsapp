import 'server-only'
import { prisma } from '@/lib/prisma'
import { decryptSecret, encryptSecret } from '@/lib/crypto/secretbox'

export type DecryptedUserApiKeys = {
  anthropicKey: string | null
  googleKey: string | null
  openaiKey: string | null
}

export async function getDecryptedUserApiKeys(userId: string): Promise<DecryptedUserApiKeys> {
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId },
    select: {
      anthropicKeyEncrypted: true,
      googleKeyEncrypted: true,
      openaiKeyEncrypted: true,
      anthropicKeyValid: true,
      googleKeyValid: true,
      openaiKeyValid: true,
    },
  })

  if (!apiKeys) {
    return { anthropicKey: null, googleKey: null, openaiKey: null }
  }

  const safeDecrypt = (value: string | null | undefined, valid: boolean): string | null => {
    if (!value || !valid) return null
    try {
      return decryptSecret(value)
    } catch {
      return null
    }
  }

  return {
    anthropicKey: safeDecrypt(apiKeys.anthropicKeyEncrypted, apiKeys.anthropicKeyValid),
    googleKey: safeDecrypt(apiKeys.googleKeyEncrypted, apiKeys.googleKeyValid),
    openaiKey: safeDecrypt(apiKeys.openaiKeyEncrypted, apiKeys.openaiKeyValid),
  }
}

export function encryptIfPresent(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (!value) return null
  return encryptSecret(value)
}

export async function getDecryptedBusinessAiKeys(businessId: string): Promise<DecryptedUserApiKeys> {
  const aiKeys = await prisma.businessAiKeys.findUnique({
    where: { businessId },
    select: {
      anthropicKeyEncrypted: true,
      googleKeyEncrypted: true,
      openaiKeyEncrypted: true,
      anthropicKeyValid: true,
      googleKeyValid: true,
      openaiKeyValid: true,
    },
  })

  if (!aiKeys) {
    return { anthropicKey: null, googleKey: null, openaiKey: null }
  }

  const safeDecrypt = (value: string | null | undefined, valid: boolean): string | null => {
    if (!value || !valid) return null
    try {
      return decryptSecret(value)
    } catch {
      return null
    }
  }

  return {
    anthropicKey: safeDecrypt(aiKeys.anthropicKeyEncrypted, aiKeys.anthropicKeyValid),
    googleKey: safeDecrypt(aiKeys.googleKeyEncrypted, aiKeys.googleKeyValid),
    openaiKey: safeDecrypt(aiKeys.openaiKeyEncrypted, aiKeys.openaiKeyValid),
  }
}

export async function getResolvedAiKeys(userId: string): Promise<DecryptedUserApiKeys> {
  // Resolve each provider independently (user -> business -> admin),
  // so mixed-source setups work correctly (e.g. Anthropic user key + Google business key).
  const [anthropicKey, googleKey, openaiKey] = await Promise.all([
    getResolvedProviderKey(userId, 'anthropic'),
    getResolvedProviderKey(userId, 'google'),
    getResolvedProviderKey(userId, 'openai'),
  ])

  return { anthropicKey, googleKey, openaiKey }
}

type ProviderKey = 'anthropic' | 'google' | 'openai'

const PLATFORM_ADMIN_ROLE_PRIORITY: Record<string, number> = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  SUPPORT: 2,
}

/**
 * Pick a deterministic platform key owner for fallback keys.
 * Prefers admins with valid encrypted keys, then role priority
 * (SUPER_ADMIN -> ADMIN -> SUPPORT), then oldest account.
 */
export async function getPlatformAiKeyOwnerId(provider?: ProviderKey): Promise<string | null> {
  const providerFilter = provider
    ? provider === 'anthropic'
      ? { anthropicKeyValid: true, anthropicKeyEncrypted: { not: null as string | null } }
      : provider === 'google'
        ? { googleKeyValid: true, googleKeyEncrypted: { not: null as string | null } }
        : { openaiKeyValid: true, openaiKeyEncrypted: { not: null as string | null } }
    : {
        OR: [
          { anthropicKeyValid: true, anthropicKeyEncrypted: { not: null as string | null } },
          { googleKeyValid: true, googleKeyEncrypted: { not: null as string | null } },
          { openaiKeyValid: true, openaiKeyEncrypted: { not: null as string | null } },
        ],
      }

  const candidates = await prisma.userApiKey.findMany({
    where: {
      ...providerFilter,
      user: {
        role: 'ADMIN',
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          adminRole: true,
          createdAt: true,
        },
      },
    },
  })

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    const aRole = a.user.adminRole || ''
    const bRole = b.user.adminRole || ''
    const aPriority = PLATFORM_ADMIN_ROLE_PRIORITY[aRole] ?? 99
    const bPriority = PLATFORM_ADMIN_ROLE_PRIORITY[bRole] ?? 99
    if (aPriority !== bPriority) return aPriority - bPriority
    return new Date(a.user.createdAt).getTime() - new Date(b.user.createdAt).getTime()
  })

  return candidates[0].userId
}

/**
 * Resolve a provider-specific key with deterministic fallback:
 * user key -> business key -> platform admin key.
 *
 * Unlike getResolvedAiKeys(), this does NOT stop early when another provider
 * is present on the user record, which is required for vision/audio routes
 * that must use a specific provider (e.g. Google/Gemini).
 */
export async function getResolvedProviderKey(
  userId: string,
  provider: ProviderKey
): Promise<string | null> {
  const pickKey = (keys: DecryptedUserApiKeys): string | null => {
    if (provider === 'anthropic') return keys.anthropicKey
    if (provider === 'google') return keys.googleKey
    return keys.openaiKey
  }

  // 1) User key
  const userKeys = await getDecryptedUserApiKeys(userId)
  const userProviderKey = pickKey(userKeys)
  if (userProviderKey) return userProviderKey

  // 2) Business key
  const membership = await prisma.businessMember.findFirst({
    where: { userId, isActive: true },
    select: { businessId: true },
  })
  if (membership) {
    const businessKeys = await getDecryptedBusinessAiKeys(membership.businessId)
    const businessProviderKey = pickKey(businessKeys)
    if (businessProviderKey) return businessProviderKey
  }

  // 3) Platform admin key (deterministic key owner with valid key)
  const platformKeyOwnerId = await getPlatformAiKeyOwnerId(provider)
  if (platformKeyOwnerId) {
    const adminKeys = await getDecryptedUserApiKeys(platformKeyOwnerId)
    return pickKey(adminKeys)
  }

  return null
}

export async function getResolvedGoogleKey(userId: string): Promise<string | null> {
  return getResolvedProviderKey(userId, 'google')
}

export async function getAiKeySource(userId: string): Promise<{
  source: 'user' | 'business' | 'none'
  businessName?: string
}> {
  // Check user's own keys
  const userApiKey = await prisma.userApiKey.findUnique({
    where: { userId },
    select: {
      anthropicKeyEncrypted: true,
      googleKeyEncrypted: true,
      openaiKeyEncrypted: true,
      anthropicKeyValid: true,
      googleKeyValid: true,
      openaiKeyValid: true,
    },
  })

  if (userApiKey) {
    const hasValid =
      (userApiKey.anthropicKeyEncrypted && userApiKey.anthropicKeyValid) ||
      (userApiKey.googleKeyEncrypted && userApiKey.googleKeyValid) ||
      (userApiKey.openaiKeyEncrypted && userApiKey.openaiKeyValid)
    if (hasValid) {
      return { source: 'user' }
    }
  }

  // Check business keys
  const membership = await prisma.businessMember.findFirst({
    where: { userId, isActive: true },
    select: {
      business: {
        select: {
          name: true,
          aiKeys: {
            select: {
              anthropicKeyEncrypted: true,
              googleKeyEncrypted: true,
              openaiKeyEncrypted: true,
              anthropicKeyValid: true,
              googleKeyValid: true,
              openaiKeyValid: true,
            },
          },
        },
      },
    },
  })

  if (membership?.business.aiKeys) {
    const bk = membership.business.aiKeys
    const hasValid =
      (bk.anthropicKeyEncrypted && bk.anthropicKeyValid) ||
      (bk.googleKeyEncrypted && bk.googleKeyValid) ||
      (bk.openaiKeyEncrypted && bk.openaiKeyValid)
    if (hasValid) {
      return { source: 'business', businessName: membership.business.name }
    }
  }

  return { source: 'none' }
}






