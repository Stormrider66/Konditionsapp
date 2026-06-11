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
  buildHyroxPrompt,
  getHyroxFPS,
  type HyroxStationType,
  HYROX_STATION_LABELS,
} from '@/lib/ai/hyrox-prompts'
import { parseHyroxAnalysisResponse } from '@/lib/validations/hyrox-analysis'
import { buildMultiViewPromptBlock, getAnalyzerVideoParts, type GroupVideoRef } from '../shared'

export interface HyroxAnalyzerInput {
  videoUrl: string
  videoType: string | null
  athlete: { id: string; name: string; gender: string | null } | null
  /** Multi-view capture group (simultaneous cameras). When 2+ entries, all videos are analyzed jointly. */
  groupVideos?: GroupVideoRef[]
}

const HYROX_CROSS_REFERENCE_HINT = {
  en: 'Cross-reference the views: lateral alignment, left/right symmetry and knee tracking are best judged from FRONT/BACK; depth, hip hinge, trunk angle, lockout and stride/stroke length are best judged from SIDE.',
  sv: 'Korsreferera vinklarna: sidledsuppställning, höger/vänster-symmetri och knäspårning bedöms bäst från FRONT/BACK; djup, höftfällning, bålvinkel, lockout och steg-/draglängd bedöms bäst från SIDE.',
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * Analyzer for HYROX station videos — all 8 stations with the
 * station-specific field set.
 */
export async function analyzeHyroxStation(
  id: string,
  analysis: HyroxAnalyzerInput,
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string,
  locale: AppLocale = 'en'
): Promise<NextResponse> {
  const fullAnalysis = await prisma.videoAnalysis.findUnique({
    where: { id },
    include: { athlete: { include: { sportProfile: true } } },
  })

  if (!fullAnalysis) {
    return NextResponse.json({ error: t(locale, 'Analysis not found', 'Analysen hittades inte') }, { status: 404 })
  }

  const stationType = (fullAnalysis.hyroxStation || 'SKIERG') as HyroxStationType

  const athleteContext = fullAnalysis.athlete?.sportProfile?.hyroxSettings
    ? {
        hyroxCategory: (fullAnalysis.athlete.sportProfile.hyroxSettings as { category?: string })?.category,
        stationTimes: (fullAnalysis.athlete.sportProfile.hyroxSettings as { stationTimes?: Record<string, number> })?.stationTimes,
        weakStations: (fullAnalysis.athlete.sportProfile.hyroxSettings as { weakStations?: string[] })?.weakStations,
        strongStations: (fullAnalysis.athlete.sportProfile.hyroxSettings as { strongStations?: string[] })?.strongStations,
      }
    : undefined

  const prompt = buildHyroxPrompt(stationType, athleteContext, locale)
  const fps = getHyroxFPS()
  const videoMetadata: VideoMetadata = { fps }

  logger.debug('Video analysis: HYROX station starting', {
    stationType,
    stationLabel: HYROX_STATION_LABELS[stationType],
    fps,
  })

  const { parts: videoParts, viewAngles } = await getAnalyzerVideoParts(analysis, client, videoMetadata, locale)
  const fullPrompt = viewAngles
    ? buildMultiViewPromptBlock(viewAngles, locale, HYROX_CROSS_REFERENCE_HINT) + prompt
    : prompt
  const result = await generateContent(client, modelId, [createText(fullPrompt), ...videoParts])

  const parsedAnalysis = parseHyroxAnalysisResponse(stationType, result.text)

  if (!parsedAnalysis) {
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
      warning: t(locale, 'Could not parse structured response', 'Kunde inte tolka strukturerat svar'),
      rawAnalysis: result.text,
    })
  }

  const issues = parsedAnalysis.insights.weaknesses.map((weakness) => ({
    issue: weakness,
    severity: 'MEDIUM' as const,
    description: weakness,
  }))

  const recommendations = parsedAnalysis.insights.drills.map((drill) => ({
    priority: drill.priority,
    recommendation: drill.drill,
    explanation: drill.focus,
  }))

  await prisma.videoAnalysis.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      aiAnalysis: result.text,
      aiProvider: 'GOOGLE',
      modelUsed: modelId,
      formScore: Math.round(parsedAnalysis.formScore),
      issuesDetected: issues,
      recommendations,
    },
  })

  const hyroxAnalysisData: Record<string, unknown> = {
    videoAnalysisId: id,
    stationType,
    overallScore: parsedAnalysis.overallScore,
    efficiencyScore: parsedAnalysis.efficiencyScore,
    formScore: parsedAnalysis.formScore,
    paceConsistency: parsedAnalysis.paceConsistency,
    coreStability: parsedAnalysis.coreStability,
    breathingPattern: parsedAnalysis.breathingPattern,
    movementCadence: parsedAnalysis.movementCadence,
    fatigueIndicators: parsedAnalysis.fatigueIndicators || null,
    primaryStrengths: parsedAnalysis.insights.strengths,
    primaryWeaknesses: parsedAnalysis.insights.weaknesses,
    improvementDrills: parsedAnalysis.insights.drills,
    raceStrategyTips: parsedAnalysis.insights.raceStrategyTips,
  }

  if (stationType === 'SKIERG' && 'pullLength' in parsedAnalysis) {
    hyroxAnalysisData.pullLength = parsedAnalysis.pullLength
    hyroxAnalysisData.hipHingeDepth = parsedAnalysis.hipHingeDepth
    hyroxAnalysisData.armExtension = parsedAnalysis.armExtension
    hyroxAnalysisData.legDriveContribution = parsedAnalysis.legDriveContribution
  }

  if (stationType === 'SLED_PUSH' && 'bodyAngle' in parsedAnalysis) {
    hyroxAnalysisData.bodyAngle = parsedAnalysis.bodyAngle
    hyroxAnalysisData.armLockout = parsedAnalysis.armLockout
    hyroxAnalysisData.strideLength = parsedAnalysis.strideLength
    hyroxAnalysisData.drivePhase = parsedAnalysis.drivePhase
  }

  if (stationType === 'SLED_PULL' && 'pullTechnique' in parsedAnalysis) {
    hyroxAnalysisData.pullTechnique = parsedAnalysis.pullTechnique
    hyroxAnalysisData.ropePath = parsedAnalysis.ropePath
    hyroxAnalysisData.anchorStability = parsedAnalysis.anchorStability
  }

  if (stationType === 'BURPEE_BROAD_JUMP' && 'burpeeDepth' in parsedAnalysis) {
    hyroxAnalysisData.burpeeDepth = parsedAnalysis.burpeeDepth
    hyroxAnalysisData.jumpDistance = parsedAnalysis.jumpDistance
    hyroxAnalysisData.transitionSpeed = parsedAnalysis.transitionSpeed
    hyroxAnalysisData.landingMechanics = parsedAnalysis.landingMechanics
  }

  if (stationType === 'ROWING' && 'driveSequence' in parsedAnalysis) {
    hyroxAnalysisData.driveSequence = parsedAnalysis.driveSequence
    hyroxAnalysisData.laybackAngle = parsedAnalysis.laybackAngle
    hyroxAnalysisData.catchPosition = parsedAnalysis.catchPosition
    hyroxAnalysisData.strokeRate = parsedAnalysis.strokeRate
    hyroxAnalysisData.powerApplication = parsedAnalysis.powerApplication
  }

  if (stationType === 'FARMERS_CARRY' && 'shoulderPack' in parsedAnalysis) {
    hyroxAnalysisData.shoulderPack = parsedAnalysis.shoulderPack
    hyroxAnalysisData.trunkPosture = parsedAnalysis.trunkPosture
    hyroxAnalysisData.stridePattern = parsedAnalysis.stridePattern
    hyroxAnalysisData.gripFatigue = parsedAnalysis.gripFatigue
  }

  if (stationType === 'SANDBAG_LUNGE' && 'bagPosition' in parsedAnalysis) {
    hyroxAnalysisData.bagPosition = parsedAnalysis.bagPosition
    hyroxAnalysisData.kneeTracking = parsedAnalysis.kneeTracking
    hyroxAnalysisData.stepLength = parsedAnalysis.stepLength
    hyroxAnalysisData.torsoPosition = parsedAnalysis.torsoPosition
  }

  if (stationType === 'WALL_BALLS' && 'squatDepth' in parsedAnalysis) {
    hyroxAnalysisData.squatDepth = parsedAnalysis.squatDepth
    hyroxAnalysisData.throwMechanics = parsedAnalysis.throwMechanics
    hyroxAnalysisData.wallBallCatchHeight = parsedAnalysis.wallBallCatchHeight
    hyroxAnalysisData.rhythmConsistency = parsedAnalysis.rhythmConsistency
  }

  if (athleteContext?.weakStations?.includes(stationType)) {
    hyroxAnalysisData.isWeakStation = true
  }
  if (athleteContext?.strongStations?.includes(stationType)) {
    hyroxAnalysisData.isStrongStation = true
  }

  const hyroxAnalysis = await prisma.hyroxStationAnalysis.create({
    data: hyroxAnalysisData as Prisma.HyroxStationAnalysisCreateInput,
  })

  const updatedAnalysis = await prisma.videoAnalysis.findUnique({
    where: { id },
    include: {
      athlete: { select: { id: true, name: true } },
      hyroxStationAnalysis: true,
    },
  })

  return NextResponse.json({
    success: true,
    analysis: updatedAnalysis,
    hyroxAnalysis,
    result: parsedAnalysis,
  })
}
