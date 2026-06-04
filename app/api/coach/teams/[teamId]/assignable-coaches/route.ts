import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAssignableTeamCoaches } from '@/lib/team-calendar/responsible-coach'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)
    const coaches = await getAssignableTeamCoaches({
      requestingUserId: user.id,
      teamId,
      businessSlug: scope.businessSlug,
      locale,
    })

    return NextResponse.json({ coaches })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error listing assignable team coaches:', error)
    return NextResponse.json({ error: t(locale, 'Failed', 'Misslyckades') }, { status: 500 })
  }
}
