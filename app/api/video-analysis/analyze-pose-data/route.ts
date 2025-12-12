import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  createGoogleGenAIClient,
  generateContent,
  createText,
  getGeminiModelId,
} from '@/lib/ai/google-genai-client'
import { decryptSecret } from '@/lib/crypto/secretbox'

interface JointAngle {
  name: string
  angle: number
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
  frames: PoseFrame[]
  frameCount: number
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { videoType, exerciseName, exerciseNameSv, angles, frames, frameCount } = body

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

    // Prepare pose data summary
    const angleSummary = angles.map(a =>
      `- ${a.name}: ${a.angle.toFixed(1)}° (${getStatusLabel(a.status)})`
    ).join('\n')

    // Calculate statistics from angles
    const goodCount = angles.filter(a => a.status === 'good').length
    const warningCount = angles.filter(a => a.status === 'warning').length
    const criticalCount = angles.filter(a => a.status === 'critical').length
    const totalAngles = angles.length
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
    })

    console.log(`[Pose Data Analysis] Sending to ${modelId} for analysis...`)
    console.log(`[Pose Data Analysis] Exercise: ${exerciseContext}, Angles: ${totalAngles}, Frames: ${frameCount}`)

    // Send to Gemini
    const result = await generateContent(
      client,
      modelId,
      [createText(prompt)]
    )

    console.log(`[Pose Data Analysis] Response received, length: ${result.text.length} chars`)

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
    console.error('[Pose Data Analysis] Error:', error)
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
}

function buildAnalysisPrompt(params: PromptParams): string {
  const { exerciseContext, videoType, angleSummary, goodCount, warningCount, criticalCount, score, frameCount, sampleFrames } = params

  return `Du är en expert på biomekanisk analys och rörelseteknik. Analysera följande data från en MediaPipe skelettspårningsanalys.

## Kontext
- Övning/Rörelse: ${exerciseContext}
- Typ: ${videoType === 'RUNNING_GAIT' ? 'Löpteknik' : videoType === 'STRENGTH' ? 'Styrkeövning' : 'Sportspecifik rörelse'}
- Antal analyserade frames: ${frameCount}

## Uppmätta ledvinklar (genomsnitt)
${angleSummary}

## Sammanfattning
- Optimala vinklar: ${goodCount}
- Varningar: ${warningCount}
- Kritiska avvikelser: ${criticalCount}
- Poäng baserat på MediaPipe: ${score}%

## Samplade frame-positioner (nyckelpositioner)
${sampleFrames}

---

Ge en detaljerad analys på SVENSKA med följande struktur. Svara i JSON-format:

{
  "interpretation": "Övergripande tolkning av rörelsedata (2-3 meningar)",
  "technicalFeedback": [
    {
      "area": "Område (t.ex. Knävinkel, Höftflexion)",
      "observation": "Vad data visar",
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
  "score": 75
}

Fokusera på:
1. ${videoType === 'RUNNING_GAIT' ? 'Löpekonomi, fotisättning, kadensoptimering, höftextension' : 'Korrekt form, kontroll, stabilitet, progressionsmöjligheter'}
2. Asymmetrier mellan höger/vänster sida
3. Potentiella skaderisker baserat på vinklarna
4. Praktiska, genomförbara förbättringsförslag

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
  } catch {
    console.error('[Pose Data Analysis] Failed to parse JSON, returning raw response')
    return {
      interpretation: response.slice(0, 500),
      technicalFeedback: [],
      patterns: [],
      recommendations: [],
      overallAssessment: 'Kunde inte tolka AI-svaret strukturerat',
      score: undefined,
    }
  }
}
