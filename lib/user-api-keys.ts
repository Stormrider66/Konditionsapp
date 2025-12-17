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






