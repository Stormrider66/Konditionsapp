/**
 * POST /api/agent/assessment
 *
 * Save AI assessment data for an AI-coached athlete.
 * This data is used to generate personalized training programs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { z } from 'zod'
import type { SportType } from '@prisma/client'

const assessmentSchema = z.object({
  clientId: z.string(),

  // Sport & Goals
  primarySport: z.string(),
  secondarySports: z.array(z.string()).optional(),
  primaryGoal: z.string(),
  targetEvent: z.string().optional(),
  targetEventDate: z.string().optional(),

  // Fitness Level
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']),
  currentWeeklyHours: z.number().min(0),
  recentActivityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']),
  estimatedVO2Max: z.number().optional(),

  // Availability
  trainingDaysPerWeek: z.number().min(1).max(7),
  hoursPerSession: z.number().min(0.25).max(4),
  preferredTrainingTimes: z.array(z.string()),
  hasGymAccess: z.boolean(),
  hasPoolAccess: z.boolean(),
  hasOutdoorAccess: z.boolean(),

  // Health
  hasInjuries: z.boolean(),
  injuries: z.array(z.string()).optional(),
  hasConditions: z.boolean(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  painAreas: z.array(z.string()).optional(),

  // Consent
  dataProcessingConsent: z.boolean(),
  automatedDecisionConsent: z.boolean(),
  healthDataProcessingConsent: z.boolean(),
})

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId } = resolved

    const body = await request.json()
    const validation = assessmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid assessment data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify the body clientId matches the resolved athlete clientId
    if (data.clientId !== clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Save in transaction
    await prisma.$transaction(async (tx) => {
      // Update sport profile
      // Map experience level to the appropriate sport-specific field
      const experienceFields: Record<string, string | undefined> = {}
      if (data.primarySport === 'RUNNING') {
        experienceFields.runningExperience = data.experienceLevel
      } else if (data.primarySport === 'CYCLING') {
        experienceFields.cyclingExperience = data.experienceLevel
      } else if (data.primarySport === 'SWIMMING') {
        experienceFields.swimmingExperience = data.experienceLevel
      } else if (data.primarySport === 'STRENGTH' || data.primarySport === 'GENERAL_FITNESS') {
        experienceFields.strengthExperience = data.experienceLevel
      }

      await tx.sportProfile.upsert({
        where: { clientId: data.clientId },
        create: {
          clientId: data.clientId,
          primarySport: data.primarySport as SportType,
          secondarySports: (data.secondarySports || []) as SportType[],
          currentGoal: data.primaryGoal,
          targetDate: data.targetEventDate ? new Date(data.targetEventDate) : null,
          targetMetric: data.targetEvent ? { type: 'EVENT', eventName: data.targetEvent } : undefined,
          onboardingCompleted: false,
          onboardingStep: 5, // Completed assessment
          ...experienceFields,
        },
        update: {
          primarySport: data.primarySport as SportType,
          secondarySports: (data.secondarySports || []) as SportType[],
          currentGoal: data.primaryGoal,
          targetDate: data.targetEventDate ? new Date(data.targetEventDate) : null,
          targetMetric: data.targetEvent ? { type: 'EVENT', eventName: data.targetEvent } : undefined,
          onboardingStep: 5,
          ...experienceFields,
        },
      })

      // Store availability preferences in SportProfile
      await tx.sportProfile.update({
        where: { clientId: data.clientId },
        data: {
          weeklyAvailability: {
            daysPerWeek: data.trainingDaysPerWeek,
            preferredTimes: data.preferredTrainingTimes,
          },
          preferredSessionLength: Math.round(data.hoursPerSession * 60), // Convert to minutes
          equipment: {
            gym: data.hasGymAccess,
            pool: data.hasPoolAccess,
            outdoor: data.hasOutdoorAccess,
          },
        },
      })

      // Store health info if present
      if (data.hasInjuries || data.hasConditions) {
        // Could create a health profile here
        // For now, store in client notes or a JSON field
      }

      // Create/update agent consent
      await tx.agentConsent.upsert({
        where: { clientId: data.clientId },
        create: {
          clientId: data.clientId,
          dataProcessingConsent: data.dataProcessingConsent,
          automatedDecisionConsent: data.automatedDecisionConsent,
          healthDataProcessingConsent: data.healthDataProcessingConsent,
          consentGivenAt: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
        update: {
          dataProcessingConsent: data.dataProcessingConsent,
          automatedDecisionConsent: data.automatedDecisionConsent,
          healthDataProcessingConsent: data.healthDataProcessingConsent,
          consentGivenAt: new Date(),
        },
      })

      // Ensure agent preferences exist
      await tx.agentPreferences.upsert({
        where: { clientId: data.clientId },
        create: {
          clientId: data.clientId,
          autonomyLevel: data.automatedDecisionConsent ? 'SUPERVISED' : 'ADVISORY',
          allowWorkoutModification: data.automatedDecisionConsent,
          allowRestDayInjection: data.automatedDecisionConsent,
          maxIntensityReduction: 30,
          dailyBriefingEnabled: true,
          proactiveNudgesEnabled: true,
        },
        update: {
          autonomyLevel: data.automatedDecisionConsent ? 'SUPERVISED' : 'ADVISORY',
          allowWorkoutModification: data.automatedDecisionConsent,
          allowRestDayInjection: data.automatedDecisionConsent,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Assessment saved successfully',
    })
  } catch (error) {
    console.error('Error saving assessment:', error)
    return NextResponse.json(
      { error: 'Failed to save assessment' },
      { status: 500 }
    )
  }
}
