/**
 * Strength Session Export
 *
 * Generates PDF and Excel exports for strength training sessions.
 */

import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'

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
}

/**
 * Generate Excel workbook for a strength session
 */
export function generateStrengthSessionExcel(data: StrengthSessionData): Blob {
  const workbook = XLSX.utils.book_new()

  // Info Sheet
  const infoData: (string | number)[][] = [
    ['STYRKEPASS'],
    [''],
    ['Pass', data.sessionName],
    ['Fas', data.phase],
    ['Datum', data.date ? data.date.toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE')],
    [''],
    ['Atlet', data.athleteName || ''],
    ['Coach', data.coachName || ''],
    [''],
    ['SAMMANFATTNING'],
    ['Antal övningar', data.exercises.length],
    ['Totalt antal set', data.exercises.reduce((acc, ex) => acc + ex.sets, 0)],
    ['Uppskattad tid', `${data.exercises.reduce((acc, ex) => acc + (ex.sets * (2 + ex.rest / 60)), 10).toFixed(0)} min`],
  ]

  const infoSheet = XLSX.utils.aoa_to_sheet(infoData)
  infoSheet['!cols'] = [{ wch: 20 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Info')

  // Exercises Sheet
  const exerciseData: (string | number)[][] = [
    ['#', 'Övning', 'Set', 'Reps', 'Belastning', 'Vila (s)', 'Anteckningar'],
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

  const exerciseSheet = XLSX.utils.aoa_to_sheet(exerciseData)
  exerciseSheet['!cols'] = [
    { wch: 5 },   // #
    { wch: 30 },  // Övning
    { wch: 8 },   // Set
    { wch: 10 },  // Reps
    { wch: 12 },  // Belastning
    { wch: 10 },  // Vila
    { wch: 30 },  // Anteckningar
  ]
  XLSX.utils.book_append_sheet(workbook, exerciseSheet, 'Övningar')

  // Generate buffer
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Generate PDF for a strength session
 */
export function generateStrengthSessionPDF(data: StrengthSessionData): Blob {
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
  pdf.text('STYRKEPASS', margin, y)
  y += 10

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.text(data.sessionName, margin, y)
  y += 8

  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Fas: ${data.phase}`, margin, y)
  y += 5
  pdf.text(`Datum: ${data.date ? data.date.toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE')}`, margin, y)
  y += 5
  if (data.athleteName) {
    pdf.text(`Atlet: ${data.athleteName}`, margin, y)
    y += 5
  }
  if (data.coachName) {
    pdf.text(`Coach: ${data.coachName}`, margin, y)
    y += 5
  }
  y += 10

  // Summary
  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Sammanfattning', margin, y)
  y += 6
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`Antal övningar: ${data.exercises.length}`, margin, y)
  y += 5
  pdf.text(`Totalt antal set: ${data.exercises.reduce((acc, ex) => acc + ex.sets, 0)}`, margin, y)
  y += 5
  pdf.text(`Uppskattad tid: ${data.exercises.reduce((acc, ex) => acc + (ex.sets * (2 + ex.rest / 60)), 10).toFixed(0)} min`, margin, y)
  y += 15

  // Exercises Table Header
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('Övningar', margin, y)
  y += 8

  // Table header
  pdf.setFillColor(240, 240, 240)
  pdf.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F')
  pdf.setFontSize(9)
  pdf.text('#', margin + 2, y)
  pdf.text('Övning', margin + 12, y)
  pdf.text('Set', margin + 80, y)
  pdf.text('Reps', margin + 95, y)
  pdf.text('Belastning', margin + 115, y)
  pdf.text('Vila', margin + 145, y)
  y += 8

  // Table rows
  pdf.setFont('helvetica', 'normal')
  data.exercises.forEach((ex, idx) => {
    // Check if we need a new page
    if (y > 270) {
      pdf.addPage()
      y = 20
    }

    pdf.text(`${idx + 1}`, margin + 2, y)
    pdf.text(ex.name.substring(0, 30), margin + 12, y)
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
  pdf.text(`Genererad: ${new Date().toLocaleString('sv-SE')}`, margin, 285)
  pdf.text('Star by Thomson - Strength Studio', pageWidth - margin - 50, 285)

  return pdf.output('blob')
}

/**
 * Generate filename for strength session export
 */
export function generateStrengthFilename(sessionName: string, extension: string): string {
  const safeName = sessionName
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40)

  const date = new Date().toISOString().split('T')[0]
  return `Styrkepass_${safeName}_${date}.${extension}`
}

/**
 * Download strength session as Excel
 */
export function downloadStrengthSessionExcel(data: StrengthSessionData, filename?: string): void {
  const blob = generateStrengthSessionExcel(data)
  const finalFilename = filename || generateStrengthFilename(data.sessionName, 'xlsx')
  downloadBlob(blob, finalFilename)
}

/**
 * Download strength session as PDF
 */
export function downloadStrengthSessionPDF(data: StrengthSessionData, filename?: string): void {
  const blob = generateStrengthSessionPDF(data)
  const finalFilename = filename || generateStrengthFilename(data.sessionName, 'pdf')
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
