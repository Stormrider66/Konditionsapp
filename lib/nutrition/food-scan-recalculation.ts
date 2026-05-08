import type { FoodPhotoAnalysisResult } from '@/lib/validations/gemini-schemas'
import { applyBoneInAdjustment } from '@/lib/nutrition/bone-in-adjustment'

type BaseFoodItem = FoodPhotoAnalysisResult['items'][number]

export type EditableFoodItem = BaseFoodItem & {
  nutrientDensity: NutrientDensity
}

export interface NutrientDensity {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
  saturatedFatGrams?: number
  monounsaturatedFatGrams?: number
  polyunsaturatedFatGrams?: number
  sugarGrams?: number
  complexCarbsGrams?: number
}

export interface FoodTotals {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
  saturatedFatGrams?: number
  monounsaturatedFatGrams?: number
  polyunsaturatedFatGrams?: number
  sugarGrams?: number
  complexCarbsGrams?: number
}

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const toDensity = (value: number | undefined, grams: number) => {
  if (value == null) return undefined
  if (grams <= 0) return 0
  return value / grams
}

const applyDensity = (density: number | undefined, grams: number, decimals = 1) => {
  if (density == null) return undefined
  return roundTo(density * grams, decimals)
}

export function parsePortionGramsFromText(text: string): number | null {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(',', '.')
    .replace(/\s+/g, ' ')

  const match = normalized.match(/(^|\s)(\d+(?:\.\d+)?)\s*(kg|g|gram|ml|cl|dl|l|liter)\b/)
  if (!match) return null

  const amount = Number.parseFloat(match[2])
  if (!Number.isFinite(amount) || amount <= 0) return null

  const unit = match[3]
  if (unit === 'kg') return roundTo(amount * 1000, 1)
  if (unit === 'g' || unit === 'gram') return roundTo(amount, 1)
  if (unit === 'ml') return roundTo(amount, 1)
  if (unit === 'cl') return roundTo(amount * 10, 1)
  if (unit === 'dl') return roundTo(amount * 100, 1)
  if (unit === 'l' || unit === 'liter') return roundTo(amount * 1000, 1)

  return null
}

export function createEditableFoodItem(
  item: FoodPhotoAnalysisResult['items'][number]
): EditableFoodItem {
  const adjustedItem = applyBoneInAdjustment(item)
  const grams = adjustedItem.estimatedGrams

  return {
    ...adjustedItem,
    nutrientDensity: {
      calories: grams > 0 ? adjustedItem.calories / grams : 0,
      proteinGrams: grams > 0 ? adjustedItem.proteinGrams / grams : 0,
      carbsGrams: grams > 0 ? adjustedItem.carbsGrams / grams : 0,
      fatGrams: grams > 0 ? adjustedItem.fatGrams / grams : 0,
      fiberGrams: grams > 0 ? adjustedItem.fiberGrams / grams : 0,
      saturatedFatGrams: toDensity(adjustedItem.saturatedFatGrams, grams),
      monounsaturatedFatGrams: toDensity(adjustedItem.monounsaturatedFatGrams, grams),
      polyunsaturatedFatGrams: toDensity(adjustedItem.polyunsaturatedFatGrams, grams),
      sugarGrams: toDensity(adjustedItem.sugarGrams, grams),
      complexCarbsGrams: toDensity(adjustedItem.complexCarbsGrams, grams),
    },
  }
}

export function recalculateItemFromGrams(item: EditableFoodItem, estimatedGrams: number): EditableFoodItem {
  const grams = Math.max(0, estimatedGrams)

  return {
    ...item,
    estimatedGrams: grams,
    calories: Math.round(item.nutrientDensity.calories * grams),
    proteinGrams: roundTo(item.nutrientDensity.proteinGrams * grams, 1),
    carbsGrams: roundTo(item.nutrientDensity.carbsGrams * grams, 1),
    fatGrams: roundTo(item.nutrientDensity.fatGrams * grams, 1),
    fiberGrams: roundTo(item.nutrientDensity.fiberGrams * grams, 1),
    saturatedFatGrams: applyDensity(item.nutrientDensity.saturatedFatGrams, grams),
    monounsaturatedFatGrams: applyDensity(item.nutrientDensity.monounsaturatedFatGrams, grams),
    polyunsaturatedFatGrams: applyDensity(item.nutrientDensity.polyunsaturatedFatGrams, grams),
    sugarGrams: applyDensity(item.nutrientDensity.sugarGrams, grams),
    complexCarbsGrams: applyDensity(item.nutrientDensity.complexCarbsGrams, grams),
  }
}

export function updateDensityFromManualValue(
  item: EditableFoodItem,
  field: keyof NutrientDensity,
  value: number
): EditableFoodItem {
  const grams = item.estimatedGrams
  const density = grams > 0 ? value / grams : 0

  return {
    ...item,
    nutrientDensity: {
      ...item.nutrientDensity,
      [field]: density,
    },
  }
}

export function calculateFoodTotals(items: EditableFoodItem[]): FoodTotals {
  return items.reduce<FoodTotals>(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinGrams: acc.proteinGrams + item.proteinGrams,
      carbsGrams: acc.carbsGrams + item.carbsGrams,
      fatGrams: acc.fatGrams + item.fatGrams,
      fiberGrams: acc.fiberGrams + item.fiberGrams,
      saturatedFatGrams:
        item.saturatedFatGrams != null
          ? (acc.saturatedFatGrams ?? 0) + item.saturatedFatGrams
          : acc.saturatedFatGrams,
      monounsaturatedFatGrams:
        item.monounsaturatedFatGrams != null
          ? (acc.monounsaturatedFatGrams ?? 0) + item.monounsaturatedFatGrams
          : acc.monounsaturatedFatGrams,
      polyunsaturatedFatGrams:
        item.polyunsaturatedFatGrams != null
          ? (acc.polyunsaturatedFatGrams ?? 0) + item.polyunsaturatedFatGrams
          : acc.polyunsaturatedFatGrams,
      sugarGrams:
        item.sugarGrams != null ? (acc.sugarGrams ?? 0) + item.sugarGrams : acc.sugarGrams,
      complexCarbsGrams:
        item.complexCarbsGrams != null
          ? (acc.complexCarbsGrams ?? 0) + item.complexCarbsGrams
          : acc.complexCarbsGrams,
    }),
    {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
      saturatedFatGrams: undefined,
      monounsaturatedFatGrams: undefined,
      polyunsaturatedFatGrams: undefined,
      sugarGrams: undefined,
      complexCarbsGrams: undefined,
    }
  )
}
