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
  flags: string[]
}

export interface ParsedMuscleLabSession {
  athleteName: string | null
  testDate: string | null
  rows: MuscleLabSummaryRow[]
  maxima: MuscleLabMaxima
  jumpSquatLadder: Record<string, number>
}

const SERIAL_DATE_OFFSET = 25569
const MS_PER_DAY = 86400 * 1000

function cleanHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
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

  if (rows.length === 0) throw new Error('No MuscleLab summary rows found')

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
    flags.push('ROM minskar tydligt med ökad belastning. Tolka profilen som power/quarter-depth, inte full-depth 1RM.')
  }
  const peakVelocityValues = rows.map((row) => row.peakVelocityMs).filter((value): value is number => value != null)
  if (peakVelocityValues.length >= 3) {
    const maxPeakVelocity = Math.max(...peakVelocityValues)
    const medianPeakVelocity = [...peakVelocityValues].sort((a, b) => a - b)[Math.floor(peakVelocityValues.length / 2)]
    if (maxPeakVelocity > medianPeakVelocity * 1.35) {
      flags.push('En peak velocity-rad avviker kraftigt. Använd AV som primär LV-kurva tills rådata bekräftar pV.')
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
    flags,
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
  }
}
