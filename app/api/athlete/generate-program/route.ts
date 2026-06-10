/**
 * AI Program Generation API
 *
 * POST /api/athlete/generate-program - Generate an AI training program for the athlete
 *
 * Requires:
 * - Authenticated athlete
 * - STANDARD or PRO subscription
 * - No assigned coach (self-coached athletes only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { generateAIProgram } from '@/lib/agent/program-generator'
import { z } from 'zod'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import {
  AI_ALLOWANCE_MINIMUM_REMAINING_SEK,
  requireAiAllowance,
} from '@/lib/ai/billing/require-ai-allowance'

const generateProgramSchema = z.object({
  sport: z.string(),
  experience: z.string(),
  goal: z.string().optional(),
  targetDate: z.string().optional(),
  weeklyAvailability: z.record(z.object({
    available: z.boolean(),
    maxHours: z.number().optional(),
  })).optional(),
  preferredSessionLength: z.number().optional(),
  equipment: z.record(z.boolean()).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    locale = resolveRequestLocale(request, resolved.user.language)
    const { user, clientId } = resolved

    const body = await request.json()
    const validationResult = generateProgramSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid request body', 'Ogiltigt innehåll i förfrågan'),
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const {
      sport,
      experience,
      goal,
      targetDate,
      weeklyAvailability,
      preferredSessionLength,
      equipment,
    } = validationResult.data

    // Get client with subscription info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        athleteSubscription: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Client not found', 'Klienten hittades inte') },
        { status: 404 }
      )
    }

    const featureDenied = await requireFeatureAccess(clientId, 'program_generation')
    if (featureDenied) {
      return featureDenied
    }

    // Program generation is the most expensive AI call an athlete can
    // trigger — gate on allowance like the coach-initiated path does.
    const allowanceDenied = await requireAiAllowance(clientId, {
      minimumRemainingSek: AI_ALLOWANCE_MINIMUM_REMAINING_SEK.longRunning,
    })
    if (allowanceDenied) {
      return allowanceDenied
    }

    const subscription = client.athleteSubscription

    // Check if athlete has an assigned coach
    if (subscription?.assignedCoachId) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'Athletes with an assigned coach cannot generate AI programs',
            'Atleter med tilldelad coach kan inte skapa AI-program'
          ),
        },
        { status: 403 }
      )
    }

    // Calculate training parameters from availability
    const trainingDaysPerWeek = weeklyAvailability
      ? Object.values(weeklyAvailability).filter((day) => day.available).length
      : 4

    const weeklyHours = weeklyAvailability
      ? Object.values(weeklyAvailability)
          .filter((day) => day.available)
          .reduce((sum, day) => sum + (day.maxHours || (preferredSessionLength || 60) / 60), 0)
      : 6

    // Check equipment
    const hasGymAccess = equipment?.gym || false
    const hasPoolAccess = equipment?.pool || false

    // Map training goal
    let trainingGoal = 'GENERAL_FITNESS'
    if (goal) {
      // Try to extract goal type from the text
      const goalLower = goal.toLowerCase()
      if (goalLower.includes('race') || goalLower.includes('tävl') || goalLower.includes('lopp')) {
        trainingGoal = 'RACE_PREP'
      } else if (goalLower.includes('speed') || goalLower.includes('snabb') || goalLower.includes('tempo')) {
        trainingGoal = 'SPEED'
      } else if (goalLower.includes('endurance') || goalLower.includes('uthållighet') || goalLower.includes('kondition')) {
        trainingGoal = 'ENDURANCE'
      } else if (goalLower.includes('weight') || goalLower.includes('vikt') || goalLower.includes('gå ner')) {
        trainingGoal = 'WEIGHT_LOSS'
      } else if (goalLower.includes('strength') || goalLower.includes('styrka') || goalLower.includes('stark')) {
        trainingGoal = 'STRENGTH_GAIN'
      }
    }

    // Generate the program
    const program = await generateAIProgram({
      clientId,
      primarySport: sport,
      experienceLevel: experience,
      trainingGoal,
      weeklyHours,
      trainingDaysPerWeek,
      targetEvent: goal,
      targetEventDate: targetDate ? new Date(targetDate) : null,
      hasGymAccess,
      hasPoolAccess,
    })

    logger.info('AI program generated via onboarding', {
      userId: user.id,
      clientId,
      programId: program.id,
      sport,
    })

    return NextResponse.json({
      success: true,
      data: {
        programId: program.id,
        name: program.name,
        methodology: program.methodology,
        totalWeeks: program.totalWeeks,
        startDate: program.startDate,
      },
    })
  } catch (error) {
    logger.error('Failed to generate AI program', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to generate program', 'Kunde inte skapa programmet') },
      { status: 500 }
    )
  }
}
