/**
 * POST /api/agent/program/generate
 *
 * Generate an AI training program for an AI-coached athlete.
 * Uses assessment data to create a personalized program.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { generateAIProgram } from '@/lib/agent/program-generator'
import { logAgentAudit } from '@/lib/agent/gdpr/audit-logger'

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId } = resolved

    // Get client with all needed data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        sportProfile: true,
        agentConsent: true,
        agentPreferences: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!client.isAICoached) {
      return NextResponse.json(
        { error: 'This endpoint is only for AI-coached athletes' },
        { status: 400 }
      )
    }

    // Check consent
    if (!client.agentConsent?.dataProcessingConsent) {
      return NextResponse.json(
        { error: 'Data processing consent required' },
        { status: 403 }
      )
    }

    // Extract settings from JSON fields
    const sportProfile = client.sportProfile
    const equipment = sportProfile?.equipment as { gym?: boolean; pool?: boolean } | null
    const weeklyAvailability = sportProfile?.weeklyAvailability as { daysPerWeek?: number } | null
    const targetMetric = sportProfile?.targetMetric as { eventName?: string } | null

    // Get experience level based on primary sport
    const primarySport = sportProfile?.primarySport || 'RUNNING'
    const experienceLevel =
      primarySport === 'RUNNING' ? sportProfile?.runningExperience :
      primarySport === 'CYCLING' ? sportProfile?.cyclingExperience :
      primarySport === 'SWIMMING' ? sportProfile?.swimmingExperience :
      sportProfile?.strengthExperience || 'INTERMEDIATE'

    // Generate the program
    const program = await generateAIProgram({
      clientId,
      primarySport,
      experienceLevel: experienceLevel || 'INTERMEDIATE',
      trainingGoal: sportProfile?.currentGoal || 'GENERAL_FITNESS',
      weeklyHours: (sportProfile?.preferredSessionLength || 60) / 60 * (weeklyAvailability?.daysPerWeek || 4),
      trainingDaysPerWeek: weeklyAvailability?.daysPerWeek || 4,
      targetEvent: targetMetric?.eventName || undefined,
      targetEventDate: sportProfile?.targetDate || undefined,
      hasGymAccess: equipment?.gym || false,
      hasPoolAccess: equipment?.pool || false,
    })

    // Mark onboarding as complete
    await prisma.sportProfile.update({
      where: { clientId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 6,
      },
    })

    // Audit log
    await logAgentAudit({
      clientId,
      action: 'ACTION_TAKEN',
      resource: 'TrainingProgram',
      details: {
        actionType: 'PROGRAM_GENERATED',
        programId: program.id,
        methodology: program.methodology,
        totalWeeks: program.totalWeeks,
        generatedBy: 'AI_AGENT',
      },
      actorType: 'AGENT',
    })

    return NextResponse.json({
      success: true,
      program: {
        id: program.id,
        name: program.name,
        methodology: program.methodology,
        totalWeeks: program.totalWeeks,
        startDate: program.startDate,
      },
    })
  } catch (error) {
    console.error('Error generating AI program:', error)
    return NextResponse.json(
      { error: 'Failed to generate program' },
      { status: 500 }
    )
  }
}
