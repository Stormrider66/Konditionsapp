/**
 * Multi-Part Program Generation Orchestrator
 *
 * Coordinates the generation of long training programs by:
 * 1. Creating a program outline
 * 2. Generating each phase with context from previous phases
 * 3. Merging all phases into a complete program
 */

import { prisma } from '@/lib/prisma'
import { ProgramGenerationStatus } from '@prisma/client'
import type {
  GenerationContext,
  ProgramOutline,
  GeneratedPhase,
  PhaseConfig,
  MergedProgram,
} from './types'
import { parseWeekRange } from './types'
import {
  PROGRAM_GENERATOR_SYSTEM_PROMPT,
  buildProgramGeneratorSystemPrompt,
  buildOutlinePrompt,
  buildPhasePrompt,
  parseOutlineResponse,
  parsePhaseResponse,
} from './prompts'
import { mergePhases, validateMergedProgram } from './merger'
import { getActiveVariant } from '@/lib/auto-optimize/prompt-variants'
import { stripConditionalBlocks } from '@/lib/auto-optimize/iteration-engine'
import { buildConstitutionPreamble } from '@/lib/ai/constitution'
import { normalizeAIModelId } from '@/lib/ai/model-compat'
import { logAiUsage, type AiProviderTag } from '@/lib/ai/usage-logger'

// ============================================
// Constants
// ============================================

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

// ============================================
// Main Orchestrator
// ============================================

export interface OrchestratorOptions {
  sessionId: string
  context: GenerationContext
  apiKey: string
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
  modelId?: string
}

interface ProgramGenerationAiMeta {
  userId: string
  clientId?: string | null
}

/**
 * Resolve the system prompt for program generation.
 *
 * Tries to load the ACTIVE auto-optimize variant for the 'full_program' slot,
 * strip conditional blocks based on the athlete's sport/methodology, and
 * substitute {{variables}} from the generation context.
 *
 * Falls back to the static PROGRAM_GENERATOR_SYSTEM_PROMPT if no variant exists.
 */
async function getEnrichedSystemPrompt(context: GenerationContext): Promise<string> {
  const locale = context.locale === 'sv' ? 'sv' : 'en'

  if (locale === 'en') {
    return buildProgramGeneratorSystemPrompt(locale)
  }

  try {
    const variant = await getActiveVariant('full_program')
    if (!variant?.promptTemplate) {
      return buildProgramGeneratorSystemPrompt(locale)
    }

    // Strip conditional blocks based on sport category and methodology
    let prompt = stripConditionalBlocks(
      variant.promptTemplate,
      context.sport,
      context.methodology
    )

    // Substitute template variables from GenerationContext
    prompt = prompt
      .replace(/\{\{sport\}\}/g, context.sport)
      .replace(/\{\{methodology\}\}/g, context.methodology || 'POLARIZED')
      .replace(/\{\{totalWeeks\}\}/g, String(context.totalWeeks))
      .replace(/\{\{sessionsPerWeek\}\}/g, String(context.sessionsPerWeek || 5))
      .replace(/\{\{experienceLevel\}\}/g, context.experienceLevel || 'intermediate')
      .replace(/\{\{goal\}\}/g, context.goal || (locale === 'sv' ? 'Förbättra prestanda' : 'Improve performance'))

    // Prepend constitution preamble (same as the static prompt does)
    const preamble = buildConstitutionPreamble('program')
    const languageInstruction = locale === 'sv'
      ? '\n\nSvara alltid på svenska i allt användarvänt innehåll.'
      : '\n\nAlways write all user-facing generated content in English.'
    return `${preamble}${prompt}${languageInstruction}`
  } catch {
    // On any error (DB down, etc.), fall back gracefully
    return buildProgramGeneratorSystemPrompt(locale)
  }
}

/**
 * Generate a multi-part program
 * This is the main entry point called by the API or cron job
 */
export async function generateMultiPartProgram(options: OrchestratorOptions): Promise<MergedProgram> {
  const { sessionId, context, apiKey, provider, modelId } = options

  try {
    const sessionMeta = await prisma.programGenerationSession.findUnique({
      where: { id: sessionId },
      select: { coachId: true, athleteId: true },
    })
    const aiMeta: ProgramGenerationAiMeta | undefined = sessionMeta
      ? { userId: sessionMeta.coachId, clientId: sessionMeta.athleteId }
      : undefined

    // Resolve enriched system prompt (auto-optimize variant or static fallback)
    const systemPrompt = await getEnrichedSystemPrompt(context)

    // Step 1: Generate outline
    await updateProgress(sessionId, {
      status: 'GENERATING_OUTLINE',
      progressPercent: 5,
      progressMessage: t(context, 'Creating program structure...', 'Skapar programstruktur...'),
    })

    const outline = await generateOutlineWithRetry(context, apiKey, provider, modelId, systemPrompt, aiMeta)

    // Update session with outline
    await prisma.programGenerationSession.update({
      where: { id: sessionId },
      data: {
        programOutline: outline as object,
        totalPhases: outline.phases.length,
      },
    })

    await logProgress(sessionId, 'outline', 'Programstruktur skapad', 10, { outline })

    // Step 2: Generate each phase
    const completedPhases: GeneratedPhase[] = []

    for (let i = 0; i < outline.phases.length; i++) {
      const phaseConfig = outline.phases[i]
      const phaseNumber = i + 1
      const progressBase = 10 + ((i / outline.phases.length) * 80)

      await updateProgress(sessionId, {
        status: 'GENERATING_PHASE',
        currentPhase: phaseNumber,
        progressPercent: Math.round(progressBase),
        progressMessage: t(
          context,
          `Generating ${phaseConfig.name} (phase ${phaseNumber}/${outline.phases.length})...`,
          `Genererar ${phaseConfig.name} (fas ${phaseNumber}/${outline.phases.length})...`
        ),
      })

      // Generate phase with retry
      const phase = await generatePhaseWithRetry(
        phaseConfig,
        completedPhases,
        context,
        outline,
        apiKey,
        provider,
        modelId,
        systemPrompt,
        aiMeta,
      )

      completedPhases.push(phase)

      // Save phase to session
      await prisma.programGenerationSession.update({
        where: { id: sessionId },
        data: {
          phases: {
            push: phase as object,
          },
          currentPhase: phaseNumber,
        },
      })

      await logProgress(
        sessionId,
        `phase_${phaseNumber}`,
        t(context, `${phaseConfig.name} generated`, `${phaseConfig.name} genererad`),
        Math.round(progressBase + (80 / outline.phases.length)),
        { phaseNumber, phaseName: phaseConfig.name }
      )
    }

    // Step 3: Merge phases
    await updateProgress(sessionId, {
      status: 'MERGING',
      progressPercent: 95,
      progressMessage: t(context, 'Assembling the program...', 'Sammanställer programmet...'),
    })

    const mergedProgram = mergePhases(completedPhases, outline)
    const validation = validateMergedProgram(mergedProgram)

    if (!validation.valid) {
      throw new Error(`Program validation failed: ${validation.errors.join(', ')}`)
    }

    // Step 4: Complete
    await prisma.programGenerationSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        mergedProgram: mergedProgram as object,
        progressPercent: 100,
        progressMessage: t(context, 'The program is ready!', 'Programmet är klart!'),
        completedAt: new Date(),
      },
    })

    await logProgress(sessionId, 'complete', t(context, 'The program is ready!', 'Programmet är klart!'), 100, {
      totalWeeks: mergedProgram.totalWeeks,
      totalPhases: mergedProgram.phases.length,
      warnings: validation.warnings,
    })

    return mergedProgram
  } catch (error) {
    // Handle failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await prisma.programGenerationSession.update({
      where: { id: sessionId },
      data: {
        status: 'FAILED',
        errorMessage,
        errorCode: 'GENERATION_FAILED',
        completedAt: new Date(),
      },
    })

    await logProgress(sessionId, 'error', errorMessage, 0, { error: errorMessage })

    throw error
  }
}

// ============================================
// Outline Generation
// ============================================

async function generateOutlineWithRetry(
  context: GenerationContext,
  apiKey: string,
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI',
  modelId?: string,
  systemPrompt?: string,
  aiMeta?: ProgramGenerationAiMeta
): Promise<ProgramOutline> {
  const prompt = buildOutlinePrompt(context)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callAI(prompt, apiKey, provider, modelId, systemPrompt, aiMeta, 'program_generation_outline')
      return parseOutlineResponse(response)
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to generate outline after ${MAX_RETRIES} attempts: ${error}`)
      }
      await delay(RETRY_DELAY_MS * attempt) // Exponential backoff
    }
  }

  throw new Error('Unexpected error in outline generation')
}

// ============================================
// Phase Generation
// ============================================

async function generatePhaseWithRetry(
  phaseConfig: PhaseConfig,
  previousPhases: GeneratedPhase[],
  context: GenerationContext,
  outline: ProgramOutline,
  apiKey: string,
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI',
  modelId?: string,
  systemPrompt?: string,
  aiMeta?: ProgramGenerationAiMeta
): Promise<GeneratedPhase> {
  // Enrich phase config with week numbers
  const { startWeek, endWeek } = parseWeekRange(phaseConfig.weeks)
  const enrichedConfig: PhaseConfig = {
    ...phaseConfig,
    startWeek,
    endWeek,
  }

  const prompt = buildPhasePrompt(enrichedConfig, previousPhases, context, outline)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callAI(prompt, apiKey, provider, modelId, systemPrompt, aiMeta, 'program_generation_phase')
      return parsePhaseResponse(response)
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Failed to generate phase ${phaseConfig.phaseNumber} after ${MAX_RETRIES} attempts: ${error}`
        )
      }
      await delay(RETRY_DELAY_MS * attempt)
    }
  }

  throw new Error(`Unexpected error in phase ${phaseConfig.phaseNumber} generation`)
}

// ============================================
// AI Provider Calls
// ============================================

async function callAI(
  prompt: string,
  apiKey: string,
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI',
  modelId?: string,
  systemPrompt?: string,
  aiMeta?: ProgramGenerationAiMeta,
  category = 'program_generation'
): Promise<string> {
  const system = systemPrompt || PROGRAM_GENERATOR_SYSTEM_PROMPT

  switch (provider) {
    case 'ANTHROPIC':
      return callAnthropic(prompt, apiKey, system, modelId, aiMeta, category)
    case 'GOOGLE':
      return callGoogle(prompt, apiKey, system, modelId, aiMeta, category)
    case 'OPENAI':
      return callOpenAI(prompt, apiKey, system, modelId, aiMeta, category)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

async function callAnthropic(
  prompt: string,
  apiKey: string,
  systemPrompt: string,
  modelId?: string,
  aiMeta?: ProgramGenerationAiMeta,
  category = 'program_generation'
): Promise<string> {
  const { createAnthropic } = await import('@ai-sdk/anthropic')
  const { generateText } = await import('ai')

  const anthropic = createAnthropic({ apiKey })
  const model = modelId || 'claude-sonnet-4-6'

  const result = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    prompt,
    maxOutputTokens: 16000,
  })

  logProgramGenerationUsage('ANTHROPIC', model, result.usage, aiMeta, category)

  return result.text
}

async function callGoogle(
  prompt: string,
  apiKey: string,
  systemPrompt: string,
  modelId?: string,
  aiMeta?: ProgramGenerationAiMeta,
  category = 'program_generation'
): Promise<string> {
  const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
  const { generateText } = await import('ai')

  const google = createGoogleGenerativeAI({ apiKey })
  const model = normalizeAIModelId(modelId || 'gemini-3.5-flash')

  const result = await generateText({
    model: google(model),
    system: systemPrompt,
    prompt,
    maxOutputTokens: 16000,
  })

  logProgramGenerationUsage('GOOGLE', model, result.usage, aiMeta, category)

  return result.text
}

async function callOpenAI(
  prompt: string,
  apiKey: string,
  systemPrompt: string,
  modelId?: string,
  aiMeta?: ProgramGenerationAiMeta,
  category = 'program_generation'
): Promise<string> {
  const { createOpenAI } = await import('@ai-sdk/openai')
  const { generateText } = await import('ai')

  const openai = createOpenAI({ apiKey })
  const model = modelId || 'gpt-5.5'

  const result = await generateText({
    model: openai(model),
    system: systemPrompt,
    prompt,
    maxOutputTokens: 32000, // GPT-5.5 supports larger output
  })

  logProgramGenerationUsage('OPENAI', model, result.usage, aiMeta, category)

  return result.text
}

function logProgramGenerationUsage(
  provider: AiProviderTag,
  model: string,
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
  aiMeta: ProgramGenerationAiMeta | undefined,
  category: string,
): void {
  logAiUsage({
    userId: aiMeta?.userId,
    clientId: aiMeta?.clientId,
    category,
    provider,
    model,
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
  })
}

// ============================================
// Progress Tracking
// ============================================

async function updateProgress(
  sessionId: string,
  data: {
    status?: ProgramGenerationStatus
    currentPhase?: number
    progressPercent?: number
    progressMessage?: string
  }
): Promise<void> {
  await prisma.programGenerationSession.update({
    where: { id: sessionId },
    data: {
      ...data,
      ...(data.status === 'GENERATING_OUTLINE' || data.status === 'GENERATING_PHASE'
        ? { startedAt: new Date() }
        : {}),
    },
  })
}

async function logProgress(
  sessionId: string,
  step: string,
  message: string,
  percent: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.programGenerationProgress.create({
    data: {
      sessionId,
      step,
      message,
      percent,
      metadata: metadata as object,
    },
  })
}

// ============================================
// Utilities
// ============================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function t(context: GenerationContext, en: string, sv: string): string {
  return context.locale === 'sv' ? sv : en
}

// ============================================
// Resume Support
// ============================================

/**
 * Resume a partially completed generation
 * Used when recovering from failures or server restarts
 */
export async function resumeGeneration(sessionId: string, apiKey: string): Promise<MergedProgram | null> {
  const session = await prisma.programGenerationSession.findUnique({
    where: { id: sessionId },
  })

  if (!session) {
    throw new Error('Session not found')
  }

  if (session.status === 'COMPLETED') {
    return session.mergedProgram as unknown as MergedProgram
  }

  if (session.status === 'FAILED') {
    // Reset for retry
    await prisma.programGenerationSession.update({
      where: { id: sessionId },
      data: {
        status: 'PENDING',
        errorMessage: null,
        errorCode: null,
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    })
  }

  // Reconstruct context and continue
  const context = session.athleteContext as unknown as GenerationContext

  return generateMultiPartProgram({
    sessionId,
    context,
    apiKey,
    provider: (session.provider as 'ANTHROPIC' | 'GOOGLE' | 'OPENAI') || 'ANTHROPIC',
    modelId: session.modelUsed || undefined,
  })
}
