import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const total = await prisma.exercise.count({ where: { coachId: null } })
  const hybrid = await prisma.exercise.count({ where: { isHybridMovement: true, coachId: null } })
  const pillar = await prisma.exercise.count({ where: { biomechanicalPillar: { not: null }, coachId: null } })

  console.log('📊 Exercise Library Stats:')
  console.log(`   Total system exercises: ${total}`)
  console.log(`   With isHybridMovement (Hybrid Studio): ${hybrid}`)
  console.log(`   With biomechanicalPillar (Strength Studio): ${pillar}`)

  // Check a few sample exercises
  const samples = await prisma.exercise.findMany({
    where: { coachId: null },
    take: 5,
    select: { name: true, biomechanicalPillar: true, isHybridMovement: true }
  })
  console.log('\n📋 Sample exercises:')
  samples.forEach(e => console.log(`   ${e.name}: pillar=${e.biomechanicalPillar}, hybrid=${e.isHybridMovement}`))
}

main().finally(() => prisma.$disconnect())
