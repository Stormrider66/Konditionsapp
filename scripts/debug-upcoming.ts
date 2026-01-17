import { PrismaClient } from '@prisma/client'
import { addDays, startOfDay, endOfDay, format } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  const now = new Date()
  console.log('Current time:', now.toISOString())
  console.log('Current local:', format(now, 'yyyy-MM-dd HH:mm:ss EEEE'))
  console.log('')

  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const upcomingStart = addDays(todayEnd, 1)
  const upcomingEnd = addDays(todayEnd, 7)

  console.log('Today start:', todayStart.toISOString())
  console.log('Today end:', todayEnd.toISOString())
  console.log('Upcoming start:', upcomingStart.toISOString())
  console.log('Upcoming end:', upcomingEnd.toISOString())
  console.log('')

  // Get Henrik's athlete account
  const athlete = await prisma.user.findFirst({
    where: { email: 'starhenrik@thomsons.se' },
    include: { athleteAccount: true }
  })

  if (!athlete?.athleteAccount) {
    console.log('Athlete not found')
    return
  }

  console.log('Athlete:', athlete.name)
  console.log('Client ID:', athlete.athleteAccount.clientId)
  console.log('')

  // Get active programs
  const programs = await prisma.trainingProgram.findMany({
    where: {
      clientId: athlete.athleteAccount.clientId,
      isActive: true
    },
    select: { id: true, name: true, startDate: true, endDate: true }
  })

  console.log('Active programs:')
  for (const p of programs) {
    console.log(`  - ${p.name}`)
    console.log(`    Start: ${p.startDate.toISOString()}`)
    console.log(`    End: ${p.endDate.toISOString()}`)
  }
  console.log('')

  // Get all workouts for this week and next week
  const allWorkouts = await prisma.workout.findMany({
    where: {
      day: {
        date: { gte: todayStart, lte: upcomingEnd },
        week: {
          program: {
            clientId: athlete.athleteAccount.clientId,
            isActive: true
          }
        }
      }
    },
    include: {
      day: { select: { date: true, dayOfWeek: true } }
    },
    orderBy: { day: { date: 'asc' } }
  })

  console.log('All workouts from today to +7 days:')
  for (const w of allWorkouts) {
    const dayDate = w.day.date
    console.log(`  - ${format(dayDate, 'EEE dd MMM')}: ${w.name} (${w.type})`)
    console.log(`    Day date (ISO): ${dayDate.toISOString()}`)
    console.log(`    Day of week: ${w.day.dayOfWeek}`)
  }
  console.log('')

  // Specifically check for tomorrow's workout
  const tomorrow = addDays(startOfDay(now), 1)
  const tomorrowEnd = endOfDay(tomorrow)

  console.log('Tomorrow range:')
  console.log(`  Start: ${tomorrow.toISOString()}`)
  console.log(`  End: ${tomorrowEnd.toISOString()}`)

  const tomorrowWorkouts = await prisma.workout.findMany({
    where: {
      day: {
        date: { gte: tomorrow, lte: tomorrowEnd },
        week: {
          program: {
            clientId: athlete.athleteAccount.clientId,
            isActive: true
          }
        }
      }
    },
    include: {
      day: { select: { date: true } }
    }
  })

  console.log(`Tomorrow's workouts: ${tomorrowWorkouts.length}`)
  for (const w of tomorrowWorkouts) {
    console.log(`  - ${w.name}: ${w.day.date.toISOString()}`)
  }

  await prisma.$disconnect()
}

main()
