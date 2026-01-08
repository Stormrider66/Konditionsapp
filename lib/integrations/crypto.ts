import 'server-only'

import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/lib/crypto/secretbox'

/**
 * Encrypt a token for storage.
 * Uses the same AES-256-GCM key as other secret storage (`API_KEY_ENCRYPTION_KEY`).
 */
export function encryptIntegrationSecret(value: string | null | undefined): string | null {
  if (!value) return null
  return encryptSecret(value)
}

/**
 * Decrypt a token read from storage.
 * Backwards-compatible: if the value is plaintext (older rows), it's returned as-is.
 */
export function decryptIntegrationSecret(value: string | null | undefined): string | null {
  if (!value) return null
  // decryptSecret already supports plaintext fallback, but we avoid calling it for obvious plaintext
  // when the encryption key isn't configured yet.
  if (!isEncryptedSecret(value)) return value
  return decryptSecret(value)
}


