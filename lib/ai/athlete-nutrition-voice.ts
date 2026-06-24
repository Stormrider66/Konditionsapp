/**
 * Standalone executors for the live-voice nutrition DIRECT tools (read-only /
 * compute, no confirmation card). The text chat uses AI-SDK `tool()` objects;
 * the realtime voice path dispatches plain async functions via executeDirectTool,
 * so these mirror the meal-guide read + portion-fit logic for voice.
 */
import 'server-only'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getAthleteTimezone } from '@/lib/nutrition/athlete-day'
import { dayKeyInTimeZone } from '@/lib/nutrition/day-key'
import { getPerformanceMealGuideForDate } from '@/lib/nutrition/performance-plan'
import { computeMealPortionFit } from '@/lib/nutrition/performance-plan/portion-fit'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

async function resolveDateKey(clientId: string, date?: string): Promise<string> {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const tz = await getAthleteTimezone(clientId)
  return dayKeyInTimeZone(new Date(), tz)
}

export interface VoiceFuelingBriefingInput {
  date?: string
}

export interface VoiceFitFoodsInput {
  foods: string
  mealType?: string
  date?: string
}

/** Concise planned-vs-eaten fueling briefing for live voice. */
export async function getFuelingBriefingForVoice(
  clientId: string,
  input: VoiceFuelingBriefingInput,
  locale: AppLocale
) {
  try {
    const dateKey = await resolveDateKey(clientId, input.date)
    const guide = await getPerformanceMealGuideForDate(clientId, dateKey)
    if (!guide) {
      return { success: true, hasGuide: false, message: t(locale, 'No active meal guide for today.', 'Ingen aktiv måltidsguide för idag.') }
    }
    // Sum ALL logged meals (not just plan-matched) for an accurate day total.
    const eaten = guide.loggedMeals.reduce(
      (acc, meal) => ({
        caloriesKcal: acc.caloriesKcal + (meal.calories ?? 0),
        proteinG: acc.proteinG + (meal.proteinGrams ?? 0),
        carbsG: acc.carbsG + (meal.carbsGrams ?? 0),
        fatG: acc.fatG + (meal.fatGrams ?? 0),
      }),
      { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    )
    const round = (n: number) => Math.round(n)
    return {
      success: true,
      hasGuide: true,
      date: dateKey,
      dayType: guide.day.dayType,
      target: { caloriesKcal: round(guide.day.caloriesKcal), proteinG: round(guide.day.proteinG), carbsG: round(guide.day.carbsG), fatG: round(guide.day.fatG) },
      eaten: { caloriesKcal: round(eaten.caloriesKcal), proteinG: round(eaten.proteinG), carbsG: round(eaten.carbsG), fatG: round(eaten.fatG) },
      remainingKcal: round(guide.day.caloriesKcal - eaten.caloriesKcal),
      caloriePctOfTarget: guide.day.caloriesKcal > 0 ? Math.round((eaten.caloriesKcal / guide.day.caloriesKcal) * 100) : 0,
      openMeals: guide.chart.filter((r) => r.logCount === 0).map((r) => ({ time: r.time, title: r.title, plannedKcal: r.planned.caloriesKcal })),
    }
  } catch (error) {
    logger.error('getFuelingBriefingForVoice failed', { clientId }, error)
    return { success: false, error: t(locale, 'Could not summarize fueling.', 'Kunde inte sammanfatta fyllningen.') }
  }
}

/** Portion calculator for live voice: foods -> grams to hit a planned meal's target. */
export async function fitFoodsToMealForVoice(
  clientId: string,
  input: VoiceFitFoodsInput,
  locale: AppLocale
) {
  try {
    const dateKey = await resolveDateKey(clientId, input.date)
    const guide = await getPerformanceMealGuideForDate(clientId, dateKey)
    if (!guide) {
      return { success: true, hasGuide: false, message: t(locale, 'No active meal guide to size foods against.', 'Ingen aktiv måltidsguide att storleksberäkna mot.') }
    }
    const meals = guide.day.meals
    const chosen = input.mealType ? meals.find((m) => m.mealType === input.mealType) : meals[0]
    if (input.mealType && !chosen) {
      return { success: false, error: t(locale, 'No such meal in the guide for today.', 'Ingen sådan måltid i guiden för idag.') }
    }
    if (!chosen) {
      return { success: false, error: t(locale, 'No planned meals found.', 'Inga planerade måltider hittades.') }
    }
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { userId: true } })
    const fit = await computeMealPortionFit({
      userId: client?.userId ?? '',
      locale,
      foodsText: input.foods,
      target: { caloriesKcal: chosen.caloriesKcal, proteinG: chosen.proteinG, carbsG: chosen.carbsG, fatG: chosen.fatG },
    })
    if (!fit) {
      return { success: false, error: t(locale, 'Could not work out amounts for those foods.', 'Kunde inte räkna ut mängder för de livsmedlen.') }
    }
    return {
      success: true,
      hasGuide: true,
      mealType: chosen.mealType,
      mealTitle: chosen.title,
      targetKcal: Math.round(chosen.caloriesKcal),
      foods: fit.foods.map((f) => ({ name: f.name, grams: f.grams, caloriesKcal: f.caloriesKcal })),
      totalKcal: fit.totals.caloriesKcal,
    }
  } catch (error) {
    logger.error('fitFoodsToMealForVoice failed', { clientId }, error)
    return { success: false, error: t(locale, 'Could not calculate amounts.', 'Kunde inte beräkna mängder.') }
  }
}
