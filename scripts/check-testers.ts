import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find all testers
  const testers = await prisma.tester.findMany({
    include: { user: { select: { id: true, email: true, name: true } } }
  })
  console.log('Existing Testers:', testers.length)
  testers.forEach(t => console.log('  -', t.name, t.email || '(no email)', t.userId ? 'linked to user' : 'no user'))

  // Find the Star by Thomson business
  const business = await prisma.business.findFirst({ where: { slug: 'star-by-thomson' } })
  if (!business) {
    console.log('Business not found')
    return
  }

  // Link testers to the business
  for (const tester of testers) {
    if (!tester.businessId) {
      await prisma.tester.update({
        where: { id: tester.id },
        data: { businessId: business.id }
      })
      console.log('Linked tester', tester.name, 'to Star by Thomson')
    }
  }

  // Check all users to find more potential coaches
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  })
  console.log('\nAll Users:', allUsers.length)
  allUsers.forEach(u => console.log('  -', u.name || u.email, '(' + u.role + ')'))

  // Show final business state
  const finalBusiness = await prisma.business.findFirst({
    where: { slug: 'star-by-thomson' },
    include: {
      members: {
        include: { user: { select: { name: true, email: true } } }
      },
      testers: { select: { name: true, email: true } },
      _count: { select: { members: true, testers: true, locations: true } }
    }
  })

  console.log('\n=== Star by Thomson Business ===')
  console.log('ID:', finalBusiness?.id)
  console.log('Members:', finalBusiness?._count.members)
  console.log('Testers:', finalBusiness?._count.testers)
  console.log('Locations:', finalBusiness?._count.locations)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
