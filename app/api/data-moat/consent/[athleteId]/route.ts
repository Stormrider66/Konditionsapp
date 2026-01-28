import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateConsentSchema = z.object({
  anonymizedBenchmarking: z.boolean().optional(),
  patternContribution: z.boolean().optional(),
  predictionValidation: z.boolean().optional(),
  coachDecisionSharing: z.boolean().optional(),
  excludeFromResearch: z.boolean().optional(),
  excludeFromPublicStats: z.boolean().optional(),
})

// GET: Get consent settings for an athlete
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const { athleteId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify access - must be the athlete themselves or their coach
    const athlete = await prisma.client.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        userId: true, // This is the coach's user ID
        athleteAccount: {
          select: { userId: true }, // This is the athlete's own user ID (if they have an account)
        },
      },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Allow access if user is the coach (userId) or the athlete themselves (athleteAccount.userId)
    const isCoach = athlete.userId === user.id
    const isAthlete = athlete.athleteAccount?.userId === user.id

    if (!isAthlete && !isCoach) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get or create consent record
    let consent = await prisma.dataMoatConsent.findUnique({
      where: { athleteId },
    })

    if (!consent) {
      // Create default consent record
      consent = await prisma.dataMoatConsent.create({
        data: {
          athleteId,
          anonymizedBenchmarking: true,
          patternContribution: true,
          predictionValidation: true,
          coachDecisionSharing: true,
          excludeFromResearch: false,
          excludeFromPublicStats: false,
        },
      })
    }

    return NextResponse.json(consent)
  } catch (error) {
    console.error('Error fetching consent:', error)
    return NextResponse.json({ error: 'Failed to fetch consent' }, { status: 500 })
  }
}

// PUT: Update consent settings for an athlete
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const { athleteId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify access - only the athlete themselves can update consent
    const athlete = await prisma.client.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        athleteAccount: {
          select: { userId: true },
        },
      },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Only the athlete can update their own consent (via their athleteAccount)
    if (athlete.athleteAccount?.userId !== user.id) {
      return NextResponse.json(
        { error: 'Only the athlete can update their consent settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateConsentSchema.parse(body)

    // Upsert consent record
    const consent = await prisma.dataMoatConsent.upsert({
      where: { athleteId },
      create: {
        athleteId,
        ...validatedData,
        acceptedAt: new Date(),
      },
      update: {
        ...validatedData,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(consent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating consent:', error)
    return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 })
  }
}
