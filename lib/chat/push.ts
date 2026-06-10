// Expo push fan-out for thread messages (docs/TEAM_CHAT_DESIGN.md, slice 3).
//
// Server side of the native-app slice. Recipients are explicit thread
// participants (rows exist once a user has opened the thread) minus the
// sender, filtered by notifyPush/mutedUntil. No registered tokens → no-op,
// so this stays inert until the native app starts registering
// DevicePushTokens via POST /api/push-tokens.

import { prisma } from '@/lib/prisma'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE = 100
const MAX_BODY_LENGTH = 180

interface ExpoPushTicket {
  status: string
  details?: { error?: string }
}

export async function sendThreadPush(options: {
  threadId: string
  senderId: string
  senderName: string
  content: string
}) {
  const { threadId, senderId, senderName, content } = options

  try {
    const now = new Date()
    const recipients = await prisma.threadParticipant.findMany({
      where: {
        threadId,
        isActive: true,
        notifyPush: true,
        userId: { not: senderId },
        OR: [{ mutedUntil: null }, { mutedUntil: { lt: now } }],
      },
      select: { userId: true },
    })
    if (recipients.length === 0) return

    const tokens = await prisma.devicePushToken.findMany({
      where: {
        userId: { in: recipients.map((r) => r.userId) },
        provider: 'expo',
      },
      select: { token: true },
    })
    if (tokens.length === 0) return

    const body =
      content.length > MAX_BODY_LENGTH ? `${content.slice(0, MAX_BODY_LENGTH - 1)}…` : content
    const messages = tokens.map(({ token }) => ({
      to: token,
      title: senderName,
      body,
      data: { type: 'thread_message', threadId },
    }))

    const staleTokens: string[] = []
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE)
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      if (!res.ok) continue

      const result = (await res.json()) as { data?: ExpoPushTicket[] }
      result.data?.forEach((ticket, index) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          staleTokens.push(batch[index].to)
        }
      })
    }

    if (staleTokens.length > 0) {
      await prisma.devicePushToken.deleteMany({ where: { token: { in: staleTokens } } })
    }
  } catch (error) {
    // Push is best-effort — never fail the message send over it.
    console.error('Thread push fan-out failed:', error)
  }
}
