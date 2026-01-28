// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { Gender } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser || !supabaseUser.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const requestedName =
      body && typeof body === 'object' && typeof body.name === 'string'
        ? body.name.trim()
        : ''

    // Extract athlete profile creation data
    const createAthleteProfile = body?.createAthleteProfile === true
    const athleteProfileData = createAthleteProfile ? {
      gender: body.gender as Gender,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      height: typeof body.height === 'number' ? body.height : null,
      weight: typeof body.weight === 'number' ? body.weight : null,
    } : null

    const nameFromMetadata =
      (supabaseUser.user_metadata &&
        typeof supabaseUser.user_metadata === 'object' &&
        'name' in supabaseUser.user_metadata &&
        typeof (supabaseUser.user_metadata as Record<string, unknown>).name === 'string' &&
        ((supabaseUser.user_metadata as Record<string, unknown>).name as string).trim()) ||
      ''

    const name = requestedName || nameFromMetadata || supabaseUser.email.split('@')[0]

    // Prevent forged IDs/emails: derive identity from session only
    const existingById = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
    })

    if (existingById) {
      // Allow name update for the authenticated user (no role changes here)
      const updated = await prisma.user.update({
        where: { id: supabaseUser.id },
        data: { name },
      })
      return NextResponse.json({ success: true, data: updated }, { status: 200 })
    }

    // Legacy fallback: if a user exists by email, return it (do not attempt to "take over" IDs)
    const existingByEmail = await prisma.user.findUnique({
      where: { email: supabaseUser.email },
    })
    if (existingByEmail) {
      return NextResponse.json({ success: true, data: existingByEmail }, { status: 200 })
    }

    // Create user with optional athlete profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const created = await tx.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name,
          role: 'COACH',
          language: 'sv',
        },
      })

      // If athlete profile is requested and data is valid, create it
      if (createAthleteProfile && athleteProfileData?.gender && athleteProfileData.birthDate && athleteProfileData.height && athleteProfileData.weight) {
        const client = await tx.client.create({
          data: {
            userId: created.id,
            name: name,
            email: supabaseUser.email,
            gender: athleteProfileData.gender,
            birthDate: athleteProfileData.birthDate,
            height: athleteProfileData.height,
            weight: athleteProfileData.weight,
            isDirect: false,
          },
        })

        // Link the client to the user as their self-athlete profile
        await tx.user.update({
          where: { id: created.id },
          data: { selfAthleteClientId: client.id },
        })

        logger.info('Created user with self-athlete profile', { userId: created.id, clientId: client.id })
      }

      return created
    })

    // Send welcome email to new users
    try {
      await sendWelcomeEmail(
        supabaseUser.email,
        name,
        'sv' // Default to Swedish
      )
      logger.info('Welcome email sent', { userId: result.id, email: supabaseUser.email })
    } catch (emailError) {
      // Don't fail the signup if email fails
      logger.error('Failed to send welcome email', { userId: result.id }, emailError)
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    logger.error('Error creating user', {}, error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { id: supabaseUser.id } })
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      { success: true, data: users },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Error fetching users', {}, error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
