// lib/subscription/trial-utils.ts
// Trial-specific utilities for subscription management

export type TrialStatus =
  | { status: 'active'; daysRemaining: number }
  | { status: 'expired' }
  | { status: 'not_trial' }
  | { status: 'no_trial_date' }

/**
 * Get the number of days remaining in a trial period
 * Returns null if trialEndsAt is null
 */
export function getTrialDaysRemaining(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) {
    return null
  }

  const now = new Date()
  const diffMs = trialEndsAt.getTime() - now.getTime()

  if (diffMs <= 0) {
    return 0
  }

  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

/**
 * Check if a trial has expired
 * Returns true if status is TRIAL and trialEndsAt is in the past
 */
export function isTrialExpired(subscription: {
  status: string
  trialEndsAt: Date | null
}): boolean {
  if (subscription.status !== 'TRIAL') {
    return false
  }

  if (!subscription.trialEndsAt) {
    // Trial with no end date is considered non-expiring (shouldn't happen, but safe default)
    return false
  }

  return subscription.trialEndsAt < new Date()
}

/**
 * Get comprehensive trial status
 */
export function getTrialStatus(subscription: {
  status: string
  trialEndsAt: Date | null
}): TrialStatus {
  if (subscription.status !== 'TRIAL') {
    return { status: 'not_trial' }
  }

  if (!subscription.trialEndsAt) {
    return { status: 'no_trial_date' }
  }

  const daysRemaining = getTrialDaysRemaining(subscription.trialEndsAt)

  if (daysRemaining === null || daysRemaining <= 0) {
    return { status: 'expired' }
  }

  return { status: 'active', daysRemaining }
}

/**
 * Calculate trial end date from now
 */
export function calculateTrialEndDate(trialDays: number): Date {
  return new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
}

/**
 * Check if trial is expiring soon (within specified days)
 * Returns the number of days remaining if expiring soon, null otherwise
 */
export function isTrialExpiringSoon(
  subscription: { status: string; trialEndsAt: Date | null },
  warningDays: number = 3
): number | null {
  if (subscription.status !== 'TRIAL') {
    return null
  }

  const daysRemaining = getTrialDaysRemaining(subscription.trialEndsAt)

  if (daysRemaining === null) {
    return null
  }

  if (daysRemaining > 0 && daysRemaining <= warningDays) {
    return daysRemaining
  }

  return null
}

/**
 * Format trial days remaining for display
 */
export function formatTrialDaysRemaining(daysRemaining: number): string {
  if (daysRemaining === 0) {
    return 'Provperioden går ut idag'
  }
  if (daysRemaining === 1) {
    return '1 dag kvar av provperiod'
  }
  return `${daysRemaining} dagar kvar av provperiod`
}

/**
 * Get trial warning level for UI styling
 */
export function getTrialWarningLevel(daysRemaining: number | null): 'none' | 'low' | 'medium' | 'high' {
  if (daysRemaining === null) {
    return 'none'
  }

  if (daysRemaining <= 1) {
    return 'high'
  }

  if (daysRemaining <= 3) {
    return 'medium'
  }

  if (daysRemaining <= 7) {
    return 'low'
  }

  return 'none'
}
