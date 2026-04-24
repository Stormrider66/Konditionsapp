/**
 * Cleanup script: Remove orphan SCHEDULED_WORKOUT calendar events.
 *
 * Before commit 1c7d6d8f, deleting a StrengthSession / CardioSession /
 * AgilityWorkout / HybridWorkout from the library cascade-deleted its
 * assignment rows but left the linked CalendarEvent rows behind — so
 * athletes' calendars still showed pills like "Styrka: ..." pointing at
 * sessions that no longer existed.
 *
 * This script finds every CalendarEvent with type=SCHEDULED_WORKOUT whose
 * id is NOT referenced by any of the four assignment tables' calendarEventId
 * column, and deletes it.
 *
 * Safety:
 * - Dry-run by default; pass --execute to actually delete.
 * - Only touches rows with type=SCHEDULED_WORKOUT. Manual calendar events,
 *   races, field tests, notes, etc. are left alone.
 * - All SCHEDULED_WORKOUT events are created by the four assign routes
 *   (verified 2026-04-24), so a row with no back-reference is definitively
 *   an orphan from a deleted session.
 *
 * Usage:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs)
 *   npx tsx scripts/cleanup-orphan-workout-calendar-events.ts            # dry-run
 *   npx tsx scripts/cleanup-orphan-workout-calendar-events.ts --execute  # actually delete
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const execute = process.argv.includes('--execute')

async function main() {
  console.log(
    execute
      ? '=== EXECUTE MODE — orphan calendar events will be deleted ==='
      : '=== DRY RUN — pass --execute to actually delete ==='
  )
  console.log()

  const scheduled = await prisma.calendarEvent.findMany({
    where: { type: 'SCHEDULED_WORKOUT' },
    select: {
      id: true,
      title: true,
      startDate: true,
      clientId: true,
    },
    orderBy: { startDate: 'asc' },
  })
  console.log(`Found ${scheduled.length} SCHEDULED_WORKOUT calendar events.`)

  const [strengthRefs, cardioRefs, agilityRefs, hybridRefs] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({
      where: { calendarEventId: { not: null } },
      select: { calendarEventId: true },
    }),
    prisma.cardioSessionAssignment.findMany({
      where: { calendarEventId: { not: null } },
      select: { calendarEventId: true },
    }),
    prisma.agilityWorkoutAssignment.findMany({
      where: { calendarEventId: { not: null } },
      select: { calendarEventId: true },
    }),
    prisma.hybridWorkoutAssignment.findMany({
      where: { calendarEventId: { not: null } },
      select: { calendarEventId: true },
    }),
  ])

  const referenced = new Set<string>()
  for (const r of strengthRefs) if (r.calendarEventId) referenced.add(r.calendarEventId)
  for (const r of cardioRefs) if (r.calendarEventId) referenced.add(r.calendarEventId)
  for (const r of agilityRefs) if (r.calendarEventId) referenced.add(r.calendarEventId)
  for (const r of hybridRefs) if (r.calendarEventId) referenced.add(r.calendarEventId)
  console.log(
    `Referenced by assignments: strength=${strengthRefs.length}, cardio=${cardioRefs.length}, agility=${agilityRefs.length}, hybrid=${hybridRefs.length}. Distinct referenced ids: ${referenced.size}.`
  )
  console.log()

  const orphans = scheduled.filter((e) => !referenced.has(e.id))
  console.log(`Orphans to remove: ${orphans.length}`)
  if (orphans.length === 0) {
    console.log('Nothing to do.')
    return
  }

  console.log()
  console.log('First 20 orphans:')
  for (const o of orphans.slice(0, 20)) {
    const date = o.startDate.toISOString().slice(0, 10)
    console.log(`  [${date}] client=${o.clientId}  title="${o.title}"  id=${o.id}`)
  }
  if (orphans.length > 20) {
    console.log(`  ... and ${orphans.length - 20} more`)
  }

  if (!execute) {
    console.log()
    console.log('Dry run — no changes made. Re-run with --execute to delete.')
    return
  }

  const orphanIds = orphans.map((o) => o.id)
  const result = await prisma.calendarEvent.deleteMany({
    where: { id: { in: orphanIds } },
  })
  console.log()
  console.log(`Deleted ${result.count} orphan calendar events.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
