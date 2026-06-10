// app/api/threads/[threadId]/messages/route.ts
//
// GET  — cursor-paginated messages, newest first (client reverses for display).
// POST — send a message. Writes stay REST so auth/Zod/push fan-out live here;
//        Realtime broadcast is added DB-side in slice 2. (docs/TEAM_CHAT_DESIGN.md)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { getThreadForUser, touchParticipant } from '@/lib/chat/membership'
import { sendThreadPush } from '@/lib/chat/push'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

interface RouteContext {
  params: Promise<{ threadId: string }>
}

const SENDER_SELECT = { id: true, name: true, role: true } as const
const MAX_PAGE_SIZE = 100

const createMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  replyToId: z.string().uuid().optional(),
  mentionedUserIds: z.array(z.string().uuid()).max(20).default([]),
})

export async function GET(request: NextRequest, context: RouteContext) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { threadId } = await context.params
    const { searchParams } = new URL(request.url)
    const businessSlug = searchParams.get('businessSlug') ?? undefined

    const access = await getThreadForUser(user.id, threadId, businessSlug)
    if (!access) {
      return NextResponse.json(
        { error: t(locale, 'You do not have access to this conversation', 'Du har inte åtkomst till den här konversationen') },
        { status: 403 }
      )
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, MAX_PAGE_SIZE)
    const cursor = searchParams.get('cursor')

    const messages = await prisma.threadMessage.findMany({
      where: { threadId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: SENDER_SELECT },
        replyTo: {
          select: { id: true, content: true, deletedAt: true, sender: { select: SENDER_SELECT } },
        },
      },
    })

    const hasMore = messages.length > limit
    const page = hasMore ? messages.slice(0, limit) : messages

    return NextResponse.json({
      messages: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    })
  } catch (error) {
    console.error('Error fetching thread messages:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch messages', 'Kunde inte hämta meddelanden') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { threadId } = await context.params
    const businessSlug = new URL(request.url).searchParams.get('businessSlug') ?? undefined

    const access = await getThreadForUser(user.id, threadId, businessSlug)
    if (!access) {
      return NextResponse.json(
        { error: t(locale, 'You do not have access to this conversation', 'Du har inte åtkomst till den här konversationen') },
        { status: 403 }
      )
    }
    if (access.thread.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: t(locale, 'This conversation is archived', 'Den här konversationen är arkiverad') },
        { status: 409 }
      )
    }

    const body = await request.json()
    const data = createMessageSchema.parse(body)

    if (data.replyToId) {
      const replyTarget = await prisma.threadMessage.findFirst({
        where: { id: data.replyToId, threadId },
        select: { id: true },
      })
      if (!replyTarget) {
        return NextResponse.json(
          { error: t(locale, 'Message to reply to was not found', 'Meddelandet att svara på hittades inte') },
          { status: 400 }
        )
      }
    }

    await touchParticipant(threadId, user.id, access.role)

    const now = new Date()
    const [message] = await prisma.$transaction([
      prisma.threadMessage.create({
        data: {
          threadId,
          senderId: user.id,
          content: data.content,
          replyToId: data.replyToId,
          mentionedUserIds: data.mentionedUserIds,
        },
        include: {
          sender: { select: SENDER_SELECT },
          replyTo: {
            select: { id: true, content: true, deletedAt: true, sender: { select: SENDER_SELECT } },
          },
        },
      }),
      prisma.thread.update({
        where: { id: threadId },
        data: { lastMessageAt: now },
      }),
      // Sending implies having read the thread up to now.
      prisma.threadParticipant.update({
        where: { threadId_userId: { threadId, userId: user.id } },
        data: { lastReadAt: now },
      }),
    ])

    // Best-effort; no-op until devices register tokens (lib/chat/push.ts).
    await sendThreadPush({
      threadId,
      senderId: user.id,
      senderName: message.sender.name,
      content: data.content,
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error sending thread message:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to send message', 'Kunde inte skicka meddelandet') },
      { status: 500 }
    )
  }
}
