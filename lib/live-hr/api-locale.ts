export type AppLocale = 'en' | 'sv'

export function resolveLocale(language: string | null | undefined): AppLocale {
  const normalized = language?.toLowerCase()
  return normalized === 'sv' || normalized?.startsWith('sv-') ? 'sv' : 'en'
}

export function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
