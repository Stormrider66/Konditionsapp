/**
 * Team Roster Importer — Parse
 *
 * POST /api/coach/teams/[teamId]/import-parse
 *
 * Accepts pasted text or an uploaded file (Excel/CSV/PDF/plain text) that
 * contains a team roster, and asks the user's configured AI provider to
 * extract an array of athlete rows.
 *
 * Input sources are pre-processed server-side:
 * - Excel/CSV → exceljs → markdown table
 * - PDF      → pdf-parse → text
 * - text     → forwarded as-is
 *
 * Model routing: `resolveModel(keys, 'balanced')` by default. Rosters are
 * simple enough that 'fast' usually works fine too.
 *
 * Photo/OCR input is deliberately OUT OF SCOPE for this phase — the
 * accepted extensions list mirrors the program importer. See docs for the
 * Phase 3 plan that adds multimodal image handling.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { getWritableTeam } from '@/lib/coach/team-access'
import { resolveExtractionModel, resolveVisionModel, type ModelIntent, isModelIntent } from '@/types/ai-models'
import { createModelInstance, generationTuning } from '@/lib/ai/create-model'
import { generateText } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_TEXT_CHARS = 200_000

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

interface RouteContext {
  params: Promise<{ teamId: string }>
}

type NormalizedInput =
  | {
      kind: 'text' | 'excel' | 'csv' | 'pdf'
      body: string
      filename?: string
      truncated: boolean
    }
  | {
      kind: 'image'
      image: { dataUri: string; mimeType: string }
      filename?: string
      truncated: false
    }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(request)

    const team = await getWritableTeam(user.id, teamId, scope.businessSlug, 'roster')
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const limited = await rateLimitJsonResponse('teams:import-parse', user.id, {
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
      if (maybeFile instanceof File && maybeFile.size > 0) file = maybeFile
      const intent = form.get('intent')
      if (typeof intent === 'string' && isModelIntent(intent)) intentOverride = intent
    } else {
      const body = await request.json().catch(() => ({}))
      if (typeof body?.text === 'string') pastedText = body.text
      if (isModelIntent(body?.intent)) intentOverride = body.intent
    }

    const isImage = file ? isLikelyImage(file) : false

    if (file) {
      const cap = isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES
      if (file.size > cap) {
        return NextResponse.json(
          { error: `File too large. Max ${cap / (1024 * 1024)} MB.` },
          { status: 413 }
        )
      }
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
      logger.error('Failed to pre-process roster input', {}, e)
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Could not read the uploaded file' },
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
        { error: 'Provide either pasted text or a file to import' },
        { status: 400 }
      )
    }

    const keys = await getResolvedAiKeys(user.id)
    const intent = intentOverride ?? 'balanced'
    // Roster parsing is structured extraction — use the extraction tier so
    // 'powerful' collapses to Sonnet 4.6 (not Opus 4.7) for text paths.
    // Vision stays on the regular vision resolver since we need the bigger
    // multimodal models to read photos/scans reliably.
    const resolved =
      normalized.kind === 'image'
        ? resolveVisionModel(keys, intent)
        : resolveExtractionModel(keys, intent)

    if (!resolved) {
      return NextResponse.json(
        {
          error:
            normalized.kind === 'image'
              ? 'Ingen bildkapabel AI-modell är konfigurerad. Lägg till en Google, Anthropic eller OpenAI API-nyckel i inställningarna.'
              : 'No AI provider configured. Add an API key in settings to use the roster importer.',
        },
        { status: 400 }
      )
    }

    const model = createModelInstance(resolved)

    const { text: aiOutput } =
      normalized.kind === 'image'
        ? await generateText({
            model,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image', image: normalized.image.dataUri },
                  {
                    type: 'text',
                    text: buildImagePromptText(team.sportType ?? null, normalized.filename),
                  },
                ],
              },
            ],
            ...generationTuning(resolved.modelId, { temperature: 0.1 }),
          })
        : await generateText({
            model,
            system: SYSTEM_PROMPT,
            prompt: buildTextPrompt(normalized, team.sportType ?? null),
            ...generationTuning(resolved.modelId, { temperature: 0.1 }),
          })

    const parsedRows = safeParseRoster(aiOutput)

    const warnings: string[] = []
    if (normalized.kind !== 'image' && normalized.truncated) {
      warnings.push('Input was truncated before sending to the model; review the result carefully.')
    }
    if (!parsedRows.ok) {
      warnings.push(`Model output was not valid roster JSON: ${parsedRows.error}`)
    } else if (parsedRows.rows.length === 0) {
      warnings.push('AI hittade inga spelare i källan.')
    }

    return NextResponse.json({
      success: true,
      rows: parsedRows.ok ? parsedRows.rows : [],
      aiOutput,
      warnings,
      modelUsed: resolved.displayName,
      inputKind: normalized.kind,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Roster import-parse failed', {}, error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── Pre-processing (same pattern as program importer) ──────────────────────

function isLikelyImage(file: File): boolean {
  const type = (file.type || '').toLowerCase()
  if (VALID_IMAGE_TYPES.includes(type)) return true
  const name = (file.name || '').toLowerCase()
  return /\.(jpe?g|png|webp|heic|heif)$/.test(name)
}

async function normalizeFile(file: File): Promise<NormalizedInput> {
  const name = file.name || 'upload'
  const lower = name.toLowerCase()
  const type = file.type || ''

  if (isLikelyImage(file)) {
    const buf = Buffer.from(await file.arrayBuffer())
    const mimeType = VALID_IMAGE_TYPES.includes(type) ? type : inferImageMime(lower)
    const dataUri = `data:${mimeType};base64,${buf.toString('base64')}`
    return { kind: 'image', image: { dataUri, mimeType }, filename: name, truncated: false }
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
    return maybeTruncate({ kind: 'pdf', body, filename: name })
  }

  const raw = await file.text()
  return maybeTruncate({
    kind: 'text',
    body: `TEXT FILE: ${name}\n\n${raw}`,
    filename: name,
  })
}

function inferImageMime(lowerName: string): string {
  if (lowerName.endsWith('.png')) return 'image/png'
  if (lowerName.endsWith('.webp')) return 'image/webp'
  if (lowerName.endsWith('.heic')) return 'image/heic'
  if (lowerName.endsWith('.heif')) return 'image/heif'
  return 'image/jpeg'
}

type TextNormalized = Extract<NormalizedInput, { kind: 'text' | 'excel' | 'csv' | 'pdf' }>

function maybeTruncate(n: Omit<TextNormalized, 'truncated'>): TextNormalized {
  if (n.body.length > MAX_TEXT_CHARS) {
    return { ...n, body: n.body.slice(0, MAX_TEXT_CHARS), truncated: true } as TextNormalized
  }
  return { ...n, truncated: false } as TextNormalized
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
        if (v == null) cells.push('')
        else if (typeof v === 'object' && 'richText' in v) {
          cells.push(
            (v as { richText: { text: string }[] }).richText.map((r) => r.text).join('')
          )
        } else if (typeof v === 'object' && 'result' in v) {
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

const SYSTEM_PROMPT = `You extract team rosters from messy human-authored sources (Excel sheets, PDFs, pasted text, CSVs) into a strict JSON array.

Output ONLY a JSON object shaped like:

{
  "rows": [
    {
      "name": string,               // REQUIRED — full name as written
      "jerseyNumber"?: number,      // integer 0-999 if present
      "position"?: string,          // e.g. "Center", "Back", "Målvakt", "Wing"
      "email"?: string,             // only if present in source
      "phone"?: string,             // only if present in source
      "birthDate"?: string,         // ISO "YYYY-MM-DD" if present
      "gender"?: "MALE" | "FEMALE", // only if clearly indicated
      "height"?: number,            // cm, only if present
      "weight"?: number,            // kg, only if present
      "notes"?: string              // any useful extra detail
    }
  ]
}

Rules:
- Output ONLY the JSON object. No prose, no markdown fences.
- Preserve the source language for names and positions. Do NOT translate positions.
- Skip header rows, section titles, staff/coaches, and team totals.
- If the same person appears multiple times (e.g. separate offense/defense sections), output one row.
- Do not invent fields that aren't in the source. Omit keys when unsure.
- "name" is required on every row. If a row has only a number or placeholder, skip it.
- If the source is empty or unrecognizable, output {"rows": []}.`

function buildTextPrompt(input: TextNormalized, sportType: string | null): string {
  const sportHint = sportType
    ? `\nContext: this is a ${sportType} team. Use position vocabulary typical for that sport.`
    : ''
  const header = `Source type: ${input.kind}${input.filename ? ` (${input.filename})` : ''}${sportHint}`
  const truncWarning = input.truncated
    ? '\n\nNOTE: Input was truncated at 200k chars. Use what is available.'
    : ''
  return `${header}${truncWarning}\n\nInput:\n"""\n${input.body}\n"""\n\nExtract the roster JSON now.`
}

function buildImagePromptText(sportType: string | null, filename?: string): string {
  const sportHint = sportType
    ? `\nContext: this is a ${sportType} team. Use position vocabulary typical for that sport.`
    : ''
  const fileHint = filename ? ` (${filename})` : ''
  return `The attached image${fileHint} shows a team roster — printed roster sheet, whiteboard, screenshot, or phone photo.${sportHint}

Read every player line carefully, including handwritten notes. Ignore coaches, managers, team totals, and section headers like "Offense" / "Defense" unless they're player-specific position markers.

Extract the roster JSON now.`
}

// ─── Output validation ──────────────────────────────────────────────────────

type RosterRow = {
  name: string
  jerseyNumber?: number
  position?: string
  email?: string
  phone?: string
  birthDate?: string
  gender?: 'MALE' | 'FEMALE'
  height?: number
  weight?: number
  notes?: string
}

function safeParseRoster(
  raw: string
): { ok: true; rows: RosterRow[] } | { ok: false; error: string } {
  try {
    const trimmed = stripCodeFence(raw.trim())
    const parsed = JSON.parse(trimmed)
    const rowsSrc = Array.isArray(parsed) ? parsed : parsed?.rows
    if (!Array.isArray(rowsSrc)) return { ok: false, error: 'No "rows" array in response' }

    const out: RosterRow[] = []
    for (const r of rowsSrc) {
      if (!r || typeof r !== 'object') continue
      const name = typeof r.name === 'string' ? r.name.trim() : ''
      if (name.length < 2) continue

      const row: RosterRow = { name }
      if (typeof r.jerseyNumber === 'number' && Number.isInteger(r.jerseyNumber) && r.jerseyNumber >= 0 && r.jerseyNumber <= 999) {
        row.jerseyNumber = r.jerseyNumber
      }
      if (typeof r.position === 'string' && r.position.trim()) row.position = r.position.trim().slice(0, 40)
      if (typeof r.email === 'string' && /.+@.+/.test(r.email)) row.email = r.email.trim()
      if (typeof r.phone === 'string') row.phone = r.phone.trim()
      if (typeof r.birthDate === 'string' && !Number.isNaN(new Date(r.birthDate).getTime())) {
        row.birthDate = new Date(r.birthDate).toISOString().slice(0, 10)
      }
      if (r.gender === 'MALE' || r.gender === 'FEMALE') row.gender = r.gender
      if (typeof r.height === 'number' && r.height >= 100 && r.height <= 250) row.height = r.height
      if (typeof r.weight === 'number' && r.weight >= 30 && r.weight <= 300) row.weight = r.weight
      if (typeof r.notes === 'string' && r.notes.trim()) row.notes = r.notes.trim()
      out.push(row)
    }
    return { ok: true, rows: out }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' }
  }
}

function stripCodeFence(s: string): string {
  if (s.startsWith('```')) {
    const m = s.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/)
    if (m) return m[1]
  }
  return s
}
