/**
 * File-normalization for AI-import endpoints.
 *
 * Shared between `/api/programs/import-parse` and `/api/workouts/import-parse`.
 * Both routes accept text / Excel / CSV / PDF / image inputs and need to
 * produce a single normalized payload — markdown-flavored text for the
 * non-image cases, plus the raw image buffer + mime type when the source
 * is a photo/screenshot.
 *
 * Pre-extraction here:
 *   - Excel  → exceljs → markdown-style pipe table per sheet, with
 *              detail-table sheets surfaced first so the AI weights them
 *              heaviest under token pressure.
 *   - CSV    → forwarded as-is with a filename header.
 *   - PDF    → pdf-parse (fail loudly when text layer is empty).
 *   - text   → forwarded with a filename header.
 *   - image  → buffer + mime type for the multimodal call.
 */

export const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB
export const MAX_TEXT_CHARS = 200_000

export type NormalizedInputKind = 'text' | 'excel' | 'csv' | 'pdf' | 'image'

export type NormalizedInput = {
  kind: NormalizedInputKind
  /** Human-readable representation embedded in the model prompt. */
  body: string
  /** Image bytes when kind==='image' (sent to a vision model). */
  imageBuffer?: Buffer
  imageMimeType?: string
  filename?: string
  /** True when we hit `MAX_TEXT_CHARS` and clipped the body. */
  truncated: boolean
}

export const VISION_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])

export function formatEmptyPdfError(filename: string, locale: 'en' | 'sv' = 'en'): string {
  if (locale === 'sv') {
    return `Kunde inte läsa text från "${filename}" - PDF-filen verkar vara en skanning utan textlager. Exportera sidorna som bilder (PNG/JPG) och ladda upp dem i stället.`
  }
  return `Could not read text from "${filename}" - the PDF looks like a scan with no text layer. Export the pages as images (PNG/JPG) and upload those instead.`
}

export class EmptyPdfError extends Error {
  readonly filename: string

  constructor(filename: string) {
    super(formatEmptyPdfError(filename))
    this.name = 'EmptyPdfError'
    this.filename = filename
  }
}

export async function normalizeFile(file: File): Promise<NormalizedInput> {
  const name = file.name || 'upload'
  const lower = name.toLowerCase()
  const type = file.type || ''

  // Images — routed to a vision-capable model rather than parsed server-side.
  if (
    VISION_MIME_TYPES.has(type) ||
    /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(lower)
  ) {
    const buf = Buffer.from(await file.arrayBuffer())
    return {
      kind: 'image',
      body: `IMAGE: ${name}`,
      imageBuffer: buf,
      // Extension wins over browser-provided type: iOS/macOS labels HEIC
      // uploads as image/jpeg which would silently break the vision call.
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
    // Scanned PDFs come back with essentially no text. pdf-parse gives us
    // whitespace at best. Fail fast with a helpful hint rather than sending
    // an empty prompt to the model.
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

export function normalizeText(text: string): NormalizedInput {
  return {
    kind: 'text',
    body: text.slice(0, MAX_TEXT_CHARS),
    truncated: text.length > MAX_TEXT_CHARS,
  }
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

  /**
   * Flatten any cell value into a single-line string. Multi-line cell
   * content (common in "overview" sheets that stuff a whole session into
   * one cell) otherwise breaks the markdown-table structure the AI sees —
   * newlines inside the cell would be interpreted as new rows and the `|`
   * separators get misaligned.
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

  // Score each sheet by "looks like a detail table" so the authoritative
  // per-exercise sheets render first. The AI weights earlier content more
  // heavily under token pressure.
  interface RenderedSheet {
    name: string
    rows: string[][]
    score: number
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
