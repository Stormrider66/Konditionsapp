/**
 * Broadcast Notification Service
 *
 * Sends notifications for community posts via in-app, email, and SMS.
 * Respects EMAILS_PAUSED kill switch.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

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
    const teamMembers = await prisma.client.findMany({
      where: {
        teamId,
        userId: { not: undefined },
      },
      select: { userId: true },
    })

    // Also get the team members' user accounts via athleteAccount
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

  let sent = 0

  // Create in-app notifications
  if (notifyInApp) {
    const truncatedMessage = message.length > 200 ? message.slice(0, 200) + '...' : message

    await prisma.broadcastNotification.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        postId,
        title: `${authorName}: ${title || type}`,
        message: truncatedMessage,
        type,
      })),
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

        // Get email addresses
        const users = await prisma.user.findMany({
          where: { id: { in: targetUserIds } },
          select: { email: true, name: true },
        })

        const validEmails = users.filter((u) => u.email).map((u) => u.email!)

        if (validEmails.length > 0) {
          // Send batch email (Resend supports batch)
          // Use BCC for privacy
          const batchSize = 50
          for (let i = 0; i < validEmails.length; i += batchSize) {
            const batch = validEmails.slice(i, i + batchSize)
            await resend.emails.send({
              from: 'Trainomics <noreply@trainomics.app>',
              to: 'noreply@trainomics.app',
              bcc: batch,
              subject: `${authorName}: ${title || message.slice(0, 50)}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a1a1a;">${title || type}</h2>
                  <p style="color: #333; font-size: 16px; line-height: 1.5;">${message}</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="color: #888; font-size: 12px;">
                    Skickat av ${authorName} via Trainomics
                  </p>
                </div>
              `,
            })
          }

          logger.info('Sent email broadcast', { postId, count: validEmails.length })
        }
      }
    } catch (err) {
      logger.error('Email broadcast failed', { postId, error: String(err) })
    }
  }

  // Mark post as notified
  await prisma.communityPost.update({
    where: { id: postId },
    data: { notifiedAt: new Date() },
  })

  return { sent }
}
