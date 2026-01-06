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
import { requireAthlete } from '@/lib/auth-utils'
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
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'
import { getModelById, getDefaultModel, AI_MODELS } from '@/types/ai-models'

// Allow up to 30 seconds for AI generation
export const maxDuration = 30

interface RequestBody extends WODRequest {
  clientId?: string
  modelId?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate athlete
    const user = await requireAthlete()

    // Get request body
    const body: RequestBody = await request.json()
    const {
      mode = 'structured',
      duration = 45,
      equipment = ['none'],
      focusArea,
      clientId: providedClientId,
      modelId: requestedModelId,
    } = body

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: {
        clientId: true,
        client: {
          select: {
            userId: true,
            athleteSubscription: {
              select: { tier: true },
            },
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    const clientId = providedClientId || athleteAccount.clientId

    // Safety: athleteAccount existence does not guarantee nested relations are populated
    const subscriptionTier = athleteAccount.client?.athleteSubscription?.tier || 'FREE'

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
      duration,
      equipment,
      focusArea,
    }

    const prompt = buildWODPrompt(context, wodRequest, guardrails)

    // Get API keys - try athlete's coach's keys first, then system keys
    const coachId = athleteAccount.client?.userId
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
        apiKeys = await getDecryptedUserApiKeys(coachId)
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
      maxOutputTokens: 2000,
    })

    // Parse JSON from response
    const workout = parseWorkoutFromResponse(responseText)

    if (!workout) {
      console.error('Failed to parse workout from AI response:', responseText)
      return NextResponse.json(
        { error: 'Failed to generate valid workout' },
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
    console.error('WOD generation error:', error)

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
  try {
    // Try to find JSON in the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : response

    // Try to parse
    const parsed = JSON.parse(jsonStr.trim())

    // Validate required fields
    if (!parsed.title || !parsed.sections || !Array.isArray(parsed.sections)) {
      console.error('Missing required fields in parsed workout:', parsed)
      return null
    }

    return parsed as WODWorkout
  } catch (error) {
    console.error('Failed to parse workout JSON:', error)

    // Try a more aggressive JSON extraction
    try {
      const start = response.indexOf('{')
      const end = response.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        const jsonStr = response.slice(start, end + 1)
        return JSON.parse(jsonStr) as WODWorkout
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
    const user = await requireAthlete()
    const { searchParams } = new URL(request.url)
    const wodId = searchParams.get('id')

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    if (wodId) {
      // Get specific WOD
      const wod = await prisma.aIGeneratedWOD.findFirst({
        where: {
          id: wodId,
          clientId: athleteAccount.clientId,
        },
      })

      if (!wod) {
        return NextResponse.json({ error: 'WOD not found' }, { status: 404 })
      }

      return NextResponse.json(wod)
    } else {
      // Get recent WODs
      const wods = await prisma.aIGeneratedWOD.findMany({
        where: { clientId: athleteAccount.clientId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      return NextResponse.json(wods)
    }
  } catch (error) {
    console.error('GET WOD error:', error)

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
    const user = await requireAthlete()
    const body = await request.json()
    const { wodId, status, sessionRPE, exerciseLogs, actualDuration } = body

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    // Update WOD
    const wod = await prisma.aIGeneratedWOD.updateMany({
      where: {
        id: wodId,
        clientId: athleteAccount.clientId,
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH WOD error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to update WOD' },
      { status: 500 }
    )
  }
}