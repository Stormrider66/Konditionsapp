export const FUTURE_WORKOUT_COMPLETION_CODE = 'FUTURE_WORKOUT_COMPLETION_REQUIRES_CONFIRMATION'

const DEFAULT_TIME_ZONE = 'Europe/Stockholm'

export interface FutureWorkoutCompletionWarning {
  code: typeof FUTURE_WORKOUT_COMPLETION_CODE
  error: string
  scheduledDate: string
}

function dateKey(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getFutureWorkoutCompletionWarning(options: {
  assignedDate: Date
  allowFutureCompletion?: boolean
  now?: Date
  timeZone?: string
}): FutureWorkoutCompletionWarning | null {
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE
  const scheduledDate = dateKey(options.assignedDate, timeZone)
  const today = dateKey(options.now || new Date(), timeZone)

  if (scheduledDate <= today || options.allowFutureCompletion) {
    return null
  }

  return {
    code: FUTURE_WORKOUT_COMPLETION_CODE,
    error: `Passet är planerat till ${scheduledDate}. Bekräfta om du vill registrera det i förväg.`,
    scheduledDate,
  }
}
