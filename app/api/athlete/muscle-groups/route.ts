import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { getMuscleGroupData } from '@/lib/strength/muscle-group-data'

const querySchema = z.object({
  period: z.enum(['week', 'month']).default('week'),
  count: z.coerce.number().int().min(1).max(52).default(8),
  locale: z.enum(['en', 'sv']).default('en'),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)
    const { clientId } = resolved

    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = querySchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: t(locale, 'Invalid parameters', 'Ogiltiga parametrar'),
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const requestedLocale = request.nextUrl.searchParams.get('locale')
    const { period, count, locale: parsedLocale } = parsed.data
    const dataLocale = requestedLocale ? parsedLocale : locale
    const data = await getMuscleGroupData(clientId, period, count, dataLocale)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching muscle group data:', error)
    return NextResponse.json(
      { error: t(locale, 'Internal server error', 'Internt serverfel') },
      { status: 500 }
    )
  }
}
