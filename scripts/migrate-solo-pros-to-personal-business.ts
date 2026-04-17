/**
 * Provision a personal Business for every COACH/PHYSIO who doesn't have
 * an active BusinessMember. Phase 8 prerequisite — after this runs,
 * every coach and physio can use a /{slug}/{portal}/... URL, so the
 * legacy /coach/** and /physio/** pages can be deleted.
 *
 * Usage:
 *   npm run migrate:solo-pros             # dry-run (report only)
 *   npm run migrate:solo-pros -- --apply  # actually create the businesses
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
  const { createPersonalBusinessTx } = await import('@/lib/personal-business')
  const prisma = new PrismaClient()

  try {
    const solos = await prisma.user.findMany({
      where: {
        role: { in: ['COACH', 'PHYSIO'] },
        businessMemberships: { none: { isActive: true } },
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    console.log(`Solo COACH/PHYSIO users: ${solos.length}`)
    if (solos.length === 0) {
      console.log('Nothing to migrate.')
      return
    }

    for (const u of solos) {
      console.log(`  ${u.role.padEnd(6)} ${u.email.padEnd(40)} ${u.name}`)
    }

    if (!apply) {
      console.log('\nDry-run only. Re-run with -- --apply to provision personal businesses.')
      return
    }

    console.log('\nApplying...')
    let ok = 0
    let failed = 0
    for (const u of solos) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          return createPersonalBusinessTx(tx, {
            userId: u.id,
            userName: u.name,
            role: u.role as 'COACH' | 'PHYSIO',
          })
        })
        ok++
        console.log(`  ✓ ${u.email} → /${result.slug} (${result.created ? 'created' : 'existing'})`)
      } catch (err) {
        failed++
        console.error(`  ✖ ${u.email}: ${(err as Error).message}`)
      }
    }
    console.log(`\nDone. created=${ok} failed=${failed}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
