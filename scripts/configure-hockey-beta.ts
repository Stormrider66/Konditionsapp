// scripts/configure-hockey-beta.ts
//
// Enable or disable the reversible hockey beta policy stored on Business.settings.
//
// Usage:
//   npx tsx scripts/configure-hockey-beta.ts --slug skelleftea-aik
//   npx tsx scripts/configure-hockey-beta.ts --slug skelleftea-aik --limit 10 --allowance-sek 5
//   npx tsx scripts/configure-hockey-beta.ts --slug skelleftea-aik --disable

import path from 'path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import {
  DEFAULT_HOCKEY_BETA_CONFIG,
  readHockeyBetaConfig,
  withHockeyBetaSettings,
  type HockeyBetaConfig,
} from '@/lib/hockey-beta'
import type { AthleteTier } from '@/lib/athlete-account-utils'
import { ATHLETE_LEGACY_AI_CHAT_LIMITS } from '@/lib/subscription/athlete-plans'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const VALID_TIERS: readonly AthleteTier[] = ['FREE', 'STANDARD', 'PRO', 'ELITE']

interface Args {
  slug: string
  disable: boolean
  limit?: number
  allowanceSek?: number | null
  trialDays?: number
  defaultTier?: AthleteTier
  syncExisting: boolean
}

function numberArg(value: string, name: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number`)
  }
  return parsed
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const args: Partial<Args> = { disable: false, syncExisting: false }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--slug') args.slug = argv[++i]
    else if (arg === '--disable') args.disable = true
    else if (arg === '--sync-existing') args.syncExisting = true
    else if (arg === '--limit') args.limit = numberArg(argv[++i], '--limit')
    else if (arg === '--allowance-sek') {
      const value = argv[++i]
      args.allowanceSek = value === 'null' ? null : numberArg(value, '--allowance-sek')
    } else if (arg === '--trial-days') args.trialDays = numberArg(argv[++i], '--trial-days')
    else if (arg === '--default-tier') {
      const tier = argv[++i]
      if (!(VALID_TIERS as readonly string[]).includes(tier)) {
        throw new Error('--default-tier must be FREE, STANDARD, PRO, or ELITE')
      }
      args.defaultTier = tier as AthleteTier
    } else if (arg === '--help' || arg === '-h') {
      console.log([
        'Usage:',
        '  --slug <business-slug> [--limit 10] [--allowance-sek 5] [--trial-days 0]',
        '  --slug <business-slug> --disable [--sync-existing]',
        '',
        'Defaults: STANDARD athletes, 10 AI chat messages, 5 SEK AI allowance, no trial expiry.',
        '--sync-existing also updates existing Standard hockey athletes in that business.',
      ].join('\n'))
      process.exit(0)
    }
  }

  if (!args.slug) throw new Error('Need --slug <business-slug>')
  return args as Args
}

function nextConfig(current: HockeyBetaConfig, args: Args): HockeyBetaConfig {
  if (args.disable) {
    return { ...current, enabled: false }
  }

  return {
    ...DEFAULT_HOCKEY_BETA_CONFIG,
    ...current,
    enabled: true,
    defaultAthleteTier: args.defaultTier ?? current.defaultAthleteTier ?? DEFAULT_HOCKEY_BETA_CONFIG.defaultAthleteTier,
    standardAiChatMessagesLimit:
      args.limit ?? current.standardAiChatMessagesLimit ?? DEFAULT_HOCKEY_BETA_CONFIG.standardAiChatMessagesLimit,
    standardAiAllowanceSek:
      args.allowanceSek !== undefined
        ? args.allowanceSek
        : current.standardAiAllowanceSek ?? DEFAULT_HOCKEY_BETA_CONFIG.standardAiAllowanceSek,
    trialDays: args.trialDays ?? current.trialDays ?? DEFAULT_HOCKEY_BETA_CONFIG.trialDays,
    sports: DEFAULT_HOCKEY_BETA_CONFIG.sports,
  }
}

async function main() {
  const args = parseArgs()
  const prisma = new PrismaClient()

  try {
    const business = await prisma.business.findUnique({
      where: { slug: args.slug },
      select: { id: true, name: true, slug: true, settings: true },
    })

    if (!business) {
      throw new Error(`No business found with slug "${args.slug}"`)
    }

    const current = readHockeyBetaConfig(business.settings)
    const config = nextConfig(current, args)
    const updated = await prisma.business.update({
      where: { id: business.id },
      data: { settings: withHockeyBetaSettings(business.settings, config) },
      select: { id: true, name: true, slug: true, settings: true },
    })

    let syncedAthletes = 0
    if (args.syncExisting) {
      const sync = await prisma.athleteSubscription.updateMany({
        where: {
          businessId: business.id,
          tier: 'STANDARD',
          client: {
            team: {
              sportType: { in: config.sports },
            },
          },
        },
        data: config.enabled
          ? {
              aiChatMessagesLimit: config.standardAiChatMessagesLimit,
              customAiAllowanceSek: config.standardAiAllowanceSek,
            }
          : {
              aiChatMessagesLimit: ATHLETE_LEGACY_AI_CHAT_LIMITS.STANDARD,
              customAiAllowanceSek: null,
            },
      })
      syncedAthletes = sync.count
    }

    console.log(JSON.stringify({
      ok: true,
      business: { id: updated.id, name: updated.name, slug: updated.slug },
      hockeyBeta: readHockeyBetaConfig(updated.settings),
      syncedExistingStandardHockeyAthletes: syncedAthletes,
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
