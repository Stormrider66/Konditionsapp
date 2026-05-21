import type { FoodPhotoAnalysisResult } from '@/lib/validations/gemini-schemas'

type FoodItem = FoodPhotoAnalysisResult['items'][number]
type FoodCategory = FoodItem['category']

export interface FoodReferenceMatch {
  nameSv: string
  nameEn?: string | null
  category?: string | null
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number | null
  saturatedFatPer100g?: number | null
  monounsaturatedFatPer100g?: number | null
  polyunsaturatedFatPer100g?: number | null
  sugarPer100g?: number | null
  isCompleteProtein?: boolean | null
  proteinSource?: string | null
}

export interface SimpleFoodIdentityCorrection {
  foodName: string
  targetName?: string
  grams?: number
  portionDescription?: string
}

export interface FastFoodRefineResult {
  result: FoodPhotoAnalysisResult
  targetIndex: number
  source: 'reference_food' | 'preserved_similar_item'
}

const VALID_CATEGORIES = new Set([
  'PROTEIN',
  'CARB',
  'FAT',
  'VEGETABLE',
  'FRUIT',
  'DAIRY',
  'GRAIN',
  'BEVERAGE',
  'OTHER',
] as const)

const DIRECT_PATTERNS = [
  /^(?:det|den|de|detta|denna|maten|måltiden|rätten)\s+(?:är|var|ska vara|skall vara)\s+(?:egentligen\s+)?(.+)$/i,
  /^(?:it|this|that|the food|the meal)\s+(?:is|was|should be)\s+(?:actually\s+)?(.+)$/i,
  /^(?:egentligen|actually)\s+(.+)$/i,
  /^(?:ändra|byt|uppdatera)\s+(?:det|den|de|maten|måltiden)?\s*(?:till|mot|som)\s+(.+)$/i,
  /^(?:change|replace|update)\s+(?:it|this|that|the food|the meal)?\s*(?:to|with|as)\s+(.+)$/i,
]

const NEGATION_PATTERNS = [
  /^(?:det|den|de|detta|denna|maten|måltiden|rätten)\s+(?:är|var)\s+inte\s+.+?\s+(?:utan|men|istället|istallet)\s+(.+)$/i,
  /^(?:it|this|that|the food|the meal)\s+(?:is|was)\s+not\s+.+?\s+(?:but|instead)\s+(.+)$/i,
]

const TARGET_PATTERNS = [
  /^(.{2,36}?)\s+(?:är|var|ska vara|skall vara|is|was|should be)\s+(.+)$/i,
  /^(?:ändra|byt|uppdatera|change|replace|update)\s+(.{2,36}?)\s+(?:till|mot|to|with|as)\s+(.+)$/i,
]

const CARB_WORDS = [
  'pasta',
  'spaghetti',
  'makaron',
  'nudel',
  'ris',
  'rice',
  'potatis',
  'potato',
  'bulgur',
  'couscous',
  'quinoa',
  'bröd',
  'brod',
  'bread',
  'majs',
  'corn',
]

const PROTEIN_WORDS = [
  'kyckling',
  'chicken',
  'kött',
  'kott',
  'beef',
  'fisk',
  'fish',
  'lax',
  'salmon',
  'ägg',
  'agg',
  'egg',
  'tofu',
  'tempeh',
]

const FAT_WORDS = ['avokado', 'avocado', 'olja', 'oil', 'nöt', 'not', 'nut', 'mandel', 'almond']
const VEGETABLE_WORDS = ['sallad', 'broccoli', 'gurka', 'cucumber', 'tomat', 'tomato', 'spenat', 'spinach']
const FRUIT_WORDS = ['banan', 'banana', 'äpple', 'apple', 'äppel', 'apelsin', 'orange', 'bär', 'bar', 'berry']
const DAIRY_WORDS = ['mjölk', 'mjolk', 'milk', 'yoghurt', 'yogurt', 'ost', 'cheese', 'kvarg']

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeFoodName(value: string): string {
  return normalizeText(value)
    .replace(/\b(en|ett|a|an|the|ca|cirka|about|ungefar|ungefär)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripSwedishDefiniteSuffix(value: string): string {
  if (value.length <= 4) return value
  for (const suffix of ['arna', 'erna', 'orna', 'en', 'et', 'n']) {
    if (value.endsWith(suffix) && value.length - suffix.length >= 4) {
      return value.slice(0, -suffix.length)
    }
  }
  return value
}

function hasAnyWord(value: string, words: string[]): boolean {
  return words.some((word) => value.includes(word))
}

function guessCategory(name: string): FoodCategory | undefined {
  const normalized = normalizeFoodName(name)
  if (hasAnyWord(normalized, PROTEIN_WORDS)) return 'PROTEIN'
  if (hasAnyWord(normalized, FAT_WORDS)) return 'FAT'
  if (hasAnyWord(normalized, VEGETABLE_WORDS)) return 'VEGETABLE'
  if (hasAnyWord(normalized, FRUIT_WORDS)) return 'FRUIT'
  if (hasAnyWord(normalized, DAIRY_WORDS)) return 'DAIRY'
  if (hasAnyWord(normalized, CARB_WORDS)) return 'GRAIN'
  return undefined
}

function normalizeCategory(category: string | null | undefined): FoodCategory | undefined {
  if (!category) return undefined
  return VALID_CATEGORIES.has(category as FoodCategory) ? (category as FoodCategory) : undefined
}

function categoriesCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  if (a === b) return true
  return (a === 'CARB' && b === 'GRAIN') || (a === 'GRAIN' && b === 'CARB')
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function parseQuantity(candidate: string): {
  foodName: string
  grams?: number
  portionDescription?: string
} {
  const match = candidate.match(/\b(\d+(?:[,.]\d+)?)\s*(kg|g|gram|grams|ml|cl|dl|l|liter|litre|liters|litres)\b/i)
  if (!match) return { foodName: candidate }

  const amount = Number.parseFloat(match[1].replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) return { foodName: candidate }

  const unit = match[2].toLowerCase()
  const grams =
    unit === 'kg'
      ? amount * 1000
      : unit === 'cl'
        ? amount * 10
        : unit === 'dl'
          ? amount * 100
          : unit === 'l' || unit === 'liter' || unit === 'litre' || unit === 'liters' || unit === 'litres'
            ? amount * 1000
            : amount

  const foodName = candidate
    .replace(match[0], ' ')
    .replace(/\b(av|of)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    foodName: foodName || candidate,
    grams: roundTo(grams, 1),
    portionDescription: `${match[1].replace('.', ',')} ${match[2].toLowerCase()}`,
  }
}

function cleanCandidate(value: string): string | null {
  const cleaned = value
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/[.!?]+$/g, '')
    .replace(/\s+(?:tack|please)$/i, '')
    .replace(/^(?:en|ett|a|an|the)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!/[a-zåäöé]/i.test(cleaned)) return null
  if (cleaned.split(/\s+/).length > 5) return null
  if (/\b(och|and|plus|samt|med|with)\b/i.test(cleaned)) return null

  return cleaned
}

export function parseSimpleFoodIdentityCorrection(text: string): SimpleFoodIdentityCorrection | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  for (const pattern of NEGATION_PATTERNS) {
    const match = trimmed.match(pattern)
    const candidate = match?.[1] ? cleanCandidate(match[1]) : null
    if (candidate) {
      const parsed = parseQuantity(candidate)
      return { foodName: parsed.foodName, grams: parsed.grams, portionDescription: parsed.portionDescription }
    }
  }

  for (const pattern of DIRECT_PATTERNS) {
    const match = trimmed.match(pattern)
    const candidate = match?.[1] ? cleanCandidate(match[1]) : null
    if (candidate) {
      const parsed = parseQuantity(candidate)
      return { foodName: parsed.foodName, grams: parsed.grams, portionDescription: parsed.portionDescription }
    }
  }

  for (const pattern of TARGET_PATTERNS) {
    const match = trimmed.match(pattern)
    const target = match?.[1] ? cleanCandidate(match[1]) : null
    const candidate = match?.[2] ? cleanCandidate(match[2]) : null
    if (!target || !candidate) continue

    const normalizedTarget = normalizeFoodName(target)
    if (['det', 'den', 'de', 'it', 'this', 'that'].includes(normalizedTarget)) continue

    const parsed = parseQuantity(candidate)
    return {
      foodName: parsed.foodName,
      targetName: target,
      grams: parsed.grams,
      portionDescription: parsed.portionDescription,
    }
  }

  return null
}

export function getFoodCorrectionSearchTerm(correction: SimpleFoodIdentityCorrection): string {
  return correction.foodName.trim().toLowerCase()
}

function itemNameMatchesTarget(itemName: string, targetName: string): boolean {
  const item = normalizeFoodName(itemName)
  const target = normalizeFoodName(targetName)
  const targetBase = stripSwedishDefiniteSuffix(target)

  return item === target || item === targetBase || item.includes(targetBase) || targetBase.includes(item)
}

function sharedFoodTokenScore(itemName: string, foodName: string): number {
  const item = normalizeFoodName(itemName)
  const food = normalizeFoodName(foodName)
  if (!item || !food) return 0
  if (food.includes(item) || item.includes(food)) return 80

  const itemTokens = item.split(' ').filter((token) => token.length >= 4)
  const foodTokens = food.split(' ').filter((token) => token.length >= 4)
  return itemTokens.some((token) => foodTokens.includes(token)) ? 45 : 0
}

function findTargetIndex(
  items: FoodItem[],
  correction: SimpleFoodIdentityCorrection,
  foodMatch: FoodReferenceMatch | null | undefined
): { index: number; score: number } | null {
  if (items.length === 0) return null
  if (items.length === 1 && foodMatch) return { index: 0, score: 60 }

  if (correction.targetName) {
    const targetIndex = items.findIndex((item) => itemNameMatchesTarget(item.name, correction.targetName!))
    if (targetIndex >= 0) return { index: targetIndex, score: 100 }
  }

  const guessedCategory = normalizeCategory(foodMatch?.category) ?? guessCategory(correction.foodName)
  let best: { index: number; score: number } | null = null

  for (const [index, item] of items.entries()) {
    let score = sharedFoodTokenScore(item.name, correction.foodName)
    if (guessedCategory && categoriesCompatible(item.category, guessedCategory)) score += 45
    if (guessedCategory && item.category === guessedCategory) score += 20
    if (!best || score > best.score) best = { index, score }
  }

  if (!best) return null
  if (foodMatch && best.score >= 35) return best
  if (best.score >= 45) return best
  return null
}

function scaleOptional(value: number | null | undefined, factor: number): number | undefined {
  return value == null ? undefined : roundTo(value * factor, 1)
}

function scaleExistingItem(item: FoodItem, grams: number): FoodItem {
  const currentGrams = item.estimatedGrams > 0 ? item.estimatedGrams : grams
  const factor = currentGrams > 0 ? grams / currentGrams : 1

  return {
    ...item,
    estimatedGrams: grams,
    calories: Math.round(item.calories * factor),
    proteinGrams: roundTo(item.proteinGrams * factor, 1),
    carbsGrams: roundTo(item.carbsGrams * factor, 1),
    fatGrams: roundTo(item.fatGrams * factor, 1),
    fiberGrams: roundTo(item.fiberGrams * factor, 1),
    saturatedFatGrams: scaleOptional(item.saturatedFatGrams, factor),
    monounsaturatedFatGrams: scaleOptional(item.monounsaturatedFatGrams, factor),
    polyunsaturatedFatGrams: scaleOptional(item.polyunsaturatedFatGrams, factor),
    sugarGrams: scaleOptional(item.sugarGrams, factor),
    complexCarbsGrams: scaleOptional(item.complexCarbsGrams, factor),
  }
}

function buildItemFromFoodReference({
  foodMatch,
  grams,
  fallbackCategory,
  portionDescription,
}: {
  foodMatch: FoodReferenceMatch
  grams: number
  fallbackCategory: FoodCategory
  portionDescription: string
}): FoodItem {
  const factor = grams / 100
  const sugarGrams = scaleOptional(foodMatch.sugarPer100g, factor)
  const carbsGrams = roundTo(foodMatch.carbsPer100g * factor, 1)

  return {
    name: foodMatch.nameSv,
    category: normalizeCategory(foodMatch.category) ?? fallbackCategory,
    estimatedGrams: grams,
    portionDescription,
    calories: Math.round(foodMatch.caloriesPer100g * factor),
    proteinGrams: roundTo(foodMatch.proteinPer100g * factor, 1),
    carbsGrams,
    fatGrams: roundTo(foodMatch.fatPer100g * factor, 1),
    fiberGrams: roundTo((foodMatch.fiberPer100g ?? 0) * factor, 1),
    saturatedFatGrams: scaleOptional(foodMatch.saturatedFatPer100g, factor),
    monounsaturatedFatGrams: scaleOptional(foodMatch.monounsaturatedFatPer100g, factor),
    polyunsaturatedFatGrams: scaleOptional(foodMatch.polyunsaturatedFatPer100g, factor),
    sugarGrams,
    complexCarbsGrams: sugarGrams == null ? undefined : roundTo(Math.max(0, carbsGrams - sugarGrams), 1),
    isCompleteProtein: foodMatch.isCompleteProtein ?? undefined,
    proteinSource:
      foodMatch.proteinSource === 'ANIMAL' ||
      foodMatch.proteinSource === 'PLANT' ||
      foodMatch.proteinSource === 'MIXED' ||
      foodMatch.proteinSource === 'UNKNOWN'
        ? foodMatch.proteinSource
        : undefined,
  }
}

function sumItems(items: FoodItem[]): FoodPhotoAnalysisResult['totals'] {
  return items.reduce<FoodPhotoAnalysisResult['totals']>(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinGrams: roundTo(acc.proteinGrams + item.proteinGrams, 1),
      carbsGrams: roundTo(acc.carbsGrams + item.carbsGrams, 1),
      fatGrams: roundTo(acc.fatGrams + item.fatGrams, 1),
      fiberGrams: roundTo(acc.fiberGrams + item.fiberGrams, 1),
      saturatedFatGrams:
        item.saturatedFatGrams == null
          ? acc.saturatedFatGrams
          : roundTo((acc.saturatedFatGrams ?? 0) + item.saturatedFatGrams, 1),
      monounsaturatedFatGrams:
        item.monounsaturatedFatGrams == null
          ? acc.monounsaturatedFatGrams
          : roundTo((acc.monounsaturatedFatGrams ?? 0) + item.monounsaturatedFatGrams, 1),
      polyunsaturatedFatGrams:
        item.polyunsaturatedFatGrams == null
          ? acc.polyunsaturatedFatGrams
          : roundTo((acc.polyunsaturatedFatGrams ?? 0) + item.polyunsaturatedFatGrams, 1),
      sugarGrams:
        item.sugarGrams == null
          ? acc.sugarGrams
          : roundTo((acc.sugarGrams ?? 0) + item.sugarGrams, 1),
      complexCarbsGrams:
        item.complexCarbsGrams == null
          ? acc.complexCarbsGrams
          : roundTo((acc.complexCarbsGrams ?? 0) + item.complexCarbsGrams, 1),
    }),
    {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
    }
  )
}

function replaceFoodNameInDescription(description: string, oldName: string, newName: string, itemCount: number): string {
  if (!description.trim()) return newName

  const oldNamePattern = oldName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (oldNamePattern) {
    const replaced = description.replace(new RegExp(oldNamePattern, 'i'), newName)
    if (replaced !== description) return replaced
  }

  return itemCount === 1 ? newName : description
}

function formatFallbackName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function applySimpleFoodIdentityCorrection({
  originalAnalysis,
  correction,
  foodMatch,
}: {
  originalAnalysis: unknown
  correction: SimpleFoodIdentityCorrection
  foodMatch?: FoodReferenceMatch | null
}): FastFoodRefineResult | null {
  if (
    typeof originalAnalysis !== 'object' ||
    originalAnalysis === null ||
    !Array.isArray((originalAnalysis as FoodPhotoAnalysisResult).items)
  ) {
    return null
  }

  const analysis = originalAnalysis as FoodPhotoAnalysisResult
  const target = findTargetIndex(analysis.items, correction, foodMatch)
  if (!target) return null

  const originalItem = analysis.items[target.index]
  const guessedCategory = guessCategory(correction.foodName)
  const grams = correction.grams ?? originalItem.estimatedGrams
  const portionDescription = correction.portionDescription ?? originalItem.portionDescription

  const updatedItem = foodMatch
    ? buildItemFromFoodReference({
        foodMatch,
        grams,
        fallbackCategory: normalizeCategory(originalItem.category) ?? guessedCategory ?? 'OTHER',
        portionDescription,
      })
    : {
        ...scaleExistingItem(originalItem, grams),
        name: formatFallbackName(correction.foodName),
        category: guessedCategory ?? originalItem.category,
        portionDescription,
      }

  const updatedItems = analysis.items.map((item, index) => (index === target.index ? updatedItem : item))

  return {
    targetIndex: target.index,
    source: foodMatch ? 'reference_food' : 'preserved_similar_item',
    result: {
      ...analysis,
      success: true,
      items: updatedItems,
      totals: sumItems(updatedItems),
      mealDescription: replaceFoodNameInDescription(
        analysis.mealDescription,
        originalItem.name,
        updatedItem.name,
        analysis.items.length
      ),
      confidence: Math.max(analysis.confidence ?? 0, foodMatch ? 0.96 : 0.92),
      notes: analysis.notes ?? [],
    },
  }
}
