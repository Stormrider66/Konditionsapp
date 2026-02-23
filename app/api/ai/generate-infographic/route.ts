/**
 * AI Generate Infographic API
 *
 * POST /api/ai/generate-infographic - Generate or regenerate a program infographic on demand
 */

export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import {
  generateProgramInfographic,
  reconstructProgramForInfographic,
  ALLOWED_IMAGE_MODELS,
} from '@/lib/ai/program-infographic'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:generate-infographic', user.id, {
      limit: 5,
      windowSeconds: 300,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const { programId, model } = body as { programId?: string; model?: string }

    if (!programId) {
      return NextResponse.json(
        { error: 'Missing required field: programId' },
        { status: 400 }
      )
    }

    if (model && !ALLOWED_IMAGE_MODELS.includes(model as typeof ALLOWED_IMAGE_MODELS[number])) {
      return NextResponse.json(
        { error: 'Invalid model. Allowed: ' + ALLOWED_IMAGE_MODELS.join(', ') },
        { status: 400 }
      )
    }

    // Verify coach has access to this program
    const program = await prisma.trainingProgram.findFirst({
      where: { id: programId, coachId: user.id },
      select: { id: true },
    })

    if (!program) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      )
    }

    const programData = await reconstructProgramForInfographic(programId)
    if (!programData) {
      return NextResponse.json(
        { error: 'Failed to load program data' },
        { status: 500 }
      )
    }

    const locale = request.headers.get('accept-language')?.startsWith('sv') ? 'sv' : 'en'

    const url = await generateProgramInfographic({
      programId,
      programData,
      coachId: user.id,
      locale,
      model,
    })

    return NextResponse.json({ success: true, url })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Generate infographic error', { errorMessage }, error)

    if (errorMessage === 'NO_API_KEY') {
      return NextResponse.json(
        { error: 'No Google API key configured. Add your key in Settings or contact support.' },
        { status: 400 }
      )
    }

    if (errorMessage === 'NO_IMAGE_IN_RESPONSE') {
      return NextResponse.json(
        { error: 'The AI model did not return an image. Try again or switch to Flash model.' },
        { status: 502 }
      )
    }

    if (errorMessage.startsWith('GEMINI_ERROR:')) {
      return NextResponse.json(
        { error: `AI model error: ${errorMessage.replace('GEMINI_ERROR: ', '')}` },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate infographic', message: errorMessage },
      { status: 500 }
    )
  }
}
