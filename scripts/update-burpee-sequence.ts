
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const burpeeImages = [
        '/images/knee-dominance/burpee-1.png', // Crouch
        '/images/knee-dominance/burpee-2.png', // Push-up
        '/images/knee-dominance/burpee-3.png'  // Jump
    ]

    // Find Burpee exercise
    // Note: Searching by nameSv 'Burpee' primarily, but also checking name 'Burpee'
    const exercises = await prisma.exercise.findMany({
        where: {
            OR: [
                { nameSv: { equals: 'Burpee', mode: 'insensitive' } },
                { name: { equals: 'Burpee', mode: 'insensitive' } }
            ]
        }
    })

    console.log(`Found ${exercises.length} exercises matching 'Burpee'`)

    for (const exercise of exercises) {
        console.log(`Updating exercise: ${exercise.name} (${exercise.id})`)
        await prisma.exercise.update({
            where: { id: exercise.id },
            data: {
                imageUrls: burpeeImages
            }
        })
        console.log(`Updated images to: ${JSON.stringify(burpeeImages)}`)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
