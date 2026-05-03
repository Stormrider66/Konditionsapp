import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ownerEmail = process.env.STAR_BY_TH_OWNER_EMAIL ?? 'henrik.lundholm@gmail.com'
const businessSlug = process.env.STAR_BY_TH_BUSINESS_SLUG ?? 'star-by-th'
const businessName = process.env.STAR_BY_TH_BUSINESS_NAME ?? 'Star by TH'
const locationSlug = process.env.STAR_BY_TH_LOCATION_SLUG ?? 'main'
const locationName = process.env.STAR_BY_TH_LOCATION_NAME ?? businessName

async function main() {
  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true, email: true, name: true },
  })

  if (!owner) {
    throw new Error(`No Trainomics user found for ${ownerEmail}. Create/login that user first.`)
  }

  const business = await prisma.business.upsert({
    where: { slug: businessSlug },
    update: {
      name: businessName,
      type: 'GYM',
      isActive: true,
      email: owner.email,
      country: 'SE',
      primaryColor: '#3b82f6',
    },
    create: {
      name: businessName,
      slug: businessSlug,
      type: 'GYM',
      description: 'Professional physiological testing and coaching services at a separate Star by TH location.',
      email: owner.email,
      country: 'SE',
      primaryColor: '#3b82f6',
      defaultRevenueShare: 20,
      isActive: true,
    },
    select: { id: true, name: true, slug: true },
  })

  await prisma.businessMember.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: owner.id,
      },
    },
    update: {
      role: 'OWNER',
      isActive: true,
      acceptedAt: new Date(),
    },
    create: {
      businessId: business.id,
      userId: owner.id,
      role: 'OWNER',
      isActive: true,
      acceptedAt: new Date(),
    },
  })

  await prisma.location.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: locationSlug,
      },
    },
    update: {
      name: locationName,
      email: owner.email,
      isPrimary: true,
      isActive: true,
      capabilities: ['lactate_testing', 'vo2max_testing', 'strength_training'],
    },
    create: {
      businessId: business.id,
      name: locationName,
      slug: locationSlug,
      email: owner.email,
      isPrimary: true,
      isActive: true,
      capabilities: ['lactate_testing', 'vo2max_testing', 'strength_training'],
    },
  })

  console.log(`Workspace ready: /${business.slug}/coach/dashboard`)
  console.log(`Owner: ${owner.email}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
