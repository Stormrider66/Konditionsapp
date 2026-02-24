/**
 * WOD (Workout of the Day) Generation API
 *
 * POST /api/ai/wod - Generate a personalized workout
 *
 * Features:
 * - Readiness-aware intensity adjustment
 * - Injury-aware exercise exclusion
 * - Usage limit enforcement by subscription tier
 * - Three modes: Structured, Casual, Fun
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText, type LanguageModel } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { buildWODContext, getWODUsageStats } from '@/lib/ai/wod-context-builder'
import { checkWODGuardrails } from '@/lib/ai/wod-guardrails'
import { buildWODPrompt, matchExerciseToLibrary } from '@/lib/ai/wod-prompts'
import type {
  WODRequest,
  WODResponse,
  WODWorkout,
  WODMetadata,
  WODMode,
} from '@/types/wod'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { getModelById, getDefaultModel, AI_MODELS } from '@/types/ai-models'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

// Allow up to 30 seconds for AI generation
export const maxDuration = 30

interface RequestBody extends WODRequest {
  modelId?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate athlete (supports coaches in athlete mode)
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId } = resolved

    const rateLimited = await rateLimitJsonResponse('ai:wod:generate', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get request body
    const body: RequestBody = await request.json()
    const {
      mode = 'structured',
      workoutType = 'strength',
      duration = 45,
      equipment = ['none'],
      focusArea,
      modelId: requestedModelId,
    } = body

    // Get client details for coach ID and subscription tier
    const clientRecord = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        userId: true,
        athleteSubscription: {
          select: { tier: true },
        },
      },
    })

    const subscriptionTier = clientRecord?.athleteSubscription?.tier || 'FREE'

    // Build athlete context
    const context = await buildWODContext(clientId)

    if (!context) {
      return NextResponse.json(
        { error: 'Failed to load athlete context' },
        { status: 500 }
      )
    }

    // Run guardrails
    const guardrails = await checkWODGuardrails(context, subscriptionTier)

    // Check if generation is blocked
    if (!guardrails.canGenerate) {
      return NextResponse.json(
        {
          error: 'WOD generation blocked',
          reason: guardrails.blockedReason,
          guardrails: guardrails.checks,
        },
        { status: 403 }
      )
    }

    // Get usage stats for response
    const usageStats = await getWODUsageStats(clientId, subscriptionTier)

    // Build prompt
    const wodRequest: WODRequest = {
      mode: mode as WODMode,
      workoutType: workoutType as WODRequest['workoutType'],
      duration,
      equipment,
      focusArea,
    }

    const prompt = buildWODPrompt(context, wodRequest, guardrails)

    // Get API keys - try athlete's coach's keys first, then system keys
    const coachId = clientRecord?.userId
    let apiKeys: {
      anthropicKey: string | null
      googleKey: string | null
      openaiKey: string | null
    }

    // Try to get coach's API keys
    const envApiKeys = {
      anthropicKey: process.env.ANTHROPIC_API_KEY || null,
      googleKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || null,
      openaiKey: process.env.OPENAI_API_KEY || null,
    }

    apiKeys = envApiKeys

    if (coachId) {
      try {
        apiKeys = await getResolvedAiKeys(coachId)
      } catch {
        apiKeys = envApiKeys
      }
    }

    // Determine which model to use
    let selectedModelConfig = requestedModelId ? getModelById(requestedModelId) : null

    // If no model requested or invalid, use default based on available keys
    if (!selectedModelConfig) {
      selectedModelConfig = getDefaultModel(apiKeys)
    }

    // Verify we have the API key for the selected model's provider
    if (selectedModelConfig) {
      const providerKey =
        selectedModelConfig.provider === 'anthropic'
          ? apiKeys.anthropicKey
          : selectedModelConfig.provider === 'google'
          ? apiKeys.googleKey
          : apiKeys.openaiKey

      if (!providerKey) {
        // Try to find another model we have keys for
        selectedModelConfig = getDefaultModel(apiKeys)
      }
    }

    if (!selectedModelConfig) {
      return NextResponse.json(
        { error: 'No API key available for AI generation' },
        { status: 500 }
      )
    }

    // Create the AI model based on provider
    let model: LanguageModel
    const modelName = selectedModelConfig.modelId

    logger.debug('WOD generation model selected', {
      requestedModelId: requestedModelId || undefined,
      selectedModelId: selectedModelConfig.modelId,
      provider: selectedModelConfig.provider,
    })

    switch (selectedModelConfig.provider) {
      case 'anthropic': {
        const anthropic = createAnthropic({ apiKey: apiKeys.anthropicKey! })
        model = anthropic(selectedModelConfig.modelId) as LanguageModel
        break
      }
      case 'google': {
        const google = createGoogleGenerativeAI({ apiKey: apiKeys.googleKey! })
        model = google(selectedModelConfig.modelId) as LanguageModel
        break
      }
      case 'openai': {
        const openai = createOpenAI({ apiKey: apiKeys.openaiKey! })
        model = openai(selectedModelConfig.modelId) as LanguageModel
        break
      }
      default:
        return NextResponse.json(
          { error: 'Unsupported AI provider' },
          { status: 500 }
        )
    }

    // Generate workout
    const { text: responseText, usage } = await generateText({
      model,
      prompt,
      maxOutputTokens: 4000,
    })

    // Parse JSON from response (avoid logging the raw response)
    logger.debug('WOD AI response received', {
      provider: selectedModelConfig.provider,
      modelId: selectedModelConfig.modelId,
      responseLength: responseText.length,
    })

    const workout = parseWorkoutFromResponse(responseText)

    if (!workout) {
      logger.warn('Failed to parse WOD from AI response', {
        provider: selectedModelConfig.provider,
        modelId: selectedModelConfig.modelId,
        responseLength: responseText.length,
      })
      return NextResponse.json(
        {
          error: 'Failed to generate valid workout',
          details: process.env.NODE_ENV === 'development'
            ? `AI returned: ${responseText.substring(0, 200)}...`
            : undefined
        },
        { status: 500 }
      )
    }

    // Enhance workout with exercise library data
    const enhancedWorkout = await enhanceWorkoutWithLibrary(workout)

    // Calculate totals
    const totalDuration = enhancedWorkout.sections.reduce((sum, s) => sum + s.duration, 0)
    const totalExercises = enhancedWorkout.sections.reduce(
      (sum, s) => sum + s.exercises.length,
      0
    )
    const totalSets = enhancedWorkout.sections.reduce(
      (sum, s) => sum + s.exercises.reduce((eSum, e) => eSum + (e.sets || 1), 0),
      0
    )

    // Build metadata
    const guardrailsApplied = guardrails.guardrailsApplied

    const metadata: WODMetadata = {
      requestId: crypto.randomUUID(),
      athleteName: context.athleteName,
      primarySport: context.primarySport,
      workoutType: workoutType as WODMetadata['workoutType'],
      readinessScore: context.readinessScore,
      adjustedIntensity: guardrails.adjustedIntensity,
      guardrailsApplied,
      remainingWODs: usageStats.isUnlimited ? -1 : usageStats.remaining - 1,
      weeklyLimit: usageStats.weeklyLimit,
      estimatedDuration: totalDuration,
      generationTimeMs: Date.now() - startTime,
    }

    // Save to database
    const savedWOD = await prisma.aIGeneratedWOD.create({
      data: {
        clientId,
        mode: mode.toUpperCase() as 'STRUCTURED' | 'CASUAL' | 'FUN',
        workoutType,
        requestedDuration: duration,
        equipment,
        focusArea,
        title: enhancedWorkout.title,
        subtitle: enhancedWorkout.subtitle,
        description: enhancedWorkout.description,
        workoutJson: JSON.parse(JSON.stringify(enhancedWorkout)),
        coachNotes: enhancedWorkout.coachNotes,
        readinessAtGeneration: context.readinessScore,
        intensityAdjusted: guardrails.adjustedIntensity,
        guardrailsApplied: guardrailsApplied.map(g => g.type),
        primarySport: context.primarySport,
        tokensUsed: (usage?.inputTokens || 0) + (usage?.outputTokens || 0),
        generationTimeMs: Date.now() - startTime,
        modelUsed: modelName,
      },
    })

    // Build response
    const response: WODResponse = {
      metadata: {
        ...metadata,
        requestId: savedWOD.id, // Use saved ID as request ID
      },
      workout: {
        ...enhancedWorkout,
        totalDuration,
        totalExercises,
        totalSets,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('WOD generation error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for specific API errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle credit balance error (Anthropic)
    if (errorMessage.includes('credit balance') || errorMessage.includes('purchase credits')) {
      return NextResponse.json(
        {
          error: 'API-krediter slut',
          reason: 'Din coach behöver lägga till krediter till sin Anthropic API-nyckel för att generera WOD.',
        },
        { status: 402 }
      )
    }

    // Handle Google API quota/billing errors
    if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('billing')) {
      return NextResponse.json(
        {
          error: 'API-kvot överskriden',
          reason: 'Google API-kvoten är slut eller fakturering saknas. Kontrollera Google Cloud Console.',
        },
        { status: 402 }
      )
    }

    // Handle invalid API key errors
    if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        {
          error: 'Ogiltig API-nyckel',
          reason: 'API-nyckeln är ogiltig eller har upphört. Kontrollera inställningarna.',
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate workout',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse workout JSON from AI response
 */
function parseWorkoutFromResponse(response: string): WODWorkout | null {
  let jsonStr = response

  try {
    // Method 1: Try to extract from markdown code block (greedy match)
    const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      jsonStr = jsonBlockMatch[1].trim()
      logger.debug('WOD parse: extracted JSON from markdown block', { jsonLength: jsonStr.length })
    }

    // Method 2: If no code block or still has issues, extract from first { to last }
    if (!jsonStr.startsWith('{')) {
      const start = response.indexOf('{')
      const end = response.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        jsonStr = response.slice(start, end + 1)
        logger.debug('WOD parse: extracted JSON by brace matching', { jsonLength: jsonStr.length })
      }
    }

    // Try to parse
    const parsed = JSON.parse(jsonStr)

    // Validate required fields
    if (!parsed.title || !parsed.sections || !Array.isArray(parsed.sections)) {
      logger.warn('WOD parse: missing required fields', { keys: Object.keys(parsed || {}) })
      return null
    }

    logger.debug('WOD parse: success', { title: parsed.title })
    return parsed as WODWorkout
  } catch (error) {
    logger.warn('WOD parse: failed to parse workout JSON', { jsonLength: jsonStr?.length }, error)

    // Last resort: try to find and parse JSON object
    try {
      const start = response.indexOf('{')
      const end = response.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        const extracted = response.slice(start, end + 1)
        const parsed = JSON.parse(extracted)
        if (parsed.title && parsed.sections) {
          logger.debug('WOD parse: fallback extraction succeeded')
          return parsed as WODWorkout
        }
      }
    } catch {
      // Give up
    }

    return null
  }
}

/**
 * Enhance workout with exercise library data (images, IDs)
 */
async function enhanceWorkoutWithLibrary(
  workout: WODWorkout
): Promise<WODWorkout> {
  // Get all exercises from library for matching
  const exercises = await prisma.exercise.findMany({
    select: {
      id: true,
      name: true,
      nameSv: true,
      imageUrls: true,
    },
  })

  // Create lookup map
  const exerciseMap = new Map(
    exercises.map(e => [e.name.toLowerCase(), e])
  )
  const exerciseMapSv = new Map(
    exercises.filter(e => e.nameSv).map(e => [e.nameSv!.toLowerCase(), e])
  )

  // Enhance each exercise in each section
  const enhancedSections = workout.sections.map(section => ({
    ...section,
    exercises: section.exercises.map(exercise => {
      // Try to find matching exercise
      const matchedSlug = matchExerciseToLibrary(exercise.name)
      let libraryExercise = matchedSlug
        ? exercises.find(e =>
            e.name.toLowerCase().includes(matchedSlug) ||
            (e.nameSv && e.nameSv.toLowerCase().includes(matchedSlug))
          )
        : null

      // Direct match by name
      if (!libraryExercise) {
        libraryExercise =
          exerciseMap.get(exercise.name.toLowerCase()) ||
          exerciseMapSv.get(exercise.nameSv?.toLowerCase() || '')
      }

      if (libraryExercise) {
        return {
          ...exercise,
          exerciseId: libraryExercise.id,
          imageUrls: (libraryExercise.imageUrls as string[]) || [],
        }
      }

      return exercise
    }),
  }))

  return {
    ...workout,
    sections: enhancedSections,
  }
}

// ============================================
// GET ENDPOINT - Fetch saved WOD
// ============================================

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const { searchParams } = new URL(request.url)
    const wodId = searchParams.get('id')

    if (wodId) {
      // Get specific WOD
      const wod = await prisma.aIGeneratedWOD.findFirst({
        where: {
          id: wodId,
          clientId,
        },
      })

      if (!wod) {
        return NextResponse.json({ error: 'WOD not found' }, { status: 404 })
      }

      return NextResponse.json(wod)
    } else {
      // Get recent WODs
      const wods = await prisma.aIGeneratedWOD.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      return NextResponse.json(wods)
    }
  } catch (error) {
    logger.error('GET WOD error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch WOD' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH ENDPOINT - Update WOD status
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const body = await request.json()
    const { wodId, status, sessionRPE, exerciseLogs, actualDuration } = body

    // Get WOD for training load calculation
    const existingWOD = await prisma.aIGeneratedWOD.findFirst({
      where: {
        id: wodId,
        clientId,
      },
    })

    if (!existingWOD) {
      return NextResponse.json({ error: 'WOD not found' }, { status: 404 })
    }

    // Update WOD
    const wod = await prisma.aIGeneratedWOD.updateMany({
      where: {
        id: wodId,
        clientId,
      },
      data: {
        status,
        ...(status === 'STARTED' && { startedAt: new Date() }),
        ...(status === 'COMPLETED' && {
          completedAt: new Date(),
          sessionRPE,
          exerciseLogs,
          actualDuration,
        }),
      },
    })

    if (wod.count === 0) {
      return NextResponse.json({ error: 'WOD not found' }, { status: 404 })
    }

    // Calculate and save training load when WOD is completed
    if (status === 'COMPLETED') {
      try {
        const duration = actualDuration || existingWOD.requestedDuration || 45
        const rpe = sessionRPE || 6 // Default moderate RPE if not provided

        // Simple RPE-based training load calculation for WOD
        // Formula: Duration × RPE × 10 (simplified TRIMP-like calculation)
        const dailyLoad = Math.round(duration * rpe * 0.8)

        // Determine intensity from RPE
        const intensityMap: Record<number, string> = {
          1: 'RECOVERY',
          2: 'RECOVERY',
          3: 'EASY',
          4: 'EASY',
          5: 'MODERATE',
          6: 'MODERATE',
          7: 'HARD',
          8: 'HARD',
          9: 'VERY_HARD',
          10: 'VERY_HARD',
        }
        const intensity = intensityMap[rpe] || 'MODERATE'

        // Create training load entry
        await prisma.trainingLoad.create({
          data: {
            clientId,
            date: new Date(),
            dailyLoad,
            loadType: 'RPE_BASED',
            workoutType: existingWOD.primarySport || 'STRENGTH',
            duration,
            intensity,
          },
        })

        // Note: WODs appear in activity history via AIGeneratedWOD query in integrated-activity route
        // No need for WorkoutLog - workoutId is required and WODs don't have a Workout record

        logger.debug('Training load saved for WOD', {
          wodId,
          dailyLoad,
          duration,
          rpe,
          intensity,
        })
      } catch (loadError) {
        logger.warn('Error saving training load for WOD', { wodId }, loadError)
        // Don't fail the WOD completion if training load calculation fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('PATCH WOD error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to update WOD' },
      { status: 500 }
    )
  }
}