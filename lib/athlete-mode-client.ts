// lib/athlete-mode-client.ts
// Client-side utilities for athlete mode (can be used in 'use client' components)

// Cookie name constant (shared between client and server)
export const ATHLETE_MODE_COOKIE = 'athleteMode'

/**
 * Determine if we're running in a secure context (HTTPS)
 * Used to set Secure flag on cookies only in production
 */
function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.protocol === 'https:'
}

/**
 * Get athlete mode cookie value (client-side)
 */
export function getAthleteModeCookie(): boolean {
  if (typeof document === 'undefined') return false
  const match = document.cookie.match(new RegExp('(^| )' + ATHLETE_MODE_COOKIE + '=([^;]+)'))
  return match ? match[2] === 'true' : false
}

/**
 * Set athlete mode cookie (client-side)
 *
 * SECURITY: Includes SameSite=Strict and Secure flags.
 * Note: HttpOnly is not possible for client-set cookies - this cookie is
 * intentionally readable by client JS for UI state. For sensitive operations,
 * always verify server-side session state.
 */
export function setAthleteModeCookie(enabled: boolean): void {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year

  // Build cookie with security flags
  let cookie = `${ATHLETE_MODE_COOKIE}=${enabled};expires=${expires.toUTCString()};path=/;SameSite=Strict`

  // Add Secure flag in HTTPS contexts (production)
  if (isSecureContext()) {
    cookie += ';Secure'
  }

  document.cookie = cookie
}

/**
 * Clear athlete mode cookie (client-side)
 */
export function clearAthleteModeCookie(): void {
  if (typeof document === 'undefined') return

  let cookie = `${ATHLETE_MODE_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`

  // Add Secure flag in HTTPS contexts (production)
  if (isSecureContext()) {
    cookie += ';Secure'
  }

  document.cookie = cookie
}
