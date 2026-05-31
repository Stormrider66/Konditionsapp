export type SportRouterLocale = 'en' | 'sv'

export function resolveSportRouterLocale(locale?: string | null): SportRouterLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

export function text(locale: SportRouterLocale, enText: string, svText: string): string {
  return locale === 'sv' ? svText : enText
}
