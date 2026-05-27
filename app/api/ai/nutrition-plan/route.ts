// app/api/ai/nutrition-plan/route.ts
// AI-powered personalized nutrition plan generation

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { resolveModel } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { generateText } from 'ai'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { withAiContext } from '@/lib/ai/usage-logger'
import {
  buildNutritionContext,
  type ActivityLevel,
  type CaloricGoal,
} from '@/lib/ai/nutrition-calculator'

type AppLocale = 'en' | 'sv'
type NutritionBasePlan = {
  targetCalories?: number
  macros?: {
    protein?: { grams?: number }
    carbs?: { grams?: number }
    fat?: { grams?: number }
  }
}

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

/**
 * POST /api/ai/nutrition-plan
 * Generate AI-powered personalized nutrition plan
 */
export async function POST(req: NextRequest) {
  let responseLocale: AppLocale = 'en'
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: t(responseLocale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    responseLocale = resolveLocale(user.language)

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
      targetWeight,
      nutritionPlan: basePlan,
      preferences, // dietary preferences/restrictions
    } = body

    // Validate required data
    if (!clientId || !clientData) {
      return NextResponse.json(
        { error: t(responseLocale, 'Missing required fields: clientId, clientData', 'Obligatoriska fält saknas: clientId, clientData') },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(responseLocale, 'Client not found', 'Atleten hittades inte') }, { status: 404 })
    }

    const clientLocale = await prisma.client.findUnique({
      where: { id: clientId },
      select: { user: { select: { language: true } } },
    })
    const contentLocale = resolveLocale(clientLocale?.user?.language ?? user.language)

    // Subscription gate
    const denied = await requireFeatureAccess(clientId, 'nutrition_planning')
    if (denied) return denied

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

    // Get API keys for the user
    const apiKeys = await getResolvedAiKeys(user.id)
    const resolved = resolveModel(apiKeys, 'balanced')

    if (!resolved) {
      return NextResponse.json(
        {
          error: t(
            responseLocale,
            'API key is missing. Configure at least one AI API key in settings.',
            'API-nyckel saknas. Konfigurera minst en AI API-nyckel i inställningarna.',
          ),
        },
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
      clientData.sport,
      contentLocale,
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
      locale: contentLocale,
    })

    // Call AI
    const aiResponse = await withAiContext(
      { userId: user.id, clientId, category: 'nutrition_plan' },
      () => generateText({
        model: createModelInstance(resolved),
        prompt,
        maxOutputTokens: 4000,
      }),
    )

    const aiContent = aiResponse.text || ''

    // Parse AI response into structured plan
    const nutritionPlanResult = parseAINutritionPlan(aiContent, contentLocale)

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
        error: t(responseLocale, 'Internal server error', 'Internt serverfel'),
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
  basePlan?: NutritionBasePlan
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
  locale: AppLocale
}): string {
  const { clientName, context, goal, targetWeight, basePlan, preferences, activityLevel, sport, wellnessData, locale } = params

  let prompt = locale === 'sv'
    ? `Du är en erfaren näringsfysiolog och kostrådgivare som arbetar med idrottare och motionärer i Sverige.

## Klient: ${clientName}

${context}

## Mål
- Primärt mål: ${getGoalDescription(goal, locale)}
${targetWeight ? `- Målvikt: ${targetWeight} kg` : ''}
- Aktivitetsnivå: ${activityLevel}
${sport ? `- Sport/Aktivitet: ${sport}` : ''}

## Beräknade värden från systemet
- Målkalorier: ${basePlan?.targetCalories} kcal/dag
- Protein: ${basePlan?.macros?.protein?.grams}g
- Kolhydrater: ${basePlan?.macros?.carbs?.grams}g
- Fett: ${basePlan?.macros?.fat?.grams}g`
    : `You are an experienced sports nutritionist and nutrition coach working with athletes and active people.

## Client: ${clientName}

${context}

## Goal
- Primary goal: ${getGoalDescription(goal, locale)}
${targetWeight ? `- Target weight: ${targetWeight} kg` : ''}
- Activity level: ${activityLevel}
${sport ? `- Sport/Activity: ${sport}` : ''}

## System-calculated values
- Target calories: ${basePlan?.targetCalories} kcal/day
- Protein: ${basePlan?.macros?.protein?.grams}g
- Carbohydrates: ${basePlan?.macros?.carbs?.grams}g
- Fat: ${basePlan?.macros?.fat?.grams}g`

  if (preferences) {
    prompt += locale === 'sv' ? '\n\n## Kostpreferenser/restriktioner' : '\n\n## Dietary preferences/restrictions'
    if (preferences.vegetarian) prompt += locale === 'sv' ? '\n- Vegetarian' : '\n- Vegetarian'
    if (preferences.vegan) prompt += locale === 'sv' ? '\n- Vegan' : '\n- Vegan'
    if (preferences.glutenFree) prompt += locale === 'sv' ? '\n- Glutenfri' : '\n- Gluten-free'
    if (preferences.dairyFree) prompt += locale === 'sv' ? '\n- Laktosfri' : '\n- Dairy-free'
    if (preferences.allergies?.length) prompt += locale === 'sv' ? `\n- Allergier: ${preferences.allergies.join(', ')}` : `\n- Allergies: ${preferences.allergies.join(', ')}`
    if (preferences.dislikes?.length) prompt += locale === 'sv' ? `\n- Ogillar: ${preferences.dislikes.join(', ')}` : `\n- Dislikes: ${preferences.dislikes.join(', ')}`
  }

  // Gap 6: Add wellness data to prompt if available
  if (wellnessData && wellnessData.daysOfData > 0) {
    prompt += locale === 'sv' ? '\n\n## Återhämtningsstatus (senaste 7 dagarna)' : '\n\n## Recovery status (last 7 days)'
    prompt += locale === 'sv'
      ? `\n- Sömntimmar (genomsnitt): ${wellnessData.avgSleepHours.toFixed(1)}h`
      : `\n- Sleep hours (average): ${wellnessData.avgSleepHours.toFixed(1)}h`
    prompt += locale === 'sv'
      ? `\n- Sömnkvalitet: ${wellnessData.avgSleepQuality.toFixed(1)}/10`
      : `\n- Sleep quality: ${wellnessData.avgSleepQuality.toFixed(1)}/10`
    prompt += locale === 'sv'
      ? `\n- Stressnivå: ${wellnessData.avgStress.toFixed(1)}/10`
      : `\n- Stress level: ${wellnessData.avgStress.toFixed(1)}/10`
    if (wellnessData.avgReadiness > 0) {
      prompt += locale === 'sv' ? `\n- Beredskap: ${wellnessData.avgReadiness.toFixed(0)}/100` : `\n- Readiness: ${wellnessData.avgReadiness.toFixed(0)}/100`
    }
    if (wellnessData.avgEnergy > 0) {
      prompt += locale === 'sv' ? `\n- Energinivå: ${wellnessData.avgEnergy.toFixed(1)}/10` : `\n- Energy level: ${wellnessData.avgEnergy.toFixed(1)}/10`
    }

    // Add wellness-aware recommendations
    if (wellnessData.avgSleepHours < 7) {
      prompt += locale === 'sv'
        ? '\n\n⚠️ **OBS: Låg sömntid** - Inkludera kostråd som stödjer bättre sömn (magnesiumrika livsmedel, trypsofanrika kolhydrater på kvällen, undvika koffein sent)'
        : '\n\n⚠️ **NOTE: Low sleep duration** - Include nutrition advice that supports better sleep, such as magnesium-rich foods, tryptophan-rich evening carbohydrates, and avoiding late caffeine.'
    }
    if (wellnessData.avgStress > 7) {
      prompt += locale === 'sv'
        ? '\n\n⚠️ **OBS: Hög stressnivå** - Inkludera antioxidantrika livsmedel, adaptogena örter (ashwagandha-te), omega-3-rika livsmedel för att stödja återhämtning'
        : '\n\n⚠️ **NOTE: High stress level** - Include antioxidant-rich foods, recovery-supportive routines, and omega-3-rich foods.'
    }
    if (wellnessData.avgSleepQuality < 5) {
      prompt += locale === 'sv'
        ? '\n\n⚠️ **OBS: Låg sömnkvalitet** - Undvik tunga måltider sent, rekommendera kamomillte och melatoninfrämjande livsmedel (körsbär, nötter)'
        : '\n\n⚠️ **NOTE: Low sleep quality** - Avoid heavy late meals and recommend sleep-supportive evening options.'
    }
    if (wellnessData.avgEnergy > 0 && wellnessData.avgEnergy < 5) {
      prompt += locale === 'sv'
        ? '\n\n⚠️ **OBS: Låg energi** - Fokusera på stabilt blodsockersvar, komplexa kolhydrater, järnrika livsmedel och regelbundna måltider'
        : '\n\n⚠️ **NOTE: Low energy** - Focus on stable blood glucose, complex carbohydrates, iron-rich foods, and regular meals.'
    }
  }

  prompt += locale === 'sv'
    ? `

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

5. **Specifika rekommendationer** baserat på målet "${getGoalDescription(goal, locale)}"

6. **Kosttillskott** (om relevanta)
   - Endast evidensbaserade rekommendationer
   - Dosering och timing

Formatera svaret tydligt med rubriker och punktlistor. Skriv på svenska och använd svenska mått (dl, msk, tsk).
Var konkret och praktisk - ge specifika livsmedel och portionsstorlekar som fungerar i en svensk matkultur.`
    : `

## Your task
Create a detailed, personalized nutrition plan in English that includes:

1. **Daily overview**
   - Clear split of calories and macros per meal
   - Recommended meal timing

2. **Meal suggestions** (5-6 meals per day)
   - Breakfast
   - Morning snack
   - Lunch
   - Afternoon snack
   - Dinner
   - Evening snack, if relevant

   For each meal, provide 2-3 concrete examples with:
   - Portion sizes in grams/ml or common household measures
   - Approximate macros (protein, carbohydrates, fat)
   - Simple, accessible ingredients

3. **Training timing**
   - What and when to eat before training
   - Recovery nutrition after training
   - Specific recommendations for ${sport || 'training'}

4. **Practical tips**
   - Meal prep for a week
   - Quick options for stressful days
   - High-protein snacks
   - Fluid intake

5. **Specific recommendations** based on the goal "${getGoalDescription(goal, locale)}"

6. **Supplements** (if relevant)
   - Evidence-based recommendations only
   - Dosage and timing

Format the response clearly with headings and bullet lists. Write in English and use metric units. Be concrete and practical with specific foods and portion sizes.`

  return prompt
}

/**
 * Get goal description
 */
function getGoalDescription(goal: string, locale: AppLocale): string {
  const descriptions: Record<string, { en: string; sv: string }> = {
    AGGRESSIVE_LOSS: { en: 'Fast weight loss (about 0.75 kg/week)', sv: 'Snabb viktnedgång (ca 0.75 kg/vecka)' },
    MODERATE_LOSS: { en: 'Weight loss (about 0.5 kg/week)', sv: 'Viktnedgång (ca 0.5 kg/vecka)' },
    MILD_LOSS: { en: 'Mild weight loss (about 0.25 kg/week)', sv: 'Lätt viktnedgång (ca 0.25 kg/vecka)' },
    MAINTAIN: { en: 'Maintain current weight', sv: 'Bibehålla nuvarande vikt' },
    MILD_GAIN: { en: 'Mild weight gain (about 0.25 kg/week)', sv: 'Lätt viktökning (ca 0.25 kg/vecka)' },
    MODERATE_GAIN: { en: 'Weight gain/muscle building (about 0.5 kg/week)', sv: 'Viktökning/muskelbyggande (ca 0.5 kg/vecka)' },
    AGGRESSIVE_GAIN: { en: 'Fast weight gain/bulking (about 0.75 kg/week)', sv: 'Snabb viktökning/bulking (ca 0.75 kg/vecka)' },
  }
  const description = descriptions[goal]
  if (description) return description[locale]
  return goal
}

/**
 * Parse AI response into structured format
 */
function parseAINutritionPlan(aiContent: string, locale: AppLocale): {
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
    sections: sections.length > 0 ? sections : [{ title: t(locale, 'Nutrition plan', 'Näringsplan'), content: aiContent }],
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
