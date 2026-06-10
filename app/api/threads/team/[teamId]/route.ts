// app/api/threads/team/[teamId]/route.ts
//
// GET — resolve (get-or-create) the team's chat channel for the current user.
// Lazy creation keeps team channels free of any setup step: the first person
// to open the chat tab materializes the thread. (docs/TEAM_CHAT_DESIGN.md)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { ensureTeamChannel } from '@/lib/chat/membership'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

interface RouteContext {
  params: Promise<{ teamId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { teamId } = await context.params
    const businessSlug = new URL(request.url).searchParams.get('businessSlug') ?? undefined

    const result = await ensureTeamChannel(user.id, teamId, businessSlug)
    if (!result) {
      return NextResponse.json(
        { error: t(locale, 'You do not have access to this team', 'Du har inte åtkomst till det här laget') },
        { status: 403 }
      )
    }

    const participant = await prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId: result.thread.id, userId: user.id } },
      select: { lastReadAt: true, mutedUntil: true, notifyPush: true },
    })

    return NextResponse.json({
      thread: result.thread,
      role: result.role,
      lastReadAt: participant?.lastReadAt ?? null,
      currentUserId: user.id,
    })
  } catch (error) {
    console.error('Error resolving team channel:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to load team chat', 'Kunde inte ladda lagchatten') },
      { status: 500 }
    )
  }
}
