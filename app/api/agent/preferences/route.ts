/**
 * GET/PUT /api/agent/preferences
 *
 * Get or update agent preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const preferencesSchema = z.object({
  autonomyLevel: z.enum(['ADVISORY', 'LIMITED', 'SUPERVISED', 'AUTONOMOUS']).optional(),
  allowWorkoutModification: z.boolean().optional(),
  allowRestDayInjection: z.boolean().optional(),
  maxIntensityReduction: z.number().min(0).max(50).optional(),
  dailyBriefingEnabled: z.boolean().optional(),
  proactiveNudgesEnabled: z.boolean().optional(),
  preferredContactMethod: z.enum(['IN_APP', 'EMAIL', 'SMS']).optional(),
  minRestDaysPerWeek: z.number().min(0).max(7).optional(),
  maxConsecutiveHardDays: z.number().min(1).max(7).optional(),
})

/**
 * GET - Get current preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    let clientId = searchParams.get('clientId')

    if (!clientId) {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })

      if (!athleteAccount) {
        return NextResponse.json(
          { error: 'No athlete profile found' },
          { status: 404 }
        )
      }

      clientId = athleteAccount.clientId
    }

    // Get preferences or return defaults
    const preferences = await prisma.agentPreferences.findUnique({
      where: { clientId },
    })

    // Get client for AI-coached status
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { isAICoached: true },
    })

    if (!preferences) {
      // Return defaults based on coaching mode
      const isAICoached = client?.isAICoached ?? false
      return NextResponse.json({
        clientId,
        autonomyLevel: isAICoached ? 'SUPERVISED' : 'ADVISORY',
        allowWorkoutModification: isAICoached,
        allowRestDayInjection: isAICoached,
        maxIntensityReduction: isAICoached ? 30 : 20,
        dailyBriefingEnabled: true,
        proactiveNudgesEnabled: true,
        preferredContactMethod: 'IN_APP',
        minRestDaysPerWeek: 1,
        maxConsecutiveHardDays: 3,
        isDefault: true,
      })
    }

    return NextResponse.json({
      ...preferences,
      isDefault: false,
    })
  } catch (error) {
    console.error('Error getting preferences:', error)
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update preferences
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
    const { clientId: bodyClientId, ...updates } = body

    // Validate updates
    const validatedUpdates = preferencesSchema.parse(updates)

    // Get client ID
    let clientId = bodyClientId

    if (!clientId) {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })

      if (!athleteAccount) {
        return NextResponse.json(
          { error: 'No athlete profile found' },
          { status: 404 }
        )
      }

      clientId = athleteAccount.clientId
    }

    // Upsert preferences
    const preferences = await prisma.agentPreferences.upsert({
      where: { clientId },
      create: {
        clientId,
        ...validatedUpdates,
      },
      update: validatedUpdates,
    })

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid preferences', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
