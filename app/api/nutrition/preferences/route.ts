/**
 * Nutrition Preferences API
 *
 * GET /api/nutrition/preferences - Get athlete's dietary preferences
 * PUT /api/nutrition/preferences - Update dietary preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schema
const preferencesSchema = z.object({
  dietaryStyle: z
    .enum(['OMNIVORE', 'VEGETARIAN', 'VEGAN', 'PESCATARIAN', 'FLEXITARIAN'])
    .optional()
    .nullable(),
  allergies: z.array(z.string()).optional().nullable(),
  intolerances: z.array(z.string()).optional().nullable(),
  dislikedFoods: z.array(z.string()).optional().nullable(),
  preferLowFODMAP: z.boolean().optional(),
  preferWholeGrain: z.boolean().optional(),
  preferSwedishFoods: z.boolean().optional(),
})

/**
 * GET /api/nutrition/preferences
 * Get the current athlete's dietary preferences
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get athlete account
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: {
        user: { email: user.email },
      },
      include: {
        client: {
          include: {
            dietaryPreferences: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      preferences: athleteAccount.client.dietaryPreferences,
    })
  } catch (error) {
    logger.error('Error fetching dietary preferences', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/nutrition/preferences
 * Update the current athlete's dietary preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = preferencesSchema.parse(body)

    // Get athlete account
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: {
        user: { email: user.email },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Upsert preferences
    const preferences = await prisma.dietaryPreferences.upsert({
      where: { clientId: athleteAccount.clientId },
      update: {
        dietaryStyle: validated.dietaryStyle,
        allergies: validated.allergies ?? [],
        intolerances: validated.intolerances ?? [],
        dislikedFoods: validated.dislikedFoods ?? [],
        preferLowFODMAP: validated.preferLowFODMAP ?? false,
        preferWholeGrain: validated.preferWholeGrain ?? true,
        preferSwedishFoods: validated.preferSwedishFoods ?? true,
      },
      create: {
        clientId: athleteAccount.clientId,
        dietaryStyle: validated.dietaryStyle,
        allergies: validated.allergies ?? [],
        intolerances: validated.intolerances ?? [],
        dislikedFoods: validated.dislikedFoods ?? [],
        preferLowFODMAP: validated.preferLowFODMAP ?? false,
        preferWholeGrain: validated.preferWholeGrain ?? true,
        preferSwedishFoods: validated.preferSwedishFoods ?? true,
      },
    })

    logger.info('Updated dietary preferences', {
      clientId: athleteAccount.clientId,
      dietaryStyle: validated.dietaryStyle,
    })

    return NextResponse.json({ success: true, preferences })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Error updating dietary preferences', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
