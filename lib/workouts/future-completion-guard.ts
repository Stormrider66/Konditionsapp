export const FUTURE_WORKOUT_COMPLETION_CODE = 'FUTURE_WORKOUT_COMPLETION_REQUIRES_CONFIRMATION'

const DEFAULT_TIME_ZONE = 'Europe/Stockholm'
type AppLocale = 'en' | 'sv'

export interface FutureWorkoutCompletionWarning {
  code: typeof FUTURE_WORKOUT_COMPLETION_CODE
  error: string
  scheduledDate: string
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function dateKey(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

export function getFutureWorkoutCompletionWarning(options: {
  assignedDate: Date
  allowFutureCompletion?: boolean
  now?: Date
  timeZone?: string
  locale?: AppLocale
}): FutureWorkoutCompletionWarning | null {
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE
  const locale = options.locale || 'en'
  const scheduledDate = dateKey(options.assignedDate, timeZone)
  const today = dateKey(options.now || new Date(), timeZone)

  if (scheduledDate <= today || options.allowFutureCompletion) {
    return null
  }

  return {
    code: FUTURE_WORKOUT_COMPLETION_CODE,
    error: t(
      locale,
      `This workout is scheduled for ${scheduledDate}. Confirm if you want to log it in advance.`,
      `Passet är planerat till ${scheduledDate}. Bekräfta om du vill registrera det i förväg.`
    ),
    scheduledDate,
  }
}
