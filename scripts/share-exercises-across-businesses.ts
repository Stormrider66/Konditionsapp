/**
 * Share Henrik-owned custom exercises across selected businesses without
 * promoting them to global/system exercises.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/share-exercises-across-businesses.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/share-exercises-across-businesses.ts --execute
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const execute = process.argv.includes('--execute') || process.argv.includes('--apply')

const OWNER_EMAIL = 'henrik.lundholm@gmail.com'
const PRIMARY_BUSINESS_SLUG = 'star-by-th'
const TARGET_BUSINESS_SLUGS = [
  'star-by-thomson',
  'star-by-th',
  'skelleftea-aik',
] as const

async function main() {
  console.log(
    execute
      ? '=== EXECUTE MODE - exercise sharing rows will be written ==='
      : '=== DRY RUN - pass --execute to write sharing rows ==='
  )
  console.log()

  const [owner, businesses] = await Promise.all([
    prisma.user.findUnique({
      where: { email: OWNER_EMAIL },
      select: { id: true, name: true, email: true },
    }),
    prisma.business.findMany({
      where: { slug: { in: Array.from(TARGET_BUSINESS_SLUGS) } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!owner) throw new Error(`Owner user not found: ${OWNER_EMAIL}`)
  const missingSlugs = TARGET_BUSINESS_SLUGS.filter((slug) => !businesses.some((business) => business.slug === slug))
  if (missingSlugs.length > 0) {
    throw new Error(`Missing target businesses: ${missingSlugs.join(', ')}`)
  }

  const primaryBusiness = businesses.find((business) => business.slug === PRIMARY_BUSINESS_SLUG)
  if (!primaryBusiness) throw new Error(`Primary business not found: ${PRIMARY_BUSINESS_SLUG}`)

  const businessIds = businesses.map((business) => business.id)
  const exercises = await prisma.exercise.findMany({
    where: {
      coachId: owner.id,
      isPublic: false,
      OR: [
        { businessId: null },
        { businessId: { in: businessIds } },
      ],
    },
    select: {
      id: true,
      name: true,
      businessId: true,
      _count: { select: { businessShares: true } },
    },
    orderBy: { name: 'asc' },
  })

  const personalExercises = exercises.filter((exercise) => exercise.businessId == null)
  const shareRows = exercises.flatMap((exercise) =>
    businessIds.map((businessId) => ({
      exerciseId: exercise.id,
      businessId,
    }))
  )

  console.log(`Owner: ${owner.name} (${owner.email})`)
  console.log(`Target businesses: ${businesses.map((business) => business.name).join(', ')}`)
  console.log(`Henrik-owned custom exercises in scope: ${exercises.length}`)
  console.log(`Currently personal exercises to attach to ${primaryBusiness.name}: ${personalExercises.length}`)
  console.log(`Share rows to ensure: ${shareRows.length}`)
  console.log()

  for (const exercise of exercises.slice(0, 20)) {
    console.log(
      `${exercise.businessId ? 'BUSINESS' : 'PERSONAL'} | ${exercise.id} | ${exercise.name} | existingShares=${exercise._count.businessShares}`
    )
  }
  if (exercises.length > 20) console.log(`...${exercises.length - 20} more`)

  if (!execute) return

  const result = await prisma.$transaction(async (tx) => {
    const attached = await tx.exercise.updateMany({
      where: {
        id: { in: personalExercises.map((exercise) => exercise.id) },
        businessId: null,
      },
      data: { businessId: primaryBusiness.id },
    })

    const shares = await tx.exerciseBusinessShare.createMany({
      data: shareRows,
      skipDuplicates: true,
    })

    return { attached: attached.count, shares: shares.count }
  })

  console.log()
  console.log(`Updated ${result.attached} personal exercise(s) with primary business ${primaryBusiness.name}.`)
  console.log(`Created ${result.shares} new exercise-business share row(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
