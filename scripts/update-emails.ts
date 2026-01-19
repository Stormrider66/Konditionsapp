import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const updates = [
    { name: 'Stefan Thomson', email: 'starstefan@thomsons.se' },
    { name: 'Henrik Lundholm', email: 'starhenrik@thomsons.se' },
    { name: 'Elias Ståhl', email: 'starelias@thomsons.se' },
    { name: 'Tommy Henriksson', email: 'startommy@thomsons.se' },
  ]

  console.log('Updating emails...\n')

  for (const u of updates) {
    // Find and update user (COACH role, from Star by Thomson)
    const user = await prisma.user.findFirst({
      where: { name: u.name, role: 'COACH' }
    })

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: u.email }
      })
      console.log(`User: ${u.name} -> ${u.email}`)
    }

    // Update tester
    const tester = await prisma.tester.findFirst({
      where: { name: u.name }
    })

    if (tester) {
      await prisma.tester.update({
        where: { id: tester.id },
        data: { email: u.email }
      })
      console.log(`Tester: ${u.name} -> ${u.email}`)
    }
  }

  // Update business email
  await prisma.business.update({
    where: { slug: 'star-by-thomson' },
    data: { email: 'info@thomsons.se' }
  })
  console.log('\nBusiness email -> info@thomsons.se')

  // Show final state
  console.log('\n=== Final State ===')
  const testers = await prisma.tester.findMany({
    where: { business: { slug: 'star-by-thomson' } },
    select: { name: true, email: true }
  })
  testers.forEach(t => console.log(`${t.name}: ${t.email}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
