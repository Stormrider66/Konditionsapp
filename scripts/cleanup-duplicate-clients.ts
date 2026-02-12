/**
 * Cleanup script: Find and merge duplicate Client records
 *
 * Finds clients with the same (userId, email), moves data from the orphan
 * (without athleteAccount) to the keeper (with athleteAccount), then deletes the orphan.
 *
 * Usage: npx tsx scripts/cleanup-duplicate-clients.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

async function main() {
  if (dryRun) {
    console.log('=== DRY RUN MODE (no changes will be made) ===\n')
  }

  // Find all clients grouped by (userId, email) where email is not null
  const duplicates = await prisma.$queryRaw<
    { userId: string; email: string; count: bigint }[]
  >`
    SELECT "userId", "email", COUNT(*) as count
    FROM "Client"
    WHERE "email" IS NOT NULL
    GROUP BY "userId", "email"
    HAVING COUNT(*) > 1
  `

  if (duplicates.length === 0) {
    console.log('No duplicate clients found.')
    return
  }

  console.log(`Found ${duplicates.length} duplicate group(s):\n`)

  let totalMerged = 0

  for (const dup of duplicates) {
    const clients = await prisma.client.findMany({
      where: { userId: dup.userId, email: dup.email },
      include: {
        athleteAccount: { select: { id: true } },
        _count: {
          select: {
            tests: true,
            trainingPrograms: true,
            dailyMetrics: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    console.log(`--- ${dup.email} (${Number(dup.count)} records) ---`)

    const withAccount = clients.filter(c => c.athleteAccount)
    const withoutAccount = clients.filter(c => !c.athleteAccount)

    for (const c of clients) {
      const hasData = c._count.tests > 0 || c._count.trainingPrograms > 0 || c._count.dailyMetrics > 0
      console.log(
        `  ${c.id} | ${c.name} | account: ${c.athleteAccount ? 'YES' : 'NO'} | ` +
        `tests: ${c._count.tests}, programs: ${c._count.trainingPrograms}, metrics: ${c._count.dailyMetrics}` +
        `${hasData ? ' [HAS DATA]' : ''}`
      )
    }

    if (withAccount.length !== 1) {
      console.log('  ⚠ Expected exactly 1 record with athlete account - skipping (manual review needed)')
      continue
    }

    const keeper = withAccount[0]

    for (const orphan of withoutAccount) {
      const orphanId = orphan.id
      const keeperId = keeper.id

      if (dryRun) {
        console.log(`  → Would merge ${orphanId} into ${keeperId} and delete orphan`)
        console.log(`    Moving: ${orphan._count.tests} tests, ${orphan._count.trainingPrograms} programs, ${orphan._count.dailyMetrics} metrics`)
      } else {
        await prisma.$transaction(async (tx) => {
          // Move tests
          if (orphan._count.tests > 0) {
            await tx.test.updateMany({
              where: { clientId: orphanId },
              data: { clientId: keeperId },
            })
            console.log(`    ✓ Moved ${orphan._count.tests} test(s)`)
          }

          // Move training programs
          if (orphan._count.trainingPrograms > 0) {
            await tx.trainingProgram.updateMany({
              where: { clientId: orphanId },
              data: { clientId: keeperId },
            })
            console.log(`    ✓ Moved ${orphan._count.trainingPrograms} program(s)`)
          }

          // Move daily metrics (skip duplicates by date)
          if (orphan._count.dailyMetrics > 0) {
            // Get existing metric dates for keeper to avoid conflicts
            const keeperMetrics = await tx.dailyMetrics.findMany({
              where: { clientId: keeperId },
              select: { date: true },
            })
            const keeperDates = new Set(keeperMetrics.map(m => m.date.toISOString()))

            const orphanMetrics = await tx.dailyMetrics.findMany({
              where: { clientId: orphanId },
            })

            let moved = 0
            let skipped = 0
            for (const metric of orphanMetrics) {
              if (keeperDates.has(metric.date.toISOString())) {
                // Delete duplicate metric from orphan
                await tx.dailyMetrics.delete({ where: { id: metric.id } })
                skipped++
              } else {
                await tx.dailyMetrics.update({
                  where: { id: metric.id },
                  data: { clientId: keeperId },
                })
                moved++
              }
            }
            console.log(`    ✓ Moved ${moved} metric(s), skipped ${skipped} duplicate(s)`)
          }

          // Delete the orphan client
          await tx.client.delete({ where: { id: orphanId } })
          console.log(`  ✓ Deleted orphan: ${orphanId} (${orphan.name})`)
        })
      }
      totalMerged++
    }
  }

  console.log(`\n${dryRun ? 'Would merge+delete' : 'Merged+deleted'} ${totalMerged} duplicate client(s).`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
