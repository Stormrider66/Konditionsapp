// lib/program-report/build-report.ts
//
// Compiles the program report consumed by ProgramReportViewer and the
// program export endpoints (/api/programs/[id]/report and /export*).

import { prisma } from '@/lib/prisma'

interface ZoneRange {
  hrRange: string
  paceRange?: string
}

export interface ProgramReport {
  programId: string
  name: string
  description: string | null
  goal: { type: string | null; race: string | null; date: string | null }
  methodology: string | null
  totalWeeks: number
  sessionsPerWeek: number
  startDate: string
  endDate: string
  trainingZones?: Record<string, ZoneRange>
  fieldTestSchedule: Array<{ testType: string; week: number; required: boolean }>
  raceSchedule: Array<{ name: string; week: number; distance: string; classification: string }>
  weeks: Array<{
    weekNumber: number
    phase: string
    focus: string | null
    days: Array<{
      date: string
      workouts: Array<{
        name: string
        type: string
        intensity: string
        duration: number | null
        description: string | null
      }>
    }>
  }>
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

function weekOf(date: Date, programStart: Date): number {
  return Math.max(1, Math.floor((date.getTime() - programStart.getTime()) / MS_PER_WEEK) + 1)
}

/** Stored Test.trainingZones rows (see lib/calculations/zones.ts) */
interface StoredZone {
  zone?: number
  hrMin?: number
  hrMax?: number
  speedMin?: number
  speedMax?: number
  paceMin?: number
  paceMax?: number
}

function mapZones(zones: unknown): Record<string, ZoneRange> | undefined {
  if (!Array.isArray(zones)) return undefined
  const result: Record<string, ZoneRange> = {}
  for (const raw of zones as StoredZone[]) {
    if (!raw || typeof raw.zone !== 'number') continue
    const entry: ZoneRange = {
      hrRange:
        raw.hrMin != null && raw.hrMax != null ? `${raw.hrMin}-${raw.hrMax} bpm` : 'N/A',
    }
    if (raw.paceMin != null && raw.paceMax != null) {
      entry.paceRange = `${raw.paceMin}-${raw.paceMax} min/km`
    } else if (raw.speedMin != null && raw.speedMax != null) {
      entry.paceRange = `${raw.speedMin}-${raw.speedMax} km/h`
    }
    result[`zone${raw.zone}`] = entry
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/** Returns null when the program does not exist. */
export async function buildProgramReport(programId: string): Promise<
  | { report: ProgramReport; clientId: string }
  | null
> {
  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId },
    select: {
      id: true,
      clientId: true,
      name: true,
      description: true,
      goalRace: true,
      goalDate: true,
      goalType: true,
      startDate: true,
      endDate: true,
      planningMetadata: true,
      test: { select: { trainingZones: true } },
      weeks: {
        orderBy: { weekNumber: 'asc' },
        select: {
          weekNumber: true,
          phase: true,
          focus: true,
          days: {
            orderBy: { dayNumber: 'asc' },
            select: {
              date: true,
              workouts: {
                where: { status: { not: 'CANCELLED' } },
                select: {
                  name: true,
                  type: true,
                  intensity: true,
                  duration: true,
                  description: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!program) return null

  const [fieldTests, races, latestTest] = await Promise.all([
    prisma.fieldTestSchedule.findMany({
      where: {
        clientId: program.clientId,
        scheduledDate: { gte: program.startDate, lte: program.endDate },
      },
      orderBy: { scheduledDate: 'asc' },
      select: { testType: true, scheduledDate: true, required: true },
    }),
    prisma.race.findMany({
      where: {
        clientId: program.clientId,
        date: { gte: program.startDate, lte: program.endDate },
      },
      orderBy: { date: 'asc' },
      select: { name: true, date: true, distance: true, classification: true },
    }),
    // Zones from the program's linked test, falling back to the latest test
    program.test
      ? Promise.resolve(null)
      : prisma.test.findFirst({
          where: { clientId: program.clientId, trainingZones: { not: undefined } },
          orderBy: { testDate: 'desc' },
          select: { trainingZones: true },
        }),
  ])

  const totalWorkouts = program.weeks.reduce(
    (sum, w) => sum + w.days.reduce((daySum, d) => daySum + d.workouts.length, 0),
    0
  )
  const totalWeeks = program.weeks.length
  const planningMeta = (program.planningMetadata ?? {}) as Record<string, unknown>

  const report: ProgramReport = {
    programId: program.id,
    name: program.name,
    description: program.description,
    goal: {
      type: program.goalType,
      race: program.goalRace,
      date: program.goalDate?.toISOString() ?? null,
    },
    methodology:
      typeof planningMeta.methodology === 'string' ? planningMeta.methodology : null,
    totalWeeks,
    sessionsPerWeek: totalWeeks > 0 ? Math.round(totalWorkouts / totalWeeks) : 0,
    startDate: program.startDate.toISOString(),
    endDate: program.endDate.toISOString(),
    trainingZones: mapZones(program.test?.trainingZones ?? latestTest?.trainingZones),
    fieldTestSchedule: fieldTests.map(ft => ({
      testType: ft.testType,
      week: weekOf(ft.scheduledDate, program.startDate),
      required: ft.required,
    })),
    raceSchedule: races.map(r => ({
      name: r.name,
      week: weekOf(r.date, program.startDate),
      distance: r.distance,
      classification: r.classification,
    })),
    weeks: program.weeks.map(w => ({
      weekNumber: w.weekNumber,
      phase: String(w.phase),
      focus: w.focus,
      days: w.days
        .filter(d => d.workouts.length > 0)
        .map(d => ({
          date: d.date.toISOString(),
          workouts: d.workouts.map(workout => ({
            name: workout.name,
            type: String(workout.type),
            intensity: String(workout.intensity),
            duration: workout.duration,
            description: workout.description,
          })),
        })),
    })),
  }

  return { report, clientId: program.clientId }
}
