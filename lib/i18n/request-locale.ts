import type { NextRequest } from 'next/server'

export type AppLocale = 'en' | 'sv'

const SUPPORTED_LOCALES = new Set<AppLocale>(['en', 'sv'])

export function resolveRequestLocale(
  request: NextRequest,
  userLanguage?: string | null
): AppLocale {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
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
