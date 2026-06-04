import type { NextRequest } from 'next/server'

export type AppLocale = 'en' | 'sv'

const SUPPORTED_LOCALES = new Set<AppLocale>(['en', 'sv'])

function parseCookieLocale(cookieHeader: string | null): string | undefined {
  return cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('NEXT_LOCALE='))
    ?.split('=')[1]
}

export function resolveRequestLocale(
  request: NextRequest | Request,
  userLanguage?: string | null
): AppLocale {
  const nextRequest = request as NextRequest
  const cookieLocale =
    typeof nextRequest.cookies?.get === 'function'
      ? nextRequest.cookies.get('NEXT_LOCALE')?.value
      : parseCookieLocale(request.headers.get('cookie'))

  if (SUPPORTED_LOCALES.has(cookieLocale as AppLocale)) {
    return cookieLocale as AppLocale
  }

  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase()
  const preferred = acceptLanguage
    ?.split(',')
    .map((part) => part.trim().split(';')[0]?.slice(0, 2))
    .find((locale): locale is AppLocale => SUPPORTED_LOCALES.has(locale as AppLocale))

  if (preferred) return preferred

  return userLanguage === 'sv' ? 'sv' : 'en'
}
