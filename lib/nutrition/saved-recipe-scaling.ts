export type RecipeAmountUnit = 'g' | 'ml' | 'dl' | 'st' | 'portion'

export interface SavedRecipeScalingItem {
  grams: number
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number
}

export interface SavedRecipeForScaling {
  baseServings: number
  items: SavedRecipeScalingItem[]
}

export interface SavedRecipeTotals {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
}

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round((value + 1e-9) * factor) / factor
}

export function savedRecipeTotalGrams(recipe: SavedRecipeForScaling): number {
  return recipe.items.reduce((sum, item) => sum + item.grams, 0)
}

export function savedRecipeTotals(recipe: SavedRecipeForScaling): SavedRecipeTotals {
  return recipe.items.reduce<SavedRecipeTotals>(
    (acc, item) => {
      const factor = item.grams / 100
      return {
        calories: acc.calories + item.caloriesPer100g * factor,
        proteinGrams: acc.proteinGrams + item.proteinPer100g * factor,
        carbsGrams: acc.carbsGrams + item.carbsPer100g * factor,
        fatGrams: acc.fatGrams + item.fatPer100g * factor,
        fiberGrams: acc.fiberGrams + item.fiberPer100g * factor,
      }
    },
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 }
  )
}

export function recipeAmountToGrams(
  recipe: SavedRecipeForScaling,
  amount: number,
  unit: RecipeAmountUnit,
  pieceGrams = 0
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0

  const totalGrams = savedRecipeTotalGrams(recipe)
  if (unit === 'g') return amount
  if (unit === 'ml') return amount
  if (unit === 'dl') return amount * 100

  if (unit === 'portion') {
    const baseServings = recipe.baseServings > 0 ? recipe.baseServings : 1
    return totalGrams > 0 ? (totalGrams * amount) / baseServings : 0
  }

  if (unit === 'st') {
    if (pieceGrams > 0) return amount * pieceGrams
    const baseServings = recipe.baseServings > 0 ? recipe.baseServings : 1
    return totalGrams > 0 ? (totalGrams * amount) / baseServings : 0
  }

  return 0
}

export function recipeAmountToScaleFactor(
  recipe: SavedRecipeForScaling,
  amount: number,
  unit: RecipeAmountUnit,
  pieceGrams = 0
): number {
  const totalGrams = savedRecipeTotalGrams(recipe)
  if (totalGrams <= 0) return 0
  return recipeAmountToGrams(recipe, amount, unit, pieceGrams) / totalGrams
}

export function scaleSavedRecipeTotals(
  recipe: SavedRecipeForScaling,
  grams: number
): SavedRecipeTotals {
  const totalGrams = savedRecipeTotalGrams(recipe)
  if (totalGrams <= 0 || grams <= 0) {
    return { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 }
  }

  const totals = savedRecipeTotals(recipe)
  const factor = grams / totalGrams

  return {
    calories: Math.round(totals.calories * factor),
    proteinGrams: roundTo(totals.proteinGrams * factor, 1),
    carbsGrams: roundTo(totals.carbsGrams * factor, 1),
    fatGrams: roundTo(totals.fatGrams * factor, 1),
    fiberGrams: roundTo(totals.fiberGrams * factor, 1),
  }
}
