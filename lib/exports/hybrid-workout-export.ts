/**
 * Hybrid Workout Export
 *
 * Generates PDF and Excel exports for hybrid workouts (CrossFit, HYROX, etc.)
 * Supports warmup, strength, metcon, and cooldown sections.
 */

import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import type { HybridSectionData, HybridSectionMovement } from '@/types'

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

/**
 * Generate Excel workbook for a hybrid workout
 */
export function generateHybridWorkoutExcel(data: HybridWorkoutExportData): Blob {
  const workbook = XLSX.utils.book_new()

  // Info Sheet
  const infoData: (string | number)[][] = [
    ['HYBRID PASS'],
    [''],
    ['Namn', data.name],
    ['Format', formatLabels[data.format] || data.format],
    ['Skalning', scalingLabels[data.scalingLevel] || data.scalingLevel],
    ['Datum', data.date ? data.date.toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE')],
    [''],
  ]

  if (data.description) {
    infoData.push(['Beskrivning', data.description])
    infoData.push([''])
  }

  if (data.totalMinutes) infoData.push(['Tid', `${data.totalMinutes} min`])
  if (data.totalRounds) infoData.push(['Rundor', data.totalRounds])
  if (data.timeCap) infoData.push(['Time Cap', `${Math.floor(data.timeCap / 60)} min`])
  if (data.repScheme) infoData.push(['Rep Scheme', data.repScheme])

  infoData.push([''])
  if (data.athleteName) infoData.push(['Atlet', data.athleteName])
  if (data.coachName) infoData.push(['Coach', data.coachName])

  const infoSheet = XLSX.utils.aoa_to_sheet(infoData)
  infoSheet['!cols'] = [{ wch: 15 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Info')

  // Sections Sheet
  const sectionsData: (string | number)[][] = []

  // Warmup Section
  if (data.warmupData && (data.warmupData.notes || data.warmupData.movements?.length)) {
    sectionsData.push(['UPPVÄRMNING'])
    if (data.warmupData.notes) {
      sectionsData.push([data.warmupData.notes])
    }
    data.warmupData.movements?.forEach((m, i) => {
      sectionsData.push([`${i + 1}. ${m.exerciseName}`, formatMovementPrescription(m)])
    })
    sectionsData.push([''])
  }

  // Strength Section
  if (data.strengthData && (data.strengthData.notes || data.strengthData.movements?.length)) {
    sectionsData.push(['STYRKA'])
    if (data.strengthData.notes) {
      sectionsData.push([data.strengthData.notes])
    }
    data.strengthData.movements?.forEach((m, i) => {
      sectionsData.push([`${i + 1}. ${m.exerciseName}`, formatMovementPrescription(m)])
    })
    sectionsData.push([''])
  }

  // Metcon Section
  sectionsData.push([`METCON - ${formatLabels[data.format] || data.format}`])
  if (data.totalMinutes) sectionsData.push([`Tid: ${data.totalMinutes} min`])
  if (data.totalRounds) sectionsData.push([`Rundor: ${data.totalRounds}`])
  if (data.timeCap) sectionsData.push([`Time Cap: ${Math.floor(data.timeCap / 60)} min`])
  if (data.repScheme) sectionsData.push([`Rep Scheme: ${data.repScheme}`])
  sectionsData.push([''])

  data.movements.forEach((m, i) => {
    sectionsData.push([`${i + 1}. ${m.exerciseName}`, formatMovementPrescription(m)])
  })
  sectionsData.push([''])

  // Cooldown Section
  if (data.cooldownData && (data.cooldownData.notes || data.cooldownData.movements?.length)) {
    sectionsData.push(['NEDVARVNING'])
    if (data.cooldownData.notes) {
      sectionsData.push([data.cooldownData.notes])
    }
    data.cooldownData.movements?.forEach((m, i) => {
      sectionsData.push([`${i + 1}. ${m.exerciseName}`, formatMovementPrescription(m)])
    })
  }

  const sectionsSheet = XLSX.utils.aoa_to_sheet(sectionsData)
  sectionsSheet['!cols'] = [{ wch: 35 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(workbook, sectionsSheet, 'Pass')

  // Generate buffer
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
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

  const pageWidth = 210
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = 20

  // Header
  pdf.setFontSize(22)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.name.toUpperCase(), margin, y)
  y += 10

  // Format and scaling badges
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  const formatText = formatLabels[data.format] || data.format
  const scalingText = scalingLabels[data.scalingLevel] || data.scalingLevel
  pdf.text(`${formatText} | ${scalingText}`, margin, y)
  y += 8

  // Date
  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  pdf.text(data.date ? data.date.toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE'), margin, y)
  pdf.setTextColor(0, 0, 0)
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
