import type { ExternalCalendarConnection } from '@prisma/client'

/**
 * Convert an ExternalCalendarConnection (optionally including relations) into a
 * "public" shape that is safe to send to the browser.
 *
 * IMPORTANT: We never expose OAuth tokens or raw iCal URLs to the client.
 */
export function toPublicExternalCalendarConnection<T extends Record<string, any>>(
  connection: T
): Omit<T, 'accessToken' | 'refreshToken' | 'icalUrl'> & {
  oauthConnected: boolean
  hasRefreshToken: boolean
  /**
   * Masked iCal URL (protocol + hostname only) if this is a URL-based connection.
   * Example: "https://calendar.google.com/…"
   */
  icalUrlMasked: string | null
  /**
   * Calendar ID is omitted for URL-based connections (it often equals the URL).
   */
  calendarId?: string
} {
  const {
    accessToken,
    refreshToken,
    icalUrl,
    calendarId,
    ...rest
  } = connection as ExternalCalendarConnection & T

  const urlToMask =
    (typeof icalUrl === 'string' && icalUrl.trim() ? icalUrl : null) ||
    (looksLikeUrl(calendarId) ? calendarId : null)

  return {
    ...(rest as any),
    calendarId: urlToMask ? undefined : calendarId,
    oauthConnected: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
    icalUrlMasked: urlToMask ? maskUrl(urlToMask) : null,
  }
}

function looksLikeUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const v = value.trim().toLowerCase()
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('webcal://')
}

function maskUrl(raw: string): string {
  try {
    const normalized = raw.trim().startsWith('webcal://')
      ? `https://${raw.trim().slice('webcal://'.length)}`
      : raw.trim()
    const u = new URL(normalized)
    const portPart = u.port ? `:${u.port}` : ''
    return `${u.protocol}//${u.hostname}${portPart}/…`
  } catch {
    return '…'
  }
}


