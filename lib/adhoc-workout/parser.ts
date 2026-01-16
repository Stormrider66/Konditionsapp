/**
 * Ad-Hoc Workout Parser
 *
 * Main orchestration service for parsing workouts from various input types.
 * Uses the athlete's preferred AI model for parsing.
 */

import { prisma } from '@/lib/prisma'
import { decryptSecret } from '@/lib/crypto/secretbox'
import {
  createGoogleGenAIClient,
  generateContent,
  fetchAsBase64,
  createInlineData,
  createText,
} from '@/lib/ai/google-genai-client'
import { getModelById, getDefaultModel, type AIModelConfig } from '@/types/ai-models'
import { getExerciseLibrary, matchExercise } from './exercise-matcher'
import {
  buildTextParsingPrompt,
  buildImageParsingPrompt,
  buildVoiceParsingPrompt,
  buildTranscriptionPrompt,
  mapStravaType,
  mapGarminType,
} from './prompts'
import type {
  ParsedWorkout,
  ParserConfig,
  StravaActivityImport,
  GarminActivityImport,
  ExerciseLibraryEntry,
} from './types'
import { logger } from '@/lib/logger'

// ============================================
// MAIN PARSER FUNCTIONS
// ============================================

/**
 * Parse workout from free-form text input
 */
export async function parseWorkoutFromText(
  text: string,
  config: ParserConfig
): Promise<ParsedWorkout> {
  const exerciseLibrary = await getExerciseLibrary()
  const prompt = buildTextParsingPrompt(text, exerciseLibrary)

  const result = await callAI(prompt, config)
  return await enrichParsedWorkout(result, exerciseLibrary)
}

/**
 * Parse workout from image (photo/screenshot)
 */
export async function parseWorkoutFromImage(
  imageUrl: string,
  mimeType: string,
  config: ParserConfig
): Promise<ParsedWorkout> {
  const exerciseLibrary = await getExerciseLibrary()
  const prompt = buildImageParsingPrompt(exerciseLibrary)

  const result = await callAIWithImage(prompt, imageUrl, mimeType, config)
  return await enrichParsedWorkout(result, exerciseLibrary)
}

/**
 * Parse workout from voice recording
 * First transcribes, then parses the transcription
 */
export async function parseWorkoutFromVoice(
  audioUrl: string,
  mimeType: string,
  config: ParserConfig
): Promise<ParsedWorkout & { transcription: string }> {
  // Step 1: Transcribe the audio
  const transcription = await transcribeAudio(audioUrl, mimeType, config)

  // Step 2: Parse the transcription
  const exerciseLibrary = await getExerciseLibrary()
  const prompt = buildVoiceParsingPrompt(transcription, exerciseLibrary)

  const result = await callAI(prompt, config)
  const enriched = await enrichParsedWorkout(result, exerciseLibrary)

  return {
    ...enriched,
    transcription,
  }
}

/**
 * Parse workout from Strava activity (no AI needed - direct mapping)
 */
export async function parseWorkoutFromStrava(
  activity: StravaActivityImport
): Promise<ParsedWorkout> {
  const mapping = mapStravaType(activity.type)

  const durationMinutes = Math.round(activity.movingTime / 60)
  const distanceKm = activity.distance / 1000

  // Calculate average pace in sec/km for running
  const avgPace = mapping.sport === 'RUNNING' && distanceKm > 0
    ? Math.round(activity.movingTime / distanceKm)
    : undefined

  return {
    type: mapping.workoutType,
    confidence: 0.95, // High confidence since data is structured
    name: activity.name,
    duration: durationMinutes,
    distance: distanceKm > 0 ? distanceKm : undefined,
    intensity: mapping.intensity as ParsedWorkout['intensity'],
    sport: mapping.sport as ParsedWorkout['sport'],
    avgHeartRate: activity.averageHeartrate,
    maxHeartRate: activity.maxHeartrate,
    avgPace,
    elevationGain: activity.elevationGain > 0 ? activity.elevationGain : undefined,
    rawInterpretation: `Importerat från Strava: ${activity.name} (${activity.type})`,
    notes: `Strava aktivitet: ${activity.id}`,
  }
}

/**
 * Parse workout from Garmin activity (no AI needed - direct mapping)
 */
export async function parseWorkoutFromGarmin(
  activity: GarminActivityImport
): Promise<ParsedWorkout> {
  const mapping = mapGarminType(activity.activityType)

  const durationMinutes = Math.round(activity.duration / 60)
  const distanceKm = activity.distance / 1000

  // Calculate average pace in sec/km for running
  const avgPace = mapping.sport === 'RUNNING' && distanceKm > 0
    ? Math.round(activity.duration / distanceKm)
    : undefined

  return {
    type: mapping.workoutType,
    confidence: 0.95, // High confidence since data is structured
    name: activity.activityName,
    duration: durationMinutes,
    distance: distanceKm > 0 ? distanceKm : undefined,
    intensity: mapping.intensity as ParsedWorkout['intensity'],
    sport: mapping.sport as ParsedWorkout['sport'],
    avgHeartRate: activity.averageHR,
    maxHeartRate: activity.maxHR,
    avgPace,
    elevationGain: activity.elevationGain > 0 ? activity.elevationGain : undefined,
    rawInterpretation: `Importerat från Garmin: ${activity.activityName} (${activity.activityType})`,
    notes: `Garmin aktivitet: ${activity.activityId}`,
  }
}

// ============================================
// AI CALLING HELPERS
// ============================================

/**
 * Call AI with text-only prompt
 */
async function callAI(prompt: string, config: ParserConfig): Promise<ParsedWorkout> {
  if (config.provider !== 'google') {
    throw new Error(`Provider ${config.provider} not yet supported for workout parsing`)
  }

  // Get API key from coach
  const apiKey = await getGoogleApiKey(config)

  const client = createGoogleGenAIClient(apiKey)
  const response = await generateContent(client, config.apiModelId, [createText(prompt)], {
    maxOutputTokens: config.maxTokens || 4096,
    temperature: config.temperature || 0.3,
  })

  return parseAIResponse(response.text)
}

/**
 * Call AI with image
 */
async function callAIWithImage(
  prompt: string,
  imageUrl: string,
  mimeType: string,
  config: ParserConfig
): Promise<ParsedWorkout> {
  if (config.provider !== 'google') {
    throw new Error(`Provider ${config.provider} not yet supported for image parsing`)
  }

  const apiKey = await getGoogleApiKey(config)
  const client = createGoogleGenAIClient(apiKey)

  // Fetch image as base64
  const { base64: base64Data } = await fetchAsBase64(imageUrl)

  const response = await generateContent(
    client,
    config.apiModelId,
    [createInlineData(base64Data, mimeType), createText(prompt)],
    {
      maxOutputTokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.3,
    }
  )

  return parseAIResponse(response.text)
}

/**
 * Transcribe audio using AI
 */
async function transcribeAudio(
  audioUrl: string,
  mimeType: string,
  config: ParserConfig
): Promise<string> {
  if (config.provider !== 'google') {
    throw new Error(`Provider ${config.provider} not yet supported for audio transcription`)
  }

  const apiKey = await getGoogleApiKey(config)
  const client = createGoogleGenAIClient(apiKey)

  // Fetch audio as base64
  const { base64: base64Data } = await fetchAsBase64(audioUrl)

  const prompt = buildTranscriptionPrompt()
  const response = await generateContent(
    client,
    config.apiModelId,
    [createInlineData(base64Data, mimeType), createText(prompt)],
    {
      maxOutputTokens: 2048,
      temperature: 0.1, // Low temperature for accurate transcription
    }
  )

  return response.text.trim()
}

// ============================================
// RESPONSE PARSING
// ============================================

/**
 * Parse AI response text to ParsedWorkout
 */
function parseAIResponse(text: string): ParsedWorkout {
  // Extract JSON from response (might be wrapped in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const jsonText = jsonMatch ? jsonMatch[1] : text

  try {
    const parsed = JSON.parse(jsonText)
    return validateParsedWorkout(parsed)
  } catch (error) {
    logger.error('Failed to parse AI response as JSON', { text, error })

    // Return a fallback structure
    return {
      type: 'MIXED',
      confidence: 0,
      rawInterpretation: 'Kunde inte tolka AI-svaret',
      warnings: ['AI-svaret kunde inte tolkas som JSON', text.substring(0, 200)],
    }
  }
}

/**
 * Validate and normalize parsed workout structure
 */
function validateParsedWorkout(data: unknown): ParsedWorkout {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid parsed workout data')
  }

  const workout = data as Record<string, unknown>

  // Ensure required fields
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
    cardioSegments: Array.isArray(workout.cardioSegments)
      ? workout.cardioSegments
      : undefined,
    avgHeartRate:
      typeof workout.avgHeartRate === 'number' ? workout.avgHeartRate : undefined,
    maxHeartRate:
      typeof workout.maxHeartRate === 'number' ? workout.maxHeartRate : undefined,
    avgPace: typeof workout.avgPace === 'number' ? workout.avgPace : undefined,
    elevationGain:
      typeof workout.elevationGain === 'number' ? workout.elevationGain : undefined,
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

// ============================================
// ENRICHMENT
// ============================================

/**
 * Enrich parsed workout with better exercise matching
 */
async function enrichParsedWorkout(
  workout: ParsedWorkout,
  exerciseLibrary: ExerciseLibraryEntry[]
): Promise<ParsedWorkout> {
  // Re-match strength exercises if needed
  if (workout.strengthExercises) {
    for (const exercise of workout.strengthExercises) {
      if (!exercise.exerciseId || exercise.matchConfidence === undefined || exercise.matchConfidence < 0.8) {
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
      if (!movement.exerciseId || movement.matchConfidence === undefined || movement.matchConfidence < 0.8) {
        const match = await matchExercise(movement.name, exerciseLibrary)
        movement.exerciseId = match.id || undefined
        movement.matchConfidence = match.confidence
        movement.isCustom = !match.id
      }
    }
  }

  return workout
}

// ============================================
// CONFIG HELPERS
// ============================================

/**
 * Get parser config for an athlete based on their preferences
 */
export async function getParserConfigForAthlete(
  athleteId: string
): Promise<ParserConfig | null> {
  // Get athlete's client with sport profile and coach
  const client = await prisma.client.findUnique({
    where: { id: athleteId },
    include: {
      sportProfile: {
        select: { preferredAIModelId: true },
      },
      user: {
        select: { id: true },
      },
    },
  })

  if (!client) {
    return null
  }

  const coachId = client.userId

  // Get coach's API keys
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId: coachId },
    select: {
      googleKeyValid: true,
      anthropicKeyValid: true,
      openaiKeyValid: true,
    },
  })

  if (!apiKeys) {
    return null
  }

  // Determine model to use
  let modelConfig: AIModelConfig | undefined

  // Priority 1: Athlete's preferred model
  if (client.sportProfile?.preferredAIModelId) {
    modelConfig = getModelById(client.sportProfile.preferredAIModelId)

    // Verify the provider key is valid
    if (modelConfig) {
      const providerValid =
        (modelConfig.provider === 'google' && apiKeys.googleKeyValid) ||
        (modelConfig.provider === 'anthropic' && apiKeys.anthropicKeyValid) ||
        (modelConfig.provider === 'openai' && apiKeys.openaiKeyValid)

      if (!providerValid) {
        modelConfig = undefined // Fall back to default
      }
    }
  }

  // Priority 2: Default model
  if (!modelConfig) {
    const keys = {
      googleKey: apiKeys.googleKeyValid ? 'valid' : null,
      anthropicKey: apiKeys.anthropicKeyValid ? 'valid' : null,
      openaiKey: apiKeys.openaiKeyValid ? 'valid' : null,
    }
    modelConfig = getDefaultModel(keys)
  }

  if (!modelConfig) {
    return null
  }

  return {
    modelId: modelConfig.id,
    provider: modelConfig.provider,
    apiModelId: modelConfig.modelId,
    maxTokens: 4096,
    temperature: 0.3,
  }
}

/**
 * Get Google API key for the config (decrypted)
 */
async function getGoogleApiKey(config: ParserConfig): Promise<string> {
  // This is a simplified version - in production, you'd pass the coach ID
  // through the config or retrieve it from the request context
  throw new Error(
    'getGoogleApiKey needs to be called with proper context. Use getApiKeyForCoach instead.'
  )
}

/**
 * Get decrypted API key for a coach
 */
export async function getApiKeyForCoach(
  coachId: string,
  provider: 'google' | 'anthropic' | 'openai'
): Promise<string | null> {
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId: coachId },
    select: {
      googleKeyEncrypted: true,
      anthropicKeyEncrypted: true,
      openaiKeyEncrypted: true,
    },
  })

  if (!apiKeys) {
    return null
  }

  let encryptedKey: string | null = null

  switch (provider) {
    case 'google':
      encryptedKey = apiKeys.googleKeyEncrypted
      break
    case 'anthropic':
      encryptedKey = apiKeys.anthropicKeyEncrypted
      break
    case 'openai':
      encryptedKey = apiKeys.openaiKeyEncrypted
      break
  }

  if (!encryptedKey) {
    return null
  }

  try {
    return decryptSecret(encryptedKey)
  } catch {
    return null
  }
}

/**
 * Create parser config with API key for direct use
 */
export async function createParserConfigWithKey(
  athleteId: string,
  coachId: string
): Promise<{ config: ParserConfig; apiKey: string } | null> {
  const config = await getParserConfigForAthlete(athleteId)

  if (!config) {
    return null
  }

  const apiKey = await getApiKeyForCoach(coachId, config.provider)

  if (!apiKey) {
    return null
  }

  return { config, apiKey }
}
