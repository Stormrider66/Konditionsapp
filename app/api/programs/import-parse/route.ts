/**
 * Program Importer — Parse
 *
 * POST /api/programs/import-parse
 *
 * Accepts pasted text or an uploaded file (Excel/CSV/PDF/plain text) and
 * asks the user's configured AI provider to extract a ParsedProgram that
 * matches `lib/ai/program-parser.ts` ProgramSchema. The JSON string is
 * returned so the client can hydrate `<EnhancedProgramPreview content={...}/>`
 * which already handles validation, normalization, and review.
 *
 * Input sources are pre-processed server-side:
 * - Excel/CSV → exceljs → sheet JSON
 * - PDF      → pdf-parse → text
 * - text     → forwarded as-is
 *
 * Model routing: `resolveModel(keys, 'balanced')` — Gemini 3 Flash first
 * (cheap, fast, good JSON extraction), falls back to Claude Sonnet / GPT mini
 * based on available BYOK. Users with only an Anthropic key still work.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, resolveAthleteClientId } from '@/lib/auth-utils'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { resolveModel, type ModelIntent, isModelIntent } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { generateText } from 'ai'
import { createHash } from 'node:crypto'
import { parseAIProgram } from '@/lib/ai/program-parser'
import { extractExerciseNames } from '@/lib/ai/program-exercise-resolver'
import {
  resolveExercises,
  type Resolution,
} from '@/lib/ai/exercise-resolver'
import { createDistributedJsonCache } from '@/lib/distributed-json-cache'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB upper bound
const MAX_TEXT_CHARS = 200_000 // guard against absurd paste sizes

// Parse responses are expensive (AI round-trip + optional vision). Cache by
// a hash of the exact input so re-uploading the same Excel or pasting the
// same text twice is free. Shared via Upstash when configured, falls back
// to an in-process LRU. 1h TTL — long enough to cover an iteration cycle,
// short enough that coaches tweaking the source file get fresh runs.
const PARSE_CACHE_TTL_MS = 60 * 60 * 1000
const parseCache = createDistributedJsonCache<{
  aiOutput: string
  modelDisplayName: string
}>('programs:import-parse:v2') // bump when SYSTEM_PROMPT meaningfully changes

function computeCacheKey(
  body: string,
  imageBuffer: Buffer | undefined,
  intent: string,
  modelId: string
): string {
  const h = createHash('sha256')
  h.update(intent).update('|').update(modelId).update('|')
  if (imageBuffer) h.update(imageBuffer)
  else h.update(body)
  return h.digest('hex')
}

type NormalizedInput = {
  kind: 'text' | 'excel' | 'csv' | 'pdf' | 'image'
  /** Human-readable representation that will be embedded in the model prompt */
  body: string
  /** Image bytes when kind==='image' (sent multimodally to a vision model). */
  imageBuffer?: Buffer
  imageMimeType?: string
  /** Original filename, if any */
  filename?: string
  /** Truncation flag so the caller can surface a warning */
  truncated: boolean
}

const VISION_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])

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
    // Dual-auth: coaches import for their athletes, athletes import for
    // themselves. Athletes borrow their coach's AI keys, same pattern as
    // other athlete-facing AI features in the app.
    let callerUserId: string
    let aiKeyOwnerId: string
    let athleteClientId: string | null = null
    try {
      const coach = await requireCoach()
      callerUserId = coach.id
      aiKeyOwnerId = coach.id
    } catch {
      const resolved = await resolveAthleteClientId()
      if (!resolved) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      callerUserId = resolved.user.id
      athleteClientId = resolved.clientId
      // AI keys for athletes live on their coach record. Direct athletes
      // (no coach) can't use the importer — fail loudly rather than silently
      // falling back to the athlete's own (empty) key set.
      const client = await prisma.client.findUnique({
        where: { id: resolved.clientId },
        select: { userId: true },
      })
      if (!client?.userId || client.userId === resolved.user.id) {
        return NextResponse.json(
          {
            error:
              'The program importer requires a coach account with AI keys. Ask your coach to enable it, or contact support if you believe this is an error.',
          },
          { status: 400 }
        )
      }
      aiKeyOwnerId = client.userId
    }

    const limited = await rateLimitJsonResponse('programs:import-parse', callerUserId, {
      limit: 20,
      windowSeconds: 60,
    })
    if (limited) return limited

    const contentType = request.headers.get('content-type') || ''

    let pastedText = ''
    let file: File | null = null
    let intentOverride: ModelIntent | undefined

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const text = form.get('text')
      if (typeof text === 'string') pastedText = text
      const maybeFile = form.get('file')
      if (maybeFile instanceof File && maybeFile.size > 0) {
        file = maybeFile
      }
      const intent = form.get('intent')
      if (typeof intent === 'string' && isModelIntent(intent)) {
        intentOverride = intent
      }
    } else {
      const body = await request.json().catch(() => ({}))
      if (typeof body?.text === 'string') pastedText = body.text
      if (isModelIntent(body?.intent)) intentOverride = body.intent
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
      logger.error('Failed to pre-process import input', {}, e)
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
    // Images don't carry a text body — everything else must, though, or the
    // model has nothing to extract from.
    if (normalized.kind !== 'image' && normalized.body.trim().length === 0) {
      return NextResponse.json(
        { error: 'The input is empty — paste some text or upload a file with content' },
        { status: 400 }
      )
    }

    const keys = await getResolvedAiKeys(aiKeyOwnerId)
    // Model routing:
    //   - Images always route to a vision-capable model (all three providers'
    //     'powerful' tier supports vision).
    //   - Rich inputs auto-bump to 'powerful' unless the caller explicitly
    //     asked for 'fast'. Signals:
    //       * body > 12k chars (a meaty program, even after Excel dedup)
    //       * excel / pdf kind (multi-sheet or multi-page sources that
    //         benefit from longer-context, more-careful models)
    //       * density heuristic: > 80 pipe-table rows (strong sign of a
    //         structured per-exercise table)
    //     Gemini Flash truncates output on 30+ exercise programs; Pro /
    //     Opus / GPT-5.4 hold the load reliably.
    //   - Otherwise honour the caller's choice, defaulting to 'balanced'.
    const looksRich =
      normalized.body.length > 12_000 ||
      normalized.kind === 'excel' ||
      normalized.kind === 'pdf' ||
      (normalized.body.match(/\n\| /g)?.length ?? 0) > 80
    const intent: ModelIntent =
      normalized.kind === 'image'
        ? 'powerful'
        : looksRich && intentOverride !== 'fast'
          ? 'powerful'
          : intentOverride ?? 'balanced'
    const resolved = resolveModel(keys, intent)
    if (!resolved) {
      return NextResponse.json(
        {
          error:
            'No AI provider configured. Add an API key in settings to use the program importer.',
        },
        { status: 400 }
      )
    }

    const model = createModelInstance(resolved)
    const prompt = buildPrompt(normalized)

    // Cache lookup — identical input + model returns the prior parse.
    const cacheKey = computeCacheKey(
      normalized.body,
      normalized.imageBuffer,
      intent,
      resolved.modelId
    )
    let aiOutput: string
    let cacheHit = false
    const warningsFromGen: string[] = []
    const cached = await parseCache.get(cacheKey)
    if (cached) {
      aiOutput = cached.payload.aiOutput
      cacheHit = true
    } else {
      // The AI SDK defaults are conservative (often 4096) and a rich program
      // JSON is well past that. Set the budget high enough that a 2-week,
      // 30-exercise strength program can't get truncated mid-JSON. Actual
      // provider caps clamp this if we overshoot.
      const MAX_OUTPUT_TOKENS = 32_000
      const result =
        normalized.kind === 'image' && normalized.imageBuffer
          ? await generateText({
              model,
              system: SYSTEM_PROMPT,
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
              temperature: 0.1,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
            })
          : await generateText({
              model,
              system: SYSTEM_PROMPT,
              prompt,
              temperature: 0.1,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
            })
      aiOutput = result.text
      // Surface a loud warning if the model ran out of output budget — the
      // JSON is likely truncated mid-segment and the preview will recover
      // only partially. Don't cache truncated responses; we want the next
      // attempt to retry fresh (possibly at a higher tier).
      if (result.finishReason === 'length') {
        warningsFromGen.push(
          'The model ran out of output tokens and truncated the program mid-way. Try "Fixa format" to re-run at a higher tier, or split the source into smaller chunks.'
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

    // Validate the result is actually parseable so we don't hand the editor
    // something it will choke on. We don't block on validation failure — the
    // editor has a "Fixa format" recovery path — but we do surface warnings.
    const parsed = parseAIProgram(aiOutput)

    const warnings: string[] = [...warningsFromGen]
    if (normalized.truncated) {
      warnings.push(
        'Input was truncated before sending to the model; review the result carefully.'
      )
    }
    if (!parsed.success) {
      warnings.push(
        `Model output did not fully match the program schema: ${parsed.error ?? 'unknown error'}`
      )
    }

    // Strip generic placeholder names ("Övning 1", "Exercise 2") that the
    // model sometimes emits when it skips reading the source detail table
    // properly. We'd rather show no name (forcing manual map) than a fake
    // one that pollutes the alias table downstream.
    const cleaned = stripPlaceholderExerciseNames(aiOutput)
    if (cleaned.placeholdersStripped > 0) {
      aiOutput = cleaned.aiOutput
      warnings.push(
        `Modellen returnerade ${cleaned.placeholdersStripped} platshållarnamn (t.ex. "Övning 1") istället för de riktiga namnen — kör "Fixa format" för att försöka igen, eller mappa manuellt i panelen.`
      )
    }

    // One-shot: resolve exercises server-side too so the client gets both
    // the parsed program and the mapping candidates in a single round-trip.
    // Resolver failure is non-fatal — we still ship the parse.
    let resolutions: Resolution[] = []
    try {
      const names = extractExerciseNames(aiOutput)
      if (names.length > 0) {
        const res = await resolveExercises({
          names,
          aliasOwnerId: aiKeyOwnerId,
          accessWhere: {
            OR: [{ isPublic: true }, { coachId: aiKeyOwnerId }],
          },
        })
        resolutions = res.resolutions
      }
    } catch (e) {
      logger.error('Exercise resolver failed during import-parse', {}, e)
      warnings.push(
        'Exercise auto-matching was unavailable; you can map exercises manually in the review panel.'
      )
    }

    // Telemetry: one row per attempt, fire-and-forget. A failed log write
    // can't fail the user-facing response.
    const autoMappedCount = resolutions.filter((r) => !!r.bestMatch).length
    recordImportAttempt({
      userId: callerUserId,
      coachId: aiKeyOwnerId,
      athleteClientId,
      inputKind: normalized.kind,
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
      aiOutput,
      parsedOk: parsed.success,
      warnings,
      modelUsed: resolved.displayName,
      inputKind: normalized.kind,
      resolutions,
      cached: cacheHit,
    })
  } catch (error: unknown) {
    logger.error('Program import-parse failed', {}, error)
    const msg =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: msg },
      { status: msg.startsWith('Forbidden') ? 403 : 500 }
    )
  }
}

/**
 * Write an ImportAttempt row without blocking the response. Logs but
 * swallows any error — telemetry is never critical path.
 */
function recordImportAttempt(data: Prisma.ImportAttemptUncheckedCreateInput) {
  void prisma.importAttempt
    .create({ data })
    .catch((e) => {
      logger.warn('Failed to record ImportAttempt', {}, e)
    })
}

// ─── Pre-processing ──────────────────────────────────────────────────────────

async function normalizeFile(file: File): Promise<NormalizedInput> {
  const name = file.name || 'upload'
  const lower = name.toLowerCase()
  const type = file.type || ''

  // Images — routed to a vision-capable model rather than parsed server-side.
  // We cover screenshots, photos of whiteboards, handwritten notes, etc.
  if (
    VISION_MIME_TYPES.has(type) ||
    /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(lower)
  ) {
    const buf = Buffer.from(await file.arrayBuffer())
    return {
      kind: 'image',
      body: `IMAGE: ${name}`,
      imageBuffer: buf,
      // Extension wins over browser-provided type: iOS/macOS sometimes labels
      // HEIC uploads as image/jpeg which would silently break the vision call.
      imageMimeType: resolveImageMimeType(lower, type),
      filename: name,
      truncated: false,
    }
  }

  // Excel
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

  // CSV
  if (lower.endsWith('.csv') || type === 'text/csv') {
    const raw = await file.text()
    const body = `CSV FILE: ${name}\n\n${raw}`
    return maybeTruncate({ kind: 'csv', body, filename: name })
  }

  // PDF
  if (lower.endsWith('.pdf') || type === 'application/pdf') {
    const buf = Buffer.from(await file.arrayBuffer())
    const body = await pdfToText(buf, name)
    // Scanned PDFs come back with essentially no text. pdf-parse gives us
    // whitespace at best. Fail fast with a helpful hint rather than sending
    // an empty prompt to the model and getting a confused response back.
    const textLength = body.replace(/\bPDF FILE:[^\n]+\n\n/, '').trim().length
    if (textLength < 40) {
      throw new EmptyPdfError(name)
    }
    return maybeTruncate({ kind: 'pdf', body, filename: name })
  }

  // Plain text fallback (txt, md, unknown)
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

/**
 * Detect generic placeholder exerciseName patterns the AI sometimes emits
 * when it skips reading the source's per-exercise table — "Övning 1",
 * "Exercise 2", "Set 3", "Movement A". Replace them with undefined so
 * (a) the workout view doesn't render fake names, (b) the resolver
 * doesn't run fuzzy matches against junk, and (c) we don't write fake
 * aliases when the coach picks a candidate.
 */
const PLACEHOLDER_NAME_RE =
  /^\s*(övning|ovning|exercise|set|movement|rörelse|rorelse)\s*[#-]?\s*[0-9]+\s*$|^\s*(övning|ovning|exercise|movement|rörelse|rorelse)\s+[A-Z]\s*$/i

function isPlaceholderName(name: string | undefined | null): boolean {
  if (!name) return false
  return PLACEHOLDER_NAME_RE.test(name.trim())
}

function stripPlaceholderExerciseNames(aiOutput: string): {
  aiOutput: string
  placeholdersStripped: number
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(aiOutput)
  } catch {
    return { aiOutput, placeholdersStripped: 0 }
  }
  if (!parsed || typeof parsed !== 'object' || !('phases' in parsed)) {
    return { aiOutput, placeholdersStripped: 0 }
  }

  let stripped = 0
  const program = parsed as {
    phases?: Array<{
      weeklyTemplate?: Record<
        string,
        {
          type: string
          segments?: Array<{ exerciseName?: string }>
        }
      >
    }>
  }
  for (const phase of program.phases ?? []) {
    if (!phase.weeklyTemplate) continue
    for (const day of Object.values(phase.weeklyTemplate)) {
      if (!day || day.type === 'REST' || !day.segments) continue
      for (const seg of day.segments) {
        if (isPlaceholderName(seg.exerciseName)) {
          delete seg.exerciseName
          stripped++
        }
      }
    }
  }
  if (stripped === 0) return { aiOutput, placeholdersStripped: 0 }
  return { aiOutput: JSON.stringify(parsed), placeholdersStripped: stripped }
}

function guessImageMimeFromName(lower: string): string {
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic'
  return 'image/jpeg'
}

/**
 * Pick the right mime type for an image upload, preferring file-extension
 * truth over browser-provided `type`. iPhone/macOS browsers sometimes label
 * HEIC uploads as image/jpeg and other mislabels happen too; the extension
 * is authoritative when it disagrees with the header.
 */
function resolveImageMimeType(lower: string, browserType: string): string {
  const byName = guessImageMimeFromName(lower)
  if (!browserType) return byName
  // HEIC/HEIF mislabelled as JPEG is the common case.
  if ((byName === 'image/heic' || byName === 'image/heif') && browserType !== byName) {
    return byName
  }
  // WebP mislabelled as JPEG is less common but has been seen on Safari.
  if (byName === 'image/webp' && browserType === 'image/jpeg') return byName
  return browserType
}

async function excelToText(buf: Buffer): Promise<string> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as ArrayBuffer)

  /**
   * Flatten any cell value into a single-line string. Multi-line cell
   * content (common in "overview" sheets that stuff a whole session into
   * one cell) otherwise breaks the markdown-table structure the AI sees —
   * newlines inside the cell would be interpreted as new rows and the `|`
   * separators downstream get misaligned. Replace with " · " so the content
   * survives as one logical row.
   */
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

  // Collect sheets with a "looks like a detail table" score so we can render
  // the authoritative per-exercise sheets first. The AI weights earlier
  // content more heavily under token pressure.
  interface RenderedSheet {
    name: string
    rows: string[][]
    score: number // higher = more likely the per-exercise detail table
  }
  const rendered: RenderedSheet[] = []

  const DETAIL_HEADERS = [
    'övning', 'ovning', 'exercise',
    'set x reps', 'sets x reps', 'sets', 'reps',
    'rpe', 'rir', 'belastning', 'weight', 'vila', 'rest', 'tempo',
    'muskelgrupp', 'muscle group',
  ]

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

    // Score: count how many known detail-table header tokens appear in the
    // first 6 rows of the sheet.
    const header = rows
      .slice(0, 6)
      .flat()
      .map((c) => c.toLowerCase())
    const score = DETAIL_HEADERS.reduce(
      (n, kw) => (header.some((c) => c.includes(kw)) ? n + 1 : n),
      0
    )
    rendered.push({ name: sheet.name, rows, score })
  })

  // Highest-scoring sheets first; stable otherwise so order within a score
  // tier matches workbook order.
  rendered.sort((a, b) => b.score - a.score)

  const out: string[] = []
  for (const { name, rows, score } of rendered) {
    out.push(`# Sheet: ${name}${score >= 3 ? ' (detail table — AUTHORITATIVE)' : ''}`)
    if (rows.length > 0) {
      const width = Math.max(...rows.map((r) => r.length))
      for (const r of rows) {
        while (r.length < width) r.push('')
        out.push('| ' + r.join(' | ') + ' |')
      }
    }
    out.push('')
  }
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

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert endurance & strength coach who imports training programs into a structured JSON schema.

You will receive a training program in one of these forms: plain text, a CSV dump, a markdown-formatted Excel sheet, or raw PDF text. Extract the program and output STRICT JSON matching this schema:

{
  "name": string,                         // the program name; invent a concise one if missing
  "description": string,                  // short summary (1-2 sentences)
  "totalWeeks": number,                   // total training weeks
  "methodology"?: string,                 // e.g. "polarized", "80/20", "Canova", "linear progression (2-for-2)"
  "weeklySchedule"?: {
    "sessionsPerWeek": number,
    "restDays"?: number[]                 // 0=Monday, 6=Sunday
  },
  "phases": [
    {
      "name": string,                     // e.g. "Bas", "Build", "Peak", "Taper"
      "weeks": string,                    // week range like "1-4" or "5"
      "focus": string,                    // what this phase emphasizes
      "weeklyTemplate": {
        "monday"|"tuesday"|...|"sunday": (
          { "type": "REST", "description"?: string }
          |
          {
            "type": "RUNNING"|"CYCLING"|"SWIMMING"|"STRENGTH"|"CROSS_TRAINING"|"HYROX"|"SKIING"|"CORE"|"PLYOMETRIC"|"RECOVERY"|"ALTERNATIVE"|"OTHER",
            "name"?: string,               // session label, e.g. "Pass A - Knäböj fokus"
            "duration"?: number,           // total minutes
            "distance"?: number,           // total km
            "zone"?: number|string,
            "description": string,
            "intensity"?: "recovery"|"easy"|"moderate"|"threshold"|"interval"|"max"|"hard"|"race_pace",
            "segments"?: [
              {
                "order": number,
                "type": "warmup"|"work"|"interval"|"cooldown"|"rest"|"exercise",
                "duration"?: number,
                "distance"?: number,
                "pace"?: string,           // "5:00/km"
                "zone"?: number,           // 1-5
                "heartRate"?: string,
                "power"?: number,
                "reps"?: number,
                "exerciseName"?: string,   // clean human name, e.g. "Knäböj (bar)" — NOT "Knäböj 5x5 @ 60kg"
                "sets"?: number,
                "repsCount"?: string,      // "5" or "10-12" or "AMRAP" or "30 s"
                "weight"?: string,         // single-value weight when no per-week variation
                "weightByWeek"?: { "1": "60 kg", "2": "65 kg", ... },  // per-week load progression
                "rpe"?: number | string,   // "7" or "7-8" or "RPE 7 (3 RIR)"
                "rir"?: number | string,   // reps-in-reserve target if source specifies one
                "muscleGroup"?: string,    // "Quadriceps/Glutes", "Rygg", "Bröst"
                "tempo"?: string,          // "3-1-X" eccentric-pause-concentric
                "rest"?: number,           // seconds between sets
                "section"?: "WARMUP"|"MAIN"|"CORE"|"COOLDOWN",
                "description"?: string,
                "notes"?: string
              }
            ],
            "targetPace"?: string,
            "targetHR"?: string,
            "targetPower"?: number,
            "notes"?: string
          }
        )
      },
      "volumeGuidance"?: string,
      "keyWorkouts"?: string[],
      "progressionRule"?: string,          // e.g. "2-for-2: add load when 2 extra reps clear"
      "notes"?: string
    }
  ],
  "notes"?: string
}

Extraction rules — read carefully, these are where most imports fail:

COVERAGE
- Output ONLY the JSON object, no prose before or after, no code fences.
- Capture EVERY session the source describes. If the source spells out Monday + Wednesday + Friday across 2 weeks, you must emit all 6 sessions — not a "representative" one.
- Capture EVERY exercise in EVERY session. Never summarize with "... and other exercises" or stop partway through.
- Preserve the source's language in "name", "description", "focus", "notes" etc. Do NOT translate to English.
- Do not invent weeks or sessions that are not implied by the source.

PER-WEEK VARIATION — two common patterns, handle both:
- If every week runs the same template but with different loads (e.g. Excel with "V1 Belastning" and "V2 Belastning" columns for the same exercise), emit ONE phase covering all those weeks and use segment.weightByWeek = { "1": "60 kg", "2": "65 kg", ... }.
- If weeks run STRUCTURALLY different templates (e.g. V1 = A-B-A schedule, V2 = B-A-B schedule), emit a SEPARATE phase for each week. Phase.weeks = "1" for week 1, "2" for week 2, etc. Each phase gets its own weeklyTemplate reflecting that week's actual session layout.

EXERCISE NAMES & STRENGTH DATA
- On segments where type == "exercise" ALWAYS populate exerciseName. Use the cleanest human-readable form — "Back Squat", "Knäböj (bar)", "Bench Press". Strip rep/set/weight clutter: prefer "Back Squat" over "Back Squat 3x8 @ 80 kg".
- NEVER invent an exerciseId — leave that field out entirely; we map names to IDs in a separate step.
- Populate rpe, rir, tempo, muscleGroup, rest whenever the source mentions them. These fields are where rich programs live or die.
- Use repsCount for ambiguous rep schemes ("10-12", "AMRAP", "30 s", "max") and reps only when the source gives a single integer.

WARMUPS
- If the source has a warmup protocol (e.g. "5 min cardio + dynamic mobility + ramp-up"), emit it as warmup-type segments at the START of each affected session.

INTERVALS
- Split structured intervals: "5×1km @ 3:40 with 90s rest" = warmup + 5 work + 4 rest + cooldown segments, OR a single work segment with reps=5 if the source lacks that detail.

METHODOLOGY
- If the source describes a named progression rule ("2-for-2", "double progression", "linear periodization"), capture it in phase.progressionRule AND in program.methodology when it applies globally.
- If the source has a large volume landmark table, RPE/RIR reference, or monitoring decision tree, summarize the key takeaways into phase.notes or program.notes rather than dropping them — coaches come back looking for that context.

AMBIGUITY
- If the source is unclear on a field, omit the field rather than guessing. Note the uncertainty in the nearest notes field.
- If a field clearly applies but the source hasn't said explicitly (e.g. "bench press" with no equipment), still emit exerciseName — downstream mapping will resolve it.

MULTI-SHEET / MULTI-SECTION SOURCES
- When an Excel has both an OVERVIEW sheet (high-level week calendar, cells like "Pass A\\n5x5 Knäböj @ RPE 7") and a DETAIL sheet (header row "Övning | Set x Reps | RPE | Vila | V1 Belastning | V2 Belastning | Muskelgrupp | Tempo"), the DETAIL sheet is the authoritative source. Extract exercises row-by-row from that table. Use the overview only to know which day runs which session.
- Column mapping for a typical Swedish strength detail table:
  Övning           → segments[].exerciseName (strip "(bar)", "(hantel)" clutter, keep the core name)
  Set x Reps       → segments[].sets + segments[].repsCount (e.g. "5 x 5" → sets:5, repsCount:"5")
  RPE / RIR        → segments[].rpe (preserve range strings like "7-8")
  Vila             → segments[].rest in seconds
  V1 Belastning    → segments[].weightByWeek["1"]
  V2 Belastning    → segments[].weightByWeek["2"]
  Muskelgrupp      → segments[].muscleGroup
  Tempo            → segments[].tempo

WORKED EXAMPLE — do exactly this shape when you see this shape of input

Input row:
  | Knäböj (bar) | 5 x 5 | RPE 7 (3 RIR) | 3 min | 60 kg | 65 kg | Quadriceps/Glutes | 3-0-X |

Correct JSON segment:
{
  "order": 1,
  "type": "exercise",
  "section": "MAIN",
  "exerciseName": "Knäböj",
  "sets": 5,
  "repsCount": "5",
  "rpe": "7",
  "rir": 3,
  "rest": 180,
  "weightByWeek": { "1": "60 kg", "2": "65 kg" },
  "muscleGroup": "Quadriceps/Glutes",
  "tempo": "3-0-X"
}

Notes on that example:
- "Knäböj (bar)" → "Knäböj" (equipment parenthetical stripped; the library knows about bars)
- "3 min" rest → 180 seconds (convert minutes to seconds for the rest field)
- "RPE 7 (3 RIR)" splits: rpe:"7", rir:3
- Values belong in their dedicated fields, NEVER in description. RPE text like "Hård men stabil" goes in rpe, not description.

FIELD DISCIPLINE — the rule that breaks the most imports:
- DO NOT put RPE, RIR, muscle-group, set/rep counts, or weights in description or notes when the dedicated field is available. The preview renders dedicated fields as structured data; anything dumped in description stays as opaque free text.
- description is for coach prose that doesn't fit a structured field ("focus on depth", "slow eccentric").
- If a cell literally reads "Kroppsvikt" or "BW", that's still a weight — set weight:"Kroppsvikt" (or both V1/V2 entries in weightByWeek).

ANTI-PATTERN — NEVER do this, this is the failure mode that breaks the import:
{
  "exerciseName": "Övning 1",      // WRONG — generic placeholder
  "exerciseName": "Övning 2",      // WRONG — generic placeholder
  "exerciseName": "Exercise 1",    // WRONG — generic placeholder
  "exerciseName": "Movement A",    // WRONG — generic placeholder
  ...
}

The first column of any "Övning | Set x Reps | …" detail table IS the name field. Read it character-by-character and copy it VERBATIM (only stripping equipment parentheticals like "(bar)" or "(hantel)"). If the source row reads "Knäböj (bar)" you emit exerciseName:"Knäböj". If the source reads "Bänkpress (bar)" you emit exerciseName:"Bänkpress". If the source reads "Stående hantelrodd" you emit exerciseName:"Stående hantelrodd". Never invent, never number, never summarize. If you can't read a name from the source, omit the segment entirely — a missing row is better than a fake row.`

function buildPrompt(input: NormalizedInput): string {
  const header = `Source type: ${input.kind}${input.filename ? ` (${input.filename})` : ''}`
  const truncWarning = input.truncated
    ? '\n\nNOTE: Input was truncated at 200k chars. Use what is available.'
    : ''

  if (input.kind === 'image') {
    return (
      `${header}\n\nThe user has uploaded an image of a training program (screenshot, ` +
      `photo of a whiteboard, page from a PDF, or handwritten notes). Read the ` +
      `image carefully, including any handwriting, tables, abbreviations, and ` +
      `non-English/Swedish text. If the image is low quality or partially ` +
      `unreadable, use what you can and list the uncertain parts in the ` +
      `top-level "notes" field.\n\nExtract the program JSON now.`
    )
  }

  return `${header}${truncWarning}\n\nInput:\n"""\n${input.body}\n"""\n\nExtract the program JSON now.`
}
