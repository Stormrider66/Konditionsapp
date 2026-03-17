import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getMuscleGroupData } from '@/lib/strength/muscle-group-data'

const querySchema = z.object({
  period: z.enum(['week', 'month']).default('week'),
  count: z.coerce.number().int().min(1).max(52).default(8),
})

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = querySchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { period, count } = parsed.data
    const data = await getMuscleGroupData(clientId, period, count)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching muscle group data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
