import { jsPDF } from 'jspdf'
import { buildIceSpeedProfileRows, buildRepeatedSprintProfile } from '@/lib/hockey/ice-speed'

interface HockeyTestReportClient {
  id: string
  name: string
}

interface HockeyTestReportTeam {
  id: string
  name: string
}

interface MuscleLabSummaryRow {
  externalLoadKg: number | null
  averagePowerW: number | null
  averageVelocityMs: number | null
  averageForceN: number | null
  displacementCm: number | null
}

interface MuscleLabRawSample {
  t: number
  velocityMs?: number | null
  forceN?: number | null
  powerW?: number | null
}

interface MuscleLabRawTrace {
  label: string
  sampleCount: number
  peakVelocityMs: number | null
  peakForceN: number | null
  peakPowerW: number | null
  samples: MuscleLabRawSample[]
}

export interface HockeyTestReportData {
  id: string
  testDate: string
  notes: string | null
  client: HockeyTestReportClient
  team: HockeyTestReportTeam | null
  agility505Left: number | null
  agility505Right: number | null
  sprint5m: number | null
  sprint10m: number | null
  sprint20m: number | null
  sprint30m: number | null
  sprint20mFly: number | null
  sprint30mFly: number | null
  endurance7x40: number[] | null
  jumpSquatLadder: Record<string, number> | null
  gripStrengthLeft: number | null
  gripStrengthRight: number | null
  standingLongJump: number | null
  threeJumpLeft: number | null
  threeJumpRight: number | null
  beepTestLevel: number | null
  beepTestShuttle: number | null
  vo2max: number | null
  lt1HeartRate: number | null
  lt1SpeedKmh: number | null
  lt1Lactate: number | null
  lt2HeartRate: number | null
  lt2SpeedKmh: number | null
  lt2Lactate: number | null
  maxHeartRate: number | null
  maxLactate: number | null
  rampDurationSec: number | null
  peakSpeedKmh: number | null
  rerMax: number | null
  veMax: number | null
  breathingFrequencyMax: number | null
  economyMlKgKm: number | null
  hrRecovery1Min: number | null
  hrRecovery2Min: number | null
  lactateClearance3Min: number | null
  lactateClearance5Min: number | null
  lactateClearance10Min: number | null
  backSquat1RM: number | null
  powerClean1RM: number | null
  benchPress1RM: number | null
  pullUp1RM: number | null
  muscleLabJumps: MuscleLabSummaryRow[] | null
  muscleLabMaxima: {
    maxAveragePowerW?: number | null
    maxAveragePowerPerBodyMass?: number | null
    powerPlateauLoadsKg?: number[]
    displacementDropPercent?: number | null
    flags?: string[]
  } | null
  muscleLabRaw: {
    traces: MuscleLabRawTrace[]
    diagnostics: {
      traceCount: number
      totalSamples: number
      maxPeakVelocityMs: number | null
      maxPeakForceN: number | null
      maxPeakPowerW: number | null
      flags: string[]
    } | null
  } | null
}

type MetricRow = [label: string, value: string]

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatNumber(value: number | null | undefined, decimals = 2): string | null {
  if (value == null || Number.isNaN(value)) return null
  return value.toFixed(decimals)
}

function metric(label: string, value: number | null | undefined, unit: string, decimals = 2): MetricRow | null {
  const formatted = formatNumber(value, decimals)
  return formatted ? [label, `${formatted}${unit ? ` ${unit}` : ''}`] : null
}

function formatSpeed(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '-' : `${value.toFixed(1)} km/h`
}

function maxMetric(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((value): value is number => value != null && Number.isFinite(value))
  return clean.length > 0 ? Math.max(...clean) : null
}

function minMetric(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((value): value is number => value != null && Number.isFinite(value))
  return clean.length > 0 ? Math.min(...clean) : null
}

function percentDifference(left: number | null | undefined, right: number | null | undefined): number | null {
  if (left == null || right == null) return null
  const best = Math.max(left, right)
  if (best <= 0) return null
  return Math.abs(left - right) / best * 100
}

function compactRows(rows: Array<MetricRow | null>): MetricRow[] {
  return rows.filter((row): row is MetricRow => Boolean(row))
}

function addPageIfNeeded(pdf: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight < PAGE_HEIGHT - 18) return y
  pdf.addPage()
  return 20
}

function sectionTitle(pdf: jsPDF, title: string, y: number): number {
  y = addPageIfNeeded(pdf, y, 14)
  pdf.setTextColor(20, 20, 20)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text(title, MARGIN, y)
  pdf.setDrawColor(225, 225, 225)
  pdf.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2)
  return y + 8
}

function metricGrid(pdf: jsPDF, rows: MetricRow[], y: number): number {
  if (rows.length === 0) return y
  const columns = 3
  const cellWidth = CONTENT_WIDTH / columns
  const cellHeight = 15

  for (let index = 0; index < rows.length; index += columns) {
    y = addPageIfNeeded(pdf, y, cellHeight + 4)
    const row = rows.slice(index, index + columns)

    row.forEach(([label, value], col) => {
      const x = MARGIN + col * cellWidth
      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(231, 235, 241)
      pdf.roundedRect(x, y, cellWidth - 3, cellHeight, 2, 2, 'FD')
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(105, 105, 105)
      pdf.text(label, x + 3, y + 5)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(30, 30, 30)
      pdf.text(value, x + 3, y + 11)
    })

    y += cellHeight + 3
  }

  return y + 2
}

function drawSeriesChart(
  pdf: jsPDF,
  title: string,
  series: Array<{ x: number; y: number }>,
  y: number,
  options: { xLabel: string; yLabel: string; stroke: [number, number, number] },
): number {
  if (series.length < 2) return y
  y = addPageIfNeeded(pdf, y, 58)

  const x = MARGIN
  const chartY = y + 8
  const width = CONTENT_WIDTH
  const height = 42
  const xs = series.map((point) => point.x)
  const ys = series.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const yRange = maxY - minY || 1
  const xRange = maxX - minX || 1

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 30, 30)
  pdf.text(title, x, y)
  pdf.setDrawColor(226, 232, 240)
  pdf.rect(x, chartY, width, height)
  pdf.setDrawColor(...options.stroke)
  pdf.setLineWidth(0.8)

  series.forEach((point, index) => {
    const px = x + ((point.x - minX) / xRange) * width
    const py = chartY + height - ((point.y - minY) / yRange) * height
    if (index === 0) return
    const prev = series[index - 1]
    const ppx = x + ((prev.x - minX) / xRange) * width
    const ppy = chartY + height - ((prev.y - minY) / yRange) * height
    pdf.line(ppx, ppy, px, py)
  })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(105, 105, 105)
  pdf.text(`${options.yLabel}: ${minY.toFixed(1)}-${maxY.toFixed(1)}`, x + 2, chartY + height + 5)
  pdf.text(`${options.xLabel}: ${minX.toFixed(1)}-${maxX.toFixed(1)}`, PAGE_WIDTH - MARGIN - 42, chartY + height + 5)

  return chartY + height + 11
}

function table(pdf: jsPDF, headers: string[], rows: string[][], y: number): number {
  if (rows.length === 0) return y
  const colWidth = CONTENT_WIDTH / headers.length
  y = addPageIfNeeded(pdf, y, 12 + rows.length * 7)

  pdf.setFillColor(241, 245, 249)
  pdf.rect(MARGIN, y - 4, CONTENT_WIDTH, 8, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(45, 45, 45)
  headers.forEach((header, index) => {
    pdf.text(header, MARGIN + index * colWidth + 2, y)
  })
  y += 7

  pdf.setFont('helvetica', 'normal')
  rows.forEach((row) => {
    y = addPageIfNeeded(pdf, y, 8)
    row.forEach((value, index) => {
      pdf.text(value, MARGIN + index * colWidth + 2, y)
    })
    pdf.setDrawColor(235, 235, 235)
    pdf.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2)
    y += 7
  })

  return y + 3
}

function filenameSafe(value: string): string {
  return value
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 42)
}

export function generateHockeyTestReportPDF(test: HockeyTestReportData): Blob {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 20

  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, PAGE_WIDTH, 32, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('Hockeytest', MARGIN, 16)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`${test.client.name} · ${formatDate(test.testDate)}`, MARGIN, 24)
  if (test.team?.name) {
    pdf.text(test.team.name, PAGE_WIDTH - MARGIN - 45, 24)
  }
  y = 42

  const maxima = test.muscleLabMaxima
  const diagnostics = test.muscleLabRaw?.diagnostics
  const topRows = compactRows([
    metric('Pmax / body mass', maxima?.maxAveragePowerPerBodyMass, 'W/kg', 1),
    metric('Max AP', maxima?.maxAveragePowerW, 'W', 0),
    metric('Raw peak power', diagnostics?.maxPeakPowerW, 'W', 0),
    metric('5 m', test.sprint5m, 's'),
    metric('10 m', test.sprint10m, 's'),
    metric('30 m', test.sprint30m, 's'),
    metric('Back squat 1RM', test.backSquat1RM, 'kg', 0),
    metric('Power clean 1RM', test.powerClean1RM, 'kg', 0),
    metric('Standing long jump', test.standingLongJump, 'cm', 0),
  ])
  y = metricGrid(pdf, topRows, y)

  const enduranceTimes = test.endurance7x40 ?? []
  const repeatedSprint = buildRepeatedSprintProfile(enduranceTimes)
  const enduranceBest = repeatedSprint.bestTimeS
  const enduranceMean = repeatedSprint.averageTimeS
  const enduranceDrop = repeatedSprint.fatigueDropPct
  const gripAsymmetry = percentDifference(test.gripStrengthLeft, test.gripStrengthRight)
  const threeJumpBest = maxMetric([test.threeJumpLeft, test.threeJumpRight])
  const threeJumpAsymmetry = percentDifference(test.threeJumpLeft, test.threeJumpRight)
  const agilityBest = minMetric([test.agility505Left, test.agility505Right])
  const beepScore = test.beepTestLevel != null
    ? test.beepTestLevel + ((test.beepTestShuttle ?? 0) / 10)
    : null
  const diagnosticRows = compactRows([
    metric('Best 5-10-5', agilityBest, 's'),
    metric('7x40 best', enduranceBest, 's'),
    metric('7x40 average', enduranceMean, 's'),
    metric('7x40 avg speed', repeatedSprint.averageSpeedKmh, 'km/h', 1),
    metric('7x40 drop', enduranceDrop, '%', 1),
    metric('7x40 resistance', repeatedSprint.fatigueResistancePct, '%', 0),
    metric('7x40 decrement', repeatedSprint.sprintDecrementPct, '%', 1),
    metric('Grip asymmetry', gripAsymmetry, '%', 1),
    metric('3-step best', threeJumpBest, 'cm', 0),
    metric('3-step asymmetry', threeJumpAsymmetry, '%', 1),
    metric('Beep score', beepScore, '', 1),
  ])
  if (diagnosticRows.length > 0) {
    y = sectionTitle(pdf, 'Coach diagnostics', y)
    y = metricGrid(pdf, diagnosticRows, y)

    const diagnosticFlags = [
      enduranceDrop != null && enduranceDrop >= 6
        ? `7x40 fatigue drop ${enduranceDrop.toFixed(1)}% - follow repeated sprint recovery`
        : null,
      gripAsymmetry != null && gripAsymmetry >= 10
        ? `Grip asymmetry ${gripAsymmetry.toFixed(1)}% - compare shoulder/hand load tolerance`
        : null,
      threeJumpAsymmetry != null && threeJumpAsymmetry >= 8
        ? `3-step asymmetry ${threeJumpAsymmetry.toFixed(1)}% - check single-leg power and landing quality`
        : null,
    ].filter((flag): flag is string => flag != null)

    if (diagnosticFlags.length > 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(110, 70, 20)
      diagnosticFlags.forEach((flag) => {
        y = addPageIfNeeded(pdf, y, 6)
        pdf.text(`- ${flag}`, MARGIN, y)
        y += 5
      })
      y += 3
    }
  }

  y = sectionTitle(pdf, 'MuscleLab', y)
  const plateau = maxima?.powerPlateauLoadsKg?.length
    ? `+${maxima.powerPlateauLoadsKg.join('/+')} kg`
    : null
  y = metricGrid(pdf, compactRows([
    metric('Max average velocity', maxMetric((test.muscleLabJumps ?? []).map((row) => row.averageVelocityMs)), 'm/s'),
    metric('Max average force', maxMetric((test.muscleLabJumps ?? []).map((row) => row.averageForceN)), 'N', 0),
    metric('ROM drop', maxima?.displacementDropPercent, '%', 0),
    plateau ? ['Power plateau', plateau] : null,
    diagnostics?.traceCount ? ['Raw traces', `${diagnostics.traceCount}`] : null,
    metric('Raw peak velocity', diagnostics?.maxPeakVelocityMs, 'm/s'),
  ]), y)

  const summaryRows = test.muscleLabJumps ?? []
  y = table(
    pdf,
    ['Load', 'AP', 'AV', 'AF', 'Disp'],
    summaryRows.map((row) => [
      row.externalLoadKg == null ? '-' : `+${row.externalLoadKg} kg`,
      row.averagePowerW == null ? '-' : `${row.averagePowerW.toFixed(0)} W`,
      row.averageVelocityMs == null ? '-' : `${row.averageVelocityMs.toFixed(2)} m/s`,
      row.averageForceN == null ? '-' : `${row.averageForceN.toFixed(0)} N`,
      row.displacementCm == null ? '-' : `${row.displacementCm.toFixed(1)} cm`,
    ]),
    y,
  )

  y = drawSeriesChart(
    pdf,
    'Load-power curve',
    summaryRows
      .filter((row) => row.externalLoadKg != null && row.averagePowerW != null)
      .map((row) => ({ x: row.externalLoadKg as number, y: row.averagePowerW as number })),
    y,
    { xLabel: 'kg', yLabel: 'W', stroke: [37, 99, 235] },
  )

  y = drawSeriesChart(
    pdf,
    'Load-velocity curve',
    summaryRows
      .filter((row) => row.externalLoadKg != null && row.averageVelocityMs != null)
      .map((row) => ({ x: row.externalLoadKg as number, y: row.averageVelocityMs as number })),
    y,
    { xLabel: 'kg', yLabel: 'm/s', stroke: [22, 163, 74] },
  )

  const rawTrace = test.muscleLabRaw?.traces?.[0]
  if (rawTrace?.samples?.length) {
    y = drawSeriesChart(
      pdf,
      `Raw curve: ${rawTrace.label}`,
      rawTrace.samples
        .filter((sample) => sample.powerW != null)
        .map((sample) => ({ x: sample.t, y: sample.powerW as number })),
      y,
      { xLabel: 's', yLabel: 'W', stroke: [234, 88, 12] },
    )
  }

  const flags = [...(maxima?.flags ?? []), ...(diagnostics?.flags ?? [])]
  if (flags.length > 0) {
    y = sectionTitle(pdf, 'Coach alerts', y)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(110, 70, 20)
    flags.forEach((flag) => {
      y = addPageIfNeeded(pdf, y, 8)
      pdf.text(`- ${flag}`, MARGIN, y)
      y += 5
    })
    y += 4
  }

  y = sectionTitle(pdf, 'Ice tests', y)
  const iceSpeedRows = buildIceSpeedProfileRows({
    sprint10m: test.sprint10m,
    sprint20m: test.sprint20m,
    sprint30m: test.sprint30m,
    endurance7x40Best: enduranceBest,
  })
  y = metricGrid(pdf, compactRows([
    metric('Agility 5-10-5 left', test.agility505Left, 's'),
    metric('Agility 5-10-5 right', test.agility505Right, 's'),
    metric('5 m', test.sprint5m, 's'),
    metric('10 m', test.sprint10m, 's'),
    metric('0-10 speed', iceSpeedRows.find((row) => row.key === 'sprint0to10')?.speedKmh, 'km/h', 1),
    metric('20 m', test.sprint20m, 's'),
    metric('10-20 speed', iceSpeedRows.find((row) => row.key === 'sprint10to20')?.speedKmh, 'km/h', 1),
    metric('30 m', test.sprint30m, 's'),
    metric('20-30 speed', iceSpeedRows.find((row) => row.key === 'sprint20to30')?.speedKmh, 'km/h', 1),
    metric('20 m fly', test.sprint20mFly, 's'),
    metric('30 m fly', test.sprint30mFly, 's'),
    metric('7x40 best speed', iceSpeedRows.find((row) => row.key === 'endurance7x40Best')?.speedKmh, 'km/h', 1),
    metric('7x40 avg speed', repeatedSprint.averageSpeedKmh, 'km/h', 1),
    metric('7x40 resistance', repeatedSprint.fatigueResistancePct, '%', 0),
  ]), y)
  if (iceSpeedRows.length > 0) {
    y = table(
      pdf,
      ['Stint', 'Time', 'Speed'],
      iceSpeedRows.map((row) => [row.label, `${row.timeS.toFixed(2)} s`, formatSpeed(row.speedKmh)]),
      y,
    )
  }
  if (test.endurance7x40?.length) {
    y = table(
      pdf,
      ['Rep', 'Time', 'Speed'],
      test.endurance7x40.map((time, index) => [
        `${index + 1}`,
        `${time.toFixed(2)} s`,
        formatSpeed((40 / time) * 3.6),
      ]),
      y,
    )
  }

  y = sectionTitle(pdf, 'Strength and jumps', y)
  y = metricGrid(pdf, compactRows([
    metric('Back squat 1RM', test.backSquat1RM, 'kg', 0),
    metric('Power clean 1RM', test.powerClean1RM, 'kg', 0),
    metric('Bench press 1RM', test.benchPress1RM, 'kg', 0),
    metric('Pull-up 1RM', test.pullUp1RM, 'kg', 0),
    metric('Grip left', test.gripStrengthLeft, 'kg', 1),
    metric('Grip right', test.gripStrengthRight, 'kg', 1),
    metric('Standing long jump', test.standingLongJump, 'cm', 0),
    metric('3-step jump left', test.threeJumpLeft, 'cm', 0),
    metric('3-step jump right', test.threeJumpRight, 'cm', 0),
    metric('Beep level', test.beepTestLevel, '', 0),
    metric('Beep shuttle', test.beepTestShuttle, '', 0),
    metric('VO2max', test.vo2max, 'ml/kg/min', 1),
    metric('LT1 HR', test.lt1HeartRate, 'bpm', 0),
    metric('LT1 speed', test.lt1SpeedKmh, 'km/h', 1),
    metric('LT1 lactate', test.lt1Lactate, 'mmol/L', 1),
    metric('LT2 HR', test.lt2HeartRate, 'bpm', 0),
    metric('LT2 speed', test.lt2SpeedKmh, 'km/h', 1),
    metric('LT2 lactate', test.lt2Lactate, 'mmol/L', 1),
    metric('Max HR', test.maxHeartRate, 'bpm', 0),
    metric('Max lactate', test.maxLactate, 'mmol/L', 1),
    metric('Ramp duration', test.rampDurationSec ? test.rampDurationSec / 60 : null, 'min', 1),
    metric('Peak speed', test.peakSpeedKmh, 'km/h', 1),
    metric('RER max', test.rerMax, '', 2),
    metric('VE max', test.veMax, 'L/min', 1),
    metric('BF max', test.breathingFrequencyMax, '/min', 1),
    metric('Economy', test.economyMlKgKm, 'ml/kg/km', 1),
    metric('HRR 1 min', test.hrRecovery1Min, 'bpm', 0),
    metric('HRR 2 min', test.hrRecovery2Min, 'bpm', 0),
    metric('Lactate clearance 5 min', test.lactateClearance5Min, 'mmol/L', 1),
  ]), y)

  if (test.notes) {
    y = sectionTitle(pdf, 'Notes', y)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(80, 80, 80)
    const noteLines = pdf.splitTextToSize(test.notes, CONTENT_WIDTH)
    pdf.text(noteLines, MARGIN, y)
  }

  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(140, 140, 140)
    pdf.text(`Genererad ${new Date().toLocaleString('sv-SE')}`, MARGIN, 286)
    pdf.text(`Trainomics · ${page}/${pageCount}`, PAGE_WIDTH - MARGIN - 30, 286)
  }

  return pdf.output('blob')
}

export function generateHockeyTestReportFilename(test: HockeyTestReportData): string {
  const athlete = filenameSafe(test.client.name || 'athlete')
  const date = new Date(test.testDate).toISOString().split('T')[0]
  return `Hockeytest_${athlete}_${date}.pdf`
}

export function downloadHockeyTestReportPDF(test: HockeyTestReportData): void {
  const blob = generateHockeyTestReportPDF(test)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = generateHockeyTestReportFilename(test)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
