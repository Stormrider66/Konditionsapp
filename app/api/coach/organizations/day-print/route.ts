import { NextRequest, NextResponse } from 'next/server'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getOrganizationDayPrintItems } from '@/lib/workout-print/day-pack'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const organizationId = searchParams.get('organizationId')
    const teamId = searchParams.get('teamId')

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      )
    }

    const items = await getOrganizationDayPrintItems({
      userId: user.id,
      businessSlug: scope.businessSlug,
      date,
      organizationId: organizationId || null,
      teamId: teamId || null,
    })

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    logger.error('Error fetching organization day print items', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch day print items' },
      { status: 500 }
    )
  }
}
