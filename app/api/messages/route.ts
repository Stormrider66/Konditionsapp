// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

// Validation schema for new messages
const createMessageSchema = z.object({
  receiverId: z.string().uuid(),
  content: z
    .string()
    .min(1)
    .max(1000),
  workoutId: z.string().uuid().optional(),
})

/**
 * GET /api/messages
 * Fetch user's messages (inbox/sent) with filtering
 * Query params:
 * - filter: 'all' | 'unread'
 * - conversationWith: userId (filter by conversation partner)
 */
export async function GET(request: NextRequest) {
  let locale: AppLocale = 'en'
  try {
    const user = await getCurrentUser()
    locale = getUserLocale(user?.language)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const conversationWith = searchParams.get('conversationWith')

    // Build where clause - user can only see their own messages
    const where: Prisma.MessageWhereInput = {
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
        error: t(locale, 'Failed to fetch messages', 'Misslyckades med att hämta meddelanden'),
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
  let locale: AppLocale = 'en'
  try {
    const user = await getCurrentUser()
    locale = getUserLocale(user?.language)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
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
          error: formatValidationError(validationResult.error, locale),
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
          error: t(locale, 'Recipient not found', 'Mottagaren hittades inte'),
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
            error: t(locale, 'Workout not found', 'Träningspasset hittades inte'),
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
        message: t(locale, 'Message sent', 'Meddelande skickat'),
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating message', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to send message', 'Misslyckades med att skicka meddelande'),
      },
      { status: 500 }
    )
  }
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatValidationError(error: z.ZodError, locale: AppLocale): string {
  const issue = error.errors[0]
  const field = issue?.path[0]

  if (field === 'receiverId') return t(locale, 'Invalid recipient ID', 'Ogiltigt mottagare-ID')
  if (field === 'workoutId') return t(locale, 'Invalid workout ID', 'Ogiltigt träningspass-ID')
  if (field === 'content') {
    if (issue?.code === 'too_small') return t(locale, 'Message cannot be empty', 'Meddelandet får inte vara tomt')
    if (issue?.code === 'too_big') return t(locale, 'Message can be at most 1000 characters', 'Meddelandet får max vara 1000 tecken')
  }

  return t(locale, 'Invalid request', 'Ogiltig förfrågan')
}
