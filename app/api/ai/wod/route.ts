/**
 * WOD (Workout of the Day) Generation API
 *
 * POST /api/ai/wod - Generate a personalized workout
 *
 * Features:
 * - Readiness-aware intensity adjustment
 * - Injury-aware exercise exclusion
 * - Free-tier daily usage limit enforcement
 * - Self-learning candidate selection
 * - Three modes: Structured, Casual, Fun
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText, type LanguageModel } from 'ai'
import { Prisma } from '@prisma/client'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { buildWODContext, getWODUsageStats } from '@/lib/ai/wod-context-builder'
import { checkWODGuardrails } from '@/lib/ai/wod-guardrails'
import { buildWODCandidatePrompt, buildWODPrompt, matchExerciseToLibrary } from '@/lib/ai/wod-prompts'
import type {
  WODAutoIntent,
  WODCandidateBlueprint,
  WODRequest,
  WODResponse,
  WODWorkout,
  WODMetadata,
  WODMode,
} from '@/types/wod'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { getModelById, getDefaultModel, resolveModel, isModelIntent } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { normalizeAIModelId } from '@/lib/ai/model-compat'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { logAiUsage, withAiContext, type AiProviderTag } from '@/lib/ai/usage-logger'
import {
  buildCandidateScoringSnapshot,
  buildPreferenceSnapshot,
  getWODLearningContext,
  normalizeWODFeedback,
  pickBestWODCandidate,
  updateWODPreferenceProfileFromCompletion,
} from '@/lib/ai/wod-learning'
import { inferWODRhythmIntent } from '@/lib/ai/wod-rhythm'

// Candidate generation + winner expansion can require two AI calls.
export const maxDuration = 60

interface RequestBody extends WODRequest {
  modelId?: string
  intent?: string
  autoIntent?: WODAutoIntent['source']
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let locale: AppLocale = 'en'

  try {
    // Authenticate athlete (supports coaches in athlete mode)
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { user, clientId } = resolved
    locale = user.language === 'sv' ? 'sv' : 'en'

    const rateLimited = await rateLimitJsonResponse('ai:wod:generate', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

    // Get request body
    const body: RequestBody = await request.json()
    const {
      modelId: requestedModelId,
      intent: requestedIntent,
      autoIntent: requestedAutoIntent,
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
    const context = await buildWODContext(clientId, locale)

    if (!context) {
      return NextResponse.json(
        { error: t(locale, 'Failed to load athlete context', 'Kunde inte läsa in atletkontext') },
        { status: 500 }
      )
    }

    const rhythmIntent = requestedAutoIntent === 'rhythm'
      ? await inferWODRhythmIntent(clientId, context, locale)
      : null
    if (rhythmIntent) {
      context.wodAutoIntent = rhythmIntent
      logger.debug('WOD rhythm intent inferred', {
        clientId,
        workoutType: rhythmIntent.workoutType,
        duration: rhythmIntent.duration,
        confidence: rhythmIntent.confidence,
      })
    }

    // Run guardrails
    const guardrails = await checkWODGuardrails(context, subscriptionTier, locale)

    // Check if generation is blocked
    if (!guardrails.canGenerate) {
      return NextResponse.json(
        {
          error: t(locale, 'WOD generation blocked', 'Dagens pass-generering blockerad'),
          reason: guardrails.blockedReason,
          guardrails: guardrails.checks,
        },
        { status: 403 }
      )
    }

    // Get usage stats for response
    const usageStats = await getWODUsageStats(clientId, subscriptionTier)

    const wodRequest: WODRequest = {
      mode: rhythmIntent?.mode ?? (body.mode || 'structured') as WODMode,
      workoutType: rhythmIntent?.workoutType ?? body.workoutType ?? 'strength',
      duration: rhythmIntent?.duration ?? body.duration ?? 45,
      equipment: rhythmIntent?.equipment ?? body.equipment ?? ['none'],
      focusArea: rhythmIntent?.focusArea ?? body.focusArea,
    }

    // Personal learning is primary; anonymous cohort hints are secondary.
    const learning = await getWODLearningContext(clientId, context, wodRequest)
    context.wodPreferenceProfile = learning.profile
    context.globalLearningHints = learning.globalHints

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
    let model: LanguageModel
    let modelName = 'unknown'
    let providerTag: AiProviderTag = 'GOOGLE'
    let modelIsAutoInstrumented = false

    // Intent-based resolution (new athlete flow)
    if (requestedIntent && isModelIntent(requestedIntent)) {
      const resolved = resolveModel(apiKeys, requestedIntent)
      if (!resolved) {
        return NextResponse.json(
          { error: t(locale, 'No API key available for AI generation', 'Ingen AI-nyckel tillgänglig för generering') },
          { status: 500 }
        )
      }
      model = createModelInstance(resolved) as LanguageModel
      modelName = resolved.modelId
      modelIsAutoInstrumented = true
      providerTag =
        resolved.provider === 'anthropic'
          ? 'ANTHROPIC'
          : resolved.provider === 'openai'
          ? 'OPENAI'
          : 'GOOGLE'
      logger.debug('WOD generation model resolved via intent', {
        intent: requestedIntent,
        provider: resolved.provider,
        modelId: resolved.modelId,
      })
    } else {
      // Legacy model ID flow
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
          selectedModelConfig = getDefaultModel(apiKeys)
        }
      }

      if (!selectedModelConfig) {
        return NextResponse.json(
          { error: t(locale, 'No API key available for AI generation', 'Ingen AI-nyckel tillgänglig för generering') },
          { status: 500 }
        )
      }

      const selectedProviderModelId = normalizeAIModelId(selectedModelConfig.modelId)
      modelName = selectedProviderModelId
      providerTag =
        selectedModelConfig.provider === 'anthropic'
          ? 'ANTHROPIC'
          : selectedModelConfig.provider === 'openai'
          ? 'OPENAI'
          : 'GOOGLE'

      logger.debug('WOD generation model selected', {
        requestedModelId: requestedModelId || undefined,
        selectedModelId: selectedProviderModelId,
        provider: selectedModelConfig.provider,
      })

      switch (selectedModelConfig.provider) {
        case 'anthropic': {
          const anthropic = createAnthropic({ apiKey: apiKeys.anthropicKey! })
          model = anthropic(selectedProviderModelId) as LanguageModel
          break
        }
        case 'google': {
          const google = createGoogleGenerativeAI({ apiKey: apiKeys.googleKey! })
          model = google(selectedProviderModelId) as LanguageModel
          break
        }
        case 'openai': {
          const openai = createOpenAI({ apiKey: apiKeys.openaiKey! })
          model = openai(selectedProviderModelId) as LanguageModel
          break
        }
        default:
          return NextResponse.json(
            { error: 'Unsupported AI provider' },
            { status: 500 }
          )
      }
    }

    const promptVariant = await getActiveWODStrategyVariant()
    const promptVariantAdjustment = promptVariant?.promptTemplate ?? null

    // Stage 1: generate compact candidates, then score locally.
    const candidatePrompt = buildWODCandidatePrompt(
      context,
      wodRequest,
      guardrails,
      locale,
      promptVariantAdjustment,
    )
    const { text: candidateText, usage: candidateUsage } = await withAiContext(
      { userId: user.id, clientId, category: 'wod_generation' },
      () => generateText({
        model,
        prompt: candidatePrompt,
        maxOutputTokens: 2200,
      }),
    )

    const candidates = parseCandidatesFromResponse(candidateText, wodRequest, guardrails.adjustedIntensity)
    const { candidate: selectedCandidate, score: selectedCandidateScore, scores: candidateScores } =
      pickBestWODCandidate(candidates, {
        request: wodRequest,
        guardrails,
        profile: learning.profile,
        globalHints: learning.globalHints,
      })

    logger.debug('WOD candidate selected', {
      candidateId: selectedCandidate.id,
      score: selectedCandidateScore.score,
      vetoedCandidates: candidateScores.filter(score => score.vetoed).length,
    })

    // Stage 2: expand only the winning candidate into full WOD JSON.
    const prompt = buildWODPrompt(context, wodRequest, guardrails, locale, {
      selectedCandidate,
      promptVariantAdjustment,
    })
    const { text: responseText, usage } = await withAiContext(
      { userId: user.id, clientId, category: 'wod_generation' },
      () => generateText({
        model,
        prompt,
        maxOutputTokens: 4000,
      }),
    )

    if (modelIsAutoInstrumented) {
      // Intent-based calls use createModelInstance, which is already instrumented.
    } else {
      logAiUsage({
        userId: user.id,
        clientId,
        category: 'wod_generation',
        provider: providerTag,
        model: modelName,
        inputTokens: candidateUsage?.inputTokens ?? 0,
        outputTokens: candidateUsage?.outputTokens ?? 0,
      })
      logAiUsage({
        userId: user.id,
        clientId,
        category: 'wod_generation',
        provider: providerTag,
        model: modelName,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
      })
    }

    // Parse JSON from response (avoid logging the raw response)
    logger.debug('WOD AI response received', {
      model: modelName,
      responseLength: responseText.length,
    })

    const workout = parseWorkoutFromResponse(responseText)

    if (!workout) {
      logger.warn('Failed to parse WOD from AI response', {
        model: modelName,
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
      workoutType: wodRequest.workoutType as WODMetadata['workoutType'],
      readinessScore: context.readinessScore,
      adjustedIntensity: guardrails.adjustedIntensity,
      guardrailsApplied,
      remainingWODs: usageStats.isUnlimited ? -1 : usageStats.remaining - 1,
      dailyLimit: usageStats.dailyLimit,
      estimatedDuration: totalDuration,
      generationTimeMs: Date.now() - startTime,
      candidateScore: selectedCandidateScore.score,
      promptVariantId: promptVariant?.id ?? null,
      autoIntent: rhythmIntent,
      dataPolicy: context.dataPolicy,
    }

    // Save to database
    const savedWOD = await prisma.aIGeneratedWOD.create({
      data: {
        clientId,
        mode: wodRequest.mode.toUpperCase() as 'STRUCTURED' | 'CASUAL' | 'FUN',
        workoutType: wodRequest.workoutType,
        requestedDuration: wodRequest.duration ?? 45,
        equipment: wodRequest.equipment ?? ['none'],
        focusArea: wodRequest.focusArea,
        title: enhancedWorkout.title,
        subtitle: enhancedWorkout.subtitle,
        description: enhancedWorkout.description,
        workoutJson: JSON.parse(JSON.stringify(enhancedWorkout)),
        coachNotes: enhancedWorkout.coachNotes,
        readinessAtGeneration: context.readinessScore,
        intensityAdjusted: guardrails.adjustedIntensity,
        guardrailsApplied: guardrailsApplied.map(g => g.type),
        primarySport: context.primarySport,
        tokensUsed:
          (candidateUsage?.inputTokens || 0) +
          (candidateUsage?.outputTokens || 0) +
          (usage?.inputTokens || 0) +
          (usage?.outputTokens || 0),
        generationTimeMs: Date.now() - startTime,
        modelUsed: modelName,
        preferenceSnapshot: buildPreferenceSnapshot(learning),
        candidateScores: buildCandidateScoringSnapshot({
          learning,
          chosen: selectedCandidate,
          chosenScore: selectedCandidateScore,
          allScores: candidateScores,
        }),
        promptVariantId: promptVariant?.id ?? null,
        source: rhythmIntent ? 'quick_rhythm' : 'generator',
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    // Check for specific API errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle credit balance error (Anthropic)
    if (errorMessage.includes('credit balance') || errorMessage.includes('purchase credits')) {
      return NextResponse.json(
        {
          error: t(locale, 'API credits depleted', 'API-krediter slut'),
          reason: t(
            locale,
            "Your coach needs to add credits to their Anthropic API key to generate WODs.",
            'Din coach behöver lägga till krediter till sin Anthropic API-nyckel för att generera WOD.'
          ),
        },
        { status: 402 }
      )
    }

    // Handle Google API quota/billing errors
    if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('billing')) {
      return NextResponse.json(
        {
          error: t(locale, 'API quota exceeded', 'API-kvot överskriden'),
          reason: t(
            locale,
            'The Google API quota is exhausted or billing is missing. Check Google Cloud Console.',
            'Google API-kvoten är slut eller fakturering saknas. Kontrollera Google Cloud Console.'
          ),
        },
        { status: 402 }
      )
    }

    // Handle invalid API key errors
    if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('UNAUTHENTICATED')) {
      return NextResponse.json(
        {
          error: t(locale, 'Invalid API key', 'Ogiltig API-nyckel'),
          reason: t(
            locale,
            'The API key is invalid or has expired. Check settings.',
            'API-nyckeln är ogiltig eller har upphört. Kontrollera inställningarna.'
          ),
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        error: t(locale, 'Failed to generate workout', 'Kunde inte generera pass'),
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

function parseCandidatesFromResponse(
  response: string,
  request: WODRequest,
  adjustedIntensity: WODMetadata['adjustedIntensity']
): WODCandidateBlueprint[] {
  const fallback = buildFallbackCandidates(request, adjustedIntensity)
  try {
    let jsonStr = response
    const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch?.[1]) {
      jsonStr = jsonBlockMatch[1].trim()
    } else if (!jsonStr.trim().startsWith('{')) {
      const start = response.indexOf('{')
      const end = response.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        jsonStr = response.slice(start, end + 1)
      }
    }

    const parsed = JSON.parse(jsonStr)
    const candidates: unknown[] = Array.isArray(parsed?.candidates) ? parsed.candidates : []
    const normalized = candidates
      .map((candidate: unknown, index: number) => normalizeCandidate(candidate, index, request, adjustedIntensity))
      .filter((candidate): candidate is WODCandidateBlueprint => !!candidate)
      .slice(0, 3)

    if (normalized.length === 3) return normalized
    logger.warn('WOD candidate parse: expected 3 candidates, using fallback', {
      parsedCount: normalized.length,
    })
    return fallback
  } catch (error) {
    logger.warn('WOD candidate parse failed, using fallback candidates', {}, error)
    return fallback
  }
}

function normalizeCandidate(
  candidate: unknown,
  index: number,
  request: WODRequest,
  adjustedIntensity: WODMetadata['adjustedIntensity']
): WODCandidateBlueprint | null {
  if (!candidate || typeof candidate !== 'object') return null
  const record = candidate as Record<string, unknown>
  const workoutType = normalizeWorkoutType(record.workoutType) || request.workoutType || 'strength'
  const mode = normalizeMode(record.mode) || request.mode
  const duration = typeof record.duration === 'number' ? record.duration : request.duration || 45
  const equipment = Array.isArray(record.equipment)
    ? record.equipment.filter((item): item is string => typeof item === 'string') as WODCandidateBlueprint['equipment']
    : request.equipment || ['none']

  return {
    id: typeof record.id === 'string' ? record.id : `candidate-${index + 1}`,
    title: typeof record.title === 'string' ? record.title : `Candidate ${index + 1}`,
    summary: typeof record.summary === 'string' ? record.summary : 'Personalized daily workout option',
    format: typeof record.format === 'string' ? record.format : 'Structured blocks',
    workoutType,
    mode,
    duration,
    intensity: normalizeIntensity(record.intensity) || adjustedIntensity,
    equipment,
    focusArea: typeof record.focusArea === 'string' ? record.focusArea as WODCandidateBlueprint['focusArea'] : request.focusArea,
    sections: Array.isArray(record.sections)
      ? record.sections.filter((item): item is string => typeof item === 'string')
      : ['Warm-up', 'Main', 'Cooldown'],
    keyExercises: Array.isArray(record.keyExercises)
      ? record.keyExercises.filter((item): item is string => typeof item === 'string')
      : [],
    rationale: typeof record.rationale === 'string' ? record.rationale : 'Balanced fit for today',
  }
}

function buildFallbackCandidates(
  request: WODRequest,
  adjustedIntensity: WODMetadata['adjustedIntensity']
): WODCandidateBlueprint[] {
  const workoutType = request.workoutType || 'strength'
  const mode = request.mode || 'structured'
  const duration = request.duration || 45
  const equipment = request.equipment || ['none']
  return [
    {
      id: 'candidate-1',
      title: 'Structured Fit',
      summary: 'A clear block-based workout matched to today.',
      format: 'Structured blocks',
      workoutType,
      mode,
      duration,
      intensity: adjustedIntensity,
      equipment,
      focusArea: request.focusArea,
      sections: ['Warm-up', 'Main block', 'Cooldown'],
      keyExercises: [],
      rationale: 'Safe default when candidate parsing is unavailable.',
    },
    {
      id: 'candidate-2',
      title: 'Compact Circuit',
      summary: 'A tighter circuit-style option using the same constraints.',
      format: 'Circuit',
      workoutType,
      mode,
      duration,
      intensity: adjustedIntensity,
      equipment,
      focusArea: request.focusArea,
      sections: ['Warm-up', 'Circuit', 'Cooldown'],
      keyExercises: [],
      rationale: 'Adds variety while staying within the same safety limits.',
    },
    {
      id: 'candidate-3',
      title: 'Controlled Quality',
      summary: 'A quality-first version with more controlled pacing.',
      format: 'Intervals',
      workoutType,
      mode,
      duration,
      intensity: adjustedIntensity,
      equipment,
      focusArea: request.focusArea,
      sections: ['Warm-up', 'Quality work', 'Cooldown'],
      keyExercises: [],
      rationale: 'Prioritizes readiness fit and recovery response.',
    },
  ]
}

function normalizeWorkoutType(value: unknown): WODRequest['workoutType'] | null {
  return value === 'strength' || value === 'cardio' || value === 'mixed' || value === 'core' ? value : null
}

function normalizeMode(value: unknown): WODMode | null {
  return value === 'structured' || value === 'casual' || value === 'fun' ? value : null
}

function normalizeIntensity(value: unknown): WODMetadata['adjustedIntensity'] | null {
  return value === 'recovery' || value === 'easy' || value === 'moderate' || value === 'threshold' ? value : null
}

async function getActiveWODStrategyVariant(): Promise<{
  id: string
  promptTemplate: string | null
} | null> {
  return prisma.aIModelVersion.findFirst({
    where: {
      modelType: 'wod_generation_strategy',
      status: 'ACTIVE',
    },
    orderBy: { versionNumber: 'desc' },
    select: {
      id: true,
      promptTemplate: true,
    },
  })
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
  let locale: AppLocale = 'en'

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = user.language === 'sv' ? 'sv' : 'en'

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
        return NextResponse.json({ error: t(locale, 'WOD not found', 'Dagens pass hittades inte') }, { status: 404 })
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to fetch WOD', 'Kunde inte hämta dagens pass') },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH ENDPOINT - Update WOD status
// ============================================

export async function PATCH(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = user.language === 'sv' ? 'sv' : 'en'

    const body = await request.json()
    const { wodId, status, sessionRPE, exerciseLogs, actualDuration } = body
    const feedback = normalizeWODFeedback(body.feedback)

    if (body.feedback && !feedback) {
      return NextResponse.json({ error: t(locale, 'Invalid WOD feedback', 'Ogiltig feedback för dagens pass') }, { status: 400 })
    }

    // Get WOD for training load calculation
    const existingWOD = await prisma.aIGeneratedWOD.findFirst({
      where: {
        id: wodId,
        clientId,
      },
    })

    if (!existingWOD) {
      return NextResponse.json({ error: t(locale, 'WOD not found', 'Dagens pass hittades inte') }, { status: 404 })
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
          ...(feedback && { athleteFeedback: feedback as unknown as Prisma.InputJsonValue }),
        }),
      },
    })

    if (wod.count === 0) {
      return NextResponse.json({ error: t(locale, 'WOD not found', 'Dagens pass hittades inte') }, { status: 404 })
    }

    // Calculate and save training load when WOD is completed
    if (status === 'COMPLETED') {
      if (feedback) {
        await updateWODPreferenceProfileFromCompletion({
          clientId,
          wodId,
          workout: existingWOD.workoutJson as unknown as WODWorkout,
          mode: String(existingWOD.mode),
          workoutType: existingWOD.workoutType,
          requestedDuration: existingWOD.requestedDuration,
          equipment: existingWOD.equipment,
          sessionRPE,
          actualDuration,
          exerciseLogs,
          feedback,
        })
      }

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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to update WOD', 'Kunde inte uppdatera dagens pass') },
      { status: 500 }
    )
  }
}
