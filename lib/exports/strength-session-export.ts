/**
 * Strength Session Export
 *
 * Generates PDF and Excel exports for strength training sessions.
 */

import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'

type ExportLocale = 'en' | 'sv'

export interface StrengthExercise {
  id: string
  name: string
  sets: number
  reps: string
  weight: string
  rest: number
  notes?: string
}

export interface StrengthSessionData {
  sessionName: string
  phase: string
  exercises: StrengthExercise[]
  athleteName?: string
  coachName?: string
  date?: Date
  organization?: string
  locale?: ExportLocale
}

const STRENGTH_LABELS = {
  en: {
    title: 'STRENGTH SESSION',
    session: 'Session',
    phase: 'Phase',
    date: 'Date',
    athlete: 'Athlete',
    coach: 'Coach',
    summary: 'SUMMARY',
    summaryTitle: 'Summary',
    exerciseCount: 'Exercise count',
    totalSets: 'Total sets',
    estimatedTime: 'Estimated time',
    exercises: 'Exercises',
    exercise: 'Exercise',
    load: 'Load',
    rest: 'Rest',
    notes: 'Notes',
    generated: 'Generated',
    filenamePrefix: 'Strength_session',
  },
  sv: {
    title: 'STYRKEPASS',
    session: 'Pass',
    phase: 'Fas',
    date: 'Datum',
    athlete: 'Atlet',
    coach: 'Coach',
    summary: 'SAMMANFATTNING',
    summaryTitle: 'Sammanfattning',
    exerciseCount: 'Antal övningar',
    totalSets: 'Totalt antal set',
    estimatedTime: 'Uppskattad tid',
    exercises: 'Övningar',
    exercise: 'Övning',
    load: 'Belastning',
    rest: 'Vila',
    notes: 'Anteckningar',
    generated: 'Genererad',
    filenamePrefix: 'Styrkepass',
  },
} satisfies Record<ExportLocale, Record<string, string>>

function getExportLocale(data: { locale?: ExportLocale }): ExportLocale {
  return data.locale === 'sv' ? 'sv' : 'en'
}

function getDateLocale(locale: ExportLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

const PRINT_SECTION_PREFIX_PATTERN =
  /^(?:(?:uppvärmning|uppvärming|huvudpass|core|prehab|nedvarvning|warm[-\s]?up|main session|cool[-\s]?down)|(?:stabilitet|stabilitets|stability)\s*(?:\/\s*prehab)?)\s*(?:-|–|—|:)\s*/i

export function getStrengthPrintableExerciseName(name: string): string {
  let cleanedName = name.trim()

  while (PRINT_SECTION_PREFIX_PATTERN.test(cleanedName)) {
    cleanedName = cleanedName.replace(PRINT_SECTION_PREFIX_PATTERN, '').trim()
  }

  return cleanedName || name
}

/**
 * Generate Excel workbook for a strength session
 */
export async function generateStrengthSessionExcel(data: StrengthSessionData): Promise<Blob> {
  const locale = getExportLocale(data)
  const labels = STRENGTH_LABELS[locale]
  const dateLocale = getDateLocale(locale)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = data.organization || 'Trainomics'
  workbook.created = new Date()

  // Info Sheet
  const infoData: (string | number)[][] = [
    [labels.title],
    [''],
    [labels.session, data.sessionName],
    [labels.phase, data.phase],
    [labels.date, data.date ? data.date.toLocaleDateString(dateLocale) : new Date().toLocaleDateString(dateLocale)],
    [''],
    [labels.athlete, data.athleteName || ''],
    [labels.coach, data.coachName || ''],
    [''],
    [labels.summary],
    [labels.exerciseCount, data.exercises.length],
    [labels.totalSets, data.exercises.reduce((acc, ex) => acc + ex.sets, 0)],
    [labels.estimatedTime, `${data.exercises.reduce((acc, ex) => acc + (ex.sets * (2 + ex.rest / 60)), 10).toFixed(0)} min`],
  ]

  const infoSheet = workbook.addWorksheet('Info')
  infoSheet.addRows(infoData)
  infoSheet.columns = [{ width: 20 }, { width: 30 }]
  infoSheet.getRow(1).font = { bold: true }
  infoSheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' }

  // Exercises Sheet
  const exerciseData: (string | number)[][] = [
    ['#', labels.exercise, 'Set', 'Reps', labels.load, `${labels.rest} (s)`, labels.notes],
  ]

  data.exercises.forEach((ex, idx) => {
    exerciseData.push([
      idx + 1,
      ex.name,
      ex.sets,
      ex.reps,
      ex.weight || '-',
      ex.rest,
      ex.notes || '',
    ])
  })

  const exerciseSheet = workbook.addWorksheet(labels.exercises)
  exerciseSheet.addRows(exerciseData)
  exerciseSheet.columns = [
    { width: 5 },   // #
    { width: 30 },  // Övning
    { width: 8 },   // Set
    { width: 10 },  // Reps
    { width: 12 },  // Belastning
    { width: 10 },  // Vila
    { width: 30 },  // Anteckningar
  ]
  exerciseSheet.views = [{ state: 'frozen', ySplit: 1 }]
  exerciseSheet.getRow(1).font = { bold: true }
  exerciseSheet.getColumn(7).alignment = { wrapText: true, vertical: 'top' }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Generate PDF for a strength session
 */
export function generateStrengthSessionPDF(data: StrengthSessionData): Blob {
  const locale = getExportLocale(data)
  const labels = STRENGTH_LABELS[locale]
  const dateLocale = getDateLocale(locale)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const pageHeight = 297
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  const footerY = pageHeight - 9
  const tableBottomY = pageHeight - 17
  const colors = {
    ink: [15, 23, 42] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    faint: [241, 245, 249] as [number, number, number],
    line: [203, 213, 225] as [number, number, number],
    accent: [20, 184, 166] as [number, number, number],
    accentDark: [15, 118, 110] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  }

  const sessionDate = data.date
    ? data.date.toLocaleDateString(dateLocale)
    : new Date().toLocaleDateString(dateLocale)
  const generatedAt = new Date().toLocaleString(dateLocale)
  const totalSets = data.exercises.reduce((acc, ex) => acc + ex.sets, 0)
  const estimatedMinutes = data.exercises
    .reduce((acc, ex) => acc + (ex.sets * (2 + ex.rest / 60)), 10)
    .toFixed(0)

  function setTextColor(color: [number, number, number]) {
    pdf.setTextColor(color[0], color[1], color[2])
  }

  function setFillColor(color: [number, number, number]) {
    pdf.setFillColor(color[0], color[1], color[2])
  }

  function setDrawColor(color: [number, number, number]) {
    pdf.setDrawColor(color[0], color[1], color[2])
  }

  function wrapText(value: string, maxWidth: number): string[] {
    const wrapped = pdf.splitTextToSize(value, maxWidth)
    return Array.isArray(wrapped) ? wrapped : [wrapped]
  }

  function drawPill(label: string, value: string, x: number, y: number, width: number) {
    setFillColor(colors.faint)
    setDrawColor(colors.line)
    pdf.roundedRect(x, y, width, 15, 2.5, 2.5, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.6)
    setTextColor(colors.muted)
    pdf.text(label.toUpperCase(), x + 3.2, y + 5.2)
    pdf.setFontSize(8.8)
    setTextColor(colors.ink)
    pdf.text(wrapText(value || '-', width - 6.4).slice(0, 1), x + 3.2, y + 11.2)
  }

  function drawSummaryCard(label: string, value: string, x: number, y: number, width: number) {
    setFillColor(colors.white)
    setDrawColor(colors.line)
    pdf.roundedRect(x, y, width, 22, 3, 3, 'FD')
    setFillColor(colors.accent)
    pdf.roundedRect(x, y, 2.8, 22, 3, 3, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.2)
    setTextColor(colors.muted)
    pdf.text(label.toUpperCase(), x + 6, y + 7)
    pdf.setFontSize(15)
    setTextColor(colors.ink)
    pdf.text(value, x + 6, y + 16.5)
  }

  function drawTableHeader(y: number) {
    setFillColor(colors.ink)
    pdf.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    setTextColor(colors.white)
    pdf.text('#', margin + 4, y + 5.8)
    pdf.text(labels.exercise.toUpperCase(), margin + 15, y + 5.8)
    pdf.text('SET', margin + 100, y + 5.8)
    pdf.text('REPS', margin + 117, y + 5.8)
    pdf.text(labels.load.toUpperCase(), margin + 136, y + 5.8)
    pdf.text(labels.rest.toUpperCase(), margin + 165, y + 5.8)
  }

  function addContinuationPage() {
    pdf.addPage()
    setTextColor(colors.ink)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text(data.sessionName, margin, 14)
    pdf.setFontSize(7.5)
    setTextColor(colors.muted)
    pdf.text(labels.title, pageWidth - margin, 14, { align: 'right' })
    drawTableHeader(20)
    return 32
  }

  setFillColor(colors.ink)
  pdf.rect(0, 0, pageWidth, 48, 'F')
  setFillColor(colors.accent)
  pdf.rect(0, 0, 7, 48, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  setTextColor(colors.accent)
  pdf.text(labels.title, margin, 18)
  pdf.setFontSize(23)
  setTextColor(colors.white)
  pdf.text(wrapText(data.sessionName, 125).slice(0, 2), margin, 30, { lineHeightFactor: 1.05 })

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  setTextColor(colors.white)
  pdf.text(data.organization || 'Trainomics', pageWidth - margin, 18, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  setTextColor([203, 213, 225])
  pdf.text('Strength Studio', pageWidth - margin, 24, { align: 'right' })

  let y = 56
  const pillWidth = (contentWidth - 9) / 4
  drawPill(labels.phase, data.phase || '-', margin, y, pillWidth)
  drawPill(labels.date, sessionDate, margin + pillWidth + 3, y, pillWidth)
  drawPill(labels.athlete, data.athleteName || '-', margin + (pillWidth + 3) * 2, y, pillWidth)
  drawPill(labels.coach, data.coachName || '-', margin + (pillWidth + 3) * 3, y, pillWidth)
  y += 24

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  setTextColor(colors.ink)
  pdf.text(labels.summaryTitle, margin, y)
  setDrawColor(colors.accent)
  pdf.setLineWidth(0.6)
  pdf.line(margin, y + 3, margin + 23, y + 3)
  y += 8

  const cardWidth = (contentWidth - 8) / 3
  drawSummaryCard(labels.exerciseCount, String(data.exercises.length), margin, y, cardWidth)
  drawSummaryCard(labels.totalSets, String(totalSets), margin + cardWidth + 4, y, cardWidth)
  drawSummaryCard(labels.estimatedTime, `${estimatedMinutes} min`, margin + (cardWidth + 4) * 2, y, cardWidth)
  y += 34

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  setTextColor(colors.ink)
  pdf.text(labels.exercises, margin, y)
  y += 7
  drawTableHeader(y)
  y += 10

  data.exercises.forEach((ex, idx) => {
    const exerciseName = getStrengthPrintableExerciseName(ex.name)
    const nameLines = wrapText(exerciseName, 78).slice(0, 2)
    const noteLines = ex.notes ? wrapText(ex.notes, 78).slice(0, 3) : []
    const setLines = wrapText(String(ex.sets), 10).slice(0, 2)
    const repLines = wrapText(ex.reps, 15).slice(0, 2)
    const loadLines = wrapText(ex.weight || '-', 24).slice(0, 2)
    const restLines = wrapText(`${ex.rest}s`, 18).slice(0, 2)
    const detailLineCount = Math.max(setLines.length, repLines.length, loadLines.length, restLines.length)
    const rowHeight = Math.max(
      14,
      7 + nameLines.length * 4.2 + noteLines.length * 3.8,
      7 + detailLineCount * 4
    )

    if (y + rowHeight > tableBottomY) {
      y = addContinuationPage()
    }

    if (idx % 2 === 0) {
      setFillColor(colors.faint)
      pdf.roundedRect(margin, y - 1, contentWidth, rowHeight, 1.5, 1.5, 'F')
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    setTextColor(colors.accentDark)
    pdf.text(String(idx + 1), margin + 4, y + 5)

    pdf.setFontSize(9.2)
    setTextColor(colors.ink)
    pdf.text(nameLines, margin + 15, y + 5, { lineHeightFactor: 1.15 })

    if (noteLines.length > 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.4)
      setTextColor(colors.muted)
      pdf.text(noteLines, margin + 15, y + 5 + nameLines.length * 4.4, { lineHeightFactor: 1.15 })
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.8)
    setTextColor(colors.ink)
    pdf.text(setLines, margin + 100, y + 5, { lineHeightFactor: 1.1 })
    pdf.text(repLines, margin + 117, y + 5, { lineHeightFactor: 1.1 })
    pdf.text(loadLines, margin + 136, y + 5, { lineHeightFactor: 1.1 })
    pdf.text(restLines, margin + 165, y + 5, { lineHeightFactor: 1.1 })

    y += rowHeight + 1
  })

  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    setDrawColor(colors.line)
    pdf.setLineWidth(0.2)
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.2)
    setTextColor(colors.muted)
    pdf.text(`${labels.generated}: ${generatedAt}`, margin, footerY)
    pdf.text(`${data.organization || 'Trainomics'} - Strength Studio`, pageWidth / 2, footerY, { align: 'center' })
    pdf.text(`${page}/${pageCount}`, pageWidth - margin, footerY, { align: 'right' })
  }

  return pdf.output('blob')
}

/**
 * Generate filename for strength session export
 */
export function generateStrengthFilename(sessionName: string, extension: string, locale: ExportLocale = 'en'): string {
  const safeName = sessionName
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40)

  const date = new Date().toISOString().split('T')[0]
  return `${STRENGTH_LABELS[locale].filenamePrefix}_${safeName}_${date}.${extension}`
}

/**
 * Download strength session as Excel
 */
export async function downloadStrengthSessionExcel(data: StrengthSessionData, filename?: string): Promise<void> {
  const blob = await generateStrengthSessionExcel(data)
  const finalFilename = filename || generateStrengthFilename(data.sessionName, 'xlsx', getExportLocale(data))
  downloadBlob(blob, finalFilename)
}

/**
 * Download strength session as PDF
 */
export function downloadStrengthSessionPDF(data: StrengthSessionData, filename?: string): void {
  const blob = generateStrengthSessionPDF(data)
  const finalFilename = filename || generateStrengthFilename(data.sessionName, 'pdf', getExportLocale(data))
  downloadBlob(blob, finalFilename)
}

/**
 * Helper to download blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
