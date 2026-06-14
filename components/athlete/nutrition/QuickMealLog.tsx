'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  IngredientBuilder,
  type IngredientRow,
  ingredientRowsFromItems,
  ingredientRowsToApiItems,
  sumIngredientMacros,
} from './IngredientBuilder'
import {
  Sunrise,
  Sun,
  Moon,
  Coffee,
  Apple,
  Camera,
  Dumbbell,
  UtensilsCrossed,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Loader2,
  Repeat,
  Scale,
} from 'lucide-react'
import { MealType } from '@prisma/client'
import { cn } from '@/lib/utils'
import { guessDefaultMealType } from '@/lib/nutrition/guess-meal-type'
import {
  getAiAllowanceUpgradeMessage,
  isAiAllowanceExhaustedError,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors'
import { useLocale, useTranslations } from '@/i18n/client'

export interface EditMealData {
  id: string
  mealType: MealType
  time?: string | null
  description: string
  calories?: number | null
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatGrams?: number | null
  isPreWorkout?: boolean
  isPostWorkout?: boolean
  notes?: string | null
}

interface QuickMealLogProps {
  open: boolean
  onClose: () => void
  onMealSaved?: () => void
  date?: Date
  defaultMealType?: MealType
  editMeal?: EditMealData | null
  defaultTab?: MealLogTab
  recipeScanRequestKey?: number
}

type MealLogTab = 'text' | 'ingredients'

type MealFormData = {
  mealType: MealType
  time: string
  description: string
  calories: string
  proteinGrams: string
  carbsGrams: string
  fatGrams: string
  isPreWorkout: boolean
  isPostWorkout: boolean
  notes: string
}

export interface MealLogData {
  date: string
  mealType: MealType
  time?: string
  description: string
  calories?: number
  proteinGrams?: number
  carbsGrams?: number
  fatGrams?: number
  isPreWorkout?: boolean
  isPostWorkout?: boolean
  notes?: string
}

interface YesterdayMealItem {
  foodId: string | null
  name: string
  category?: string | null
  estimatedGrams: number
  portionDescription: string | null
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
  saturatedFatGrams?: number | null
  monounsaturatedFatGrams?: number | null
  polyunsaturatedFatGrams?: number | null
  sugarGrams?: number | null
  isCompleteProtein?: boolean | null
  proteinSource?: 'ANIMAL' | 'PLANT' | 'MIXED' | 'UNKNOWN' | null
}

interface YesterdayMeal {
  description: string
  calories: number | null
  proteinGrams: number | null
  carbsGrams: number | null
  fatGrams: number | null
  items?: YesterdayMealItem[]
}

interface QuickMealItem {
  name: string
  translationKey?: string
  grams: number
  kcal: number
  p: number
  c: number
  f: number
}

interface QuickMeal {
  description: string
  translationKey?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  items?: QuickMealItem[]
}

interface AiEstimatedMealItem {
  name: string
  category?: string | null
  estimatedGrams: number
  portionDescription?: string | null
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams?: number
  saturatedFatGrams?: number
  monounsaturatedFatGrams?: number
  polyunsaturatedFatGrams?: number
  sugarGrams?: number
  complexCarbsGrams?: number
  isCompleteProtein?: boolean
  proteinSource?: 'ANIMAL' | 'PLANT' | 'MIXED' | 'UNKNOWN'
}

interface AiTextEstimate {
  description: string
  items: AiEstimatedMealItem[]
  totals: {
    calories: number
    proteinGrams: number
    carbsGrams: number
    fatGrams: number
    fiberGrams?: number
  }
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function formatGrams(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function parseFormNumber(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeDescription(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function getAiEstimateTotalGrams(items: AiEstimatedMealItem[]): number {
  return roundOneDecimal(items.reduce((sum, item) => sum + item.estimatedGrams, 0))
}

function aiEstimateMatchesCurrentMacros(estimate: AiTextEstimate, formData: MealFormData): boolean {
  const calories = parseFormNumber(formData.calories)
  const protein = parseFormNumber(formData.proteinGrams)
  const carbs = parseFormNumber(formData.carbsGrams)
  const fat = parseFormNumber(formData.fatGrams)

  return (
    calories !== null &&
    protein !== null &&
    carbs !== null &&
    fat !== null &&
    Math.round(calories) === Math.round(estimate.totals.calories) &&
    Math.abs(roundOneDecimal(protein) - roundOneDecimal(estimate.totals.proteinGrams)) < 0.05 &&
    Math.abs(roundOneDecimal(carbs) - roundOneDecimal(estimate.totals.carbsGrams)) < 0.05 &&
    Math.abs(roundOneDecimal(fat) - roundOneDecimal(estimate.totals.fatGrams)) < 0.05
  )
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateInputValueToDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatYesterdayItem(item: YesterdayMealItem): string {
  const portion = item.portionDescription?.trim()
  const grams = `${formatGrams(item.estimatedGrams)} g`
  return portion ? `${item.name} (${portion}, ${grams})` : `${item.name} ${grams}`
}

function getYesterdayAmountSummary(
  meal: YesterdayMeal,
  labels: { extra: (count: number) => string; total: string }
): string | null {
  if (!meal.items || meal.items.length === 0) return null

  const totalGrams = meal.items.reduce((sum, item) => sum + item.estimatedGrams, 0)
  const itemPreview = meal.items.slice(0, 3).map(formatYesterdayItem).join(', ')
  const extraCount = meal.items.length > 3 ? labels.extra(meal.items.length - 3) : ''

  return `${formatGrams(Math.round(totalGrams * 10) / 10)} g ${labels.total} · ${itemPreview}${extraCount}`
}

const MEAL_TYPE_CONFIG: Record<MealType, { icon: typeof Sunrise; labelKey: string; color: string }> = {
  BREAKFAST: { icon: Sunrise, labelKey: 'breakfast', color: 'bg-yellow-500' },
  MORNING_SNACK: { icon: Coffee, labelKey: 'morningSnack', color: 'bg-orange-400' },
  LUNCH: { icon: Sun, labelKey: 'lunch', color: 'bg-orange-500' },
  AFTERNOON_SNACK: { icon: Apple, labelKey: 'afternoonSnack', color: 'bg-green-500' },
  PRE_WORKOUT: { icon: Dumbbell, labelKey: 'preWorkout', color: 'bg-blue-500' },
  POST_WORKOUT: { icon: Dumbbell, labelKey: 'postWorkout', color: 'bg-purple-500' },
  DINNER: { icon: Moon, labelKey: 'dinner', color: 'bg-indigo-500' },
  EVENING_SNACK: { icon: UtensilsCrossed, labelKey: 'eveningSnack', color: 'bg-gray-500' },
}

const QUICK_MEALS: QuickMeal[] = [
  {
    translationKey: 'oatmealBanana',
    description: 'oatmealBanana',
    calories: 350, protein: 12, carbs: 55, fat: 8,
    items: [
      { translationKey: 'oats', name: 'oats', grams: 80, kcal: 280, p: 10, c: 48, f: 6 },
      { translationKey: 'milk15', name: 'milk15', grams: 150, kcal: 62, p: 5, c: 7, f: 2 },
      { translationKey: 'banana', name: 'banana', grams: 100, kcal: 89, p: 1, c: 23, f: 0 },
    ],
  },
  {
    translationKey: 'eggToast',
    description: 'eggToast',
    calories: 400, protein: 20, carbs: 30, fat: 22,
    items: [
      { translationKey: 'friedEgg', name: 'friedEgg', grams: 120, kcal: 216, p: 15, c: 1, f: 17 },
      { translationKey: 'toast', name: 'toast', grams: 60, kcal: 155, p: 5, c: 29, f: 2 },
      { translationKey: 'butter', name: 'butter', grams: 10, kcal: 72, p: 0, c: 0, f: 8 },
    ],
  },
  {
    translationKey: 'proteinShake',
    description: 'Proteinshake',
    calories: 200, protein: 30, carbs: 10, fat: 3,
    items: [
      { translationKey: 'proteinPowder', name: 'proteinPowder', grams: 35, kcal: 130, p: 27, c: 3, f: 1 },
      { translationKey: 'milk15', name: 'milk15', grams: 200, kcal: 82, p: 7, c: 10, f: 2 },
    ],
  },
  {
    translationKey: 'chickenRiceBowl',
    description: 'chickenRiceBowl',
    calories: 550, protein: 40, carbs: 60, fat: 12,
    items: [
      { translationKey: 'chickenBreast', name: 'chickenBreast', grams: 150, kcal: 165, p: 31, c: 0, f: 4 },
      { translationKey: 'cookedRice', name: 'cookedRice', grams: 200, kcal: 260, p: 5, c: 56, f: 1 },
      { translationKey: 'vegetables', name: 'vegetables', grams: 100, kcal: 35, p: 2, c: 6, f: 0 },
      { translationKey: 'oliveOil', name: 'oliveOil', grams: 10, kcal: 88, p: 0, c: 0, f: 10 },
    ],
  },
  {
    translationKey: 'salmonSalad',
    description: 'Sallad med lax',
    calories: 450, protein: 35, carbs: 15, fat: 28,
    items: [
      { translationKey: 'salmonFillet', name: 'salmonFillet', grams: 150, kcal: 312, p: 30, c: 0, f: 21 },
      { translationKey: 'mixedSalad', name: 'mixedSalad', grams: 100, kcal: 20, p: 1, c: 3, f: 0 },
      { translationKey: 'avocado', name: 'avocado', grams: 50, kcal: 80, p: 1, c: 4, f: 7 },
      { translationKey: 'oliveOilDressing', name: 'oliveOilDressing', grams: 10, kcal: 88, p: 0, c: 0, f: 10 },
    ],
  },
  {
    translationKey: 'quarkBerries',
    description: 'quarkBerries',
    calories: 180, protein: 20, carbs: 15, fat: 2,
    items: [
      { translationKey: 'plainQuark', name: 'plainQuark', grams: 200, kcal: 120, p: 20, c: 6, f: 0 },
      { translationKey: 'mixedBerries', name: 'mixedBerries', grams: 80, kcal: 36, p: 1, c: 8, f: 0 },
      { translationKey: 'honey', name: 'honey', grams: 10, kcal: 30, p: 0, c: 8, f: 0 },
    ],
  },
  {
    translationKey: 'cheeseHamSandwich',
    description: 'cheeseHamSandwich',
    calories: 320, protein: 18, carbs: 28, fat: 16,
    items: [
      { translationKey: 'bread', name: 'bread', grams: 60, kcal: 155, p: 5, c: 28, f: 2 },
      { translationKey: 'cheese', name: 'cheese', grams: 25, kcal: 90, p: 6, c: 0, f: 7 },
      { translationKey: 'ham', name: 'ham', grams: 30, kcal: 36, p: 6, c: 1, f: 1 },
      { translationKey: 'butter', name: 'butter', grams: 8, kcal: 58, p: 0, c: 0, f: 6 },
    ],
  },
  {
    translationKey: 'pastaMeatSauce',
    description: 'pastaMeatSauce',
    calories: 600, protein: 30, carbs: 70, fat: 20,
    items: [
      { translationKey: 'cookedPasta', name: 'cookedPasta', grams: 200, kcal: 262, p: 9, c: 52, f: 2 },
      { translationKey: 'groundBeef', name: 'groundBeef', grams: 100, kcal: 205, p: 17, c: 0, f: 15 },
      { translationKey: 'tomatoSauce', name: 'tomatoSauce', grams: 100, kcal: 40, p: 1, c: 8, f: 1 },
      { translationKey: 'gratedCheese', name: 'gratedCheese', grams: 15, kcal: 56, p: 4, c: 0, f: 4 },
    ],
  },
]

export function QuickMealLog({
  open,
  onClose,
  onMealSaved,
  date = new Date(),
  defaultMealType,
  editMeal,
  defaultTab = 'text',
  recipeScanRequestKey = 0,
}: QuickMealLogProps) {
  const t = useTranslations('components.quickMealLog')
  const locale = useLocale()
  const isEditMode = !!editMeal
  const initialDateValue = toDateInputValue(date)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMacros, setShowMacros] = useState(false)
  const [tab, setTab] = useState<MealLogTab>(defaultTab)
  const [selectedDate, setSelectedDate] = useState(initialDateValue)
  const [ingredientScanRequestKey, setIngredientScanRequestKey] = useState(0)
  const [ingredients, setIngredients] = useState<IngredientRow[]>([])
  const [aiTextEstimate, setAiTextEstimate] = useState<AiTextEstimate | null>(null)
  const [enhancedFields, setEnhancedFields] = useState<{
    saturatedFatGrams?: number
    monounsaturatedFatGrams?: number
    polyunsaturatedFatGrams?: number
    sugarGrams?: number
    complexCarbsGrams?: number
    isCompleteProtein?: boolean
  }>({})
  const [formData, setFormData] = useState<MealFormData>({
    mealType: defaultMealType || guessDefaultMealType(),
    time: '',
    description: '',
    calories: '',
    proteinGrams: '',
    carbsGrams: '',
    fatGrams: '',
    isPreWorkout: false,
    isPostWorkout: false,
    notes: '',
  })
  const selectedDateLabel = dateInputValueToDate(selectedDate || initialDateValue).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Pre-fill form when editing. Also fetch the meal's per-ingredient
  // breakdown so the user can edit the same meal as a list of ingredients
  // rather than as free text + flat macros.
  useEffect(() => {
    if (editMeal && open) {
      setFormData({
        mealType: editMeal.mealType,
        time: editMeal.time || '',
        description: editMeal.description,
        calories: editMeal.calories?.toString() || '',
        proteinGrams: editMeal.proteinGrams?.toString() || '',
        carbsGrams: editMeal.carbsGrams?.toString() || '',
        fatGrams: editMeal.fatGrams?.toString() || '',
        isPreWorkout: editMeal.isPreWorkout || false,
        isPostWorkout: editMeal.isPostWorkout || false,
        notes: editMeal.notes || '',
      })
      if (editMeal.calories || editMeal.proteinGrams || editMeal.carbsGrams || editMeal.fatGrams) {
        setShowMacros(true)
      }

      // Hydrate ingredient rows from the meal's persisted items so re-opening
      // a meal logged via the ingredient builder lands back on the same list.
      const ctrl = new AbortController()
      fetch(`/api/meals/${editMeal.id}`, { signal: ctrl.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          const items = payload?.data?.items as
            | Array<{
                foodId: string | null
                name: string
                category?: string | null
                estimatedGrams: number
                calories: number
                proteinGrams: number
                carbsGrams: number
                fatGrams: number
                fiberGrams: number
                saturatedFatGrams?: number | null
                monounsaturatedFatGrams?: number | null
                polyunsaturatedFatGrams?: number | null
                sugarGrams?: number | null
                isCompleteProtein?: boolean | null
                proteinSource?: 'ANIMAL' | 'PLANT' | 'MIXED' | 'UNKNOWN' | null
              }>
            | undefined
          if (items && items.length > 0) {
            setIngredients(ingredientRowsFromItems(items.map((it) => ({ ...it, foodId: it.foodId ?? undefined }))))
            setTab('ingredients')
          }
        })
        .catch(() => {})
      return () => ctrl.abort()
    }
  }, [editMeal, open])

  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (open && !wasOpenRef.current && !isEditMode) {
      setSelectedDate(initialDateValue)
    }
    wasOpenRef.current = open
  }, [open, isEditMode, initialDateValue])

  // Hook the phone OS back button so it closes the dialog instead of
  // navigating off the page. We push a marker history entry when the dialog
  // opens; popstate (back press) closes the dialog without further history
  // work. If the user closes via the X / Tillbaka / save flow, the cleanup
  // pops our entry so the page's history isn't polluted.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    if (typeof window === 'undefined') return
    let ownsEntry = true
    window.history.pushState({ __mealDialog: true }, '')
    const onPop = () => {
      ownsEntry = false
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (ownsEntry && window.history.state?.__mealDialog) {
        window.history.back()
      }
    }
  }, [open])

  // Personalized quick meals
  const [personalMeals, setPersonalMeals] = useState<QuickMeal[] | null>(null)

  // Selected quick meal breakdown (so user can see and edit what was assumed)
  const [selectedQuickMealItems, setSelectedQuickMealItems] = useState<
    QuickMealItem[] | null
  >(null)

  // Yesterday's meals, keyed by meal type so switching type updates the repeat option.
  const [yesterdayMeals, setYesterdayMeals] = useState<Record<string, YesterdayMeal>>({})
  const yesterdayMeal = yesterdayMeals[formData.mealType] || null
  const yesterdayAmountSummary = yesterdayMeal
    ? getYesterdayAmountSummary(yesterdayMeal, {
        extra: (count) => t('yesterday.extraCount', { count }),
        total: t('yesterday.total'),
      })
    : null

  // Fetch personalized meals + yesterday's meals when dialog opens
  useEffect(() => {
    if (!open) return
    fetch('/api/nutrition/food-history?view=top-meals&range=90d')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.topMeals && data.topMeals.length >= 3) {
          setPersonalMeals(data.topMeals.map((m: { description: string; calories: number; protein: number; carbs: number; fat: number }) => ({
            description: m.description,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
          })))
        }
      })
      .catch(() => {})
    fetch('/api/nutrition/food-history?view=yesterday')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.yesterdayMeals) {
          setYesterdayMeals(data.yesterdayMeals as Record<string, YesterdayMeal>)
        }
      })
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open || recipeScanRequestKey <= 0) return
    setTab('ingredients')
    setIngredientScanRequestKey((key) => key + 1)
  }, [open, recipeScanRequestKey])

  const quickMeals = personalMeals || QUICK_MEALS
  const quickMealsLabel = personalMeals ? t('quickMeals.personal') : t('quickMeals.quick')
  const getQuickMealDescription = (meal: QuickMeal) =>
    meal.translationKey ? t(`quickMeals.suggestions.${meal.translationKey}.description`) : meal.description
  const getQuickMealItemName = (item: QuickMealItem) =>
    item.translationKey ? t(`quickMeals.items.${item.translationKey}`) : item.name

  const handleQuickMealSelect = (meal: QuickMeal) => {
    const description = getQuickMealDescription(meal)
    setAiTextEstimate(null)
    setFormData(prev => ({
      ...prev,
      description,
      calories: meal.calories.toString(),
      proteinGrams: meal.protein.toString(),
      carbsGrams: meal.carbs.toString(),
      fatGrams: meal.fat.toString(),
    }))
    setShowMacros(true)
    setSelectedQuickMealItems(meal.items?.map((item) => ({ ...item, name: getQuickMealItemName(item) })) || null)
  }

  const openRecipeImageUpload = () => {
    setAiTextEstimate(null)
    setTab('ingredients')
    setIngredientScanRequestKey((key) => key + 1)
  }

  const handleYesterdayMealSelect = () => {
    if (!yesterdayMeal) return

    setAiTextEstimate(null)
    setFormData(prev => ({
      ...prev,
      description: yesterdayMeal.description,
      calories: yesterdayMeal.calories?.toString() || '',
      proteinGrams: yesterdayMeal.proteinGrams?.toString() || '',
      carbsGrams: yesterdayMeal.carbsGrams?.toString() || '',
      fatGrams: yesterdayMeal.fatGrams?.toString() || '',
    }))
    setSelectedQuickMealItems(null)

    if (yesterdayMeal.items && yesterdayMeal.items.length > 0) {
      setIngredients(ingredientRowsFromItems(yesterdayMeal.items.map((item) => ({
        foodId: item.foodId ?? undefined,
        name: item.name,
        category: item.category,
        estimatedGrams: item.estimatedGrams,
        calories: item.calories,
        proteinGrams: item.proteinGrams,
        carbsGrams: item.carbsGrams,
        fatGrams: item.fatGrams,
        fiberGrams: item.fiberGrams,
        saturatedFatGrams: item.saturatedFatGrams,
        monounsaturatedFatGrams: item.monounsaturatedFatGrams,
        polyunsaturatedFatGrams: item.polyunsaturatedFatGrams,
        sugarGrams: item.sugarGrams,
        isCompleteProtein: item.isCompleteProtein,
        proteinSource: item.proteinSource,
      }))))
      setTab('ingredients')
    }

    if (yesterdayMeal.calories) setShowMacros(true)
  }

  const handleQuickMealItemGramsChange = (index: number, newGrams: number) => {
    if (!selectedQuickMealItems) return
    const safeGrams = Math.max(0, newGrams)

    setSelectedQuickMealItems(prev => {
      if (!prev) return prev
      const updated = prev.map((item, i) => {
        if (i !== index) return item
        // Scale macros proportionally to the new weight
        const ratio = item.grams > 0 ? safeGrams / item.grams : 0
        return {
          ...item,
          grams: safeGrams,
          kcal: Math.round(item.kcal * ratio),
          p: Math.round(item.p * ratio * 10) / 10,
          c: Math.round(item.c * ratio * 10) / 10,
          f: Math.round(item.f * ratio * 10) / 10,
        }
      })

      // Recalculate totals from updated items
      const totals = updated.reduce(
        (acc, it) => ({
          cal: acc.cal + it.kcal,
          p: acc.p + it.p,
          c: acc.c + it.c,
          f: acc.f + it.f,
        }),
        { cal: 0, p: 0, c: 0, f: 0 }
      )

      setFormData(prev => ({
        ...prev,
        calories: totals.cal.toString(),
        proteinGrams: totals.p.toFixed(1),
        carbsGrams: totals.c.toFixed(1),
        fatGrams: totals.f.toFixed(1),
      }))

      return updated
    })
  }

  const handleAIEstimate = async () => {
    if (!formData.description.trim()) return

    setIsAnalyzing(true)
    setError(null)
    setAiTextEstimate(null)
    try {
      const res = await fetch('/api/ai/food-scan/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description, clientHour: new Date().getHours() }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const allowanceError = parseAiAllowanceError(body)
        if (allowanceError) throw allowanceError
        throw new Error(body?.error || t('errors.analyzeMeal'))
      }

      const data = await res.json()
      const result = data.result
      if (result?.totals) {
        setFormData(prev => ({
          ...prev,
          calories: Math.round(result.totals.calories).toString(),
          proteinGrams: result.totals.proteinGrams.toFixed(1),
          carbsGrams: result.totals.carbsGrams.toFixed(1),
          fatGrams: result.totals.fatGrams.toFixed(1),
        }))
        setShowMacros(true)

        if (data.enhancedMode && result.totals.saturatedFatGrams != null) {
          setEnhancedFields({
            saturatedFatGrams: result.totals.saturatedFatGrams,
            monounsaturatedFatGrams: result.totals.monounsaturatedFatGrams,
            polyunsaturatedFatGrams: result.totals.polyunsaturatedFatGrams,
            sugarGrams: result.totals.sugarGrams,
            complexCarbsGrams: result.totals.complexCarbsGrams,
          })
        }

        const estimateItems: AiEstimatedMealItem[] = Array.isArray(result.items)
          ? (result.items as Partial<AiEstimatedMealItem>[])
              .map((item: Partial<AiEstimatedMealItem>) => ({
                name: typeof item.name === 'string' ? item.name.trim() : '',
                category: item.category,
                estimatedGrams: typeof item.estimatedGrams === 'number' ? roundOneDecimal(item.estimatedGrams) : 0,
                portionDescription: typeof item.portionDescription === 'string' ? item.portionDescription : null,
                calories: typeof item.calories === 'number' ? item.calories : 0,
                proteinGrams: typeof item.proteinGrams === 'number' ? item.proteinGrams : 0,
                carbsGrams: typeof item.carbsGrams === 'number' ? item.carbsGrams : 0,
                fatGrams: typeof item.fatGrams === 'number' ? item.fatGrams : 0,
                fiberGrams: typeof item.fiberGrams === 'number' ? item.fiberGrams : 0,
                saturatedFatGrams: item.saturatedFatGrams,
                monounsaturatedFatGrams: item.monounsaturatedFatGrams,
                polyunsaturatedFatGrams: item.polyunsaturatedFatGrams,
                sugarGrams: item.sugarGrams,
                complexCarbsGrams: item.complexCarbsGrams,
                isCompleteProtein: item.isCompleteProtein,
                proteinSource: item.proteinSource,
              }))
              .filter((item) => item.name.length > 0 && item.estimatedGrams > 0)
          : []

        if (estimateItems.length > 0) {
          setAiTextEstimate({
            description: formData.description.trim(),
            items: estimateItems,
            totals: {
              calories: result.totals.calories,
              proteinGrams: result.totals.proteinGrams,
              carbsGrams: result.totals.carbsGrams,
              fatGrams: result.totals.fatGrams,
              fiberGrams: result.totals.fiberGrams,
            },
          })
        }
      }
    } catch (err) {
      if (isAiAllowanceExhaustedError(err)) {
        setError(`${err.message} ${getAiAllowanceUpgradeMessage(err)}`)
      } else {
        const message = err instanceof Error ? err.message : t('errors.aiAnalysisFailed')
        setError(t('errors.aiFallback', { message }))
        setShowMacros(true)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = async () => {
    // When the user is on the ingredients tab, derive description + macros from
    // the ingredient list so they don't have to type a description manually.
    const usingIngredients = tab === 'ingredients' && ingredients.some(
      (r) => r.name.trim().length > 0 && r.grams > 0
    )
    const derivedDescription = usingIngredients
      ? formData.description.trim() || ingredients
          .filter((r) => r.name.trim().length > 0)
          .map((r) => r.name.trim())
          .join(', ')
      : formData.description

    if (!derivedDescription.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const data: MealLogData & Record<string, unknown> = {
        date: isEditMode ? initialDateValue : selectedDate || initialDateValue,
        mealType: formData.mealType,
        time: formData.time || undefined,
        description: derivedDescription,
        isPreWorkout: formData.isPreWorkout,
        isPostWorkout: formData.isPostWorkout,
        notes: formData.notes || undefined,
      }

      if (usingIngredients) {
        const totals = sumIngredientMacros(ingredients)
        data.calories = Math.round(totals.calories)
        data.proteinGrams = Math.round(totals.proteinGrams * 10) / 10
        data.carbsGrams = Math.round(totals.carbsGrams * 10) / 10
        data.fatGrams = Math.round(totals.fatGrams * 10) / 10
        data.fiberGrams = Math.round(totals.fiberGrams * 10) / 10
        if (totals.saturatedFatGrams != null) {
          data.saturatedFatGrams = Math.round(totals.saturatedFatGrams * 10) / 10
          data.monounsaturatedFatGrams = Math.round((totals.monounsaturatedFatGrams ?? 0) * 10) / 10
          data.polyunsaturatedFatGrams = Math.round((totals.polyunsaturatedFatGrams ?? 0) * 10) / 10
          data.sugarGrams = Math.round((totals.sugarGrams ?? 0) * 10) / 10
        }
        data.items = ingredientRowsToApiItems(ingredients)
      } else {
        const calories = parseFormNumber(formData.calories)
        const protein = parseFormNumber(formData.proteinGrams)
        const carbs = parseFormNumber(formData.carbsGrams)
        const fat = parseFormNumber(formData.fatGrams)

        if (calories !== null) data.calories = Math.round(calories)
        if (protein !== null) data.proteinGrams = protein
        if (carbs !== null) data.carbsGrams = carbs
        if (fat !== null) data.fatGrams = fat

        if (
          aiTextEstimate &&
          normalizeDescription(derivedDescription) === normalizeDescription(aiTextEstimate.description) &&
          aiEstimateMatchesCurrentMacros(aiTextEstimate, formData)
        ) {
          data.fiberGrams = aiTextEstimate.totals.fiberGrams != null
            ? roundOneDecimal(aiTextEstimate.totals.fiberGrams)
            : undefined
          data.items = aiTextEstimate.items.map((item) => ({
            name: item.name,
            category: item.category ?? undefined,
            estimatedGrams: item.estimatedGrams,
            portionDescription: item.portionDescription ?? undefined,
            calories: item.calories,
            proteinGrams: item.proteinGrams,
            carbsGrams: item.carbsGrams,
            fatGrams: item.fatGrams,
            fiberGrams: item.fiberGrams ?? 0,
            saturatedFatGrams: item.saturatedFatGrams,
            monounsaturatedFatGrams: item.monounsaturatedFatGrams,
            polyunsaturatedFatGrams: item.polyunsaturatedFatGrams,
            sugarGrams: item.sugarGrams,
            complexCarbsGrams: item.complexCarbsGrams,
            isCompleteProtein: item.isCompleteProtein,
            proteinSource: item.proteinSource,
          }))
        }
      }

      // Include enhanced fields if available
      if (enhancedFields.saturatedFatGrams != null) {
        data.saturatedFatGrams = enhancedFields.saturatedFatGrams
        data.monounsaturatedFatGrams = enhancedFields.monounsaturatedFatGrams
        data.polyunsaturatedFatGrams = enhancedFields.polyunsaturatedFatGrams
        data.sugarGrams = enhancedFields.sugarGrams
        data.complexCarbsGrams = enhancedFields.complexCarbsGrams
        data.isCompleteProtein = enhancedFields.isCompleteProtein
      }

      const url = isEditMode ? `/api/meals/${editMeal!.id}` : '/api/meals'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || t('errors.saveMeal'))
      }

      onMealSaved?.()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      mealType: defaultMealType || guessDefaultMealType(),
      time: '',
      description: '',
      calories: '',
      proteinGrams: '',
      carbsGrams: '',
      fatGrams: '',
      isPreWorkout: false,
      isPostWorkout: false,
      notes: '',
    })
    setShowMacros(false)
    setAiTextEstimate(null)
    setEnhancedFields({})
    setSelectedQuickMealItems(null)
    setYesterdayMeals({})
    setError(null)
    setTab(defaultTab)
    setSelectedDate(initialDateValue)
    setIngredients([])
    onClose()
  }

  const aiEstimateTotalGrams = aiTextEstimate ? getAiEstimateTotalGrams(aiTextEstimate.items) : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!w-[calc(100vw-1rem)] !max-w-[calc(100vw-1rem)] sm:!max-w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-shrink-0 -ml-2 -mt-1 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-700 transition-colors"
              aria-label={t('actions.back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <DialogTitle className="dark:text-slate-100 text-left">
                {isEditMode ? t('title.edit') : t('title.log')}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400 text-left">
                {isEditMode ? t('description.edit') : selectedDateLabel}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-w-0 space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="meal-date" className="dark:text-slate-200">{t('fields.date')}</Label>
              <Input
                id="meal-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || initialDateValue)}
                className="dark:text-white"
              />
            </div>
          )}

          {/* Meal Type Selection */}
          <div className="space-y-2">
            <Label className="dark:text-slate-200">{t('fields.mealType')}</Label>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.entries(MEAL_TYPE_CONFIG) as [MealType, typeof MEAL_TYPE_CONFIG[MealType]][]).map(
                ([type, config]) => {
                  const Icon = config.icon
                  const isSelected = formData.mealType === type
                  return (
                    <button
                      key={type}
                      onClick={() => setFormData(prev => ({ ...prev, mealType: type }))}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs min-w-0 w-full",
                        isSelected
                          ? "border-primary bg-primary/5 dark:bg-primary/15"
                          : "border-border dark:border-slate-600 hover:border-primary/50"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-full text-white shrink-0", config.color)}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="font-medium truncate w-full text-center dark:text-slate-200">
                        {t(`mealTypes.${config.labelKey}`)}
                      </span>
                    </button>
                  )
                }
              )}
            </div>
          </div>

          {/* Tabs: free-text description vs structured ingredient list */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as MealLogTab)} className="min-w-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">{t('tabs.description')}</TabsTrigger>
              <TabsTrigger value="ingredients">{t('tabs.ingredients')}</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 py-3 text-left dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
                  onClick={openRecipeImageUpload}
                >
                  <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t('recipeUpload.title')}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t('recipeUpload.description')}
                    </span>
                  </span>
                </Button>
              )}

              {/* Same as yesterday */}
              {yesterdayMeal && !formData.description && (
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start gap-2 py-2 text-sm dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
                  onClick={handleYesterdayMealSelect}
                >
                  <Repeat className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate">
                      {t('yesterday.sameAsYesterday')} <span className="font-medium">{yesterdayMeal.description}</span>
                    </span>
                    {yesterdayAmountSummary && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {yesterdayAmountSummary}
                      </span>
                    )}
                  </span>
                </Button>
              )}

          {/* Quick Meals */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{quickMealsLabel}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickMeals.slice(0, 6).map((meal) => (
                (() => {
                  const mealDescription = getQuickMealDescription(meal)
                  return (
                    <Button
                      key={meal.translationKey || meal.description}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickMealSelect(meal)}
                      className={cn(
                        "text-xs justify-start min-w-0 w-full dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700",
                        formData.description === mealDescription && "border-primary bg-primary/5 dark:bg-primary/15 dark:text-white"
                      )}
                    >
                      <span className="truncate block w-full text-left">{mealDescription}</span>
                    </Button>
                  )
                })()
              ))}
            </div>
          </div>

          {/* Quick meal item breakdown (editable weights) */}
          {selectedQuickMealItems && selectedQuickMealItems.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/50 dark:border-slate-700 p-3 bg-muted/30 dark:bg-slate-800/50">
              <Label className="text-xs text-muted-foreground">{t('quickMealItems.title')}</Label>
              <div className="space-y-1.5">
                {selectedQuickMealItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 min-w-0 truncate dark:text-slate-300">{item.name}</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        value={item.grams}
                        onChange={(e) => handleQuickMealItemGramsChange(idx, Number(e.target.value))}
                        className="w-16 h-7 text-xs text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      />
                      <span className="text-muted-foreground text-[10px] w-4">g</span>
                    </div>
                    <span className="text-muted-foreground text-[10px] w-14 text-right">{item.kcal} kcal</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {t('quickMealItems.helper')}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="dark:text-slate-200">{t('fields.descriptionRequired')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setAiTextEstimate(null)
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }}
              placeholder={t('fields.descriptionPlaceholder')}
              rows={2}
              className="dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time" className="dark:text-slate-200">{t('fields.timeOptional')}</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              className="dark:text-white"
            />
          </div>

          {/* AI estimate button */}
          {formData.description.trim() && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 dark:text-slate-200 dark:border-slate-600"
              onClick={handleAIEstimate}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isAnalyzing
                ? t('actions.analyzing')
                : formData.calories
                  ? t('actions.reanalyzeWithAi')
                  : t('actions.estimateWithAi')}
            </Button>
          )}

          {aiTextEstimate && aiEstimateTotalGrams !== null && (
            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Scale className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Label className="truncate text-xs text-muted-foreground">
                    {t('aiEstimate.title')}
                  </Label>
                </div>
                <span className="shrink-0 text-xs font-medium dark:text-slate-200">
                  {t('aiEstimate.total', { grams: formatGrams(aiEstimateTotalGrams) })}
                </span>
              </div>
              <div className="space-y-1.5">
                {aiTextEstimate.items.map((item, idx) => {
                  const portion = item.portionDescription?.trim()
                  return (
                    <div key={`${item.name}-${idx}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium dark:text-slate-300">{item.name}</p>
                        {portion && (
                          <p className="truncate text-[10px] text-muted-foreground">{portion}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium dark:text-slate-200">{formatGrams(item.estimatedGrams)} g</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t('aiEstimate.calories', { calories: Math.round(item.calories) })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Toggle for macros */}
          <div className="flex items-center justify-between">
            <Label className="dark:text-slate-200">{t('fields.addMacros')}</Label>
            <Switch
              checked={showMacros}
              onCheckedChange={setShowMacros}
            />
          </div>

          {/* Macros */}
          {showMacros && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="calories" className="dark:text-slate-200">{t('macros.calories')}</Label>
                <Input
                  id="calories"
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData(prev => ({ ...prev, calories: e.target.value }))}
                  placeholder="kcal"
                  className="dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein" className="dark:text-slate-200">{t('macros.protein')}</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  value={formData.proteinGrams}
                  onChange={(e) => setFormData(prev => ({ ...prev, proteinGrams: e.target.value }))}
                  placeholder="g"
                  className="dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs" className="dark:text-slate-200">{t('macros.carbs')}</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.1"
                  value={formData.carbsGrams}
                  onChange={(e) => setFormData(prev => ({ ...prev, carbsGrams: e.target.value }))}
                  placeholder="g"
                  className="dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat" className="dark:text-slate-200">{t('macros.fat')}</Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  value={formData.fatGrams}
                  onChange={(e) => setFormData(prev => ({ ...prev, fatGrams: e.target.value }))}
                  placeholder="g"
                  className="dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          )}
            </TabsContent>

            <TabsContent value="ingredients" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('ingredients.helper')}
              </p>
              <IngredientBuilder
                value={ingredients}
                onChange={setIngredients}
                scanRequestKey={ingredientScanRequestKey}
              />
            </TabsContent>
          </Tabs>

          {/* Workout flags */}
          <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Switch
                checked={formData.isPreWorkout}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, isPreWorkout: checked }))
                }
              />
              <Label className="text-sm dark:text-slate-200">Pre-workout</Label>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Switch
                checked={formData.isPostWorkout}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, isPostWorkout: checked }))
                }
              />
              <Label className="text-sm dark:text-slate-200">Post-workout</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (tab === 'ingredients'
                ? !ingredients.some((r) => r.name.trim().length > 0 && r.grams > 0)
                : !formData.description.trim())
            }
          >
            {isLoading ? t('actions.saving') : isEditMode ? t('actions.saveChanges') : t('actions.logMeal')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
