/**
 * Test script for coach alerts
 * Run with: npx tsx scripts/test-coach-alerts.ts
 */

import { PrismaClient } from '@prisma/client'

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Testing Coach Alerts Detection\n')

  // Find a coach with athletes
  const coach = await prisma.user.findFirst({
    where: {
      role: 'COACH',
      clients: {
        some: {
          athleteAccount: { isNot: null },
        },
      },
    },
    include: {
      clients: {
        where: {
          athleteAccount: { isNot: null },
        },
        select: {
          id: true,
          name: true,
        },
        take: 5,
      },
    },
  })

  if (!coach) {
    console.log('❌ No coach with athletes found')
    return
  }

  console.log(`Found coach: ${coach.name} (${coach.email})`)
  console.log(`Athletes: ${coach.clients.map((c) => c.name).join(', ')}\n`)

  // Check for existing alerts
  const existingAlerts = await prisma.coachAlert.findMany({
    where: { coachId: coach.id },
    include: {
      client: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  console.log(`📋 Existing alerts: ${existingAlerts.length}`)
  for (const alert of existingAlerts) {
    console.log(`  • [${alert.severity}] ${alert.alertType}: ${alert.client.name} - ${alert.title}`)
  }
  console.log('')

  // Run detection for each athlete
  console.log('🔎 Running detection checks...\n')

  for (const client of coach.clients) {
    console.log(`\n--- ${client.name} ---`)

    // Check daily check-ins
    const recentCheckIns = await prisma.dailyCheckIn.findMany({
      where: { clientId: client.id },
      orderBy: { date: 'desc' },
      take: 7,
      select: {
        date: true,
        readinessScore: true,
      },
    })
    console.log(`  Check-ins (last 7): ${recentCheckIns.length}`)
    if (recentCheckIns.length > 0) {
      console.log(`    Latest: ${recentCheckIns[0].date.toISOString().split('T')[0]}, readiness: ${recentCheckIns[0].readinessScore}`)
    }

    // Check for low readiness trend
    const lowReadiness = recentCheckIns
      .slice(0, 3)
      .filter((c) => c.readinessScore !== null && c.readinessScore < 5.5)
    if (lowReadiness.length >= 3) {
      console.log(`  ⚠️  Low readiness for 3+ days!`)
    }

    // Check missed workouts
    const now = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const missedStrength = await prisma.strengthSessionAssignment.count({
      where: {
        athleteId: client.id,
        status: 'PENDING',
        assignedDate: { gte: threeDaysAgo, lt: now },
      },
    })

    const missedCardio = await prisma.cardioSessionAssignment.count({
      where: {
        athleteId: client.id,
        status: 'PENDING',
        assignedDate: { gte: threeDaysAgo, lt: now },
      },
    })

    if (missedStrength + missedCardio > 0) {
      console.log(`  ⚠️  Missed workouts: ${missedStrength} strength, ${missedCardio} cardio`)
    } else {
      console.log(`  ✅ No missed workouts`)
    }

    // Check pain mentions
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const painMentions = await prisma.conversationMemory.findMany({
      where: {
        clientId: client.id,
        memoryType: 'INJURY_MENTION',
        extractedAt: { gte: sevenDaysAgo },
      },
    })

    if (painMentions.length > 0) {
      console.log(`  ⚠️  Pain mentions: ${painMentions.length}`)
      for (const m of painMentions) {
        console.log(`    - "${m.content}"`)
      }
    } else {
      console.log(`  ✅ No pain mentions`)
    }

    // Check ACWR
    const recentLoad = await prisma.trainingLoad.findFirst({
      where: {
        clientId: client.id,
        acwr: { not: null },
      },
      orderBy: { date: 'desc' },
      select: { acwr: true, injuryRisk: true },
    })

    if (recentLoad?.acwr) {
      const risk = recentLoad.acwr > 1.5 ? '⚠️ HIGH' : '✅ OK'
      console.log(`  ACWR: ${recentLoad.acwr.toFixed(2)} (${recentLoad.injuryRisk}) ${risk}`)
    } else {
      console.log(`  ACWR: No data`)
    }
  }

  // Create a test alert if none exist
  if (existingAlerts.length === 0 && coach.clients.length > 0) {
    console.log('\n📝 Creating test alert...')

    const testClient = coach.clients[0]

    await prisma.coachAlert.create({
      data: {
        coachId: coach.id,
        clientId: testClient.id,
        alertType: 'READINESS_DROP',
        severity: 'MEDIUM',
        title: `${testClient.name}: Test alert`,
        message: `Detta är en testalert för att verifiera att systemet fungerar.`,
        contextData: {
          test: true,
          createdBy: 'test-script',
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    console.log(`✅ Created test alert for ${testClient.name}`)
  }

  console.log('\n─'.repeat(50))
  console.log('\n🎉 Test complete!')
  console.log('Visit /coach/dashboard to see the AI Assistant panel.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
