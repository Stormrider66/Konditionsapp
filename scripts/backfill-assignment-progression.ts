/**
 * Backfill ProgressionTracking from existing StrengthSessionAssignment SetLogs.
 *
 * Strength logged via session assignments never produced the aggregate
 * ProgressionTracking records the dashboards read (the focus-mode completion
 * hook now does this going forward; this catches historical data).
 *
 * Idempotent (skips an exercise that already has a record for the day) and
 * ADDITIVE ONLY — never deletes or modifies existing ProgressionTracking.
 * Processes assignments oldest-first so 2-for-2 / plateau history builds up.
 *
 * Usage (loads env per CLAUDE.md):
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && \
 *     npx tsx scripts/backfill-assignment-progression.ts            # dry run
 *     npx tsx scripts/backfill-assignment-progression.ts --commit   # write
 */

import { prisma } from '@/lib/prisma'
import { rollupAssignmentProgression } from '@/lib/training-engine/progression/assignment-rollup'

const COMMIT = process.argv.includes('--commit')

async function main() {
  const withSets = await prisma.setLog.findMany({
    where: { assignmentId: { not: null } },
    select: { assignmentId: true },
    distinct: ['assignmentId'],
  })
  const ids = withSets.map((s) => s.assignmentId).filter((x): x is string => !!x)

  const assignments = await prisma.strengthSessionAssignment.findMany({
    where: { id: { in: ids } },
    select: { id: true, athleteId: true, assignedDate: true, status: true },
    orderBy: [{ assignedDate: 'asc' }],
  })

  const before = await prisma.progressionTracking.count()
  console.log(`Assignments with logged sets: ${assignments.length}`)
  console.log(`ProgressionTracking rows before: ${before}`)
  console.log(COMMIT ? '\nCOMMIT — writing ProgressionTracking…\n' : '\nDRY RUN — pass --commit to write.\n')

  if (!COMMIT) {
    const distinctClients = new Set(assignments.map((a) => a.athleteId))
    console.log(`Would process ${assignments.length} assignments across ${distinctClients.size} athletes.`)
    return
  }

  const prBefore = await prisma.oneRepMaxHistory.count()
  let created = 0
  let skipped = 0
  let prs = 0
  for (const a of assignments) {
    const res = await rollupAssignmentProgression(a.id)
    created += res.created
    skipped += res.skipped
    prs += res.prs
    if (res.created > 0 || res.prs > 0) {
      console.log(`  ${a.id} client=${a.athleteId.slice(0, 8)}… ${a.assignedDate.toISOString().slice(0, 10)} ${a.status}: +${res.created} progression, +${res.prs} PRs (skipped ${res.skipped})`)
    }
  }

  const after = await prisma.progressionTracking.count()
  const prAfter = await prisma.oneRepMaxHistory.count()
  console.log(`\nDone. progression created=${created}, PRs=${prs}, skipped=${skipped}.`)
  console.log(`ProgressionTracking: ${before} → ${after} | OneRepMaxHistory: ${prBefore} → ${prAfter}`)
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
