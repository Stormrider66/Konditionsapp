/**
 * Seed Pricing Tiers
 *
 * Run with: npx ts-node prisma/seed-pricing.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding pricing tiers...')

  // Coach Pricing Tiers
  const coachTiers = [
    {
      tierType: 'COACH',
      tierName: 'FREE',
      displayName: 'Free',
      description: 'Get started with basic features',
      features: [
        'Up to 1 athlete',
        'Basic test reports',
        'Standard training zones',
        'Email support',
      ],
      monthlyPriceCents: 0,
      yearlyPriceCents: 0,
      currency: 'SEK',
      maxAthletes: 1,
      aiChatLimit: 0,
      isActive: true,
      sortOrder: 0,
    },
    {
      tierType: 'COACH',
      tierName: 'BASIC',
      displayName: 'Basic',
      description: 'For coaches building their practice',
      features: [
        'Up to 20 athletes',
        'Advanced test reports',
        'Custom training zones',
        'PDF export',
        'Priority email support',
      ],
      monthlyPriceCents: 49900, // 499 SEK
      yearlyPriceCents: 479000, // 4790 SEK (2 months free)
      currency: 'SEK',
      maxAthletes: 20,
      aiChatLimit: 50,
      isActive: true,
      sortOrder: 1,
    },
    {
      tierType: 'COACH',
      tierName: 'PRO',
      displayName: 'Pro',
      description: 'For professional coaches and teams',
      features: [
        'Up to 100 athletes',
        'All Basic features',
        'AI training assistant',
        'Video analysis',
        'Strava & Garmin sync',
        'White-label reports',
        'Phone & chat support',
      ],
      monthlyPriceCents: 149900, // 1499 SEK
      yearlyPriceCents: 1439000, // 14390 SEK (2 months free)
      currency: 'SEK',
      maxAthletes: 100,
      aiChatLimit: 500,
      isActive: true,
      sortOrder: 2,
    },
    {
      tierType: 'COACH',
      tierName: 'ENTERPRISE',
      displayName: 'Enterprise',
      description: 'Custom solutions for organizations',
      features: [
        'Unlimited athletes',
        'All Pro features',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
        'On-premise option',
        'Custom training',
      ],
      monthlyPriceCents: 0, // Custom pricing
      yearlyPriceCents: null,
      currency: 'SEK',
      maxAthletes: -1, // Unlimited
      aiChatLimit: -1, // Unlimited
      isActive: true,
      sortOrder: 3,
    },
  ]

  // Athlete Pricing Tiers
  const athleteTiers = [
    {
      tierType: 'ATHLETE',
      tierName: 'FREE',
      displayName: 'Free',
      description: 'View your test reports',
      features: [
        'View test reports',
        'Basic training zones',
        'Read-only access',
      ],
      monthlyPriceCents: 0,
      yearlyPriceCents: 0,
      currency: 'SEK',
      maxAthletes: 0,
      aiChatLimit: 0,
      isActive: true,
      sortOrder: 0,
    },
    {
      tierType: 'ATHLETE',
      tierName: 'STANDARD',
      displayName: 'Standard',
      description: 'Log workouts and get AI guidance',
      features: [
        'All Free features',
        'Workout logging',
        'Daily check-in',
        'AI chat (50 messages/month)',
        'Progress tracking',
      ],
      monthlyPriceCents: 19900, // 199 SEK
      yearlyPriceCents: 179000, // 1790 SEK
      currency: 'SEK',
      maxAthletes: 0,
      aiChatLimit: 50,
      isActive: true,
      sortOrder: 1,
    },
    {
      tierType: 'ATHLETE',
      tierName: 'PRO',
      displayName: 'Pro',
      description: 'Full AI agent and integrations',
      features: [
        'All Standard features',
        'Unlimited AI chat',
        'AI training agent',
        'Video analysis',
        'Strava & Garmin sync',
        'Advanced analytics',
      ],
      monthlyPriceCents: 39900, // 399 SEK
      yearlyPriceCents: 359000, // 3590 SEK
      currency: 'SEK',
      maxAthletes: 0,
      aiChatLimit: -1, // Unlimited
      isActive: true,
      sortOrder: 2,
    },
  ]

  // Upsert all tiers
  for (const tier of [...coachTiers, ...athleteTiers]) {
    await prisma.pricingTier.upsert({
      where: {
        tierType_tierName: {
          tierType: tier.tierType,
          tierName: tier.tierName,
        },
      },
      update: {
        displayName: tier.displayName,
        description: tier.description,
        features: tier.features,
        monthlyPriceCents: tier.monthlyPriceCents,
        yearlyPriceCents: tier.yearlyPriceCents,
        maxAthletes: tier.maxAthletes,
        aiChatLimit: tier.aiChatLimit,
        sortOrder: tier.sortOrder,
      },
      create: tier,
    })
    console.log(`  ✓ ${tier.tierType} - ${tier.tierName}`)
  }

  console.log('\nPricing tiers seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding pricing:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
