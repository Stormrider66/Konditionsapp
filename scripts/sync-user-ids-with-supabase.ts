/**
 * Report (or fix) drift between public."User".id and auth.users.id.
 *
 * Legacy users created before the Supabase Auth integration have their
 * public User.id generated independently of the Supabase Auth id. The
 * Phase 4 middleware falls back from JWT claims → DB email lookup for
 * these users, which works but costs one extra query per request. This
 * script surfaces the mismatch so the ids can be reconciled.
 *
 * Usage:
 *   npm run sync:user-ids            # report-only (safe)
 *   npm run sync:user-ids -- --apply # rewrite public User.id to match
 *                                    # auth.users.id (transactional,
 *                                    # one user at a time)
 *
 * ⚠ --apply updates User.id for every mismatch. The FK constraints on
 * dependent tables (Client, AthleteAccount, BusinessMember, …) should
 * cascade on update because they're defined with ON UPDATE CASCADE —
 * verify with `\d+ "Client"` before running.
 */

import fs from 'fs'
import path from 'path'

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

async function main() {
  loadEnvLocal()

  const apply = process.argv.includes('--apply')
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const mismatches = await prisma.$queryRaw<
      Array<{ db_id: string; auth_id: string; email: string }>
    >`
      SELECT u.id AS db_id, au.id::text AS auth_id, u.email
        FROM public."User" u
        JOIN auth.users au ON lower(au.email) = lower(u.email)
       WHERE u.id <> au.id::text
       ORDER BY u."createdAt" ASC NULLS LAST
    `

    console.log(`Found ${mismatches.length} user(s) whose User.id drifted from auth.users.id.`)
    for (const row of mismatches.slice(0, 20)) {
      console.log(`  ${row.email}  db=${row.db_id}  auth=${row.auth_id}`)
    }
    if (mismatches.length > 20) {
      console.log(`  … and ${mismatches.length - 20} more (truncated)`)
    }

    if (!apply) {
      console.log('\nReport-only mode. Re-run with `-- --apply` to rewrite public User.id.')
      return
    }

    console.log('\n--apply specified. Rewriting ids transactionally …')
    let ok = 0
    let failed = 0
    for (const row of mismatches) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE public."User" SET id = $1 WHERE id = $2 AND lower(email) = lower($3)`,
          row.auth_id,
          row.db_id,
          row.email
        )
        ok++
      } catch (err) {
        failed++
        console.error(`  ✖ ${row.email}: ${(err as Error).message}`)
      }
    }
    console.log(`\nDone. updated=${ok} failed=${failed}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
