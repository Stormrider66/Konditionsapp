/**
 * Shared SIMCA artifact parsing + validation.
 *
 * SIMCA desktop exports vary in column naming, delimiter and shape, so the
 * import/compare flow stays deliberately tolerant: it fuzzy-matches common
 * score/outlier/VIP columns from either JSON or delimited text. This module
 * centralizes that logic (previously duplicated inside the compare route) so
 * imports are parsed and validated up-front instead of failing silently later.
 */

export type SimcaFormat = 'json' | 'csv' | 'text'

export interface SimcaAthleteScore {
  key: string
  name: string
  pc1: number | null
  pc2: number | null
  hotellingT2: number | null
  dmodx: number | null
  isOutlier: boolean
}

export interface SimcaVipScore {
  key: string
  variableName: string
  vip: number
  coefficient: number | null
}

export interface SimcaSummary {
  athletes: SimcaAthleteScore[]
  vipScores: SimcaVipScore[]
}

export interface SimcaImportWarning {
  code: string
  severity: 'info' | 'warning'
  messageEn: string
  messageSv: string
}

export interface RosterMember {
  id: string
  name: string
}

export interface SimcaRosterMatch {
  matched: { simcaName: string; rosterName: string; clientId: string }[]
  unmatchedSimca: string[] // SIMCA rows with no roster counterpart
  unmatchedRoster: string[] // roster players absent from the file
}

export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9åäö]/gi, '')
}

export function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number(value.trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function safeString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

export function safeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return ['1', 'true', 'yes', 'ja', 'outlier', 'outside', 'utanför'].includes(normalized)
}

export function detectFormat(fileName: string, content: string): SimcaFormat {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return 'csv'
  const trimmed = content.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return 'json'
  }
  if (trimmed.includes(',') || trimmed.includes('\t') || trimmed.includes(';')) return 'csv'
  return 'text'
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }

  cells.push(cell.trim())
  return cells
}

export function parseDelimitedRows(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const headerLine = lines[0]
  const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ','
  const headers = parseDelimitedLine(headerLine, delimiter)

  return lines.slice(1).map((line) => {
    const cells = parseDelimitedLine(line, delimiter)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? ''
    })
    return row
  })
}

function getValue(row: Record<string, unknown>, candidates: string[]): unknown {
  const normalizedCandidates = candidates.map(normalizeKey)
  const entries = Object.entries(row).map(([key, value]) => [normalizeKey(key), value] as const)
  const exact = entries.find(([key]) => normalizedCandidates.includes(key))
  if (exact) return exact[1]

  const partial = entries.find(([key]) => normalizedCandidates.some((candidate) => key.includes(candidate)))
  return partial?.[1]
}

function rowToAthlete(row: Record<string, unknown>): SimcaAthleteScore | null {
  const name = safeString(getValue(row, ['athlete', 'athleteName', 'player', 'playerName', 'object', 'objectName', 'name', 'id']))
  if (!name) return null

  const pc1 = safeNumber(getValue(row, ['pc1', 't1', 'score1', 'component1']))
  const pc2 = safeNumber(getValue(row, ['pc2', 'score2', 'component2']))
  const hotellingT2 = safeNumber(getValue(row, ['hotelling', 'hotellingT2', 't2hotelling', 'tSquared']))
  const dmodx = safeNumber(getValue(row, ['dmodx', 'dmodxps', 'distanceToModel']))
  const outlierValue = getValue(row, ['outlier', 'isOutlier', 'outside', 'flag'])

  if (pc1 === null && pc2 === null && hotellingT2 === null && dmodx === null && outlierValue === undefined) {
    return null
  }

  return {
    key: normalizeKey(name),
    name,
    pc1,
    pc2,
    hotellingT2,
    dmodx,
    isOutlier: safeBoolean(outlierValue),
  }
}

function rowToVip(row: Record<string, unknown>): SimcaVipScore | null {
  const variableName = safeString(getValue(row, ['variable', 'variableName', 'xVariable', 'x', 'name']))
  const vip = safeNumber(getValue(row, ['vip', 'vipScore', 'vipPred', 'variableImportance']))
  if (!variableName || vip === null) return null

  return {
    key: normalizeKey(variableName),
    variableName,
    vip,
    coefficient: safeNumber(getValue(row, ['coefficient', 'coeff', 'coef', 'loading', 'p1'])),
  }
}

function collectObjectRows(value: unknown, rows: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        rows.push(item as Record<string, unknown>)
      } else {
        collectObjectRows(item, rows)
      }
    })
    return rows
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((child) => collectObjectRows(child, rows))
  }

  return rows
}

function uniqueByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
}

/**
 * Extract athletes + VIP scores from stored model data ({ content, json }).
 */
export function extractSimcaSummary(modelData: unknown): SimcaSummary {
  const data = modelData as { content?: string; json?: unknown; format?: string }
  const rows = data.json
    ? collectObjectRows(data.json)
    : data.content
      ? parseDelimitedRows(data.content)
      : []

  return summaryFromRows(rows)
}

/**
 * Extract athletes + VIP scores directly from raw file content (import time).
 */
export function extractSimcaSummaryFromContent(content: string, format: SimcaFormat): SimcaSummary {
  let rows: Record<string, unknown>[] = []
  if (format === 'json') {
    try {
      rows = collectObjectRows(JSON.parse(content))
    } catch {
      rows = []
    }
  } else {
    rows = parseDelimitedRows(content)
  }
  return summaryFromRows(rows)
}

function summaryFromRows(rows: Record<string, unknown>[]): SimcaSummary {
  const athletes = uniqueByKey(rows.map(rowToAthlete).filter((item): item is SimcaAthleteScore => Boolean(item)))
  const vipScores = uniqueByKey(rows.map(rowToVip).filter((item): item is SimcaVipScore => Boolean(item)))
  return { athletes, vipScores }
}

/**
 * Validate a parsed import and produce localized warnings. The import is still
 * stored on a warning (the round-trip is tolerant), but the coach is told what
 * was — and was not — recognized instead of discovering it only at compare time.
 */
export function validateSimcaImport(
  summary: SimcaSummary,
  rowCount: number,
  format: SimcaFormat
): SimcaImportWarning[] {
  const warnings: SimcaImportWarning[] = []

  if (summary.athletes.length === 0 && summary.vipScores.length === 0) {
    warnings.push({
      code: 'nothing_recognized',
      severity: 'warning',
      messageEn: 'No SIMCA score, outlier or VIP columns were recognized. Comparison and trend views will be empty — check that the export includes athlete names with PC1/PC2 or VIP columns.',
      messageSv: 'Inga SIMCA-kolumner för score, outlier eller VIP kändes igen. Jämförelse och trend blir tomma — kontrollera att exporten innehåller spelarnamn med PC1/PC2 eller VIP-kolumner.',
    })
    return warnings
  }

  if (summary.athletes.length === 0) {
    warnings.push({
      code: 'no_athletes',
      severity: 'warning',
      messageEn: 'No athlete score rows were recognized (PC1/PC2/Hotelling/DModX). Only VIP variables were read, so player movement cannot be compared.',
      messageSv: 'Inga spelarrader med score kändes igen (PC1/PC2/Hotelling/DModX). Endast VIP-variabler lästes, så spelarförflyttning kan inte jämföras.',
    })
  }

  if (summary.vipScores.length === 0) {
    warnings.push({
      code: 'no_vip',
      severity: 'info',
      messageEn: 'No VIP variable columns were recognized. Player scores were read, but VIP change tracking will be empty.',
      messageSv: 'Inga VIP-variabelkolumner kändes igen. Spelarscore lästes, men VIP-förändringar blir tomma.',
    })
  }

  // Delimited files: flag when most rows did not yield an athlete (likely a
  // header/column mismatch rather than a genuinely small file).
  if (format !== 'json' && rowCount > 2 && summary.athletes.length > 0 && summary.athletes.length < rowCount * 0.5) {
    warnings.push({
      code: 'low_row_recognition',
      severity: 'info',
      messageEn: `Only ${summary.athletes.length} of ~${rowCount} rows were recognized as athletes. Some rows may use unexpected column names.`,
      messageSv: `Bara ${summary.athletes.length} av ~${rowCount} rader kändes igen som spelare. Vissa rader kan ha oväntade kolumnnamn.`,
    })
  }

  const missingPc = summary.athletes.filter((a) => a.pc1 === null).length
  if (summary.athletes.length > 0 && missingPc === summary.athletes.length) {
    warnings.push({
      code: 'no_pc_scores',
      severity: 'info',
      messageEn: 'Athletes were recognized but no PC1 score column was found, so score-plot movement cannot be computed (outliers/VIP still work).',
      messageSv: 'Spelare kändes igen men ingen PC1-kolumn hittades, så förflyttning i score-plot kan inte beräknas (outliers/VIP fungerar ändå).',
    })
  }

  return warnings
}

/**
 * Match SIMCA athlete names against the team roster using normalized-key
 * equality with a light fallback (one name a prefix/substring of the other).
 */
export function matchRoster(athletes: SimcaAthleteScore[], roster: RosterMember[]): SimcaRosterMatch {
  const rosterByKey = new Map(roster.map((m) => [normalizeKey(m.name), m]))
  const usedRosterIds = new Set<string>()
  const matched: SimcaRosterMatch['matched'] = []
  const unmatchedSimca: string[] = []

  for (const athlete of athletes) {
    let member = rosterByKey.get(athlete.key)

    if (!member) {
      // Fallback: substring match (handles "Anna K" vs "Anna Karlsson").
      member = roster.find((m) => {
        if (usedRosterIds.has(m.id)) return false
        const mk = normalizeKey(m.name)
        return mk.length >= 3 && athlete.key.length >= 3 && (mk.includes(athlete.key) || athlete.key.includes(mk))
      })
    }

    if (member && !usedRosterIds.has(member.id)) {
      usedRosterIds.add(member.id)
      matched.push({ simcaName: athlete.name, rosterName: member.name, clientId: member.id })
    } else {
      unmatchedSimca.push(athlete.name)
    }
  }

  const unmatchedRoster = roster.filter((m) => !usedRosterIds.has(m.id)).map((m) => m.name)
  return { matched, unmatchedSimca, unmatchedRoster }
}
