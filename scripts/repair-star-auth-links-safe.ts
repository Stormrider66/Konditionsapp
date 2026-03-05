import fs from 'fs'
import path from 'path'
import { PrismaClient, UserRole } from '@prisma/client'
import { createClient, User as SupabaseAuthUser } from '@supabase/supabase-js'

type ActionType =
  | 'SKIP_ALREADY_OK'
  | 'REKEY_DB_USER_ID_TO_AUTH_ID'
  | 'CREATE_AUTH_THEN_REKEY'
  | 'CONFLICT_NO_DB_USER'
  | 'CONFLICT_MULTIPLE_DB_USERS'
  | 'CONFLICT_MULTIPLE_AUTH_USERS'
  | 'CONFLICT_AUTH_ID_ALREADY_IN_DB'
  | 'CONFLICT_BLOCKING_FK'

interface TargetSpec {
  key: string
  name: string
  primaryEmail: string
  aliases?: string[]
}

interface DBUserSnapshot {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: Date
  businessMemberships: Array<{
    id: string
    businessId: string
    role: string
    isActive: boolean
    business: { id: string; name: string; slug: string; isActive: boolean }
  }>
  subscription: {
    tier: string
    status: string
    maxAthletes: number
    currentAthletes: number
  } | null
  clientsCount: number
}

interface FKMetadata {
  tableName: string
  columnName: string
  constraintName: string
  updateRule: string
  deleteRule: string
}

interface FKCount {
  tableName: string
  columnName: string
  updateRule: string
  count: number
}

interface PlanItem {
  target: TargetSpec
  action: ActionType
  reason: string
  warnings: string[]
  dbUsers: DBUserSnapshot[]
  authMatches: Array<{
    id: string
    email: string | null
    createdAt: string | null
    lastSignInAt: string | null
  }>
  chosenDbUserId: string | null
  chosenAuthUserId: string | null
  fkCountsForChosenDbUser: FKCount[]
  blockingFksForChosenDbUser: FKCount[]
  authIdCollisionDbUser: { id: string; email: string; name: string } | null
}

interface ApplyResult {
  targetKey: string
  action: ActionType
  status: 'skipped' | 'applied' | 'failed'
  message: string
  oldDbUserId: string | null
  finalDbUserId: string | null
}

const DEFAULT_TARGETS: TargetSpec[] = [
  {
    key: 'tommy',
    name: 'Tommy Henriksson',
    primaryEmail: 'startommy@thomsons.se',
    aliases: ['tommy@starbythomson.se'],
  },
  {
    key: 'elias',
    name: 'Elias Stahl',
    primaryEmail: 'starelias@thomsons.se',
    aliases: ['elias@starbythomson.se'],
  },
  {
    key: 'stefan',
    name: 'Stefan Thomson',
    primaryEmail: 'starstefan@thomsons.se',
    aliases: ['stefan@starbythomson.se'],
  },
]

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function parseArgValue(flag: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`))
  if (!arg) return null
  return arg.slice(flag.length + 1)
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

async function listAllAuthUsers(supabase: any): Promise<SupabaseAuthUser[]> {
  const users: SupabaseAuthUser[] = []
  const perPage = 1000
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`)
    }
    const batch = data?.users || []
    users.push(...batch)
    if (batch.length < perPage) break
    page += 1
  }

  return users
}

async function getUserFKMetadata(prisma: PrismaClient): Promise<FKMetadata[]> {
  return prisma.$queryRawUnsafe<FKMetadata[]>(`
    SELECT
      tc.table_name AS "tableName",
      kcu.column_name AS "columnName",
      tc.constraint_name AS "constraintName",
      rc.update_rule AS "updateRule",
      rc.delete_rule AS "deleteRule"
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'User'
      AND ccu.column_name = 'id'
    ORDER BY tc.table_name, kcu.column_name
  `)
}

async function getFKCountsForUser(
  prisma: PrismaClient,
  metadata: FKMetadata[],
  userId: string
): Promise<FKCount[]> {
  const out: FKCount[] = []
  for (const fk of metadata) {
    const sql = `SELECT COUNT(*)::int AS count FROM ${quoteIdent(fk.tableName)} WHERE ${quoteIdent(fk.columnName)} = $1`
    const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(sql, userId)
    const count = rows[0]?.count || 0
    if (count > 0) {
      out.push({
        tableName: fk.tableName,
        columnName: fk.columnName,
        updateRule: fk.updateRule,
        count,
      })
    }
  }
  return out
}

async function getDbUsersByEmails(
  prisma: PrismaClient,
  businessSlug: string,
  emails: string[]
): Promise<DBUserSnapshot[]> {
  const or = emails.map((email) => ({
    email: { equals: email, mode: 'insensitive' as const },
  }))

  const users = await prisma.user.findMany({
    where: { OR: or },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      businessMemberships: {
        where: {
          business: { slug: businessSlug },
        },
        select: {
          id: true,
          businessId: true,
          role: true,
          isActive: true,
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
        },
      },
      subscription: {
        select: {
          tier: true,
          status: true,
          maxAthletes: true,
          currentAthletes: true,
        },
      },
      _count: {
        select: {
          clients: true,
        },
      },
    },
  })

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    businessMemberships: u.businessMemberships,
    subscription: u.subscription,
    clientsCount: u._count.clients,
  }))
}

function chooseAuthMatch(
  target: TargetSpec,
  authMatches: SupabaseAuthUser[]
): { chosen: SupabaseAuthUser | null; warnings: string[]; conflict: boolean } {
  const warnings: string[] = []
  if (authMatches.length === 0) {
    return { chosen: null, warnings, conflict: false }
  }
  if (authMatches.length === 1) {
    return { chosen: authMatches[0], warnings, conflict: false }
  }

  const primary = authMatches.find(
    (u) => normalizeEmail(u.email || '') === normalizeEmail(target.primaryEmail)
  )
  if (primary) {
    warnings.push('Multiple auth users matched aliases; selected primaryEmail match.')
    return { chosen: primary, warnings, conflict: false }
  }

  return { chosen: null, warnings, conflict: true }
}

async function main() {
  loadEnvLocal()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  }

  const prisma = new PrismaClient()
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const apply = hasFlag('--apply')
  const businessSlug = parseArgValue('--business-slug') || 'star-by-thomson'
  const targetsArg = parseArgValue('--targets')
  const selectedKeys = targetsArg
    ? targetsArg
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : DEFAULT_TARGETS.map((t) => t.key)

  const targets = DEFAULT_TARGETS.filter((t) => selectedKeys.includes(t.key))
  if (targets.length === 0) {
    throw new Error(`No targets selected. Valid keys: ${DEFAULT_TARGETS.map((t) => t.key).join(', ')}`)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.join(process.cwd(), 'scripts', 'output')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(
    outDir,
    `star-auth-repair-${businessSlug}-${apply ? 'apply' : 'dry-run'}-${timestamp}.json`
  )

  try {
    const business = await prisma.business.findFirst({
      where: { slug: businessSlug },
      select: { id: true, name: true, slug: true, isActive: true },
    })
    if (!business) {
      throw new Error(`Business "${businessSlug}" not found`)
    }

    const allAuthUsers = await listAllAuthUsers(supabase)
    const fkMetadata = await getUserFKMetadata(prisma)

    const plan: PlanItem[] = []

    for (const target of targets) {
      const allEmails = Array.from(
        new Set([target.primaryEmail, ...(target.aliases || [])].map(normalizeEmail))
      )

      const dbUsers = await getDbUsersByEmails(prisma, businessSlug, allEmails)
      const authMatches = allAuthUsers.filter(
        (u) => !!u.email && allEmails.includes(normalizeEmail(u.email))
      )
      const authSelection = chooseAuthMatch(target, authMatches)

      let action: ActionType
      let reason = ''
      const warnings = [...authSelection.warnings]
      let chosenDbUserId: string | null = null
      let chosenAuthUserId: string | null = authSelection.chosen?.id || null
      let fkCountsForChosenDbUser: FKCount[] = []
      let blockingFksForChosenDbUser: FKCount[] = []
      let authIdCollisionDbUser: { id: string; email: string; name: string } | null = null

      if (dbUsers.length === 0) {
        action = 'CONFLICT_NO_DB_USER'
        reason = 'No DB user found for target emails.'
      } else if (dbUsers.length > 1) {
        action = 'CONFLICT_MULTIPLE_DB_USERS'
        reason = 'Multiple DB users matched aliases; manual merge required.'
      } else if (authSelection.conflict) {
        action = 'CONFLICT_MULTIPLE_AUTH_USERS'
        reason = 'Multiple auth users matched aliases with no clear primary.'
      } else {
        const dbUser = dbUsers[0]
        chosenDbUserId = dbUser.id
        fkCountsForChosenDbUser = await getFKCountsForUser(prisma, fkMetadata, dbUser.id)
        blockingFksForChosenDbUser = fkCountsForChosenDbUser.filter(
          (fk) => fk.updateRule.toUpperCase() !== 'CASCADE'
        )

        if (blockingFksForChosenDbUser.length > 0) {
          action = 'CONFLICT_BLOCKING_FK'
          reason = 'Found non-cascade foreign keys with rows; safe rekey is blocked.'
        } else if (!authSelection.chosen) {
          action = 'CREATE_AUTH_THEN_REKEY'
          reason = 'DB user exists but no auth user found; create auth user then rekey DB id.'
        } else if (dbUser.id === authSelection.chosen.id) {
          action = 'SKIP_ALREADY_OK'
          reason = 'DB user ID already matches auth user ID.'
        } else {
          const collision = await prisma.user.findUnique({
            where: { id: authSelection.chosen.id },
            select: { id: true, email: true, name: true },
          })
          if (collision && collision.id !== dbUser.id) {
            action = 'CONFLICT_AUTH_ID_ALREADY_IN_DB'
            reason = 'Auth user ID already exists in DB for another user.'
            authIdCollisionDbUser = collision
          } else {
            action = 'REKEY_DB_USER_ID_TO_AUTH_ID'
            reason = 'Auth and DB IDs differ; safe rekey available.'
          }
        }
      }

      plan.push({
        target,
        action,
        reason,
        warnings,
        dbUsers,
        authMatches: authMatches.map((u) => ({
          id: u.id,
          email: u.email || null,
          createdAt: u.created_at || null,
          lastSignInAt: u.last_sign_in_at || null,
        })),
        chosenDbUserId,
        chosenAuthUserId,
        fkCountsForChosenDbUser,
        blockingFksForChosenDbUser,
        authIdCollisionDbUser,
      })
    }

    const applyResults: ApplyResult[] = []

    if (apply) {
      for (const item of plan) {
        const oldDbUserId = item.chosenDbUserId
        try {
          if (item.action === 'SKIP_ALREADY_OK') {
            applyResults.push({
              targetKey: item.target.key,
              action: item.action,
              status: 'skipped',
              message: item.reason,
              oldDbUserId,
              finalDbUserId: item.chosenDbUserId,
            })
            continue
          }

          if (item.action !== 'REKEY_DB_USER_ID_TO_AUTH_ID' && item.action !== 'CREATE_AUTH_THEN_REKEY') {
            applyResults.push({
              targetKey: item.target.key,
              action: item.action,
              status: 'failed',
              message: `Blocked: ${item.reason}`,
              oldDbUserId,
              finalDbUserId: null,
            })
            continue
          }

          if (!item.chosenDbUserId) {
            throw new Error('Missing chosenDbUserId in apply step.')
          }

          let targetAuthId = item.chosenAuthUserId
          let createdAuthId: string | null = null

          if (item.action === 'CREATE_AUTH_THEN_REKEY') {
            const dbUser = item.dbUsers[0]
            const { data, error } = await supabase.auth.admin.createUser({
              email: dbUser.email,
              email_confirm: true,
              user_metadata: {
                name: dbUser.name,
                role: dbUser.role,
              },
            })
            if (error || !data.user) {
              throw new Error(`Failed creating auth user: ${error?.message || 'unknown error'}`)
            }
            targetAuthId = data.user.id
            createdAuthId = data.user.id
          }

          if (!targetAuthId) {
            throw new Error('Missing target auth ID for rekey.')
          }

          try {
            await prisma.$transaction(async (tx) => {
              await tx.user.update({
                where: { id: item.chosenDbUserId! },
                data: { id: targetAuthId! },
              })
            })
          } catch (rekeyError) {
            if (createdAuthId) {
              await supabase.auth.admin.deleteUser(createdAuthId).catch(() => {})
            }
            throw rekeyError
          }

          applyResults.push({
            targetKey: item.target.key,
            action: item.action,
            status: 'applied',
            message: 'Rekey applied successfully.',
            oldDbUserId,
            finalDbUserId: targetAuthId,
          })
        } catch (error) {
          applyResults.push({
            targetKey: item.target.key,
            action: item.action,
            status: 'failed',
            message: error instanceof Error ? error.message : 'Unknown apply failure',
            oldDbUserId,
            finalDbUserId: null,
          })
        }
      }
    }

    const summary = {
      mode: apply ? 'apply' : 'dry-run',
      businessSlug,
      timestamp: new Date().toISOString(),
      actionCounts: plan.reduce<Record<string, number>>((acc, item) => {
        acc[item.action] = (acc[item.action] || 0) + 1
        return acc
      }, {}),
      plan,
      applyResults,
    }

    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8')

    console.log(`\nMode: ${summary.mode}`)
    console.log(`Business: ${business.name} (${business.slug})`)
    console.log(`Targets: ${targets.map((t) => t.key).join(', ')}`)
    console.log('\nPlanned actions:')
    for (const item of plan) {
      console.log(`- ${item.target.key}: ${item.action} (${item.reason})`)
      if (item.warnings.length > 0) {
        for (const w of item.warnings) {
          console.log(`  warning: ${w}`)
        }
      }
    }

    if (apply) {
      console.log('\nApply results:')
      for (const r of applyResults) {
        console.log(`- ${r.targetKey}: ${r.status} (${r.message})`)
      }
    }

    console.log(`\nReport written to: ${outPath}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
