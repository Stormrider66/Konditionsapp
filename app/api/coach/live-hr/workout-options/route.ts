/**
 * Live HR workout options API
 *
 * Returns planned/recent cardio and hybrid workouts that can drive Live HR targets.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { listLiveHRWorkoutOptions } from '@/lib/live-hr/workout-plans'
import { resolveLocale, t, type AppLocale } from '@/lib/live-hr/api-locale'

export async function GET(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId') ?? undefined

    const options = await listLiveHRWorkoutOptions({
      coachId: user.id,
      clientId,
    })

    return NextResponse.json({ options })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error listing Live HR workout options:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to list workouts', 'Kunde inte hämta passen') },
      { status: 500 }
    )
  }
}
