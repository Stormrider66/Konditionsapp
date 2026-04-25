/**
 * Workout Importer — Parse
 *
 * POST /api/workouts/import-parse
 *
 * Mirrors the program importer (`/api/programs/import-parse`) but for a
 * SINGLE workout in one of four studio shapes (STRENGTH / CARDIO / HYBRID
 * / AGILITY). The client passes `workoutType` alongside the pasted text or
 * uploaded file; the route dispatches to the right Zod schema + system
 * prompt and returns parsed JSON the studio can hand to its existing builder.
 *
 * Sharing with the program importer:
 * - file normalization → `lib/ai/file-normalize.ts`
 * - exercise scoring → `lib/ai/library-name-match.ts`
 * - exercise resolution → `lib/ai/exercise-resolver.ts` (Exercise pool)
 * - drill resolution uses the same scoring against AgilityDrill, inline.
 * - rate limiting + caching reuse the same primitives.
 *
 * Telemetry: writes to the shared `ImportAttempt` table. The model
 * doesn't carry a workoutType column today — split program- vs
 * workout-importer rows by `inputHash` patterns or by adding a column
 * later if segmentation becomes load-bearing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import {
  resolveExtractionModel,
  type ModelIntent,
  type AIProvider,
  isModelIntent,
} from '@/types/ai-models'
import { createModelInstance, generationTuning } from '@/lib/ai/create-model'
import { generateText } from 'ai'
import { createHash } from 'node:crypto'
import { createDistributedJsonCache } from '@/lib/distributed-json-cache'
import {
  parseAIWorkout,
  systemPromptForType,
  importTypeNeedsResolution,
  extractResolvableNames,
  type WorkoutImportType,
  WorkoutImportTypeSchema,
} from '@/lib/ai/workout-parser'
import {
  resolveExercises,
  type Resolution,
} from '@/lib/ai/exercise-resolver'
import {
  normalizeFile,
  normalizeText,
  MAX_FILE_BYTES,
  type NormalizedInput,
} from '@/lib/ai/file-normalize'
import { scoreNameAgainstRow } from '@/lib/ai/library-name-match'

export const runtime = 'nodejs'
export const maxDuration = 300

const PARSE_CACHE_TTL_MS = 60 * 60 * 1000
const parseCache = createDistributedJsonCache<{
  aiOutput: string
  modelDisplayName: string
}>('workouts:import-parse:v1')

export async function POST(request: NextRequest) {
  try {
    // Coach-only for v1. Athletes hitting this directly is uncommon — they
    // have their own program-importer entry point if/when that's needed.
    const coach = await requireCoach()
    const callerUserId = coach.id
    const aiKeyOwnerId = coach.id

    const limited = await rateLimitJsonResponse(
      'workouts:import-parse',
      callerUserId,
      { limit: 30, windowSeconds: 60 }
    )
    if (limited) return limited

    const contentType = request.headers.get('content-type') || ''

    let pastedText = ''
    let file: File | null = null
    let intentOverride: ModelIntent | undefined
    let providerOverride: AIProvider | undefined
    let workoutType: WorkoutImportType | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const text = form.get('text')
      if (typeof text === 'string') pastedText = text
      const maybeFile = form.get('file')
      if (maybeFile instanceof File && maybeFile.size > 0) file = maybeFile
      const intent = form.get('intent')
      if (typeof intent === 'string' && isModelIntent(intent)) intentOverride = intent
      const provider = form.get('provider')
      if (provider === 'anthropic' || provider === 'google' || provider === 'openai') {
        providerOverride = provider
      }
      const wt = form.get('workoutType')
      const parsedType = WorkoutImportTypeSchema.safeParse(wt)
      if (parsedType.success) workoutType = parsedType.data
    } else {
      const body = await request.json().catch(() => ({}))
      if (typeof body?.text === 'string') pastedText = body.text
      if (isModelIntent(body?.intent)) intentOverride = body.intent
      if (
        body?.provider === 'anthropic' ||
        body?.provider === 'google' ||
        body?.provider === 'openai'
      ) {
        providerOverride = body.provider
      }
      const parsedType = WorkoutImportTypeSchema.safeParse(body?.workoutType)
      if (parsedType.success) workoutType = parsedType.data
    }

    if (!workoutType) {
      return NextResponse.json(
        { error: 'workoutType is required (STRENGTH | CARDIO | HYBRID | AGILITY)' },
        { status: 400 }
      )
    }

    if (file && file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_FILE_BYTES / (1024 * 1024)} MB.` },
        { status: 413 }
      )
    }

    let normalized: NormalizedInput | null = null
    try {
      if (file) {
        normalized = await normalizeFile(file)
      } else if (pastedText.trim().length > 0) {
        normalized = normalizeText(pastedText)
      }
    } catch (e) {
      logger.error('Failed to pre-process workout import input', {}, e)
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : 'Could not read the uploaded file',
        },
        { status: 400 }
      )
    }

    if (!normalized) {
      return NextResponse.json(
        { error: 'Provide either pasted text or a file to import' },
        { status: 400 }
      )
    }
    if (normalized.kind !== 'image' && normalized.body.trim().length === 0) {
      return NextResponse.json(
        { error: 'The input is empty — paste some text or upload a file with content' },
        { status: 400 }
      )
    }

    const keys = await getResolvedAiKeys(aiKeyOwnerId)
    // Single workouts are smaller payloads than full programs so the
    // 'looksRich' auto-bump from the program importer is unnecessary —
    // honour the caller's tier or default to balanced. Images still always
    // route to a vision-capable model.
    const intent: ModelIntent =
      normalized.kind === 'image' ? 'powerful' : intentOverride ?? 'balanced'
    const resolved = resolveExtractionModel(keys, intent, providerOverride)
    if (!resolved) {
      return NextResponse.json(
        {
          error:
            'No AI provider configured. Add an API key in settings to use the workout importer.',
        },
        { status: 400 }
      )
    }

    const model = createModelInstance(resolved)
    const systemPrompt = systemPromptForType(workoutType)
    const prompt = buildPrompt(normalized, workoutType)

    const cacheKey = computeCacheKey(
      normalized.body,
      normalized.imageBuffer,
      intent,
      `${resolved.provider}:${resolved.modelId}`,
      workoutType
    )
    let aiOutput: string
    let cacheHit = false
    const warningsFromGen: string[] = []
    const cached = await parseCache.get(cacheKey)
    if (cached) {
      aiOutput = cached.payload.aiOutput
      cacheHit = true
    } else {
      // Single-workout JSON is smaller than a full program; 16k is plenty
      // for any sane strength/cardio/hybrid workout. Opus 4.7 still gets a
      // wider budget for its extended-thinking tokens.
      const MAX_OUTPUT_TOKENS =
        resolved.provider === 'anthropic' && resolved.modelId === 'claude-opus-4-7'
          ? 64_000
          : 16_000
      const tempField = generationTuning(resolved.modelId, { temperature: 0.1 })
      const result =
        normalized.kind === 'image' && normalized.imageBuffer
          ? await generateText({
              model,
              system: systemPrompt,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    {
                      type: 'image',
                      image: normalized.imageBuffer,
                      mediaType: normalized.imageMimeType || 'image/png',
                    },
                  ],
                },
              ],
              ...tempField,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
            })
          : await generateText({
              model,
              system: systemPrompt,
              prompt,
              ...tempField,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
            })
      aiOutput = result.text
      logger.info('workout import-parse model output excerpt', {
        provider: resolved.provider,
        modelId: resolved.modelId,
        workoutType,
        finishReason: result.finishReason,
        outputLength: aiOutput.length,
        excerpt: aiOutput.slice(0, 600),
      })
      if (result.finishReason === 'length') {
        warningsFromGen.push(
          'The model ran out of output tokens and may have truncated the workout. Try the Powerful tier or split the source.'
        )
      } else {
        const expiresAt = Date.now() + PARSE_CACHE_TTL_MS
        await parseCache.set(cacheKey, {
          expiresAt,
          staleUntil: expiresAt,
          payload: { aiOutput, modelDisplayName: resolved.displayName },
        })
      }
    }

    // Validate against the per-type schema. Failure is reported but not
    // fatal — the dialog can still display warnings and let the coach map
    // unmatched names manually.
    const parsed = parseAIWorkout(aiOutput, workoutType)
    const warnings: string[] = [...warningsFromGen]
    if (normalized.truncated) {
      warnings.push(
        'Input was truncated before sending to the model; review the result carefully.'
      )
    }
    if (!parsed.success) {
      warnings.push(
        `Model output did not fully match the ${workoutType.toLowerCase()} schema: ${parsed.error}`
      )
    }

    // ─── Resolve names against libraries ───────────────────────────────────
    let resolutions: Resolution[] = []
    if (parsed.success && importTypeNeedsResolution(workoutType)) {
      try {
        const names = extractResolvableNames(parsed.workout)
        if (names.length > 0) {
          if (workoutType === 'AGILITY') {
            resolutions = await resolveDrillNames(names, aiKeyOwnerId)
          } else {
            // STRENGTH + HYBRID both resolve against Exercise.
            const res = await resolveExercises({
              names,
              aliasOwnerId: aiKeyOwnerId,
              accessWhere: {
                OR: [{ isPublic: true }, { coachId: aiKeyOwnerId }],
              },
            })
            resolutions = res.resolutions
          }
        }
      } catch (e) {
        logger.error('Resolver failed during workout import-parse', {}, e)
        warnings.push(
          'Library matching was unavailable — you can still publish; unmatched names stay as free text and can be linked later.'
        )
      }
    }

    // Telemetry: one row per attempt, fire-and-forget. A failed log
    // write can't fail the user-facing response.
    const autoMappedCount = resolutions.filter((r) => !!r.bestMatch).length
    recordImportAttempt({
      // Tag the per-type so future analytics can split workout vs program
      // imports by prefixing the inputKind. The dedicated `workoutType`
      // column would be cleaner — left as a follow-up.
      userId: callerUserId,
      coachId: aiKeyOwnerId,
      athleteClientId: null,
      inputKind: `workout:${workoutType.toLowerCase()}:${normalized.kind}`,
      modelUsed: resolved.displayName,
      intent,
      parsedOk: parsed.success,
      warningCount: warnings.length,
      resolutionCount: resolutions.length,
      autoMappedCount,
      cached: cacheHit,
      inputHash: cacheKey,
    })

    return NextResponse.json({
      success: true,
      workoutType,
      // Hand back the validated workout when we have one — that's what the
      // dialog feeds straight into the builder. Fall back to the raw AI
      // output so failure modes are still recoverable client-side.
      workout: parsed.success ? parsed.workout : null,
      aiOutput,
      parsedOk: parsed.success,
      warnings,
      modelUsed: resolved.displayName,
      inputKind: normalized.kind,
      resolutions,
      cached: cacheHit,
    })
  } catch (error: unknown) {
    logger.error('Workout import-parse failed', {}, error)
    const msg =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: msg },
      { status: msg.startsWith('Forbidden') ? 403 : 500 }
    )
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Write an ImportAttempt row without blocking the response. Logs but
 * swallows any error — telemetry is never critical path.
 */
function recordImportAttempt(data: Prisma.ImportAttemptUncheckedCreateInput) {
  void prisma.importAttempt
    .create({ data })
    .catch((e) => {
      logger.warn('Failed to record workout ImportAttempt', {}, e)
    })
}

function computeCacheKey(
  body: string,
  imageBuffer: Buffer | undefined,
  intent: string,
  modelId: string,
  workoutType: WorkoutImportType
): string {
  const h = createHash('sha256')
  h.update(workoutType).update('|').update(intent).update('|').update(modelId).update('|')
  if (imageBuffer) h.update(imageBuffer)
  else h.update(body)
  return h.digest('hex')
}

function buildPrompt(
  input: NormalizedInput,
  workoutType: WorkoutImportType
): string {
  const header = `Workout type: ${workoutType}\nSource: ${input.kind}${input.filename ? ` (${input.filename})` : ''}`
  const truncWarning = input.truncated
    ? '\n\nNOTE: Input was truncated at 200k chars. Use what is available.'
    : ''
  if (input.kind === 'image') {
    return (
      `${header}\n\nThe user has uploaded an image of a single ${workoutType.toLowerCase()} ` +
      `workout (whiteboard photo, screenshot, page from a PDF, handwritten note). ` +
      `Read the image carefully — handwriting, tables, abbreviations, Swedish/English ` +
      `mixed text. List anything uncertain in the top-level "notes" field.\n\n` +
      `Extract the workout JSON now.`
    )
  }
  return `${header}${truncWarning}\n\nInput:\n"""\n${input.body}\n"""\n\nExtract the workout JSON now.`
}

// ─── Drill name resolver (AgilityDrill pool) ────────────────────────────────

const AUTO_ASSIGN_THRESHOLD = 0.95
const POOL_CAP = 300

/**
 * AgilityDrill matcher. Reuses the same tiered scoring as the Exercise
 * resolver via `scoreNameAgainstRow` so identical inputs grade identically
 * across libraries. Drills don't have an alias table (yet) — if matching
 * quality becomes a recurring problem, mirror `ExerciseNameAlias` for
 * `AgilityDrill`.
 */
async function resolveDrillNames(
  names: string[],
  coachId: string
): Promise<Resolution[]> {
  const unique = Array.from(
    new Set(
      names
        .map((n) => (typeof n === 'string' ? n.trim() : ''))
        .filter((n) => n.length > 0)
    )
  )
  if (unique.length === 0) return []

  const drills = await prisma.agilityDrill.findMany({
    where: {
      OR: [{ isSystemDrill: true }, { coachId }],
    },
    select: {
      id: true,
      name: true,
      nameSv: true,
      category: true,
    },
    take: POOL_CAP,
  })

  return unique.map((name) => {
    const scored = drills
      .map((d) => {
        const score = scoreNameAgainstRow(name, d)
        return {
          id: d.id,
          name: d.name,
          nameSv: d.nameSv,
          // Mirror the Resolution Candidate shape the client uses for
          // exercises — extra fields are ignored, missing ones default to
          // null. Category lands on `biomechanicalPillar` since the panel
          // renders that as a sub-label.
          nameEn: null as string | null,
          category: d.category,
          biomechanicalPillar: d.category,
          equipment: null as string | null,
          score,
        }
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    const bestMatch =
      scored[0] && scored[0].score >= AUTO_ASSIGN_THRESHOLD ? scored[0] : null
    return { name, bestMatch, candidates: scored }
  })
}

