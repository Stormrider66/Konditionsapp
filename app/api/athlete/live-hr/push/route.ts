/**
 * Live HR Push API
 *
 * POST - Push HR reading from athlete/device
 * GET  - Get active session for athlete
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { pushHRReading, getActiveSessionForAthlete } from '@/lib/live-hr/reading-service'
import { PushHRReadingInput } from '@/lib/live-hr/types'

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const body: PushHRReadingInput = await req.json()

    // Validate heart rate
    if (!body.heartRate || body.heartRate < 30 || body.heartRate > 250) {
      return NextResponse.json(
        { error: 'Invalid heart rate (must be 30-250 bpm)' },
        { status: 400 }
      )
    }

    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'sessionId required' },
        { status: 400 }
      )
    }

    const success = await pushHRReading(clientId, body)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to push reading (not in active session)' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error pushing HR reading:', error)
    return NextResponse.json(
      { error: 'Failed to push reading' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const activeSession = await getActiveSessionForAthlete(clientId)

    return NextResponse.json({ activeSession })
  } catch (error) {
    console.error('Error getting active session:', error)
    return NextResponse.json(
      { error: 'Failed to get active session' },
      { status: 500 }
    )
  }
}
