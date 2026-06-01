export type AppLocale = 'en' | 'sv'

export function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

export function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function actionAlreadyMessage(locale: AppLocale, status: string): string {
  const normalized = status.toUpperCase()
  const enStatus = normalized === 'AUTO_APPLIED'
    ? 'auto-applied'
    : normalized.toLowerCase().replaceAll('_', ' ')
  const svStatus = normalized === 'ACCEPTED'
    ? 'godkänd'
    : normalized === 'REJECTED'
      ? 'avvisad'
      : normalized === 'AUTO_APPLIED'
        ? 'automatiskt tillämpad'
        : normalized.toLowerCase().replaceAll('_', ' ')

  return t(locale, `Action already ${enStatus}`, `Åtgärden är redan ${svStatus}`)
}
