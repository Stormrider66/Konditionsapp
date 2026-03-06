import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import {
  ATHLETE_DATA_HEALTH_ISSUE_CODES,
  auditAthleteDataHealth,
  repairAthleteDataHealth,
  type AthleteDataHealthIssueCode,
} from '@/lib/data-health/athlete-integrity'

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue

    const idx = line.indexOf('=')
    if (idx === -1) continue

    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function parseArgValue(flag: string): string | null {
  const arg = process.argv.find(value => value.startsWith(`${flag}=`))
  return arg ? arg.slice(flag.length + 1) : null
}

function parseLimit(): number | undefined {
  const raw = parseArgValue('--limit')
  if (!raw) return undefined

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseIssueCodes(): AthleteDataHealthIssueCode[] | undefined {
  const raw = parseArgValue('--codes')
  if (!raw) return undefined

  const values = raw
    .split(',')
    .map(value => value.trim())
    .filter((value): value is AthleteDataHealthIssueCode =>
      ATHLETE_DATA_HEALTH_ISSUE_CODES.includes(value as AthleteDataHealthIssueCode)
    )

  return values.length > 0 ? values : undefined
}

function printSummary(title: string, summary: {
  scannedUsers: number
  totalIssues: number
  fixableIssues?: number
  byCode: Record<string, number>
}) {
  console.log(`\n${title}`)
  console.log(`- scannedUsers: ${summary.scannedUsers}`)
  console.log(`- totalIssues: ${summary.totalIssues}`)
  if (typeof summary.fixableIssues === 'number') {
    console.log(`- fixableIssues: ${summary.fixableIssues}`)
  }

  for (const [code, count] of Object.entries(summary.byCode)) {
    if (count > 0) {
      console.log(`  - ${code}: ${count}`)
    }
  }
}

async function main() {
  loadEnvLocal()

  const apply = hasFlag('--apply')
  const limit = parseLimit()
  const issueCodes = parseIssueCodes()
  const outputPath = parseArgValue('--out')

  const report = await auditAthleteDataHealth({ limit })
  printSummary('Athlete integrity audit', report.summary)

  const payload: Record<string, unknown> = { report }

  if (apply) {
    const repairResult = await repairAthleteDataHealth({ limit, issueCodes })
    payload.repairResult = repairResult

    console.log('\nApplied repairs')
    console.log(`- targetedIssueCount: ${repairResult.targetedIssueCount}`)
    console.log(`- repairedCount: ${repairResult.repairedCount}`)
    console.log(`- failedCount: ${repairResult.failedCount}`)

    for (const repair of repairResult.repairs) {
      console.log(
        `  - [${repair.status}] ${repair.key} :: ${repair.issueCodes.join(', ')} :: ${repair.message}`
      )
    }

    printSummary('Post-repair audit', repairResult.reportAfter.summary)
  } else {
    console.log('\nDry run only. Re-run with --apply to repair fixable issues.')
  }

  if (outputPath) {
    const resolvedPath = path.resolve(process.cwd(), outputPath)
    fs.writeFileSync(resolvedPath, JSON.stringify(payload, null, 2), 'utf8')
    console.log(`\nWrote report to ${resolvedPath}`)
  }
}

main()
  .catch((error) => {
    console.error('Athlete integrity audit failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
