export const COACH_FLOATING_CHAT_EVENT = 'coach-floating-chat'

export interface CoachFloatingChatEvent {
  message: string
  open?: boolean
}

export function openCoachFloatingChat(message: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<CoachFloatingChatEvent>(COACH_FLOATING_CHAT_EVENT, {
      detail: { message, open: true },
    })
  )
}
