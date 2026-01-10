/**
 * Test script for morning briefing generation
 * Run with: npx tsx scripts/test-briefing.ts
 */

import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import crypto from 'crypto'

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

const prisma = new PrismaClient()

// Inline decryption logic (to avoid server-only imports)
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
    return ciphertext // Backwards compatibility
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

interface BriefingContext {
  athleteName: string
  readinessScore?: number
  sleepHours?: number
  sleepQuality?: number
  fatigue?: number
  soreness?: number
  todaysWorkout?: { name: string; type: string }
  recentMemories?: string[]
}

async function buildBriefingContext(clientId: string): Promise<BriefingContext | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      dailyCheckIns: {
        orderBy: { date: 'desc' },
        take: 1,
        where: {
          date: { gte: new Date(today.getTime() - 48 * 60 * 60 * 1000) },
        },
        select: {
          sleepQuality: true,
          sleepHours: true,
          fatigue: true,
          soreness: true,
          mood: true,
        },
      },
      conversationMemories: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { importance: 'desc' },
        take: 5,
        select: { content: true },
      },
    },
  })

  if (!client) return null

  const checkIn = client.dailyCheckIns[0]
  let readinessScore: number | undefined
  if (checkIn) {
    const scores = []
    if (checkIn.fatigue) scores.push(11 - checkIn.fatigue)
    if (checkIn.soreness) scores.push(11 - checkIn.soreness)
    if (checkIn.mood) scores.push(checkIn.mood)
    if (checkIn.sleepQuality) scores.push(checkIn.sleepQuality)
    if (scores.length > 0) {
      readinessScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }

  return {
    athleteName: client.name.split(' ')[0],
    readinessScore,
    sleepHours: checkIn?.sleepHours ?? undefined,
    sleepQuality: checkIn?.sleepQuality ?? undefined,
    fatigue: checkIn?.fatigue ?? undefined,
    soreness: checkIn?.soreness ?? undefined,
    recentMemories: client.conversationMemories.map((m) => m.content),
  }
}

function buildBriefingPrompt(context: BriefingContext): string {
  let dataSection = ''
  if (context.readinessScore !== undefined) dataSection += `\n- Readiness-poäng: ${context.readinessScore.toFixed(1)}/10`
  if (context.sleepHours !== undefined) dataSection += `\n- Sömn: ${context.sleepHours} timmar`
  if (context.sleepQuality !== undefined) dataSection += `\n- Sömnkvalitet: ${context.sleepQuality}/10`
  if (context.fatigue !== undefined) dataSection += `\n- Trötthet: ${context.fatigue}/10`
  if (context.soreness !== undefined) dataSection += `\n- Muskelömhet: ${context.soreness}/10`

  let memorySection = ''
  if (context.recentMemories && context.recentMemories.length > 0) {
    memorySection = `\nVIKTIGT ATT KOMMA IHÅG:\n${context.recentMemories.map((m) => `- ${m}`).join('\n')}`
  }

  return `Generera en personlig morgonbriefing för atleten ${context.athleteName}.

ATLETENS DATA IDAG:${dataSection || '\n- Ingen check-in-data tillgänglig'}
${memorySection}

INSTRUKTIONER:
1. Skriv en kort, personlig morgonhälsning (max 2-3 meningar)
2. Lyft fram det viktigaste för dagen
3. Ge 1-3 konkreta tips baserat på data
4. Var uppmuntrande men realistisk

SVARA I JSON-FORMAT (ENDAST JSON, inget annat):
{
  "title": "God morgon ${context.athleteName}!",
  "content": "Kort personlig briefing här...",
  "highlights": ["Punkt 1", "Punkt 2"],
  "alerts": []
}

TONALITET: Vänlig, personlig, motiverande.`
}

async function main() {
  console.log('🔍 Finding athletes with accounts...\n')

  const athletes = await prisma.client.findMany({
    where: { athleteAccount: { isNot: null } },
    take: 5,
    select: {
      id: true,
      name: true,
      userId: true,
      dailyCheckIns: { take: 1, orderBy: { date: 'desc' } },
      conversationMemories: { take: 3 },
    },
  })

  if (athletes.length === 0) {
    console.log('❌ No athletes found with accounts')
    return
  }

  console.log(`Found ${athletes.length} athletes:\n`)
  athletes.forEach((a, i) => {
    console.log(`${i + 1}. ${a.name} (ID: ${a.id.slice(0, 8)}...)`)
    console.log(`   - Check-ins: ${a.dailyCheckIns.length}`)
    console.log(`   - Memories: ${a.conversationMemories.length}`)
  })

  const testAthlete = athletes[0]
  console.log(`\n📋 Testing with: ${testAthlete.name}\n`)

  // Build context
  console.log('Building briefing context...')
  const context = await buildBriefingContext(testAthlete.id)

  if (!context) {
    console.log('❌ Could not build context')
    return
  }

  console.log('\n📊 Context built:')
  console.log(`   - Athlete: ${context.athleteName}`)
  console.log(`   - Readiness: ${context.readinessScore?.toFixed(1) ?? 'N/A'}`)
  console.log(`   - Sleep: ${context.sleepHours ?? 'N/A'} hours`)
  console.log(`   - Memories: ${context.recentMemories?.length ?? 0}`)

  // Get coach's Google API key
  console.log('\n🔑 Getting Google API key...')
  const apiKeys = await prisma.userApiKey.findUnique({
    where: { userId: testAthlete.userId },
    select: { googleKeyEncrypted: true, googleKeyValid: true },
  })

  if (!apiKeys?.googleKeyEncrypted || !apiKeys.googleKeyValid) {
    console.log('❌ No valid Google API key found for coach')
    return
  }

  const googleKey = decryptSecret(apiKeys.googleKeyEncrypted)
  console.log('✅ Google API key found\n')

  // Generate AI briefing with Gemini
  console.log('🤖 Generating AI briefing with Gemini...\n')

  const genAI = new GoogleGenerativeAI(googleKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = buildBriefingPrompt(context)
  const result = await model.generateContent(prompt)
  const responseText = result.response.text()

  // Parse JSON
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.log('❌ Could not parse JSON from response')
    console.log('Raw response:', responseText)
    return
  }

  const briefing = JSON.parse(jsonMatch[0])

  console.log('✅ Briefing generated:\n')
  console.log('─'.repeat(50))
  console.log(`📌 ${briefing.title}`)
  console.log('─'.repeat(50))
  console.log(briefing.content)
  console.log('')

  if (briefing.highlights?.length > 0) {
    console.log('💡 Highlights:')
    briefing.highlights.forEach((h: string) => console.log(`   • ${h}`))
  }

  if (briefing.alerts?.length > 0) {
    console.log('\n⚠️  Alerts:')
    briefing.alerts.forEach((a: { type: string; message: string }) =>
      console.log(`   [${a.type}] ${a.message}`)
    )
  }
  console.log('─'.repeat(50))

  // Save to database
  console.log('\n💾 Saving to database...')
  const saved = await prisma.aIBriefing.create({
    data: {
      clientId: testAthlete.id,
      briefingType: 'MORNING',
      title: briefing.title,
      content: briefing.content,
      highlights: briefing.highlights || [],
      readinessScore: context.readinessScore,
      alerts: briefing.alerts || [],
      quickActions: [
        { label: 'Logga träning', action: 'log_workout' },
        { label: 'Chatta med AI', action: 'open_chat' },
      ],
      scheduledFor: new Date(),
      modelUsed: 'gemini-2.0-flash',
    },
  })

  console.log(`✅ Saved with ID: ${saved.id}`)
  console.log('\n🎉 Test complete! The athlete can now see this briefing on their dashboard.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
