// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schema for new messages
const createMessageSchema = z.object({
  receiverId: z.string().uuid('Ogiltigt mottagare-ID'),
  content: z
    .string()
    .min(1, 'Meddelandet får inte vara tomt')
    .max(1000, 'Meddelandet får max vara 1000 tecken'),
  workoutId: z.string().uuid('Ogiltigt träningspass-ID').optional(),
})

/**
 * GET /api/messages
 * Fetch user's messages (inbox/sent) with filtering
 * Query params:
 * - filter: 'all' | 'unread'
 * - conversationWith: userId (filter by conversation partner)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig',
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const conversationWith = searchParams.get('conversationWith')

    // Build where clause - user can only see their own messages
    const where: any = {
      OR: [
        { senderId: user.id },
        { receiverId: user.id },
      ],
    }

    // Filter by unread (only received messages)
    if (filter === 'unread') {
      where.AND = [
        { receiverId: user.id },
        { isRead: false },
      ]
    }

    // Filter by conversation partner
    if (conversationWith) {
      where.OR = [
        { senderId: user.id, receiverId: conversationWith },
        { senderId: conversationWith, receiverId: user.id },
      ]
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        workout: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: messages,
    })
  } catch (error) {
    logger.error('Error fetching messages', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att hämta meddelanden',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/messages
 * Send new message
 * Required: receiverId, content
 * Optional: workoutId
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig',
        },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validationResult = createMessageSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.errors[0].message,
        },
        { status: 400 }
      )
    }

    const { receiverId, content, workoutId } = validationResult.data

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    })

    if (!receiver) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mottagaren hittades inte',
        },
        { status: 404 }
      )
    }

    // Verify workout exists if workoutId provided
    if (workoutId) {
      const workout = await prisma.workout.findUnique({
        where: { id: workoutId },
      })

      if (!workout) {
        return NextResponse.json(
          {
            success: false,
            error: 'Träningspasset hittades inte',
          },
          { status: 404 }
        )
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId,
        content,
        workoutId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        workout: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: message,
        message: 'Meddelande skickat',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating message', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att skicka meddelande',
      },
      { status: 500 }
    )
  }
}
