/**
 * Visual Report Prompt Builder
 *
 * Constructs 3-layer AI prompts: shared preamble + report-type section + sport overlay.
 */

import type { SportReportConfig } from './sport-templates'
import type {
  ReportType,
  ProgressionReportData,
  TrainingSummaryReportData,
  TestReportData,
  ProgramReportData,
} from './types'

type ReportData = ProgressionReportData | TrainingSummaryReportData | TestReportData | ProgramReportData

export function buildVisualReportPrompt(
  reportType: ReportType,
  data: ReportData,
  sportConfig: SportReportConfig,
  locale: string
): string {
  const isSv = locale.startsWith('sv')
  const lang = isSv ? 'Swedish' : 'English'

  // Layer 1: Shared preamble
  const preamble = `Create a clean, professional sports performance infographic image.

Design requirements:
- Horizontal layout (16:9 aspect ratio)
- Dark premium background with light text
- Professional, modern typography (no clipart)
- All text in ${lang}
- Color scheme: ${sportConfig.colorScheme}
- Sport: ${sportConfig.displayName}
- ${sportConfig.specialInstructions}`

  // Layer 2: Report-type specific
  const reportSection = buildReportTypeSection(reportType, data, isSv)

  // Layer 3: Sport overlay
  const sportOverlay = `
Key metrics to feature: ${sportConfig.primaryMetrics.join(', ')}
Secondary metrics: ${sportConfig.secondaryMetrics.join(', ')}
Intensity unit: ${sportConfig.intensityUnit}`

  return `${preamble}\n\n${reportSection}\n\n${sportOverlay}`
}

function buildReportTypeSection(
  reportType: ReportType,
  data: ReportData,
  isSv: boolean
): string {
  switch (reportType) {
    case 'progression':
      return buildProgressionSection(data as ProgressionReportData, isSv)
    case 'training-summary':
      return buildTrainingSummarySection(data as TrainingSummaryReportData, isSv)
    case 'test-report':
      return buildTestReportSection(data as TestReportData, isSv)
    case 'program':
      return buildProgramSection(data as ProgramReportData, isSv)
    default:
      return ''
  }
}

function buildProgressionSection(data: ProgressionReportData, isSv: boolean): string {
  const title = isSv ? 'Progressionsrapport' : 'Progression Report'
  const athleteLabel = isSv ? 'Atlet' : 'Athlete'

  let testLines = ''
  if (data.tests.length > 0) {
    const testsHeader = isSv ? 'Testresultat' : 'Test Results'
    testLines = `\n${testsHeader}:\n` + data.tests.map((t) => {
      const date = new Date(t.date).toLocaleDateString(isSv ? 'sv-SE' : 'en-US')
      const parts = [`${date} (${t.testType})`]
      if (t.vo2max) parts.push(`VO2max: ${t.vo2max}`)
      if (t.anaerobicThreshold) parts.push(`LT2: ${t.anaerobicThreshold.value} ${t.anaerobicThreshold.unit}`)
      return parts.join(' | ')
    }).join('\n')
  }

  let raceLines = ''
  if (data.raceResults.length > 0) {
    const raceHeader = isSv ? 'Tävlingsresultat' : 'Race Results'
    raceLines = `\n${raceHeader}:\n` + data.raceResults.map((r) => {
      const date = new Date(r.date).toLocaleDateString(isSv ? 'sv-SE' : 'en-US')
      const parts = [`${date}: ${r.raceName}`]
      if (r.distance) parts.push(r.distance)
      if (r.finishTime) parts.push(r.finishTime)
      return parts.join(' | ')
    }).join('\n')
  }

  return `${title}: "${data.clientName}"
${athleteLabel}: ${data.clientName}

Layout:
- Timeline graph showing improvement over time
- Data markers at each test point
- Improvement percentage arrows between key milestones
- Trend line showing overall progression direction
${testLines}${raceLines}`
}

function buildTrainingSummarySection(data: TrainingSummaryReportData, isSv: boolean): string {
  const title = isSv ? 'Veckosammanfattning' : 'Weekly Training Summary'
  const weekStart = new Date(data.weekStart).toLocaleDateString(isSv ? 'sv-SE' : 'en-US')
  const weekEnd = new Date(data.weekEnd).toLocaleDateString(isSv ? 'sv-SE' : 'en-US')

  const totalMinutes = data.easyMinutes + data.moderateMinutes + data.hardMinutes
  const easyPct = totalMinutes > 0 ? Math.round((data.easyMinutes / totalMinutes) * 100) : 0
  const hardPct = totalMinutes > 0 ? Math.round((data.hardMinutes / totalMinutes) * 100) : 0

  let acwrLine = ''
  if (data.acwr != null) {
    const acwrStatus = data.acwr < 0.8 ? (isSv ? 'Undertränad' : 'Undertrained')
      : data.acwr > 1.3 ? (isSv ? 'Hög risk' : 'High risk')
      : (isSv ? 'Optimal' : 'Optimal')
    acwrLine = `\nACWR: ${data.acwr.toFixed(2)} (${acwrStatus})`
  }

  return `${title}: "${data.clientName}"
${isSv ? 'Period' : 'Period'}: ${weekStart} – ${weekEnd}

${isSv ? 'Volym' : 'Volume'}:
- TSS: ${data.totalTSS.toFixed(0)}
- ${isSv ? 'Distans' : 'Distance'}: ${data.totalDistance.toFixed(1)} km
- ${isSv ? 'Tid' : 'Duration'}: ${Math.floor(data.totalDuration / 60)}h ${data.totalDuration % 60}min
- ${isSv ? 'Pass' : 'Workouts'}: ${data.workoutCount}
${data.compliancePercent != null ? `- ${isSv ? 'Följsamhet' : 'Compliance'}: ${data.compliancePercent.toFixed(0)}%` : ''}

${isSv ? 'Intensitetsfördelning' : 'Intensity Distribution'}:
- ${isSv ? 'Lätt' : 'Easy'} (Z1-2): ${data.easyMinutes}min (${easyPct}%)
- ${isSv ? 'Moderat' : 'Moderate'} (Z3): ${data.moderateMinutes}min
- ${isSv ? 'Hård' : 'Hard'} (Z4-5): ${data.hardMinutes}min (${hardPct}%)
${acwrLine}

Layout:
- Volume stats prominently at the top
- Zone distribution as a colorful horizontal bar chart or donut
- Compliance ring (filled circle showing %)
- ACWR gauge indicator if available`
}

function buildTestReportSection(data: TestReportData, isSv: boolean): string {
  const title = isSv ? 'Testrapport' : 'Test Report'
  const date = new Date(data.testDate).toLocaleDateString(isSv ? 'sv-SE' : 'en-US')

  let deltaSection = ''
  if (data.previousTest) {
    const prevDate = new Date(data.previousTest.testDate).toLocaleDateString(isSv ? 'sv-SE' : 'en-US')
    const deltaLabel = isSv ? 'Förändring sedan' : 'Change since'
    deltaSection = `\n${deltaLabel} ${prevDate}:`
    if (data.vo2max && data.previousTest.vo2max) {
      const delta = data.vo2max - data.previousTest.vo2max
      const sign = delta >= 0 ? '+' : ''
      deltaSection += `\n- VO2max: ${sign}${delta.toFixed(1)}`
    }
    if (data.anaerobicThreshold?.value && data.previousTest.anaerobicThreshold?.value) {
      const delta = data.anaerobicThreshold.value - data.previousTest.anaerobicThreshold.value
      const sign = delta >= 0 ? '+' : ''
      deltaSection += `\n- LT2: ${sign}${delta.toFixed(2)} ${data.anaerobicThreshold.unit || ''}`
    }
  }

  const zonesText = data.trainingZones.length > 0
    ? '\n' + (isSv ? 'Träningszoner' : 'Training Zones') + ':\n' +
      data.trainingZones.map((z) => `Zone ${z.zone} (${z.name}): ${z.min}-${z.max} ${z.unit}`).join('\n')
    : ''

  return `${title}: "${data.clientName}"
${isSv ? 'Datum' : 'Date'}: ${date}
${isSv ? 'Testtyp' : 'Test type'}: ${data.testType}

${isSv ? 'Huvudresultat' : 'Key Results'}:
${data.vo2max ? `- VO2max: ${data.vo2max} ml/kg/min` : ''}
${data.maxHR ? `- Max HR: ${data.maxHR} bpm` : ''}
${data.maxLactate ? `- Max ${isSv ? 'laktat' : 'lactate'}: ${data.maxLactate} mmol/L` : ''}
${data.aerobicThreshold ? `- LT1: ${data.aerobicThreshold.value} ${data.aerobicThreshold.unit || ''} (HR: ${data.aerobicThreshold.hr || '?'})` : ''}
${data.anaerobicThreshold ? `- LT2: ${data.anaerobicThreshold.value} ${data.anaerobicThreshold.unit || ''} (HR: ${data.anaerobicThreshold.hr || '?'})` : ''}
${deltaSection}
${zonesText}

Layout:
- Key metrics prominently at the top in large numbers
- 5-zone HR bar chart (colored green→blue→yellow→orange→red)
- Delta arrows showing improvement/decline from previous test
- Clean data card layout`
}

function buildProgramSection(data: ProgramReportData, isSv: boolean): string {
  const title = isSv ? 'Programöversikt' : 'Program Overview'

  const phaseDescriptions = data.phases.map((p) => {
    const parts = [`${p.name} (${isSv ? 'veckor' : 'weeks'} ${p.weeks}): ${p.focus}`]
    if (p.sessionsPerWeek) {
      parts.push(`${p.sessionsPerWeek} ${isSv ? 'pass/vecka' : 'sessions/week'}`)
    }
    if (p.keyWorkouts?.length) {
      parts.push(`${isSv ? 'Nyckelpass' : 'Key workouts'}: ${p.keyWorkouts.join(', ')}`)
    }
    return parts.join(' | ')
  }).join('\n')

  return `${title}: "${data.name}"
${data.description ? `${isSv ? 'Beskrivning' : 'Description'}: ${data.description}` : ''}
${data.goalType ? `${isSv ? 'Mål' : 'Goal'}: ${data.goalType}` : ''}
${isSv ? 'Antal veckor' : 'Total weeks'}: ${data.totalWeeks}
${data.methodology ? `${isSv ? 'Metod' : 'Methodology'}: ${data.methodology}` : ''}

${isSv ? 'Faser' : 'Phases'}:
${phaseDescriptions}

Layout:
- Program name and goal prominently at the top
- Horizontal timeline bar showing phase progression
- Each phase color-coded (blue for base, orange for build, red for peak, green for taper)
- Weeks per phase and sessions per week under each phase block
- Key workout types listed per phase`
}
