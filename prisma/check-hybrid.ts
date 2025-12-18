import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    const total = await prisma.exercise.count();
    const hybrid = await prisma.exercise.count({ where: { isHybridMovement: true } });
    console.log('Total exercises:', total);
    console.log('Hybrid movements (isHybridMovement=true):', hybrid);

    // Check a few exercises
    const sample = await prisma.exercise.findMany({
      take: 5,
      select: {
        name: true,
        isHybridMovement: true,
        movementCategory: true
      }
    });
    console.log('\nSample exercises:');
    sample.forEach(e => console.log(`  - ${e.name}: hybrid=${e.isHybridMovement}, category=${e.movementCategory}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
