/**
 * Care Team Notification Service
 *
 * Handles notifications for care team communication including:
 * - New message notifications
 * - Urgent thread alerts
 * - Thread creation notifications
 * - Restriction alerts to coaches
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface CareTeamNotificationData {
  type: 'NEW_MESSAGE' | 'THREAD_CREATED' | 'URGENT_THREAD' | 'RESTRICTION_CREATED' | 'REHAB_PROGRAM_CREATED' | 'MENTIONED'
  threadId?: string
  messageId?: string
  senderId: string
  recipientId: string
  clientId: string
  subject?: string
  content?: string
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
  contextData?: Record<string, unknown>
}

/**
 * Send a care team notification to a user
 */
export async function sendCareTeamNotification(data: CareTeamNotificationData): Promise<void> {
  try {
    const { type, threadId, senderId, recipientId, clientId, subject, content, priority, contextData } = data

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, role: true },
    })

    // Get client/athlete info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    })

    // Determine notification title and message based on type
    let title: string
    let message: string
    let notificationType: string

    switch (type) {
      case 'NEW_MESSAGE':
        title = `Nytt meddelande från ${sender?.name || 'Okänd'}`
        message = content ? (content.length > 100 ? content.substring(0, 97) + '...' : content) : 'Du har ett nytt meddelande i vårdteamet.'
        notificationType = 'CARE_TEAM_MESSAGE'
        break

      case 'THREAD_CREATED':
        title = `Ny konversation: ${subject || 'Utan ämne'}`
        message = `${sender?.name || 'Någon'} har startat en ny vårdteamkonversation angående ${client?.name || 'en atlet'}.`
        notificationType = 'CARE_TEAM_THREAD'
        break

      case 'URGENT_THREAD':
        title = `BRÅDSKANDE: ${subject || 'Vårdteammeddelande'}`
        message = `${sender?.name || 'Någon'} har markerat en konversation som brådskande.`
        notificationType = 'CARE_TEAM_URGENT'
        break

      case 'RESTRICTION_CREATED':
        title = `Träningsrestriktion skapad för ${client?.name || 'atlet'}`
        message = `En fysioterapeut har skapat en ny träningsrestriktion. Se över atletens träningsprogram.`
        notificationType = 'RESTRICTION_ALERT'
        break

      case 'REHAB_PROGRAM_CREATED':
        title = `Nytt rehabprogram för ${client?.name || 'atlet'}`
        message = `Ett nytt rehabiliteringsprogram har skapats. En konversation har startats för koordinering.`
        notificationType = 'REHAB_PROGRAM_ALERT'
        break

      case 'MENTIONED':
        title = `Du nämndes i en konversation`
        message = `${sender?.name || 'Någon'} nämnde dig i en vårdteamkonversation.`
        notificationType = 'CARE_TEAM_MENTION'
        break

      default:
        title = 'Vårdteamnotifikation'
        message = 'Du har en ny vårdteamnotifikation.'
        notificationType = 'CARE_TEAM'
    }

    // Create the notification
    await prisma.aINotification.create({
      data: {
        clientId,
        notificationType,
        title,
        message,
        priority: priority === 'URGENT' ? 'CRITICAL' : priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        contextData: {
          ...contextData,
          threadId,
          senderId,
          senderName: sender?.name,
          senderRole: sender?.role,
          notificationSubType: type,
        },
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      },
    })

    logger.info('Care team notification created', {
      type,
      recipientId,
      threadId,
      priority,
    })

  } catch (error) {
    logger.error('Failed to send care team notification', { data }, error)
    throw error
  }
}

/**
 * Send notifications to all thread participants except the sender
 */
export async function notifyThreadParticipants(
  threadId: string,
  senderId: string,
  type: 'NEW_MESSAGE' | 'URGENT_THREAD' | 'THREAD_CREATED',
  options?: {
    content?: string
    subject?: string
    priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
    mentionedUserIds?: string[]
  }
): Promise<void> {
  try {
    // Get thread with participants
    const thread = await prisma.careTeamThread.findUnique({
      where: { id: threadId },
      include: {
        participants: {
          where: {
            isActive: true,
            userId: { not: senderId }, // Exclude sender
          },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!thread) {
      logger.warn('Thread not found for notification', { threadId })
      return
    }

    // Send notification to each participant
    const notifications = thread.participants.map(async (participant) => {
      // Check if user should receive notifications
      if (!participant.notifyPush && !participant.notifyEmail) {
        return
      }

      // Check if this user was mentioned
      const wasMentioned = options?.mentionedUserIds?.includes(participant.userId)

      await sendCareTeamNotification({
        type: wasMentioned ? 'MENTIONED' : type,
        threadId,
        senderId,
        recipientId: participant.userId,
        clientId: thread.clientId,
        subject: options?.subject || thread.subject,
        content: options?.content,
        priority: options?.priority || thread.priority,
        contextData: {
          wasMentioned,
        },
      })
    })

    await Promise.all(notifications)

    logger.info('Thread participants notified', {
      threadId,
      participantCount: thread.participants.length,
      type,
    })

  } catch (error) {
    logger.error('Failed to notify thread participants', { threadId, senderId, type }, error)
    throw error
  }
}

/**
 * Notify coach when a restriction is created by physio
 */
export async function notifyCoachOfRestriction(
  restrictionId: string,
  physioUserId: string,
  clientId: string
): Promise<void> {
  try {
    // Get the client's coach
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    if (!client?.userId) {
      logger.warn('No coach found for client', { clientId })
      return
    }

    // Get restriction details
    const restriction = await prisma.trainingRestriction.findUnique({
      where: { id: restrictionId },
      select: {
        type: true,
        severity: true,
        bodyParts: true,
        description: true,
      },
    })

    await sendCareTeamNotification({
      type: 'RESTRICTION_CREATED',
      senderId: physioUserId,
      recipientId: client.userId,
      clientId,
      priority: restriction?.severity === 'HIGH' ? 'HIGH' : 'NORMAL',
      contextData: {
        restrictionId,
        restrictionType: restriction?.type,
        severity: restriction?.severity,
        bodyParts: restriction?.bodyParts,
        description: restriction?.description,
      },
    })

    logger.info('Coach notified of new restriction', {
      clientId,
      coachId: client.userId,
      restrictionId,
    })

  } catch (error) {
    logger.error('Failed to notify coach of restriction', { restrictionId, clientId }, error)
    throw error
  }
}

/**
 * Auto-create a care team thread when a rehab program is created
 * This facilitates communication between physio and coach about the program
 */
export async function createRehabProgramThread(
  rehabProgramId: string,
  physioUserId: string,
  clientId: string,
  programName: string,
  exerciseSummary?: string
): Promise<string> {
  try {
    // Get the client's coach
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: { id: true, name: true },
        },
        athleteAccount: {
          select: { userId: true },
        },
      },
    })

    // Get physio info
    const physio = await prisma.user.findUnique({
      where: { id: physioUserId },
      select: { name: true },
    })

    // Build participant list
    const participantUserIds = new Set<string>([physioUserId])
    if (client?.userId) {
      participantUserIds.add(client.userId)
    }
    // Optionally add athlete (commented out - they may not need to be in coordination threads)
    // if (client?.athleteAccount?.userId) {
    //   participantUserIds.add(client.athleteAccount.userId)
    // }

    // Create the thread
    const thread = await prisma.$transaction(async (tx) => {
      const newThread = await tx.careTeamThread.create({
        data: {
          clientId,
          createdById: physioUserId,
          subject: `Rehabprogram: ${programName}`,
          description: `Koordinering av rehabiliteringsprogram för ${client?.name || 'atlet'}.`,
          rehabProgramId,
          priority: 'NORMAL',
          status: 'OPEN',
        },
      })

      // Add participants
      const participantData = Array.from(participantUserIds).map(userId => ({
        threadId: newThread.id,
        userId,
        role: userId === physioUserId ? 'OWNER' : 'COACH',
        notifyEmail: true,
        notifyPush: true,
      }))

      await tx.careTeamParticipant.createMany({
        data: participantData,
      })

      // Create initial message with program summary
      const initialMessage = `Nytt rehabiliteringsprogram har skapats för ${client?.name || 'atleten'}.\n\n**Program:** ${programName}\n\n${exerciseSummary ? `**Övningar:**\n${exerciseSummary}` : ''}\n\nKontakta mig om du har frågor om programmet eller behöver justera träningen.`

      await tx.careTeamMessage.create({
        data: {
          threadId: newThread.id,
          senderId: physioUserId,
          content: initialMessage,
        },
      })

      await tx.careTeamThread.update({
        where: { id: newThread.id },
        data: { lastMessageAt: new Date() },
      })

      return newThread
    })

    // Notify participants
    await notifyThreadParticipants(thread.id, physioUserId, 'THREAD_CREATED', {
      subject: `Rehabprogram: ${programName}`,
      priority: 'NORMAL',
    })

    // Also send specific rehab program notification to coach
    if (client?.userId) {
      await sendCareTeamNotification({
        type: 'REHAB_PROGRAM_CREATED',
        threadId: thread.id,
        senderId: physioUserId,
        recipientId: client.userId,
        clientId,
        subject: programName,
        priority: 'NORMAL',
        contextData: {
          rehabProgramId,
          programName,
          physioName: physio?.name,
        },
      })
    }

    logger.info('Rehab program thread created', {
      threadId: thread.id,
      rehabProgramId,
      clientId,
    })

    return thread.id

  } catch (error) {
    logger.error('Failed to create rehab program thread', { rehabProgramId, clientId }, error)
    throw error
  }
}

/**
 * Get unread message count for a user across all their threads
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const participations = await prisma.careTeamParticipant.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        thread: {
          select: {
            lastMessageAt: true,
          },
        },
      },
    })

    let unreadCount = 0
    for (const participation of participations) {
      if (participation.thread.lastMessageAt) {
        const lastMessageTime = new Date(participation.thread.lastMessageAt).getTime()
        const lastReadTime = participation.lastReadAt ? new Date(participation.lastReadAt).getTime() : 0

        if (lastMessageTime > lastReadTime) {
          unreadCount++
        }
      }
    }

    return unreadCount

  } catch (error) {
    logger.error('Failed to get unread message count', { userId }, error)
    return 0
  }
}

/**
 * Mark all messages in a thread as read for a user
 */
export async function markThreadAsRead(threadId: string, userId: string): Promise<void> {
  try {
    await prisma.careTeamParticipant.updateMany({
      where: {
        threadId,
        userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    })

    logger.debug('Thread marked as read', { threadId, userId })

  } catch (error) {
    logger.error('Failed to mark thread as read', { threadId, userId }, error)
    throw error
  }
}
