// app/api/coach/profile/route.ts
// API for managing coach's own marketplace profile

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { SportType } from '@prisma/client'

// Validation schema for profile updates
const profileUpdateSchema = z.object({
  headline: z.string().max(150).optional(),
  bio: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  specialties: z.array(z.nativeEnum(SportType)).optional(),
  methodologies: z.array(z.string()).max(10).optional(),
  experienceYears: z.number().min(0).max(50).optional().nullable(),
  credentials: z.array(z.string()).max(20).optional(),
  isPublic: z.boolean().optional(),
  isAcceptingClients: z.boolean().optional(),
  location: z.string().max(100).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
  languages: z.array(z.string()).max(10).optional(),
})

/**
 * GET /api/coach/profile
 * Get current coach's marketplace profile
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Obehörig' },
        { status: 401 }
      )
    }

    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Endast coacher kan ha en profil' },
        { status: 403 }
      )
    }

    const profile = await prisma.coachProfile.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    logger.error('Error fetching coach profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Misslyckades med att hämta profil' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/coach/profile
 * Update or create coach's marketplace profile
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Obehörig' },
        { status: 401 }
      )
    }

    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Endast coacher kan ha en profil' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = profileUpdateSchema.parse(body)

    // Generate slug if this is a new profile
    const existingProfile = await prisma.coachProfile.findUnique({
      where: { userId: user.id },
    })

    let slug = existingProfile?.slug
    if (!slug) {
      // Create slug from user name
      const baseSlug = user.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      // Check for uniqueness and add suffix if needed
      let candidateSlug = baseSlug
      let suffix = 0
      while (await prisma.coachProfile.findUnique({ where: { slug: candidateSlug } })) {
        suffix++
        candidateSlug = `${baseSlug}-${suffix}`
      }
      slug = candidateSlug
    }

    // Upsert the profile
    const profile = await prisma.coachProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        slug,
        ...validatedData,
      },
      update: validatedData,
    })

    logger.info('Coach profile updated', { userId: user.id, profileId: profile.id })

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ogiltiga data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    logger.error('Error updating coach profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Misslyckades med att uppdatera profil' },
      { status: 500 }
    )
  }
}
