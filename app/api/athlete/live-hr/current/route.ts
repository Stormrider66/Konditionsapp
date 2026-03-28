import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Returns the latest HR reading for the authenticated athlete from any active LiveHRSession */
export async function GET() {
  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId } = resolved

  // Find latest reading from any active session this athlete is participating in
  const participant = await prisma.liveHRParticipant.findFirst({
    where: {
      clientId,
      session: { status: 'ACTIVE' },
    },
    include: {
      readings: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  if (!participant || participant.readings.length === 0) {
    return NextResponse.json({ heartRate: null, zone: null, stale: true })
  }

  const reading = participant.readings[0]
  const ageMs = Date.now() - reading.timestamp.getTime()
  const stale = ageMs > 10_000

  return NextResponse.json({
    heartRate: reading.heartRate,
    zone: reading.zone,
    stale,
    timestamp: reading.timestamp.toISOString(),
  })
}
