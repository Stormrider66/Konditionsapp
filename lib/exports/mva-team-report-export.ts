import { jsPDF } from 'jspdf'
import {
  buildAthleteMVANarrative,
  buildTeamMVANarrative,
  buildPLSDriverLines,
  type NarrativeAthlete,
} from '@/lib/mva/mva-narrative'
import { classifyArchetype, ARCHETYPE_LABELS } from '@/lib/mva/archetypes'

type ReportLocale = 'en' | 'sv'

export interface MVAReportAthlete {
  clientName: string
  scores: number[]
  hotellingT2: number
  dmodx: number
  isOutlierT2: boolean
  isOutlierDModX: boolean
  topContributors: { variableId: string; variableName: string; contribution: number; direction: string }[] | null
}

export interface MVAReportWarning {
  severity: 'info' | 'warning'
  messageEn: string
  messageSv: string
}

export interface MVATeamReportData {
  teamName: string
  locale?: ReportLocale
  generatedAt: string // ISO — passed in so the report is deterministic
  nObservations: number
  nVariables: number
  nComponents: number
  explainedVariance: number[]
  warnings: MVAReportWarning[]
  athletes: MVAReportAthlete[]
  pls?: {
    yVariableName: string
    r2Y: number
    q2: number
    vipScores: { variableName: string; vip: number; coefficient: number }[]
  } | null
  /** When set, render a focused single-athlete one-pager instead of the team report. */
  focusAthleteName?: string | null
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

function copy(locale: ReportLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
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
      pdf.text(String(value).substring(0, 30), MARGIN + index * colWidth + 1.5, y)
    })
    pdf.setDrawColor(235, 235, 235)
    pdf.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2)
    y += 7
  })

  return y + 3
}

function narrativeBlock(
  pdf: jsPDF,
  items: { tone: 'priority' | 'watch' | 'positive' | 'info'; title: string; body: string }[],
  y: number
): number {
  items.forEach((item) => {
    const lines = pdf.splitTextToSize(item.body, CONTENT_WIDTH - 16)
    const blockHeight = 9 + lines.length * 4
    y = addPageIfNeeded(pdf, y, blockHeight + 4)
    const color: [number, number, number] = item.tone === 'priority'
      ? [220, 38, 38]
      : item.tone === 'positive'
        ? [22, 163, 74]
        : item.tone === 'watch'
          ? [217, 119, 6]
          : [37, 99, 235]

    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(226, 232, 240)
    pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, blockHeight, 2, 2, 'FD')
    pdf.setFillColor(...color)
    pdf.roundedRect(MARGIN + 2, y + 3, 2, blockHeight - 6, 1, 1, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(30, 30, 30)
    pdf.text(item.title, MARGIN + 7, y + 6)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(80, 80, 80)
    pdf.text(lines, MARGIN + 7, y + 11)

    y += blockHeight + 3
  })
  return y + 2
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

function header(pdf: jsPDF, title: string, subtitle: string): number {
  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, PAGE_WIDTH, 34, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text(title, MARGIN, 16)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(subtitle, MARGIN, 24)
  return 44
}

function footer(pdf: jsPDF, locale: ReportLocale, generatedAt: string): void {
  const pageCount = pdf.getNumberOfPages()
  const stamp = new Date(generatedAt).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(140, 140, 140)
    pdf.text(`${copy(locale, 'Generated', 'Genererad')} ${stamp}`, MARGIN, 286)
    pdf.text(`Trainomics · ${page}/${pageCount}`, PAGE_WIDTH - MARGIN - 30, 286)
  }
}

function asNarrativeAthlete(a: MVAReportAthlete): NarrativeAthlete {
  return {
    clientName: a.clientName,
    scores: a.scores,
    hotellingT2: a.hotellingT2,
    dmodx: a.dmodx,
    isOutlierT2: a.isOutlierT2,
    isOutlierDModX: a.isOutlierDModX,
    topContributors: a.topContributors,
  }
}

export function generateMVATeamReportPDF(data: MVATeamReportData): Blob {
  const locale: ReportLocale = data.locale === 'sv' ? 'sv' : 'en'
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const focusAthlete = data.focusAthleteName
    ? data.athletes.find((a) => a.clientName === data.focusAthleteName) ?? null
    : null

  if (focusAthlete) {
    // Single-athlete one-pager — the artefact a coach hands to the player.
    let y = header(
      pdf,
      copy(locale, 'Athlete profile (MVA)', 'Spelarprofil (MVA)'),
      `${focusAthlete.clientName} · ${data.teamName}`
    )
    const arch = classifyArchetype(focusAthlete.topContributors, focusAthlete.scores)
    y = summaryCards(pdf, [
      [copy(locale, 'Profile type', 'Profiltyp'), ARCHETYPE_LABELS[locale][arch]],
      ['Hotelling T²', focusAthlete.hotellingT2.toFixed(2), focusAthlete.isOutlierT2 ? copy(locale, 'outlier', 'outlier') : 'ok'],
      ['DModX', focusAthlete.dmodx.toFixed(2), focusAthlete.isOutlierDModX ? copy(locale, 'outlier', 'outlier') : 'ok'],
    ], y)

    y = sectionTitle(pdf, copy(locale, 'What this means', 'Vad det betyder'), y)
    y = narrativeBlock(pdf, buildAthleteMVANarrative(asNarrativeAthlete(focusAthlete), locale), y)

    const drivers = (focusAthlete.topContributors ?? []).slice(0, 6)
    if (drivers.length > 0) {
      y = sectionTitle(pdf, copy(locale, 'Distinctive measures', 'Utmärkande mått'), y)
      table(
        pdf,
        [copy(locale, 'Measure', 'Mått'), copy(locale, 'Influence', 'Påverkan'), copy(locale, 'Direction', 'Riktning')],
        drivers.map((d) => [
          d.variableName,
          d.contribution.toFixed(2),
          d.direction === 'positive' ? copy(locale, 'high side', 'hög sida') : copy(locale, 'low side', 'låg sida'),
        ]),
        y,
      )
    }

    footer(pdf, locale, data.generatedAt)
    return pdf.output('blob')
  }

  // Team report.
  let y = header(
    pdf,
    copy(locale, 'Team multivariate report', 'Multivariat lagrapport'),
    `${data.teamName} · ${new Date(data.generatedAt).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')}`
  )

  const cumulative = data.explainedVariance.reduce((a, b) => a + b, 0)
  y = summaryCards(pdf, [
    [copy(locale, 'Players', 'Spelare'), String(data.nObservations)],
    [copy(locale, 'Variables', 'Variabler'), String(data.nVariables)],
    [copy(locale, 'Components', 'Komponenter'), String(data.nComponents), `${Math.round(cumulative * 100)}% ${copy(locale, 'variance', 'varians')}`],
  ], y)

  if (data.warnings.length > 0) {
    y = sectionTitle(pdf, copy(locale, 'Model reliability', 'Modellens tillförlitlighet'), y)
    y = narrativeBlock(
      pdf,
      data.warnings.map((w) => ({
        tone: w.severity === 'warning' ? ('watch' as const) : ('info' as const),
        title: w.severity === 'warning' ? copy(locale, 'Caution', 'Varning') : 'Info',
        body: locale === 'sv' ? w.messageSv : w.messageEn,
      })),
      y,
    )
  }

  y = sectionTitle(pdf, copy(locale, 'Team summary', 'Lagöversikt'), y)
  y = narrativeBlock(pdf, buildTeamMVANarrative(data.athletes.map(asNarrativeAthlete), locale), y)

  if (data.pls) {
    y = sectionTitle(pdf, copy(locale, `Key drivers of ${data.pls.yVariableName}`, `Nyckeldrivare för ${data.pls.yVariableName}`), y)
    const lines = buildPLSDriverLines(data.pls.yVariableName, data.pls.vipScores, locale)
    if (lines.length > 0) {
      y = narrativeBlock(
        pdf,
        [{
          tone: 'info' as const,
          title: `R²Y ${data.pls.r2Y.toFixed(2)} · Q² ${data.pls.q2.toFixed(2)}`,
          body: lines.join('\n'),
        }],
        y,
      )
    }
  }

  y = sectionTitle(pdf, copy(locale, 'Player profiles', 'Spelarprofiler'), y)
  table(
    pdf,
    [copy(locale, 'Player', 'Spelare'), copy(locale, 'Profile', 'Profil'), 'T²', 'DModX', copy(locale, 'Top drivers', 'Främsta drivare')],
    data.athletes
      .slice()
      .sort((a, b) => b.dmodx - a.dmodx)
      .map((a) => {
        const arch = classifyArchetype(a.topContributors, a.scores)
        const flag = a.isOutlierT2 || a.isOutlierDModX ? ' ⚠' : ''
        return [
          a.clientName,
          ARCHETYPE_LABELS[locale][arch].replace(/ profile| profil/i, ''),
          a.hotellingT2.toFixed(1) + (a.isOutlierT2 ? '*' : ''),
          a.dmodx.toFixed(2) + (a.isOutlierDModX ? '*' : '') + flag,
          (a.topContributors ?? []).slice(0, 2).map((c) => c.variableName).join(', '),
        ]
      }),
    y,
    { fontSize: 6.8 },
  )

  footer(pdf, locale, data.generatedAt)
  return pdf.output('blob')
}

export function generateMVAReportFilename(data: MVATeamReportData): string {
  const base = data.focusAthleteName
    ? `MVA_athlete_${filenamePart(data.focusAthleteName)}`
    : `MVA_team_${filenamePart(data.teamName)}`
  return `${base}_${new Date(data.generatedAt).toISOString().slice(0, 10)}.pdf`
}

export function downloadMVATeamReportPDF(data: MVATeamReportData): void {
  const blob = generateMVATeamReportPDF(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = generateMVAReportFilename(data)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
