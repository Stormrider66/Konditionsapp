/**
 * Coach Visibility Permission Checks
 *
 * Verifies what data a coach is allowed to see for a given athlete.
 */

import { prisma } from '@/lib/prisma'

export type PermissionKey =
  | 'shareFoodDetails'
  | 'shareFoodSummaries'
  | 'shareBodyComposition'
  | 'shareWorkoutNotes'
  | 'shareDailyCheckIns'
  | 'shareMenstrualData'
  | 'shareInjuryDetails'

/**
 * Check if a coach has permission to view specific athlete data.
 * Returns true if no permission row exists (defaults to sharing).
 */
export async function canCoachViewData(
  coachUserId: string,
  athleteClientId: string,
  permission: PermissionKey
): Promise<boolean> {
  // Verify active coach-athlete relationship
  const agreement = await prisma.coachAgreement.findFirst({
    where: {
      coachUserId,
      athleteClientId,
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  if (!agreement) return false

  // Look up permission settings
  const permissions = await prisma.athleteCoachPermission.findUnique({
    where: { athleteClientId },
    select: { [permission]: true },
  })

  // Default to sharing if no permission row exists
  if (!permissions) return true

  return permissions[permission] as boolean
}

/**
 * Get all permission flags for an athlete.
 * Creates a default row if none exists.
 */
export async function getAthletePermissions(athleteClientId: string) {
  const existing = await prisma.athleteCoachPermission.findUnique({
    where: { athleteClientId },
  })

  if (existing) return existing

  // Return defaults (no row = all defaults)
  return {
    shareFoodDetails: true,
    shareFoodSummaries: true,
    shareBodyComposition: true,
    shareWorkoutNotes: true,
    shareDailyCheckIns: true,
    shareMenstrualData: false,
    shareInjuryDetails: true,
  }
}
