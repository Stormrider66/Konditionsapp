// app/api/threads/[threadId]/read/route.ts
//
// PATCH — advance the caller's unread cursor (ThreadParticipant.lastReadAt).
// (docs/TEAM_CHAT_DESIGN.md)

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getThreadForUser, markThreadRead } from '@/lib/chat/membership'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

interface RouteContext {
  params: Promise<{ threadId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    await markThreadRead(threadId, user.id, access.role)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error marking thread read:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update read status', 'Kunde inte uppdatera lässtatus') },
      { status: 500 }
    )
  }
}
