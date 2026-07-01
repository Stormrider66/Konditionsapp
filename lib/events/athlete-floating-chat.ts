export const ATHLETE_FLOATING_CHAT_EVENT = 'athlete-floating-chat'

export function openAthleteFloatingChat() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ATHLETE_FLOATING_CHAT_EVENT))
}
