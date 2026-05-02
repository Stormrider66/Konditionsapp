/**
 * Audit: every coach-owned legacy route should have a matching business-scoped
 * equivalent under app/(business)/[businessSlug]/...
 *
 * app/athlete/** is intentionally excluded. Solo registered athletes without a
 * business still use those routes.
 *
 * Used by the legacy route cleanup to make sure no coach/PT/physio URL loses
 * its destination before old route files are deleted.
 *
 * Usage:  npm run audit:legacy-routes
 *         npm run audit:legacy-routes -- --json
 */

import fs from 'fs'
import path from 'path'

const APP = path.join(process.cwd(), 'app')
const BUSINESS = path.join(APP, '(business)', '[businessSlug]')

const LEGACY_ROUTE_GROUPS = [
  {
    group: 'coach',
    legacyRoot: path.join(APP, 'coach'),
    businessRoot: path.join(BUSINESS, 'coach'),
  },
  {
    group: 'physio',
    legacyRoot: path.join(APP, 'physio'),
    businessRoot: path.join(BUSINESS, 'physio'),
  },
  {
    group: 'clients',
    legacyRoot: path.join(APP, 'clients'),
    businessRoot: path.join(BUSINESS, 'coach', 'clients'),
  },
  {
    group: 'teams',
    legacyRoot: path.join(APP, 'teams'),
    businessRoot: path.join(BUSINESS, 'coach', 'teams'),
  },
  {
    group: 'programs',
    legacyRoot: path.join(APP, 'programs'),
    businessRoot: path.join(BUSINESS, 'coach', 'programs'),
  },
  {
    group: 'tests',
    legacyRoot: path.join(APP, 'tests'),
    businessRoot: path.join(BUSINESS, 'coach', 'tests'),
  },
  {
    group: 'test',
    legacyRoot: path.join(APP, 'test'),
    businessRoot: path.join(BUSINESS, 'coach', 'test'),
  },
] as const

interface Finding {
  group: string
  legacyPath: string
  businessPath: string
  present: boolean
}

interface ImportFinding {
  file: string
  importPath: string
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

function listSourceFiles(dir: string): string[] {
  const out: string[] = []
  if (!fs.existsSync(dir)) return out

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full))
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(full)
    }
  }

  return out
}

function normalizeDynamicSegments(relativePath: string): string {
  return relativePath
    .split(path.sep)
    .map((segment) => (/^\[[^/]+\]$/.test(segment) ? '[]' : segment))
    .join('/')
}

function findForbiddenAppImports(): ImportFinding[] {
  const roots = [
    path.join(APP, '(business)'),
    path.join(process.cwd(), 'components'),
  ]
  const forbiddenImportPattern = /@\/app\/(coach|clients|teams|physio)(?:\/[^'"\s]*)?/g
  const findings: ImportFinding[] = []

  for (const file of roots.flatMap(listSourceFiles)) {
    const source = fs.readFileSync(file, 'utf8')
    const matches = source.matchAll(forbiddenImportPattern)
    for (const match of matches) {
      findings.push({
        file: path.relative(process.cwd(), file),
        importPath: match[0],
      })
    }
  }

  return findings
}

function main() {
  const json = process.argv.includes('--json')
  const findings: Finding[] = []

  for (const routeGroup of LEGACY_ROUTE_GROUPS) {
    const businessPages = listPages(routeGroup.businessRoot)
    const normalizedBusinessPages = new Set(
      businessPages.map((file) =>
        normalizeDynamicSegments(path.relative(routeGroup.businessRoot, file))
      )
    )

    for (const legacyFile of listPages(routeGroup.legacyRoot)) {
      const rel = path.relative(routeGroup.legacyRoot, legacyFile)
      const businessFile = path.join(routeGroup.businessRoot, rel)
      const present =
        fs.existsSync(businessFile) ||
        normalizedBusinessPages.has(normalizeDynamicSegments(rel))

      findings.push({
        group: routeGroup.group,
        legacyPath: path.relative(APP, legacyFile),
        businessPath: path.relative(APP, businessFile),
        present,
      })
    }
  }

  const missing = findings.filter((f) => !f.present)
  const forbiddenImports = findForbiddenAppImports()
  const hasFailures = missing.length > 0 || forbiddenImports.length > 0

  if (json) {
    console.log(JSON.stringify({
      totalLegacy: findings.length,
      totalPaired: findings.length - missing.length,
      missing,
      forbiddenImports,
    }, null, 2))
  } else {
    console.log('Legacy ↔ Business route audit')
    console.log('─'.repeat(60))
    console.log('Scope:            coach-owned legacy routes (app/athlete is excluded)')
    console.log(`Legacy pages:     ${findings.length}`)
    console.log(`Paired:           ${findings.length - missing.length}`)
    console.log(`Missing business: ${missing.length}`)
    console.log(`Forbidden imports: ${forbiddenImports.length}`)
    if (missing.length > 0) {
      console.log('\n✖ Unpaired legacy routes (no business-scoped equivalent):')
      for (const m of missing) {
        console.log(`  - ${m.legacyPath}`)
      }
      console.log('\nDelete these legacy pages manually or add a business-scoped equivalent before proceeding.')
    }
    if (forbiddenImports.length > 0) {
      console.log('\n✖ Business/components import legacy app routes:')
      for (const finding of forbiddenImports) {
        console.log(`  - ${finding.file}: ${finding.importPath}`)
      }
      console.log('\nMove shared implementations to components/ or business-scoped routes before proceeding.')
    }
    if (!hasFailures) {
      console.log('\n✓ Every legacy route has a business-scoped equivalent.')
      console.log('✓ No business/components code imports legacy app route implementations.')
    }
  }

  if (hasFailures) process.exit(1)
}

main()
