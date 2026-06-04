import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  AUTH_CONTEXT_TTL_MS,
  authEmailCache,
  authEmailInFlight,
  userIdByEmailCache,
  userIdByEmailInFlight,
} from './caches'
import { getVerifiedLoadTestBypassEmail } from '@/lib/load-test-bypass'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * Resolve the DB User.id for the current request. Dedupes
 * Supabase calls and DB lookups under load via in-flight maps and
 * two short-lived caches (email and email→userId). Accepts a
 * pre-forwarded email via `x-auth-user-email` header so middleware
 * can skip the Supabase round trip on API calls.
 */
export async function resolveAuthenticatedUserId(
  request: NextRequest
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const locale = resolveRequestLocale(request)
  const forwardedEmail = getVerifiedLoadTestBypassEmail(request)
  const authCacheKey = buildAuthCacheKey(request, forwardedEmail)
  const nowMs = Date.now()

  let authEmail = forwardedEmail
  if (!authEmail) {
    const cachedEmail = authEmailCache.get(authCacheKey)
    if (cachedEmail && cachedEmail.expiresAt > nowMs) {
      authEmail = cachedEmail.email
    } else {
      const inFlightEmail = authEmailInFlight.get(authCacheKey)
      if (inFlightEmail) {
        authEmail = await inFlightEmail
      } else {
        const resolveEmailPromise = (async () => {
          const supabase = await createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (!user?.email) throw new Error('UNAUTHORIZED')
          return user.email
        })()
        authEmailInFlight.set(authCacheKey, resolveEmailPromise)
        try {
          authEmail = await resolveEmailPromise
        } catch (error) {
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return {
              ok: false,
              response: NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 }),
            }
          }
          throw error
        } finally {
          authEmailInFlight.delete(authCacheKey)
        }
      }
      authEmailCache.set(authCacheKey, {
        expiresAt: nowMs + AUTH_CONTEXT_TTL_MS,
        email: authEmail,
      })
    }
  }

  const cachedUserId = userIdByEmailCache.get(authEmail)
  if (cachedUserId && cachedUserId.expiresAt > nowMs) {
    return { ok: true, userId: cachedUserId.userId }
  }

  const inFlightUserId = userIdByEmailInFlight.get(authEmail)
  const resolvedUserId = inFlightUserId
    ? await inFlightUserId
    : await (() => {
        const lookupPromise = prisma.user
          .findUnique({ where: { email: authEmail }, select: { id: true } })
          .then((user) => user?.id ?? null)
        userIdByEmailInFlight.set(authEmail, lookupPromise)
        return lookupPromise.finally(() => userIdByEmailInFlight.delete(authEmail))
      })()

  if (!resolvedUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 }),
    }
  }

  userIdByEmailCache.set(authEmail, {
    expiresAt: nowMs + AUTH_CONTEXT_TTL_MS,
    userId: resolvedUserId,
  })

  return { ok: true, userId: resolvedUserId }
}

export function buildAuthCacheKey(
  request: NextRequest,
  forwardedEmail?: string | null
): string {
  if (forwardedEmail) return `forwarded:${forwardedEmail}`

  const cookieHeader = request.headers.get('cookie') || ''
  const supabaseSessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('sb-') && part.includes('auth-token='))

  if (supabaseSessionCookie) return `cookie:${supabaseSessionCookie}`
  return `cookie:${cookieHeader.slice(0, 256)}`
}
