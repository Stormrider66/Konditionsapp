// app/api/athlete/profile/body/route.ts
// Athlete self-update for height and weight

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const bodySchema = z.object({
  height: z.number().min(100, 'Längd måste vara minst 100 cm').max(250, 'Längd kan vara max 250 cm'),
  weight: z.number().min(30, 'Vikt måste vara minst 30 kg').max(300, 'Vikt kan vara max 300 kg'),
})

/**
 * PATCH /api/athlete/profile/body
 * Update athlete's own height and weight
 */
export async function PATCH(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { clientId } = resolved

    const body = await request.json()
    const validation = bodySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { height, weight } = validation.data

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { height, weight },
      select: { height: true, weight: true },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error('Error updating athlete body measurements', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update measurements' },
      { status: 500 }
    )
  }
}
