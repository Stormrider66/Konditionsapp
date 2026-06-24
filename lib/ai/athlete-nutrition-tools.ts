/**
 * Athlete Chat Nutrition / Performance Meal Guide Tools
 *
 * Tools that let the floating chat (and, mirrored, live voice) work with the
 * Performance Meal Guide:
 *  - fitFoodsToMeal: portion calculator — given foods, return grams of each to
 *    hit a planned meal's macro target (read-only, runs directly).
 *  - swapMealRecipe: regenerate one planned meal's recipe (low-stakes, direct).
 *  - logPlannedMeal: log a planned meal as eaten (write, requires confirmation).
 *  - regeneratePerformanceGuide: rebuild the meal guide (write, confirmation).
 *
 * The two write tools are registered with requiresConfirmation in the
 * capability registry, so with AI operations enabled they run through the
 * action-draft confirmation flow (execute runs only on confirm).
 */

import { tool } from 'ai'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getAthleteTimezone } from '@/lib/nutrition/athlete-day'
import { dayKeyInTimeZone, utcDateFromDayKey } from '@/lib/nutrition/day-key'
import {
  getPerformanceMealGuideForDate,
  generateAndSavePerformanceMealGuide,
} from '@/lib/nutrition/performance-plan'
import { computeMealPortionFit } from '@/lib/nutrition/performance-plan/portion-fit'
import { generatePlannedMealRecipe } from '@/lib/nutrition/performance-plan/recipe-generator'
import type { PerformanceMealTimingRole, PerformancePlanDayType } from '@/lib/nutrition/performance-plan/types'

type ChatLocale = 'en' | 'sv'

const MEAL_TYPES = [
  'BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK',
  'PRE_WORKOUT', 'POST_WORKOUT', 'DINNER', 'EVENING_SNACK',
] as const

function chatText(locale: ChatLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

async function resolveDateKey(clientId: string, date?: string): Promise<string> {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const tz = await getAthleteTimezone(clientId)
  return dayKeyInTimeZone(new Date(), tz)
}

export function createAthleteNutritionTools(clientId: string, locale: ChatLocale = 'en') {
  return {
    // ── Portion calculator (read-only, runs directly) ─────────────────
    fitFoodsToMeal: tool({
      description: chatText(
        locale,
        "Work out how much of each food to eat to hit a planned meal's calorie/macro target in the Performance Meal Guide. Use when the athlete says what they want to eat for a meal and asks how much (e.g. \"I'm having yoghurt and a banana for breakfast, how much?\"). Pass the foods as free text and the meal slot. Read-only — it does not log anything.",
        "Räkna ut hur mycket av varje livsmedel atleten ska äta för att träffa en planerad måltids kcal-/makromål i Måltidsguiden. Använd när atleten säger vad de vill äta till en måltid och frågar hur mycket (t.ex. \"jag tar yoghurt och en banan till frukost, hur mycket?\"). Skicka livsmedlen som fritext och måltidsslotten. Endast läsning — loggar inget."
      ),
      inputSchema: z.object({
        foods: z.string().min(2).max(300).describe('Free-text list of foods, e.g. "yoghurt, banana".'),
        mealType: z.enum(MEAL_TYPES).optional().describe('Which meal slot to fit against. Default: the first planned meal of the day.'),
        date: z.string().optional().describe('Date (YYYY-MM-DD). Default: today.'),
      }),
      execute: async ({ foods, mealType, date }) => {
        try {
          const dateKey = await resolveDateKey(clientId, date)
          const guide = await getPerformanceMealGuideForDate(clientId, dateKey)
          if (!guide) {
            return { success: true, hasGuide: false, message: chatText(locale, 'No active meal guide for that day — generate one first, then I can size your foods to a meal target.', 'Ingen aktiv måltidsguide för den dagen — skapa en först, sedan kan jag storleksberäkna dina livsmedel mot ett måltidsmål.') }
          }
          const meals = guide.day.meals
          const chosen = mealType ? meals.find((m) => m.mealType === mealType) : meals[0]
          if (mealType && !chosen) {
            return { success: false, error: chatText(locale, `No ${mealType} meal in the guide for that day.`, `Ingen ${mealType}-måltid i guiden för den dagen.`) }
          }
          if (!chosen) {
            return { success: false, error: chatText(locale, 'No planned meals found.', 'Inga planerade måltider hittades.') }
          }
          const client = await prisma.client.findUnique({ where: { id: clientId }, select: { userId: true } })
          const fit = await computeMealPortionFit({
            userId: client?.userId ?? '',
            locale,
            foodsText: foods,
            target: { caloriesKcal: chosen.caloriesKcal, proteinG: chosen.proteinG, carbsG: chosen.carbsG, fatG: chosen.fatG },
          })
          if (!fit) {
            return { success: false, error: chatText(locale, 'Could not work out amounts for those foods. Try adding more detail.', 'Kunde inte räkna ut mängder för de livsmedlen. Lägg till mer detalj.') }
          }
          return {
            success: true,
            hasGuide: true,
            date: dateKey,
            mealType: chosen.mealType,
            mealTitle: chosen.title,
            target: { caloriesKcal: Math.round(chosen.caloriesKcal), proteinG: Math.round(chosen.proteinG), carbsG: Math.round(chosen.carbsG), fatG: Math.round(chosen.fatG) },
            foods: fit.foods.map((f) => ({ name: f.name, grams: f.grams, caloriesKcal: f.caloriesKcal })),
            totals: fit.totals,
          }
        } catch (error) {
          logger.error('fitFoodsToMeal tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not calculate amounts.', 'Kunde inte beräkna mängder.') }
        }
      },
    }),

    // ── Swap one meal's recipe (low-stakes, runs directly) ────────────
    swapMealRecipe: tool({
      description: chatText(
        locale,
        "Regenerate the recipe for one planned meal in the Performance Meal Guide to give the athlete a different idea. Use when the athlete asks for a different/another recipe for a meal, or to 'surprise' them. Optionally pass a preference (e.g. 'I want chicken'). Updates the planned meal's recipe directly.",
        "Generera om receptet för en planerad måltid i Måltidsguiden för att ge atleten ett annat förslag. Använd när atleten ber om ett annat/nytt recept för en måltid, eller vill bli 'överraskad'. Skicka eventuellt en preferens (t.ex. 'jag vill ha kyckling'). Uppdaterar måltidens recept direkt."
      ),
      inputSchema: z.object({
        mealType: z.enum(MEAL_TYPES).describe('Which meal to swap the recipe for.'),
        date: z.string().optional().describe('Date (YYYY-MM-DD). Default: today.'),
        preference: z.string().max(200).optional().describe('Optional preference to steer the recipe.'),
      }),
      execute: async ({ mealType, date, preference }) => {
        try {
          const dateKey = await resolveDateKey(clientId, date)
          const guide = await getPerformanceMealGuideForDate(clientId, dateKey)
          if (!guide) {
            return { success: true, hasGuide: false, message: chatText(locale, 'No active meal guide for that day to swap a recipe in.', 'Ingen aktiv måltidsguide för den dagen att byta recept i.') }
          }
          const meal = guide.day.meals.find((m) => m.mealType === mealType)
          if (!meal) {
            return { success: false, error: chatText(locale, `No ${mealType} meal in the guide for that day.`, `Ingen ${mealType}-måltid i guiden för den dagen.`) }
          }
          const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true, userId: true } })
          const recipe = await generatePlannedMealRecipe({
            userId: client?.userId,
            clientName: client?.name ?? 'Athlete',
            locale,
            useAi: true,
            mode: preference ? 'PREFERENCE' : 'SURPRISE',
            preference,
            meal: {
              mealType: meal.mealType,
              timingRole: meal.timingRole as PerformanceMealTimingRole,
              title: meal.title,
              dayType: guide.day.dayType as PerformancePlanDayType,
              caloriesKcal: meal.caloriesKcal,
              proteinG: meal.proteinG,
              carbsG: meal.carbsG,
              fatG: meal.fatG,
            },
          })
          await prisma.nutritionPlannedMeal.update({
            where: { id: meal.id },
            data: {
              recipeTitle: recipe.title,
              recipeSummary: recipe.summary,
              recipeServings: recipe.servings,
              recipePrepMinutes: recipe.prepMinutes,
              recipeCookMinutes: recipe.cookMinutes,
              recipeIngredients: toJson(recipe.ingredients),
              recipeSteps: toJson(recipe.steps),
              recipeTips: recipe.tips ? toJson(recipe.tips) : Prisma.JsonNull,
              recipeSource: recipe.source,
              recipePrompt: recipe.prompt,
              recipeUpdatedAt: new Date(),
            },
          })
          return {
            success: true,
            mealType: meal.mealType,
            recipeTitle: recipe.title,
            recipeSummary: recipe.summary ?? null,
            message: chatText(locale, 'Swapped the recipe.', 'Bytte receptet.'),
          }
        } catch (error) {
          logger.error('swapMealRecipe tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not swap the recipe. Please try again.', 'Kunde inte byta receptet. Försök igen.') }
        }
      },
    }),

    // ── Log a planned meal as eaten (write, requires confirmation) ─────
    logPlannedMeal: tool({
      description: chatText(
        locale,
        "Log a planned meal from the Performance Meal Guide as eaten, using the planned macros. Use when the athlete says they ate (or will eat exactly) the planned meal for a slot — e.g. \"I ate the planned breakfast\". For a meal that differs from the plan, use logMeal or fitFoodsToMeal instead.",
        "Logga en planerad måltid från Måltidsguiden som ätet, med de planerade makrona. Använd när atleten säger att de åt (eller äter exakt) den planerade måltiden för en slot — t.ex. \"jag åt den planerade frukosten\". För en måltid som avviker från planen, använd logMeal eller fitFoodsToMeal istället."
      ),
      inputSchema: z.object({
        mealType: z.enum(MEAL_TYPES).describe('Which planned meal was eaten.'),
        date: z.string().optional().describe('Date (YYYY-MM-DD). Default: today.'),
      }),
      execute: async ({ mealType, date }) => {
        try {
          const dateKey = await resolveDateKey(clientId, date)
          const guide = await getPerformanceMealGuideForDate(clientId, dateKey)
          if (!guide) {
            return { success: false, error: chatText(locale, 'No active meal guide for that day.', 'Ingen aktiv måltidsguide för den dagen.') }
          }
          const meal = guide.day.meals.find((m) => m.mealType === mealType)
          if (!meal) {
            return { success: false, error: chatText(locale, `No ${mealType} meal in the guide for that day.`, `Ingen ${mealType}-måltid i guiden för den dagen.`) }
          }
          const log = await prisma.mealLog.create({
            data: {
              clientId,
              date: utcDateFromDayKey(dateKey),
              mealType: meal.mealType,
              time: meal.time ?? null,
              description: meal.title,
              calories: Math.round(meal.caloriesKcal),
              proteinGrams: meal.proteinG,
              carbsGrams: meal.carbsG,
              fatGrams: meal.fatG,
              plannedMealId: meal.id,
            },
          })
          return {
            success: true,
            mealId: log.id,
            mealType: meal.mealType,
            title: meal.title,
            calories: Math.round(meal.caloriesKcal),
            message: chatText(locale, 'Logged the planned meal as eaten.', 'Loggade den planerade måltiden som ätet.'),
          }
        } catch (error) {
          logger.error('logPlannedMeal tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not log the meal. Please try again.', 'Kunde inte logga måltiden. Försök igen.') }
        }
      },
    }),

    // ── Regenerate the meal guide (write, requires confirmation) ───────
    regeneratePerformanceGuide: tool({
      description: chatText(
        locale,
        'Regenerate the athlete\'s Performance Meal Guide (rebuilds the planned meals and recipes for the week from the latest training and targets). Use when the athlete asks for a fresh/new meal guide or to refresh it. This replaces the current guide.',
        'Generera om atletens Måltidsguide för prestation (bygger om de planerade måltiderna och recepten för veckan utifrån senaste träning och mål). Använd när atleten ber om en ny/fräsch måltidsguide eller att uppdatera den. Detta ersätter den nuvarande guiden.'
      ),
      inputSchema: z.object({
        startDate: z.string().optional().describe('Week start date (YYYY-MM-DD). Default: today.'),
      }),
      execute: async ({ startDate }) => {
        try {
          const client = await prisma.client.findUnique({ where: { id: clientId }, select: { userId: true } })
          const start = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
            ? new Date(`${startDate}T12:00:00.000Z`)
            : new Date()
          await generateAndSavePerformanceMealGuide({
            clientId,
            userId: client?.userId ?? '',
            locale,
            startDate: start,
            useAi: true,
          })
          return {
            success: true,
            message: chatText(locale, 'Generated a fresh Performance Meal Guide.', 'Skapade en ny Måltidsguide för prestation.'),
          }
        } catch (error) {
          logger.error('regeneratePerformanceGuide tool failed', { clientId }, error)
          return { success: false, error: chatText(locale, 'Could not regenerate the meal guide. Please try again.', 'Kunde inte generera om måltidsguiden. Försök igen.') }
        }
      },
    }),
  }
}
