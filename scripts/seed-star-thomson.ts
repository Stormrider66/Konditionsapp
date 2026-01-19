import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating Star by Thomson business...')

  // Check if business already exists
  const existingBusiness = await prisma.business.findFirst({
    where: { slug: 'star-by-thomson' }
  })

  if (existingBusiness) {
    console.log('Business already exists:', existingBusiness.id)
    return existingBusiness
  }

  // Create the business
  const business = await prisma.business.create({
    data: {
      name: 'Star by Thomson',
      slug: 'star-by-thomson',
      description: 'Professional physiological testing and coaching services',
      email: 'info@starbythomson.se',
      phone: '+46 70 123 4567',
      website: 'https://www.starbythomson.se',
      city: 'Stockholm',
      country: 'SE',
      primaryColor: '#3b82f6',
      defaultRevenueShare: 20,
      isActive: true,
    }
  })

  console.log('Created business:', business.id)

  // Find coaches/admins to add as members
  const coaches = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'COACH' },
        { role: 'ADMIN' }
      ]
    },
    take: 4,
    orderBy: { createdAt: 'asc' }
  })

  console.log(`Found ${coaches.length} coaches/admins to add as members`)

  // Add coaches as business members
  for (let i = 0; i < coaches.length; i++) {
    const coach = coaches[i]
    const role = i === 0 ? 'OWNER' : (i === 1 ? 'ADMIN' : 'MEMBER')

    try {
      const member = await prisma.businessMember.create({
        data: {
          businessId: business.id,
          userId: coach.id,
          role: role,
          isActive: true,
          acceptedAt: new Date(),
        }
      })
      console.log(`Added ${coach.email} as ${role}`)
    } catch (e) {
      console.log(`Skipped ${coach.email} (might already be a member)`)
    }
  }

  // List final members
  const members = await prisma.businessMember.findMany({
    where: { businessId: business.id },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } }
    }
  })

  console.log('\nBusiness Members:')
  members.forEach(m => {
    console.log(`  - ${m.user.name || m.user.email} (${m.role})`)
  })

  return business
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
