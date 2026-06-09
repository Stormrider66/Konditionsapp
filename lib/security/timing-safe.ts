import crypto from 'crypto'

/**
 * Constant-time string comparison for secrets (cron tokens, internal
 * dispatch secrets, webhook URL tokens). Both inputs are hashed first so
 * the comparison length is fixed — this satisfies timingSafeEqual's
 * equal-length requirement without leaking the secret's length.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}
