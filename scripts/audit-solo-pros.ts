/**
 * Audit: find COACH / PHYSIO users who have no active BusinessMember row.
 *
 * Used by Phase 8 to decide the size of the one-time "auto-provision a
 * personal business" migration. Report-only.
 *
 * Usage: npm run audit:solo-pros
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
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const soloCoaches = await prisma.user.findMany({
      where: {
        role: 'COACH',
        businessMemberships: { none: { isActive: true } },
      },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const soloPhysios = await prisma.user.findMany({
      where: {
        role: 'PHYSIO',
        businessMemberships: { none: { isActive: true } },
      },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    console.log('Solo COACH/PHYSIO audit')
    console.log('─'.repeat(60))
    console.log(`Solo coaches:  ${soloCoaches.length}`)
    console.log(`Solo physios:  ${soloPhysios.length}`)

    if (soloCoaches.length > 0) {
      console.log('\nSolo coaches:')
      for (const u of soloCoaches.slice(0, 30)) {
        console.log(`  ${u.email.padEnd(40)} ${u.name}  (${u.createdAt.toISOString().slice(0, 10)})`)
      }
      if (soloCoaches.length > 30) console.log(`  … +${soloCoaches.length - 30} more`)
    }
    if (soloPhysios.length > 0) {
      console.log('\nSolo physios:')
      for (const u of soloPhysios) {
        console.log(`  ${u.email.padEnd(40)} ${u.name}  (${u.createdAt.toISOString().slice(0, 10)})`)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
