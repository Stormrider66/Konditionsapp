// app/api/athlete/me/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

// GET /api/athlete/me - Get current athlete's info including sport profile
export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { clientId } = resolved

    // Get client with sport profile
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        sportProfile: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: clientId,
        clientId,
        clientName: client.name,
        sportProfile: client.sportProfile,
      },
    })
  } catch (error) {
    logger.error('Error fetching athlete info', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch athlete info' },
      { status: 500 }
    )
  }
}
