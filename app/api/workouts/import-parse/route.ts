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
 * - file normalization (Excel/CSV/PDF/text/image) is implemented locally
 *   here rather than imported because the program route has it as private
 *   functions; consolidating both later is a worthwhile follow-up.
 * - exercise resolution reuses `lib/ai/exercise-resolver.ts` (Exercise pool).
 * - drill resolution uses an inline AgilityDrill matcher (small, scoped).
 * - rate limiting + caching reuse the same primitives.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { prisma } from '@/lib/prisma'
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

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_TEXT_CHARS = 200_000

const PARSE_CACHE_TTL_MS = 60 * 60 * 1000
const parseCache = createDistributedJsonCache<{
  aiOutput: string
  modelDisplayName: string
}>('workouts:import-parse:v1')

const VISION_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])

type NormalizedInput = {
  kind: 'text' | 'excel' | 'csv' | 'pdf' | 'image'
  body: string
  imageBuffer?: Buffer
  imageMimeType?: string
  filename?: string
  truncated: boolean
}

class EmptyPdfError extends Error {
  constructor(filename: string) {
    super(
      `Could not read text from "${filename}" — the PDF looks like a scan with no text layer. Export the pages as images (PNG/JPG) and upload those instead.`
    )
    this.name = 'EmptyPdfError'
  }
}

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
        normalized = {
          kind: 'text',
          body: pastedText.slice(0, MAX_TEXT_CHARS),
          truncated: pastedText.length > MAX_TEXT_CHARS,
        }
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
 * Lightweight AgilityDrill matcher. Drill libraries are small and names are
 * highly canonical ("5-10-5", "T-Test", "Illinois Agility"), so we don't
 * need the full alias / token-tier scoring the Exercise resolver does. If
 * matching quality becomes an issue, refactor by extracting the scoring
 * helpers from `exercise-resolver.ts` into a shared module.
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
        const score = bestDrillScore(name, d)
        return {
          id: d.id,
          name: d.name,
          nameSv: d.nameSv,
          // Mirror the Resolution Candidate shape the client uses for
          // exercises — extra fields are ignored, missing ones default to
          // null. category lands on `biomechanicalPillar` since the panel
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

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function bestDrillScore(
  query: string,
  drill: { name: string; nameSv: string | null }
): number {
  const candidates = [drill.name, drill.nameSv].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  )
  let best = 0
  for (const c of candidates) {
    const s = pairScoreSimple(query, c)
    if (s > best) best = s
  }
  return best
}

function pairScoreSimple(query: string, candidate: string): number {
  const q = normalizeName(query)
  const c = normalizeName(candidate)
  if (!q || !c) return 0
  if (q === c) return 1
  if (c.startsWith(q) || c.endsWith(q) || q.startsWith(c) || q.endsWith(c)) {
    const ratio = Math.min(q.length, c.length) / Math.max(q.length, c.length)
    return 0.8 + 0.15 * ratio
  }
  if (c.includes(q) || q.includes(c)) {
    const ratio = Math.min(q.length, c.length) / Math.max(q.length, c.length)
    return 0.65 + 0.1 * ratio
  }
  // Token overlap fallback.
  const qTokens = q.split(/\s+/).filter((t) => t.length >= 2)
  const cTokens = new Set(c.split(/\s+/).filter((t) => t.length >= 2))
  if (qTokens.length === 0 || cTokens.size === 0) return 0
  const present = qTokens.filter((t) => cTokens.has(t))
  const coverage = present.length / qTokens.length
  if (coverage === 1) return 0.7
  if (coverage >= 0.5) return 0.4 + 0.2 * coverage
  return 0
}

// ─── File normalization ─────────────────────────────────────────────────────

async function normalizeFile(file: File): Promise<NormalizedInput> {
  const name = file.name || 'upload'
  const lower = name.toLowerCase()
  const type = file.type || ''

  if (
    VISION_MIME_TYPES.has(type) ||
    /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(lower)
  ) {
    const buf = Buffer.from(await file.arrayBuffer())
    return {
      kind: 'image',
      body: `IMAGE: ${name}`,
      imageBuffer: buf,
      imageMimeType: resolveImageMimeType(lower, type),
      filename: name,
      truncated: false,
    }
  }

  if (
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    type.includes('spreadsheetml') ||
    type === 'application/vnd.ms-excel'
  ) {
    const buf = Buffer.from(await file.arrayBuffer())
    const body = await excelToText(buf)
    return maybeTruncate({ kind: 'excel', body, filename: name })
  }

  if (lower.endsWith('.csv') || type === 'text/csv') {
    const raw = await file.text()
    const body = `CSV FILE: ${name}\n\n${raw}`
    return maybeTruncate({ kind: 'csv', body, filename: name })
  }

  if (lower.endsWith('.pdf') || type === 'application/pdf') {
    const buf = Buffer.from(await file.arrayBuffer())
    const body = await pdfToText(buf, name)
    const textLength = body.replace(/\bPDF FILE:[^\n]+\n\n/, '').trim().length
    if (textLength < 40) {
      throw new EmptyPdfError(name)
    }
    return maybeTruncate({ kind: 'pdf', body, filename: name })
  }

  const raw = await file.text()
  return maybeTruncate({
    kind: 'text',
    body: `TEXT FILE: ${name}\n\n${raw}`,
    filename: name,
  })
}

function maybeTruncate(
  n: Omit<NormalizedInput, 'truncated'>
): NormalizedInput {
  if (n.body.length > MAX_TEXT_CHARS) {
    return { ...n, body: n.body.slice(0, MAX_TEXT_CHARS), truncated: true }
  }
  return { ...n, truncated: false }
}

function guessImageMimeFromName(lower: string): string {
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic'
  return 'image/jpeg'
}

function resolveImageMimeType(lower: string, browserType: string): string {
  const byName = guessImageMimeFromName(lower)
  if (!browserType) return byName
  if ((byName === 'image/heic' || byName === 'image/heif') && browserType !== byName) {
    return byName
  }
  if (byName === 'image/webp' && browserType === 'image/jpeg') return byName
  return browserType
}

async function excelToText(buf: Buffer): Promise<string> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as ArrayBuffer)

  const toCell = (v: unknown): string => {
    let raw: string
    if (v == null) raw = ''
    else if (typeof v === 'object' && 'richText' in (v as object)) {
      raw = (v as { richText: { text: string }[] }).richText
        .map((r) => r.text)
        .join('')
    } else if (typeof v === 'object' && 'result' in (v as object)) {
      const r = (v as { result: unknown }).result
      raw = r == null ? '' : String(r)
    } else if (v instanceof Date) {
      raw = v.toISOString().slice(0, 10)
    } else {
      raw = String(v)
    }
    return raw
      .replace(/\r\n|\r|\n/g, ' · ')
      .replace(/\s+/g, ' ')
      .replace(/\|/g, '\\|')
      .trim()
  }

  const out: string[] = []
  wb.eachSheet((sheet) => {
    const rows: string[][] = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = []
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (
          cell.type === ExcelJS.ValueType.Merge ||
          (cell.isMerged && cell.master && cell.master !== cell)
        ) {
          cells.push('')
          return
        }
        cells.push(toCell(cell.value))
      })
      if (cells.some((c) => c.length > 0)) rows.push(cells)
    })
    out.push(`# Sheet: ${sheet.name}`)
    if (rows.length > 0) {
      const width = Math.max(...rows.map((r) => r.length))
      for (const r of rows) {
        while (r.length < width) r.push('')
        out.push('| ' + r.join(' | ') + ' |')
      }
    }
    out.push('')
  })
  return out.join('\n')
}

async function pdfToText(buf: Buffer, filename: string): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buf })
  try {
    const res = await parser.getText()
    return `PDF FILE: ${filename}\n\n${res.text}`
  } finally {
    await parser.destroy().catch(() => {})
  }
}
