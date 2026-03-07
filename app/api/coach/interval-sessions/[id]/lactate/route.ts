/**
 * Interval Session Lactate API
 *
 * POST - Record lactate measurement
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { recordLactate } from '@/lib/interval-session/lactate-service'
import { recordLactateSchema } from '@/lib/interval-session/validation'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const body = await req.json()
    const parsed = recordLactateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await recordLactate(
      id,
      user.id,
      parsed.data.clientId,
      parsed.data.intervalNumber,
      parsed.data.lactate,
      parsed.data.heartRate,
      parsed.data.notes
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error recording lactate:', error)
    return NextResponse.json(
      { error: 'Failed to record lactate' },
      { status: 500 }
    )
  }
}
