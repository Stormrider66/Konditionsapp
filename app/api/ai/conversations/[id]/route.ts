/**
 * Single AI Conversation API
 *
 * GET /api/ai/conversations/[id] - Get conversation with messages
 * PUT /api/ai/conversations/[id] - Update conversation
 * DELETE /api/ai/conversations/[id] - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// GET - Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const rateLimited = await rateLimitJsonResponse('ai:conversations:get', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { id } = await params

    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id,
        coachId: user.id,
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: t(locale, 'Conversation not found', 'Konversationen hittades inte') },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation,
      messages: conversation.messages,
    })
  } catch (error) {
    logger.error('Get conversation error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to get conversation', 'Kunde inte hämta konversation') },
      { status: 500 }
    )
  }
}

// PUT - Update conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const rateLimited = await rateLimitJsonResponse('ai:conversations:update', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { id } = await params

    const body = await request.json()
    const { title, status, selectedSkillIds } = body

    // Verify ownership
    const existing = await prisma.aIConversation.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: t(locale, 'Conversation not found', 'Konversationen hittades inte') },
        { status: 404 }
      )
    }

    const conversation = await prisma.aIConversation.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(Array.isArray(selectedSkillIds)
          ? { selectedSkillIds: selectedSkillIds.filter((id): id is string => typeof id === 'string').slice(0, 5) }
          : {}),
      },
    })

    return NextResponse.json({
      success: true,
      conversation,
    })
  } catch (error) {
    logger.error('Update conversation error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to update conversation', 'Kunde inte uppdatera konversation') },
      { status: 500 }
    )
  }
}

// DELETE - Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const rateLimited = await rateLimitJsonResponse('ai:conversations:delete', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { id } = await params

    // Verify ownership
    const existing = await prisma.aIConversation.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: t(locale, 'Conversation not found', 'Konversationen hittades inte') },
        { status: 404 }
      )
    }

    // Delete conversation (messages cascade)
    await prisma.aIConversation.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: t(locale, 'Conversation deleted', 'Konversationen raderades'),
    })
  } catch (error) {
    logger.error('Delete conversation error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to delete conversation', 'Kunde inte radera konversation') },
      { status: 500 }
    )
  }
}
