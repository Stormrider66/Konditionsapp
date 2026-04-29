// scripts/enable-business-feature.ts
//
// Two operations on a single business identified by slug:
//   1. Flip a BusinessFeature flag on/off (--feature, optionally --disable).
//   2. Change the Business.type (--set-type GYM|CLUB|INDEPENDENT_COACH).
//
// Usage:
//   npx tsx scripts/enable-business-feature.ts --slug star-by-thomson --feature WHITE_LABEL
//   npx tsx scripts/enable-business-feature.ts --slug star-by-thomson --feature CUSTOM_BRANDING
//   npx tsx scripts/enable-business-feature.ts --slug star-by-thomson --feature WHITE_LABEL --disable
//   npx tsx scripts/enable-business-feature.ts --slug star-by-thomson --set-type GYM
//
// Requires DATABASE_URL + DIRECT_DATABASE_URL exported (or sourced from .env.local
// the way the rest of the codebase does it):
//   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && \
//     npx tsx scripts/enable-business-feature.ts --slug star-by-thomson --set-type GYM

import { PrismaClient, FeatureFlag, BusinessType } from '@prisma/client'

interface Args {
  slug: string
  feature?: FeatureFlag
  disable: boolean
  setType?: BusinessType
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const out: Partial<Args> = { disable: false }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--slug') out.slug = argv[++i]
    else if (arg === '--feature') out.feature = argv[++i] as FeatureFlag
    else if (arg === '--set-type') out.setType = argv[++i] as BusinessType
    else if (arg === '--disable') out.disable = true
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage:\n' +
          '  --slug <business-slug> --feature <FEATURE_FLAG> [--disable]\n' +
          '  --slug <business-slug> --set-type <GYM|CLUB|INDEPENDENT_COACH>\n\n' +
          'You can combine the two — both happen in one run.',
      )
      process.exit(0)
    }
  }

  if (!out.slug || (!out.feature && !out.setType)) {
    console.error('Need --slug plus at least one of --feature or --set-type. Use --help for details.')
    process.exit(1)
  }
  return out as Args
}

async function main() {
  const args = parseArgs()
  const prisma = new PrismaClient()

  try {
    const business = await prisma.business.findUnique({
      where: { slug: args.slug },
      select: { id: true, name: true, type: true },
    })

    if (!business) {
      console.error(`No business found with slug "${args.slug}".`)
      process.exit(1)
    }

    if (args.setType) {
      const updated = await prisma.business.update({
        where: { id: business.id },
        data: { type: args.setType },
        select: { id: true, name: true, slug: true, type: true },
      })
      console.log(
        `✅ Set type ${business.type} → ${updated.type} for ` +
          `${updated.name} (slug=${updated.slug}, id=${updated.id})`,
      )
    }

    if (args.feature) {
      const isEnabled = !args.disable
      const result = await prisma.businessFeature.upsert({
        where: {
          businessId_feature: {
            businessId: business.id,
            feature: args.feature,
          },
        },
        update: {
          isEnabled,
          enabledAt: isEnabled ? new Date() : null,
        },
        create: {
          businessId: business.id,
          feature: args.feature,
          isEnabled,
          enabledAt: isEnabled ? new Date() : null,
        },
        select: {
          id: true,
          feature: true,
          isEnabled: true,
          enabledAt: true,
          expiresAt: true,
        },
      })

      console.log(
        `${isEnabled ? '✅ Enabled' : '❌ Disabled'} ${result.feature} for ` +
          `${business.name} (slug=${args.slug}, id=${business.id})`,
      )
      console.log('Row:', result)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
