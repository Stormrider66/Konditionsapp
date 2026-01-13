'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { MealType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface QuickMealLogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: MealLogData) => Promise<void>
  date?: Date
  defaultMealType?: MealType
}

interface MealLogData {
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
  onSubmit,
  date = new Date(),
  defaultMealType,
}: QuickMealLogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showMacros, setShowMacros] = useState(false)
  const [formData, setFormData] = useState({
    mealType: defaultMealType || 'LUNCH' as MealType,
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

  const handleSubmit = async () => {
    if (!formData.description.trim()) return

    setIsLoading(true)
    try {
      const data: MealLogData = {
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

      await onSubmit(data)
      handleClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      mealType: defaultMealType || 'LUNCH',
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
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Logga måltid</DialogTitle>
          <DialogDescription>
            {date.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Meal Type Selection */}
          <div className="space-y-2">
            <Label>Måltidstyp</Label>
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
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-full text-white", config.color)}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="font-medium truncate w-full text-center">
                        {config.label}
                      </span>
                    </button>
                  )
                }
              )}
            </div>
          </div>

          {/* Quick Meals */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Snabbval</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_MEALS.slice(0, 6).map((meal) => (
                <Button
                  key={meal.description}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickMealSelect(meal)}
                  className={cn(
                    "text-xs",
                    formData.description === meal.description && "border-primary bg-primary/5"
                  )}
                >
                  {meal.description}
                </Button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Vad åt du?"
              rows={2}
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time">Tid (valfritt)</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
            />
          </div>

          {/* Toggle for macros */}
          <div className="flex items-center justify-between">
            <Label>Lägg till makron</Label>
            <Switch
              checked={showMacros}
              onCheckedChange={setShowMacros}
            />
          </div>

          {/* Macros */}
          {showMacros && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="calories">Kalorier</Label>
                <Input
                  id="calories"
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData(prev => ({ ...prev, calories: e.target.value }))}
                  placeholder="kcal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Protein</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  value={formData.proteinGrams}
                  onChange={(e) => setFormData(prev => ({ ...prev, proteinGrams: e.target.value }))}
                  placeholder="g"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Kolhydrater</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.1"
                  value={formData.carbsGrams}
                  onChange={(e) => setFormData(prev => ({ ...prev, carbsGrams: e.target.value }))}
                  placeholder="g"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Fett</Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  value={formData.fatGrams}
                  onChange={(e) => setFormData(prev => ({ ...prev, fatGrams: e.target.value }))}
                  placeholder="g"
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
              <Label className="text-sm">Pre-workout</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isPostWorkout}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, isPostWorkout: checked }))
                }
              />
              <Label className="text-sm">Post-workout</Label>
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
