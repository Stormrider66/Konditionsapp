
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const exercises = await prisma.exercise.findMany({
        select: {
            id: true,
            name: true,
            nameSv: true,
            imageUrls: true,
            biomechanicalPillar: true
        },
        take: 100, // Increase limit
        where: {
            OR: [
                { name: { contains: 'Box', mode: 'insensitive' } },
                { nameSv: { contains: 'Lådhopp', mode: 'insensitive' } },
                { nameSv: { contains: 'Box', mode: 'insensitive' } }
            ]
        }
    })

    console.log('Total exercises fetched:', exercises.length)
    exercises.forEach(ex => {
        console.log(`[${ex.name} / ${ex.nameSv}] Pillar: ${ex.biomechanicalPillar} -> Images: ${JSON.stringify(ex.imageUrls)}`)
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
