/**
 * Broadcast Notification Service
 *
 * Sends notifications for community posts via in-app, email, and SMS.
 * Respects EMAILS_PAUSED kill switch.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isSMSConfigured, sendBulkSMS } from '@/lib/sms'

interface BroadcastOptions {
  postId: string
  businessId: string
  teamId?: string | null
  authorName: string
  title: string
  message: string
  type: string
  notifyInApp: boolean
  notifyEmail: boolean
  notifySMS: boolean
}

type AppLocale = 'en' | 'sv'

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function defaultBroadcastTitle(type: string, locale: AppLocale): string {
  if (type === 'ANNOUNCEMENT') {
    return locale === 'sv' ? 'Nytt meddelande' : 'New message'
  }

  return locale === 'sv' ? 'Communityuppdatering' : 'Community update'
}

function broadcastTitle(title: string | null | undefined, type: string, locale: AppLocale): string {
  return title || defaultBroadcastTitle(type, locale)
}

/**
 * Send broadcast notifications for a community post.
 * Creates in-app notifications and optionally sends email.
 */
export async function sendBroadcast(options: BroadcastOptions): Promise<{ sent: number }> {
  const {
    postId,
    businessId,
    teamId,
    authorName,
    title,
    message,
    type,
    notifyInApp,
    notifyEmail,
  } = options

  // Find all target athletes
  let targetUserIds: string[] = []

  if (teamId) {
    // Team-scoped: notify athletes in this team
    const athleteAccounts = await prisma.athleteAccount.findMany({
      where: {
        client: { teamId },
      },
      select: { userId: true },
    })

    targetUserIds = athleteAccounts.map((a) => a.userId)
  } else {
    // Business-wide: notify all members
    const members = await prisma.businessMember.findMany({
      where: {
        businessId,
        isActive: true,
        role: { notIn: ['OWNER', 'ADMIN'] }, // Don't notify coaches/admins
      },
      select: { userId: true },
    })

    targetUserIds = members.map((m) => m.userId)
  }

  if (targetUserIds.length === 0) {
    logger.info('No broadcast targets found', { postId, businessId, teamId })
    return { sent: 0 }
  }

  const targetUsers = await prisma.user.findMany({
    where: { id: { in: targetUserIds } },
    select: { id: true, email: true, name: true, language: true },
  })
  const targetUserById = new Map(targetUsers.map((user) => [user.id, user]))

  let sent = 0

  // Create in-app notifications
  if (notifyInApp) {
    const truncatedMessage = message.length > 200 ? message.slice(0, 200) + '...' : message

    await prisma.broadcastNotification.createMany({
      data: targetUserIds.map((userId) => {
        const locale = resolveLocale(targetUserById.get(userId)?.language)
        return {
          userId,
          postId,
          title: `${authorName}: ${broadcastTitle(title, type, locale)}`,
          message: truncatedMessage,
          type,
        }
      }),
      skipDuplicates: true,
    })

    sent = targetUserIds.length
    logger.info('Created in-app broadcast notifications', { postId, count: sent })
  }

  // Send emails (respects EMAILS_PAUSED)
  if (notifyEmail && process.env.EMAILS_PAUSED !== 'true') {
    try {
      const { Resend } = await import('resend')
      const resendKey = process.env.RESEND_API_KEY
      if (!resendKey) {
        logger.warn('RESEND_API_KEY not set, skipping email broadcast')
      } else {
        const resend = new Resend(resendKey)

        const emailsByLocale = targetUsers.reduce<Record<AppLocale, string[]>>((acc, user) => {
          if (user.email) {
            acc[resolveLocale(user.language)].push(user.email)
          }
          return acc
        }, { en: [], sv: [] })

        if (emailsByLocale.en.length + emailsByLocale.sv.length > 0) {
          // Send batch email (Resend supports batch)
          // Use BCC for privacy
          const batchSize = 50
          for (const locale of ['en', 'sv'] as const) {
            const validEmails = emailsByLocale[locale]
            const localizedTitle = broadcastTitle(title, type, locale)
            const footer = locale === 'sv' ? `Skickat av ${authorName} via Trainomics` : `Sent by ${authorName} via Trainomics`

            for (let i = 0; i < validEmails.length; i += batchSize) {
              const batch = validEmails.slice(i, i + batchSize)
              await resend.emails.send({
                from: 'Trainomics <noreply@trainomics.app>',
                to: 'noreply@trainomics.app',
                bcc: batch,
                subject: `${authorName}: ${localizedTitle || message.slice(0, 50)}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a1a1a;">${localizedTitle}</h2>
                    <p style="color: #333; font-size: 16px; line-height: 1.5;">${message}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="color: #888; font-size: 12px;">
                      ${footer}
                    </p>
                  </div>
                `,
              })
            }
          }

          logger.info('Sent email broadcast', { postId, count: emailsByLocale.en.length + emailsByLocale.sv.length })
        }
      }
    } catch (err) {
      logger.error('Email broadcast failed', { postId, error: String(err) })
    }
  }

  // Send SMS (if configured and requested)
  if (options.notifySMS && isSMSConfigured()) {
    try {
      // Get phone numbers for target users' athlete clients
      const clientsWithPhone = await prisma.client.findMany({
        where: {
          phone: { not: null },
          athleteAccount: {
            userId: { in: targetUserIds },
          },
        },
        select: {
          phone: true,
          athleteAccount: {
            select: {
              user: { select: { language: true } },
            },
          },
        },
      })

      const smsRecipients = clientsWithPhone
        .filter((c) => c.phone)
        .map((c) => {
          const locale = resolveLocale(c.athleteAccount?.user?.language)
          return {
            phone: c.phone!,
            body: `${authorName}: ${broadcastTitle(title, type, locale)}\n\n${message.slice(0, 160)}`,
          }
        })

      if (smsRecipients.length > 0) {
        const result = await sendBulkSMS(smsRecipients)
        logger.info('Sent SMS broadcast', {
          postId,
          sent: result.sent,
          failed: result.failed,
        })
      }
    } catch (err) {
      logger.error('SMS broadcast failed', { postId, error: String(err) })
    }
  }

  // Mark post as notified
  await prisma.communityPost.update({
    where: { id: postId },
    data: { notifiedAt: new Date() },
  })

  return { sent }
}
