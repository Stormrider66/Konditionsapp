// app/api/athlete/coach/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * GET /api/athlete/coach
 * Get the coach for the currently authenticated athlete
 *
 * Returns coach info from:
 * 1. TrainingProgram.coachId (most recent program)
 * 2. Client.userId (the coach who created the client)
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Obehörig' },
        { status: 401 }
      )
    }

    if (user.role !== 'ATHLETE') {
      return NextResponse.json(
        { success: false, error: 'Endast atleter kan använda denna endpoint' },
        { status: 403 }
      )
    }

    // Get athlete's client through AthleteAccount
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      include: {
        client: {
          include: {
            // Get the user (coach) who created this client
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            // Get the most recent training program to find coach
            trainingPrograms: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                coach: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { success: false, error: 'Inget atletkonto hittat' },
        { status: 404 }
      )
    }

    // Priority 1: Coach from most recent training program
    const programCoach = athleteAccount.client.trainingPrograms[0]?.coach

    // Priority 2: Coach who created the client record
    const clientCreator = athleteAccount.client.user

    // Use program coach if available, otherwise client creator
    const coach = programCoach || clientCreator

    if (!coach) {
      return NextResponse.json(
        { success: false, error: 'Ingen coach hittad' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: coach.id,
        name: coach.name,
        email: coach.email,
        role: coach.role,
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching athlete coach', {}, error)
    return NextResponse.json(
      { success: false, error: 'Misslyckades med att hämta coach' },
      { status: 500 }
    )
  }
}
