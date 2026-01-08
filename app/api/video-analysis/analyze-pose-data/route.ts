import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import {
  createGoogleGenAIClient,
  generateContent,
  createText,
  getGeminiModelId,
} from '@/lib/ai/google-genai-client'
import { decryptSecret } from '@/lib/crypto/secretbox'

export const maxDuration = 120

const MAX_POSE_PAYLOAD_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_FRAMES = 5000
const MAX_LANDMARKS_PER_FRAME = 60

interface JointAngle {
  name: string
  angle: number
  status: 'good' | 'warning' | 'critical'
}

interface AngleRange {
  name: string
  current: number
  min: number
  max: number
  range: number
  status: 'good' | 'warning' | 'critical'
}

interface PoseFrame {
  timestamp: number
  landmarks: Array<{
    x: number
    y: number
    z: number
    visibility?: number
  }>
}

interface AnalyzePoseDataRequest {
  videoType: 'STRENGTH' | 'RUNNING_GAIT' | 'SPORT_SPECIFIC'
  exerciseName?: string
  exerciseNameSv?: string
  angles: JointAngle[]
  angleRanges?: AngleRange[] // Full min/max/range data across all frames
  frames: PoseFrame[]
  frameCount: number
  cameraAngle?: 'SAGITTAL' | 'FRONTAL' | 'UNKNOWN' // Detected camera viewing angle
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await rateLimitJsonResponse('video:pose-analysis', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const bytes = Number(contentLength)
      if (Number.isFinite(bytes) && bytes > MAX_POSE_PAYLOAD_BYTES) {
        return NextResponse.json(
          { error: 'Payload too large' },
          { status: 413 }
        )
      }
    }

    // Get user's API key
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
      include: { defaultModel: true },
    })

    let googleKey: string | undefined
    if (apiKeys?.googleKeyEncrypted) {
      try {
        googleKey = decryptSecret(apiKeys.googleKeyEncrypted)
      } catch {
        googleKey = undefined
      }
    }

    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google API key not configured. Go to Settings to add your API key.' },
        { status: 400 }
      )
    }

    const body: AnalyzePoseDataRequest = await request.json()
    const { videoType, exerciseName, exerciseNameSv, angles, angleRanges, frames, frameCount, cameraAngle } = body

    if (Array.isArray(frames) && frames.length > MAX_FRAMES) {
      return NextResponse.json(
        { error: `Too many frames (max ${MAX_FRAMES})` },
        { status: 413 }
      )
    }
    if (Array.isArray(frames) && frames.some((f) => Array.isArray(f.landmarks) && f.landmarks.length > MAX_LANDMARKS_PER_FRAME)) {
      return NextResponse.json(
        { error: `Too many landmarks per frame (max ${MAX_LANDMARKS_PER_FRAME})` },
        { status: 413 }
      )
    }

    if (!angles || angles.length === 0) {
      return NextResponse.json(
        { error: 'No pose data provided' },
        { status: 400 }
      )
    }

    // Create Gemini client
    const client = createGoogleGenAIClient(googleKey)

    // Determine model
    let modelId: string
    if (apiKeys?.defaultModel?.provider === 'GOOGLE' && apiKeys?.defaultModel?.modelId) {
      modelId = apiKeys.defaultModel.modelId
    } else {
      modelId = getGeminiModelId('chat')
    }

    // Build context about the exercise
    const exerciseContext = exerciseNameSv || exerciseName || getVideoTypeLabel(videoType)

    // Use angleRanges if available (much better data!), fallback to single-frame angles
    const hasRangeData = angleRanges && angleRanges.length > 0

    // Prepare pose data summary - prefer range data for accuracy
    let angleSummary: string
    let goodCount: number
    let warningCount: number
    let criticalCount: number

    if (hasRangeData) {
      // Use min/max/range data - this shows the FULL motion across all frames
      angleSummary = angleRanges.map(a =>
        `- ${a.name}: Min ${a.min}° / Max ${a.max}° (rörelseomfång: ${a.range}°)`
      ).join('\n')
      goodCount = angleRanges.filter(a => a.status === 'good').length
      warningCount = angleRanges.filter(a => a.status === 'warning').length
      criticalCount = angleRanges.filter(a => a.status === 'critical').length
    } else {
      // Fallback to single-frame data (less accurate)
      angleSummary = angles.map(a =>
        `- ${a.name}: ${a.angle.toFixed(1)}° (${getStatusLabel(a.status)})`
      ).join('\n')
      goodCount = angles.filter(a => a.status === 'good').length
      warningCount = angles.filter(a => a.status === 'warning').length
      criticalCount = angles.filter(a => a.status === 'critical').length
    }

    const totalAngles = hasRangeData ? angleRanges.length : angles.length
    const score = totalAngles > 0 ? Math.round((goodCount / totalAngles) * 100) : 0

    // Sample frame data for pattern analysis (don't send all frames - too much data)
    const sampleFrames = sampleFrameData(frames, 10) // Sample 10 frames

    const prompt = buildAnalysisPrompt({
      exerciseContext,
      videoType,
      angleSummary,
      goodCount,
      warningCount,
      criticalCount,
      score,
      frameCount,
      sampleFrames,
      hasRangeData,
      angleRanges,
      cameraAngle: cameraAngle || 'UNKNOWN',
    })

    logger.debug('Pose data analysis: sending to Gemini', {
      modelId,
      videoType,
      angles: totalAngles,
      frames: frameCount,
      cameraAngle: cameraAngle || 'UNKNOWN',
    })

    // Send to Gemini with increased token limit for detailed JSON response
    const result = await generateContent(
      client,
      modelId,
      [createText(prompt)],
      { maxOutputTokens: 4096 } // Ensure we get complete JSON response
    )

    logger.debug('Pose data analysis: response received', { length: result.text.length })

    // Parse response
    const analysis = parseGeminiResponse(result.text)

    return NextResponse.json({
      success: true,
      analysis: {
        interpretation: analysis.interpretation,
        technicalFeedback: analysis.technicalFeedback,
        patterns: analysis.patterns,
        recommendations: analysis.recommendations,
        overallAssessment: analysis.overallAssessment,
        score: analysis.score ?? score,
      },
      model: modelId,
    })

  } catch (error) {
    logger.error('Pose data analysis error', {}, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

function getVideoTypeLabel(videoType: string): string {
  switch (videoType) {
    case 'RUNNING_GAIT': return 'Löpteknik'
    case 'STRENGTH': return 'Styrkeövning'
    case 'SPORT_SPECIFIC': return 'Sportspecifik rörelse'
    default: return 'Rörelseanalys'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'good': return 'Optimal'
    case 'warning': return 'Behöver uppmärksamhet'
    case 'critical': return 'Kräver korrigering'
    default: return status
  }
}

function sampleFrameData(frames: PoseFrame[], sampleSize: number): string {
  if (frames.length === 0) return 'Ingen frame-data tillgänglig'

  const step = Math.max(1, Math.floor(frames.length / sampleSize))
  const sampledFrames = frames.filter((_, i) => i % step === 0).slice(0, sampleSize)

  // Extract key joint positions for pattern analysis
  // Using MediaPipe BlazePose indices: 23=L_HIP, 24=R_HIP, 25=L_KNEE, 26=R_KNEE, 27=L_ANKLE, 28=R_ANKLE
  const keyJoints = [23, 24, 25, 26, 27, 28, 11, 12] // Hips, knees, ankles, shoulders

  return sampledFrames.map((frame, i) => {
    const keyPositions = keyJoints.map(j => {
      const lm = frame.landmarks[j]
      if (!lm) return null
      return `J${j}:(${lm.x.toFixed(2)},${lm.y.toFixed(2)})`
    }).filter(Boolean).join(' ')
    return `F${i + 1} @${frame.timestamp.toFixed(2)}s: ${keyPositions}`
  }).join('\n')
}

interface PromptParams {
  exerciseContext: string
  videoType: string
  angleSummary: string
  goodCount: number
  warningCount: number
  criticalCount: number
  score: number
  frameCount: number
  sampleFrames: string
  hasRangeData?: boolean
  angleRanges?: AngleRange[]
  cameraAngle?: 'SAGITTAL' | 'FRONTAL' | 'UNKNOWN'
}

function buildAnalysisPrompt(params: PromptParams): string {
  const { exerciseContext, videoType, angleSummary, goodCount, warningCount, criticalCount, score, frameCount, sampleFrames, hasRangeData, angleRanges, cameraAngle } = params

  // Build asymmetry analysis for running gait
  let asymmetryNote = ''
  if (hasRangeData && angleRanges && videoType === 'RUNNING_GAIT') {
    // Find left/right pairs and compare their ranges
    const leftKnee = angleRanges.find(a => a.name.includes('vänster') && a.name.toLowerCase().includes('knä'))
    const rightKnee = angleRanges.find(a => a.name.includes('höger') && a.name.toLowerCase().includes('knä'))
    const leftArm = angleRanges.find(a => a.name.includes('vänster') && a.name.toLowerCase().includes('arm'))
    const rightArm = angleRanges.find(a => a.name.includes('höger') && a.name.toLowerCase().includes('arm'))

    const comparisons: string[] = []
    if (leftKnee && rightKnee) {
      const kneeDiff = Math.abs(leftKnee.range - rightKnee.range)
      const kneeAsymmetry = Math.round((kneeDiff / Math.max(leftKnee.range, rightKnee.range)) * 100)
      comparisons.push(`Knälyft: Vänster ${leftKnee.min}°-${leftKnee.max}° vs Höger ${rightKnee.min}°-${rightKnee.max}° (${kneeAsymmetry}% skillnad i rörelseomfång)`)
    }
    if (leftArm && rightArm) {
      const armDiff = Math.abs(leftArm.range - rightArm.range)
      const armAsymmetry = Math.round((armDiff / Math.max(leftArm.range, rightArm.range)) * 100)
      comparisons.push(`Armsving: Vänster ${leftArm.min}°-${leftArm.max}° vs Höger ${rightArm.min}°-${rightArm.max}° (${armAsymmetry}% skillnad)`)
    }
    if (comparisons.length > 0) {
      asymmetryNote = `\n\n## Asymmetrianalys (höger vs vänster)\n${comparisons.join('\n')}`
    }
  }

  const dataTypeExplanation = hasRangeData
    ? `\n\n**VIKTIGT**: Data nedan visar MIN/MAX-värden över HELA videosekvensen (${frameCount} frames), inte en enskild bildruta. Detta ger en komplett bild av löparens rörelseomfång genom hela löpcykeln.`
    : `\n\n**OBS**: Data nedan är från en enskild bildruta. För mer tillförlitlig analys behövs min/max-intervall över hela videon.`

  return `Du är en expert på biomekanisk analys och rörelseteknik. Analysera följande data från en MediaPipe skelettspårningsanalys.

## Kontext
- Övning/Rörelse: ${exerciseContext}
- Typ: ${videoType === 'RUNNING_GAIT' ? 'Löpteknik' : videoType === 'STRENGTH' ? 'Styrkeövning' : 'Sportspecifik rörelse'}
- Antal analyserade frames: ${frameCount}
${dataTypeExplanation}

## ${hasRangeData ? 'Ledvinklar - Rörelseomfång (Min/Max över hela videon)' : 'Uppmätta ledvinklar'}
${angleSummary}
${asymmetryNote}

## Samplade frame-positioner (nyckelpositioner)
${sampleFrames}

---

${hasRangeData && videoType === 'RUNNING_GAIT' ? `
**KAMERAVINKEL: ${cameraAngle === 'FRONTAL' ? 'FRAMIFRÅN/BAKIFRÅN (Frontalplan)' : cameraAngle === 'SAGITTAL' ? 'FRÅN SIDAN (Sagittalplan)' : 'OKÄND'}**

${cameraAngle === 'FRONTAL' ? `
**VIKTIGT - FRONTALPLANSANALYS:**
Detta är en video tagen FRAMIFRÅN eller BAKIFRÅN. Vinkeldata reflekterar mätningar i FRONTALPLANET.
- ❌ Knälyft, höftflexion/extension och bållutning framåt kan INTE mätas korrekt från denna vinkel
- ✅ Fokusera istället på: bäckenstabilitet, knävalgus/varus, lateral sväng, armkorsning

**REFERENSVÄRDEN FÖR FRONTALPLAN (fram-/bakvy):**
- Bäckentippning (sidovinkel): 0-8° (liten skillnad = bra stabilitet)
- Överkroppssväng (sidled): 0-15% av höftbredd (låg = effektivt)
- Knästabilitet: 0-30 (lågt värde = knä håller linje, högt = valgus/inåtvridning)
- Armkorsning: 0-50% (armar ska inte korsa mittlinjen för mycket)
- Armbågsvinkel: 70-120° (kompakt armsving)

**VAD ATT ANALYSERA:**
- Bäckenstabilitet: Jämna höfter = stark glutes medius
- Knävalgus: Knä som faller inåt = risk för löparknä, behöver stärka glutes
- Lateral sväng: Överdriven sidorörelse i överkropp = slöseri med energi
- Armkorsning: Armar som korsar mittlinjen = rotation istället för framdrift
` : `
**ANALYSERA LÖPTEKNIK BASERAT PÅ SIDOVY (SAGITTALPLAN):**
- För löpning är det NORMALT att vänster och höger sida visar olika värden vid en given tidpunkt (en fot i luften, en på marken)
- Bedöm SYMMETRI genom att jämföra MIN/MAX-intervallen för höger och vänster sida - liknande intervall = symmetrisk löpstil
- Rörelseomfång (range) är viktigare än enskilda momentanvärden

**TYPISKA REFERENSVÄRDEN FÖR SIDOVY:**
- Knälyft: 30-90° (högre = bättre knädrive)
- Höftvinkel: 140-180° (lägre vid frånskjut = bättre extension, högre vid swing = bättre flexion)
- Fotvinkel: 80-130° (dorsiflexion, indikerar fotisättning och ankelstyvhet)
- Bålvinkel: 5-20° framåtlutning (lätt framåtlutning är optimalt)
- Armsving: 70-110° (runt 90° är idealt)

**VIKTIGT ATT ANALYSERA:**
- Höftextension: Litet höftvinkel-minimum indikerar bra frånskjut
- Fotisättning: Fotvinkel vid markkontakt indikerar hälisättare vs framfotsisättare
- Bålvinkel: För upprätt (<5°) = ineffektiv, för mycket (>20°) = överdriven lutning
`}
` : ''}

Ge en detaljerad analys på SVENSKA med följande struktur. Svara i JSON-format:

{
  "interpretation": "Övergripande tolkning av rörelsedata (2-3 meningar). ${hasRangeData ? 'Basera på MIN/MAX-intervallen, inte enskilda värden.' : ''}",
  "technicalFeedback": [
    {
      "area": "Område (t.ex. Knävinkel, Höftflexion)",
      "observation": "Vad data visar - ${hasRangeData ? 'referera till min/max-intervall och rörelseomfång' : 'vad mätningen visar'}",
      "impact": "Hur detta påverkar prestanda/skaderisk",
      "suggestion": "Konkret förslag för förbättring"
    }
  ],
  "patterns": [
    {
      "pattern": "Identifierat mönster",
      "significance": "Varför detta är viktigt"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "title": "Kort titel",
      "description": "Detaljerad beskrivning av rekommendation",
      "exercises": ["Specifik övning 1", "Specifik övning 2"]
    }
  ],
  "overallAssessment": "Sammanfattande bedömning (1-2 meningar)",
  "score": <poäng 0-100 baserat på rörelseomfång och symmetri>
}

Fokusera på:
${videoType === 'RUNNING_GAIT' && cameraAngle === 'FRONTAL' ? `
1. Bäckenstabilitet och höftdropp (glutes medius styrka)
2. Knästabilitet och valgus/varus (knä inåt = risk för löparknä)
3. Lateral sväng i överkropp (slösar energi om överdriven)
4. Armkorsning och axelspänning
5. Praktiska styrkeövningar för gluteus medius och fotledsstabilitet
` : videoType === 'RUNNING_GAIT' ? `
1. Löpekonomi: höftextension vid frånskjut, fotisättning, bålhållning och armsving
2. ${hasRangeData ? 'Jämför MIN/MAX-intervallen mellan höger och vänster sida för att bedöma symmetri' : 'Asymmetrier mellan höger/vänster sida'}
3. Höftvinkel och fotvinkel för att identifiera överstriding eller ineffektiv frånskjut
4. Praktiska, genomförbara förbättringsförslag med specifika övningar
` : `
1. Korrekt form, kontroll, stabilitet, progressionsmöjligheter
2. ${hasRangeData ? 'Jämför MIN/MAX-intervallen mellan höger och vänster sida för att bedöma symmetri' : 'Asymmetrier mellan höger/vänster sida'}
3. Potentiella skaderisker baserat på rörelsemönster
4. Praktiska, genomförbara förbättringsförslag med specifika övningar
`}

Svara ENDAST med JSON-objektet, ingen annan text.`
}

interface GeminiAnalysis {
  interpretation: string
  technicalFeedback: Array<{
    area: string
    observation: string
    impact: string
    suggestion: string
  }>
  patterns: Array<{
    pattern: string
    significance: string
  }>
  recommendations: Array<{
    priority: number
    title: string
    description: string
    exercises: string[]
  }>
  overallAssessment: string
  score?: number
}

function parseGeminiResponse(response: string): GeminiAnalysis {
  // Try to extract JSON from the response
  let jsonStr = response.trim()

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7)
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3)
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3)
  }
  jsonStr = jsonStr.trim()

  // Try to find JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    jsonStr = jsonMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      interpretation: parsed.interpretation || 'Ingen tolkning tillgänglig',
      technicalFeedback: parsed.technicalFeedback || [],
      patterns: parsed.patterns || [],
      recommendations: parsed.recommendations || [],
      overallAssessment: parsed.overallAssessment || 'Ingen bedömning tillgänglig',
      score: parsed.score,
    }
  } catch (error) {
    logger.warn(
      'Pose data analysis: failed to parse JSON response',
      { responseLength: response.length },
      error
    )

    // Try to extract partial data from truncated JSON
    const interpretationMatch = response.match(/"interpretation"\s*:\s*"([^"]+)"/)
    const scoreMatch = response.match(/"score"\s*:\s*(\d+)/)

    // Don't show raw JSON to user - provide a helpful fallback message
    return {
      interpretation: interpretationMatch
        ? interpretationMatch[1]
        : 'AI-analysen kunde inte slutföras helt. Svaret var ofullständigt. Vänligen försök igen.',
      technicalFeedback: [],
      patterns: [],
      recommendations: [],
      overallAssessment: interpretationMatch
        ? 'Endast partiell analys kunde hämtas. Kör analysen igen för fullständiga rekommendationer.'
        : 'Kunde inte tolka AI-svaret. Försök igen.',
      score: scoreMatch ? parseInt(scoreMatch[1], 10) : undefined,
    }
  }
}
