// app/api/programs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessProgram } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/programs/[id]
 * Get a single program with all details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }
    locale = user.language === 'sv' ? 'sv' : 'en'

    const { id } = await params

    // Check access
    const hasAccess = await canAccessProgram(user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized access to this program', 'Obehörig åtkomst till detta program'),
        },
        { status: 403 }
      )
    }

    // Fetch program with all details
    const program = await prisma.trainingProgram.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            gender: true,
            birthDate: true,
          },
        },
        test: {
          select: {
            id: true,
            testDate: true,
            testType: true,
            vo2max: true,
            trainingZones: true,
          },
        },
        weeks: {
          orderBy: {
            weekNumber: 'asc',
          },
          include: {
            days: {
              orderBy: {
                dayNumber: 'asc',
              },
              include: {
                workouts: {
                  include: {
                    segments: {
                      orderBy: {
                        order: 'asc',
                      },
                      include: {
                        exercise: true,
                      },
                    },
                    logs: {
                      orderBy: {
                        completedAt: 'desc',
                      },
                      take: 1, // Latest log only
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Program not found', 'Program hittades inte'),
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: program,
    })
  } catch (error) {
    logger.error('Error fetching program', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to fetch program', 'Misslyckades med att hämta program'),
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/programs/[id]
 * Update a program (coaches only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }
    locale = user.language === 'sv' ? 'sv' : 'en'

    const { id } = await params

    // Only coaches can update programs
    if (!(await canAccessCoachPlatform(user.id))) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Only coaches can update training programs', 'Endast tränare kan uppdatera träningsprogram'),
        },
        { status: 403 }
      )
    }

    // Check access
    const hasAccess = await canAccessProgram(user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized access to this program', 'Obehörig åtkomst till detta program'),
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Update program metadata only (not weeks/days/workouts)
    const program = await prisma.trainingProgram.update({
      where: { id },
      data: {
        name: body.name,
        goalType: body.goalType,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        description: body.description,
      },
      include: {
        weeks: {
          include: {
            days: {
              include: {
                workouts: {
                  include: {
                    segments: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: program,
      message: t(locale, 'Program updated', 'Program uppdaterat'),
    })
  } catch (error) {
    logger.error('Error updating program', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to update program', 'Misslyckades med att uppdatera program'),
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/programs/[id]
 * Delete a program (coaches only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }
    locale = user.language === 'sv' ? 'sv' : 'en'

    const { id } = await params

    // Only coaches can delete programs
    if (!(await canAccessCoachPlatform(user.id))) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Only coaches can delete training programs', 'Endast tränare kan ta bort träningsprogram'),
        },
        { status: 403 }
      )
    }

    // Check access
    const hasAccess = await canAccessProgram(user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized access to this program', 'Obehörig åtkomst till detta program'),
        },
        { status: 403 }
      )
    }

    // Delete program (cascade will delete weeks, days, workouts, segments)
    await prisma.trainingProgram.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: t(locale, 'Program deleted', 'Program raderat'),
    })
  } catch (error) {
    logger.error('Error deleting program', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to delete program', 'Misslyckades med att radera program'),
      },
      { status: 500 }
    )
  }
}
