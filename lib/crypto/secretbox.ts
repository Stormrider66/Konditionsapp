/**
 * secretbox.ts
 *
 * Minimal AES-256-GCM encryption for secrets stored in the database.
 *
 * Format:
 *   enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 *
 * Key:
 *   API_KEY_ENCRYPTION_KEY must be a 32-byte key, base64-encoded.
 */
import crypto from 'crypto'

const PREFIX = 'enc:v1:'

function getKey(): Buffer {
  const raw = process.env.API_KEY_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('API_KEY_ENCRYPTION_KEY is not configured')
  }

  let key: Buffer
  try {
    key = Buffer.from(raw, 'base64')
  } catch {
    throw new Error('API_KEY_ENCRYPTION_KEY must be base64')
  }

  if (key.length !== 32) {
    throw new Error('API_KEY_ENCRYPTION_KEY must decode to 32 bytes')
  }

  return key
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12) // recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptSecret(ciphertext: string): string {
  if (!isEncryptedSecret(ciphertext)) {
    // Backwards compatibility: older rows may store plaintext (should be migrated).
    return ciphertext
  }

  const key = getKey()
  const parts = ciphertext.slice(PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted secret format')
  }

  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()])
  return plaintext.toString('utf8')
}






