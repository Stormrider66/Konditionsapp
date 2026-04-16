/**
 * Parse the `app_metadata` claims that `public.custom_access_token_hook`
 * injects into the JWT (Phase 4). Shared by middleware and API handlers
 * so every caller reads the same shape.
 *
 * Callers pass the `app_metadata` object straight off the Supabase user
 * (`supabase.auth.getUser()` → `user.app_metadata`). When the hook is
 * disabled or the token is stale, the function returns `null` and
 * callers should fall back to their usual DB lookup.
 */

export type AppClaims = {
  dbUserId: string
  role: string | null
  adminRole: string | null
  primarySlug: string | null
  memberBusinessSlugs: string[]
  selfAthleteClientId: string | null
}

export function readJwtClaims(
  appMetadata: Record<string, unknown> | null | undefined
): AppClaims | null {
  if (!appMetadata || typeof appMetadata !== 'object') return null
  const dbUserId = typeof appMetadata.dbUserId === 'string' ? appMetadata.dbUserId : null
  if (!dbUserId) return null
  const memberSlugs = Array.isArray(appMetadata.memberBusinessSlugs)
    ? appMetadata.memberBusinessSlugs.filter((s): s is string => typeof s === 'string')
    : []
  return {
    dbUserId,
    role: typeof appMetadata.role === 'string' ? appMetadata.role : null,
    adminRole: typeof appMetadata.adminRole === 'string' ? appMetadata.adminRole : null,
    primarySlug: typeof appMetadata.primarySlug === 'string' ? appMetadata.primarySlug : null,
    memberBusinessSlugs: memberSlugs,
    selfAthleteClientId:
      typeof appMetadata.selfAthleteClientId === 'string'
        ? appMetadata.selfAthleteClientId
        : null,
  }
}
