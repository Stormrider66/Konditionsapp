import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    const rawValue = trimmed.slice(separator + 1).trim()
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}

function arg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
}

function intArg(name: string, fallback: number): number {
  const value = Number(arg(name))
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback
}

function boolArg(name: string, fallback: boolean): boolean {
  const value = arg(name)
  if (value === undefined) return fallback
  return value === 'true' || value === '1' || value === 'yes'
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

function addClientIds(target: Set<string>, rows: Array<{ clientId?: string | null; athleteId?: string | null }>) {
  for (const row of rows) {
    const id = row.clientId ?? row.athleteId
    if (id) target.add(id)
  }
}

loadEnvLocal()

const { prisma } = await import('@/lib/prisma')
const { recalculateWorkoutEvaluationsForClient } = await import('@/lib/workout-evaluation')

const days = intArg('days', 30)
const limit = intArg('limit', 500)
const deleteMissing = boolArg('deleteMissing', true)
const clientId = arg('clientId')
const teamId = arg('teamId')
const startDate = daysAgo(days)
const endDate = new Date()

async function resolveClientIds(): Promise<string[]> {
  if (clientId) return [clientId]

  if (teamId) {
    const members = await prisma.client.findMany({
      where: { teamId },
      orderBy: { name: 'asc' },
      select: { id: true },
      take: limit,
    })
    return members.map((member) => member.id)
  }

  const ids = new Set<string>()
  const [garmin, cardio, hybrid, quickErg, phoneRuns, concept2, captures] = await Promise.all([
    prisma.garminActivity.findMany({
      where: { startDate: { gte: startDate } },
      distinct: ['clientId'],
      select: { clientId: true },
      take: limit,
    }),
    prisma.cardioSessionLog.findMany({
      where: { startedAt: { gte: startDate } },
      distinct: ['athleteId'],
      select: { athleteId: true },
      take: limit,
    }),
    prisma.hybridWorkoutLog.findMany({
      where: { startedAt: { gte: startDate } },
      distinct: ['athleteId'],
      select: { athleteId: true },
      take: limit,
    }),
    prisma.quickErgSession.findMany({
      where: { startedAt: { gte: startDate } },
      distinct: ['clientId'],
      select: { clientId: true },
      take: limit,
    }),
    prisma.phoneRunSession.findMany({
      where: { startedAt: { gte: startDate } },
      distinct: ['clientId'],
      select: { clientId: true },
      take: limit,
    }),
    prisma.concept2Result.findMany({
      where: { date: { gte: startDate } },
      distinct: ['clientId'],
      select: { clientId: true },
      take: limit,
    }),
    prisma.workoutSensorCapture.findMany({
      where: { startedAt: { gte: startDate } },
      distinct: ['clientId'],
      select: { clientId: true },
      take: limit,
    }),
  ])

  addClientIds(ids, garmin)
  addClientIds(ids, cardio)
  addClientIds(ids, hybrid)
  addClientIds(ids, quickErg)
  addClientIds(ids, phoneRuns)
  addClientIds(ids, concept2)
  addClientIds(ids, captures)
  return Array.from(ids).slice(0, limit)
}

const clients = await resolveClientIds()
let rebuilt = 0
let deleted = 0
const failures: Array<{ clientId: string; error: string }> = []

for (const id of clients) {
  try {
    const result = await recalculateWorkoutEvaluationsForClient({
      clientId: id,
      startDate,
      endDate,
      deleteMissing,
    })
    rebuilt += result.rebuilt
    deleted += result.deleted
    console.log(`ok ${id}: rebuilt ${result.rebuilt}, deleted ${result.deleted}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    failures.push({ clientId: id, error: message })
    console.error(`failed ${id}: ${message}`)
  }
}

console.log(JSON.stringify({
  days,
  clients: clients.length,
  rebuilt,
  deleted,
  failures,
}, null, 2))

await prisma.$disconnect()

if (failures.length > 0) {
  process.exitCode = 1
}
