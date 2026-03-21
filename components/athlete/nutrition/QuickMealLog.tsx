'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Sunrise,
  Sun,
  Moon,
  Coffee,
  Apple,
  Dumbbell,
  UtensilsCrossed,
  AlertCircle,
  Sparkles,
  Loader2,
  Repeat,
} from 'lucide-react'
import { MealType } from '@prisma/client'
import { cn } from '@/lib/utils'
import { guessDefaultMealType } from '@/lib/nutrition/guess-meal-type'

interface QuickMealLogProps {
  open: boolean
  onClose: () => void
  onMealSaved?: () => void
  date?: Date
  defaultMealType?: MealType
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
  { description: 'Havregrynsgröt med banan', calories: 350, protein: 12, carbs: 55, fat: 8 },
  { description: 'Ägg och rostat bröd', calories: 400, protein: 20, carbs: 30, fat: 22 },
  { description: 'Proteinshake', calories: 200, protein: 30, carbs: 10, fat: 3 },
  { description: 'Kycklingbowl med ris', calories: 550, protein: 40, carbs: 60, fat: 12 },
  { description: 'Sallad med lax', calories: 450, protein: 35, carbs: 15, fat: 28 },
  { description: 'Kvarg med bär', calories: 180, protein: 20, carbs: 15, fat: 2 },
  { description: 'Smörgås med ost och skinka', calories: 320, protein: 18, carbs: 28, fat: 16 },
  { description: 'Pasta med köttfärssås', calories: 600, protein: 30, carbs: 70, fat: 20 },
]

export function QuickMealLog({
  open,
  onClose,
  onMealSaved,
  date = new Date(),
  defaultMealType,
}: QuickMealLogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMacros, setShowMacros] = useState(false)
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

  // Personalized quick meals
  const [personalMeals, setPersonalMeals] = useState<typeof QUICK_MEALS | null>(null)

  // Yesterday's meal for current meal type
  const [yesterdayMeal, setYesterdayMeal] = useState<{
    description: string
    calories: number | null
    proteinGrams: number | null
    carbsGrams: number | null
    fatGrams: number | null
  } | null>(null)

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
          const currentType = defaultMealType || guessDefaultMealType()
          const match = data.yesterdayMeals[currentType]
          if (match?.description) {
            setYesterdayMeal(match)
          }
        }
      })
      .catch(() => {})
  }, [open, defaultMealType])

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
  }

  const handleAIEstimate = async () => {
    if (!formData.description.trim()) return

    setIsAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/food-scan/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description }),
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
    if (!formData.description.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const data: MealLogData & Record<string, unknown> = {
        date: date.toISOString().split('T')[0],
        mealType: formData.mealType,
        time: formData.time || undefined,
        description: formData.description,
        isPreWorkout: formData.isPreWorkout,
        isPostWorkout: formData.isPostWorkout,
        notes: formData.notes || undefined,
      }

      if (formData.calories) data.calories = parseInt(formData.calories)
      if (formData.proteinGrams) data.proteinGrams = parseFloat(formData.proteinGrams)
      if (formData.carbsGrams) data.carbsGrams = parseFloat(formData.carbsGrams)
      if (formData.fatGrams) data.fatGrams = parseFloat(formData.fatGrams)

      // Include enhanced fields if available
      if (enhancedFields.saturatedFatGrams != null) {
        data.saturatedFatGrams = enhancedFields.saturatedFatGrams
        data.monounsaturatedFatGrams = enhancedFields.monounsaturatedFatGrams
        data.polyunsaturatedFatGrams = enhancedFields.polyunsaturatedFatGrams
        data.sugarGrams = enhancedFields.sugarGrams
        data.complexCarbsGrams = enhancedFields.complexCarbsGrams
        data.isCompleteProtein = enhancedFields.isCompleteProtein
      }

      const res = await fetch('/api/meals', {
        method: 'POST',
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
    setYesterdayMeal(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Logga måltid</DialogTitle>
          <DialogDescription>
            {date.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Meal Type Selection */}
          <div className="space-y-2">
            <Label className="dark:text-slate-200">Måltidstyp</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(MEAL_TYPE_CONFIG) as [MealType, typeof MEAL_TYPE_CONFIG[MealType]][]).map(
                ([type, config]) => {
                  const Icon = config.icon
                  const isSelected = formData.mealType === type
                  return (
                    <button
                      key={type}
                      onClick={() => setFormData(prev => ({ ...prev, mealType: type }))}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs",
                        isSelected
                          ? "border-primary bg-primary/5 dark:bg-primary/15"
                          : "border-border dark:border-slate-600 hover:border-primary/50"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-full text-white", config.color)}>
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

          {/* Same as yesterday */}
          {yesterdayMeal && !formData.description && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  description: yesterdayMeal.description,
                  calories: yesterdayMeal.calories?.toString() || '',
                  proteinGrams: yesterdayMeal.proteinGrams?.toString() || '',
                  carbsGrams: yesterdayMeal.carbsGrams?.toString() || '',
                  fatGrams: yesterdayMeal.fatGrams?.toString() || '',
                }))
                if (yesterdayMeal.calories) setShowMacros(true)
              }}
            >
              <Repeat className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">Samma som igår: <span className="font-medium">{yesterdayMeal.description}</span></span>
            </Button>
          )}

          {/* Quick Meals */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{quickMealsLabel}</Label>
            <div className="flex flex-wrap gap-2">
              {quickMeals.slice(0, 6).map((meal) => (
                <Button
                  key={meal.description}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickMealSelect(meal)}
                  className={cn(
                    "text-xs truncate max-w-full dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700",
                    formData.description === meal.description && "border-primary bg-primary/5 dark:bg-primary/15 dark:text-white"
                  )}
                >
                  {meal.description.length > 30 ? meal.description.slice(0, 30) + '…' : meal.description}
                </Button>
              ))}
            </div>
          </div>

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
          {formData.description.trim() && !formData.calories && (
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
              {isAnalyzing ? 'Analyserar...' : 'Uppskatta med AI'}
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

          {/* Workout flags */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isPreWorkout}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, isPreWorkout: checked }))
                }
              />
              <Label className="text-sm dark:text-slate-200">Pre-workout</Label>
            </div>
            <div className="flex items-center gap-2">
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
            disabled={!formData.description.trim() || isLoading}
          >
            {isLoading ? 'Sparar...' : 'Logga måltid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
