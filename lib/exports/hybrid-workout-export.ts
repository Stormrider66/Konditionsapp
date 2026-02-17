/**
 * Hybrid Workout Export
 *
 * Generates PDF and Excel exports for hybrid workouts (CrossFit, HYROX, etc.)
 * Supports warmup, strength, metcon, and cooldown sections.
 * Supports theming for both FITAPP Dark and Minimalist White themes.
 */

import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import type { HybridSectionData, HybridSectionMovement } from '@/types'
import type { ThemeId } from '@/lib/themes/types'
import { getTheme } from '@/lib/themes/definitions'
import { getPdfColors } from '@/lib/themes/theme-utils'

export interface HybridMovementExport {
  exerciseName: string
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weightMale?: number
  weightFemale?: number
}

export interface HybridWorkoutExportData {
  name: string
  description?: string
  format: string
  timeCap?: number
  totalMinutes?: number
  totalRounds?: number
  repScheme?: string
  scalingLevel: string
  movements: HybridMovementExport[]
  warmupData?: HybridSectionData
  strengthData?: HybridSectionData
  cooldownData?: HybridSectionData
  athleteName?: string
  coachName?: string
  date?: Date
  themeId?: ThemeId // Theme for PDF styling
  organization?: string
}

const formatLabels: Record<string, string> = {
  AMRAP: 'AMRAP',
  FOR_TIME: 'For Time',
  EMOM: 'EMOM',
  TABATA: 'Tabata',
  CHIPPER: 'Chipper',
  LADDER: 'Ladder',
  INTERVALS: 'Intervaller',
  HYROX_SIM: 'HYROX',
  CUSTOM: 'Anpassad',
}

const scalingLabels: Record<string, string> = {
  RX: 'Rx',
  SCALED: 'Scaled',
  FOUNDATIONS: 'Foundations',
  CUSTOM: 'Custom',
}

function formatMovementPrescription(m: HybridMovementExport | HybridSectionMovement): string {
  const parts: string[] = []
  if ('sets' in m && m.sets) parts.push(`${m.sets}x`)
  if (m.reps) parts.push(`${m.reps} reps`)
  if ('calories' in m && m.calories) parts.push(`${m.calories} cal`)
  if (m.distance) parts.push(`${m.distance}m`)
  if (m.duration) parts.push(`${m.duration}s`)
  if (m.weightMale || m.weightFemale) {
    parts.push(`(${m.weightMale || '-'}/${m.weightFemale || '-'}kg)`)
  }
  if ('restSeconds' in m && m.restSeconds) parts.push(`vila ${m.restSeconds}s`)
  return parts.join(' ')
}

// Default color definitions for styling (fallback for Excel)
const defaultColors = {
  headerDark: '2D3436',      // Dark gray/black for headers
  warmupGreen: '27AE60',     // Green for warmup/cooldown
  metconRed: 'E74C3C',       // Red for metcon
  accentOrange: 'E67E22',    // Orange for name and rep scheme
  accentGreen: '2ECC71',     // Green for Rx/scaling
  white: 'FFFFFF',
  black: '000000',
}

// Get theme-aware colors for exports
function getExportColors(themeId?: ThemeId) {
  const theme = getTheme(themeId)
  const pdfColors = getPdfColors(theme)
  return {
    headerDark: pdfColors.accent,
    warmupGreen: pdfColors.warmup,
    strengthDark: pdfColors.strength,
    metconRed: pdfColors.metcon,
    cooldownBlue: pdfColors.cooldown,
    accentOrange: pdfColors.warning,
    accentGreen: pdfColors.success,
    textPrimary: pdfColors.textPrimary,
    textSecondary: pdfColors.textSecondary,
    background: pdfColors.background,
    white: 'FFFFFF',
    black: '000000',
  }
}

/**
 * Generate styled Excel workbook for a hybrid workout
 */
export async function generateHybridWorkoutExcel(data: HybridWorkoutExportData): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = data.organization || 'Trainomics'
  workbook.created = new Date()

  // Get theme colors
  const colors = getExportColors(data.themeId)

  // ============ INFO SHEET ============
  const infoSheet = workbook.addWorksheet('Info')
  infoSheet.columns = [
    { width: 18 },
    { width: 35 },
    { width: 15 },
  ]

  // Row 1: HYBRID PASS header
  infoSheet.mergeCells('A1:C1')
  const headerCell = infoSheet.getCell('A1')
  headerCell.value = 'HYBRID PASS'
  headerCell.font = { bold: true, size: 16, color: { argb: colors.white } }
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerDark } }
  headerCell.alignment = { vertical: 'middle', horizontal: 'left' }
  infoSheet.getRow(1).height = 28

  // Row 2: Empty
  infoSheet.getRow(2).height = 10

  // Row 3: Namn
  infoSheet.getCell('A3').value = 'Namn'
  infoSheet.getCell('A3').font = { bold: true }
  infoSheet.getCell('B3').value = data.name
  infoSheet.getCell('B3').font = { bold: true, color: { argb: colors.accentOrange } }

  // Row 4: Format
  infoSheet.getCell('A4').value = 'Format'
  infoSheet.getCell('B4').value = formatLabels[data.format] || data.format

  // Row 5: Skalning
  infoSheet.getCell('A5').value = 'Skalning'
  infoSheet.getCell('B5').value = scalingLabels[data.scalingLevel] || data.scalingLevel
  infoSheet.getCell('B5').font = { bold: true, color: { argb: colors.accentGreen } }

  // Row 6: Datum
  infoSheet.getCell('A6').value = 'Datum'
  infoSheet.getCell('B6').value = data.date ? data.date.toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE')

  // Row 7: Empty
  let currentRow = 7

  // Row 8: Beskrivning (if exists)
  if (data.description) {
    currentRow++
    infoSheet.getCell(`A${currentRow}`).value = 'Beskrivning'
    infoSheet.getCell(`B${currentRow}`).value = data.description
    currentRow++
  }

  currentRow++

  // Rundor
  if (data.totalRounds) {
    infoSheet.getCell(`A${currentRow}`).value = 'Rundor'
    infoSheet.getCell(`B${currentRow}`).value = data.totalRounds
    infoSheet.getCell(`B${currentRow}`).font = { bold: true, color: { argb: colors.accentOrange } }
    currentRow++
  }

  // Rep Scheme
  if (data.repScheme) {
    infoSheet.getCell(`A${currentRow}`).value = 'Rep Scheme'
    infoSheet.getCell(`B${currentRow}`).value = data.repScheme
    infoSheet.getCell(`B${currentRow}`).font = { bold: true, color: { argb: colors.accentOrange } }
    currentRow++
  }

  // Time Cap
  if (data.timeCap) {
    infoSheet.getCell(`A${currentRow}`).value = 'Time Cap'
    infoSheet.getCell(`B${currentRow}`).value = `${Math.floor(data.timeCap / 60)} min`
    currentRow++
  }

  // Total Minutes
  if (data.totalMinutes) {
    infoSheet.getCell(`A${currentRow}`).value = 'Tid'
    infoSheet.getCell(`B${currentRow}`).value = `${data.totalMinutes} min`
    currentRow++
  }

  currentRow++

  // Separator bar
  infoSheet.mergeCells(`A${currentRow}:C${currentRow}`)
  const separatorCell = infoSheet.getCell(`A${currentRow}`)
  separatorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerDark } }
  infoSheet.getRow(currentRow).height = 6

  // ============ PASS SHEET ============
  const passSheet = workbook.addWorksheet('Pass')
  passSheet.columns = [
    { width: 30 },
    { width: 25 },
    { width: 15 },
  ]

  let passRow = 1

  // Helper function to add a section header
  const addSectionHeader = (title: string, bgColor: string) => {
    passSheet.mergeCells(`A${passRow}:C${passRow}`)
    const cell = passSheet.getCell(`A${passRow}`)
    cell.value = title
    cell.font = { bold: true, size: 12, color: { argb: colors.white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    passSheet.getRow(passRow).height = 22
    passRow++
  }

  // Helper function to add movement row
  const addMovementRow = (index: number, name: string, prescription: string) => {
    passSheet.getCell(`A${passRow}`).value = `${index}. ${name}`
    passSheet.getCell(`B${passRow}`).value = prescription
    passRow++
  }

  // Warmup Section
  if (data.warmupData && (data.warmupData.notes || data.warmupData.movements?.length)) {
    addSectionHeader('UPPVÄRMNING', colors.warmupGreen)
    data.warmupData.movements?.forEach((m, i) => {
      addMovementRow(i + 1, m.exerciseName, formatMovementPrescription(m))
    })
    passRow++ // Empty row
  }

  // Strength Section
  if (data.strengthData && (data.strengthData.notes || data.strengthData.movements?.length)) {
    addSectionHeader('STYRKA', colors.headerDark)
    data.strengthData.movements?.forEach((m, i) => {
      addMovementRow(i + 1, m.exerciseName, formatMovementPrescription(m))
    })
    passRow++ // Empty row
  }

  // Metcon Section
  addSectionHeader(`METCON - ${formatLabels[data.format] || data.format}`, colors.metconRed)

  // Metcon info rows
  if (data.totalRounds) {
    passSheet.getCell(`A${passRow}`).value = `Rundor: ${data.totalRounds}`
    passSheet.getCell(`A${passRow}`).font = { color: { argb: colors.accentGreen } }
    passRow++
  }
  if (data.repScheme) {
    passSheet.getCell(`A${passRow}`).value = `Rep Scheme: ${data.repScheme}`
    passSheet.getCell(`A${passRow}`).font = { color: { argb: colors.accentOrange } }
    passRow++
  }
  passRow++ // Empty row

  // Metcon movements
  data.movements.forEach((m, i) => {
    addMovementRow(i + 1, m.exerciseName, formatMovementPrescription(m))
  })
  passRow++ // Empty row

  // Cooldown Section
  if (data.cooldownData && (data.cooldownData.notes || data.cooldownData.movements?.length)) {
    addSectionHeader('NEDVARVNING', colors.warmupGreen)
    data.cooldownData.movements?.forEach((m, i) => {
      addMovementRow(i + 1, m.exerciseName, formatMovementPrescription(m))
    })
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Generate PDF for a hybrid workout (whiteboard-ready format)
 */
export function generateHybridWorkoutPDF(data: HybridWorkoutExportData): Blob {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Get theme colors
  const colors = getExportColors(data.themeId)

  // Helper to parse hex to RGB
  const hexToRgb = (hex: string) => ({
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  })

  const pageWidth = 210
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = 20

  // Set text color based on theme
  const primaryColor = hexToRgb(colors.textPrimary)
  const secondaryColor = hexToRgb(colors.textSecondary)
  const accentColor = hexToRgb(colors.headerDark)

  // Header
  pdf.setFontSize(22)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(accentColor.r, accentColor.g, accentColor.b)
  pdf.text(data.name.toUpperCase(), margin, y)
  y += 10

  // Format and scaling badges
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b)
  const formatText = formatLabels[data.format] || data.format
  const scalingText = scalingLabels[data.scalingLevel] || data.scalingLevel
  pdf.text(`${formatText} | ${scalingText}`, margin, y)
  y += 8

  // Date
  pdf.setFontSize(10)
  pdf.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b)
  pdf.text(data.date ? data.date.toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE'), margin, y)
  pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b)
  y += 8

  // Description
  if (data.description) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'italic')
    const descLines = pdf.splitTextToSize(data.description, contentWidth)
    pdf.text(descLines, margin, y)
    y += descLines.length * 5 + 5
    pdf.setFont('helvetica', 'normal')
  }

  // Warmup Section
  if (data.warmupData && (data.warmupData.notes || data.warmupData.movements?.length)) {
    y = addSectionToPDF(pdf, 'UPPVÄRMNING', data.warmupData, margin, y, contentWidth)
  }

  // Strength Section
  if (data.strengthData && (data.strengthData.notes || data.strengthData.movements?.length)) {
    y = addSectionToPDF(pdf, 'STYRKA', data.strengthData, margin, y, contentWidth)
  }

  // Metcon Section (Main workout)
  y = addMetconToPDF(pdf, data, margin, y, contentWidth)

  // Cooldown Section
  if (data.cooldownData && (data.cooldownData.notes || data.cooldownData.movements?.length)) {
    y = addSectionToPDF(pdf, 'NEDVARVNING', data.cooldownData, margin, y, contentWidth)
  }

  // Footer with coach info
  if (data.coachName || data.athleteName) {
    y += 10
    pdf.setFontSize(8)
    pdf.setTextColor(128, 128, 128)
    if (data.athleteName) pdf.text(`Atlet: ${data.athleteName}`, margin, y)
    if (data.coachName) pdf.text(`Coach: ${data.coachName}`, pageWidth - margin - pdf.getTextWidth(`Coach: ${data.coachName}`), y)
  }

  return pdf.output('blob')
}

function addSectionToPDF(
  pdf: jsPDF,
  title: string,
  section: HybridSectionData,
  margin: number,
  y: number,
  contentWidth: number
): number {
  // Check if we need a new page
  if (y > 250) {
    pdf.addPage()
    y = 20
  }

  // Section title with line
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text(title, margin, y)
  pdf.setDrawColor(200, 200, 200)
  pdf.line(margin, y + 2, margin + contentWidth, y + 2)
  y += 8

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)

  // Notes
  if (section.notes) {
    const noteLines = pdf.splitTextToSize(section.notes, contentWidth)
    pdf.text(noteLines, margin, y)
    y += noteLines.length * 5 + 3
  }

  // Movements
  if (section.movements && section.movements.length > 0) {
    section.movements.forEach((m, i) => {
      const prescription = formatMovementPrescription(m)
      const text = `${i + 1}. ${m.exerciseName}${prescription ? ` - ${prescription}` : ''}`
      pdf.text(text, margin + 3, y)
      y += 5
    })
  }

  y += 8
  return y
}

function addMetconToPDF(
  pdf: jsPDF,
  data: HybridWorkoutExportData,
  margin: number,
  y: number,
  contentWidth: number
): number {
  // Check if we need a new page
  if (y > 220) {
    pdf.addPage()
    y = 20
  }

  // Section title with format
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  const formatText = formatLabels[data.format] || data.format
  pdf.text(`METCON - ${formatText}`, margin, y)
  pdf.setDrawColor(100, 100, 100)
  pdf.line(margin, y + 2, margin + contentWidth, y + 2)
  y += 10

  // Time/rounds info
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  const metaItems: string[] = []
  if (data.totalMinutes) metaItems.push(`${data.totalMinutes} min`)
  if (data.totalRounds) metaItems.push(`${data.totalRounds} rundor`)
  if (data.timeCap) metaItems.push(`${Math.floor(data.timeCap / 60)} min cap`)
  if (data.repScheme) metaItems.push(data.repScheme)

  if (metaItems.length > 0) {
    pdf.text(metaItems.join(' | '), margin, y)
    y += 8
  }

  // Movements
  pdf.setFontSize(11)
  data.movements.forEach((m, i) => {
    const prescription = formatMovementPrescription(m)

    // Check if we need a new page
    if (y > 275) {
      pdf.addPage()
      y = 20
    }

    pdf.setFont('helvetica', 'bold')
    pdf.text(`${i + 1}.`, margin + 3, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`${m.exerciseName}`, margin + 12, y)

    if (prescription) {
      pdf.setTextColor(80, 80, 80)
      pdf.text(prescription, margin + 12, y + 5)
      pdf.setTextColor(0, 0, 0)
      y += 10
    } else {
      y += 6
    }
  })

  y += 8
  return y
}

/**
 * Trigger browser download for a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate a safe filename
 */
export function generateFilename(name: string, extension: string): string {
  const safeName = name
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)

  const date = new Date().toISOString().split('T')[0]
  return `Hybrid_${safeName}_${date}.${extension}`
}
