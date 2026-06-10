export const COACH_FLOATING_CHAT_EVENT = 'coach-floating-chat'

export interface CoachFloatingChatEvent {
  message: string
  open?: boolean
  athleteId?: string
  athleteName?: string
}

export function openCoachFloatingChat(
  message: string,
  options?: { athleteId?: string; athleteName?: string }
) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<CoachFloatingChatEvent>(COACH_FLOATING_CHAT_EVENT, {
      detail: { message, open: true, ...options },
    })
  )
}
