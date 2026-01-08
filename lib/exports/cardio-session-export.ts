/**
 * Cardio Session Export
 *
 * Generates PDF and Excel exports for cardio/running sessions.
 */

import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'

export type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'

export interface CardioSegment {
  id: string
  type: SegmentType
  duration?: number // minutes
  distance?: number // km
  zone: string
  pace?: string // "5:30/km"
  heartRate?: string // "145-155 bpm"
  notes?: string
  repeats?: number
  restDuration?: number
  distanceUnit?: 'km' | 'm'
}

export interface CardioSessionData {
  sessionName: string
  intensity: string
  segments: CardioSegment[]
  athleteName?: string
  coachName?: string
  date?: Date
}

// Segment type labels in Swedish
const SEGMENT_LABELS: Record<SegmentType, string> = {
  WARMUP: 'Uppvärmning',
  COOLDOWN: 'Nedvarvning',
  INTERVAL: 'Intervall',
  STEADY: 'Distans',
  RECOVERY: 'Återhämtning',
  HILL: 'Backe',
  DRILLS: 'Teknik',
}

// Intensity labels in Swedish
const INTENSITY_LABELS: Record<string, string> = {
  RECOVERY: 'Återhämtning',
  EASY: 'Lugn',
  MODERATE: 'Måttlig',
  THRESHOLD: 'Tröskel',
  INTERVAL: 'Intervall',
  MAX: 'Max',
}

/**
 * Generate Excel workbook for a cardio session
 */
export async function generateCardioSessionExcel(data: CardioSessionData): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Star by Thomson'
  workbook.created = new Date()

  // Calculate totals
  const totalDuration = data.segments.reduce((acc, s) => acc + (s.duration || 0), 0)
  const totalDistance = data.segments.reduce((acc, s) => acc + (s.distance || 0), 0)
  const avgZone = data.segments.length > 0
    ? Math.round(data.segments.reduce((acc, s) => acc + parseInt(s.zone || '0'), 0) / data.segments.length)
    : 0

  // Info Sheet
  const infoData: (string | number)[][] = [
    ['LÖPPASS'],
    [''],
    ['Pass', data.sessionName],
    ['Intensitet', INTENSITY_LABELS[data.intensity] || data.intensity],
    ['Datum', data.date ? data.date.toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE')],
    [''],
    ['Atlet', data.athleteName || ''],
    ['Coach', data.coachName || ''],
    [''],
    ['SAMMANFATTNING'],
    ['Total tid', `${totalDuration} min`],
    ['Total distans', `${totalDistance.toFixed(1)} km`],
    ['Antal segment', data.segments.length],
    ['Snittzon', `Z${avgZone}`],
  ]

  const infoSheet = workbook.addWorksheet('Info')
  infoSheet.addRows(infoData)
  infoSheet.columns = [{ width: 20 }, { width: 30 }]
  infoSheet.getRow(1).font = { bold: true }
  infoSheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' }

  // Segments Sheet
  const segmentData: (string | number)[][] = [
    ['#', 'Typ', 'Tid (min)', 'Distans (km)', 'Tempo', 'Puls', 'Zon', 'Upprepningar', 'Vila', 'Anteckningar'],
  ]

  data.segments.forEach((seg, idx) => {
    segmentData.push([
      idx + 1,
      SEGMENT_LABELS[seg.type] || seg.type,
      seg.duration || '-',
      seg.distance ? seg.distance.toFixed(2) : '-',
      seg.pace || '-',
      seg.heartRate || '-',
      `Z${seg.zone}`,
      seg.repeats || '-',
      seg.restDuration ? `${seg.restDuration} min` : '-',
      seg.notes || '',
    ])
  })

  const segmentSheet = workbook.addWorksheet('Segment')
  segmentSheet.addRows(segmentData)
  segmentSheet.columns = [
    { width: 5 },   // #
    { width: 15 },  // Typ
    { width: 10 },  // Tid
    { width: 12 },  // Distans
    { width: 10 },  // Tempo
    { width: 12 },  // Puls
    { width: 6 },   // Zon
    { width: 12 },  // Upprepningar
    { width: 10 },  // Vila
    { width: 25 },  // Anteckningar
  ]
  segmentSheet.views = [{ state: 'frozen', ySplit: 1 }]
  segmentSheet.getRow(1).font = { bold: true }
  segmentSheet.getColumn(10).alignment = { wrapText: true, vertical: 'top' }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Generate PDF for a cardio session
 */
export function generateCardioSessionPDF(data: CardioSessionData): Blob {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const margin = 15
  let y = 20

  // Calculate totals
  const totalDuration = data.segments.reduce((acc, s) => acc + (s.duration || 0), 0)
  const totalDistance = data.segments.reduce((acc, s) => acc + (s.distance || 0), 0)
  const avgZone = data.segments.length > 0
    ? Math.round(data.segments.reduce((acc, s) => acc + parseInt(s.zone || '0'), 0) / data.segments.length)
    : 0

  // Header
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text('LÖPPASS', margin, y)
  y += 10

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.text(data.sessionName, margin, y)
  y += 8

  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Intensitet: ${INTENSITY_LABELS[data.intensity] || data.intensity}`, margin, y)
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

  // Summary box
  pdf.setTextColor(0, 0, 0)
  pdf.setFillColor(245, 245, 245)
  pdf.roundedRect(margin, y - 3, pageWidth - 2 * margin, 25, 3, 3, 'F')

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  y += 5
  pdf.text('Sammanfattning', margin + 5, y)
  y += 7

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  const summaryY = y
  pdf.text(`Total tid: ${totalDuration} min`, margin + 5, summaryY)
  pdf.text(`Total distans: ${totalDistance.toFixed(1)} km`, margin + 50, summaryY)
  pdf.text(`Snittzon: Z${avgZone}`, margin + 100, summaryY)
  pdf.text(`Segment: ${data.segments.length}`, margin + 140, summaryY)

  y += 20

  // Segments Header
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('Segment', margin, y)
  y += 8

  // Table header
  pdf.setFillColor(240, 240, 240)
  pdf.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F')
  pdf.setFontSize(8)
  pdf.text('#', margin + 2, y)
  pdf.text('Typ', margin + 10, y)
  pdf.text('Tid', margin + 40, y)
  pdf.text('Dist', margin + 55, y)
  pdf.text('Tempo', margin + 72, y)
  pdf.text('Puls', margin + 92, y)
  pdf.text('Zon', margin + 115, y)
  pdf.text('Rep', margin + 130, y)
  pdf.text('Vila', margin + 145, y)
  pdf.text('Ant.', margin + 162, y)
  y += 8

  // Table rows
  pdf.setFont('helvetica', 'normal')
  data.segments.forEach((seg, idx) => {
    // Check if we need a new page
    if (y > 270) {
      pdf.addPage()
      y = 20
    }

    // Zone color indicator
    const zoneColors: Record<string, [number, number, number]> = {
      '1': [200, 230, 200], // Light green
      '2': [180, 220, 180], // Green
      '3': [255, 240, 180], // Yellow
      '4': [255, 200, 150], // Orange
      '5': [255, 150, 150], // Red
    }
    const zoneColor = zoneColors[seg.zone] || [255, 255, 255]
    pdf.setFillColor(zoneColor[0], zoneColor[1], zoneColor[2])
    pdf.rect(margin, y - 3, pageWidth - 2 * margin, 6, 'F')

    pdf.setTextColor(0, 0, 0)
    pdf.text(`${idx + 1}`, margin + 2, y)
    pdf.text((SEGMENT_LABELS[seg.type] || seg.type).substring(0, 12), margin + 10, y)
    pdf.text(seg.duration ? `${seg.duration}m` : '-', margin + 40, y)
    pdf.text(seg.distance ? `${seg.distance.toFixed(1)}` : '-', margin + 55, y)
    pdf.text(seg.pace || '-', margin + 72, y)
    pdf.text(seg.heartRate || '-', margin + 92, y)
    pdf.text(`Z${seg.zone}`, margin + 115, y)
    pdf.text(seg.repeats ? `${seg.repeats}x` : '-', margin + 130, y)
    pdf.text(seg.restDuration ? `${seg.restDuration}m` : '-', margin + 145, y)
    pdf.text((seg.notes || '').substring(0, 8), margin + 162, y)
    y += 7
  })

  // Visual timeline at the bottom
  y += 10
  if (y < 250) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Visuell översikt', margin, y)
    y += 8

    const timelineWidth = pageWidth - 2 * margin
    let xPos = margin

    data.segments.forEach((seg) => {
      if (!seg.duration) return

      const segWidth = (seg.duration / totalDuration) * timelineWidth
      const zoneColors: Record<string, [number, number, number]> = {
        '1': [100, 180, 100],
        '2': [80, 160, 80],
        '3': [220, 180, 50],
        '4': [230, 130, 50],
        '5': [200, 80, 80],
      }
      const color = zoneColors[seg.zone] || [150, 150, 150]

      pdf.setFillColor(color[0], color[1], color[2])
      pdf.rect(xPos, y, segWidth - 1, 15, 'F')

      // Add label if segment is wide enough
      if (segWidth > 15) {
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(7)
        pdf.text(`Z${seg.zone}`, xPos + 2, y + 6)
        pdf.text(`${seg.duration}m`, xPos + 2, y + 11)
      }

      xPos += segWidth
    })

    pdf.setTextColor(0, 0, 0)
  }

  // Footer
  pdf.setFontSize(8)
  pdf.setTextColor(150, 150, 150)
  pdf.text(`Genererad: ${new Date().toLocaleString('sv-SE')}`, margin, 285)
  pdf.text('Star by Thomson - Cardio Studio', pageWidth - margin - 50, 285)

  return pdf.output('blob')
}

/**
 * Generate filename for cardio session export
 */
export function generateCardioFilename(sessionName: string, extension: string): string {
  const safeName = sessionName
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40)

  const date = new Date().toISOString().split('T')[0]
  return `Loppass_${safeName}_${date}.${extension}`
}

/**
 * Download cardio session as Excel
 */
export async function downloadCardioSessionExcel(data: CardioSessionData, filename?: string): Promise<void> {
  const blob = await generateCardioSessionExcel(data)
  const finalFilename = filename || generateCardioFilename(data.sessionName, 'xlsx')
  downloadBlob(blob, finalFilename)
}

/**
 * Download cardio session as PDF
 */
export function downloadCardioSessionPDF(data: CardioSessionData, filename?: string): void {
  const blob = generateCardioSessionPDF(data)
  const finalFilename = filename || generateCardioFilename(data.sessionName, 'pdf')
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
