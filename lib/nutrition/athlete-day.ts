/**
 * Server-side athlete timezone lookup for calendar-day bucketing.
 */

import { prisma } from '@/lib/prisma'

export const DEFAULT_ATHLETE_TIMEZONE = 'Europe/Stockholm'

/**
 * The athlete's IANA timezone. Sourced from AINotificationPreferences (the
 * only per-athlete timezone we store); defaults to Europe/Stockholm, which
 * matches the model default and the user base.
 */
export async function getAthleteTimezone(clientId: string): Promise<string> {
  try {
    const prefs = await prisma.aINotificationPreferences.findUnique({
      where: { clientId },
      select: { timezone: true },
    })
    return prefs?.timezone || DEFAULT_ATHLETE_TIMEZONE
  } catch {
    return DEFAULT_ATHLETE_TIMEZONE
  }
}
