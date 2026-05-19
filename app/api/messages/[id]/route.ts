// app/api/messages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

/**
 * PATCH /api/messages/[id]
 * Mark message as read
 * Authorization: Only receiver can mark as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Fetch the message
    const message = await prisma.message.findUnique({
      where: { id },
    })

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Message not found', 'Meddelandet hittades inte'),
        },
        { status: 404 }
      )
    }

    // Authorization: Only receiver can mark as read
    if (message.receiverId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'You do not have permission to mark this message as read', 'Du har inte behörighet att markera detta meddelande som läst'),
        },
        { status: 403 }
      )
    }

    // Update message to mark as read
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
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

    return NextResponse.json({
      success: true,
      data: updatedMessage,
      message: t(locale, 'Message marked as read', 'Meddelande markerat som läst'),
    })
  } catch (error) {
    logger.error('Error marking message as read', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to mark message as read', 'Misslyckades med att markera meddelande som läst'),
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
