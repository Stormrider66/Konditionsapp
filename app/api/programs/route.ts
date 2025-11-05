// app/api/programs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessProgram } from '@/lib/auth-utils'

/**
 * GET /api/programs
 * Get all programs for current user (coach or athlete)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Obehörig',
        },
        { status: 401 }
      )
    }

    // Get programs based on user role
    let programs

    if (user.role === 'COACH') {
      // Coaches see all programs they created
      programs = await prisma.trainingProgram.findMany({
        where: {
          coachId: user.id,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          test: {
            select: {
              id: true,
              testDate: true,
              testType: true,
            },
          },
          weeks: {
            select: {
              id: true,
              weekNumber: true,
              phase: true,
            },
            orderBy: {
              weekNumber: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } else if (user.role === 'ATHLETE') {
      // Athletes see programs for their linked client
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
      })

      if (!athleteAccount) {
        return NextResponse.json({
          success: true,
          data: [],
        })
      }

      programs = await prisma.trainingProgram.findMany({
        where: {
          clientId: athleteAccount.clientId,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          test: {
            select: {
              id: true,
              testDate: true,
              testType: true,
            },
          },
          weeks: {
            select: {
              id: true,
              weekNumber: true,
              phase: true,
            },
            orderBy: {
              weekNumber: 'asc',
            },
          },
        },
        orderBy: {
          startDate: 'desc',
        },
      })
    } else {
      // Admins see all programs
      programs = await prisma.trainingProgram.findMany({
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          test: {
            select: {
              id: true,
              testDate: true,
              testType: true,
            },
          },
          weeks: {
            select: {
              id: true,
              weekNumber: true,
              phase: true,
            },
            orderBy: {
              weekNumber: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: programs,
    })
  } catch (error) {
    console.error('Error fetching programs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Misslyckades med att hämta träningsprogram',
      },
      { status: 500 }
    )
  }
}
