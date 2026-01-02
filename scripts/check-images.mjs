import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const exercises = await prisma.exercise.findMany({
    select: { id: true, name: true, nameSv: true, biomechanicalPillar: true, imageUrls: true },
    orderBy: [{ biomechanicalPillar: 'asc' }, { name: 'asc' }]
  })

  console.log('TOTAL EXERCISES:', exercises.length)
  console.log('')

  const withImages = exercises.filter(e => e.imageUrls && e.imageUrls.length > 0)
  const withoutImages = exercises.filter(e => !e.imageUrls || e.imageUrls.length === 0)

  console.log('WITH IMAGES:', withImages.length)
  console.log('WITHOUT IMAGES:', withoutImages.length)
  console.log('')

  console.log('=== EXERCISES WITH IMAGES ===')
  let currentPillar = ''
  for (const e of withImages) {
    if (e.biomechanicalPillar !== currentPillar) {
      currentPillar = e.biomechanicalPillar
      console.log('\n[' + currentPillar + ']')
    }
    console.log('  ✅', e.nameSv || e.name, '-', e.imageUrls.length, 'image(s)')
  }

  console.log('\n=== EXERCISES WITHOUT IMAGES ===')
  currentPillar = ''
  for (const e of withoutImages) {
    if (e.biomechanicalPillar !== currentPillar) {
      currentPillar = e.biomechanicalPillar
      console.log('\n[' + currentPillar + ']')
    }
    console.log('  ❌', e.nameSv || e.name)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
