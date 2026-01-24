// app/api/care-team/threads/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { notifyThreadParticipants } from '@/lib/notifications/care-team'
import { logger } from '@/lib/logger'

const createMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  attachments: z.array(z.object({
    type: z.enum(['IMAGE', 'FILE', 'VIDEO']),
    url: z.string().url(),
    name: z.string(),
    size: z.number().optional(),
  })).optional(),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
})

/**
 * GET /api/care-team/threads/[id]/messages
 * Get messages for a care team thread with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: threadId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const before = searchParams.get('before') // For loading older messages

    // Verify thread exists and user is a participant
    const thread = await prisma.careTeamThread.findUnique({
      where: { id: threadId },
      include: {
        participants: {
          where: { userId: user.id, isActive: true },
        },
      },
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    if (thread.participants.length === 0 && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build where clause
    const where: Record<string, unknown> = { threadId }
    if (before) {
      where.createdAt = { lt: new Date(before) }
    }

    const [messages, total] = await Promise.all([
      prisma.careTeamMessage.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.careTeamMessage.count({ where: { threadId } }),
    ])

    // Return in chronological order
    const sortedMessages = messages.reverse()

    return NextResponse.json({
      messages: sortedMessages,
      total,
      limit,
      offset,
      hasMore: offset + messages.length < total,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/care-team/threads/[id]/messages
 * Send a message to a care team thread
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: threadId } = await params
    const body = await request.json()
    const validatedData = createMessageSchema.parse(body)

    // Verify thread exists and user is a participant
    const thread = await prisma.careTeamThread.findUnique({
      where: { id: threadId },
      include: {
        participants: {
          where: { userId: user.id, isActive: true },
        },
      },
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    if (thread.participants.length === 0 && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create message and update thread in a transaction
    const message = await prisma.$transaction(async (tx) => {
      // Create the message
      const newMessage = await tx.careTeamMessage.create({
        data: {
          threadId,
          senderId: user.id,
          content: validatedData.content,
          attachments: validatedData.attachments,
          mentionedUserIds: validatedData.mentionedUserIds || [],
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      })

      // Update thread's last message timestamp
      await tx.careTeamThread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date() },
      })

      // Update sender's last read timestamp
      await tx.careTeamParticipant.updateMany({
        where: {
          threadId,
          userId: user.id,
        },
        data: {
          lastReadAt: new Date(),
        },
      })

      return newMessage
    })

    // Send notifications to other participants
    try {
      await notifyThreadParticipants(threadId, user.id, 'NEW_MESSAGE', {
        content: validatedData.content,
        mentionedUserIds: validatedData.mentionedUserIds,
      })
    } catch (notifyError) {
      // Don't fail the message send if notifications fail
      logger.error('Failed to send notifications', { threadId }, notifyError)
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
