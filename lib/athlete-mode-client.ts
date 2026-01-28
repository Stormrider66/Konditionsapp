// lib/athlete-mode-client.ts
// Client-side utilities for athlete mode (can be used in 'use client' components)

// Cookie name constant (shared between client and server)
export const ATHLETE_MODE_COOKIE = 'athleteMode'

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
 */
export function setAthleteModeCookie(enabled: boolean): void {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year
  document.cookie = `${ATHLETE_MODE_COOKIE}=${enabled};expires=${expires.toUTCString()};path=/`
}

/**
 * Clear athlete mode cookie (client-side)
 */
export function clearAthleteModeCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${ATHLETE_MODE_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}
