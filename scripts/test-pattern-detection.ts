/**
 * Test script for pattern detection
 * Run with: npx tsx scripts/test-pattern-detection.ts
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

// Pattern detection types
type PatternType =
  | 'SLEEP_DEGRADATION'
  | 'FATIGUE_ACCUMULATION'
  | 'SORENESS_BUILDUP'
  | 'STRESS_ESCALATION'
  | 'MOOD_DECLINE'
  | 'MOTIVATION_DROP'
  | 'OVERTRAINING_RISK'
  | 'RECOVERY_NEEDED'
  | 'POSITIVE_TREND'

interface DetectedPattern {
  type: PatternType
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  metric: string
  trend: number[]
  change: number
  description: string
}

interface CheckInData {
  date: Date
  sleepQuality: number
  sleepHours: number | null
  soreness: number
  fatigue: number
  stress: number
  mood: number
  motivation: number
  readinessScore: number | null
}

// Pattern detection functions (copied from pattern-detector.ts for standalone execution)
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }
  return denominator === 0 ? 0 : numerator / denominator
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function detectPatterns(checkIns: CheckInData[]): DetectedPattern[] {
  if (checkIns.length < 3) return []
  const patterns: DetectedPattern[] = []

  const sleepQuality = checkIns.map((c) => c.sleepQuality)
  const soreness = checkIns.map((c) => c.soreness)
  const fatigue = checkIns.map((c) => c.fatigue)
  const stress = checkIns.map((c) => c.stress)
  const mood = checkIns.map((c) => c.mood)
  const motivation = checkIns.map((c) => c.motivation)

  // Sleep Degradation
  const sleepTrend = calculateTrend(sleepQuality)
  if (sleepTrend < -0.3) {
    patterns.push({
      type: 'SLEEP_DEGRADATION',
      severity: sleepTrend < -0.6 ? 'HIGH' : sleepTrend < -0.4 ? 'MEDIUM' : 'LOW',
      metric: 'sleepQuality',
      trend: sleepQuality.slice(-5),
      change: sleepTrend,
      description: `Sömnkvalitet har försämrats de senaste ${checkIns.length} dagarna`,
    })
  }

  // Fatigue Accumulation
  const fatigueTrend = calculateTrend(fatigue)
  if (fatigueTrend > 0.3) {
    patterns.push({
      type: 'FATIGUE_ACCUMULATION',
      severity: fatigueTrend > 0.6 ? 'HIGH' : fatigueTrend > 0.4 ? 'MEDIUM' : 'LOW',
      metric: 'fatigue',
      trend: fatigue.slice(-5),
      change: fatigueTrend,
      description: `Trötthetsnivån har ökat stadigt de senaste ${checkIns.length} dagarna`,
    })
  }

  // Soreness Buildup
  const sorenessTrend = calculateTrend(soreness)
  if (sorenessTrend > 0.3) {
    patterns.push({
      type: 'SORENESS_BUILDUP',
      severity: sorenessTrend > 0.6 ? 'HIGH' : sorenessTrend > 0.4 ? 'MEDIUM' : 'LOW',
      metric: 'soreness',
      trend: soreness.slice(-5),
      change: sorenessTrend,
      description: `Muskelömhet har ackumulerats de senaste ${checkIns.length} dagarna`,
    })
  }

  // Stress Escalation
  const stressTrend = calculateTrend(stress)
  if (stressTrend > 0.3) {
    patterns.push({
      type: 'STRESS_ESCALATION',
      severity: stressTrend > 0.6 ? 'HIGH' : stressTrend > 0.4 ? 'MEDIUM' : 'LOW',
      metric: 'stress',
      trend: stress.slice(-5),
      change: stressTrend,
      description: `Stressnivåer har eskalerat de senaste ${checkIns.length} dagarna`,
    })
  }

  // Overtraining Risk
  const recentFatigue = average(fatigue.slice(-3))
  const recentSoreness = average(soreness.slice(-3))
  const recentSleep = average(sleepQuality.slice(-3))
  if (recentFatigue >= 7 && recentSoreness >= 6 && recentSleep <= 5) {
    patterns.push({
      type: 'OVERTRAINING_RISK',
      severity: recentFatigue >= 8 && recentSoreness >= 7 ? 'HIGH' : 'MEDIUM',
      metric: 'combined',
      trend: fatigue.slice(-3),
      change: recentFatigue,
      description: 'Hög risk för överträning baserat på kombinerad data',
    })
  }

  return patterns
}

// Create mock check-in data with patterns
function createMockCheckIns(clientId: string, pattern: 'fatigue' | 'sleep' | 'overtraining'): CheckInData[] {
  const checkIns: CheckInData[] = []
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    let sleepQuality: number
    let fatigue: number
    let soreness: number
    let stress: number
    let mood: number
    let motivation: number

    if (pattern === 'fatigue') {
      // Increasing fatigue pattern
      sleepQuality = 7 - Math.floor(i * 0.3)
      fatigue = 4 + (6 - i) // Goes from 4 to 10
      soreness = 3 + Math.floor((6 - i) * 0.5)
      stress = 4 + Math.floor((6 - i) * 0.3)
      mood = 7 - Math.floor((6 - i) * 0.3)
      motivation = 7 - Math.floor((6 - i) * 0.4)
    } else if (pattern === 'sleep') {
      // Declining sleep pattern
      sleepQuality = 8 - (6 - i) // Goes from 8 to 2
      fatigue = 3 + Math.floor((6 - i) * 0.5)
      soreness = 3
      stress = 4 + Math.floor((6 - i) * 0.3)
      mood = 7 - Math.floor((6 - i) * 0.4)
      motivation = 6
    } else {
      // Overtraining pattern
      sleepQuality = 4
      fatigue = 8
      soreness = 7
      stress = 6
      mood = 4
      motivation = 3
    }

    checkIns.push({
      date,
      sleepQuality: Math.max(1, Math.min(10, sleepQuality)),
      sleepHours: 6 + Math.random() * 2,
      soreness: Math.max(1, Math.min(10, soreness)),
      fatigue: Math.max(1, Math.min(10, fatigue)),
      stress: Math.max(1, Math.min(10, stress)),
      mood: Math.max(1, Math.min(10, mood)),
      motivation: Math.max(1, Math.min(10, motivation)),
      readinessScore: null,
    })
  }

  return checkIns
}

function buildAnalysisPrompt(athleteName: string, patterns: DetectedPattern[]): string {
  const patternDescriptions = patterns
    .map((p) => `- ${p.description} (${p.severity} allvarlighetsgrad)`)
    .join('\n')

  return `Analysera följande mönster för atleten ${athleteName} och ge personliga rekommendationer.

DETEKTERADE MÖNSTER:
${patternDescriptions}

INSTRUKTIONER:
1. Ge en kort sammanfattning av läget (1-2 meningar)
2. Förklara det viktigaste mönstret enkelt
3. Ge 2-3 konkreta åtgärder atleten kan ta
4. Var stöttande men tydlig om risker

SVARA I JSON-FORMAT (ENDAST JSON, inget annat):
{
  "title": "Kort rubrik (max 6 ord)",
  "summary": "Sammanfattning av läget...",
  "mainInsight": "Huvudinsikt om mönstret...",
  "recommendations": ["Åtgärd 1", "Åtgärd 2", "Åtgärd 3"],
  "urgency": "low" | "medium" | "high"
}

TONALITET: Omsorgsfull, professionell, handlingsorienterad.`
}

async function main() {
  console.log('📊 Testing Pattern Detection\n')

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

  // Create mock check-in data with fatigue pattern
  console.log('📈 Creating mock check-in data with fatigue accumulation pattern...\n')
  const mockCheckIns = createMockCheckIns(athlete.id, 'fatigue')

  console.log('Check-in data (last 7 days):')
  mockCheckIns.forEach((c) => {
    console.log(`  ${c.date.toISOString().split('T')[0]}: Sleep=${c.sleepQuality}, Fatigue=${c.fatigue}, Soreness=${c.soreness}`)
  })

  // Detect patterns
  console.log('\n🔍 Detecting patterns...\n')
  const patterns = detectPatterns(mockCheckIns)

  if (patterns.length === 0) {
    console.log('No patterns detected')
    return
  }

  console.log(`Found ${patterns.length} pattern(s):`)
  patterns.forEach((p) => {
    console.log(`  • ${p.type} (${p.severity}): ${p.description}`)
  })

  // Get Google API key for AI analysis
  console.log('\n🔑 Getting Google API key...')
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

  // Generate AI analysis
  console.log('🤖 Generating AI analysis with Gemini...\n')

  const genAI = new GoogleGenerativeAI(googleKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = buildAnalysisPrompt(athlete.name.split(' ')[0], patterns)
  const result = await model.generateContent(prompt)
  const responseText = result.response.text()

  // Parse JSON
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.log('❌ Could not parse JSON from response')
    console.log('Raw response:', responseText)
    return
  }

  const analysis = JSON.parse(jsonMatch[0])

  console.log('✅ Analysis generated:\n')
  console.log('─'.repeat(50))
  console.log(`⚠️  ${analysis.title}`)
  console.log('─'.repeat(50))
  console.log(analysis.summary)
  console.log('')
  console.log(`💡 Insight: ${analysis.mainInsight}`)

  if (analysis.recommendations?.length > 0) {
    console.log('\n📋 Recommendations:')
    analysis.recommendations.forEach((rec: string) => console.log(`   • ${rec}`))
  }

  console.log(`\n🚨 Urgency: ${analysis.urgency}`)
  console.log('─'.repeat(50))

  // Save notification to database
  console.log('\n💾 Saving pattern alert to database...')

  const highestSeverity = patterns.reduce((max, p) => {
    const order = { LOW: 1, MEDIUM: 2, HIGH: 3 }
    return order[p.severity] > order[max] ? p.severity : max
  }, 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH')

  const notification = await prisma.aINotification.create({
    data: {
      clientId: athlete.id,
      notificationType: 'PATTERN_ALERT',
      priority: highestSeverity === 'HIGH' ? 'HIGH' : 'NORMAL',
      title: analysis.title,
      message: analysis.summary,
      icon: 'trending-down',
      actionUrl: '/athlete/check-in',
      actionLabel: 'Se detaljer',
      contextData: {
        patterns: patterns.map((p) => ({
          type: p.type,
          severity: p.severity,
          description: p.description,
        })),
        recommendations: analysis.recommendations || [],
        urgency: analysis.urgency || 'medium',
      },
      triggeredBy: patterns.map((p) => p.type).join(','),
      triggerReason: `Test pattern detection: ${patterns.length} pattern(s)`,
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  console.log(`✅ Saved with ID: ${notification.id}`)
  console.log('\n🎉 Test complete! The athlete can now see this alert on their dashboard.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
