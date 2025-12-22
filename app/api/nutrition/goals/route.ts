/**
 * Nutrition Goals API
 *
 * GET /api/nutrition/goals - Get athlete's nutrition goals
 * PUT /api/nutrition/goals - Update nutrition goals
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schema
const goalsSchema = z.object({
  goalType: z.enum(['WEIGHT_LOSS', 'WEIGHT_GAIN', 'MAINTAIN', 'BODY_RECOMP']),
  targetWeightKg: z.number().min(30).max(200).optional().nullable(),
  weeklyChangeKg: z.number().min(0).max(1).optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  targetBodyFatPercent: z.number().min(3).max(50).optional().nullable(),
  macroProfile: z
    .enum(['BALANCED', 'HIGH_PROTEIN', 'LOW_CARB', 'ENDURANCE', 'STRENGTH'])
    .optional()
    .nullable(),
  activityLevel: z
    .enum(['SEDENTARY', 'LIGHTLY_ACTIVE', 'ACTIVE', 'VERY_ACTIVE', 'ATHLETE'])
    .optional(),
  customProteinPerKg: z.number().min(0.5).max(3).optional().nullable(),
  showMacroTargets: z.boolean().optional(),
  showHydration: z.boolean().optional(),
})

/**
 * GET /api/nutrition/goals
 * Get the current athlete's nutrition goals
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
            nutritionGoal: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      goal: athleteAccount.client.nutritionGoal,
    })
  } catch (error) {
    logger.error('Error fetching nutrition goals', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/nutrition/goals
 * Update the current athlete's nutrition goals
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
    const validated = goalsSchema.parse(body)

    // Get athlete account
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: {
        user: { email: user.email },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Upsert goals
    const goal = await prisma.nutritionGoal.upsert({
      where: { clientId: athleteAccount.clientId },
      update: {
        goalType: validated.goalType,
        targetWeightKg: validated.targetWeightKg,
        weeklyChangeKg: validated.weeklyChangeKg,
        targetDate: validated.targetDate ? new Date(validated.targetDate) : null,
        targetBodyFatPercent: validated.targetBodyFatPercent,
        macroProfile: validated.macroProfile,
        activityLevel: validated.activityLevel ?? 'ACTIVE',
        customProteinPerKg: validated.customProteinPerKg,
        showMacroTargets: validated.showMacroTargets ?? true,
        showHydration: validated.showHydration ?? true,
      },
      create: {
        clientId: athleteAccount.clientId,
        goalType: validated.goalType,
        targetWeightKg: validated.targetWeightKg,
        weeklyChangeKg: validated.weeklyChangeKg,
        targetDate: validated.targetDate ? new Date(validated.targetDate) : null,
        targetBodyFatPercent: validated.targetBodyFatPercent,
        macroProfile: validated.macroProfile,
        activityLevel: validated.activityLevel ?? 'ACTIVE',
        customProteinPerKg: validated.customProteinPerKg,
        showMacroTargets: validated.showMacroTargets ?? true,
        showHydration: validated.showHydration ?? true,
      },
    })

    logger.info('Updated nutrition goals', {
      clientId: athleteAccount.clientId,
      goalType: validated.goalType,
    })

    return NextResponse.json({ success: true, goal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Error updating nutrition goals', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
