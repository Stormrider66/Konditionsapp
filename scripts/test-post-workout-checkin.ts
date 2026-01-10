/**
 * Test script for post-workout check-in
 * Run with: npx tsx scripts/test-post-workout-checkin.ts
 */

import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'
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

function buildCheckInPrompt(athleteName: string, workoutName: string, workoutType: string): string {
  return `Generera en kort, personlig post-workout check-in för atleten ${athleteName}.

GENOMFÖRT TRÄNINGSPASS:
- Pass: ${workoutName}
- Typ: ${workoutType}
- Avslutat för: 45 minuter sedan

INSTRUKTIONER:
1. Skriv en kort gratulation/uppmuntran (1 mening)
2. Ställ 2-3 korta frågor om hur passet kändes
3. Fråga om eventuell smärta eller obehag
4. Ge ett kort återhämtningstips anpassat för träningstypen

SVARA I JSON-FORMAT (ENDAST JSON, inget annat):
{
  "title": "Kort rubrik (max 5 ord)",
  "greeting": "Gratulation/uppmuntran här...",
  "questions": [
    "Fråga 1?",
    "Fråga 2?",
    "Fråga 3?"
  ],
  "recoveryTip": "Återhämtningstips här..."
}

TONALITET: Uppmuntrande, intresserad, stöttande.`
}

async function main() {
  console.log('🏋️ Testing Post-Workout Check-in\n')

  // Find an athlete
  const athlete = await prisma.client.findFirst({
    where: { athleteAccount: { isNot: null } },
    select: { id: true, name: true, userId: true },
  })

  if (!athlete) {
    console.log('❌ No athlete found')
    return
  }

  console.log(`Found athlete: ${athlete.name}\n`)

  // Mock workout data
  const mockWorkout = {
    id: 'test-workout-' + Date.now(),
    name: 'Styrkepass: Överkropp',
    type: 'STRENGTH',
    completedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
  }

  console.log(`📋 Mock workout: ${mockWorkout.name}`)
  console.log(`   Type: ${mockWorkout.type}`)
  console.log(`   Completed: ${mockWorkout.completedAt.toLocaleTimeString('sv-SE')}\n`)

  // Get Google API key
  console.log('🔑 Getting Google API key...')
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId: athlete.userId },
    select: { googleKeyEncrypted: true, googleKeyValid: true },
  })

  if (!apiKeys?.googleKeyEncrypted || !apiKeys.googleKeyValid) {
    console.log('❌ No valid Google API key found')
    return
  }

  const googleKey = decryptSecret(apiKeys.googleKeyEncrypted)
  console.log('✅ Google API key found\n')

  // Generate AI check-in prompt
  console.log('🤖 Generating AI check-in prompt with Gemini...\n')

  const genAI = new GoogleGenerativeAI(googleKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = buildCheckInPrompt(
    athlete.name.split(' ')[0],
    mockWorkout.name,
    mockWorkout.type
  )

  const result = await model.generateContent(prompt)
  const responseText = result.response.text()

  // Parse JSON
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.log('❌ Could not parse JSON from response')
    console.log('Raw response:', responseText)
    return
  }

  const checkIn = JSON.parse(jsonMatch[0])

  console.log('✅ Check-in generated:\n')
  console.log('─'.repeat(50))
  console.log(`📋 ${checkIn.title}`)
  console.log('─'.repeat(50))
  console.log(checkIn.greeting)

  if (checkIn.questions?.length > 0) {
    console.log('\n❓ Questions:')
    checkIn.questions.forEach((q: string, i: number) => console.log(`   ${i + 1}. ${q}`))
  }

  console.log(`\n💡 Recovery tip: ${checkIn.recoveryTip}`)
  console.log('─'.repeat(50))

  // Save notification to database
  console.log('\n💾 Saving check-in notification to database...')

  const notification = await prisma.aINotification.create({
    data: {
      clientId: athlete.id,
      notificationType: 'POST_WORKOUT_CHECK',
      priority: 'NORMAL',
      title: checkIn.title,
      message: checkIn.greeting,
      icon: 'clipboard-check',
      actionUrl: `/athlete/feedback/${mockWorkout.id}`,
      actionLabel: 'Ge feedback',
      contextData: {
        workoutId: mockWorkout.id,
        workoutType: mockWorkout.type,
        workoutName: mockWorkout.name,
        completedAt: mockWorkout.completedAt.toISOString(),
        questions: checkIn.questions || [],
        recoveryTip: checkIn.recoveryTip || '',
      },
      triggeredBy: mockWorkout.id,
      triggerReason: `Test post-workout check-in for ${mockWorkout.name}`,
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    },
  })

  console.log(`✅ Saved with ID: ${notification.id}`)
  console.log('\n🎉 Test complete! The athlete can now see the check-in form on their dashboard.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
