// app/api/athlete/profile/route.ts
// Athlete self-description profile API

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const MAX_FIELD_LENGTH = 1000

const updateProfileSchema = z.object({
  trainingBackground: z.string().max(MAX_FIELD_LENGTH).nullable().optional(),
  longTermAmbitions: z.string().max(MAX_FIELD_LENGTH).nullable().optional(),
  seasonalFocus: z.string().max(MAX_FIELD_LENGTH).nullable().optional(),
  personalMotivations: z.string().max(MAX_FIELD_LENGTH).nullable().optional(),
  trainingPreferences: z.string().max(MAX_FIELD_LENGTH).nullable().optional(),
  constraints: z.string().max(MAX_FIELD_LENGTH).nullable().optional(),
  dietaryNotes: z.string().max(MAX_FIELD_LENGTH).nullable().optional(),
})

/**
 * GET /api/athlete/profile
 * Get current athlete's self-description profile
 */
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

    // Get client with athlete account profile fields
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        athleteAccount: {
          select: {
            trainingBackground: true,
            longTermAmbitions: true,
            seasonalFocus: true,
            personalMotivations: true,
            trainingPreferences: true,
            constraints: true,
            dietaryNotes: true,
            profileLastUpdated: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    const profile = client.athleteAccount

    return NextResponse.json({
      success: true,
      data: {
        clientId: client.id,
        clientName: client.name,
        trainingBackground: profile?.trainingBackground ?? null,
        longTermAmbitions: profile?.longTermAmbitions ?? null,
        seasonalFocus: profile?.seasonalFocus ?? null,
        personalMotivations: profile?.personalMotivations ?? null,
        trainingPreferences: profile?.trainingPreferences ?? null,
        constraints: profile?.constraints ?? null,
        dietaryNotes: profile?.dietaryNotes ?? null,
        profileLastUpdated: profile?.profileLastUpdated ?? null,
      },
    })
  } catch (error) {
    logger.error('Error fetching athlete profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/athlete/profile
 * Update athlete's self-description profile
 */
export async function PUT(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { clientId, user } = resolved

    const body = await request.json()
    const validation = updateProfileSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Build update object with only provided fields
    const updateData: Record<string, string | null | Date> = {}

    if ('trainingBackground' in data) {
      updateData.trainingBackground = data.trainingBackground ?? null
    }
    if ('longTermAmbitions' in data) {
      updateData.longTermAmbitions = data.longTermAmbitions ?? null
    }
    if ('seasonalFocus' in data) {
      updateData.seasonalFocus = data.seasonalFocus ?? null
    }
    if ('personalMotivations' in data) {
      updateData.personalMotivations = data.personalMotivations ?? null
    }
    if ('trainingPreferences' in data) {
      updateData.trainingPreferences = data.trainingPreferences ?? null
    }
    if ('constraints' in data) {
      updateData.constraints = data.constraints ?? null
    }
    if ('dietaryNotes' in data) {
      updateData.dietaryNotes = data.dietaryNotes ?? null
    }

    // Always update the profileLastUpdated timestamp
    updateData.profileLastUpdated = new Date()

    // Upsert: create AthleteAccount if it doesn't exist (e.g. admin/coach in athlete mode)
    const updated = await prisma.athleteAccount.upsert({
      where: { clientId },
      update: updateData,
      create: {
        clientId,
        userId: user.id,
        ...updateData,
      },
      select: {
        trainingBackground: true,
        longTermAmbitions: true,
        seasonalFocus: true,
        personalMotivations: true,
        trainingPreferences: true,
        constraints: true,
        dietaryNotes: true,
        profileLastUpdated: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    logger.error('Error updating athlete profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
