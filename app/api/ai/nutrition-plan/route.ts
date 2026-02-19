// app/api/ai/nutrition-plan/route.ts
// AI-powered personalized nutrition plan generation

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { decryptSecret } from '@/lib/crypto/secretbox'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import {
  buildNutritionContext,
  generateNutritionPlan,
  type ActivityLevel,
  type CaloricGoal,
  type MacroProfile,
} from '@/lib/ai/nutrition-calculator'

/**
 * POST /api/ai/nutrition-plan
 * Generate AI-powered personalized nutrition plan
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:nutrition-plan', user.id, {
      limit: 5,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await req.json()

    const {
      clientId,
      clientData,
      activityLevel,
      goal,
      macroProfile,
      targetWeight,
      nutritionPlan: basePlan,
      preferences, // dietary preferences/restrictions
    } = body

    // Validate required data
    if (!clientId || !clientData) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, clientData' },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Subscription gate
    const denied = await requireFeatureAccess(clientId, 'nutrition_planning')
    if (denied) return denied

    // Get API key for the user
    const apiKey = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
    })

    let anthropicKey: string | undefined
    if (apiKey?.anthropicKeyEncrypted) {
      try {
        anthropicKey = decryptSecret(apiKey.anthropicKeyEncrypted)
      } catch {
        anthropicKey = undefined
      }
    }
    anthropicKey = anthropicKey || process.env.ANTHROPIC_API_KEY || undefined

    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'API-nyckel saknas. Konfigurera din Anthropic API-nyckel i inställningarna.' },
        { status: 400 }
      )
    }

    // Get latest body composition if available
    const latestBodyComp = await prisma.bodyComposition.findFirst({
      where: { clientId },
      orderBy: { measurementDate: 'desc' },
    })

    // Query last 7 days of DailyMetrics for wellness data (Gap 6 fix)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentMetrics = await prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: { gte: sevenDaysAgo },
      },
      select: {
        sleepQuality: true,
        sleepHours: true,
        stress: true,
        readinessScore: true,
        energyLevel: true,
        mood: true,
      },
      orderBy: { date: 'desc' },
    })

    // Calculate wellness averages - map energyLevel to energy for the function
    const mappedMetrics = recentMetrics.map(m => ({
      sleepQuality: m.sleepQuality,
      sleepHours: m.sleepHours,
      stress: m.stress,
      readinessScore: m.readinessScore,
      energy: m.energyLevel,
      mood: m.mood,
    }))
    const wellnessData = calculateWellnessAverages(mappedMetrics)

    // Calculate age
    const ageYears = Math.floor(
      (new Date().getTime() - new Date(clientData.birthDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
    )

    // Build context for AI
    const nutritionContext = buildNutritionContext(
      {
        weightKg: clientData.weight || latestBodyComp?.weightKg || 70,
        heightCm: clientData.height,
        ageYears,
        gender: clientData.gender,
        activityLevel: activityLevel as ActivityLevel,
      },
      latestBodyComp ? {
        bodyFatPercent: latestBodyComp.bodyFatPercent || undefined,
        muscleMassKg: latestBodyComp.muscleMassKg || undefined,
      } : undefined,
      goal as CaloricGoal,
      clientData.sport
    )

    // Build prompt for AI
    const prompt = buildNutritionPrompt({
      clientName: clientData.name,
      context: nutritionContext,
      goal,
      targetWeight,
      basePlan,
      preferences,
      activityLevel,
      sport: clientData.sport,
      wellnessData, // Gap 6: Include wellness data
    })

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      logger.error('Claude API error', { error })
      throw new Error(error.error?.message || 'AI-tjänsten är inte tillgänglig')
    }

    const aiResponse = await response.json()
    const aiContent = aiResponse.content[0]?.text || ''

    // Parse AI response into structured plan
    const nutritionPlanResult = parseAINutritionPlan(aiContent)

    // Save to database (optional - for history)
    // Could save to a NutritionPlan model if needed

    return NextResponse.json({
      success: true,
      plan: nutritionPlanResult,
      rawResponse: aiContent,
      basePlan,
      context: {
        clientName: clientData.name,
        goal,
        activityLevel,
        targetWeight,
      },
    })
  } catch (error) {
    logger.error('Error generating nutrition plan', {}, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}

/**
 * Build prompt for nutrition plan generation
 */
function buildNutritionPrompt(params: {
  clientName: string
  context: string
  goal: string
  targetWeight?: number
  basePlan: any
  preferences?: {
    vegetarian?: boolean
    vegan?: boolean
    glutenFree?: boolean
    dairyFree?: boolean
    allergies?: string[]
    dislikes?: string[]
  }
  activityLevel: string
  sport?: string
  wellnessData?: WellnessAverages // Gap 6: Wellness data integration
}): string {
  const { clientName, context, goal, targetWeight, basePlan, preferences, activityLevel, sport, wellnessData } = params

  let prompt = `Du är en erfaren näringsfysiolog och kostrådgivare som arbetar med idrottare och motionärer i Sverige.

## Klient: ${clientName}

${context}

## Mål
- Primärt mål: ${getGoalDescription(goal)}
${targetWeight ? `- Målvikt: ${targetWeight} kg` : ''}
- Aktivitetsnivå: ${activityLevel}
${sport ? `- Sport/Aktivitet: ${sport}` : ''}

## Beräknade värden från systemet
- Målkalorier: ${basePlan?.targetCalories} kcal/dag
- Protein: ${basePlan?.macros?.protein?.grams}g
- Kolhydrater: ${basePlan?.macros?.carbs?.grams}g
- Fett: ${basePlan?.macros?.fat?.grams}g`

  if (preferences) {
    prompt += '\n\n## Kostpreferenser/restriktioner'
    if (preferences.vegetarian) prompt += '\n- Vegetarian'
    if (preferences.vegan) prompt += '\n- Vegan'
    if (preferences.glutenFree) prompt += '\n- Glutenfri'
    if (preferences.dairyFree) prompt += '\n- Laktosfri'
    if (preferences.allergies?.length) prompt += `\n- Allergier: ${preferences.allergies.join(', ')}`
    if (preferences.dislikes?.length) prompt += `\n- Ogillar: ${preferences.dislikes.join(', ')}`
  }

  // Gap 6: Add wellness data to prompt if available
  if (wellnessData && wellnessData.daysOfData > 0) {
    prompt += '\n\n## Återhämtningsstatus (senaste 7 dagarna)'
    prompt += `\n- Sömntimmar (genomsnitt): ${wellnessData.avgSleepHours.toFixed(1)}h`
    prompt += `\n- Sömnkvalitet: ${wellnessData.avgSleepQuality.toFixed(1)}/10`
    prompt += `\n- Stressnivå: ${wellnessData.avgStress.toFixed(1)}/10`
    if (wellnessData.avgReadiness > 0) {
      prompt += `\n- Beredskap: ${wellnessData.avgReadiness.toFixed(0)}/100`
    }
    if (wellnessData.avgEnergy > 0) {
      prompt += `\n- Energinivå: ${wellnessData.avgEnergy.toFixed(1)}/10`
    }

    // Add wellness-aware recommendations
    if (wellnessData.avgSleepHours < 7) {
      prompt += '\n\n⚠️ **OBS: Låg sömntid** - Inkludera kostråd som stödjer bättre sömn (magnesiumrika livsmedel, trypsofanrika kolhydrater på kvällen, undvika koffein sent)'
    }
    if (wellnessData.avgStress > 7) {
      prompt += '\n\n⚠️ **OBS: Hög stressnivå** - Inkludera antioxidantrika livsmedel, adaptogena örter (ashwagandha-te), omega-3-rika livsmedel för att stödja återhämtning'
    }
    if (wellnessData.avgSleepQuality < 5) {
      prompt += '\n\n⚠️ **OBS: Låg sömnkvalitet** - Undvik tunga måltider sent, rekommendera kamomillte och melatoninfrämjande livsmedel (körsbär, nötter)'
    }
    if (wellnessData.avgEnergy > 0 && wellnessData.avgEnergy < 5) {
      prompt += '\n\n⚠️ **OBS: Låg energi** - Fokusera på stabilt blodsockersvar, komplexa kolhydrater, järnrika livsmedel och regelbundna måltider'
    }
  }

  prompt += `

## Din uppgift
Skapa en detaljerad och personlig näringsplan på svenska som inkluderar:

1. **Daglig översikt**
   - Tydlig uppdelning av kalorier och makros per måltid
   - Rekommenderade mattider

2. **Måltidsförslag** (5-6 måltider per dag)
   - Frukost
   - Mellanmål förmiddag
   - Lunch
   - Mellanmål eftermiddag
   - Middag
   - (Kvällssnack om relevant)

   För varje måltid, ge 2-3 konkreta exempel med:
   - Portionsstorlekar i gram/dl
   - Ungefärliga makros (protein, kolhydrater, fett)
   - Enkla och tillgängliga ingredienser

3. **Timing för träning**
   - Vad och när man bör äta före träning
   - Återhämtningsnäring efter träning
   - Specifika rekommendationer för ${sport || 'träning'}

4. **Praktiska tips**
   - Matlagning/meal prep för en vecka
   - Snabba alternativ för stressiga dagar
   - Proteinrika mellanmål
   - Vätskeintag

5. **Specifika rekommendationer** baserat på målet "${getGoalDescription(goal)}"

6. **Kosttillskott** (om relevanta)
   - Endast evidensbaserade rekommendationer
   - Dosering och timing

Formatera svaret tydligt med rubriker och punktlistor. Skriv på svenska och använd svenska mått (dl, msk, tsk).
Var konkret och praktisk - ge specifika livsmedel och portionsstorlekar som fungerar i en svensk matkultur.`

  return prompt
}

/**
 * Get goal description in Swedish
 */
function getGoalDescription(goal: string): string {
  const descriptions: Record<string, string> = {
    AGGRESSIVE_LOSS: 'Snabb viktnedgång (ca 0.75 kg/vecka)',
    MODERATE_LOSS: 'Viktnedgång (ca 0.5 kg/vecka)',
    MILD_LOSS: 'Lätt viktnedgång (ca 0.25 kg/vecka)',
    MAINTAIN: 'Bibehålla nuvarande vikt',
    MILD_GAIN: 'Lätt viktökning (ca 0.25 kg/vecka)',
    MODERATE_GAIN: 'Viktökning/muskelbyggande (ca 0.5 kg/vecka)',
    AGGRESSIVE_GAIN: 'Snabb viktökning/bulking (ca 0.75 kg/vecka)',
  }
  return descriptions[goal] || goal
}

/**
 * Parse AI response into structured format
 */
function parseAINutritionPlan(aiContent: string): {
  rawText: string
  sections: { title: string; content: string }[]
  mealPlan?: {
    breakfast?: string[]
    morningSnack?: string[]
    lunch?: string[]
    afternoonSnack?: string[]
    dinner?: string[]
    eveningSnack?: string[]
  }
} {
  const sections: { title: string; content: string }[] = []

  // Split by headers (## or **)
  const headerRegex = /(?:^|\n)(#{1,3}|(?:\*\*))([^#\n*]+)(?:\*\*)?(?:\n|$)/g
  let lastIndex = 0
  let lastTitle = ''
  let match

  while ((match = headerRegex.exec(aiContent)) !== null) {
    if (lastTitle && lastIndex < match.index) {
      const content = aiContent.substring(lastIndex, match.index).trim()
      if (content) {
        sections.push({ title: lastTitle, content })
      }
    }
    lastTitle = match[2].trim()
    lastIndex = match.index + match[0].length
  }

  // Add last section
  if (lastTitle && lastIndex < aiContent.length) {
    const content = aiContent.substring(lastIndex).trim()
    if (content) {
      sections.push({ title: lastTitle, content })
    }
  }

  return {
    rawText: aiContent,
    sections: sections.length > 0 ? sections : [{ title: 'Näringsplan', content: aiContent }],
  }
}

/**
 * Gap 6: Wellness data types and calculation
 */
interface WellnessAverages {
  avgSleepHours: number
  avgSleepQuality: number
  avgStress: number
  avgReadiness: number
  avgEnergy: number
  avgMood: number
  daysOfData: number
}

/**
 * Calculate wellness averages from recent daily metrics
 */
function calculateWellnessAverages(
  metrics: Array<{
    sleepQuality: number | null
    sleepHours: number | null
    stress: number | null
    readinessScore: number | null
    energy: number | null
    mood: number | null
  }>
): WellnessAverages {
  if (!metrics || metrics.length === 0) {
    return {
      avgSleepHours: 0,
      avgSleepQuality: 0,
      avgStress: 0,
      avgReadiness: 0,
      avgEnergy: 0,
      avgMood: 0,
      daysOfData: 0,
    }
  }

  let sleepHoursSum = 0, sleepHoursCount = 0
  let sleepQualitySum = 0, sleepQualityCount = 0
  let stressSum = 0, stressCount = 0
  let readinessSum = 0, readinessCount = 0
  let energySum = 0, energyCount = 0
  let moodSum = 0, moodCount = 0

  for (const m of metrics) {
    if (m.sleepHours !== null) {
      sleepHoursSum += m.sleepHours
      sleepHoursCount++
    }
    if (m.sleepQuality !== null) {
      sleepQualitySum += m.sleepQuality
      sleepQualityCount++
    }
    if (m.stress !== null) {
      stressSum += m.stress
      stressCount++
    }
    if (m.readinessScore !== null) {
      readinessSum += m.readinessScore
      readinessCount++
    }
    if (m.energy !== null) {
      energySum += m.energy
      energyCount++
    }
    if (m.mood !== null) {
      moodSum += m.mood
      moodCount++
    }
  }

  return {
    avgSleepHours: sleepHoursCount > 0 ? sleepHoursSum / sleepHoursCount : 0,
    avgSleepQuality: sleepQualityCount > 0 ? sleepQualitySum / sleepQualityCount : 0,
    avgStress: stressCount > 0 ? stressSum / stressCount : 0,
    avgReadiness: readinessCount > 0 ? readinessSum / readinessCount : 0,
    avgEnergy: energyCount > 0 ? energySum / energyCount : 0,
    avgMood: moodCount > 0 ? moodSum / moodCount : 0,
    daysOfData: metrics.length,
  }
}
