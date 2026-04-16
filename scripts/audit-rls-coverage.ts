/**
 * RLS coverage audit.
 *
 * Compares the set of Prisma models in prisma/schema/ against the
 * Postgres tables that currently have Row Level Security enabled
 * (`pg_class.relrowsecurity = true`) and prints the gap.
 *
 * The script also parses each model's scalar fields to suggest an ownership
 * column (userId / coachId / clientId / businessId / athleteId) — useful
 * input for the Phase 2 migration.
 *
 * Usage:
 *   npm run audit:rls-coverage
 *   npm run audit:rls-coverage -- --json       # machine-readable output
 *   npm run audit:rls-coverage -- --enforce    # exit 1 if gaps exist (live DB)
 *   npm run audit:rls-coverage -- --check-allowlist
 *                                              # no DB — diff schema against
 *                                              # scripts/rls-covered-models.txt
 *                                              # (CI mode: fails when a new
 *                                              # model is added without being
 *                                              # added to the allowlist)
 *
 * Requires .env.local with DIRECT_DATABASE_URL (or DATABASE_URL) — unless
 * running in --check-allowlist mode, which is offline.
 */

import fs from 'fs'
import path from 'path'

// ── env loader ──────────────────────────────────────────────────────

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

// ── schema parser ───────────────────────────────────────────────────

type ModelInfo = {
  name: string
  fields: string[]
}

const OWNERSHIP_CANDIDATES = [
  'userId',
  'coachId',
  'athleteId',
  'clientId',
  'businessId',
  'ownerId',
  'createdById',
  'authorId',
  'organizationId',
  'teamId',
  'physioId',
] as const

type OwnershipCol = typeof OWNERSHIP_CANDIDATES[number] | 'NONE'

function parseSchema(): ModelInfo[] {
  // Schema lives in `prisma/schema/*.prisma` after Phase 6. Fall back to a
  // single `prisma/schema.prisma` file for compatibility with older checkouts.
  const schemaDir = path.join(process.cwd(), 'prisma', 'schema')
  const legacyFile = path.join(process.cwd(), 'prisma', 'schema.prisma')
  let src = ''
  if (fs.existsSync(schemaDir) && fs.statSync(schemaDir).isDirectory()) {
    for (const f of fs.readdirSync(schemaDir).sort()) {
      if (f.endsWith('.prisma')) {
        src += '\n' + fs.readFileSync(path.join(schemaDir, f), 'utf8')
      }
    }
  } else if (fs.existsSync(legacyFile)) {
    src = fs.readFileSync(legacyFile, 'utf8')
  } else {
    throw new Error('No Prisma schema found in prisma/schema/ or prisma/schema.prisma')
  }
  const models: ModelInfo[] = []

  const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm
  let m: RegExpExecArray | null
  while ((m = modelRe.exec(src)) !== null) {
    const name = m[1]
    const body = m[2]
    const fields: string[] = []
    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue
      const fieldMatch = trimmed.match(/^(\w+)\s+/)
      if (fieldMatch) fields.push(fieldMatch[1])
    }
    models.push({ name, fields })
  }
  return models
}

function detectOwnership(model: ModelInfo): OwnershipCol {
  for (const candidate of OWNERSHIP_CANDIDATES) {
    if (model.fields.includes(candidate)) return candidate
  }
  return 'NONE'
}

// ── postgres query ──────────────────────────────────────────────────

async function fetchRlsEnabledTables(): Promise<Set<string>> {
  // Use Prisma (already a dependency) rather than adding `pg`. We reach in
  // through the generated client's raw-query escape hatch.
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT c.relname AS tablename
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relrowsecurity = true
    `
    return new Set(rows.map((r) => r.tablename))
  } finally {
    await prisma.$disconnect()
  }
}

// ── main ────────────────────────────────────────────────────────────

function loadAllowlist(): Set<string> {
  const p = path.join(process.cwd(), 'scripts', 'rls-covered-models.txt')
  if (!fs.existsSync(p)) {
    throw new Error(`Allowlist not found: ${p}`)
  }
  const raw = fs.readFileSync(p, 'utf8')
  return new Set(
    raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  )
}

async function main() {
  loadEnvLocal()

  const json = process.argv.includes('--json')
  const enforce = process.argv.includes('--enforce')
  const checkAllowlist = process.argv.includes('--check-allowlist')

  const models = parseSchema()

  if (checkAllowlist) {
    const allowlist = loadAllowlist()
    const notInAllowlist = models
      .map((m) => m.name)
      .filter((n) => !allowlist.has(n))
      .sort()
    const notInSchema = [...allowlist]
      .filter((n) => !models.some((m) => m.name === n))
      .sort()

    if (json) {
      console.log(
        JSON.stringify(
          {
            mode: 'allowlist',
            totalModels: models.length,
            allowlistSize: allowlist.size,
            newModelsMissingFromAllowlist: notInAllowlist,
            staleEntriesInAllowlist: notInSchema,
          },
          null,
          2
        )
      )
    } else {
      console.log('RLS Coverage Audit (allowlist mode)')
      console.log('─'.repeat(60))
      console.log(`Prisma models:   ${models.length}`)
      console.log(`Allowlist size:  ${allowlist.size}`)
      if (notInAllowlist.length > 0) {
        console.log(
          `\n✖ ${notInAllowlist.length} new model(s) missing from scripts/rls-covered-models.txt:`
        )
        for (const n of notInAllowlist) console.log(`  - ${n}`)
        console.log(
          '\nAdd RLS policies for these tables, then append them to the allowlist.'
        )
      }
      if (notInSchema.length > 0) {
        console.log(
          `\n⚠ ${notInSchema.length} stale entry(s) in allowlist (model no longer exists):`
        )
        for (const n of notInSchema) console.log(`  - ${n}`)
      }
      if (notInAllowlist.length === 0 && notInSchema.length === 0) {
        console.log('\n✓ All Prisma models are present in the RLS allowlist.')
      }
    }
    if (notInAllowlist.length > 0) process.exit(1)
    return
  }

  const rlsTables = await fetchRlsEnabledTables()

  const covered: string[] = []
  const uncovered: { model: string; ownership: OwnershipCol }[] = []

  for (const model of models) {
    if (rlsTables.has(model.name)) {
      covered.push(model.name)
    } else {
      uncovered.push({ model: model.name, ownership: detectOwnership(model) })
    }
  }

  const grouped: Record<OwnershipCol, string[]> = Object.fromEntries([
    ...OWNERSHIP_CANDIDATES.map((c) => [c, [] as string[]]),
    ['NONE', [] as string[]],
  ]) as Record<OwnershipCol, string[]>
  for (const u of uncovered) grouped[u.ownership].push(u.model)

  if (json) {
    console.log(
      JSON.stringify(
        {
          totalModels: models.length,
          coveredCount: covered.length,
          uncoveredCount: uncovered.length,
          uncovered: grouped,
        },
        null,
        2
      )
    )
  } else {
    console.log('RLS Coverage Audit')
    console.log('─'.repeat(60))
    console.log(`Prisma models:  ${models.length}`)
    console.log(`RLS enabled:    ${covered.length}`)
    console.log(`Uncovered:      ${uncovered.length}`)
    console.log('')

    const order: OwnershipCol[] = [
      'userId',
      'coachId',
      'athleteId',
      'clientId',
      'businessId',
      'ownerId',
      'createdById',
      'authorId',
      'organizationId',
      'teamId',
      'physioId',
      'NONE',
    ]
    for (const key of order) {
      const list = grouped[key]
      if (!list.length) continue
      console.log(`\n[ownership: ${key}]  (${list.length})`)
      for (const name of list.sort()) console.log(`  - ${name}`)
    }
  }

  if (enforce && uncovered.length > 0) {
    if (!json) console.log('\n✖ RLS coverage gap detected (--enforce).')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
