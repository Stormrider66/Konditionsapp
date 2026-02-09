/**
 * Ad-Hoc Workout Processing API
 *
 * POST /api/adhoc-workouts/[id]/process - Trigger AI parsing of the workout
 *
 * Uses the athlete's preferred AI model to parse the workout input.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  createGoogleGenAIClient,
  generateContent,
  fetchAsBase64,
  createInlineData,
  createText,
} from '@/lib/ai/google-genai-client'
import { getModelById, getDefaultModel } from '@/types/ai-models'
import { decryptSecret } from '@/lib/crypto/secretbox'
import {
  getExerciseLibrary,
  buildTextParsingPrompt,
  buildImageParsingPrompt,
  buildVoiceParsingPrompt,
  buildTranscriptionPrompt,
} from '@/lib/adhoc-workout'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { matchExercise } from '@/lib/adhoc-workout/exercise-matcher'
import { logger } from '@/lib/logger'
import { downloadAsBase64 } from '@/lib/storage/supabase-storage-server'
import { isHttpUrl, normalizeStoragePath } from '@/lib/storage/supabase-storage'

export const maxDuration = 120

// ============================================
// POST - Process Ad-Hoc Workout
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId, isCoachInAthleteMode, user } = resolved

    // Get client info for coach's API keys
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        userId: true, // Coach's user ID
        sportProfile: {
          select: { preferredAIModelId: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Athlete account not found' },
        { status: 400 }
      )
    }

    const coachId = isCoachInAthleteMode ? user.id : client.userId

    // Get the ad-hoc workout
    const adHocWorkout = await prisma.adHocWorkout.findUnique({
      where: { id },
    })

    if (!adHocWorkout) {
      return NextResponse.json(
        { success: false, error: 'Ad-hoc workout not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (adHocWorkout.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if already processed successfully
    if (adHocWorkout.status === 'READY_FOR_REVIEW' || adHocWorkout.status === 'CONFIRMED') {
      return NextResponse.json({
        success: true,
        data: {
          id: adHocWorkout.id,
          status: adHocWorkout.status,
          parsedStructure: adHocWorkout.parsedStructure,
        },
        message: 'Already processed',
      })
    }

    // Get coach's API keys
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: coachId },
      select: {
        googleKeyEncrypted: true,
        googleKeyValid: true,
        anthropicKeyValid: true,
        openaiKeyValid: true,
      },
    })

    if (!apiKeys?.googleKeyValid) {
      return NextResponse.json(
        { success: false, error: 'Google API key not configured. Coach must add API key in settings.' },
        { status: 400 }
      )
    }

    // Decrypt API key
    let googleKey: string
    try {
      googleKey = decryptSecret(apiKeys.googleKeyEncrypted!)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to decrypt API key' },
        { status: 500 }
      )
    }

    // Determine which model to use
    let modelId = 'gemini-3-flash-preview'
    let modelDisplayName = 'Gemini 3 Flash'

    // Priority 1: Athlete's preferred model (if Google)
    const athletePreferredModelId = client.sportProfile?.preferredAIModelId
    if (athletePreferredModelId) {
      const preferredModel = getModelById(athletePreferredModelId)
      if (preferredModel && preferredModel.provider === 'google' && apiKeys.googleKeyValid) {
        modelId = preferredModel.modelId
        modelDisplayName = preferredModel.name
      }
    }

    // Update status to processing
    await prisma.adHocWorkout.update({
      where: { id },
      data: { status: 'PROCESSING' },
    })

    const startTime = Date.now()

    try {
      // Create Google GenAI client
      const client = createGoogleGenAIClient(googleKey)

      // Get exercise library for matching
      const exerciseLibrary = await getExerciseLibrary()

      let parsedWorkout: ParsedWorkout

      // Process based on input type
      switch (adHocWorkout.inputType) {
        case 'TEXT':
        case 'MANUAL_FORM': {
          if (!adHocWorkout.rawInputText) {
            throw new Error('No text input provided')
          }
          parsedWorkout = await parseFromText(
            client,
            modelId,
            adHocWorkout.rawInputText,
            exerciseLibrary
          )
          break
        }

        case 'PHOTO':
        case 'SCREENSHOT': {
          if (!adHocWorkout.rawInputUrl) {
            throw new Error('No image URL provided')
          }
          parsedWorkout = await parseFromImage(
            client,
            modelId,
            adHocWorkout.rawInputUrl,
            exerciseLibrary
          )
          break
        }

        case 'VOICE': {
          if (!adHocWorkout.rawInputUrl) {
            throw new Error('No audio URL provided')
          }
          parsedWorkout = await parseFromVoice(
            client,
            modelId,
            adHocWorkout.rawInputUrl,
            exerciseLibrary
          )
          break
        }

        default: {
          throw new Error(`Unsupported input type: ${adHocWorkout.inputType}`)
        }
      }

      // Enrich with exercise matching
      parsedWorkout = await enrichWithExerciseMatching(parsedWorkout, exerciseLibrary)

      const processingTime = Date.now() - startTime

      // Update with parsed result
      const updated = await prisma.adHocWorkout.update({
        where: { id },
        data: {
          status: 'READY_FOR_REVIEW',
          parsedType: mapParsedTypeToWorkoutType(parsedWorkout.type),
          parsedStructure: parsedWorkout as unknown as Prisma.InputJsonValue,
          parsingModel: modelDisplayName,
          parsingConfidence: parsedWorkout.confidence,
          parsingError: null,
        },
      })

      logger.info('Ad-hoc workout processed successfully', {
        id,
        inputType: adHocWorkout.inputType,
        parsedType: parsedWorkout.type,
        confidence: parsedWorkout.confidence,
        processingTimeMs: processingTime,
        model: modelDisplayName,
      })

      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          status: updated.status,
          parsedStructure: parsedWorkout,
          parsingConfidence: parsedWorkout.confidence,
          parsingModel: modelDisplayName,
        },
      })
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error'
      logger.error('Ad-hoc workout processing failed', { id, error: errorMessage })

      // Update with error
      await prisma.adHocWorkout.update({
        where: { id },
        data: {
          status: 'FAILED',
          parsingError: errorMessage,
        },
      })

      return NextResponse.json(
        { success: false, error: `Processing failed: ${errorMessage}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error processing ad-hoc workout:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process ad-hoc workout' },
      { status: 500 }
    )
  }
}

// ============================================
// PARSING FUNCTIONS
// ============================================

async function parseFromText(
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string,
  text: string,
  exerciseLibrary: Awaited<ReturnType<typeof getExerciseLibrary>>
): Promise<ParsedWorkout> {
  const prompt = buildTextParsingPrompt(text, exerciseLibrary)

  const response = await generateContent(client, modelId, [createText(prompt)], {
    maxOutputTokens: 4096,
    temperature: 0.3,
  })

  return parseAIResponse(response.text)
}

async function parseFromImage(
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string,
  imageUrl: string,
  exerciseLibrary: Awaited<ReturnType<typeof getExerciseLibrary>>
): Promise<ParsedWorkout> {
  const prompt = buildImageParsingPrompt(exerciseLibrary)

  // Fetch image as base64
  let base64Data: string
  let mimeType = 'image/jpeg'

  if (isHttpUrl(imageUrl)) {
    const result = await fetchAsBase64(imageUrl)
    base64Data = result.base64
    mimeType = result.mimeType || 'image/jpeg'
    // Override with URL-based detection if available
    if (imageUrl.includes('.png')) mimeType = 'image/png'
    else if (imageUrl.includes('.webp')) mimeType = 'image/webp'
  } else {
    // Supabase storage path
    const bucket = 'adhoc-workout-images'
    const storagePath = normalizeStoragePath(bucket, imageUrl)
    if (!storagePath) {
      throw new Error('Invalid storage path')
    }
    const result = await downloadAsBase64(bucket, storagePath)
    base64Data = result.base64
    mimeType = result.mimeType || 'image/jpeg'
  }

  const response = await generateContent(
    client,
    modelId,
    [createInlineData(mimeType, base64Data), createText(prompt)],
    {
      maxOutputTokens: 4096,
      temperature: 0.3,
    }
  )

  return parseAIResponse(response.text)
}

async function parseFromVoice(
  client: ReturnType<typeof createGoogleGenAIClient>,
  modelId: string,
  audioUrl: string,
  exerciseLibrary: Awaited<ReturnType<typeof getExerciseLibrary>>
): Promise<ParsedWorkout> {
  // Fetch audio as base64
  let base64Data: string
  let mimeType = 'audio/webm'

  if (isHttpUrl(audioUrl)) {
    const result = await fetchAsBase64(audioUrl)
    base64Data = result.base64
    mimeType = result.mimeType || 'audio/webm'
    // Override with URL-based detection if available
    if (audioUrl.includes('.mp3')) mimeType = 'audio/mpeg'
    else if (audioUrl.includes('.m4a')) mimeType = 'audio/mp4'
    else if (audioUrl.includes('.wav')) mimeType = 'audio/wav'
  } else {
    // Supabase storage path
    const bucket = 'adhoc-workout-audio'
    const storagePath = normalizeStoragePath(bucket, audioUrl)
    if (!storagePath) {
      throw new Error('Invalid storage path')
    }
    const result = await downloadAsBase64(bucket, storagePath)
    base64Data = result.base64
    mimeType = result.mimeType || 'audio/webm'
  }

  // Step 1: Transcribe
  const transcriptionPrompt = buildTranscriptionPrompt()
  const transcriptionResponse = await generateContent(
    client,
    modelId,
    [createInlineData(mimeType, base64Data), createText(transcriptionPrompt)],
    {
      maxOutputTokens: 2048,
      temperature: 0.1,
    }
  )

  const transcription = transcriptionResponse.text.trim()

  // Step 2: Parse transcription
  const parsingPrompt = buildVoiceParsingPrompt(transcription, exerciseLibrary)
  const parsingResponse = await generateContent(client, modelId, [createText(parsingPrompt)], {
    maxOutputTokens: 4096,
    temperature: 0.3,
  })

  const parsed = parseAIResponse(parsingResponse.text)

  // Include transcription in notes if not already there
  if (!parsed.notes) {
    parsed.notes = `Transkription: ${transcription}`
  }

  return parsed
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseAIResponse(text: string): ParsedWorkout {
  // Extract JSON from response (might be wrapped in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const jsonText = jsonMatch ? jsonMatch[1] : text

  try {
    const parsed = JSON.parse(jsonText)
    return validateParsedWorkout(parsed)
  } catch (error) {
    logger.error('Failed to parse AI response as JSON', { text: text.substring(0, 500), error })

    // Return a fallback structure
    return {
      type: 'MIXED',
      confidence: 0,
      rawInterpretation: 'Kunde inte tolka AI-svaret',
      warnings: ['AI-svaret kunde inte tolkas som JSON'],
    }
  }
}

function validateParsedWorkout(data: unknown): ParsedWorkout {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid parsed workout data')
  }

  const workout = data as Record<string, unknown>

  const validTypes = ['CARDIO', 'STRENGTH', 'HYBRID', 'MIXED']
  const type = validTypes.includes(workout.type as string)
    ? (workout.type as ParsedWorkout['type'])
    : 'MIXED'

  const confidence =
    typeof workout.confidence === 'number'
      ? Math.max(0, Math.min(1, workout.confidence))
      : 0.5

  return {
    type,
    confidence,
    name: typeof workout.name === 'string' ? workout.name : undefined,
    duration: typeof workout.duration === 'number' ? workout.duration : undefined,
    distance: typeof workout.distance === 'number' ? workout.distance : undefined,
    intensity: workout.intensity as ParsedWorkout['intensity'],
    sport: workout.sport as ParsedWorkout['sport'],
    cardioSegments: Array.isArray(workout.cardioSegments) ? workout.cardioSegments : undefined,
    avgHeartRate: typeof workout.avgHeartRate === 'number' ? workout.avgHeartRate : undefined,
    maxHeartRate: typeof workout.maxHeartRate === 'number' ? workout.maxHeartRate : undefined,
    avgPace: typeof workout.avgPace === 'number' ? workout.avgPace : undefined,
    elevationGain: typeof workout.elevationGain === 'number' ? workout.elevationGain : undefined,
    strengthExercises: Array.isArray(workout.strengthExercises)
      ? workout.strengthExercises
      : undefined,
    hybridFormat: workout.hybridFormat as ParsedWorkout['hybridFormat'],
    timeCap: typeof workout.timeCap === 'number' ? workout.timeCap : undefined,
    repScheme: typeof workout.repScheme === 'string' ? workout.repScheme : undefined,
    movements: Array.isArray(workout.movements) ? workout.movements : undefined,
    perceivedEffort:
      typeof workout.perceivedEffort === 'number' ? workout.perceivedEffort : undefined,
    feeling: workout.feeling as ParsedWorkout['feeling'],
    notes: typeof workout.notes === 'string' ? workout.notes : undefined,
    rawInterpretation:
      typeof workout.rawInterpretation === 'string'
        ? workout.rawInterpretation
        : 'Ingen tolkning tillgänglig',
    warnings: Array.isArray(workout.warnings) ? workout.warnings : undefined,
  }
}

async function enrichWithExerciseMatching(
  workout: ParsedWorkout,
  exerciseLibrary: Awaited<ReturnType<typeof getExerciseLibrary>>
): Promise<ParsedWorkout> {
  // Re-match strength exercises if needed
  if (workout.strengthExercises) {
    for (const exercise of workout.strengthExercises) {
      if (!exercise.exerciseId || (exercise.matchConfidence !== undefined && exercise.matchConfidence < 0.8)) {
        const match = await matchExercise(exercise.exerciseName, exerciseLibrary)
        exercise.exerciseId = match.id || undefined
        exercise.matchConfidence = match.confidence
        exercise.isCustom = !match.id
        if (match.alternatives && match.alternatives.length > 0) {
          exercise.alternatives = match.alternatives
        }
      }
    }
  }

  // Re-match hybrid movements if needed
  if (workout.movements) {
    for (const movement of workout.movements) {
      if (!movement.exerciseId || (movement.matchConfidence !== undefined && movement.matchConfidence < 0.8)) {
        const match = await matchExercise(movement.name, exerciseLibrary)
        movement.exerciseId = match.id || undefined
        movement.matchConfidence = match.confidence
        movement.isCustom = !match.id
      }
    }
  }

  return workout
}

function mapParsedTypeToWorkoutType(
  parsedType: ParsedWorkout['type']
): 'RUNNING' | 'STRENGTH' | 'HYROX' | 'OTHER' {
  switch (parsedType) {
    case 'CARDIO':
      return 'RUNNING'
    case 'STRENGTH':
      return 'STRENGTH'
    case 'HYBRID':
      return 'HYROX'
    case 'MIXED':
    default:
      return 'OTHER'
  }
}
