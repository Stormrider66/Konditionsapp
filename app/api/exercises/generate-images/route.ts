/**
 * Bulk Exercise Image Generation API
 *
 * POST /api/exercises/generate-images
 *
 * Generates images for exercises that don't have any.
 * Uses Gemini image generation (requires Google API key).
 * Processes in batches to avoid timeouts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { lookupOrGenerateExercise } from '@/lib/ai/exercise-generator'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/api/utils'

export const maxDuration = 60
type AppLocale = 'en' | 'sv'

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const locale = getUserLocale(user.language)
    const body = await request.json()
    const { batchSize = 5 } = body

    // Find exercises without images
    const exercisesWithoutImages = await prisma.exercise.findMany({
      where: {
        OR: [
          { imageUrls: { equals: Prisma.DbNull } },
          { imageUrls: { equals: Prisma.JsonNull } },
          { imageUrls: { equals: [] } },
        ],
      },
      select: {
        id: true,
        name: true,
        nameSv: true,
        nameEn: true,
        muscleGroup: true,
        category: true,
      },
      take: Math.min(batchSize, 10), // Cap at 10 per request to avoid timeout
      orderBy: { name: 'asc' },
    })

    if (exercisesWithoutImages.length === 0) {
      return NextResponse.json({
        success: true,
        message: t(
          locale,
          'All exercises already have images.',
          'Alla övningar har redan bilder.'
        ),
        generated: 0,
        remaining: 0,
      })
    }

    // Count total remaining
    const totalWithout = await prisma.exercise.count({
      where: {
        OR: [
          { imageUrls: { equals: Prisma.DbNull } },
          { imageUrls: { equals: Prisma.JsonNull } },
          { imageUrls: { equals: [] } },
        ],
      },
    })

    const results: Array<{ name: string; success: boolean; error?: string }> = []

    for (const exercise of exercisesWithoutImages) {
      try {
        await lookupOrGenerateExercise({
          exerciseNameSv: exercise.nameSv || exercise.name,
          exerciseNameEn: exercise.nameEn || exercise.name,
          muscleGroups: exercise.muscleGroup ? [exercise.muscleGroup] : [exercise.category || 'strength'],
          isComplexMovement: false,
          coachId: user.id,
        })
        const displayName = locale === 'sv'
          ? exercise.nameSv || exercise.name
          : exercise.nameEn || exercise.name
        results.push({ name: displayName, success: true })
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        const displayName = locale === 'sv'
          ? exercise.nameSv || exercise.name
          : exercise.nameEn || exercise.name
        results.push({ name: displayName, success: false, error: errorMsg })

        // Stop if API key issue
        if (errorMsg === 'NO_GOOGLE_API_KEY') {
          return NextResponse.json({
            success: false,
            error: t(
              locale,
              'No Google API key is configured. Go to Settings -> AI to add one.',
              'Ingen Google API-nyckel konfigurerad. Gå till Inställningar → AI för att lägga till.'
            ),
            generated: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            remaining: totalWithout - results.filter((r) => r.success).length,
            results,
          }, { status: 400 })
        }
      }
    }

    const generated = results.filter((r) => r.success).length
    const remaining = totalWithout - generated

    logger.info('Bulk exercise image generation', {
      coachId: user.id,
      generated,
      failed: results.filter((r) => !r.success).length,
      remaining,
    })

    return NextResponse.json({
      success: true,
      generated,
      failed: results.filter((r) => !r.success).length,
      remaining,
      results,
      message: t(
        locale,
        `${generated} images generated. ${remaining} exercises still need images.`,
        `${generated} bilder genererade. ${remaining} övningar kvar utan bilder.`
      ),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * GET /api/exercises/generate-images
 * Returns count of exercises without images.
 */
export async function GET() {
  try {
    await requireCoach()

    const totalWithout = await prisma.exercise.count({
      where: {
        OR: [
          { imageUrls: { equals: Prisma.DbNull } },
          { imageUrls: { equals: Prisma.JsonNull } },
          { imageUrls: { equals: [] } },
        ],
      },
    })

    const total = await prisma.exercise.count()

    return NextResponse.json({
      total,
      withImages: total - totalWithout,
      withoutImages: totalWithout,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
