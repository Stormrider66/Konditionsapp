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
  const margin = 15
  let y = 20

  // Header
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text(labels.title, margin, y)
  y += 10

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.text(data.sessionName, margin, y)
  y += 8

  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`${labels.phase}: ${data.phase}`, margin, y)
  y += 5
  pdf.text(`${labels.date}: ${data.date ? data.date.toLocaleDateString(dateLocale) : new Date().toLocaleDateString(dateLocale)}`, margin, y)
  y += 5
  if (data.athleteName) {
    pdf.text(`${labels.athlete}: ${data.athleteName}`, margin, y)
    y += 5
  }
  if (data.coachName) {
    pdf.text(`${labels.coach}: ${data.coachName}`, margin, y)
    y += 5
  }
  y += 10

  // Summary
  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text(labels.summaryTitle, margin, y)
  y += 6
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`${labels.exerciseCount}: ${data.exercises.length}`, margin, y)
  y += 5
  pdf.text(`${labels.totalSets}: ${data.exercises.reduce((acc, ex) => acc + ex.sets, 0)}`, margin, y)
  y += 5
  pdf.text(`${labels.estimatedTime}: ${data.exercises.reduce((acc, ex) => acc + (ex.sets * (2 + ex.rest / 60)), 10).toFixed(0)} min`, margin, y)
  y += 15

  // Exercises Table Header
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text(labels.exercises, margin, y)
  y += 8

  // Table header
  pdf.setFillColor(240, 240, 240)
  pdf.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F')
  pdf.setFontSize(9)
  pdf.text('#', margin + 2, y)
  pdf.text(labels.exercise, margin + 12, y)
  pdf.text('Set', margin + 80, y)
  pdf.text('Reps', margin + 95, y)
  pdf.text(labels.load, margin + 115, y)
  pdf.text(labels.rest, margin + 145, y)
  y += 8

  // Table rows
  pdf.setFont('helvetica', 'normal')
  data.exercises.forEach((ex, idx) => {
    const exerciseName = getStrengthPrintableExerciseName(ex.name)

    // Check if we need a new page
    if (y > 270) {
      pdf.addPage()
      y = 20
    }

    pdf.text(`${idx + 1}`, margin + 2, y)
    pdf.text(exerciseName.substring(0, 30), margin + 12, y)
    pdf.text(`${ex.sets}`, margin + 80, y)
    pdf.text(ex.reps, margin + 95, y)
    pdf.text(ex.weight || '-', margin + 115, y)
    pdf.text(`${ex.rest}s`, margin + 145, y)
    y += 6

    // Add notes if present
    if (ex.notes) {
      pdf.setTextColor(100, 100, 100)
      pdf.setFontSize(8)
      pdf.text(`  ${ex.notes}`, margin + 12, y)
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(9)
      y += 5
    }
  })

  // Footer
  pdf.setFontSize(8)
  pdf.setTextColor(150, 150, 150)
  pdf.text(`${labels.generated}: ${new Date().toLocaleString(dateLocale)}`, margin, 285)
  pdf.text(`${data.organization || 'Trainomics'} - Strength Studio`, pageWidth - margin - 50, 285)

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
