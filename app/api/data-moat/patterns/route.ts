/**
 * /api/data-moat/patterns
 *
 * Data Moat Phase 3: Performance Pattern Discovery
 * Discovers and retrieves cross-athlete success patterns.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  detectPatterns,
  saveDetectedPatterns,
  matchAthleteToPatterns,
} from '@/lib/data-moat/pattern-detection'

const listQuerySchema = z.object({
  sport: z.string().optional(),
  outcomeType: z.string().optional(),
  confidenceLevel: z.enum(['HIGH', 'MEDIUM', 'LOW', 'PRELIMINARY']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

const matchQuerySchema = z.object({
  athleteId: z.string().cuid(),
  sport: z.string().optional(),
})

// GET: List discovered patterns or match athlete to patterns
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

    // Check if this is a match request
    const athleteId = searchParams.get('athleteId')
    if (athleteId) {
      // Verify access to athlete
      const athlete = await prisma.client.findFirst({
        where: {
          id: athleteId,
          userId: user.id,
        },
      })

      if (!athlete) {
        return NextResponse.json({ error: 'Athlete not found or access denied' }, { status: 404 })
      }

      const matchQuery = matchQuerySchema.parse({
        athleteId,
        sport: searchParams.get('sport') || undefined,
      })

      const matches = await matchAthleteToPatterns(matchQuery.athleteId, {
        sport: matchQuery.sport,
        includePartialMatches: true,
      })

      return NextResponse.json({
        athleteId: matchQuery.athleteId,
        matches,
        matchedAt: new Date().toISOString(),
      })
    }

    // Regular pattern list
    const query = listQuerySchema.parse({
      sport: searchParams.get('sport') || undefined,
      outcomeType: searchParams.get('outcomeType') || undefined,
      confidenceLevel: searchParams.get('confidenceLevel') as 'HIGH' | 'MEDIUM' | 'LOW' | 'PRELIMINARY' | undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    const page = parseInt(query.page || '1', 10)
    const limit = Math.min(parseInt(query.limit || '20', 10), 100)
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (query.sport) {
      where.applicableSports = { has: query.sport }
    }

    if (query.outcomeType) {
      where.outcomeType = query.outcomeType
    }

    if (query.confidenceLevel) {
      where.confidenceLevel = query.confidenceLevel
    }

    const [patterns, total] = await Promise.all([
      prisma.performancePattern.findMany({
        where,
        orderBy: [{ outcomeCorrelation: 'desc' }, { sampleSize: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          patternName: true,
          patternDescription: true,
          outcomeType: true,
          applicableSports: true,
          criteria: true,
          outcomeDescription: true,
          sampleSize: true,
          outcomeCorrelation: true,
          confidenceLevel: true,
          effectSize: true,
          lastValidated: true,
        },
      }),
      prisma.performancePattern.count({ where }),
    ])

    return NextResponse.json({
      patterns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error fetching patterns:', error)
    return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 })
  }
}

// POST: Trigger pattern detection (admin/system use)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin or coach role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'COACH')) {
      return NextResponse.json({ error: 'Admin or coach access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const sport = body.sport as string | undefined
    const minSampleSize = body.minSampleSize as number | undefined
    const minSuccessRate = body.minSuccessRate as number | undefined

    // Detect patterns
    const patterns = await detectPatterns({
      sport,
      minSampleSize: minSampleSize ?? 10,
      minSuccessRate: minSuccessRate ?? 0.6,
    })

    // Save to database
    const savedCount = await saveDetectedPatterns(patterns)

    return NextResponse.json({
      success: true,
      patternsDetected: patterns.length,
      patternsSaved: savedCount,
      patterns: patterns.map((p) => ({
        name: p.name,
        type: p.patternType,
        sport: p.sport,
        sampleSize: p.sampleSize,
        successRate: p.successRate,
        confidence: p.confidence,
        insight: p.insight,
      })),
    })
  } catch (error) {
    console.error('Error detecting patterns:', error)
    return NextResponse.json({ error: 'Failed to detect patterns' }, { status: 500 })
  }
}
