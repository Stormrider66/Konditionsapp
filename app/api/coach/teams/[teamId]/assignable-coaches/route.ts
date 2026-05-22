import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAssignableTeamCoaches } from '@/lib/team-calendar/responsible-coach'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)
    const coaches = await getAssignableTeamCoaches({
      requestingUserId: user.id,
      teamId,
      businessSlug: scope.businessSlug,
      locale: user.language === 'sv' ? 'sv' : 'en',
    })

    return NextResponse.json({ coaches })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error listing assignable team coaches:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
