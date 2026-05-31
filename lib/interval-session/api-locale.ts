export type AppLocale = 'en' | 'sv'

export function resolveLocale(language: string | null | undefined): AppLocale {
  const normalized = language?.toLowerCase()
  return normalized === 'sv' || normalized?.startsWith('sv-') ? 'sv' : 'en'
}

export function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function translateIntervalSessionError(
  locale: AppLocale,
  error: string | null | undefined,
  fallbackEn = 'Something went wrong',
  fallbackSv = 'Något gick fel'
): string {
  switch (error) {
    case 'Unauthorized':
      return t(locale, 'Unauthorized', 'Obehörig')
    case 'Forbidden':
      return t(locale, 'Forbidden', 'Saknar behörighet')
    case 'Session not found':
      return t(locale, 'Session not found', 'Passet hittades inte')
    case 'Session not found or ended':
      return t(locale, 'Session not found or ended', 'Passet hittades inte eller är avslutat')
    case 'Session not found or not active':
      return t(locale, 'Session not found or not active', 'Passet hittades inte eller är inte aktivt')
    case 'Lap not found':
      return t(locale, 'Lap not found', 'Varvet hittades inte')
    case 'Participant not found':
      return t(locale, 'Participant not found', 'Deltagaren hittades inte')
    case 'Invalid cumulative time':
      return t(locale, 'Invalid cumulative time', 'Ogiltig ackumulerad tid')
    case 'All intervals completed for this athlete':
      return t(locale, 'All intervals completed for this athlete', 'Alla intervaller är slutförda för den här atleten')
    case 'Lap already recorded for this interval':
      return t(locale, 'Lap already recorded for this interval', 'Varvet är redan registrerat för den här intervallen')
    case 'No Garmin connection':
    case 'Ingen Garmin-koppling':
      return t(locale, 'No Garmin connection', 'Ingen Garmin-koppling')
    case 'No activity found':
    case 'Ingen aktivitet hittad':
      return t(locale, 'No activity found', 'Ingen aktivitet hittad')
    case 'No matching activity':
    case 'Ingen matchande aktivitet':
      return t(locale, 'No matching activity', 'Ingen matchande aktivitet')
    case 'API error':
    case 'API-fel':
      return t(locale, 'API error', 'API-fel')
    default:
      return error ?? t(locale, fallbackEn, fallbackSv)
  }
}
