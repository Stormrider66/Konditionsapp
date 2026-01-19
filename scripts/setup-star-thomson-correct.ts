import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TEAM_MEMBERS = [
  { name: 'Stefan Thomson', email: 'stefan@starbythomson.se', role: 'OWNER' },
  { name: 'Henrik Lundholm', email: 'henrik@starbythomson.se', role: 'ADMIN' },
  { name: 'Elias Ståhl', email: 'elias@starbythomson.se', role: 'MEMBER' },
  { name: 'Tommy Henriksson', email: 'tommy@starbythomson.se', role: 'MEMBER' },
]

async function main() {
  console.log('Setting up Star by Thomson with correct team...\n')

  // Find or create the business
  let business = await prisma.business.findFirst({
    where: { slug: 'star-by-thomson' }
  })

  if (!business) {
    business = await prisma.business.create({
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
  } else {
    console.log('Found existing business:', business.id)
  }

  // Remove all existing members
  await prisma.businessMember.deleteMany({
    where: { businessId: business.id }
  })
  console.log('Cleared existing members\n')

  // Create users and add as members
  for (const member of TEAM_MEMBERS) {
    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: member.email },
          { name: member.name }
        ]
      }
    })

    if (!user) {
      // Create user as COACH
      user = await prisma.user.create({
        data: {
          email: member.email,
          name: member.name,
          role: 'COACH',
          language: 'sv',
        }
      })
      console.log(`Created user: ${member.name} (${member.email})`)
    } else {
      // Update to COACH role if not already
      if (user.role !== 'COACH' && user.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'COACH' }
        })
        console.log(`Updated ${member.name} to COACH role`)
      } else {
        console.log(`Found existing user: ${member.name} (${user.email})`)
      }
    }

    // Add as business member
    await prisma.businessMember.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: member.role,
        isActive: true,
        acceptedAt: new Date(),
      }
    })
    console.log(`  -> Added as ${member.role}`)
  }

  // Also create Tester entries for test leader selection
  console.log('\nCreating Tester entries for test leader selection...')

  for (const member of TEAM_MEMBERS) {
    const user = await prisma.user.findFirst({
      where: { name: member.name }
    })

    if (!user) continue

    // Check if tester entry exists
    const existingTester = await prisma.tester.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { name: member.name, businessId: business.id }
        ]
      }
    })

    if (!existingTester) {
      await prisma.tester.create({
        data: {
          businessId: business.id,
          userId: user.id,
          name: member.name,
          email: user.email,
          title: member.role === 'OWNER' ? 'VD & Fysiolog' : 'Fysiolog',
          isActive: true,
        }
      })
      console.log(`  Created tester entry: ${member.name}`)
    } else {
      // Update to link to business
      await prisma.tester.update({
        where: { id: existingTester.id },
        data: { businessId: business.id }
      })
      console.log(`  Updated tester entry: ${member.name}`)
    }
  }

  // Show final state
  const finalBusiness = await prisma.business.findFirst({
    where: { slug: 'star-by-thomson' },
    include: {
      members: {
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { role: 'asc' }
      },
      testers: {
        select: { name: true, title: true, isActive: true }
      }
    }
  })

  console.log('\n========================================')
  console.log('STAR BY THOMSON - FINAL STATE')
  console.log('========================================')
  console.log('\nBusiness Members (Admin Panel):')
  finalBusiness?.members.forEach(m => {
    console.log(`  ${m.role.padEnd(8)} ${m.user.name} (${m.user.role})`)
  })

  console.log('\nTesters (Test Leader Selection):')
  finalBusiness?.testers.forEach(t => {
    console.log(`  ${t.name} - ${t.title || 'Fysiolog'}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
