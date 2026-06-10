/**
 * Tactics Board (Taktiktavla) Notification Service
 *
 * Notifies athletes when a coach publishes a drill to their team
 * (or business-wide). Notifications surface in the athlete's in-app
 * notification feed (AINotification).
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatDay(date: Date, locale: AppLocale): string {
  return date.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC', // scheduledDate is @db.Date (UTC midnight)
  })
}

/**
 * Notify all athletes on the drill's team (or in the business, for
 * business-wide drills) that a new drill has been published.
 */
export async function notifyDrillPublished(drillId: string): Promise<void> {
  try {
    const drill = await prisma.teamDrill.findUnique({
      where: { id: drillId },
      select: {
        id: true,
        title: true,
        teamId: true,
        businessId: true,
        scheduledDate: true,
        isPublished: true,
        createdBy: { select: { name: true } },
      },
    })

    if (!drill || !drill.isPublished) return

    const clients = await prisma.client.findMany({
      where: drill.teamId
        ? { teamId: drill.teamId }
        : { businessId: drill.businessId },
      select: {
        id: true,
        athleteAccount: {
          select: { user: { select: { language: true } } },
        },
      },
    })

    if (clients.length === 0) return

    // Expire after the practice day has passed (or 7 days for undated drills)
    const expiresAt = drill.scheduledDate
      ? new Date(drill.scheduledDate.getTime() + 2 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.aINotification.createMany({
      data: clients.map((client) => {
        const locale = resolveLocale(client.athleteAccount?.user?.language)
        const coachName = drill.createdBy?.name || t(locale, 'Your coach', 'Din tränare')
        const message = drill.scheduledDate
          ? t(
              locale,
              `${coachName} published "${drill.title}" for practice on ${formatDay(drill.scheduledDate, locale)}.`,
              `${coachName} publicerade "${drill.title}" inför träningen ${formatDay(drill.scheduledDate, locale)}.`
            )
          : t(
              locale,
              `${coachName} published a new drill: "${drill.title}".`,
              `${coachName} publicerade en ny övning: "${drill.title}".`
            )

        return {
          clientId: client.id,
          notificationType: 'TEAM_DRILL_PUBLISHED',
          priority: 'NORMAL',
          title: t(locale, 'New tactics from your coach', 'Ny taktik från din tränare'),
          message,
          icon: '🏒',
          contextData: { drillId: drill.id, scheduledDate: drill.scheduledDate?.toISOString() ?? null },
          triggeredBy: 'event',
          expiresAt,
        }
      }),
    })

    logger.info('Drill published notifications created', {
      drillId: drill.id,
      recipients: clients.length,
    })
  } catch (error) {
    // Never block the publish flow on notification failures
    logger.error('Failed to create drill published notifications', { drillId, error })
  }
}
