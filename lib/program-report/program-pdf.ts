// lib/program-report/program-pdf.ts
//
// Server-side PDF rendering of a ProgramReport using jsPDF's programmatic
// API (no DOM needed, unlike lib/pdf-generator.ts which captures elements).

import { jsPDF } from 'jspdf'
import type { ProgramReport } from './build-report'

const MARGIN = 14
const LINE = 6
const PAGE_BOTTOM = 283

export function generateProgramPdf(report: ProgramReport): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  const ensureRoom = (needed = LINE) => {
    if (y + needed > PAGE_BOTTOM) {
      doc.addPage()
      y = MARGIN
    }
  }

  const heading = (text: string, size = 13) => {
    ensureRoom(LINE * 2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.text(text, MARGIN, y)
    y += LINE + 1
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
  }

  const line = (text: string, indent = 0) => {
    const wrapped = doc.splitTextToSize(text, 182 - indent) as string[]
    for (const part of wrapped) {
      ensureRoom()
      doc.text(part, MARGIN + indent, y)
      y += LINE
    }
  }

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(report.name, MARGIN, y)
  y += LINE + 3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const fmtDate = (iso: string) => iso.split('T')[0]
  line(`${fmtDate(report.startDate)} – ${fmtDate(report.endDate)}  •  ${report.totalWeeks} weeks  •  ~${report.sessionsPerWeek} sessions/week`)
  if (report.goal.race || report.goal.type) {
    line(`Goal: ${[report.goal.race, report.goal.type].filter(Boolean).join(' — ')}${report.goal.date ? ` (${fmtDate(report.goal.date)})` : ''}`)
  }
  if (report.methodology) line(`Methodology: ${report.methodology}`)
  if (report.description) line(report.description)
  y += 2

  // Training zones
  if (report.trainingZones) {
    heading('Training zones')
    for (const [key, zone] of Object.entries(report.trainingZones)) {
      line(`${key.replace('zone', 'Zone ')}: ${zone.hrRange}${zone.paceRange ? `  •  ${zone.paceRange}` : ''}`, 2)
    }
    y += 2
  }

  // Field tests
  if (report.fieldTestSchedule.length > 0) {
    heading('Field test schedule')
    for (const test of report.fieldTestSchedule) {
      line(`Week ${test.week}: ${test.testType}${test.required ? ' (required)' : ''}`, 2)
    }
    y += 2
  }

  // Races
  if (report.raceSchedule.length > 0) {
    heading('Race schedule')
    for (const race of report.raceSchedule) {
      line(`Week ${race.week}: ${race.name} — ${race.distance} (${race.classification}-race)`, 2)
    }
    y += 2
  }

  // Weekly plan
  heading('Weekly plan', 14)
  for (const week of report.weeks) {
    ensureRoom(LINE * 2)
    doc.setFont('helvetica', 'bold')
    line(`Week ${week.weekNumber} — ${week.phase}${week.focus ? `: ${week.focus}` : ''}`)
    doc.setFont('helvetica', 'normal')
    for (const day of week.days) {
      for (const workout of day.workouts) {
        line(
          `${fmtDate(day.date)}  ${workout.name} (${workout.type}, ${workout.intensity}${workout.duration ? `, ${workout.duration} min` : ''})`,
          4
        )
      }
    }
    y += 1
  }

  return doc.output('arraybuffer')
}
