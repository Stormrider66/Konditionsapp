import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find the Star by Thomson business
  const business = await prisma.business.findFirst({
    where: { slug: 'star-by-thomson' },
    include: { members: true }
  })

  if (!business) {
    console.log('Business not found')
    return
  }

  console.log('Business:', business.name)
  console.log('Existing members:', business.members.length)

  // Get all users
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  })

  console.log('\nAdding all users as members...')

  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i]

    // Check if already a member
    const existingMember = business.members.find(m => m.userId === user.id)
    if (existingMember) {
      console.log(`  - ${user.name || user.email} already a member (${existingMember.role})`)
      continue
    }

    // Determine role based on user role
    let memberRole = 'MEMBER'
    if (user.role === 'ADMIN') memberRole = 'ADMIN'
    if (user.role === 'COACH') memberRole = 'MEMBER'
    if (user.role === 'ATHLETE') memberRole = 'COACH'

    try {
      await prisma.businessMember.create({
        data: {
          businessId: business.id,
          userId: user.id,
          role: memberRole,
          isActive: true,
          acceptedAt: new Date(),
        }
      })
      console.log(`  + Added ${user.name || user.email} as ${memberRole}`)
    } catch (e) {
      console.log(`  ! Error adding ${user.email}:`, (e as Error).message)
    }
  }

  // Show final state
  const finalMembers = await prisma.businessMember.findMany({
    where: { businessId: business.id },
    include: { user: { select: { name: true, email: true, role: true } } }
  })

  console.log('\n=== Final Business Members ===')
  finalMembers.forEach(m => {
    console.log(`  - ${m.user.name || m.user.email} (${m.role}) [User role: ${m.user.role}]`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
