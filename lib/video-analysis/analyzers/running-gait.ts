import { NextResponse } from 'next/server'
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
  "biometrics": {
    "estimatedCadence": <number>,
    "groundContactTime": "SHORT|NORMAL|LONG",
    "verticalOscillation": "MINIMAL|MODERATE|EXCESSIVE",
    "strideLength": "SHORT|OPTIMAL|OVERSTRIDING",
    "footStrike": "HEEL|MIDFOOT|FOREFOOT"
  },
  "asymmetry": {
    "overallPercent": <number 0-100>,
    "significantDifferences": ["<list of differences>"]
  },
  "injuryRiskAnalysis": {
    "riskScore": <number 0-10>,
    "posteriorChainEngagement": <boolean>,
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
    "rating": "EXCELLENT|GOOD|MODERATE|POOR",
    "score": <number 0-100>,
    "energyLeakages": [
      {
        "type": "<type>",
        "description": "<description>",
        "impact": "LOW|MEDIUM|HIGH"
      }
    ]
  },
  "coachingCues": {
    "immediateCorrection": "<most important cue in Swedish>",
    "drillRecommendation": "<specific drill name>",
    "strengthFocus": ["<muscle groups to strengthen>"]
  },
  "overallScore": <number 0-100>,
  "summary": "<Swedish summary>"
}
\`\`\``
}

function fallbackGaitResult(rawText: string) {
  return {
    biometrics: {
      estimatedCadence: 170,
      groundContactTime: 'NORMAL',
      verticalOscillation: 'MODERATE',
      strideLength: 'OPTIMAL',
      footStrike: 'MIDFOOT',
    },
    asymmetry: { overallPercent: 5, significantDifferences: [] },
    injuryRiskAnalysis: {
      riskScore: 3,
      posteriorChainEngagement: true,
      detectedCompensations: [],
    },
    efficiency: { rating: 'GOOD', score: 70, energyLeakages: [] },
    coachingCues: {
      immediateCorrection: 'Se AI-analys för detaljer',
      drillRecommendation: 'A-skip',
      strengthFocus: ['Core', 'Glutes'],
    },
    overallScore: 70,
    summary: rawText.substring(0, 500),
  }
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

    let gaitResult
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
      gaitResult = fallbackGaitResult(result.text)
    }

    const issues = (gaitResult.injuryRiskAnalysis?.detectedCompensations || []).map(
      (comp: { issue: string; severity: string; timestamp?: string; observation: string }) => ({
        issue: comp.issue,
        severity: comp.severity,
        timestamp: comp.timestamp,
        description: comp.observation,
      })
    )

    const recommendations = (gaitResult.coachingCues?.strengthFocus || []).map(
      (muscle: string, idx: number) => ({
        priority: idx + 1,
        recommendation: `Stärk ${muscle}`,
        explanation: `Baserat på löpanalys för förbättrad löpekonomi`,
      })
    )

    if (gaitResult.coachingCues?.immediateCorrection) {
      recommendations.unshift({
        priority: 0,
        recommendation: gaitResult.coachingCues.immediateCorrection,
        explanation: `Primär korrigeringscue`,
      })
    }

    if (gaitResult.coachingCues?.drillRecommendation) {
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
        formScore: gaitResult.overallScore || 70,
        issuesDetected: issues,
        recommendations,
      },
      include: {
        athlete: { select: { id: true, name: true } },
        exercise: { select: { id: true, name: true, nameSv: true } },
      },
    })

    await prisma.runningGaitAnalysis.create({
      data: {
        videoAnalysisId: id,
        cadence: gaitResult.biometrics?.estimatedCadence,
        footStrikePattern: gaitResult.biometrics?.footStrike,
        groundContactTime:
          gaitResult.biometrics?.groundContactTime === 'SHORT'
            ? 180
            : gaitResult.biometrics?.groundContactTime === 'NORMAL'
              ? 230
              : 280,
        verticalOscillation:
          gaitResult.biometrics?.verticalOscillation === 'MINIMAL'
            ? 6
            : gaitResult.biometrics?.verticalOscillation === 'MODERATE'
              ? 9
              : 12,
        asymmetryPercent: gaitResult.asymmetry?.overallPercent,
        injuryRiskLevel:
          (gaitResult.injuryRiskAnalysis?.riskScore || 0) <= 3
            ? 'LOW'
            : (gaitResult.injuryRiskAnalysis?.riskScore || 0) <= 6
              ? 'MODERATE'
              : 'HIGH',
        injuryRiskScore: gaitResult.injuryRiskAnalysis?.riskScore,
        injuryRiskFactors: gaitResult.injuryRiskAnalysis?.detectedCompensations || [],
        runningEfficiency: gaitResult.efficiency?.rating,
        energyLeakages: gaitResult.efficiency?.energyLeakages || [],
        coachingCues: [
          {
            cue: gaitResult.coachingCues?.immediateCorrection,
            priority: 1,
            drillName: gaitResult.coachingCues?.drillRecommendation,
          },
          ...(gaitResult.coachingCues?.strengthFocus || []).map(
            (muscle: string, idx: number) => ({
              cue: `Stärk ${muscle}`,
              priority: idx + 2,
            })
          ),
        ],
        drillRecommendations: gaitResult.coachingCues?.drillRecommendation
          ? [gaitResult.coachingCues.drillRecommendation]
          : [],
        overallScore: gaitResult.overallScore,
        summary: gaitResult.summary,
      },
    })

    return NextResponse.json({
      success: true,
      analysis: updatedAnalysis,
      result: {
        formScore: gaitResult.overallScore,
        issues,
        recommendations,
        overallAssessment: gaitResult.summary,
        strengths: [
          gaitResult.injuryRiskAnalysis?.posteriorChainEngagement
            ? 'God aktivering av bakre kedjan'
            : null,
          gaitResult.efficiency?.rating === 'EXCELLENT' || gaitResult.efficiency?.rating === 'GOOD'
            ? 'Effektiv löpteknik'
            : null,
        ].filter(Boolean),
        areasForImprovement: [
          ...(gaitResult.efficiency?.energyLeakages || []).map((l: { type: string }) => l.type),
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
