// Quick script to check if exercises are seeded
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.exercise.count()
  console.log(`Total exercises in database: ${count}`)

  if (count > 0) {
    const exercises = await prisma.exercise.findMany({
      take: 5,
      select: { name: true, category: true }
    })
    console.log('\nSample exercises:')
    exercises.forEach(ex => console.log(`  - ${ex.name} (${ex.category})`))
  } else {
    console.log('No exercises found. Run: npx ts-node prisma/seed-exercises.ts')
  }
}

main()
  .finally(() => prisma.$disconnect())
