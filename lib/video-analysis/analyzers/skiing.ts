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
import {
  buildSkiingPrompt,
  getSkiingFPS,
  getSkiingTechniqueType,
  type SkiingTechniqueType as SkiingVideoType,
} from '@/lib/ai/skiing-prompts'
import { parseSkiingAnalysisResponse } from '@/lib/validations/skiing-analysis'
import { getVideoContentPart } from '../shared'

export interface SkiingAnalyzerInput {
  videoUrl: string
  videoType: string
  athlete: { id: string; name: string; gender: string | null } | null
}

/**
 * Analyzer for Classic, Skating, and Double Pole skiing videos. Builds
 * the prompt from sport-profile settings, calls Gemini, persists the
 * detailed SkiingTechniqueAnalysis record.
 */
export async function analyzeSkiingTechnique(
  id: string,
  analysis: SkiingAnalyzerInput,
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string
): Promise<NextResponse> {
  const videoType = analysis.videoType as SkiingVideoType

  let skiingSettings: Record<string, unknown> | undefined
  if (analysis.athlete?.id) {
    const sportProfile = await prisma.sportProfile.findUnique({
      where: { clientId: analysis.athlete.id },
      select: { skiingSettings: true },
    })
    skiingSettings = sportProfile?.skiingSettings as Record<string, unknown> | undefined
  }

  const prompt = buildSkiingPrompt(videoType, {
    gender: analysis.athlete?.gender || 'MALE',
    athleteName: analysis.athlete?.name,
    experienceLevel: skiingSettings?.experienceLevel as string | undefined,
    skiingSettings: skiingSettings as {
      technique?: string
      primaryDiscipline?: string
      terrainPreference?: string
      currentThresholdPace?: number | null
    } | undefined,
  })

  const fps = getSkiingFPS(videoType)
  const videoMetadata: VideoMetadata = { fps }

  logger.debug('Video analysis: skiing technique starting', { videoType, fps })

  const videoPart = await getVideoContentPart(analysis.videoUrl, client, videoMetadata)
  const result = await generateContent(client, modelId, [createText(prompt), videoPart])

  const parsedAnalysis = parseSkiingAnalysisResponse(videoType, result.text)

  if (!parsedAnalysis) {
    logger.warn('[Skiing Analysis] Failed to parse AI response')
    await prisma.videoAnalysis.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        aiAnalysis: result.text,
        aiProvider: 'GOOGLE',
        modelUsed: modelId,
        formScore: 50,
      },
    })
    return NextResponse.json({
      success: true,
      warning: 'Analysis completed but structured parsing failed',
      rawAnalysis: result.text,
    })
  }

  const techniqueType = getSkiingTechniqueType(videoType)
  const formScore = Math.round(parsedAnalysis.overallScore || 50)

  const issues = parsedAnalysis.insights?.weaknesses?.map((weakness) => ({
    issue: weakness,
    severity: 'MEDIUM' as const,
    description: weakness,
  })) || []

  const recommendations = parsedAnalysis.insights?.drills?.map((drill) => ({
    priority: drill.priority,
    recommendation: drill.drill,
    explanation: drill.focus,
  })) || []

  await prisma.videoAnalysis.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      aiAnalysis: result.text,
      aiProvider: 'GOOGLE',
      modelUsed: modelId,
      formScore,
      issuesDetected: issues,
      recommendations,
    },
  })

  const skiingAnalysisData: Record<string, unknown> = {
    videoAnalysisId: id,
    techniqueType,
    overallScore: parsedAnalysis.overallScore,
    efficiencyScore: parsedAnalysis.efficiencyScore,
    primaryStrengths: parsedAnalysis.insights?.strengths || [],
    primaryWeaknesses: parsedAnalysis.insights?.weaknesses || [],
    techniqueDrills: parsedAnalysis.insights?.drills || [],
    comparisonToElite: parsedAnalysis.insights?.eliteComparison,
  }

  // Technique-specific top-level scores (DoublePole: power/rhythm; others: balance/timing).
  if ('balanceScore' in parsedAnalysis) skiingAnalysisData.balanceScore = parsedAnalysis.balanceScore
  if ('timingScore' in parsedAnalysis) skiingAnalysisData.timingScore = parsedAnalysis.timingScore
  if ('powerScore' in parsedAnalysis) skiingAnalysisData.powerScore = parsedAnalysis.powerScore
  if ('rhythmScore' in parsedAnalysis) skiingAnalysisData.rhythmScore = parsedAnalysis.rhythmScore

  if ('poleAnalysis' in parsedAnalysis && parsedAnalysis.poleAnalysis) {
    skiingAnalysisData.poleAngleAtPlant = parsedAnalysis.poleAnalysis.plantAngle
    skiingAnalysisData.poleAngleAtRelease = parsedAnalysis.poleAnalysis.releaseAngle
    skiingAnalysisData.polePlantTiming = parsedAnalysis.poleAnalysis.timing
    skiingAnalysisData.poleForceApplication = parsedAnalysis.poleAnalysis.forceApplication
    skiingAnalysisData.armSwingSymmetry = parsedAnalysis.poleAnalysis.armSymmetry
  }

  if ('hipPosition' in parsedAnalysis && parsedAnalysis.hipPosition) {
    skiingAnalysisData.hipPositionScore = parsedAnalysis.hipPosition.score
    skiingAnalysisData.hipHeightConsistency = parsedAnalysis.hipPosition.heightConsistency
    skiingAnalysisData.forwardLean = parsedAnalysis.hipPosition.forwardLean
    skiingAnalysisData.coreEngagement = parsedAnalysis.hipPosition.coreEngagement
  }

  // Classic-specific fields.
  if ('kickAnalysis' in parsedAnalysis && parsedAnalysis.kickAnalysis) {
    skiingAnalysisData.kickTimingScore = parsedAnalysis.kickAnalysis.timingScore
    skiingAnalysisData.kickExtension = parsedAnalysis.kickAnalysis.extension
    skiingAnalysisData.waxPocketEngagement = parsedAnalysis.kickAnalysis.waxPocketEngagement
  }

  if ('weightTransfer' in parsedAnalysis && parsedAnalysis.weightTransfer) {
    skiingAnalysisData.weightTransferScore = parsedAnalysis.weightTransfer.score
    skiingAnalysisData.weightShiftTiming = parsedAnalysis.weightTransfer.timing
    skiingAnalysisData.lateralStability = parsedAnalysis.weightTransfer.lateralStability
  }

  if ('glidePhase' in parsedAnalysis && parsedAnalysis.glidePhase) {
    skiingAnalysisData.glidePhaseDuration = parsedAnalysis.glidePhase.duration
    skiingAnalysisData.legRecoveryPattern = parsedAnalysis.glidePhase.legRecovery
  }

  // Skating-specific fields.
  if ('skatingVariant' in parsedAnalysis) {
    skiingAnalysisData.skatingVariant = parsedAnalysis.skatingVariant
  }

  if ('edgeAnalysis' in parsedAnalysis && parsedAnalysis.edgeAnalysis) {
    skiingAnalysisData.edgeAngleLeft = parsedAnalysis.edgeAnalysis.leftAngle
    skiingAnalysisData.edgeAngleRight = parsedAnalysis.edgeAnalysis.rightAngle
    skiingAnalysisData.edgeAngleSymmetry = parsedAnalysis.edgeAnalysis.symmetry
    skiingAnalysisData.pushOffAngle = parsedAnalysis.edgeAnalysis.pushOffAngle
  }

  if ('vPattern' in parsedAnalysis && parsedAnalysis.vPattern) {
    skiingAnalysisData.vPatternWidth = parsedAnalysis.vPattern.width
    skiingAnalysisData.skateFrequency = parsedAnalysis.vPattern.frequency
  }

  if ('recovery' in parsedAnalysis && parsedAnalysis.recovery) {
    skiingAnalysisData.recoveryLegPath = parsedAnalysis.recovery.legPath
  }

  // Double-pole-specific fields.
  if ('trunkAnalysis' in parsedAnalysis && parsedAnalysis.trunkAnalysis) {
    skiingAnalysisData.trunkFlexionRange = parsedAnalysis.trunkAnalysis.flexionRange
    skiingAnalysisData.compressionDepth = parsedAnalysis.trunkAnalysis.compressionDepth
    skiingAnalysisData.returnPhaseSpeed = parsedAnalysis.trunkAnalysis.returnSpeed
  }

  if ('legDrive' in parsedAnalysis && parsedAnalysis.legDrive) {
    skiingAnalysisData.legDriveContribution = parsedAnalysis.legDrive.contribution
  }

  if ('rhythm' in parsedAnalysis && parsedAnalysis.rhythm) {
    skiingAnalysisData.rhythmConsistency = parsedAnalysis.rhythm.consistency
  }

  const skiingAnalysis = await prisma.skiingTechniqueAnalysis.create({
    data: skiingAnalysisData as Prisma.SkiingTechniqueAnalysisCreateInput,
  })

  const updatedAnalysis = await prisma.videoAnalysis.findUnique({
    where: { id },
    include: {
      athlete: { select: { id: true, name: true } },
      skiingTechniqueAnalysis: true,
    },
  })

  return NextResponse.json({
    success: true,
    analysis: updatedAnalysis,
    skiingAnalysis,
    result: parsedAnalysis,
  })
}
