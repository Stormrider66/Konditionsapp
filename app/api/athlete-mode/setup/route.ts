// app/api/athlete-mode/setup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { Gender } from '@prisma/client'

const setupAthleteProfileSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthDate: z.string().transform((str) => new Date(str)),
  height: z.number().positive(),
  weight: z.number().positive(),
})

/**
 * POST /api/athlete-mode/setup
 * Create the coach's personal athlete profile (Client record)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only COACH and ADMIN can set up athlete profile
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only coaches and admins can set up athlete mode' },
        { status: 403 }
      )
    }

    // Check if user already has an athlete profile
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { selfAthleteClientId: true },
    })

    if (existingUser?.selfAthleteClientId) {
      return NextResponse.json(
        { success: false, error: 'Athlete profile already exists' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = setupAthleteProfileSchema.parse(body)

    // Create the Client record and link it to the user
    const result = await prisma.$transaction(async (tx) => {
      // Create Client record for the coach's personal athlete profile
      const client = await tx.client.create({
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          gender: validatedData.gender as Gender,
          birthDate: validatedData.birthDate,
          height: validatedData.height,
          weight: validatedData.weight,
          isDirect: false, // This is a self-coaching profile, not a direct athlete
        },
      })

      // Link the Client to the User as their self-athlete profile
      await tx.user.update({
        where: { id: user.id },
        data: { selfAthleteClientId: client.id },
      })

      return client
    })

    logger.info('Coach created self-athlete profile', { userId: user.id, clientId: result.id })

    return NextResponse.json({
      success: true,
      data: {
        clientId: result.id,
        message: 'Athlete profile created successfully',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Error setting up athlete profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to create athlete profile' },
      { status: 500 }
    )
  }
}
