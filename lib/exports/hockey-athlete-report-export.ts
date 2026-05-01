import { jsPDF } from 'jspdf'
import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'
import { buildIceSpeedProfileRows } from '@/lib/hockey/ice-speed'

interface HockeyTestSummary {
  id: string
  testDate: string
  sourceType: string
  notes: string | null
  season?: string
  ageAtTest?: number | null
  developmentLevel?: string
  teamName?: string | null
  metrics: Record<string, number | null>
  qualityFlags?: Array<{
    key: string
    severity: 'info' | 'warning'
    label: string
    detail: string
  }>
}

interface HockeyTrend {
  key: string
  delta: number
  percentChange: number | null
  direction: 'up' | 'down'
  isImprovement: boolean
}

interface HockeyBest {
  key: string
  value: number
  testDate: string
  testId: string
}

interface HockeyFlag {
  key: string
  severity: 'info' | 'warning'
  label: string
}

export interface HockeyAthleteReportMetric {
  key: string
  label: string
  unit: string
  decimals: number
}

export interface HockeyAthleteReportPlanItem {
  title: string
  description: string
  tone: 'priority' | 'watch' | 'positive' | 'info'
}

interface HockeyPathwaySeason {
  season: string
  level: string
  testCount: number
  firstDate: string
  lastDate: string
  ageRange: string | null
  teamNames: string[]
  startMetrics: Record<string, number | null>
  endMetrics: Record<string, number | null>
  changes: Record<string, number | null>
}

interface HockeyPathwayMilestone {
  id: string
  date: string
  label: string
  detail: string
  tone: 'info' | 'positive'
}

interface HockeyPathwayReadinessGap {
  metricKey: string
  label: string
  value: number | null
  target: number
  elite: number
  gapToTarget: number
  gapToElite: number
  unit: string
  lowerIsBetter: boolean
  status: 'missing' | 'below-target' | 'target' | 'elite'
}

interface HockeyPathwayReadiness {
  level: string
  score: number | null
  targetHits: number
  targetCount: number
  eliteHits: number
  gaps?: HockeyPathwayReadinessGap[]
  primaryGap: HockeyPathwayReadinessGap | null
}

export interface HockeyAthleteReportData {
  clientId: string
  clientName: string
  settings: HockeySettings
  latest: HockeyTestSummary | null
  previous: HockeyTestSummary | null
  bests: Record<string, HockeyBest | null>
  trends: HockeyTrend[]
  flags: HockeyFlag[]
  history: HockeyTestSummary[]
  metrics: HockeyAthleteReportMetric[]
  snapshotMetricKeys: readonly string[]
  bestMetricKeys: readonly string[]
  coachPlan: HockeyAthleteReportPlanItem[]
  pathway?: {
    seasons: HockeyPathwaySeason[]
    milestones: HockeyPathwayMilestone[]
    readiness?: HockeyPathwayReadiness[]
    nextLevel?: HockeyPathwayReadiness | null
  }
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const POSITION_LABELS: Record<string, string> = {
  center: 'Center',
  wing: 'Forward',
  defense: 'Back',
  goalie: 'Malvakt',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Motionshockey',
  junior: 'Junior',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  hockeyettan: 'Hockeyettan',
  hockeyallsvenskan: 'Hockeyallsvenskan',
  shl: 'SHL',
}

const PHASE_LABELS: Record<string, string> = {
  off_season: 'Off-season',
  pre_season: 'Forsasong',
  in_season: 'Sasong',
  playoffs: 'Slutspel',
}

function formatMetricValue(value: number | null | undefined, unit: string, decimals: number): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function formatSpeed(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '-' : `${value.toFixed(1)} km/h`
}

function formatDelta(delta: number, unit: string, decimals: number): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('sv-SE')
}

function filenamePart(value: string): string {
  return value
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 42) || 'athlete'
}

function addPageIfNeeded(pdf: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight < PAGE_HEIGHT - 18) return y
  pdf.addPage()
  return 20
}

function sectionTitle(pdf: jsPDF, title: string, y: number): number {
  y = addPageIfNeeded(pdf, y, 14)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(20, 20, 20)
  pdf.text(title, MARGIN, y)
  pdf.setDrawColor(225, 225, 225)
  pdf.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2)
  return y + 8
}

function summaryCards(pdf: jsPDF, cards: Array<[string, string, string?]>, y: number): number {
  const columns = 3
  const cellWidth = CONTENT_WIDTH / columns
  const cellHeight = 20

  for (let index = 0; index < cards.length; index += columns) {
    y = addPageIfNeeded(pdf, y, cellHeight + 4)
    cards.slice(index, index + columns).forEach(([label, value, helper], col) => {
      const x = MARGIN + col * cellWidth
      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(226, 232, 240)
      pdf.roundedRect(x, y, cellWidth - 3, cellHeight, 2, 2, 'FD')
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(105, 105, 105)
      pdf.text(label, x + 3, y + 5)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(30, 30, 30)
      pdf.text(value.substring(0, 24), x + 3, y + 12)
      if (helper) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6.5)
        pdf.setTextColor(120, 120, 120)
        pdf.text(helper.substring(0, 30), x + 3, y + 17)
      }
    })
    y += cellHeight + 3
  }

  return y + 2
}

function table(pdf: jsPDF, headers: string[], rows: string[][], y: number, options?: { fontSize?: number }): number {
  if (rows.length === 0) return y
  const fontSize = options?.fontSize ?? 7.5
  const colWidth = CONTENT_WIDTH / headers.length
  y = addPageIfNeeded(pdf, y, 13)

  pdf.setFillColor(241, 245, 249)
  pdf.rect(MARGIN, y - 4, CONTENT_WIDTH, 8, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(fontSize)
  pdf.setTextColor(45, 45, 45)
  headers.forEach((header, index) => {
    pdf.text(header, MARGIN + index * colWidth + 1.5, y)
  })
  y += 7

  pdf.setFont('helvetica', 'normal')
  rows.forEach((row) => {
    y = addPageIfNeeded(pdf, y, 8)
    row.forEach((value, index) => {
      pdf.text(String(value).substring(0, 22), MARGIN + index * colWidth + 1.5, y)
    })
    pdf.setDrawColor(235, 235, 235)
    pdf.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2)
    y += 7
  })

  return y + 3
}

function planItems(pdf: jsPDF, items: HockeyAthleteReportPlanItem[], y: number): number {
  const itemHeight = 25
  items.forEach((item) => {
    y = addPageIfNeeded(pdf, y, itemHeight + 4)
    const color: [number, number, number] = item.tone === 'priority'
      ? [220, 38, 38]
      : item.tone === 'positive'
        ? [22, 163, 74]
        : item.tone === 'watch'
          ? [217, 119, 6]
          : [37, 99, 235]

    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(226, 232, 240)
    pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, itemHeight, 2, 2, 'FD')
    pdf.setFillColor(...color)
    pdf.roundedRect(MARGIN + 2, y + 3, 2, itemHeight - 6, 1, 1, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(30, 30, 30)
    pdf.text(item.title, MARGIN + 7, y + 6)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(80, 80, 80)
    const description = pdf.splitTextToSize(item.description, CONTENT_WIDTH - 16).slice(0, 3)
    pdf.text(description, MARGIN + 7, y + 11)

    y += itemHeight + 3
  })

  return y + 2
}

function metricByKey(data: HockeyAthleteReportData, key: string): HockeyAthleteReportMetric | undefined {
  return data.metrics.find((metric) => metric.key === key)
}

function iceSpeedProfile(pdf: jsPDF, latest: HockeyTestSummary | null, y: number): number {
  if (!latest) return y
  const rows = buildIceSpeedProfileRows(latest.metrics)
  const hasRepeatedSprint = latest.metrics.endurance7x40AverageKmh != null
    || latest.metrics.endurance7x40Resistance != null
    || latest.metrics.endurance7x40DecrementPct != null
  if (rows.length === 0 && !hasRepeatedSprint) return y

  y = sectionTitle(pdf, 'Ice speed profile', y)
  if (rows.length > 0) {
    y = table(
      pdf,
      ['Stint', 'Tid', 'Fart', 'Coach signal'],
      rows.map((row) => [
        row.label,
        `${row.timeS.toFixed(2)} s`,
        formatSpeed(row.speedKmh),
        row.key === 'sprint0to10'
          ? 'Acceleration'
          : row.key === 'sprint0to30'
            ? 'Total speed'
            : row.key === 'endurance7x40Best'
              ? 'Repeated sprint'
              : 'Flying speed',
      ]),
      y,
      { fontSize: 7 },
    )
  }

  if (hasRepeatedSprint) {
    y = summaryCards(pdf, [
      ['7x40 avg speed', formatMetricValue(latest.metrics.endurance7x40AverageKmh, 'km/h', 1), '50% of RSA score'],
      ['7x40 best speed', formatMetricValue(latest.metrics.endurance7x40BestKmh, 'km/h', 1), '25% of RSA score'],
      ['Fatigue resistance', formatMetricValue(latest.metrics.endurance7x40Resistance, '%', 0), '25% of RSA score'],
      ['Sprint decrement', formatMetricValue(latest.metrics.endurance7x40DecrementPct, '%', 1), 'lower is better'],
      ['First-last drop', formatMetricValue(latest.metrics.endurance7x40FirstToLastDropPct, '%', 1), 'trend across reps'],
      ['Total 7x40', formatMetricValue(latest.metrics.endurance7x40Total, 's', 2), 'all reps combined'],
    ], y)
  }

  return y + 2
}

function pathwayChange(value: number | null | undefined, unit: string, decimals: number): string {
  if (value == null) return '-'
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function developmentPathway(pdf: jsPDF, data: HockeyAthleteReportData, y: number): number {
  const seasons = data.pathway?.seasons ?? []
  const readiness = data.pathway?.readiness ?? []
  if (seasons.length === 0 && readiness.length === 0) return y

  y = sectionTitle(pdf, 'Development pathway', y)
  if (seasons.length > 0) {
    y = table(
      pdf,
      ['Season', 'Level', 'Tests', 'Age', 'Power', '10m', '7x40 speed'],
      seasons.slice(-8).map((season) => [
        season.season,
        season.level,
        `${season.testCount}`,
        season.ageRange ?? '-',
        pathwayChange(season.changes.muscleLabWkg, 'W/kg', 1),
        pathwayChange(season.changes.sprint10m, 's', 2),
        pathwayChange(season.changes.endurance7x40AverageKmh, 'km/h', 1),
      ]),
      y,
      { fontSize: 6.8 },
    )
  }

  if (readiness.length > 0) {
    y = table(
      pdf,
      ['Level', 'Ready', 'Targets', 'Elite', 'Primary gap'],
      readiness.map((level) => [
        level.level,
        level.score == null ? '-' : `${level.score}%`,
        `${level.targetHits}/${level.targetCount}`,
        `${level.eliteHits}`,
        level.primaryGap
          ? `${level.primaryGap.label}: ${Math.abs(level.primaryGap.gapToTarget).toFixed(level.primaryGap.unit === 's' ? 2 : 1)} ${level.primaryGap.unit}`
          : 'Target met',
      ]),
      y,
      { fontSize: 6.8 },
    )
  }

  const milestones = data.pathway?.milestones ?? []
  if (milestones.length > 0) {
    y = table(
      pdf,
      ['Date', 'Milestone', 'Detail'],
      milestones.slice(0, 6).map((milestone) => [
        formatDate(milestone.date),
        milestone.label,
        milestone.detail,
      ]),
      y,
      { fontSize: 7 },
    )
  }

  return y + 2
}

export function generateHockeyAthleteReportPDF(data: HockeyAthleteReportData): Blob {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 20

  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, PAGE_WIDTH, 34, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('Hockey athlete report', MARGIN, 16)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`${data.clientName} · ${new Date().toLocaleDateString('sv-SE')}`, MARGIN, 24)
  y = 44

  const settings = data.settings
  const avgShiftLength = settings.averageIceTimeMinutes && settings.shiftsPerGame
    ? Math.round((settings.averageIceTimeMinutes * 60) / settings.shiftsPerGame)
    : null
  const latestSource = data.latest?.sourceType === 'MUSCLE_LAB_IMPORT' ? 'MuscleLab' : data.latest ? 'Manual' : '-'

  y = summaryCards(pdf, [
    ['Position', POSITION_LABELS[settings.position] ?? settings.position],
    ['League', LEAGUE_LABELS[settings.leagueLevel] ?? settings.leagueLevel],
    ['Season phase', PHASE_LABELS[settings.seasonPhase] ?? settings.seasonPhase],
    ['Latest test', formatDate(data.latest?.testDate), latestSource],
    ['Experience', `${settings.yearsPlaying ?? '-'} years`],
    ['Shift profile', avgShiftLength ? `${avgShiftLength} sec/shift` : '-', `${settings.averageIceTimeMinutes ?? '-'} min · ${settings.shiftsPerGame ?? '-'} shifts`],
  ], y)

  if (data.coachPlan.length > 0) {
    y = sectionTitle(pdf, 'Coach plan', y)
    y = planItems(pdf, data.coachPlan, y)
  }

  y = developmentPathway(pdf, data, y)

  if (data.latest) {
    y = sectionTitle(pdf, 'Latest test snapshot', y)
    const trendByKey = new Map(data.trends.map((trend) => [trend.key, trend]))
    y = table(
      pdf,
      ['Metric', 'Value', 'Trend', 'Best'],
      data.snapshotMetricKeys
        .map((key) => metricByKey(data, key))
        .filter((metric): metric is HockeyAthleteReportMetric => Boolean(metric))
        .map((metric) => {
          const trend = trendByKey.get(metric.key)
          const best = data.bests[metric.key]
          return [
            metric.label,
            formatMetricValue(data.latest?.metrics[metric.key], metric.unit, metric.decimals),
            trend ? `${formatDelta(trend.delta, metric.unit, metric.decimals)}${trend.isImprovement ? ' improved' : ' watch'}` : '-',
            best ? formatMetricValue(best.value, metric.unit, metric.decimals) : '-',
          ]
        }),
      y,
    )
    y = iceSpeedProfile(pdf, data.latest, y)
  }

  const bestRows = data.bestMetricKeys
    .map((key) => metricByKey(data, key))
    .filter((metric): metric is HockeyAthleteReportMetric => Boolean(metric))
    .map((metric) => {
      const best = data.bests[metric.key]
      return best
        ? [metric.label, formatMetricValue(best.value, metric.unit, metric.decimals), formatDate(best.testDate)]
        : null
    })
    .filter((row): row is string[] => row != null)
  if (bestRows.length > 0) {
    y = sectionTitle(pdf, 'Personal bests', y)
    y = table(pdf, ['Metric', 'Best', 'Date'], bestRows, y)
  }

  if (data.flags.length > 0) {
    y = sectionTitle(pdf, 'Coach flags', y)
    y = table(
      pdf,
      ['Flag', 'Severity'],
      data.flags.map((flag) => [flag.label, flag.severity === 'warning' ? 'Priority' : 'Info']),
      y,
    )
  }

  if ((data.latest?.qualityFlags ?? []).length > 0) {
    y = sectionTitle(pdf, 'Test quality', y)
    y = table(
      pdf,
      ['Signal', 'Severity', 'Detail'],
      (data.latest?.qualityFlags ?? []).map((flag) => [
        flag.label,
        flag.severity === 'warning' ? 'Check' : 'Info',
        flag.detail,
      ]),
      y,
      { fontSize: 6.8 },
    )
  }

  if (data.history.length > 0) {
    y = sectionTitle(pdf, 'Recent history', y)
    table(
      pdf,
      ['Date', 'MuscleLab', '10m', '30m', '5-10-5'],
      data.history.slice(0, 8).map((test) => [
        formatDate(test.testDate),
        formatMetricValue(test.metrics.muscleLabWkg, 'W/kg', 1),
        formatMetricValue(test.metrics.sprint10m, 's', 2),
        formatMetricValue(test.metrics.sprint30m, 's', 2),
        formatMetricValue(test.metrics.agilityBest, 's', 2),
      ]),
      y,
      { fontSize: 7 },
    )
  }

  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(140, 140, 140)
    pdf.text(`Generated ${new Date().toLocaleString('sv-SE')}`, MARGIN, 286)
    pdf.text(`Trainomics · ${page}/${pageCount}`, PAGE_WIDTH - MARGIN - 30, 286)
  }

  return pdf.output('blob')
}

export function generateHockeyAthleteReportFilename(data: HockeyAthleteReportData): string {
  return `Hockey_athlete_report_${filenamePart(data.clientName)}_${new Date().toISOString().slice(0, 10)}.pdf`
}

export function downloadHockeyAthleteReportPDF(data: HockeyAthleteReportData): void {
  const blob = generateHockeyAthleteReportPDF(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = generateHockeyAthleteReportFilename(data)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
