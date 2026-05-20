import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  type createGoogleGenAIClient,
  generateContent,
  createText,
  type VideoMetadata,
} from '@/lib/ai/google-genai-client'
import { getVideoContentPart, VIDEO_FPS } from '../shared'

export interface RunningGaitAnalyzerInput {
  videoUrl: string
  athlete: { id: string; name: string; gender: string | null } | null
}

type GaitIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH'

interface RunningGaitResult {
  analysisValidity?: {
    isAnalyzableRunning?: boolean
    reason?: string
    confidence?: number
    detectedActivity?: string
    visibleBody?: string
    runningCyclesObserved?: number
  }
  biometrics?: {
    estimatedCadence?: number | null
    groundContactTime?: 'SHORT' | 'NORMAL' | 'LONG' | null
    verticalOscillation?: 'MINIMAL' | 'MODERATE' | 'EXCESSIVE' | null
    strideLength?: 'SHORT' | 'OPTIMAL' | 'OVERSTRIDING' | null
    footStrike?: 'HEEL' | 'MIDFOOT' | 'FOREFOOT' | null
  }
  asymmetry?: {
    overallPercent?: number | null
    significantDifferences?: string[]
  }
  injuryRiskAnalysis?: {
    riskScore?: number | null
    posteriorChainEngagement?: boolean | null
    detectedCompensations?: Array<{
      issue?: string
      severity?: string
      timestamp?: string
      observation?: string
    }>
  }
  efficiency?: {
    rating?: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | null
    score?: number | null
    energyLeakages?: Array<{
      type?: string
      description?: string
      impact?: string
    }>
  }
  coachingCues?: {
    immediateCorrection?: string | null
    drillRecommendation?: string | null
    strengthFocus?: string[]
  }
  overallScore?: number | null
  summary?: string | null
}

interface VideoAnalysisIssue {
  issue: string
  severity: GaitIssueSeverity
  timestamp?: string
  description: string
}

interface VideoAnalysisRecommendation {
  priority: number
  recommendation: string
  explanation: string
}

type GroundContactTimeLabel = NonNullable<NonNullable<RunningGaitResult['biometrics']>['groundContactTime']>
type VerticalOscillationLabel = NonNullable<NonNullable<RunningGaitResult['biometrics']>['verticalOscillation']>

function buildRunningGaitPrompt(athleteName: string, gender: string): string {
  return `Du är en erfaren löpbiomekaniker och idrottsfysiolog. Analysera denna löpvideo noggrant.

## VIKTIGT: ANALYSERA HELA VIDEON
Du har tillgång till HELA videon med flera bildrutor (frames) över tid. Analysera rörelsen genom HELA videosekvensen, inte bara en enskild bildruta. Titta på:
- Hur rörelsen förändras genom videon
- Konsistensen i löpteknik över tid
- Eventuella mönster som upprepas vid varje steg
- Räkna faktiska steg för att uppskatta kadens

## ATLET INFORMATION
- **Namn**: ${athleteName}
- **Pronomen**: ${gender}

## KVALITETSGRIND - MÅSTE GÖRAS FÖRST
Innan du sätter någon löpteknisk poäng måste du avgöra om videon faktiskt är analyserbar som löpning.

Videon är bara analyserbar om:
- Personen springer tydligt, inte sitter, står stilla, går eller bara rör kameran
- Minst tre sammanhängande löpsteg/gait cycles syns
- Tillräckligt av kroppen syns för att bedöma löpteknik

Om videon INTE är analyserbar som löpning:
- Sätt "analysisValidity.isAnalyzableRunning": false
- Sätt "overallScore": null och "efficiency.score": null
- Gissa inte kadens, fotisättning, markkontakttid eller löpekonomi
- Lägg till en HIGH issue som förklarar problemet, t.ex. "Ingen löpning upptäckt"
- Skriv en kort svensk sammanfattning som säger att videon behöver spelas in igen
- Ge INTE en normal poäng som 60-80 bara för att bildkvaliteten är okej

## ANALYSERA FÖLJANDE ASPEKTER (baserat på hela videosekvensen)

### 1. BIOMETRISKA MÄTVÄRDEN
Uppskatta baserat på videoanalys:
- **Kadens** (steg/minut) - räkna steg och extrapolera till per minut (typiskt 160-190 för tränade löpare)
- **Markontakttid** - bedöm som SHORT (<200ms), NORMAL (200-260ms), eller LONG (>260ms)
- **Vertikal oscillation** - bedöm som MINIMAL, MODERATE, eller EXCESSIVE
- **Steglängd** - bedöm som SHORT, OPTIMAL, eller OVERSTRIDING relativt till löparens längd och tempo
- **Fotisättning** - identifiera HEEL, MIDFOOT, eller FOREFOOT

### 2. ASYMMETRIANALYS
Jämför vänster och höger sida:
- Övergripande asymmetriprocent (>10% är oroande)
- Lista signifikanta skillnader

### 3. SKADERISKBEDÖMNING
- Ge en riskpoäng 0-10 (0=låg risk, 10=hög risk)
- Identifiera kompensationsmönster
- Bedöm posterior chain-engagemang (glutes, hamstrings)

### 4. LÖPEFFEKTIVITET
- Rating: EXCELLENT/GOOD/MODERATE/POOR
- Poäng 0-100
- Lista energiläckage

### 5. COACHING (PÅ SVENSKA)
- **Omedelbar korrigering**: Viktigaste cue att ge atleten direkt
- **Övningsrekommendation**: Specifik drill för att adressera huvudproblemet
- **Styrkeprioriteringar**: Muskelgrupper att fokusera på i styrketräning

### 6. SUMMERING
- Övergripande poäng 0-100
- Sammanfattning på svenska

SVARA I FÖLJANDE JSON-FORMAT:

\`\`\`json
{
  "analysisValidity": {
    "isAnalyzableRunning": <boolean>,
    "reason": "<short reason in Swedish, or null if valid>",
    "confidence": <number 0-100>,
    "detectedActivity": "RUNNING|WALKING|SITTING|STANDING|NO_PERSON|OTHER",
    "visibleBody": "FULL|PARTIAL|NONE",
    "runningCyclesObserved": <number>
  },
  "biometrics": {
    "estimatedCadence": <number or null>,
    "groundContactTime": "SHORT|NORMAL|LONG|null",
    "verticalOscillation": "MINIMAL|MODERATE|EXCESSIVE|null",
    "strideLength": "SHORT|OPTIMAL|OVERSTRIDING|null",
    "footStrike": "HEEL|MIDFOOT|FOREFOOT|null"
  },
  "asymmetry": {
    "overallPercent": <number 0-100 or null>,
    "significantDifferences": ["<list of differences>"]
  },
  "injuryRiskAnalysis": {
    "riskScore": <number 0-10 or null>,
    "posteriorChainEngagement": <boolean or null>,
    "detectedCompensations": [
      {
        "issue": "<name>",
        "severity": "LOW|MEDIUM|HIGH",
        "observation": "<what you see>",
        "timestamp": "<approx time>"
      }
    ]
  },
  "efficiency": {
    "rating": "EXCELLENT|GOOD|MODERATE|POOR|null",
    "score": <number 0-100 or null>,
    "energyLeakages": [
      {
        "type": "<type>",
        "description": "<description>",
        "impact": "LOW|MEDIUM|HIGH"
      }
    ]
  },
  "coachingCues": {
    "immediateCorrection": "<most important cue in Swedish, or null>",
    "drillRecommendation": "<specific drill name, or null>",
    "strengthFocus": ["<muscle groups to strengthen>"]
  },
  "overallScore": <number 0-100 or null>,
  "summary": "<Swedish summary>"
}
\`\`\``
}

function createInvalidGaitResult(rawText: string, reason?: string): RunningGaitResult {
  const summary = reason || 'Videon kan inte bedömas som löpteknik eftersom tydlig löpning inte kunde verifieras.'

  return {
    analysisValidity: {
      isAnalyzableRunning: false,
      reason: summary,
      confidence: 0,
      detectedActivity: 'OTHER',
      visibleBody: 'PARTIAL',
      runningCyclesObserved: 0,
    },
    biometrics: {},
    asymmetry: { overallPercent: null, significantDifferences: [] },
    injuryRiskAnalysis: {
      riskScore: null,
      posteriorChainEngagement: null,
      detectedCompensations: [
        {
          issue: 'Ogiltigt löpklipp',
          severity: 'HIGH',
          observation: summary,
          timestamp: '00:00',
        },
      ],
    },
    efficiency: { rating: null, score: null, energyLeakages: [] },
    coachingCues: {
      immediateCorrection: 'Spela in en ny video där atleten springer och hela kroppen syns.',
      drillRecommendation: null,
      strengthFocus: [],
    },
    overallScore: null,
    summary: rawText ? `${summary}\n\nAI-svar: ${rawText.substring(0, 300)}` : summary,
  }
}

function normalizeScore(score: unknown): number | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  return Math.max(0, Math.min(100, Math.round(score)))
}

function normalizeRiskScore(score: unknown): number | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  return Math.max(0, Math.min(10, Math.round(score)))
}

function normalizeCadence(cadence: unknown): number | null {
  if (typeof cadence !== 'number' || !Number.isFinite(cadence)) return null
  return Math.max(60, Math.min(260, Math.round(cadence)))
}

function normalizePercent(percent: unknown): number | null {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return null
  return Math.max(0, Math.min(100, percent))
}

function normalizeSeverity(severity: unknown): GaitIssueSeverity {
  return severity === 'MEDIUM' || severity === 'HIGH' || severity === 'LOW'
    ? severity
    : 'LOW'
}

function getGroundContactTime(value: GroundContactTimeLabel | null | undefined): number | null {
  if (value === 'SHORT') return 180
  if (value === 'NORMAL') return 230
  if (value === 'LONG') return 280
  return null
}

function getVerticalOscillation(value: VerticalOscillationLabel | null | undefined): number | null {
  if (value === 'MINIMAL') return 6
  if (value === 'MODERATE') return 9
  if (value === 'EXCESSIVE') return 12
  return null
}

function getInvalidRunningVideoReason(
  gaitResult: RunningGaitResult,
  issues: VideoAnalysisIssue[]
): string | null {
  const validity = gaitResult.analysisValidity

  if (validity?.isAnalyzableRunning === false) {
    return validity.reason || 'Videon visar inte tillräckligt tydlig löpning för en löpteknisk analys.'
  }

  const detectedActivity = validity?.detectedActivity?.toUpperCase()
  if (detectedActivity && ['SITTING', 'STANDING', 'NO_PERSON', 'OTHER'].includes(detectedActivity)) {
    return `Videon verkar visa ${detectedActivity.toLowerCase()} i stället för löpning. Spela in en ny video med tydlig löpning.`
  }

  if (detectedActivity === 'WALKING') {
    return 'Videon verkar visa gång i stället för löpning. Spela in en ny video med tydlig löpning.'
  }

  if (typeof validity?.runningCyclesObserved === 'number' && validity.runningCyclesObserved < 3) {
    return 'För få löpsteg syns i videon för en stabil löpteknisk analys.'
  }

  const issueText = [
    gaitResult.summary,
    ...issues.flatMap((issue) => [issue.issue, issue.description]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const invalidPatterns = [
    /\bingen rörelse\b/,
    /\bno movement\b/,
    /\bingen löpning\b/,
    /\bno running\b/,
    /\bnot running\b/,
    /\bsittande\b/,
    /\bsitter\b/,
    /\bsitting\b/,
    /\bstol\b/,
    /\bchair\b/,
    /\bstår still\b/,
    /\bstanding still\b/,
  ]

  if (invalidPatterns.some((pattern) => pattern.test(issueText))) {
    return 'Videon visar inte aktiv löpning. Den sparas, men får ingen löpteknisk poäng.'
  }

  return null
}

/**
 * Analyzer for RUNNING_GAIT videos. Produces structured biomechanical
 * metrics, an injury-risk score, and coaching cues — persisted in
 * RunningGaitAnalysis and surfaced back on VideoAnalysis.
 */
export async function analyzeRunningGait(
  id: string,
  analysis: RunningGaitAnalyzerInput,
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string
): Promise<NextResponse> {
  const athleteName = analysis.athlete?.name || 'atleten'
  const gender = analysis.athlete?.gender === 'MALE'
    ? 'han'
    : analysis.athlete?.gender === 'FEMALE' ? 'hon' : 'de'

  const prompt = buildRunningGaitPrompt(athleteName, gender)

  try {
    const videoMetadata: VideoMetadata = { fps: VIDEO_FPS.RUNNING_GAIT }
    logger.debug(`Video analysis: running gait @ ${videoMetadata.fps} FPS`)

    const videoPart = await getVideoContentPart(analysis.videoUrl, client, videoMetadata)
    const result = await generateContent(client, modelId, [createText(prompt), videoPart])

    let gaitResult: RunningGaitResult
    try {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Video analysis raw AI response received', { length: result.text.length })
      }

      const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        logger.debug('Video analysis: found JSON block, parsing')
        gaitResult = JSON.parse(jsonMatch[1])
      } else {
        const jsonStartIndex = result.text.indexOf('{')
        const jsonEndIndex = result.text.lastIndexOf('}')
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          const jsonStr = result.text.substring(jsonStartIndex, jsonEndIndex + 1)
          logger.debug('Video analysis: attempting to parse raw JSON from response')
          gaitResult = JSON.parse(jsonStr)
        } else {
          gaitResult = JSON.parse(result.text)
        }
      }
      logger.debug('Video analysis: successfully parsed gait analysis')
    } catch (parseError) {
      logger.warn(
        'Video analysis: JSON parse error (falling back)',
        { responseLength: result.text.length },
        parseError
      )
      gaitResult = createInvalidGaitResult(
        result.text,
        'AI-svaret kunde inte tolkas säkert som en strukturerad löpanalys, därför sätts ingen poäng.'
      )
    }

    const issues: VideoAnalysisIssue[] = (gaitResult.injuryRiskAnalysis?.detectedCompensations || []).map(
      (comp) => ({
        issue: comp.issue || 'Observation',
        severity: normalizeSeverity(comp.severity),
        timestamp: comp.timestamp,
        description: comp.observation || comp.issue || 'Observation från videoanalysen',
      })
    )

    const invalidReason = getInvalidRunningVideoReason(gaitResult, issues)
    const isInvalidRunningVideo = Boolean(invalidReason)
    const formScore = isInvalidRunningVideo ? null : normalizeScore(gaitResult.overallScore)
    const riskScore = isInvalidRunningVideo ? null : normalizeRiskScore(gaitResult.injuryRiskAnalysis?.riskScore)

    if (invalidReason) {
      gaitResult = {
        ...gaitResult,
        analysisValidity: {
          ...gaitResult.analysisValidity,
          isAnalyzableRunning: false,
          reason: invalidReason,
        },
        overallScore: null,
        summary: invalidReason,
      }

      if (!issues.some((issue) => issue.issue === 'Ogiltigt löpklipp')) {
        issues.unshift({
          issue: 'Ogiltigt löpklipp',
          severity: 'HIGH',
          timestamp: '00:00',
          description: invalidReason,
        })
      }
    }

    let recommendations: VideoAnalysisRecommendation[] = (gaitResult.coachingCues?.strengthFocus || []).map(
      (muscle: string, idx: number) => ({
        priority: idx + 1,
        recommendation: `Stärk ${muscle}`,
        explanation: `Baserat på löpanalys för förbättrad löpekonomi`,
      })
    )

    if (isInvalidRunningVideo) {
      recommendations = [
        {
          priority: 1,
          recommendation: 'Spela in ny löpvideo',
          explanation: 'Atleten bör springa i minst 8-10 sekunder med hela kroppen synlig och kameran stabil.',
        },
      ]
    }

    if (!isInvalidRunningVideo && gaitResult.coachingCues?.immediateCorrection) {
      recommendations.unshift({
        priority: 0,
        recommendation: gaitResult.coachingCues.immediateCorrection,
        explanation: `Primär korrigeringscue`,
      })
    }

    if (!isInvalidRunningVideo && gaitResult.coachingCues?.drillRecommendation) {
      recommendations.push({
        priority: recommendations.length,
        recommendation: `Utför: ${gaitResult.coachingCues.drillRecommendation}`,
        explanation: `Drill för att förbättra löpteknik`,
      })
    }

    const updatedAnalysis = await prisma.videoAnalysis.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        aiAnalysis: gaitResult.summary || result.text,
        aiProvider: 'GOOGLE',
        modelUsed: modelId,
        formScore,
        issuesDetected: issues as unknown as Prisma.InputJsonValue,
        recommendations: recommendations as unknown as Prisma.InputJsonValue,
      },
      include: {
        athlete: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true, nameSv: true } },
      },
    })

    const injuryRiskLevel = riskScore === null
      ? null
      : riskScore <= 3
        ? 'LOW'
        : riskScore <= 6
          ? 'MODERATE'
          : 'HIGH'

    const runningGaitData = {
      cadence: isInvalidRunningVideo ? null : normalizeCadence(gaitResult.biometrics?.estimatedCadence),
      footStrikePattern: isInvalidRunningVideo ? null : gaitResult.biometrics?.footStrike || null,
      groundContactTime: isInvalidRunningVideo ? null : getGroundContactTime(gaitResult.biometrics?.groundContactTime),
      verticalOscillation: isInvalidRunningVideo ? null : getVerticalOscillation(gaitResult.biometrics?.verticalOscillation),
      asymmetryPercent: isInvalidRunningVideo ? null : normalizePercent(gaitResult.asymmetry?.overallPercent),
      injuryRiskLevel,
      injuryRiskScore: riskScore,
      injuryRiskFactors: issues as unknown as Prisma.InputJsonValue,
      runningEfficiency: isInvalidRunningVideo ? null : gaitResult.efficiency?.rating || null,
      energyLeakages: (isInvalidRunningVideo ? [] : gaitResult.efficiency?.energyLeakages || []) as Prisma.InputJsonValue,
      coachingCues: recommendations.map((rec) => ({
        cue: rec.recommendation,
        priority: rec.priority,
        explanation: rec.explanation,
      })) as Prisma.InputJsonValue,
      drillRecommendations: (!isInvalidRunningVideo && gaitResult.coachingCues?.drillRecommendation
        ? [gaitResult.coachingCues.drillRecommendation]
        : []) as Prisma.InputJsonValue,
      overallScore: formScore,
      summary: gaitResult.summary || null,
    }

    await prisma.runningGaitAnalysis.upsert({
      where: { videoAnalysisId: id },
      create: {
        videoAnalysisId: id,
        ...runningGaitData,
      },
      update: runningGaitData,
    })

    return NextResponse.json({
      success: true,
      analysis: updatedAnalysis,
      result: {
        formScore,
        issues,
        recommendations,
        overallAssessment: gaitResult.summary,
        strengths: [
          !isInvalidRunningVideo && gaitResult.injuryRiskAnalysis?.posteriorChainEngagement
            ? 'God aktivering av bakre kedjan'
            : null,
          !isInvalidRunningVideo && (gaitResult.efficiency?.rating === 'EXCELLENT' || gaitResult.efficiency?.rating === 'GOOD')
            ? 'Effektiv löpteknik'
            : null,
        ].filter(Boolean),
        areasForImprovement: [
          ...(gaitResult.efficiency?.energyLeakages || []).map((l) => l.type).filter(Boolean),
          ...(gaitResult.asymmetry?.significantDifferences || []),
        ],
      },
      gaitAnalysis: gaitResult,
    })
  } catch (error) {
    logger.error('Running gait analysis error', { id }, error)

    await prisma.videoAnalysis.update({
      where: { id },
      data: {
        status: 'FAILED',
        processingError: error instanceof Error ? error.message : 'Running gait analysis failed',
      },
    })

    return NextResponse.json(
      {
        error: 'Running gait analysis failed',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : error instanceof Error
              ? error.message
              : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
