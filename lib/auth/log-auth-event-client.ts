/**
 * Client-side helper for logging auth events.
 *
 * Fire-and-forget — never blocks the UI or throws, because auth UX
 * should not depend on logging succeeding.
 */

export type AuthEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'SIGN_OUT'
  | 'PASSWORD_RESET'
  | 'LOCKOUT'
  | 'OAUTH_START'
  | 'OAUTH_SUCCESS'
  | 'OAUTH_FAILURE'

export interface LogAuthEventClientInput {
  eventType: AuthEventType
  userId?: string | null
  email?: string | null
  failureReason?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Log an auth event. Call this from client-side auth flows (login page,
 * signup, OAuth callback). Does not throw — safe to fire and forget.
 */
export function logAuthEventClient(input: LogAuthEventClientInput): void {
  // Don't block — fire and forget
  fetch('/api/auth/log-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    // Use keepalive so the request completes even if the user navigates away
    keepalive: true,
  }).catch(() => {
    // Silently ignore — logging failures should not affect auth UX
  })
}
