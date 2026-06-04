/**
 * Nutrition Preferences API
 *
 * GET /api/nutrition/preferences - Get athlete's dietary preferences
 * PUT /api/nutrition/preferences - Update dietary preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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
  enhancedMacroAnalysis: z.boolean().optional(),
  memoryEnabled: z.boolean().optional(),
})

/**
 * GET /api/nutrition/preferences
 * Get the current athlete's dietary preferences
 */
export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    // Get athlete account
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { clientId },
      include: {
        client: {
          include: {
            dietaryPreferences: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: t(locale, 'Athlete not found', 'Atleten hittades inte') }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      preferences: athleteAccount.client.dietaryPreferences,
    })
  } catch (error) {
    logger.error('Error fetching dietary preferences', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

/**
 * PUT /api/nutrition/preferences
 * Update the current athlete's dietary preferences
 */
export async function PUT(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    const body = await request.json()
    const validated = preferencesSchema.parse(body)

    // Get athlete account
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { clientId },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: t(locale, 'Athlete not found', 'Atleten hittades inte') }, { status: 404 })
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
        enhancedMacroAnalysis: validated.enhancedMacroAnalysis ?? false,
        memoryEnabled: validated.memoryEnabled ?? true,
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
        enhancedMacroAnalysis: validated.enhancedMacroAnalysis ?? false,
        memoryEnabled: validated.memoryEnabled ?? true,
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
        { error: t(locale, 'Invalid data', 'Ogiltig data'), details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Error updating dietary preferences', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
