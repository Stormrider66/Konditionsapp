/**
 * Wide-format team-test paste parser.
 *
 * Coaches log team tests as a 2D grid: rows = athletes, columns =
 * exercises. The hand-written photo this is built for looks like:
 *
 *   Namn          Benböj  Frivändning  Bänkpress  Chins  Vikt
 *   Oscar Nilsson         180 Hex                  25     82.4
 *   Edward Björk  160     100                      25     79.6
 *   ...
 *
 * The parser handles:
 *  - Tab, comma, or semicolon as cell separator
 *  - First row as header (first cell can be anything; rest are exercise
 *    column labels)
 *  - Empty cells, "-", "—" as "not tested" → skipped
 *  - Trailing annotations like "180 Hex" → value=180, note="Hex"
 *  - A "Vikt" / "Bodyweight" / "Kroppsvikt" / "BW" column that is NOT
 *    an exercise — its value becomes the bodyWeight attached to every
 *    PR in that athlete's row
 *
 * Output is a list of `ParsedCell`s (one per non-empty data cell)
 * and the parsed header. The component layer matches names + headers
 * to roster / library entries and submits the matched cells as PRs.
 */

export interface ParsedCell {
  /** Index into the data rows (0-based, excludes header). */
  rowIndex: number
  /** Index into the data columns (0-based, excludes the name column and bodyweight). */
  colIndex: number
  /** Athlete name as written in the paste. */
  rawName: string
  /** Exercise label as written in the header. */
  rawHeader: string
  /** Numeric value extracted from the cell. */
  value: number
  /** Trailing annotation (e.g. "Hex" from "180 Hex"). Empty when none. */
  note: string
  /** Bodyweight from this athlete's "Vikt" column, if present. */
  bodyWeight: number | null
}

export interface ParseWarning {
  /** Index into `names` (data rows). */
  rowIndex: number
  /** Athlete name on the row. */
  rawName: string
  /** Why we're warning. */
  kind: 'missing_cells' | 'extra_cells'
  /** Cell counts so the UI can spell it out for the coach. */
  expected: number
  actual: number
}

export interface ParsedWideFormat {
  /** Header labels for data columns (excludes the leading name column and any bodyweight column). */
  headers: string[]
  /** Athlete names per data row. */
  names: string[]
  /** Whether a bodyweight column was detected and stripped. */
  bodyWeightDetected: boolean
  /** Flat list of parsed value cells. */
  cells: ParsedCell[]
  /** Per-row issues a coach might want to see in the preview. */
  warnings: ParseWarning[]
}

const BODYWEIGHT_HEADER_PATTERN = /^(vikt|bodyweight|kroppsvikt|bw)$/i
const SKIP_VALUE_PATTERN = /^[-—–]$/

function splitRow(line: string): string[] {
  // Tab beats comma beats semicolon — picking by presence keeps the
  // intent intact for paste-from-Excel (tabs) vs CSV exports (commas).
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(';')) return line.split(';')
  if (line.includes(',')) return line.split(',')
  // Single-column paste isn't useful here; treat as one cell.
  return [line]
}

function parseValueCell(raw: string): { value: number | null; note: string } {
  const trimmed = raw.trim()
  if (trimmed === '' || SKIP_VALUE_PATTERN.test(trimmed)) {
    return { value: null, note: '' }
  }
  // Pull the leading number (allow "," or "." as decimal). Anything
  // after is the annotation — coach-written notes like "Hex", "PR",
  // "*" all flow through to the saved PR's notes field.
  const match = trimmed.match(/^([\d]+(?:[.,]\d+)?)\s*(.*)$/)
  if (!match) return { value: null, note: '' }
  const value = parseFloat(match[1].replace(',', '.'))
  return {
    value: Number.isFinite(value) ? value : null,
    note: match[2].trim(),
  }
}

export function parseWideFormat(paste: string): ParsedWideFormat {
  const lines = paste
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    return { headers: [], names: [], bodyWeightDetected: false, cells: [], warnings: [] }
  }

  // Header: first cell is the name column label (can be anything —
  // "Namn", blank, etc.); everything after is an exercise or bodyweight.
  const headerCells = splitRow(lines[0]).map((c) => c.trim())
  const dataHeaders = headerCells.slice(1)

  // Detect (and remember the index of) a bodyweight column. We strip
  // it from the exercise headers so the column index after stripping
  // aligns with the cells we emit.
  const bodyWeightColIdx = dataHeaders.findIndex((h) => BODYWEIGHT_HEADER_PATTERN.test(h))
  const headers =
    bodyWeightColIdx >= 0
      ? dataHeaders.filter((_, i) => i !== bodyWeightColIdx)
      : dataHeaders

  const names: string[] = []
  const cells: ParsedCell[] = []
  const warnings: ParseWarning[] = []
  // The parser slices off the bodyweight column before iterating data
  // cells, so the "expected count" the coach typed is headers + 1 if a
  // bodyweight column existed. Comparing against the raw paste shape
  // catches "row has too few cells" / "stray tab added an extra cell"
  // — both silently drop data without this guard.
  const expectedDataCellCount = headers.length + (bodyWeightColIdx >= 0 ? 1 : 0)

  for (let r = 1; r < lines.length; r++) {
    const cellsRaw = splitRow(lines[r])
    const name = (cellsRaw[0] ?? '').trim()
    if (!name) continue
    const dataCellsRaw = cellsRaw.slice(1)
    const rowIndex = names.length
    names.push(name)

    if (dataCellsRaw.length !== expectedDataCellCount) {
      warnings.push({
        rowIndex,
        rawName: name,
        kind: dataCellsRaw.length < expectedDataCellCount ? 'missing_cells' : 'extra_cells',
        expected: expectedDataCellCount,
        actual: dataCellsRaw.length,
      })
    }

    // Bodyweight is per-row metadata, not a PR cell.
    let bodyWeight: number | null = null
    if (bodyWeightColIdx >= 0) {
      const bw = parseValueCell(dataCellsRaw[bodyWeightColIdx] ?? '')
      bodyWeight = bw.value
    }

    // Walk the data cells excluding the bodyweight column. The
    // emitted colIndex aligns with `headers` (which already has the
    // bodyweight column removed) so the component can render a clean
    // grid without re-mapping.
    let outCol = 0
    for (let c = 0; c < dataCellsRaw.length; c++) {
      if (c === bodyWeightColIdx) continue
      const parsed = parseValueCell(dataCellsRaw[c] ?? '')
      if (parsed.value != null) {
        cells.push({
          rowIndex,
          colIndex: outCol,
          rawName: name,
          rawHeader: headers[outCol] ?? '',
          value: parsed.value,
          note: parsed.note,
          bodyWeight,
        })
      }
      outCol++
    }
  }

  return {
    headers,
    names,
    bodyWeightDetected: bodyWeightColIdx >= 0,
    cells,
    warnings,
  }
}
