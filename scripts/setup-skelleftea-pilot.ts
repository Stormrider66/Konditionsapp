import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ownerEmail = process.env.SKELLEFTEA_OWNER_EMAIL
const businessSlug = process.env.SKELLEFTEA_BUSINESS_SLUG ?? 'skelleftea-aik'
const businessName = process.env.SKELLEFTEA_BUSINESS_NAME ?? 'Skelleftea AIK'

async function main() {
  if (!ownerEmail) {
    throw new Error('Set SKELLEFTEA_OWNER_EMAIL to the coach/user email that should own the pilot workspace.')
  }

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
      type: 'CLUB',
      isActive: true,
      primaryColor: '#f6c445',
      secondaryColor: '#111827',
      country: 'SE',
    },
    create: {
      name: businessName,
      slug: businessSlug,
      type: 'CLUB',
      isActive: true,
      primaryColor: '#f6c445',
      secondaryColor: '#111827',
      country: 'SE',
      email: owner.email,
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

  const organization = await prisma.organization.upsert({
    where: {
      id: `${businessSlug}-org`,
    },
    update: {
      userId: owner.id,
      name: businessName,
      sportType: 'TEAM_ICE_HOCKEY',
    },
    create: {
      id: `${businessSlug}-org`,
      userId: owner.id,
      name: businessName,
      sportType: 'TEAM_ICE_HOCKEY',
      description: 'Development pilot workspace for hockey performance workflows.',
    },
    select: { id: true },
  })

  const teamNames = ['A-team', 'J20', 'J18']
  for (const name of teamNames) {
    const existing = await prisma.team.findFirst({
      where: { userId: owner.id, name, organizationId: organization.id },
      select: { id: true },
    })

    if (existing) continue

    await prisma.team.create({
      data: {
        userId: owner.id,
        name,
        organizationId: organization.id,
        sportType: 'TEAM_ICE_HOCKEY',
        description: `${businessName} ${name} pilot group`,
      },
    })
  }

  console.log(`Pilot workspace ready: /${business.slug}/coach/dashboard`)
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
