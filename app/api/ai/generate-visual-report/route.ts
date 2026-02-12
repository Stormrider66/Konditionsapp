/**
 * Generate Visual Report API
 *
 * POST /api/ai/generate-visual-report
 * Generates a sport-customized visual report using Gemini image generation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { generateVisualReport, ALLOWED_IMAGE_MODELS } from '@/lib/ai/visual-reports'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const requestSchema = z.object({
  reportType: z.enum(['progression', 'training-summary', 'test-report', 'program']),
  clientId: z.string().uuid(),
  model: z.string().optional(),
  testId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:visual-report', user.id, {
      limit: 10,
      windowSeconds: 300,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { reportType, clientId, model, testId, programId, periodStart, periodEnd } = parsed.data

    // Validate model if provided
    if (model && !ALLOWED_IMAGE_MODELS.includes(model as (typeof ALLOWED_IMAGE_MODELS)[number])) {
      return NextResponse.json(
        { error: 'Invalid model. Allowed: ' + ALLOWED_IMAGE_MODELS.join(', ') },
        { status: 400 }
      )
    }

    // Verify coach has access to this client
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this client' },
        { status: 403 }
      )
    }

    const locale = request.headers.get('accept-language')?.startsWith('sv') ? 'sv' : 'en'

    const report = await generateVisualReport({
      reportType,
      clientId,
      coachId: user.id,
      locale,
      model,
      testId,
      programId,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    })

    if (!report) {
      return NextResponse.json(
        { error: 'No Google API key configured or no data available. Add your key in Settings or contact support.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        reportType: report.reportType,
        sportType: report.sportType,
        imageUrl: report.imageUrl,
        model: report.model,
        createdAt: report.createdAt,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Generate visual report error', { errorMessage }, error)

    return NextResponse.json(
      { error: 'Failed to generate visual report', message: errorMessage },
      { status: 500 }
    )
  }
}
