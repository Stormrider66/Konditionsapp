#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue
    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key && !process.env[key]) process.env[key] = value
  }
}

function intEnv(name, fallback) {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function thresholdsFromEnv() {
  return {
    maxPending: intEnv('DAILY_METRICS_BACKLOG_MAX_PENDING', 50),
    maxFailed: intEnv('DAILY_METRICS_BACKLOG_MAX_FAILED', 10),
    maxStaleProcessing: intEnv('DAILY_METRICS_BACKLOG_MAX_STALE_PROCESSING', 0),
    maxOldestPendingMinutes: intEnv('DAILY_METRICS_BACKLOG_MAX_OLDEST_PENDING_MINUTES', 10),
    staleProcessingMinutes: intEnv('DAILY_METRICS_BACKLOG_STALE_PROCESSING_MINUTES', 5),
  }
}

function minutesSince(dateLike, now = new Date()) {
  if (!dateLike) return null
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000))
}

function evaluateBacklog(snapshot, thresholds, now = new Date()) {
  const pending = snapshot.counts.PENDING || 0
  const failed = snapshot.counts.FAILED || 0
  const staleProcessing = snapshot.staleProcessing || 0
  const oldestPendingMinutes = minutesSince(snapshot.oldestPendingRunAfter, now)
  const failures = []
  const warnings = []

  if (pending > thresholds.maxPending) {
    failures.push(`pending jobs ${pending} > ${thresholds.maxPending}`)
  }
  if (failed > thresholds.maxFailed) {
    failures.push(`failed jobs ${failed} > ${thresholds.maxFailed}`)
  }
  if (staleProcessing > thresholds.maxStaleProcessing) {
    failures.push(`stale processing jobs ${staleProcessing} > ${thresholds.maxStaleProcessing}`)
  }
  if (
    oldestPendingMinutes !== null &&
    oldestPendingMinutes > thresholds.maxOldestPendingMinutes
  ) {
    failures.push(
      `oldest pending job age ${oldestPendingMinutes}m > ${thresholds.maxOldestPendingMinutes}m`
    )
  }
  if ((snapshot.recentFailed || 0) > 0) {
    warnings.push(`recent failed jobs in last hour: ${snapshot.recentFailed}`)
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    oldestPendingMinutes,
  }
}

async function collectBacklogSnapshot(prisma, thresholds, now = new Date()) {
  const staleProcessingCutoff = new Date(now.getTime() - thresholds.staleProcessingMinutes * 60000)
  const recentFailureCutoff = new Date(now.getTime() - 60 * 60000)
  const [grouped, oldestPending, staleProcessing, recentFailed] = await Promise.all([
    prisma.dailyMetricsProcessingJob.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.dailyMetricsProcessingJob.findFirst({
      where: {
        status: 'PENDING',
        runAfter: { lte: now },
      },
      orderBy: { runAfter: 'asc' },
      select: { runAfter: true },
    }),
    prisma.dailyMetricsProcessingJob.count({
      where: {
        status: 'PROCESSING',
        lockedAt: { lt: staleProcessingCutoff },
      },
    }),
    prisma.dailyMetricsProcessingJob.count({
      where: {
        status: 'FAILED',
        updatedAt: { gte: recentFailureCutoff },
      },
    }),
  ])

  return {
    counts: Object.fromEntries(grouped.map((row) => [row.status, row._count.status])),
    oldestPendingRunAfter: oldestPending?.runAfter ?? null,
    staleProcessing,
    recentFailed,
  }
}

function printReport(snapshot, thresholds, evaluation) {
  console.log('Daily metrics backlog check')
  console.log(`Pending jobs: ${snapshot.counts.PENDING || 0} (max ${thresholds.maxPending})`)
  console.log(`Processing jobs: ${snapshot.counts.PROCESSING || 0}`)
  console.log(`Failed jobs: ${snapshot.counts.FAILED || 0} (max ${thresholds.maxFailed})`)
  console.log(`Completed jobs: ${snapshot.counts.COMPLETED || 0}`)
  console.log(
    `Stale processing jobs: ${snapshot.staleProcessing || 0} (max ${thresholds.maxStaleProcessing})`
  )
  console.log(
    `Oldest pending age: ${
      evaluation.oldestPendingMinutes === null ? '-' : `${evaluation.oldestPendingMinutes}m`
    } (max ${thresholds.maxOldestPendingMinutes}m)`
  )

  for (const warning of evaluation.warnings) {
    console.warn(`Warning: ${warning}`)
  }
  if (evaluation.ok) {
    console.log('Daily metrics backlog check passed.')
  } else {
    console.error('Daily metrics backlog check failed:')
    for (const failure of evaluation.failures) console.error(`- ${failure}`)
  }
}

async function main() {
  loadLocalEnv()
  const thresholds = thresholdsFromEnv()
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const now = new Date()
    const snapshot = await collectBacklogSnapshot(prisma, thresholds, now)
    const evaluation = evaluateBacklog(snapshot, thresholds, now)
    printReport(snapshot, thresholds, evaluation)
    if (!evaluation.ok) process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}

module.exports = {
  evaluateBacklog,
  minutesSince,
  thresholdsFromEnv,
}
