import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { getCurrentAllowancePeriod, roundSek } from '@/lib/ai/billing/allowance'

export interface SmokeBalanceOptions {
  email?: string
  clientId?: string
  budgetSek: number
  remainingSek: number
  apply: boolean
}

export function parseSmokeArgs(argv = process.argv.slice(2), env = process.env): SmokeBalanceOptions {
  const args = new Map<string, string>()
  let apply = false

  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true
      continue
    }

    const [key, ...rest] = arg.split('=')
    if (key.startsWith('--') && rest.length > 0) {
      args.set(key, rest.join('='))
    }
  }

  const budgetSek = parseSek(args.get('--budget') ?? '0.25', '--budget')
  const remainingSek = parseSek(args.get('--remaining') ?? '0', '--remaining')

  if (remainingSek > budgetSek) {
    throw new Error('--remaining cannot be larger than --budget')
  }

  return {
    email: args.get('--email') ?? env.TRAINOMICS_QA_ATHLETE_EMAIL ?? env.E2E_ATHLETE_EMAIL,
    clientId: args.get('--client-id'),
    budgetSek,
    remainingSek,
    apply,
  }
}

export function buildSmokeBalanceUpdate(options: Pick<SmokeBalanceOptions, 'budgetSek' | 'remainingSek'>) {
  const budgetSek = roundSek(options.budgetSek)
  const remainingSek = roundSek(options.remainingSek)

  if (budgetSek < 0 || remainingSek < 0) {
    throw new Error('budgetSek and remainingSek must be positive')
  }
  if (remainingSek > budgetSek) {
    throw new Error('remainingSek cannot be larger than budgetSek')
  }

  return {
    includedBudgetSek: budgetSek,
    includedUsedSek: roundSek(budgetSek - remainingSek),
    topUpBalanceSek: 0,
    hardCapSek: budgetSek,
    status: 'ACTIVE',
  }
}

function parseSek(value: string, label: string): number {
  const parsed = Number(value.replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a positive number`)
  }
  return roundSek(parsed)
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

async function resolveClientId(options: SmokeBalanceOptions): Promise<string> {
  if (options.clientId) return options.clientId
  if (!options.email) {
    throw new Error('Provide --client-id, --email, or TRAINOMICS_QA_ATHLETE_EMAIL/E2E_ATHLETE_EMAIL.')
  }

  const user = await prisma.user.findUnique({
    where: { email: options.email },
    select: {
      athleteAccount: {
        select: {
          clientId: true,
        },
      },
    },
  })

  const clientId = user?.athleteAccount?.clientId
  if (!clientId) {
    throw new Error(`No athlete account found for ${options.email}`)
  }

  return clientId
}

async function main() {
  loadEnvLocal()
  const options = parseSmokeArgs()
  const clientId = await resolveClientId(options)
  const period = getCurrentAllowancePeriod()
  const balanceUpdate = buildSmokeBalanceUpdate(options)

  const existing = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      email: true,
      athleteSubscription: {
        select: {
          id: true,
          tier: true,
          customAiAllowanceSek: true,
        },
      },
      aiAllowanceAccount: {
        select: {
          includedBudgetSek: true,
          includedUsedSek: true,
          topUpBalanceSek: true,
          periodEnd: true,
        },
      },
    },
  })

  if (!existing) throw new Error(`Client not found: ${clientId}`)
  if (!existing.athleteSubscription) throw new Error(`Client ${clientId} is missing AthleteSubscription`)

  const summary = {
    clientId,
    name: existing.name,
    email: existing.email,
    apply: options.apply,
    previous: {
      customAiAllowanceSek: existing.athleteSubscription.customAiAllowanceSek,
      allowanceAccount: existing.aiAllowanceAccount,
    },
    next: {
      customAiAllowanceSek: options.budgetSek,
      allowanceAccount: {
        ...balanceUpdate,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      },
    },
  }

  if (!options.apply) {
    console.log(JSON.stringify(summary, null, 2))
    console.log('\nDry run only. Re-run with --apply to update the QA athlete balance.')
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.athleteSubscription.update({
      where: { clientId },
      data: {
        customAiAllowanceSek: options.budgetSek,
      },
    })

    await tx.aIAllowanceAccount.upsert({
      where: { clientId },
      update: {
        ...period,
        ...balanceUpdate,
        lastResetAt: new Date(),
      },
      create: {
        clientId,
        ...period,
        ...balanceUpdate,
        lastResetAt: new Date(),
      },
    })
  })

  console.log(JSON.stringify(summary, null, 2))
  console.log('\nAI billing smoke balance prepared.')
}

if (process.env.NODE_ENV !== 'test') {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
