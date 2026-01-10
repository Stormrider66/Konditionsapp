/**
 * Test script for milestone detection
 * Run with: npx tsx scripts/test-milestone-detection.ts
 */

import { PrismaClient } from '@prisma/client'

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

const prisma = new PrismaClient()

// Milestone types
type MilestoneType =
  | 'PERSONAL_RECORD'
  | 'CONSISTENCY_STREAK'
  | 'WORKOUT_COUNT'
  | 'TRAINING_ANNIVERSARY'

interface DetectedMilestone {
  type: MilestoneType
  title: string
  description: string
  value?: number
  unit?: string
  celebrationLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  icon: string
}

async function main() {
  console.log('🏆 Testing Milestone Detection\n')

  // Find an athlete
  const athlete = await prisma.client.findFirst({
    where: { athleteAccount: { isNot: null } },
    select: { id: true, name: true },
  })

  if (!athlete) {
    console.log('❌ No athlete found')
    return
  }

  console.log(`Found athlete: ${athlete.name}\n`)

  // Create test milestones
  const testMilestones: DetectedMilestone[] = [
    {
      type: 'WORKOUT_COUNT',
      title: '50 träningar!',
      description: 'Du har genomfört 50 träningspass! Fantastisk uthållighet!',
      value: 50,
      unit: 'träningar',
      celebrationLevel: 'SILVER',
      icon: 'award',
    },
    {
      type: 'CONSISTENCY_STREAK',
      title: '7 dagar i rad!',
      description: 'En hel vecka med konsekvent träning - imponerande!',
      value: 7,
      unit: 'dagar',
      celebrationLevel: 'SILVER',
      icon: 'flame',
    },
    {
      type: 'PERSONAL_RECORD',
      title: 'Nytt PR: Bänkpress!',
      description: '80 kg x 8 reps - Du har slagit ditt tidigare rekord!',
      value: 80,
      unit: 'kg',
      celebrationLevel: 'GOLD',
      icon: 'trophy',
    },
  ]

  console.log('📊 Creating test milestones...\n')

  for (const milestone of testMilestones) {
    console.log(`  • ${milestone.title} (${milestone.celebrationLevel})`)

    // Check if already exists
    const existing = await prisma.aINotification.findFirst({
      where: {
        clientId: athlete.id,
        notificationType: 'MILESTONE',
        triggeredBy: `${milestone.type}:${milestone.value}`,
      },
    })

    if (existing) {
      console.log(`    → Already exists, skipping`)
      continue
    }

    // Create notification
    const notification = await prisma.aINotification.create({
      data: {
        clientId: athlete.id,
        notificationType: 'MILESTONE',
        priority: milestone.celebrationLevel === 'PLATINUM' ? 'HIGH' : 'NORMAL',
        title: milestone.title,
        message: milestone.description,
        icon: milestone.icon,
        contextData: {
          milestoneType: milestone.type,
          value: milestone.value,
          unit: milestone.unit,
          celebrationLevel: milestone.celebrationLevel,
        },
        triggeredBy: `${milestone.type}:${milestone.value}`,
        triggerReason: `Test milestone: ${milestone.type}`,
        scheduledFor: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    })

    console.log(`    ✅ Created: ${notification.id}`)
  }

  console.log('\n─'.repeat(50))
  console.log('\n🎉 Test complete! The athlete can now see milestones on their dashboard.')
  console.log('\nMilestone celebration levels:')
  console.log('  🥉 BRONZE - Minor achievements')
  console.log('  🥈 SILVER - Notable achievements')
  console.log('  🥇 GOLD   - Major achievements')
  console.log('  💎 PLATINUM - Epic achievements')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
