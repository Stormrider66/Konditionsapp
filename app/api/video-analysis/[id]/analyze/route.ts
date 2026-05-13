/**
 * Video Analysis AI Endpoint
 *
 * POST /api/video-analysis/[id]/analyze — run a Gemini video analysis
 * matching the stored VideoAnalysis.videoType. Uses Google's official
 * `@google/genai` SDK directly (bypasses Vercel AI SDK for reliable
 * Gemini 2.5/3 video analysis).
 *
 * Dispatches to one of four analyzers under `lib/video-analysis/`:
 *
 *   - RUNNING_GAIT           → analyzers/running-gait.ts
 *   - SKIING_CLASSIC|SKATING|DOUBLE_POLE → analyzers/skiing.ts
 *   - HYROX_*                → analyzers/hyrox.ts
 *   - STRENGTH + default     → analyzers/generic.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { createGoogleGenAIClient, getGeminiModelId } from '@/lib/ai/google-genai-client'
import { withAiContext } from '@/lib/ai/usage-logger'
import { isSkiingVideoType } from '@/lib/ai/skiing-prompts'
import { isHyroxVideoType } from '@/lib/ai/hyrox-prompts'
import { analyzeGeneric } from '@/lib/video-analysis/analyzers/generic'
import { analyzeSkiingTechnique } from '@/lib/video-analysis/analyzers/skiing'
import { analyzeHyroxStation } from '@/lib/video-analysis/analyzers/hyrox'
import { analyzeRunningGait } from '@/lib/video-analysis/analyzers/running-gait'

// Video analysis can take a while (Gemini).
export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id } = await params

    const rateLimited = await rateLimitJsonResponse('video:analysis:run', user.id, {
      limit: 3,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const analysis = await prisma.videoAnalysis.findFirst({
      where: { id, coachId: user.id },
      include: {
        athlete: { select: { id: true, name: true, gender: true } },
        exercise: {
          select: {
            id: true,
            name: true,
            nameSv: true,
            description: true,
            muscleGroup: true,
            biomechanicalPillar: true,
            instructions: true,
          },
        },
      },
    })

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
      include: { defaultModel: true },
    })

    if (!apiKeys?.googleKeyEncrypted) {
      return NextResponse.json(
        { error: 'Google API key not configured. Please add your API key in settings.' },
        { status: 400 }
      )
    }

    await prisma.videoAnalysis.update({
      where: { id },
      data: { status: 'PROCESSING' },
    })

    try {
      const client = createGoogleGenAIClient(apiKeys.googleKeyEncrypted)

      // Video analysis requires a Google/Gemini model — respect the
      // user's default model only if it's Google, otherwise fall back.
      let modelId: string
      if (apiKeys.defaultModel?.provider === 'GOOGLE' && apiKeys.defaultModel?.modelId) {
        modelId = apiKeys.defaultModel.modelId
        logger.debug('Video analysis: using user-selected Gemini model', { modelId })
      } else {
        modelId = getGeminiModelId('video')
        logger.debug('Video analysis: using default Gemini model', { modelId })
      }

      if (analysis.videoType === 'RUNNING_GAIT') {
        return await withAiContext(
          { userId: user.id, category: 'video_analysis_running_gait' },
          () => analyzeRunningGait(id, analysis, client, modelId),
        )
      }
      if (isSkiingVideoType(analysis.videoType)) {
        return await withAiContext(
          { userId: user.id, category: 'video_analysis_skiing' },
          () => analyzeSkiingTechnique(id, analysis, client, modelId),
        )
      }
      if (isHyroxVideoType(analysis.videoType)) {
        return await withAiContext(
          { userId: user.id, category: 'video_analysis_hyrox' },
          () => analyzeHyroxStation(id, analysis, client, modelId),
        )
      }
      return await withAiContext(
        { userId: user.id, category: 'video_analysis_generic' },
        () => analyzeGeneric(id, analysis, client, modelId),
      )
    } catch (aiError) {
      logger.error('AI analysis error', { id }, aiError)

      await prisma.videoAnalysis.update({
        where: { id },
        data: {
          status: 'FAILED',
          processingError: aiError instanceof Error ? aiError.message : 'AI analysis failed',
        },
      })

      const isProd = process.env.NODE_ENV === 'production'
      return NextResponse.json(
        {
          error: 'AI analysis failed',
          details: isProd
            ? undefined
            : aiError instanceof Error
              ? aiError.message
              : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Video analysis error', { id: (await params).id }, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to analyze video' }, { status: 500 })
  }
}
