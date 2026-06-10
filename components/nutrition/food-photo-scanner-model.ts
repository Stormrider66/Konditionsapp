// Constants, types, and pure helpers for the food photo scanner.

import type { FoodPhotoAnalysisResult } from '@/lib/validations/gemini-schemas'
import type { EditableFoodItem } from '@/lib/nutrition/food-scan-recalculation'
import {
  recipeAmountToGrams,
  scaleSavedRecipeTotals,
  type RecipeAmountUnit,
} from '@/lib/nutrition/saved-recipe-scaling'

export const SESSION_KEY = 'food-scanner-state'
export const MAX_NORMALIZED_IMAGE_DIMENSION = 1600
export const ANALYZE_TIMEOUT_MS = 55_000
export const MAX_CLARIFICATION_ATTEMPTS = 1

export type Step = 'CAPTURE' | 'ANALYZING' | 'CLARIFY' | 'REVIEW' | 'SAVING' | 'DONE'

export type FoodScanApiResponse = {
  result: FoodPhotoAnalysisResult
  enhancedMode?: boolean
  memoryUsed?: boolean
  portionSnaps?: unknown[]
}

export const getClarificationQuestion = (result: FoodPhotoAnalysisResult) =>
  result.clarification?.question?.trim() || null

export const isAbortError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  error.name === 'AbortError'

export const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'mealTypes.breakfast',
  MORNING_SNACK: 'mealTypes.morningSnack',
  LUNCH: 'mealTypes.lunch',
  AFTERNOON_SNACK: 'mealTypes.afternoonSnack',
  PRE_WORKOUT: 'mealTypes.preWorkout',
  POST_WORKOUT: 'mealTypes.postWorkout',
  DINNER: 'mealTypes.dinner',
  EVENING_SNACK: 'mealTypes.eveningSnack',
}

export const scannerLabelClass = 'text-xs font-medium text-slate-600 dark:text-slate-400'
export const scannerMicroLabelClass = 'text-[10px] font-medium text-slate-600 dark:text-slate-400'
export const scannerControlClass =
  'border-slate-200 bg-white text-slate-900 shadow-sm placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500'
export const scannerIconButtonClass =
  'border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
export const scannerPanelClass =
  'bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-0'

export const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export const nutrientPer100g = (value: number, grams: number) => {
  if (!Number.isFinite(value) || grams <= 0) return 0
  return roundTo((value / grams) * 100, 1)
}

export const makeSuggestedRecipeName = (mealDescription: string, items: EditableFoodItem[], fallbackName: string) => {
  const description = mealDescription.trim()
  if (description.length >= 2) return description.slice(0, 80)

  const names = items
    .map((item) => item.name.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ')

  return (names || fallbackName).slice(0, 80)
}

export const foodItemsToRecipeItems = (items: EditableFoodItem[]) =>
  items
    .filter((item) => item.name.trim().length > 0 && item.estimatedGrams > 0)
    .map((item) => ({
      name: item.name.trim(),
      category: item.category,
      grams: roundTo(item.estimatedGrams, 1),
      caloriesPer100g: nutrientPer100g(item.calories, item.estimatedGrams),
      proteinPer100g: nutrientPer100g(item.proteinGrams, item.estimatedGrams),
      carbsPer100g: nutrientPer100g(item.carbsGrams, item.estimatedGrams),
      fatPer100g: nutrientPer100g(item.fatGrams, item.estimatedGrams),
      fiberPer100g: nutrientPer100g(item.fiberGrams, item.estimatedGrams),
    }))

export interface ScannerSavedRecipeIngredient {
  id: string
  name: string
  grams: number
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number
}

export interface ScannerSavedRecipe {
  id: string
  name: string
  baseServings: number
  updatedAt: string
  items: ScannerSavedRecipeIngredient[]
}

export const parsePositiveNumber = (value: string, fallback = 0) => {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const formatDisplayNumber = (value: number) => {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export const recipeAmountPreview = (
  recipe: ScannerSavedRecipe,
  amountValue: string,
  unit: RecipeAmountUnit,
  pieceGramsValue: string
) => {
  const amount = parsePositiveNumber(amountValue, 0)
  const pieceGrams = parsePositiveNumber(pieceGramsValue, 0)
  const grams = recipeAmountToGrams(recipe, amount, unit, pieceGrams)
  const totals = scaleSavedRecipeTotals(recipe, grams)
  return { grams, totals }
}

export function scannerRecipeCopy(locale: 'en' | 'sv') {
  if (locale === 'sv') {
    return {
      button: 'Använd sparat recept',
      title: 'Sparade recept',
      refresh: 'Uppdatera',
      loading: 'Hämtar...',
      empty: 'Inga sparade recept ännu.',
      amountLabel: 'Mängd',
      unitLabel: 'Enhet',
      pieceGramsLabel: 'Gram per styck',
      selectedPrefix: 'Receptkontext',
      clear: 'Ta bort',
      totalGrams: '{grams} g total sats',
      caloriesForAmount: 'Receptet ger ca {calories} kcal för {grams} g.',
      fetchError: 'Kunde inte hämta recept',
      pieceGramsRequired: 'Ange gram per styck för att använda styck.',
    }
  }

  return {
    button: 'Use saved recipe',
    title: 'Saved recipes',
    refresh: 'Refresh',
    loading: 'Loading...',
    empty: 'No saved recipes yet.',
    amountLabel: 'Amount',
    unitLabel: 'Unit',
    pieceGramsLabel: 'Grams per piece',
    selectedPrefix: 'Recipe context',
    clear: 'Remove',
    totalGrams: '{grams} g full batch',
    caloriesForAmount: 'Recipe provides about {calories} kcal for {grams} g.',
    fetchError: 'Could not fetch recipes',
    pieceGramsRequired: 'Enter grams per piece to use pieces.',
  }
}

export interface FoodPhotoScannerProps {
  onMealSaved?: (meal: unknown) => void
  onClose?: () => void
  defaultMealType?: string
  defaultDate?: string
  redirectPathOnSave?: string
}

export const readFileAsDataUrl = (file: File, timeoutMs: number | undefined, readErrorMessage: string) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    let timer: ReturnType<typeof setTimeout> | undefined

    if (timeoutMs) {
      timer = setTimeout(() => {
        reader.abort()
        reject(new Error(readErrorMessage))
      }, timeoutMs)
    }

    reader.onload = () => {
      if (timer) clearTimeout(timer)
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error(readErrorMessage))
    }
    reader.onerror = () => {
      if (timer) clearTimeout(timer)
      reject(new Error(readErrorMessage))
    }
    reader.onabort = () => {
      if (timer) clearTimeout(timer)
      reject(new Error('File read aborted'))
    }
    reader.readAsDataURL(file)
  })

export const normalizeImageToJpeg = async (file: File, readErrorMessage: string) => {
  try {
    const dataUrl = await readFileAsDataUrl(file, undefined, readErrorMessage)

    return await new Promise<File | null>((resolve) => {
      const img = new Image()

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const maxDimension = Math.max(img.naturalWidth, img.naturalHeight)
          const scale = maxDimension > MAX_NORMALIZED_IMAGE_DIMENSION
            ? MAX_NORMALIZED_IMAGE_DIMENSION / maxDimension
            : 1
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(null)
            return
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(null)
                return
              }

              resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
            },
            'image/jpeg',
            0.92
          )
        } catch {
          resolve(null)
        }
      }

      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
  } catch {
    return null
  }
}
