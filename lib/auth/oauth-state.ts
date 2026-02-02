/**
 * OAuth State Management for CSRF Protection
 *
 * Provides secure state token generation and validation for OAuth flows.
 * Uses cryptographically secure random tokens stored in httpOnly cookies.
 */

import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const OAUTH_STATE_COOKIE = 'oauth_state'
const OAUTH_STATE_MAX_AGE = 600 // 10 minutes

export interface OAuthStateData {
  connectionId: string
  nonce: string
  timestamp: number
}

/**
 * Generate a cryptographically secure state token for OAuth flow
 *
 * The state contains:
 * - connectionId: The calendar connection being configured
 * - nonce: A random value to prevent replay attacks
 * - timestamp: To validate token freshness
 *
 * @param connectionId - The connection ID to include in the state
 * @returns The state token to include in the OAuth URL
 */
export async function generateOAuthState(connectionId: string): Promise<string> {
  // Generate a random nonce
  const nonce = randomBytes(32).toString('hex')
  const timestamp = Date.now()

  // Create state data
  const stateData: OAuthStateData = {
    connectionId,
    nonce,
    timestamp,
  }

  // Encode state data as base64
  const stateToken = Buffer.from(JSON.stringify(stateData)).toString('base64url')

  // Create a hash of the state for cookie storage (don't store full data in cookie)
  const stateHash = createHash('sha256').update(stateToken).digest('hex')

  // Store the hash in a secure httpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set(OAUTH_STATE_COOKIE, stateHash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Lax allows redirect from OAuth provider
    maxAge: OAUTH_STATE_MAX_AGE,
    path: '/',
  })

  return stateToken
}

/**
 * Validate an OAuth state token from the callback
 *
 * Verifies:
 * - The state token hash matches the stored cookie
 * - The token has not expired (within 10 minutes)
 * - The token is well-formed
 *
 * @param stateToken - The state parameter from the OAuth callback
 * @returns The connection ID if valid, null if invalid
 */
export async function validateOAuthState(stateToken: string): Promise<string | null> {
  try {
    // Get the stored hash from cookie
    const cookieStore = await cookies()
    const storedHash = cookieStore.get(OAUTH_STATE_COOKIE)?.value

    if (!storedHash) {
      return null // No state cookie found
    }

    // Clear the cookie immediately (one-time use)
    cookieStore.delete(OAUTH_STATE_COOKIE)

    // Verify the hash matches
    const stateHash = createHash('sha256').update(stateToken).digest('hex')
    if (stateHash !== storedHash) {
      return null // Hash mismatch - potential CSRF attack
    }

    // Decode and parse the state data
    const stateData: OAuthStateData = JSON.parse(
      Buffer.from(stateToken, 'base64url').toString('utf8')
    )

    // Verify timestamp (must be within 10 minutes)
    const elapsed = Date.now() - stateData.timestamp
    if (elapsed > OAUTH_STATE_MAX_AGE * 1000) {
      return null // Token expired
    }

    // Validate nonce format (should be 64 hex characters)
    if (!/^[0-9a-f]{64}$/.test(stateData.nonce)) {
      return null // Invalid nonce format
    }

    // Validate connectionId format (should be UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stateData.connectionId)) {
      return null // Invalid connection ID format
    }

    return stateData.connectionId
  } catch {
    return null // Any parsing error means invalid state
  }
}

/**
 * Clear any existing OAuth state cookie
 * Call this when starting a new OAuth flow to ensure clean state
 */
export async function clearOAuthState(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(OAUTH_STATE_COOKIE)
}
