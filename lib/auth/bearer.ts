/**
 * Bearer-token auth for non-browser clients (the mobile app).
 *
 * A React Native client signs in natively with supabase-js and sends its
 * Supabase access token as `Authorization: Bearer <jwt>`. getCurrentUser()
 * validates it here and resolves the same DB user the cookie path would —
 * every auth helper downstream inherits bearer support unchanged.
 *
 * parseBearerJwt is pure and Edge-safe so proxy.ts can use it to exempt
 * bearer requests from the CSRF Origin check (custom Authorization headers
 * cannot be attached cross-site without a CORS preflight; CSRF defends
 * ambient cookie credentials, which bearer requests don't use).
 *
 * See docs/MOBILE_APP_PLAN.md §3 for the full spec, including the fail-closed
 * rule: a present-but-invalid bearer token must NEVER fall back to cookies.
 */

import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'

// JWT segments are base64url. Three non-empty segments = JWT-shaped.
const JWT_SEGMENT = /^[A-Za-z0-9_-]+$/

/**
 * Extract a JWT-shaped token from an Authorization header.
 * Returns null for anything else — notably `Bearer bak_*`, the business
 * API-key scheme (lib/api-key-auth.ts), which keeps its own validation path.
 */
export function parseBearerJwt(header: string | null | undefined): string | null {
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  const token = match[1].trim()
  if (token.startsWith('bak_')) return null
  const segments = token.split('.')
  if (segments.length !== 3) return null
  if (segments.some((segment) => !segment || !JWT_SEGMENT.test(segment))) return null
  return token
}

/**
 * Validate a Supabase access token and return its auth user, or null.
 *
 * Uses a stateless anon-key client and a network call to Supabase Auth —
 * revocation-aware and key-management-free (works on both legacy HS256 and
 * asymmetric-key projects). One call per request via getCurrentUser's
 * request cache. Local JWKS verification is the documented later
 * optimization (docs/MOBILE_APP_PLAN.md §6).
 */
export async function getSupabaseUserFromBearer(
  token: string,
): Promise<SupabaseAuthUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const supabase = createSupabaseJsClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null
    return data.user
  } catch {
    return null
  }
}
