/**
 * Athlete Drills API
 *
 * GET - List published drills for the athlete's team
 */

import { NextResponse } from 'next/server'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { clientId } = await requireAthleteOrCoachInAthleteMode()
    if (!clientId) return NextResponse.json({ drills: [] })

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { teamId: true, businessId: true },
    })

    if (!client) return NextResponse.json({ drills: [] })

    const drills = await prisma.teamDrill.findMany({
      where: {
        isPublished: true,
        OR: [
          ...(client.teamId ? [{ teamId: client.teamId }] : []),
          ...(client.businessId ? [{ businessId: client.businessId, teamId: null }] : []),
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        sportType: true,
        structure: true,
        createdAt: true,
        team: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return NextResponse.json({ drills })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
