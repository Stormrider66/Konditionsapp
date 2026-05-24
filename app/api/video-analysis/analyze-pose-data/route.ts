import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import {
  createGoogleGenAIClient,
  generateContent,
  createText,
  getGeminiModelId,
} from '@/lib/ai/google-genai-client'
import { withAiContext } from '@/lib/ai/usage-logger'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { AI_ALLOWANCE_MINIMUM_REMAINING_SEK, requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import type { SquatJumpPowerEstimate } from '@/lib/video-analysis/squat-jump-power'

export const maxDuration = 120

const MAX_POSE_PAYLOAD_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_FRAMES = 5000
const MAX_LANDMARKS_PER_FRAME = 60
type AppLocale = 'en' | 'sv'

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
  clientId?: string
  videoType: 'STRENGTH' | 'RUNNING_GAIT' | 'SPORT_SPECIFIC'
  exerciseName?: string
  exerciseNameSv?: string
  angles: JointAngle[]
  angleRanges?: AngleRange[] // Full min/max/range data across all frames
  frames: PoseFrame[]
  frameCount: number
  cameraAngle?: 'SAGITTAL' | 'FRONTAL' | 'UNKNOWN' // Detected camera viewing angle
  powerEstimate?: SquatJumpPowerEstimate | null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
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

    const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'
    const body: AnalyzePoseDataRequest = await request.json()
    const { clientId, videoType, exerciseName, exerciseNameSv, angles, angleRanges, frames, frameCount, cameraAngle, powerEstimate } = body

    if (clientId) {
      const hasAccess = await canAccessClient(user.id, clientId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Client not found or access denied' },
          { status: 404 }
        )
      }

      const allowanceDenied = await requireAiAllowance(clientId, {
        minimumRemainingSek: AI_ALLOWANCE_MINIMUM_REMAINING_SEK.richAnalysis,
      })
      if (allowanceDenied) return allowanceDenied
    }

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

    // Get user's API key (with fallback to business keys / platform admin)
    const resolvedKeys = await getResolvedAiKeys(user.id)
    const googleKey = resolvedKeys.googleKey

    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google API key not configured. Go to Settings to add your API key.' },
        { status: 400 }
      )
    }

    // Create Gemini client
    const client = createGoogleGenAIClient(googleKey)

    // Determine model
    const modelId = getGeminiModelId('chat')

    // Build context about the exercise
    const exerciseContext = (locale === 'sv' ? exerciseNameSv || exerciseName : exerciseName || exerciseNameSv) || getVideoTypeLabel(videoType, locale)

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
        `- ${a.name}: Min ${a.min}° / Max ${a.max}° (${locale === 'sv' ? 'rörelseomfång' : 'range of motion'}: ${a.range}°)`
      ).join('\n')
      goodCount = angleRanges.filter(a => a.status === 'good').length
      warningCount = angleRanges.filter(a => a.status === 'warning').length
      criticalCount = angleRanges.filter(a => a.status === 'critical').length
    } else {
      // Fallback to single-frame data (less accurate)
      angleSummary = angles.map(a =>
        `- ${a.name}: ${a.angle.toFixed(1)}° (${getStatusLabel(a.status, locale)})`
      ).join('\n')
      goodCount = angles.filter(a => a.status === 'good').length
      warningCount = angles.filter(a => a.status === 'warning').length
      criticalCount = angles.filter(a => a.status === 'critical').length
    }

    const totalAngles = hasRangeData ? angleRanges.length : angles.length
    const score = totalAngles > 0 ? Math.round((goodCount / totalAngles) * 100) : 0

    // Sample frame data for pattern analysis (don't send all frames - too much data)
    const sampleFrames = sampleFrameData(frames, 10, locale) // Sample 10 frames

    const prompt = buildAnalysisPrompt({
      locale,
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
      powerEstimate: powerEstimate || null,
    })

    logger.debug('Pose data analysis: sending to Gemini', {
      modelId,
      videoType,
      angles: totalAngles,
      frames: frameCount,
      cameraAngle: cameraAngle || 'UNKNOWN',
    })

    // Send to Gemini with increased token limit for detailed JSON response
    const result = await withAiContext(
      { userId: user.id, clientId, category: 'video_pose_analysis' },
      () => generateContent(
        client,
        modelId,
        [createText(prompt)],
        { maxOutputTokens: 4096 } // Ensure we get complete JSON response
      )
    )

    logger.debug('Pose data analysis: response received', { length: result.text.length })

    // Parse response
    const analysis = parseGeminiResponse(result.text, locale)

    return NextResponse.json({
      success: true,
      analysis: {
        interpretation: analysis.interpretation,
        technicalFeedback: analysis.technicalFeedback,
        patterns: analysis.patterns,
        recommendations: analysis.recommendations,
        overallAssessment: analysis.overallAssessment,
        score: analysis.score ?? score,
        ...(powerEstimate ? { powerEstimate } : {}),
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

function getVideoTypeLabel(videoType: string, locale: AppLocale = 'en'): string {
  if (locale === 'sv') {
    switch (videoType) {
      case 'RUNNING_GAIT': return 'Löpteknik'
      case 'STRENGTH': return 'Styrkeövning'
      case 'SPORT_SPECIFIC': return 'Sportspecifik rörelse'
      default: return 'Rörelseanalys'
    }
  }
  switch (videoType) {
    case 'RUNNING_GAIT': return 'Running gait'
    case 'STRENGTH': return 'Strength exercise'
    case 'SPORT_SPECIFIC': return 'Sport-specific movement'
    default: return 'Movement analysis'
  }
}

function getStatusLabel(status: string, locale: AppLocale = 'en'): string {
  if (locale === 'sv') {
    switch (status) {
      case 'good': return 'Optimal'
      case 'warning': return 'Behöver uppmärksamhet'
      case 'critical': return 'Kräver korrigering'
      default: return status
    }
  }
  switch (status) {
    case 'good': return 'Optimal'
    case 'warning': return 'Needs attention'
    case 'critical': return 'Requires correction'
    default: return status
  }
}

function sampleFrameData(frames: PoseFrame[], sampleSize: number, locale: AppLocale = 'en'): string {
  if (frames.length === 0) return locale === 'sv' ? 'Ingen frame-data tillgänglig' : 'No frame data available'

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
  locale: AppLocale
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
  powerEstimate?: SquatJumpPowerEstimate | null
}

function buildAnalysisPrompt(params: PromptParams): string {
  const { locale, exerciseContext, videoType, angleSummary, frameCount, sampleFrames, hasRangeData, angleRanges, cameraAngle, powerEstimate } = params

  // Build asymmetry analysis for running gait
  let asymmetryNote = ''
  if (hasRangeData && angleRanges && videoType === 'RUNNING_GAIT') {
    // Find left/right pairs and compare their ranges
    const includesAny = (value: string, terms: string[]) => terms.some((term) => value.toLowerCase().includes(term))
    const leftKnee = angleRanges.find(a => includesAny(a.name, ['left', 'vänster']) && includesAny(a.name, ['knee', 'knä']))
    const rightKnee = angleRanges.find(a => includesAny(a.name, ['right', 'höger']) && includesAny(a.name, ['knee', 'knä']))
    const leftArm = angleRanges.find(a => includesAny(a.name, ['left', 'vänster']) && includesAny(a.name, ['arm']))
    const rightArm = angleRanges.find(a => includesAny(a.name, ['right', 'höger']) && includesAny(a.name, ['arm']))

    const comparisons: string[] = []
    if (leftKnee && rightKnee) {
      const kneeDiff = Math.abs(leftKnee.range - rightKnee.range)
      const kneeAsymmetry = Math.round((kneeDiff / Math.max(leftKnee.range, rightKnee.range)) * 100)
      comparisons.push(locale === 'sv'
        ? `Knälyft: Vänster ${leftKnee.min}°-${leftKnee.max}° vs Höger ${rightKnee.min}°-${rightKnee.max}° (${kneeAsymmetry}% skillnad i rörelseomfång)`
        : `Knee lift: Left ${leftKnee.min}°-${leftKnee.max}° vs Right ${rightKnee.min}°-${rightKnee.max}° (${kneeAsymmetry}% range-of-motion difference)`)
    }
    if (leftArm && rightArm) {
      const armDiff = Math.abs(leftArm.range - rightArm.range)
      const armAsymmetry = Math.round((armDiff / Math.max(leftArm.range, rightArm.range)) * 100)
      comparisons.push(locale === 'sv'
        ? `Armsving: Vänster ${leftArm.min}°-${leftArm.max}° vs Höger ${rightArm.min}°-${rightArm.max}° (${armAsymmetry}% skillnad)`
        : `Arm swing: Left ${leftArm.min}°-${leftArm.max}° vs Right ${rightArm.min}°-${rightArm.max}° (${armAsymmetry}% difference)`)
    }
    if (comparisons.length > 0) {
      asymmetryNote = locale === 'sv'
        ? `\n\n## Asymmetrianalys (höger vs vänster)\n${comparisons.join('\n')}`
        : `\n\n## Asymmetry analysis (right vs left)\n${comparisons.join('\n')}`
    }
  }

  const dataTypeExplanation = hasRangeData
    ? locale === 'sv'
      ? `\n\n**VIKTIGT**: Data nedan visar MIN/MAX-värden över HELA videosekvensen (${frameCount} frames), inte en enskild bildruta. Detta ger en komplett bild av löparens rörelseomfång genom hela löpcykeln.`
      : `\n\n**IMPORTANT**: The data below shows MIN/MAX values across the ENTIRE video sequence (${frameCount} frames), not a single frame. This gives a complete view of the athlete's range of motion through the full movement cycle.`
    : locale === 'sv'
      ? `\n\n**OBS**: Data nedan är från en enskild bildruta. För mer tillförlitlig analys behövs min/max-intervall över hela videon.`
      : `\n\n**NOTE**: The data below comes from a single frame. For a more reliable analysis, min/max ranges across the full video are needed.`

  const powerEstimateSummary = formatPowerEstimateForPrompt(powerEstimate, locale)

  if (locale === 'en') {
    return `You are an expert in biomechanical analysis and movement technique. Analyze the following data from a MediaPipe skeleton-tracking analysis.

## Context
- Exercise/Movement: ${exerciseContext}
- Type: ${videoType === 'RUNNING_GAIT' ? 'Running gait' : videoType === 'STRENGTH' ? 'Strength exercise' : 'Sport-specific movement'}
- Analyzed frames: ${frameCount}
${dataTypeExplanation}

## ${hasRangeData ? 'Joint angles - range of motion (min/max across the full video)' : 'Measured joint angles'}
${angleSummary}
${asymmetryNote}

## Sampled frame positions (key positions)
${sampleFrames}
${powerEstimateSummary}

---

${hasRangeData && videoType === 'RUNNING_GAIT' ? `
**CAMERA ANGLE: ${cameraAngle === 'FRONTAL' ? 'FRONT/REAR VIEW (frontal plane)' : cameraAngle === 'SAGITTAL' ? 'SIDE VIEW (sagittal plane)' : 'UNKNOWN'}**

${cameraAngle === 'FRONTAL' ? `
**IMPORTANT - FRONTAL PLANE ANALYSIS:**
This video is captured from the front or rear. Angle data reflects measurements in the FRONTAL PLANE.
- Knee lift, hip flexion/extension, and forward trunk lean CANNOT be measured correctly from this angle
- Focus instead on: pelvic stability, knee valgus/varus, lateral sway, arm crossover

**REFERENCE VALUES FOR FRONTAL PLANE (front/rear view):**
- Pelvic drop/tilt (side angle): 0-8° (small difference = good stability)
- Upper-body lateral sway: 0-15% of hip width (lower = more efficient)
- Knee stability: 0-30 (lower value = knee tracks well, higher = valgus/internal rotation)
- Arm crossover: 0-50% (arms should not cross the midline excessively)
- Elbow angle: 70-120° (compact arm swing)

**WHAT TO ANALYZE:**
- Pelvic stability: level hips = strong gluteus medius
- Knee valgus: knee falling inward = runner's knee risk, needs glute strengthening
- Lateral sway: excessive side-to-side upper-body motion = wasted energy
- Arm crossover: arms crossing the midline = rotation instead of forward drive
` : `
**ANALYZE RUNNING GAIT FROM SIDE VIEW (SAGITTAL PLANE):**
- In running, it is NORMAL for left and right sides to show different values at a given moment (one foot airborne, one on the ground)
- Assess SYMMETRY by comparing the MIN/MAX intervals for right and left sides; similar intervals indicate a more symmetrical gait
- Range of motion is more important than individual instant values

**TYPICAL REFERENCE VALUES FOR SIDE VIEW:**
- Knee lift: 30-90° (higher = better knee drive)
- Hip angle: 140-180° (lower during push-off = better extension, higher during swing = better flexion)
- Foot angle: 80-130° (dorsiflexion, indicates foot strike and ankle stiffness)
- Trunk angle: 5-20° forward lean (slight forward lean is optimal)
- Arm swing: 70-110° (around 90° is ideal)

**IMPORTANT TO ANALYZE:**
- Hip extension: low hip-angle minimum indicates good push-off
- Foot strike: foot angle at ground contact indicates heel strike vs forefoot strike
- Trunk angle: too upright (<5°) = inefficient, too much (>20°) = excessive lean
`}
` : ''}

Give a detailed analysis in ENGLISH using the following structure. Respond in JSON format:

{
  "interpretation": "Overall interpretation of the movement data (2-3 sentences). ${hasRangeData ? 'Base it on the MIN/MAX intervals, not single values.' : ''}",
  "technicalFeedback": [
    {
      "area": "Area (for example: knee angle, hip flexion)",
      "observation": "What the data shows - ${hasRangeData ? 'refer to min/max intervals and range of motion' : 'what the measurement shows'}",
      "impact": "How this affects performance/injury risk",
      "suggestion": "Concrete improvement suggestion"
    }
  ],
  "patterns": [
    {
      "pattern": "Identified pattern",
      "significance": "Why this matters"
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "title": "Short title",
      "description": "Detailed recommendation description",
      "exercises": ["Specific exercise 1", "Specific exercise 2"]
    }
  ],
  "overallAssessment": "Summary assessment (1-2 sentences)",
  "score": <score 0-100 based on range of motion and symmetry>
}

Focus on:
${videoType === 'RUNNING_GAIT' && cameraAngle === 'FRONTAL' ? `
1. Pelvic stability and hip drop (gluteus medius strength)
2. Knee stability and valgus/varus (inward knee movement = runner's knee risk)
3. Lateral upper-body sway (wastes energy if excessive)
4. Arm crossover and shoulder tension
5. Practical strength exercises for gluteus medius and ankle stability
` : videoType === 'RUNNING_GAIT' ? `
1. Running economy: hip extension during push-off, foot strike, trunk posture, and arm swing
2. ${hasRangeData ? 'Compare MIN/MAX intervals between right and left sides to assess symmetry' : 'Asymmetries between right and left sides'}
3. Hip angle and foot angle to identify overstriding or inefficient push-off
4. Practical, achievable improvement suggestions with specific exercises
` : `
1. Correct form, control, stability, and progression opportunities
2. ${hasRangeData ? 'Compare MIN/MAX intervals between right and left sides to assess symmetry' : 'Asymmetries between right and left sides'}
3. Potential injury risks based on movement patterns
4. ${powerEstimateSummary ? 'Interpret the provided jump power estimate as approximate video-derived data; do not recalculate watts.' : 'Practical, achievable improvement suggestions with specific exercises'}
`}

Respond ONLY with the JSON object and no other text.`
  }

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
${powerEstimateSummary}

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
4. ${powerEstimateSummary ? 'Tolka den bifogade effektuppskattningen som ungefärlig videodata; räkna inte om watt.' : 'Praktiska, genomförbara förbättringsförslag med specifika övningar'}
`}

Svara ENDAST med JSON-objektet, ingen annan text.`
}

function formatPowerEstimateForPrompt(estimate: SquatJumpPowerEstimate | null | undefined, locale: AppLocale): string {
  if (!estimate) return ''

  if (estimate.status !== 'ready' || !estimate.metrics) {
    const warningText = estimate.warnings.map((item) => item.message).join('; ')
    return locale === 'sv'
      ? `\n\n## Squat jump / jump squat-effekt\nIngen tillförlitlig effektuppskattning kunde beräknas. Varningar: ${warningText || 'saknas'}.`
      : `\n\n## Squat jump / jump squat power\nNo reliable power estimate could be calculated. Warnings: ${warningText || 'none'}.`
  }

  const metrics = estimate.metrics
  const lines = [
    locale === 'sv' ? '## Squat jump / jump squat-effekt' : '## Squat jump / jump squat power',
    locale === 'sv'
      ? `- Metod: videobaserad flygtid + COM-proxy (${estimate.confidence}, ${estimate.confidenceScore}/100)`
      : `- Method: video-derived flight time + COM proxy (${estimate.confidence}, ${estimate.confidenceScore}/100)`,
    locale === 'sv'
      ? `- Rörelse: ${estimate.movement === 'LOADED_JUMP_SQUAT' ? 'lastad jump squat' : 'squat jump'}`
      : `- Movement: ${estimate.movement === 'LOADED_JUMP_SQUAT' ? 'loaded jump squat' : 'squat jump'}`,
    locale === 'sv'
      ? `- Hopphöjd: ${metrics.jumpHeightCm} cm; flygtid: ${metrics.flightTimeMs} ms; takeoff: ${metrics.takeoffVelocityMps} m/s`
      : `- Jump height: ${metrics.jumpHeightCm} cm; flight time: ${metrics.flightTimeMs} ms; takeoff: ${metrics.takeoffVelocityMps} m/s`,
  ]

  if (metrics.estimatedMeanPowerW) {
    lines.push(locale === 'sv'
      ? `- Uppskattad medeleffekt: ${metrics.estimatedMeanPowerW} W${metrics.relativePeakPowerWPerKg ? ` (${metrics.relativePeakPowerWPerKg} W/kg)` : ''}`
      : `- Estimated mean power: ${metrics.estimatedMeanPowerW} W${metrics.relativePeakPowerWPerKg ? ` (${metrics.relativePeakPowerWPerKg} W/kg)` : ''}`)
  }

  if (metrics.concentricDurationMs) {
    lines.push(locale === 'sv'
      ? `- Koncentrisk fas: ${metrics.concentricDurationMs} ms${metrics.concentricDisplacementCm ? `, ca ${metrics.concentricDisplacementCm} cm` : ''}`
      : `- Concentric phase: ${metrics.concentricDurationMs} ms${metrics.concentricDisplacementCm ? `, approx ${metrics.concentricDisplacementCm} cm` : ''}`)
  }

  const warningText = estimate.warnings.map((item) => item.message).join('; ')
  if (warningText) {
    lines.push(locale === 'sv'
      ? `- Tolkningsvarningar: ${warningText}`
      : `- Interpretation warnings: ${warningText}`)
  }

  return `\n\n${lines.join('\n')}`
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

function parseGeminiResponse(response: string, locale: AppLocale = 'en'): GeminiAnalysis {
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
      interpretation: parsed.interpretation || (locale === 'sv' ? 'Ingen tolkning tillgänglig' : 'No interpretation available'),
      technicalFeedback: parsed.technicalFeedback || [],
      patterns: parsed.patterns || [],
      recommendations: parsed.recommendations || [],
      overallAssessment: parsed.overallAssessment || (locale === 'sv' ? 'Ingen bedömning tillgänglig' : 'No assessment available'),
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
        : locale === 'sv'
          ? 'AI-analysen kunde inte slutföras helt. Svaret var ofullständigt. Vänligen försök igen.'
          : 'The AI analysis could not be completed. The response was incomplete. Please try again.',
      technicalFeedback: [],
      patterns: [],
      recommendations: [],
      overallAssessment: interpretationMatch
        ? locale === 'sv'
          ? 'Endast partiell analys kunde hämtas. Kör analysen igen för fullständiga rekommendationer.'
          : 'Only a partial analysis could be retrieved. Run the analysis again for complete recommendations.'
        : locale === 'sv'
          ? 'Kunde inte tolka AI-svaret. Försök igen.'
          : 'Could not parse the AI response. Please try again.',
      score: scoreMatch ? parseInt(scoreMatch[1], 10) : undefined,
    }
  }
}
