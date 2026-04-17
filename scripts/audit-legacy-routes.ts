/**
 * Audit: every legacy route under app/{coach,athlete,physio}/ should have
 * a matching business-scoped equivalent under
 * app/(business)/[businessSlug]/{portal}/...
 *
 * Used by Phase 8 (legacy route deletion) to make sure no URL loses its
 * destination. Any unpaired legacy page stops the phase for manual review.
 *
 * Usage:  npm run audit:legacy-routes
 *         npm run audit:legacy-routes -- --json
 */

import fs from 'fs'
import path from 'path'

const APP = path.join(process.cwd(), 'app')
const BUSINESS = path.join(APP, '(business)', '[businessSlug]')
const PORTALS = ['coach', 'athlete', 'physio'] as const

interface Finding {
  portal: string
  legacyPath: string
  businessPath: string
  present: boolean
}

function listPages(dir: string): string[] {
  const out: string[] = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listPages(full))
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      out.push(full)
    }
  }
  return out
}

function main() {
  const json = process.argv.includes('--json')
  const findings: Finding[] = []

  for (const portal of PORTALS) {
    const legacyRoot = path.join(APP, portal)
    const businessRoot = path.join(BUSINESS, portal)
    for (const legacyFile of listPages(legacyRoot)) {
      // Map to expected business path.
      const rel = path.relative(legacyRoot, legacyFile)
      const businessFile = path.join(businessRoot, rel)
      findings.push({
        portal,
        legacyPath: path.relative(APP, legacyFile),
        businessPath: path.relative(APP, businessFile),
        present: fs.existsSync(businessFile),
      })
    }
  }

  const missing = findings.filter((f) => !f.present)

  if (json) {
    console.log(JSON.stringify({
      totalLegacy: findings.length,
      totalPaired: findings.length - missing.length,
      missing,
    }, null, 2))
  } else {
    console.log('Legacy ↔ Business route audit')
    console.log('─'.repeat(60))
    console.log(`Legacy pages:     ${findings.length}`)
    console.log(`Paired:           ${findings.length - missing.length}`)
    console.log(`Missing business: ${missing.length}`)
    if (missing.length > 0) {
      console.log('\n✖ Unpaired legacy routes (no business-scoped equivalent):')
      for (const m of missing) {
        console.log(`  - ${m.legacyPath}`)
      }
      console.log('\nDelete these legacy pages manually or add a business-scoped equivalent before proceeding.')
    } else {
      console.log('\n✓ Every legacy route has a business-scoped equivalent.')
    }
  }

  if (missing.length > 0) process.exit(1)
}

main()
