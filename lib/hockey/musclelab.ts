import ExcelJS from 'exceljs'

export interface MuscleLabSummaryRow {
  exercise: string | null
  testType: string | null
  athleteName: string | null
  date: string | null
  side: string | null
  loadKg: number | null
  externalLoadKg: number | null
  bodyWeightKg: number | null
  averagePowerW: number | null
  averageForceN: number | null
  displacementCm: number | null
  averageVelocityMs: number | null
  peakVelocityMs: number | null
  timeToPeakVelocityS: number | null
  durationS: number | null
  eccentricAveragePowerW: number | null
  eccentricAverageForceN: number | null
  eccentricDisplacementCm: number | null
  eccentricAverageVelocityMs: number | null
}

export interface MuscleLabRawSample {
  t: number
  positionCm?: number | null
  velocityMs?: number | null
  forceN?: number | null
  powerW?: number | null
}

export interface MuscleLabRawTrace {
  traceId: string
  label: string
  sourceSheet?: string | null
  externalLoadKg?: number | null
  sampleCount: number
  durationS: number | null
  peakVelocityMs: number | null
  peakForceN: number | null
  peakPowerW: number | null
  timeToPeakVelocityS: number | null
  samples: MuscleLabRawSample[]
}

export interface MuscleLabRawDiagnostics {
  traceCount: number
  totalSamples: number
  maxPeakVelocityMs: number | null
  maxPeakForceN: number | null
  maxPeakPowerW: number | null
  flags: string[]
}

export interface MuscleLabMaxima {
  protocolLabel: string
  athleteName: string | null
  bodyWeightKg: number | null
  bestPowerLoadKg: number | null
  maxAveragePowerW: number | null
  maxAveragePowerPerBodyMass: number | null
  maxAverageForceN: number | null
  maxAverageVelocityMs: number | null
  powerPlateauLoadsKg: number[]
  displacementDropPercent: number | null
  loadVelocitySlope: number | null
  loadVelocityIntercept: number | null
  loadVelocityR2: number | null
  rawDiagnostics?: MuscleLabRawDiagnostics | null
  flags: string[]
}

export interface ParsedMuscleLabSession {
  athleteName: string | null
  testDate: string | null
  rows: MuscleLabSummaryRow[]
  maxima: MuscleLabMaxima
  jumpSquatLadder: Record<string, number>
  rawTraces?: MuscleLabRawTrace[]
  rawDiagnostics?: MuscleLabRawDiagnostics | null
}

const SERIAL_DATE_OFFSET = 25569
const MS_PER_DAY = 86400 * 1000

function cleanHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function excelSerialToDate(serial: number): string | null {
  if (!Number.isFinite(serial)) return null
  const date = new Date((serial - SERIAL_DATE_OFFSET) * MS_PER_DAY)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function toDateString(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  const numeric = toNumber(value)
  if (numeric && numeric > 20000 && numeric < 70000) return excelSerialToDate(numeric)
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
  }
  return null
}

function linearRegression(points: { x: number; y: number }[]) {
  if (points.length < 2) return { slope: null, intercept: null, r2: null }
  const n = points.length
  const sumX = points.reduce((sum, point) => sum + point.x, 0)
  const sumY = points.reduce((sum, point) => sum + point.y, 0)
  const sumXY = points.reduce((sum, point) => sum + point.x * point.y, 0)
  const sumXX = points.reduce((sum, point) => sum + point.x * point.x, 0)
  const denominator = n * sumXX - sumX * sumX
  if (denominator === 0) return { slope: null, intercept: null, r2: null }

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n
  const meanY = sumY / n
  const ssTot = points.reduce((sum, point) => sum + Math.pow(point.y - meanY, 2), 0)
  const ssRes = points.reduce((sum, point) => sum + Math.pow(point.y - (slope * point.x + intercept), 2), 0)
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  return { slope, intercept, r2 }
}

function round(value: number | null, decimals = 2): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

function getCell(row: unknown[], headers: Map<string, number>, names: string[]) {
  for (const name of names) {
    const index = headers.get(name)
    if (index != null) return row[index]
  }
  return null
}

function splitDelimitedLine(line: string): string[] {
  const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ','
  return line.split(delimiter).map((value) => value.trim())
}

function detectRawHeaders(headers: string[]) {
  const findIndex = (patterns: RegExp[]) => headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)))
  const timeIndex = findIndex([/^t(\[s\])?$/, /^time/, /tid/])
  const positionIndex = findIndex([/position/, /pos(\[| |$)/, /displacement/, /^d(\[cm\])?$/, /dist/])
  const velocityIndex = findIndex([/velocity/, /^v(\[m\/s\])?$/, /hastighet/, /speed/])
  const forceIndex = findIndex([/force/, /^f(\[n\])?$/, /kraft/])
  const powerIndex = findIndex([/power/, /^p(\[w\])?$/, /effekt/])

  if (timeIndex < 0 || (positionIndex < 0 && velocityIndex < 0 && forceIndex < 0 && powerIndex < 0)) {
    return null
  }

  return { timeIndex, positionIndex, velocityIndex, forceIndex, powerIndex }
}

function buildRawTrace(label: string, samples: MuscleLabRawSample[], sourceSheet: string | null = null): MuscleLabRawTrace | null {
  const cleanSamples = samples
    .filter((sample) => Number.isFinite(sample.t))
    .sort((a, b) => a.t - b.t)

  if (cleanSamples.length < 20) return null

  const peakVelocitySample = cleanSamples.reduce<MuscleLabRawSample | null>(
    (best, sample) => sample.velocityMs != null && (!best || sample.velocityMs > (best.velocityMs ?? -Infinity)) ? sample : best,
    null,
  )
  const peakForce = Math.max(...cleanSamples.map((sample) => sample.forceN ?? -Infinity))
  const peakPower = Math.max(...cleanSamples.map((sample) => sample.powerW ?? -Infinity))
  const duration = cleanSamples[cleanSamples.length - 1].t - cleanSamples[0].t

  return {
    traceId: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'trace',
    label,
    sourceSheet,
    sampleCount: cleanSamples.length,
    durationS: round(duration, 3),
    peakVelocityMs: round(peakVelocitySample?.velocityMs ?? null, 3),
    peakForceN: Number.isFinite(peakForce) ? round(peakForce, 0) : null,
    peakPowerW: Number.isFinite(peakPower) ? round(peakPower, 0) : null,
    timeToPeakVelocityS: peakVelocitySample ? round(peakVelocitySample.t - cleanSamples[0].t, 3) : null,
    samples: downsampleTrace(cleanSamples, 240),
  }
}

function downsampleTrace(samples: MuscleLabRawSample[], maxSamples: number): MuscleLabRawSample[] {
  if (samples.length <= maxSamples) return samples
  const step = (samples.length - 1) / (maxSamples - 1)
  return Array.from({ length: maxSamples }, (_, index) => samples[Math.round(index * step)])
}

function diagnosticsForRawTraces(rawTraces: MuscleLabRawTrace[]): MuscleLabRawDiagnostics | null {
  if (rawTraces.length === 0) return null
  const maxPeakVelocity = Math.max(...rawTraces.map((trace) => trace.peakVelocityMs ?? -Infinity))
  const maxPeakForce = Math.max(...rawTraces.map((trace) => trace.peakForceN ?? -Infinity))
  const maxPeakPower = Math.max(...rawTraces.map((trace) => trace.peakPowerW ?? -Infinity))
  const flags: string[] = []

  for (const trace of rawTraces) {
    if (trace.peakVelocityMs != null && trace.timeToPeakVelocityS != null && trace.durationS && trace.timeToPeakVelocityS > trace.durationS * 0.75) {
      flags.push(`${trace.label}: peak velocity occurs late in the movement.`)
    }
    if (trace.peakPowerW != null && trace.peakPowerW <= 0) {
      flags.push(`${trace.label}: no positive peak power was found.`)
    }
  }

  return {
    traceCount: rawTraces.length,
    totalSamples: rawTraces.reduce((sum, trace) => sum + trace.sampleCount, 0),
    maxPeakVelocityMs: Number.isFinite(maxPeakVelocity) ? round(maxPeakVelocity, 3) : null,
    maxPeakForceN: Number.isFinite(maxPeakForce) ? round(maxPeakForce, 0) : null,
    maxPeakPowerW: Number.isFinite(maxPeakPower) ? round(maxPeakPower, 0) : null,
    flags,
  }
}

function parseRawRows(rawRows: unknown[][], label: string, sourceSheet: string | null = null): MuscleLabRawTrace[] {
  const traces: MuscleLabRawTrace[] = []
  const headerIndex = rawRows.findIndex((row) => detectRawHeaders(row.map(cleanHeader)) != null)
  if (headerIndex < 0) return traces

  const headers = rawRows[headerIndex].map(cleanHeader)
  const detected = detectRawHeaders(headers)
  if (!detected) return traces

  const samples: MuscleLabRawSample[] = []
  for (const row of rawRows.slice(headerIndex + 1)) {
    const t = toNumber(row[detected.timeIndex])
    if (t == null) continue
    samples.push({
      t,
      positionCm: detected.positionIndex >= 0 ? toNumber(row[detected.positionIndex]) : null,
      velocityMs: detected.velocityIndex >= 0 ? toNumber(row[detected.velocityIndex]) : null,
      forceN: detected.forceIndex >= 0 ? toNumber(row[detected.forceIndex]) : null,
      powerW: detected.powerIndex >= 0 ? toNumber(row[detected.powerIndex]) : null,
    })
  }

  const trace = buildRawTrace(label, samples, sourceSheet)
  if (trace) traces.push(trace)
  return traces
}

export function parseMuscleLabRawText(text: string, fileName = 'MuscleLab raw export'): ParsedMuscleLabSession {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const rows = lines.map(splitDelimitedLine)
  const rawTraces = parseRawRows(rows, fileName, fileName)
  const rawDiagnostics = diagnosticsForRawTraces(rawTraces)
  if (!rawDiagnostics) throw new Error('No MuscleLab raw trace columns found')

  const maxima: MuscleLabMaxima = {
    protocolLabel: 'MuscleLab raw curve export',
    athleteName: null,
    bodyWeightKg: null,
    bestPowerLoadKg: null,
    maxAveragePowerW: null,
    maxAveragePowerPerBodyMass: null,
    maxAverageForceN: null,
    maxAverageVelocityMs: rawDiagnostics.maxPeakVelocityMs,
    powerPlateauLoadsKg: [],
    displacementDropPercent: null,
    loadVelocitySlope: null,
    loadVelocityIntercept: null,
    loadVelocityR2: null,
    rawDiagnostics,
    flags: rawDiagnostics.flags,
  }

  return {
    athleteName: null,
    testDate: null,
    rows: [],
    maxima,
    jumpSquatLadder: {},
    rawTraces,
    rawDiagnostics,
  }
}

export async function parseMuscleLabWorkbook(buffer: Buffer): Promise<ParsedMuscleLabSession> {
  const workbook = new ExcelJS.Workbook()
  await (workbook.xlsx.load as (data: unknown) => Promise<ExcelJS.Workbook>)(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error('Workbook has no worksheets')

  const headerRow = sheet.getRow(1).values as unknown[]
  const headers = new Map<string, number>()
  headerRow.forEach((value, index) => {
    if (index > 0) headers.set(cleanHeader(value), index)
  })

  const rows: MuscleLabSummaryRow[] = []

  sheet.eachRow((worksheetRow, rowNumber) => {
    if (rowNumber === 1) return
    const values = worksheetRow.values as unknown[]
    const row: MuscleLabSummaryRow = {
      exercise: String(getCell(values, headers, ['exercise']) ?? '').trim() || null,
      testType: String(getCell(values, headers, ['test type']) ?? '').trim() || null,
      athleteName: String(getCell(values, headers, ['name']) ?? '').trim() || null,
      date: toDateString(getCell(values, headers, ['date'])),
      side: String(getCell(values, headers, ['side']) ?? '').trim() || null,
      loadKg: toNumber(getCell(values, headers, ['load kg'])),
      externalLoadKg: toNumber(getCell(values, headers, ['external load'])),
      bodyWeightKg: toNumber(getCell(values, headers, ['body weight'])),
      averagePowerW: toNumber(getCell(values, headers, ['ap[w]', 'ap [w]'])),
      averageForceN: toNumber(getCell(values, headers, ['af[n]', 'af [n]'])),
      displacementCm: toNumber(getCell(values, headers, ['d[cm]', 'd [cm]'])),
      averageVelocityMs: toNumber(getCell(values, headers, ['av[m/s]', 'av [m/s]'])),
      peakVelocityMs: toNumber(getCell(values, headers, ['pv[m/s]', 'pv [m/s]'])),
      timeToPeakVelocityS: toNumber(getCell(values, headers, ['tpv[s]', 'tpv [s]'])),
      durationS: toNumber(getCell(values, headers, ['t[s]', 't [s]'])),
      eccentricAveragePowerW: toNumber(getCell(values, headers, ['apn[w]', 'apn [w]'])),
      eccentricAverageForceN: toNumber(getCell(values, headers, ['afn[n]', 'afn [n]'])),
      eccentricDisplacementCm: toNumber(getCell(values, headers, ['dn[cm]', 'dn [cm]'])),
      eccentricAverageVelocityMs: toNumber(getCell(values, headers, ['avn[m/s]', 'avn [m/s]'])),
    }

    if (
      row.externalLoadKg != null ||
      row.averagePowerW != null ||
      row.averageVelocityMs != null ||
      row.averageForceN != null
    ) {
      rows.push(row)
    }
  })

  const rawTraces = workbook.worksheets.flatMap((worksheet) => {
    const rawRows: unknown[][] = []
    worksheet.eachRow((worksheetRow) => {
      rawRows.push(worksheetRow.values as unknown[])
    })
    return parseRawRows(rawRows, worksheet.name, worksheet.name)
  })
  const rawDiagnostics = diagnosticsForRawTraces(rawTraces)

  if (rows.length === 0 && rawTraces.length === 0) throw new Error('No MuscleLab summary rows or raw traces found')

  const validPowerRows = rows.filter((row) => row.externalLoadKg != null && row.averagePowerW != null)
  const bestPowerRow = validPowerRows.reduce<MuscleLabSummaryRow | null>(
    (best, row) => (!best || row.averagePowerW! > best.averagePowerW! ? row : best),
    null,
  )
  const maxPower = bestPowerRow?.averagePowerW ?? null
  const bodyWeight = rows.find((row) => row.bodyWeightKg != null)?.bodyWeightKg ?? null
  const firstDisplacement = rows.find((row) => row.displacementCm != null)?.displacementCm ?? null
  const lastDisplacement = [...rows].reverse().find((row) => row.displacementCm != null)?.displacementCm ?? null
  const regression = linearRegression(
    rows
      .filter((row) => row.externalLoadKg != null && row.averageVelocityMs != null)
      .map((row) => ({ x: row.externalLoadKg!, y: row.averageVelocityMs! })),
  )
  const powerPlateauLoadsKg = maxPower == null
    ? []
    : validPowerRows
        .filter((row) => row.averagePowerW! >= maxPower * 0.975)
        .map((row) => row.externalLoadKg!)

  const flags: string[] = []
  if (firstDisplacement && lastDisplacement && lastDisplacement < firstDisplacement * 0.8) {
    flags.push('ROM decreases clearly as load increases. Interpret the profile as power/quarter-depth, not full-depth 1RM.')
  }
  const peakVelocityValues = rows.map((row) => row.peakVelocityMs).filter((value): value is number => value != null)
  if (peakVelocityValues.length >= 3) {
    const maxPeakVelocity = Math.max(...peakVelocityValues)
    const medianPeakVelocity = [...peakVelocityValues].sort((a, b) => a - b)[Math.floor(peakVelocityValues.length / 2)]
    if (maxPeakVelocity > medianPeakVelocity * 1.35) {
      flags.push('One peak-velocity row is a clear outlier. Use AV as the primary load-velocity curve until raw data confirms pV.')
    }
  }

  const protocolLabel = rows.some((row) => row.testType?.toLowerCase().includes('ecccon'))
    ? 'Loaded squat jump / power squat profile'
    : 'MuscleLab profile'

  const maxima: MuscleLabMaxima = {
    protocolLabel,
    athleteName: rows.find((row) => row.athleteName)?.athleteName ?? null,
    bodyWeightKg: bodyWeight,
    bestPowerLoadKg: bestPowerRow?.externalLoadKg ?? null,
    maxAveragePowerW: round(maxPower, 0),
    maxAveragePowerPerBodyMass: round(maxPower != null && bodyWeight ? maxPower / bodyWeight : null, 1),
    maxAverageForceN: round(Math.max(...rows.map((row) => row.averageForceN ?? -Infinity)), 0),
    maxAverageVelocityMs: round(Math.max(...rows.map((row) => row.averageVelocityMs ?? -Infinity)), 2),
    powerPlateauLoadsKg,
    displacementDropPercent: round(
      firstDisplacement && lastDisplacement ? ((firstDisplacement - lastDisplacement) / firstDisplacement) * 100 : null,
      1,
    ),
    loadVelocitySlope: round(regression.slope, 4),
    loadVelocityIntercept: round(regression.intercept, 3),
    loadVelocityR2: round(regression.r2, 3),
    rawDiagnostics,
    flags: [...flags, ...(rawDiagnostics?.flags ?? [])],
  }

  const jumpSquatLadder = Object.fromEntries(
    validPowerRows.map((row) => [String(row.externalLoadKg), Math.round(row.averagePowerW!)]),
  )

  return {
    athleteName: maxima.athleteName,
    testDate: rows.find((row) => row.date)?.date ?? null,
    rows,
    maxima,
    jumpSquatLadder,
    rawTraces,
    rawDiagnostics,
  }
}
