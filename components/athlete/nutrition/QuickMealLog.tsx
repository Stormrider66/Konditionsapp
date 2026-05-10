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
} from 'lucide-react'
import { MealType } from '@prisma/client'
import { cn } from '@/lib/utils'
import { guessDefaultMealType } from '@/lib/nutrition/guess-meal-type'

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

function formatGrams(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
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

function getYesterdayAmountSummary(meal: YesterdayMeal): string | null {
  if (!meal.items || meal.items.length === 0) return null

  const totalGrams = meal.items.reduce((sum, item) => sum + item.estimatedGrams, 0)
  const itemPreview = meal.items.slice(0, 3).map(formatYesterdayItem).join(', ')
  const extraCount = meal.items.length > 3 ? ` +${meal.items.length - 3} till` : ''

  return `${formatGrams(Math.round(totalGrams * 10) / 10)} g totalt · ${itemPreview}${extraCount}`
}

const MEAL_TYPE_CONFIG: Record<MealType, { icon: typeof Sunrise; label: string; color: string }> = {
  BREAKFAST: { icon: Sunrise, label: 'Frukost', color: 'bg-yellow-500' },
  MORNING_SNACK: { icon: Coffee, label: 'Förmiddagsfika', color: 'bg-orange-400' },
  LUNCH: { icon: Sun, label: 'Lunch', color: 'bg-orange-500' },
  AFTERNOON_SNACK: { icon: Apple, label: 'Mellanmål', color: 'bg-green-500' },
  PRE_WORKOUT: { icon: Dumbbell, label: 'Pre-workout', color: 'bg-blue-500' },
  POST_WORKOUT: { icon: Dumbbell, label: 'Post-workout', color: 'bg-purple-500' },
  DINNER: { icon: Moon, label: 'Middag', color: 'bg-indigo-500' },
  EVENING_SNACK: { icon: UtensilsCrossed, label: 'Kvällssnack', color: 'bg-gray-500' },
}

const QUICK_MEALS = [
  {
    description: 'Havregrynsgröt med banan',
    calories: 350, protein: 12, carbs: 55, fat: 8,
    items: [
      { name: 'Havregryn', grams: 80, kcal: 280, p: 10, c: 48, f: 6 },
      { name: 'Mjölk (1.5%)', grams: 150, kcal: 62, p: 5, c: 7, f: 2 },
      { name: 'Banan', grams: 100, kcal: 89, p: 1, c: 23, f: 0 },
    ],
  },
  {
    description: 'Ägg och rostat bröd',
    calories: 400, protein: 20, carbs: 30, fat: 22,
    items: [
      { name: 'Ägg (stekt)', grams: 120, kcal: 216, p: 15, c: 1, f: 17 },
      { name: 'Rostbröd', grams: 60, kcal: 155, p: 5, c: 29, f: 2 },
      { name: 'Smör', grams: 10, kcal: 72, p: 0, c: 0, f: 8 },
    ],
  },
  {
    description: 'Proteinshake',
    calories: 200, protein: 30, carbs: 10, fat: 3,
    items: [
      { name: 'Proteinpulver', grams: 35, kcal: 130, p: 27, c: 3, f: 1 },
      { name: 'Mjölk (1.5%)', grams: 200, kcal: 82, p: 7, c: 10, f: 2 },
    ],
  },
  {
    description: 'Kycklingbowl med ris',
    calories: 550, protein: 40, carbs: 60, fat: 12,
    items: [
      { name: 'Kycklingbröst', grams: 150, kcal: 165, p: 31, c: 0, f: 4 },
      { name: 'Ris (kokt)', grams: 200, kcal: 260, p: 5, c: 56, f: 1 },
      { name: 'Grönsaker', grams: 100, kcal: 35, p: 2, c: 6, f: 0 },
      { name: 'Olivolja', grams: 10, kcal: 88, p: 0, c: 0, f: 10 },
    ],
  },
  {
    description: 'Sallad med lax',
    calories: 450, protein: 35, carbs: 15, fat: 28,
    items: [
      { name: 'Laxfilé', grams: 150, kcal: 312, p: 30, c: 0, f: 21 },
      { name: 'Blandad sallad', grams: 100, kcal: 20, p: 1, c: 3, f: 0 },
      { name: 'Avokado', grams: 50, kcal: 80, p: 1, c: 4, f: 7 },
      { name: 'Olivolja (dressing)', grams: 10, kcal: 88, p: 0, c: 0, f: 10 },
    ],
  },
  {
    description: 'Kvarg med bär',
    calories: 180, protein: 20, carbs: 15, fat: 2,
    items: [
      { name: 'Kvarg (naturell)', grams: 200, kcal: 120, p: 20, c: 6, f: 0 },
      { name: 'Blandade bär', grams: 80, kcal: 36, p: 1, c: 8, f: 0 },
      { name: 'Honung', grams: 10, kcal: 30, p: 0, c: 8, f: 0 },
    ],
  },
  {
    description: 'Smörgås med ost och skinka',
    calories: 320, protein: 18, carbs: 28, fat: 16,
    items: [
      { name: 'Bröd', grams: 60, kcal: 155, p: 5, c: 28, f: 2 },
      { name: 'Ost', grams: 25, kcal: 90, p: 6, c: 0, f: 7 },
      { name: 'Skinka', grams: 30, kcal: 36, p: 6, c: 1, f: 1 },
      { name: 'Smör', grams: 8, kcal: 58, p: 0, c: 0, f: 6 },
    ],
  },
  {
    description: 'Pasta med köttfärssås',
    calories: 600, protein: 30, carbs: 70, fat: 20,
    items: [
      { name: 'Pasta (kokt)', grams: 200, kcal: 262, p: 9, c: 52, f: 2 },
      { name: 'Köttfärs (nöt)', grams: 100, kcal: 205, p: 17, c: 0, f: 15 },
      { name: 'Tomatsås', grams: 100, kcal: 40, p: 1, c: 8, f: 1 },
      { name: 'Riven ost', grams: 15, kcal: 56, p: 4, c: 0, f: 4 },
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
  const [enhancedFields, setEnhancedFields] = useState<{
    saturatedFatGrams?: number
    monounsaturatedFatGrams?: number
    polyunsaturatedFatGrams?: number
    sugarGrams?: number
    complexCarbsGrams?: number
    isCompleteProtein?: boolean
  }>({})
  const [formData, setFormData] = useState({
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
  const selectedDateLabel = dateInputValueToDate(selectedDate || initialDateValue).toLocaleDateString('sv-SE', {
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
  const [personalMeals, setPersonalMeals] = useState<typeof QUICK_MEALS | null>(null)

  // Selected quick meal breakdown (so user can see and edit what was assumed)
  const [selectedQuickMealItems, setSelectedQuickMealItems] = useState<
    Array<{ name: string; grams: number; kcal: number; p: number; c: number; f: number }> | null
  >(null)

  // Yesterday's meals, keyed by meal type so switching type updates the repeat option.
  const [yesterdayMeals, setYesterdayMeals] = useState<Record<string, YesterdayMeal>>({})
  const yesterdayMeal = yesterdayMeals[formData.mealType] || null
  const yesterdayAmountSummary = yesterdayMeal ? getYesterdayAmountSummary(yesterdayMeal) : null

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
  const quickMealsLabel = personalMeals ? 'Dina vanligaste' : 'Snabbval'

  const handleQuickMealSelect = (meal: typeof QUICK_MEALS[0]) => {
    setFormData(prev => ({
      ...prev,
      description: meal.description,
      calories: meal.calories.toString(),
      proteinGrams: meal.protein.toString(),
      carbsGrams: meal.carbs.toString(),
      fatGrams: meal.fat.toString(),
    }))
    setShowMacros(true)
    setSelectedQuickMealItems(meal.items || null)
  }

  const openRecipeImageUpload = () => {
    setTab('ingredients')
    setIngredientScanRequestKey((key) => key + 1)
  }

  const handleYesterdayMealSelect = () => {
    if (!yesterdayMeal) return

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
    try {
      const res = await fetch('/api/ai/food-scan/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description, clientHour: new Date().getHours() }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Kunde inte analysera måltiden')
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI-analys misslyckades')
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
        if (formData.calories) data.calories = parseInt(formData.calories)
        if (formData.proteinGrams) data.proteinGrams = parseFloat(formData.proteinGrams)
        if (formData.carbsGrams) data.carbsGrams = parseFloat(formData.carbsGrams)
        if (formData.fatGrams) data.fatGrams = parseFloat(formData.fatGrams)
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
        throw new Error(body?.error || 'Kunde inte spara måltiden. Försök igen.')
      }

      onMealSaved?.()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel. Försök igen.')
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
    setEnhancedFields({})
    setSelectedQuickMealItems(null)
    setYesterdayMeals({})
    setError(null)
    setTab(defaultTab)
    setSelectedDate(initialDateValue)
    setIngredients([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!w-[calc(100vw-1rem)] !max-w-[calc(100vw-1rem)] sm:!max-w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-shrink-0 -ml-2 -mt-1 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-700 transition-colors"
              aria-label="Tillbaka"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <DialogTitle className="dark:text-slate-100 text-left">
                {isEditMode ? 'Redigera måltid' : 'Logga måltid'}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400 text-left">
                {isEditMode ? 'Uppdatera måltiden' : selectedDateLabel}
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
              <Label htmlFor="meal-date" className="dark:text-slate-200">Datum</Label>
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
            <Label className="dark:text-slate-200">Måltidstyp</Label>
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
                        {config.label}
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
              <TabsTrigger value="text">Beskrivning</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredienser</TabsTrigger>
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
                    <span className="block font-medium">Ladda upp bild på recept</span>
                    <span className="block text-xs text-muted-foreground">
                      Skanna ett fotograferat recept och spara det bland dina recept.
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
                      Samma som igår: <span className="font-medium">{yesterdayMeal.description}</span>
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
                <Button
                  key={meal.description}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickMealSelect(meal)}
                  className={cn(
                    "text-xs justify-start min-w-0 w-full dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700",
                    formData.description === meal.description && "border-primary bg-primary/5 dark:bg-primary/15 dark:text-white"
                  )}
                >
                  <span className="truncate block w-full text-left">{meal.description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Quick meal item breakdown (editable weights) */}
          {selectedQuickMealItems && selectedQuickMealItems.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/50 dark:border-slate-700 p-3 bg-muted/30 dark:bg-slate-800/50">
              <Label className="text-xs text-muted-foreground">Innehåll (justera vikter)</Label>
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
                Ändra gram för att justera makron automatiskt
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="dark:text-slate-200">Beskrivning *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Vad åt du?"
              rows={2}
              className="dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time" className="dark:text-slate-200">Tid (valfritt)</Label>
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
                ? 'Analyserar...'
                : formData.calories
                  ? 'Analysera om med AI'
                  : 'Uppskatta med AI'}
            </Button>
          )}

          {/* Toggle for macros */}
          <div className="flex items-center justify-between">
            <Label className="dark:text-slate-200">Lägg till makron</Label>
            <Switch
              checked={showMacros}
              onCheckedChange={setShowMacros}
            />
          </div>

          {/* Macros */}
          {showMacros && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="calories" className="dark:text-slate-200">Kalorier</Label>
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
                <Label htmlFor="protein" className="dark:text-slate-200">Protein</Label>
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
                <Label htmlFor="carbs" className="dark:text-slate-200">Kolhydrater</Label>
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
                <Label htmlFor="fat" className="dark:text-slate-200">Fett</Label>
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
                Sök bland 2 500+ livsmedel från Livsmedelsverket. Beskrivning och makron räknas automatiskt.
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
            Avbryt
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
            {isLoading ? 'Sparar...' : isEditMode ? 'Spara ändringar' : 'Logga måltid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
