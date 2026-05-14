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
  const scheduledDate = warning.scheduledDate
  const message = scheduledDate
    ? `Passet är planerat till ${scheduledDate}. Vill du ändå registrera det redan nu?`
    : 'Passet är planerat i framtiden. Vill du ändå registrera det redan nu?'

  return window.confirm(message)
}
