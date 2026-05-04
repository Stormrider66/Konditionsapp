import { jsPDF } from 'jspdf'
import { buildHockeyActionItems, type HockeyActionItem } from '@/lib/hockey/team-action-plan'
import { buildTeamIceSpeedProfileRows } from '@/lib/hockey/ice-speed'

type HockeyBenchmarkBand = 'top' | 'above' | 'team' | 'watch' | 'priority'

interface HockeyMetric {
  key: string
  label: string
  unit: string
  lowerIsBetter?: boolean
}

interface HockeyAthleteRow {
  id: string
  name: string
  position: { key: string; label: string }
  latestTestDate: string | null
  metrics: Record<string, number | null>
  ranks: Record<string, { rank: number; percentile: number } | null>
  benchmarks: Record<string, {
    zScore: number | null
    percentile: number | null
    positionZScore: number | null
    positionPercentile: number | null
    positionRank: number | null
    positionCoverage: number
    band: HockeyBenchmarkBand
  } | null>
  normGaps: Record<string, {
    gapToTarget: number
    gapToElite: number
    unit: string
  } | null>
  qualityFlags: Array<{
    key: string
    severity: 'info' | 'warning'
    label: string
    detail: string
  }>
}

interface HockeyLeader {
  key: string
  label: string
  unit: string
  coverage: number
  average: number | null
  leader: { athleteId: string; athleteName: string; value: number } | null
}

interface HockeyHistoryMetric extends HockeyMetric {
  teamTrend: Array<{ date: string; average: number | null; count: number }>
  athletes: Array<{
    id: string
    name: string
    latestTestDate: string | null
    previousTestDate: string | null
    latest: number | null
    previous: number | null
    delta: number | null
    percentChange: number | null
    rank: { rank: number; percentile: number } | null
  }>
}

interface HockeyPathwaySeason {
  season: string
  level: string
  testCount: number
  firstDate: string
  lastDate: string
  ageRange: string | null
  metrics: Record<string, number | null>
  changes: Record<string, number | null>
}

interface HockeyPathwayAthlete {
  id: string
  name: string
  position: string | null
  currentLevel: string
  latestAge: number | null
  latestTestDate: string | null
  seasonCount: number
  testCount: number
  positiveChangeCount: number
  watchCount: number
  seasons: HockeyPathwaySeason[]
}

interface HockeyPathwaySummary {
  metrics: HockeyMetric[]
  seasonSummaries: Array<{
    season: string
    athleteCount: number
    testCount: number
    levelCounts: Record<string, number>
    metrics: Record<string, number | null>
  }>
  athletes: HockeyPathwayAthlete[]
  latestLevelCounts: Record<string, number>
  promoted: HockeyPathwayAthlete[]
  watch: HockeyPathwayAthlete[]
}

interface HockeyNormReference {
  level: string
  position: string
  metricKey: string
  target: number
  elite: number
  unit: string
  lowerIsBetter?: boolean
}

export interface HockeyTeamReportData {
  teamId: string
  teamName: string
  metrics: HockeyMetric[]
  athletes: HockeyAthleteRow[]
  leaders: HockeyLeader[]
  history: HockeyHistoryMetric[]
  positions: Array<{ key: string; label: string; athleteCount: number }>
  pathway: HockeyPathwaySummary
  normReferences: HockeyNormReference[]
  testCount: number
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const CORE_METRICS = [
  'muscleLabWkg',
  'backSquat1RM',
  'powerClean1RM',
  'standingLongJump',
  'threeJumpBest',
  'sprint10m',
  'agilityBest',
  'endurance7x40Score',
  'endurance7x40AverageKmh',
  'beepScore',
  'vo2Max',
  'lt2SpeedKmh',
]

function formatMetricValue(value: number | null | undefined, unit: string): string {
  if (value == null || !Number.isFinite(value)) return '-'
  const decimals = unit === 's' ? 2 : ['W/kg', 'nivå', 'km/h', 'ml/kg/min', 'mmol/L', 'xBW'].includes(unit) ? 1 : 0
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function formatSpeed(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '-' : `${value.toFixed(1)} km/h`
}

function formatDistance(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '-' : `${value.toFixed(1)} m`
}

function filenamePart(value: string): string {
  return value
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 42) || 'team'
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
  const columns = 4
  const cellWidth = CONTENT_WIDTH / columns
  const cellHeight = 19

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
      pdf.text(value, x + 3, y + 11)
      if (helper) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6.5)
        pdf.setTextColor(120, 120, 120)
        pdf.text(helper.substring(0, 24), x + 3, y + 16)
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
      pdf.text(String(value).substring(0, 20), MARGIN + index * colWidth + 1.5, y)
    })
    pdf.setDrawColor(235, 235, 235)
    pdf.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2)
    y += 7
  })

  return y + 3
}

function metricByKey(data: HockeyTeamReportData, key: string): HockeyMetric | undefined {
  return data.metrics.find((metric) => metric.key === key)
}

function bandPriority(band: HockeyBenchmarkBand): number {
  if (band === 'priority') return 0
  if (band === 'watch') return 1
  if (band === 'team') return 2
  if (band === 'above') return 3
  return 4
}

function drawTrend(pdf: jsPDF, metric: HockeyHistoryMetric, y: number): number {
  const series = metric.teamTrend.filter((point): point is { date: string; average: number; count: number } => point.average != null)
  if (series.length < 2) return y
  y = addPageIfNeeded(pdf, y, 50)

  const x = MARGIN
  const chartY = y + 8
  const width = CONTENT_WIDTH
  const height = 35
  const values = series.map((point) => point.average)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(30, 30, 30)
  pdf.text(`${metric.label} lagtrend`, x, y)
  pdf.setDrawColor(226, 232, 240)
  pdf.rect(x, chartY, width, height)
  pdf.setDrawColor(8, 145, 178)
  pdf.setLineWidth(0.8)

  series.forEach((point, index) => {
    if (index === 0) return
    const previous = series[index - 1]
    const px = x + ((index - 1) / (series.length - 1)) * width
    const py = chartY + height - ((previous.average - min) / range) * height
    const cx = x + (index / (series.length - 1)) * width
    const cy = chartY + height - ((point.average - min) / range) * height
    pdf.line(px, py, cx, cy)
  })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(105, 105, 105)
  pdf.text(`${series[0].date} till ${series[series.length - 1].date}`, x + 2, chartY + height + 5)
  pdf.text(`${formatMetricValue(min, metric.unit)}-${formatMetricValue(max, metric.unit)}`, PAGE_WIDTH - MARGIN - 42, chartY + height + 5)

  return chartY + height + 10
}

function actionPlan(pdf: jsPDF, actions: HockeyActionItem[], y: number): number {
  if (actions.length === 0) return y
  const itemHeight = 24
  y = addPageIfNeeded(pdf, y, 10 + actions.length * itemHeight)

  actions.forEach((item) => {
    y = addPageIfNeeded(pdf, y, itemHeight + 4)
    const color: [number, number, number] = item.severity === 'priority'
      ? [220, 38, 38]
      : item.severity === 'watch'
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
    const description = pdf.splitTextToSize(item.description, CONTENT_WIDTH - 48).slice(0, 2)
    pdf.text(description, MARGIN + 7, y + 11)

    pdf.setFontSize(6.5)
    pdf.setTextColor(105, 105, 105)
    const athleteNames = item.athletes.map((athlete) => athlete.name).join(', ')
    if (athleteNames) {
      pdf.text(pdf.splitTextToSize(athleteNames, CONTENT_WIDTH - 48).slice(0, 1), MARGIN + 7, y + 20)
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(...color)
    const label = item.severity === 'priority' ? 'Priority' : item.severity === 'watch' ? 'Follow up' : 'Info'
    pdf.text(label, PAGE_WIDTH - MARGIN - 24, y + 6)

    y += itemHeight + 3
  })

  return y + 2
}

function iceSpeedProfile(pdf: jsPDF, data: HockeyTeamReportData, y: number): number {
  const rows = buildTeamIceSpeedProfileRows(
    data.athletes.filter((athlete) => athlete.latestTestDate),
  )
  if (rows.length === 0) return y

  y = sectionTitle(pdf, 'Ice speed profile', y)
  y = table(
    pdf,
    ['Stint', 'Snabbast', 'Fart', 'Lagfart', 'Gap'],
    rows.map((row) => [
      `${row.label} (${row.coverage})`,
      `${row.leaderName} ${row.timeS.toFixed(2)} s`,
      formatSpeed(row.speedKmh),
      formatSpeed(row.averageSpeedKmh),
      `${formatDistance(row.medianGapM)} med · ${formatDistance(row.maxGapM)} max`,
    ]),
    y,
    { fontSize: 6.8 },
  )

  const biggestGap = rows
    .filter((row) => row.maxGapM != null)
    .sort((a, b) => (b.maxGapM ?? 0) - (a.maxGapM ?? 0))[0]
  if (biggestGap?.maxGapM != null && biggestGap.maxGapM > 0) {
    y = addPageIfNeeded(pdf, y, 8)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(105, 105, 105)
    pdf.text(
      `Largest distance spread: ${biggestGap.label}, ${formatDistance(biggestGap.maxGapM)} behind leader (${biggestGap.maxGapAthleteName ?? '-'})`,
      MARGIN,
      y,
    )
    y += 6
  }

  return y + 2
}

function aerobicProfile(pdf: jsPDF, data: HockeyTeamReportData, y: number): number {
  const metricKeys = ['vo2Max', 'lt2SpeedKmh', 'maxLactate', 'rampTimeSeconds']
  const rows = metricKeys
    .map((key) => {
      const metric = metricByKey(data, key)
      const leader = data.leaders.find((candidate) => candidate.key === key)
      if (!metric || !leader?.leader) return null
      return [
        metric.label,
        leader.leader.athleteName,
        formatMetricValue(leader.leader.value, metric.unit),
        formatMetricValue(leader.average, metric.unit),
      ]
    })
    .filter((row): row is string[] => row != null)

  if (rows.length === 0) return y
  y = sectionTitle(pdf, 'Aerobic profile', y)
  return table(pdf, ['Metric', 'Leader', 'Value', 'Team avg'], rows, y, { fontSize: 7 })
}

function pathwayChange(value: number | null | undefined, unit: string): string {
  if (value == null || !Number.isFinite(value)) return '-'
  const decimals = unit === 's' ? 2 : ['W/kg', 'km/h', 'ml/kg/min', 'mmol/L', 'xBW'].includes(unit) ? 1 : 0
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function developmentPathway(pdf: jsPDF, data: HockeyTeamReportData, y: number): number {
  const pathway = data.pathway
  if (!pathway || pathway.seasonSummaries.length === 0) return y

  y = sectionTitle(pdf, 'Development pathway', y)
  y = summaryCards(
    pdf,
    ['J18', 'J20', 'A-team', 'Unknown'].map((level) => [
      level,
      `${pathway.latestLevelCounts[level] ?? 0}`,
      'current level',
    ]),
    y,
  )

  const pathwayMetric = pathway.metrics.find((metric) => metric.key === 'muscleLabWkg') ?? pathway.metrics[0]
  if (pathwayMetric) {
    y = table(
      pdf,
      ['Season', 'Players', 'Tests', pathwayMetric.label],
      pathway.seasonSummaries.slice(-6).map((season) => [
        season.season,
        `${season.athleteCount}`,
        `${season.testCount}`,
        formatMetricValue(season.metrics[pathwayMetric.key], pathwayMetric.unit),
      ]),
      y,
      { fontSize: 7 },
    )
  }

  if (pathway.promoted.length > 0) {
    y = table(
      pdf,
      ['Promoted player', 'Level', 'Seasons', 'Tests'],
      pathway.promoted.slice(0, 8).map((athlete) => [
        athlete.name,
        athlete.currentLevel,
        `${athlete.seasonCount}`,
        `${athlete.testCount}`,
      ]),
      y,
      { fontSize: 7 },
    )
  }

  if (pathway.watch.length > 0) {
    y = table(
      pdf,
      ['Data watchlist', 'Level', 'Last test', 'Gaps'],
      pathway.watch.slice(0, 8).map((athlete) => [
        athlete.name,
        athlete.currentLevel,
        athlete.latestTestDate ?? '-',
        `${athlete.watchCount}`,
      ]),
      y,
      { fontSize: 7 },
    )
  }

  const norms = data.normReferences
    .filter((norm) => norm.metricKey === 'muscleLabWkg' || norm.metricKey === 'sprint10m')
    .slice(0, 8)
  if (norms.length > 0) {
    y = table(
      pdf,
      ['Norm', 'Metric', 'Target', 'Elite'],
      norms.map((norm) => {
        const metric = metricByKey(data, norm.metricKey)
        return [
          `${norm.level} ${norm.position}`,
          metric?.label ?? norm.metricKey,
          formatMetricValue(norm.target, norm.unit),
          formatMetricValue(norm.elite, norm.unit),
        ]
      }),
      y,
      { fontSize: 6.8 },
    )
  }

  const drillDown = pathway.promoted[0] ?? pathway.athletes.find((athlete) => athlete.testCount > 0)
  if (drillDown && pathwayMetric) {
    y = table(
      pdf,
      [`${drillDown.name}`, 'Level', 'Age', `Delta ${pathwayMetric.label}`],
      drillDown.seasons.slice(-6).map((season) => [
        season.season,
        season.level,
        season.ageRange ?? '-',
        pathwayChange(season.changes[pathwayMetric.key], pathwayMetric.unit),
      ]),
      y,
      { fontSize: 6.8 },
    )
  }

  return y + 2
}

export function generateHockeyTeamReportPDF(data: HockeyTeamReportData): Blob {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 20

  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, PAGE_WIDTH, 32, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('Hockey team report', MARGIN, 16)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`${data.teamName} · ${new Date().toLocaleDateString('sv-SE')}`, MARGIN, 24)
  y = 42

  const testedAthletes = data.athletes.filter((athlete) => athlete.latestTestDate).length
  const priorityItems = data.athletes.flatMap((athlete) =>
    data.metrics.map((metric) => {
      const benchmark = athlete.benchmarks[metric.key]
      if (!benchmark || !['priority', 'watch'].includes(benchmark.band)) return null
      return {
        athlete,
        metric,
        benchmark,
        value: athlete.metrics[metric.key],
      }
    }).filter((item): item is {
      athlete: HockeyAthleteRow
      metric: HockeyMetric
      benchmark: NonNullable<HockeyAthleteRow['benchmarks'][string]>
      value: number | null
    } => Boolean(item))
  ).sort((a, b) => bandPriority(a.benchmark.band) - bandPriority(b.benchmark.band))
  const qualityWarnings = data.athletes
    .map((athlete) => ({
      athlete,
      warnings: athlete.qualityFlags.filter((flag) => flag.severity === 'warning'),
    }))
    .filter((entry) => entry.warnings.length > 0)

  y = summaryCards(pdf, [
    ['Athletes tested', `${testedAthletes}/${data.athletes.length}`],
    ['Hockey tests', `${data.testCount}`],
    ['Metrics tracked', `${data.metrics.length}`],
    ['Watchlist', `${priorityItems.length}`, 'priority/watch flags'],
    ['Quality flags', `${qualityWarnings.length}`, 'athletes to verify'],
  ], y)

  const actions = buildHockeyActionItems(data)
  if (actions.length > 0) {
    y = sectionTitle(pdf, 'Coach action plan', y)
    y = actionPlan(pdf, actions, y)
  }

  y = developmentPathway(pdf, data, y)

  y = sectionTitle(pdf, 'Leaders', y)
  y = table(
    pdf,
    ['Metric', 'Leader', 'Value', 'Team avg'],
    data.leaders
      .filter((leader) => leader.leader)
      .slice(0, 12)
      .map((leader) => [
        leader.label,
        leader.leader?.athleteName ?? '-',
        formatMetricValue(leader.leader?.value, leader.unit),
        formatMetricValue(leader.average, leader.unit),
      ]),
    y,
  )

  y = iceSpeedProfile(pdf, data, y)
  y = aerobicProfile(pdf, data, y)

  y = sectionTitle(pdf, 'Position coverage', y)
  y = summaryCards(
    pdf,
    data.positions.map((position) => [
      position.label,
      `${position.athleteCount}`,
      position.key,
    ]),
    y,
  )

  if (priorityItems.length > 0) {
    y = sectionTitle(pdf, 'Priority and follow-up', y)
    y = table(
      pdf,
      ['Athlete', 'Metric', 'Value', 'Band', 'Pos rank'],
      priorityItems.slice(0, 16).map((item) => [
        item.athlete.name,
        item.metric.label,
        formatMetricValue(item.value, item.metric.unit),
        item.benchmark.band === 'priority' ? 'Priority' : 'Follow up',
        item.benchmark.positionRank && item.benchmark.positionCoverage > 1
          ? `${item.benchmark.positionRank}/${item.benchmark.positionCoverage}`
          : '-',
      ]),
      y,
    )
  }

  if (qualityWarnings.length > 0) {
    y = sectionTitle(pdf, 'Test quality checks', y)
    y = table(
      pdf,
      ['Athlete', 'Flags', 'First signal'],
      qualityWarnings.slice(0, 12).map((entry) => [
        entry.athlete.name,
        `${entry.warnings.length}`,
        entry.warnings[0]?.label ?? '-',
      ]),
      y,
      { fontSize: 7 },
    )
  }

  const trendMetric = data.history.find((metric) => metric.key === 'muscleLabWkg' && metric.teamTrend.length > 1)
    ?? data.history.find((metric) => metric.teamTrend.length > 1)
  if (trendMetric) {
    y = sectionTitle(pdf, 'Team trend', y)
    y = drawTrend(pdf, trendMetric, y)
  }

  y = sectionTitle(pdf, 'Athlete matrix', y)
  const coreMetrics = CORE_METRICS
    .map((key) => metricByKey(data, key))
    .filter((metric): metric is HockeyMetric => Boolean(metric))
  table(
    pdf,
    ['Athlete', 'Pos', 'Date', ...coreMetrics.map((metric) => metric.label)],
    data.athletes
      .filter((athlete) => athlete.latestTestDate)
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
      .map((athlete) => [
        athlete.name,
        athlete.position.key,
        athlete.latestTestDate ?? '-',
        ...coreMetrics.map((metric) => {
          const rank = athlete.ranks[metric.key]
          const normGap = athlete.normGaps[metric.key]
          const value = formatMetricValue(athlete.metrics[metric.key], metric.unit)
          const rankText = rank ? ` P${rank.percentile}` : ''
          const targetText = normGap ? ` T${pathwayChange(normGap.gapToTarget, normGap.unit)}` : ''
          return `${value}${rankText}${targetText}`
        }),
      ]),
    y,
    { fontSize: 6.2 },
  )

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

export function generateHockeyTeamReportFilename(data: HockeyTeamReportData): string {
  return `Hockey_team_report_${filenamePart(data.teamName)}_${new Date().toISOString().slice(0, 10)}.pdf`
}

export function downloadHockeyTeamReportPDF(data: HockeyTeamReportData): void {
  const blob = generateHockeyTeamReportPDF(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = generateHockeyTeamReportFilename(data)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
