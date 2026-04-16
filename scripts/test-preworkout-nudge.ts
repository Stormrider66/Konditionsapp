/**
 * Test script for pre-workout nudge generation
 * Run with: npx tsx scripts/test-preworkout-nudge.ts
 */

import { PrismaClient } from '@prisma/client'
import { GoogleGenAI } from '@google/genai'
import crypto from 'crypto'

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

const prisma = new PrismaClient()

// Inline decryption logic
const PREFIX = 'enc:v1:'

function getKey(): Buffer {
  const raw = process.env.API_KEY_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('API_KEY_ENCRYPTION_KEY is not configured')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('API_KEY_ENCRYPTION_KEY must decode to 32 bytes')
  }
  return key
}

function decryptSecret(ciphertext: string): string {
  if (!ciphertext.startsWith(PREFIX)) {
    return ciphertext
  }
  const key = getKey()
  const parts = ciphertext.slice(PREFIX.length).split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format')

  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()])
  return plaintext.toString('utf8')
}

interface NudgeContext {
  athleteName: string
  workoutName: string
  workoutType: string
  timeUntilWorkout: number
  readinessScore?: number
  fatigue?: number
  soreness?: number
}

function buildNudgePrompt(context: NudgeContext): string {
  const hoursUntil = Math.floor(context.timeUntilWorkout / 60)
  const minutesUntil = context.timeUntilWorkout % 60
  const timeString = hoursUntil > 0
    ? `${hoursUntil} timme${hoursUntil > 1 ? 'r' : ''} och ${minutesUntil} minuter`
    : `${minutesUntil} minuter`

  let readinessSection = ''
  if (context.readinessScore !== undefined) {
    readinessSection += `\n- Readiness-poäng: ${context.readinessScore.toFixed(1)}/10`
  }
  if (context.fatigue !== undefined) {
    readinessSection += `\n- Trötthet: ${context.fatigue}/10`
  }
  if (context.soreness !== undefined) {
    readinessSection += `\n- Muskelömhet: ${context.soreness}/10`
  }

  return `Generera en kort, motiverande pre-workout påminnelse för atleten ${context.athleteName}.

KOMMANDE TRÄNING:
- Pass: ${context.workoutName}
- Typ: ${context.workoutType}
- Tid kvar: ${timeString}

ATLETENS STATUS:${readinessSection || '\n- Ingen check-in data tillgänglig'}

INSTRUKTIONER:
1. Skriv en kort, personlig påminnelse (max 2-3 meningar)
2. Ge 1-2 förberedande tips baserat på träningstyp
3. Var uppmuntrande men fokuserad

SVARA I JSON-FORMAT (ENDAST JSON, inget annat):
{
  "title": "Kort rubrik här",
  "message": "Personlig påminnelse här...",
  "tips": ["Tips 1", "Tips 2"]
}

TONALITET: Energisk, stöttande, fokuserad.`
}

async function main() {
  console.log('🏋️ Testing Pre-Workout Nudge Generation\n')

  // Find an athlete with an account
  const athlete = await prisma.client.findFirst({
    where: { athleteAccount: { isNot: null } },
    select: {
      id: true,
      name: true,
      userId: true,
      dailyCheckIns: {
        orderBy: { date: 'desc' },
        take: 1,
        select: {
          fatigue: true,
          soreness: true,
          mood: true,
          sleepQuality: true,
        },
      },
    },
  })

  if (!athlete) {
    console.log('❌ No athlete found with an account')
    return
  }

  console.log(`Found athlete: ${athlete.name}\n`)

  // Check for any existing workout assignments
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Check for strength assignments
  const strengthAssignment = await prisma.strengthSessionAssignment.findFirst({
    where: {
      athleteId: athlete.id,
      assignedDate: { gte: today, lt: tomorrow },
      status: { in: ['PENDING', 'SCHEDULED'] },
    },
    include: { session: { select: { name: true } } },
  })

  // Check for cardio assignments
  const cardioAssignment = await prisma.cardioSessionAssignment.findFirst({
    where: {
      athleteId: athlete.id,
      assignedDate: { gte: today, lt: tomorrow },
      status: { in: ['PENDING', 'SCHEDULED'] },
    },
    include: { session: { select: { name: true } } },
  })

  // Check for hybrid assignments
  const hybridAssignment = await prisma.hybridWorkoutAssignment.findFirst({
    where: {
      athleteId: athlete.id,
      assignedDate: { gte: today, lt: tomorrow },
      status: { in: ['PENDING', 'SCHEDULED'] },
    },
    include: { workout: { select: { name: true } } },
  })

  let workoutName = 'Morning Strength Session'
  let workoutType = 'STRENGTH'

  if (strengthAssignment) {
    workoutName = strengthAssignment.session.name
    workoutType = 'STRENGTH'
    console.log(`📅 Found strength assignment: ${workoutName}`)
  } else if (cardioAssignment) {
    workoutName = cardioAssignment.session.name
    workoutType = 'CARDIO'
    console.log(`📅 Found cardio assignment: ${workoutName}`)
  } else if (hybridAssignment) {
    workoutName = hybridAssignment.workout.name
    workoutType = 'HYBRID'
    console.log(`📅 Found hybrid assignment: ${workoutName}`)
  } else {
    console.log('📅 No workout assignments found - using mock data for testing')
  }

  // Calculate readiness from check-in
  const checkIn = athlete.dailyCheckIns[0]
  let readinessScore: number | undefined
  if (checkIn) {
    const scores: number[] = []
    if (checkIn.fatigue) scores.push(11 - checkIn.fatigue)
    if (checkIn.soreness) scores.push(11 - checkIn.soreness)
    if (checkIn.mood) scores.push(checkIn.mood)
    if (checkIn.sleepQuality) scores.push(checkIn.sleepQuality)
    if (scores.length > 0) {
      readinessScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }

  console.log(`\n📊 Context:`)
  console.log(`   - Athlete: ${athlete.name.split(' ')[0]}`)
  console.log(`   - Workout: ${workoutName}`)
  console.log(`   - Type: ${workoutType}`)
  console.log(`   - Readiness: ${readinessScore?.toFixed(1) ?? 'N/A'}`)

  // Get coach's Google API key
  console.log('\n🔑 Getting Google API key...')
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId: athlete.userId },
    select: { googleKeyEncrypted: true, googleKeyValid: true },
  })

  if (!apiKeys?.googleKeyEncrypted || !apiKeys.googleKeyValid) {
    console.log('❌ No valid Google API key found for coach')
    return
  }

  const googleKey = decryptSecret(apiKeys.googleKeyEncrypted)
  console.log('✅ Google API key found\n')

  // Generate AI nudge
  console.log('🤖 Generating AI pre-workout nudge with Gemini...\n')

  const ai = new GoogleGenAI({ apiKey: googleKey })

  const context: NudgeContext = {
    athleteName: athlete.name.split(' ')[0],
    workoutName,
    workoutType,
    timeUntilWorkout: 90, // 1.5 hours
    readinessScore,
    fatigue: checkIn?.fatigue ?? undefined,
    soreness: checkIn?.soreness ?? undefined,
  }

  const prompt = buildNudgePrompt(context)
  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  })
  const responseText = result.text ?? ''

  // Parse JSON
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.log('❌ Could not parse JSON from response')
    console.log('Raw response:', responseText)
    return
  }

  const nudge = JSON.parse(jsonMatch[0])

  console.log('✅ Nudge generated:\n')
  console.log('─'.repeat(50))
  console.log(`⚡ ${nudge.title}`)
  console.log('─'.repeat(50))
  console.log(nudge.message)

  if (nudge.tips?.length > 0) {
    console.log('\n💡 Preparation Tips:')
    nudge.tips.forEach((tip: string) => console.log(`   • ${tip}`))
  }
  console.log('─'.repeat(50))

  // Save to database
  console.log('\n💾 Saving notification to database...')
  const notification = await prisma.aINotification.create({
    data: {
      clientId: athlete.id,
      notificationType: 'PRE_WORKOUT',
      priority: 'NORMAL',
      title: nudge.title,
      message: nudge.message,
      icon: 'dumbbell',
      actionUrl: '/athlete/training',
      actionLabel: 'Visa träning',
      contextData: {
        workoutName,
        workoutType,
        tips: nudge.tips || [],
        scheduledFor: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      },
      triggeredBy: 'test-script',
      triggerReason: `Test pre-workout nudge for ${workoutName}`,
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // Expire in 3 hours
    },
  })

  console.log(`✅ Saved with ID: ${notification.id}`)
  console.log('\n🎉 Test complete! The athlete can now see this nudge on their dashboard.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
