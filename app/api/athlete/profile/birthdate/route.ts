// app/api/athlete/profile/birthdate/route.ts
// Athlete self-update for birth date

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const birthDateSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ogiltigt datumformat'),
})

/**
 * PATCH /api/athlete/profile/birthdate
 * Update athlete's own birth date
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
    const validation = birthDateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const parsedDate = new Date(validation.data.birthDate)

    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Ogiltigt datum' },
        { status: 400 }
      )
    }

    const now = new Date()
    if (parsedDate > now) {
      return NextResponse.json(
        { success: false, error: 'Födelsedatum kan inte vara i framtiden' },
        { status: 400 }
      )
    }

    const age = now.getFullYear() - parsedDate.getFullYear()
    if (age > 120) {
      return NextResponse.json(
        { success: false, error: 'Ogiltigt födelsedatum' },
        { status: 400 }
      )
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { birthDate: parsedDate },
      select: { birthDate: true },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error('Error updating athlete birth date', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update birth date' },
      { status: 500 }
    )
  }
}
