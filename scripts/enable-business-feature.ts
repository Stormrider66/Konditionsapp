// scripts/enable-business-feature.ts
//
// Flip a BusinessFeature flag on/off for a single business identified by slug.
// Usage:
//   npx tsx scripts/enable-business-feature.ts --slug star-by-thomson --feature WHITE_LABEL
//   npx tsx scripts/enable-business-feature.ts --slug star-by-thomson --feature CUSTOM_BRANDING
//   npx tsx scripts/enable-business-feature.ts --slug star-by-thomson --feature WHITE_LABEL --disable
//
// Requires DATABASE_URL + DIRECT_DATABASE_URL exported (or sourced from .env.local
// the way the rest of the codebase does it):
//   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && \
//     npx tsx scripts/enable-business-feature.ts --slug star-by-thomson --feature WHITE_LABEL

import { PrismaClient, FeatureFlag } from '@prisma/client'

interface Args {
  slug: string
  feature: FeatureFlag
  disable: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const out: Partial<Args> = { disable: false }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--slug') out.slug = argv[++i]
    else if (arg === '--feature') out.feature = argv[++i] as FeatureFlag
    else if (arg === '--disable') out.disable = true
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: --slug <business-slug> --feature <FEATURE_FLAG> [--disable]\n' +
          'Available features: CUSTOM_BRANDING, WHITE_LABEL (and others — see prisma/schema for full list).',
      )
      process.exit(0)
    }
  }

  if (!out.slug || !out.feature) {
    console.error('Missing --slug or --feature. Run with --help for usage.')
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
        `${business.name} (${business.type}, slug=${args.slug}, id=${business.id})`,
    )
    console.log('Row:', result)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
