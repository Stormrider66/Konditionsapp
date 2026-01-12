/**
 * Live HR Push API
 *
 * POST - Push HR reading from athlete/device
 * GET  - Get active session for athlete
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { pushHRReading, getActiveSessionForAthlete } from '@/lib/live-hr/reading-service'
import { PushHRReadingInput } from '@/lib/live-hr/types'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAthlete()

    // Get athlete account with linked client
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount?.clientId) {
      return NextResponse.json(
        { error: 'No client linked to athlete account' },
        { status: 400 }
      )
    }

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

    const success = await pushHRReading(athleteAccount.clientId, body)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to push reading (not in active session)' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error pushing HR reading:', error)
    return NextResponse.json(
      { error: 'Failed to push reading' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const user = await requireAthlete()

    // Get athlete account with linked client
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount?.clientId) {
      return NextResponse.json(
        { error: 'No client linked to athlete account' },
        { status: 400 }
      )
    }

    const activeSession = await getActiveSessionForAthlete(athleteAccount.clientId)

    return NextResponse.json({ activeSession })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error getting active session:', error)
    return NextResponse.json(
      { error: 'Failed to get active session' },
      { status: 500 }
    )
  }
}
