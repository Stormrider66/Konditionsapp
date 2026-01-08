import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import type { Prisma } from '@prisma/client'
import { logError } from '@/lib/logger-console'

/**
 * GET /api/cardio-templates
 * List public cardio templates (system templates)
 * Supports filtering by sport, tags, and search
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sport = searchParams.get('sport')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filter conditions
    const where: {
      isPublic: boolean
      sport?: 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'TRIATHLON' | 'HYROX' | 'SKIING' | 'GENERAL_FITNESS'
      tags?: { hasSome: string[] }
      OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { description: { contains: string; mode: 'insensitive' } }>
    } = {
      isPublic: true,
    }

    if (sport) {
      where.sport = sport as 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'TRIATHLON' | 'HYROX' | 'SKIING' | 'GENERAL_FITNESS'
    }

    if (tag) {
      where.tags = { hasSome: [tag] }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Fetch templates
    const [templates, totalCount] = await Promise.all([
      prisma.cardioSession.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          sport: true,
          segments: true,
          totalDuration: true,
          totalDistance: true,
          avgZone: true,
          tags: true,
          createdAt: true,
        },
        orderBy: [
          { sport: 'asc' },
          { name: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.cardioSession.count({ where }),
    ])

    // Get unique tags for filtering
    const allTemplates = await prisma.cardioSession.findMany({
      where: { isPublic: true },
      select: { tags: true },
    })
    const allTags = [...new Set(allTemplates.flatMap((t) => t.tags))].sort()

    return NextResponse.json({
      success: true,
      data: {
        templates,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + templates.length < totalCount,
        },
        filters: {
          availableTags: allTags,
          sports: ['RUNNING', 'CYCLING', 'SWIMMING', 'SKIING'],
        },
      },
    })
  } catch (error) {
    logError('Error fetching cardio templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cardio-templates
 * Copy a template to coach's library
 */
export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach()
    const body = await request.json()

    const { templateId, name, customization } = body as {
      templateId: string
      name?: string
      customization?: {
        segments?: unknown[]
        totalDuration?: number
        totalDistance?: number
      }
    }

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID required' },
        { status: 400 }
      )
    }

    // Get the original template
    const template = await prisma.cardioSession.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create copy for coach
    const segmentsData = (customization?.segments || template.segments) as unknown as Prisma.InputJsonValue
    const newSession = await prisma.cardioSession.create({
      data: {
        name: name || `${template.name} (Kopia)`,
        description: template.description,
        sport: template.sport,
        segments: segmentsData,
        totalDuration: customization?.totalDuration || template.totalDuration,
        totalDistance: customization?.totalDistance || template.totalDistance,
        avgZone: template.avgZone,
        coachId: coach.id,
        isPublic: false, // Coach's copy is private
        tags: template.tags,
      },
    })

    return NextResponse.json({
      success: true,
      data: newSession,
      message: 'Template copied to your library',
    })
  } catch (error) {
    logError('Error copying cardio template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to copy template' },
      { status: 500 }
    )
  }
}
