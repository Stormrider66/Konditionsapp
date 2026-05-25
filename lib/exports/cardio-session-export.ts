/**
 * Cardio Session Export
 *
 * Generates PDF and Excel exports for cardio/running sessions.
 */

import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'

type ExportLocale = 'en' | 'sv'

export type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS' | 'CORE' | 'PREHAB' | 'PLYOMETRIC'

export interface CardioSegment {
  id?: string
  type: SegmentType | string
  duration?: number // minutes
  distance?: number // km
  zone?: string | number
  pace?: string // "5:30/km"
  heartRate?: string // "145-155 bpm"
  notes?: string
  repeats?: number
  restDuration?: number
  distanceUnit?: 'km' | 'm'
}

export interface CardioSessionData {
  sessionName: string
  intensity?: string
  segments: CardioSegment[]
  athleteName?: string
  coachName?: string
  date?: Date
  organization?: string
  locale?: ExportLocale
}

const SEGMENT_LABELS: Record<ExportLocale, Record<SegmentType, string>> = {
  en: {
    WARMUP: 'Warm-up',
    COOLDOWN: 'Cool-down',
    INTERVAL: 'Interval',
    STEADY: 'Steady',
    RECOVERY: 'Recovery',
    HILL: 'Hill',
    DRILLS: 'Drills',
    CORE: 'Core',
    PREHAB: 'Stability / Prehab',
    PLYOMETRIC: 'Plyometric',
  },
  sv: {
    WARMUP: 'Uppvärmning',
    COOLDOWN: 'Nedvarvning',
    INTERVAL: 'Intervall',
    STEADY: 'Distans',
    RECOVERY: 'Återhämtning',
    HILL: 'Backe',
    DRILLS: 'Teknik',
    CORE: 'Core',
    PREHAB: 'Stabilitet / Prehab',
    PLYOMETRIC: 'Plyometri',
  },
}

const INTENSITY_LABELS: Record<ExportLocale, Record<string, string>> = {
  en: {
    RECOVERY: 'Recovery',
    EASY: 'Easy',
    MODERATE: 'Moderate',
    THRESHOLD: 'Threshold',
    INTERVAL: 'Interval',
    MAX: 'Max',
  },
  sv: {
    RECOVERY: 'Återhämtning',
    EASY: 'Lugn',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  },
}

const CARDIO_LABELS = {
  en: {
    title: 'RUNNING SESSION',
    session: 'Session',
    intensity: 'Intensity',
    date: 'Date',
    athlete: 'Athlete',
    coach: 'Coach',
    summary: 'SUMMARY',
    summaryTitle: 'Summary',
    totalTime: 'Total time',
    totalDistance: 'Total distance',
    segmentCount: 'Segment count',
    averageZone: 'Average zone',
    type: 'Type',
    time: 'Time',
    distance: 'Distance',
    pace: 'Pace',
    heartRate: 'Heart rate',
    zone: 'Zone',
    repeats: 'Repeats',
    rest: 'Rest',
    notes: 'Notes',
    visualOverview: 'Visual overview',
    generated: 'Generated',
    filenamePrefix: 'Running_session',
  },
  sv: {
    title: 'LÖPPASS',
    session: 'Pass',
    intensity: 'Intensitet',
    date: 'Datum',
    athlete: 'Atlet',
    coach: 'Coach',
    summary: 'SAMMANFATTNING',
    summaryTitle: 'Sammanfattning',
    totalTime: 'Total tid',
    totalDistance: 'Total distans',
    segmentCount: 'Antal segment',
    averageZone: 'Snittzon',
    type: 'Typ',
    time: 'Tid',
    distance: 'Distans',
    pace: 'Tempo',
    heartRate: 'Puls',
    zone: 'Zon',
    repeats: 'Upprepningar',
    rest: 'Vila',
    notes: 'Anteckningar',
    visualOverview: 'Visuell översikt',
    generated: 'Genererad',
    filenamePrefix: 'Loppass',
  },
} satisfies Record<ExportLocale, Record<string, string>>

function getExportLocale(data: { locale?: ExportLocale }): ExportLocale {
  return data.locale === 'sv' ? 'sv' : 'en'
}

function getDateLocale(locale: ExportLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

function numericValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function roundedValue(value: number, decimals = 1): number {
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

function formatNumber(value: number, decimals = 1): string {
  const rounded = roundedValue(value, decimals)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(decimals)
}

function formatDurationLabel(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '-'
  return `${formatNumber(minutes)} min`
}

function formatDistanceLabel(kilometers: number | undefined): string {
  if (!kilometers || kilometers <= 0) return '-'
  if (kilometers < 1) return `${Math.round(kilometers * 1000)} m`
  return `${formatNumber(kilometers)} km`
}

function formatDistanceKmValue(kilometers: number | undefined): string {
  if (!kilometers || kilometers <= 0) return '-'
  return kilometers < 1 ? kilometers.toFixed(2) : formatNumber(kilometers)
}

function secondsToMinutes(seconds: number | undefined): number | undefined {
  if (!seconds || seconds <= 0) return undefined
  return roundedValue(seconds / 60)
}

function metersToKilometers(meters: number | undefined): number | undefined {
  if (!meters || meters <= 0) return undefined
  return Math.round((meters / 1000) * 1000) / 1000
}

function looksLikeStoredUnits(segments: CardioSegment[]): boolean {
  return segments.some((segment) => {
    const duration = numericValue(segment.duration)
    const distance = numericValue(segment.distance)
    const restDuration = numericValue(segment.restDuration)

    return Boolean(
      (duration && duration > 240)
      || (restDuration && restDuration > 90)
      || (distance && distance >= 250)
    )
  })
}

export function normalizeCardioExportSegments(segments: CardioSegment[]): CardioSegment[] {
  if (!looksLikeStoredUnits(segments)) return segments

  return segments.map((segment) => ({
    ...segment,
    duration: secondsToMinutes(numericValue(segment.duration)),
    distance: metersToKilometers(numericValue(segment.distance)),
    restDuration: secondsToMinutes(numericValue(segment.restDuration)),
  }))
}

function getRepeatCount(segment: CardioSegment): number {
  const repeats = numericValue(segment.repeats)
  return repeats && repeats > 1 ? Math.floor(repeats) : 1
}

function getSegmentTotalDuration(segment: CardioSegment): number {
  const repeats = getRepeatCount(segment)
  const duration = numericValue(segment.duration) || 0
  const restDuration = numericValue(segment.restDuration) || 0
  return duration * repeats + restDuration * Math.max(repeats - 1, 0)
}

function getSegmentTotalDistance(segment: CardioSegment): number {
  return (numericValue(segment.distance) || 0) * getRepeatCount(segment)
}

function getZoneValue(segment: CardioSegment): number | undefined {
  const zone = segment.zone
  if (typeof zone === 'number' && Number.isFinite(zone)) return zone
  if (typeof zone === 'string') {
    const match = zone.match(/\d+/)
    if (match) return Number(match[0])
  }
  return undefined
}

function getZoneLabel(segment: CardioSegment): string {
  const zone = getZoneValue(segment)
  return zone ? `Z${zone}` : '-'
}

function getSegmentLabel(segment: CardioSegment, locale: ExportLocale): string {
  return SEGMENT_LABELS[locale][segment.type as SegmentType] || segment.type || '-'
}

function formatIntensity(data: CardioSessionData, locale: ExportLocale): string {
  if (!data.intensity) return '-'
  return INTENSITY_LABELS[locale][data.intensity] || data.intensity
}

export function getCardioExportTotals(segments: CardioSegment[]): {
  totalDuration: number
  totalDistance: number
  avgZone: number
} {
  const exportSegments = normalizeCardioExportSegments(segments)
  const totalDuration = exportSegments.reduce((acc, segment) => acc + getSegmentTotalDuration(segment), 0)
  const totalDistance = exportSegments.reduce((acc, segment) => acc + getSegmentTotalDistance(segment), 0)
  const zones = exportSegments.map(getZoneValue).filter((zone): zone is number => Number.isFinite(zone))
  const avgZone = zones.length > 0
    ? Math.round(zones.reduce((acc, zone) => acc + zone, 0) / zones.length)
    : 0

  return { totalDuration, totalDistance, avgZone }
}

/**
 * Generate Excel workbook for a cardio session
 */
export async function generateCardioSessionExcel(data: CardioSessionData): Promise<Blob> {
  const locale = getExportLocale(data)
  const labels = CARDIO_LABELS[locale]
  const dateLocale = getDateLocale(locale)
  const segments = normalizeCardioExportSegments(data.segments)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = data.organization || 'Trainomics'
  workbook.created = new Date()

  const { totalDuration, totalDistance, avgZone } = getCardioExportTotals(segments)

  // Info Sheet
  const infoData: (string | number)[][] = [
    [labels.title],
    [''],
    [labels.session, data.sessionName],
    [labels.intensity, formatIntensity(data, locale)],
    [labels.date, data.date ? data.date.toLocaleDateString(dateLocale) : new Date().toLocaleDateString(dateLocale)],
    [''],
    [labels.athlete, data.athleteName || ''],
    [labels.coach, data.coachName || ''],
    [''],
    [labels.summary],
    [labels.totalTime, formatDurationLabel(totalDuration)],
    [labels.totalDistance, formatDistanceLabel(totalDistance)],
    [labels.segmentCount, segments.length],
    [labels.averageZone, avgZone ? `Z${avgZone}` : '-'],
  ]

  const infoSheet = workbook.addWorksheet('Info')
  infoSheet.addRows(infoData)
  infoSheet.columns = [{ width: 20 }, { width: 30 }]
  infoSheet.getRow(1).font = { bold: true }
  infoSheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' }

  // Segments Sheet
  const segmentData: (string | number)[][] = [
    ['#', labels.type, `${labels.time} (min)`, `${labels.distance} (km)`, labels.pace, labels.heartRate, labels.zone, labels.repeats, labels.rest, labels.notes],
  ]

  segments.forEach((seg, idx) => {
    segmentData.push([
      idx + 1,
      getSegmentLabel(seg, locale),
      seg.duration ? formatNumber(seg.duration) : '-',
      formatDistanceKmValue(seg.distance),
      seg.pace || '-',
      seg.heartRate || '-',
      getZoneLabel(seg),
      seg.repeats || '-',
      formatDurationLabel(seg.restDuration),
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
  const locale = getExportLocale(data)
  const labels = CARDIO_LABELS[locale]
  const dateLocale = getDateLocale(locale)
  const segments = normalizeCardioExportSegments(data.segments)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const margin = 15
  let y = 20

  const { totalDuration, totalDistance, avgZone } = getCardioExportTotals(segments)

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
  pdf.text(`${labels.intensity}: ${formatIntensity(data, locale)}`, margin, y)
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

  // Summary box
  pdf.setTextColor(0, 0, 0)
  pdf.setFillColor(245, 245, 245)
  pdf.roundedRect(margin, y - 3, pageWidth - 2 * margin, 25, 3, 3, 'F')

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  y += 5
  pdf.text(labels.summaryTitle, margin + 5, y)
  y += 7

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  const summaryY = y
  pdf.text(`${labels.totalTime}: ${formatDurationLabel(totalDuration)}`, margin + 5, summaryY)
  pdf.text(`${labels.totalDistance}: ${formatDistanceLabel(totalDistance)}`, margin + 50, summaryY)
  pdf.text(`${labels.averageZone}: ${avgZone ? `Z${avgZone}` : '-'}`, margin + 100, summaryY)
  pdf.text(`Segment: ${segments.length}`, margin + 140, summaryY)

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
  pdf.text(labels.type, margin + 10, y)
  pdf.text(labels.time, margin + 40, y)
  pdf.text('Dist', margin + 55, y)
  pdf.text(labels.pace, margin + 72, y)
  pdf.text(labels.heartRate, margin + 92, y)
  pdf.text(labels.zone, margin + 115, y)
  pdf.text('Rep', margin + 130, y)
  pdf.text(labels.rest, margin + 145, y)
  pdf.text(locale === 'sv' ? 'Ant.' : 'Note', margin + 162, y)
  y += 8

  // Table rows
  pdf.setFont('helvetica', 'normal')
  segments.forEach((seg, idx) => {
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
    const zone = getZoneValue(seg)
    const zoneColor = zone ? zoneColors[String(zone)] || [255, 255, 255] : [255, 255, 255]
    pdf.setFillColor(zoneColor[0], zoneColor[1], zoneColor[2])
    pdf.rect(margin, y - 3, pageWidth - 2 * margin, 6, 'F')

    pdf.setTextColor(0, 0, 0)
    pdf.text(`${idx + 1}`, margin + 2, y)
    pdf.text(getSegmentLabel(seg, locale).substring(0, 12), margin + 10, y)
    pdf.text(formatDurationLabel(seg.duration), margin + 40, y)
    pdf.text(formatDistanceLabel(seg.distance), margin + 55, y)
    pdf.text(seg.pace || '-', margin + 72, y)
    pdf.text(seg.heartRate || '-', margin + 92, y)
    pdf.text(getZoneLabel(seg), margin + 115, y)
    pdf.text(seg.repeats ? `${seg.repeats}x` : '-', margin + 130, y)
    pdf.text(formatDurationLabel(seg.restDuration), margin + 145, y)
    pdf.text((seg.notes || '').substring(0, 8), margin + 162, y)
    y += 7
  })

  // Visual timeline at the bottom
  y += 10
  if (y < 250) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(labels.visualOverview, margin, y)
    y += 8

    const timelineWidth = pageWidth - 2 * margin
    let xPos = margin
    const timelineTotal = totalDuration > 0 ? totalDuration : totalDistance

    segments.forEach((seg) => {
      if (timelineTotal <= 0) return

      const timelineValue = totalDuration > 0 ? getSegmentTotalDuration(seg) : getSegmentTotalDistance(seg)
      if (timelineValue <= 0) return

      const segWidth = (timelineValue / timelineTotal) * timelineWidth
      const zone = getZoneValue(seg)
      const zoneColors: Record<string, [number, number, number]> = {
        '1': [100, 180, 100],
        '2': [80, 160, 80],
        '3': [220, 180, 50],
        '4': [230, 130, 50],
        '5': [200, 80, 80],
      }
      const color = zone ? zoneColors[String(zone)] || [150, 150, 150] : [150, 150, 150]

      pdf.setFillColor(color[0], color[1], color[2])
      pdf.rect(xPos, y, Math.max(segWidth - 1, 0.5), 15, 'F')

      // Add label if segment is wide enough
      if (segWidth > 15) {
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(7)
        pdf.text(getZoneLabel(seg), xPos + 2, y + 6)
        pdf.text(
          totalDuration > 0 ? formatDurationLabel(timelineValue) : formatDistanceLabel(timelineValue),
          xPos + 2,
          y + 11
        )
      }

      xPos += segWidth
    })

    pdf.setTextColor(0, 0, 0)
  }

  // Footer
  pdf.setFontSize(8)
  pdf.setTextColor(150, 150, 150)
  pdf.text(`${labels.generated}: ${new Date().toLocaleString(dateLocale)}`, margin, 285)
  pdf.text(`${data.organization || 'Trainomics'} - Cardio Studio`, pageWidth - margin - 50, 285)

  return pdf.output('blob')
}

/**
 * Generate filename for cardio session export
 */
export function generateCardioFilename(sessionName: string, extension: string, locale: ExportLocale = 'en'): string {
  const safeName = sessionName
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40)

  const date = new Date().toISOString().split('T')[0]
  return `${CARDIO_LABELS[locale].filenamePrefix}_${safeName}_${date}.${extension}`
}

/**
 * Download cardio session as Excel
 */
export async function downloadCardioSessionExcel(data: CardioSessionData, filename?: string): Promise<void> {
  const blob = await generateCardioSessionExcel(data)
  const finalFilename = filename || generateCardioFilename(data.sessionName, 'xlsx', getExportLocale(data))
  downloadBlob(blob, finalFilename)
}

/**
 * Download cardio session as PDF
 */
export function downloadCardioSessionPDF(data: CardioSessionData, filename?: string): void {
  const blob = generateCardioSessionPDF(data)
  const finalFilename = filename || generateCardioFilename(data.sessionName, 'pdf', getExportLocale(data))
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
