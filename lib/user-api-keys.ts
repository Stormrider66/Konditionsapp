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
  // 1. Check user's own keys first
  const userKeys = await getDecryptedUserApiKeys(userId)
  if (userKeys.anthropicKey || userKeys.googleKey || userKeys.openaiKey) {
    return userKeys
  }

  // 2. Fall back to business keys
  const membership = await prisma.businessMember.findFirst({
    where: { userId, isActive: true },
    select: { businessId: true },
  })

  if (!membership) {
    return userKeys // no keys
  }

  return getDecryptedBusinessAiKeys(membership.businessId)
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






