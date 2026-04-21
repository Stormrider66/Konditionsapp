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
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { resolveModel, type ModelIntent, isModelIntent } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { generateText } from 'ai'
import { parseAIProgram } from '@/lib/ai/program-parser'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB upper bound
const MAX_TEXT_CHARS = 200_000 // guard against absurd paste sizes

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
    // Images always need a vision-capable model. All three providers' "powerful"
    // tier (Gemini 3.1 Pro / Opus 4.6 / GPT-5.4) support vision, so bumping
    // intent to 'powerful' is the right behavior regardless of caller override.
    const intent =
      normalized.kind === 'image' ? 'powerful' : intentOverride ?? 'balanced'
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

    const { text: aiOutput } =
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
          })
        : await generateText({
            model,
            system: SYSTEM_PROMPT,
            prompt,
            temperature: 0.1,
          })

    // Validate the result is actually parseable so we don't hand the editor
    // something it will choke on. We don't block on validation failure — the
    // editor has a "Fixa format" recovery path — but we do surface warnings.
    const parsed = parseAIProgram(aiOutput)

    const warnings: string[] = []
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

    return NextResponse.json({
      success: true,
      aiOutput,
      parsedOk: parsed.success,
      warnings,
      modelUsed: resolved.displayName,
      inputKind: normalized.kind,
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

  const out: string[] = []
  wb.eachSheet((sheet) => {
    out.push(`# Sheet: ${sheet.name}`)
    const rows: string[][] = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = []
      row.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value
        if (v == null) {
          cells.push('')
        } else if (typeof v === 'object' && 'richText' in v) {
          cells.push(
            (v as { richText: { text: string }[] }).richText
              .map((r) => r.text)
              .join('')
          )
        } else if (typeof v === 'object' && 'result' in v) {
          // formula result
          const r = (v as { result: unknown }).result
          cells.push(r == null ? '' : String(r))
        } else if (v instanceof Date) {
          cells.push(v.toISOString().slice(0, 10))
        } else {
          cells.push(String(v))
        }
      })
      rows.push(cells)
    })
    // Render as markdown-ish table so the model sees structure clearly
    if (rows.length > 0) {
      const width = Math.max(...rows.map((r) => r.length))
      for (const r of rows) {
        while (r.length < width) r.push('')
        out.push('| ' + r.map((c) => c.replace(/\|/g, '\\|')).join(' | ') + ' |')
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

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert endurance & strength coach who imports training programs into a structured JSON schema.

You will receive a training program in one of these forms: plain text, a CSV dump, a markdown-formatted Excel sheet, or raw PDF text. Extract the program and output STRICT JSON matching this schema:

{
  "name": string,                         // the program name; invent a concise one if missing
  "description": string,                  // short summary (1-2 sentences)
  "totalWeeks": number,                   // total training weeks
  "methodology"?: string,                 // e.g. "polarized", "80/20", "Canova" — optional
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
            "name"?: string,
            "duration"?: number,          // total minutes
            "distance"?: number,          // total km
            "zone"?: number|string,
            "description": string,
            "intensity"?: "recovery"|"easy"|"moderate"|"threshold"|"interval"|"max"|"hard"|"race_pace",
            "segments"?: [
              {
                "order": number,
                "type": "warmup"|"work"|"interval"|"cooldown"|"rest"|"exercise",
                "duration"?: number,
                "distance"?: number,
                "pace"?: string,          // "5:00/km"
                "zone"?: number,          // 1-5
                "heartRate"?: string,
                "power"?: number,
                "reps"?: number,
                "exerciseId"?: string,
                "sets"?: number,
                "repsCount"?: string,     // "10" or "10-12" or "AMRAP"
                "weight"?: string,
                "tempo"?: string,
                "rest"?: number,          // seconds
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
      "notes"?: string
    }
  ],
  "notes"?: string
}

Rules:
- Output ONLY the JSON object, no prose before or after, no code fences.
- Every phase must list at least one day in weeklyTemplate, even if the input only describes a representative week.
- ALWAYS populate "exerciseName" on segments of type "exercise" with the clearest human-readable name from the source (e.g. "Back Squat", "Knäböj", "Bench Press"). NEVER invent an "exerciseId" — leave that field out entirely; we map names to IDs in a separate step.
- Strip rep/set/weight clutter from "exerciseName": prefer "Back Squat" over "Back Squat 3x8 @ 80kg" (the counts belong in sets/repsCount/weight).
- Split intervals into segments: "5×1km @ 3:40 with 90s rest" becomes a warmup + 5 work + 4 rest + cooldown segments (or a single work segment with reps=5 if the detail is not in the source).
- Preserve the source program's language in "name", "description", "focus" etc. — do NOT translate to English.
- If the source is ambiguous, make reasonable assumptions and list them in the top-level "notes" field.
- Do not invent weeks or sessions that are not implied by the source.`

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
