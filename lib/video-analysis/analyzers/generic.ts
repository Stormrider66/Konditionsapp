import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  type createGoogleGenAIClient,
  generateContent,
  createText,
  type VideoMetadata,
} from '@/lib/ai/google-genai-client'
import { getVideoContentPart, VIDEO_FPS } from '../shared'
import { buildAnalysisPrompt, parseAnalysisResponse } from '../generic-prompt'

type FullAnalysis = Prisma.VideoAnalysisGetPayload<{
  include: {
    athlete: { select: { id: true; name: true; gender: true } }
    exercise: {
      select: {
        id: true
        name: true
        nameSv: true
        nameEn: true
        description: true
        muscleGroup: true
        biomechanicalPillar: true
        instructions: true
      }
    }
  }
}>

/**
 * Analyzer for STRENGTH and unmatched video types. Uses the generic
 * JSON-shape prompt + parser; the only domain knob is video-type → FPS.
 */
export async function analyzeGeneric(
  id: string,
  analysis: FullAnalysis,
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string,
  locale: 'en' | 'sv' = 'en'
): Promise<NextResponse> {
  const prompt = buildAnalysisPrompt(analysis, locale)

  const fps = analysis.videoType === 'STRENGTH' ? VIDEO_FPS.STRENGTH : VIDEO_FPS.DEFAULT
  const videoMetadata: VideoMetadata = { fps }

  logger.debug('Video analysis: starting', { videoType: analysis.videoType, fps })

  const videoPart = await getVideoContentPart(analysis.videoUrl, client, videoMetadata)
  const result = await generateContent(client, modelId, [createText(prompt), videoPart])

  const analysisResult = parseAnalysisResponse(result.text)

  const updatedAnalysis = await prisma.videoAnalysis.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      aiAnalysis: result.text,
      aiProvider: 'GOOGLE',
      modelUsed: modelId,
      formScore: analysisResult.formScore,
      issuesDetected: analysisResult.issues,
      recommendations: analysisResult.recommendations,
    },
    include: {
      athlete: { select: { id: true, name: true } },
      exercise: { select: { id: true, name: true, nameSv: true, nameEn: true } },
    },
  })

  return NextResponse.json({
    success: true,
    analysis: updatedAnalysis,
    result: analysisResult,
  })
}
