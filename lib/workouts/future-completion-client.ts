import { FUTURE_WORKOUT_COMPLETION_CODE } from '@/lib/workouts/future-completion-guard'

interface FutureCompletionWarning {
  code?: string
  error?: string
  scheduledDate?: string
}

export async function readFutureCompletionWarning(
  response: Response,
): Promise<FutureCompletionWarning | null> {
  if (response.status !== 409) return null

  const data = (await response.clone().json().catch(() => null)) as FutureCompletionWarning | null
  if (data?.code !== FUTURE_WORKOUT_COMPLETION_CODE) return null

  return data
}

export function confirmFutureCompletion(warning: FutureCompletionWarning): boolean {
  if (warning.error) {
    return window.confirm(warning.error)
  }

  const scheduledDate = warning.scheduledDate
  const message = scheduledDate
    ? `This workout is scheduled for ${scheduledDate}. Do you still want to log it now?`
    : 'This workout is scheduled in the future. Do you still want to log it now?'

  return window.confirm(message)
}
