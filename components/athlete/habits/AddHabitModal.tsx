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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Droplet,
  Moon,
  Footprints,
  Brain,
  Dumbbell,
  Heart,
} from 'lucide-react'
import { HabitCategory, HabitFrequency } from '@prisma/client'
import { cn } from '@/lib/utils'

interface AddHabitModalProps {
  open: boolean
  onClose: () => void
  onAdd: (habit: HabitFormData) => Promise<void>
}

interface HabitFormData {
  name: string
  category: HabitCategory
  frequency: HabitFrequency
  targetDays?: number[]
  targetTime?: string
  trigger?: string
  routine?: string
  reward?: string
}

const CATEGORY_OPTIONS = [
  { value: 'NUTRITION', label: 'Kost & Naring', icon: Droplet, color: 'bg-blue-500' },
  { value: 'SLEEP', label: 'Somn', icon: Moon, color: 'bg-purple-500' },
  { value: 'MOVEMENT', label: 'Rorelse', icon: Footprints, color: 'bg-green-500' },
  { value: 'MINDFULNESS', label: 'Mental halsa', icon: Brain, color: 'bg-yellow-500' },
  { value: 'TRAINING', label: 'Traning', icon: Dumbbell, color: 'bg-orange-500' },
  { value: 'RECOVERY', label: 'Aterhamt', icon: Heart, color: 'bg-pink-500' },
]

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Dagligen' },
  { value: 'WEEKDAYS', label: 'Vardagar (mån-fre)' },
  { value: 'SPECIFIC_DAYS', label: 'Specifika dagar' },
  { value: 'X_TIMES_WEEK', label: 'X gånger per vecka' },
]

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mån' },
  { value: 2, label: 'Tis' },
  { value: 3, label: 'Ons' },
  { value: 4, label: 'Tor' },
  { value: 5, label: 'Fre' },
  { value: 6, label: 'Lör' },
  { value: 0, label: 'Sön' },
]

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morgon' },
  { value: 'afternoon', label: 'Eftermiddag' },
  { value: 'evening', label: 'Kväll' },
  { value: 'anytime', label: 'Hela dagen' },
]

const HABIT_SUGGESTIONS: Record<HabitCategory, string[]> = {
  NUTRITION: [
    'Drick 2 liter vatten',
    'Ät protein till frukost',
    'Ät 5 portioner grönsaker',
    'Ta vitaminer',
  ],
  SLEEP: [
    'Lägg mig före 23:00',
    'Ingen skärm efter 22:00',
    'Sov minst 7 timmar',
    'Kvällsrutin 15 min',
  ],
  MOVEMENT: [
    '10 min morgonsträck',
    'Kvällspromenad',
    '10 000 steg',
    'Ta trapporna',
  ],
  MINDFULNESS: [
    '5 min meditation',
    'Tacksamhetsdagbok',
    'Djupandning',
    'Digital detox 1h',
  ],
  TRAINING: [
    'Gå till gymmet',
    'Hemmaträning',
    'Löptur',
    'Mobility-pass',
  ],
  RECOVERY: [
    'Foam rolling',
    'Kall dusch',
    'Stretching 10 min',
    'Massera stela muskler',
  ],
}

export function AddHabitModal({ open, onClose, onAdd }: AddHabitModalProps) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<HabitFormData>>({
    frequency: 'DAILY',
    targetDays: [],
  })

  const handleCategorySelect = (category: HabitCategory) => {
    setFormData(prev => ({ ...prev, category }))
  }

  const handleFrequencyChange = (frequency: HabitFrequency) => {
    setFormData(prev => ({
      ...prev,
      frequency,
      targetDays: frequency === 'WEEKDAYS' ? [1, 2, 3, 4, 5] : [],
    }))
  }

  const handleDayToggle = (day: number) => {
    setFormData(prev => {
      const currentDays = prev.targetDays || []
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day]
      return { ...prev, targetDays: newDays }
    })
  }

  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, name: suggestion }))
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) return

    setIsLoading(true)
    try {
      await onAdd(formData as HabitFormData)
      onClose()
      // Reset form
      setStep(1)
      setFormData({ frequency: 'DAILY', targetDays: [] })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setStep(1)
    setFormData({ frequency: 'DAILY', targetDays: [] })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Välj kategori'}
            {step === 2 && 'Beskriv din vana'}
            {step === 3 && 'Vanans trigger (valfritt)'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Vilken typ av vana vill du skapa?'}
            {step === 2 && 'Vad vill du göra varje dag?'}
            {step === 3 && 'Vad triggar din vana? Detta hjälper dig att komma ihåg.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {CATEGORY_OPTIONS.map((category) => {
              const Icon = category.icon
              const isSelected = formData.category === category.value
              return (
                <button
                  key={category.value}
                  onClick={() => {
                    handleCategorySelect(category.value as HabitCategory)
                    setStep(2)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn("p-3 rounded-full text-white", category.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-sm">{category.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Habit Details */}
        {step === 2 && formData.category && (
          <div className="space-y-4 py-4">
            {/* Suggestions */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Förslag</Label>
              <div className="flex flex-wrap gap-2">
                {HABIT_SUGGESTIONS[formData.category].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      formData.name === suggestion && "border-primary bg-primary/5"
                    )}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="name">Vananamn</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="T.ex. Drick 2 liter vatten"
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>Frekvens</Label>
              <Select
                value={formData.frequency}
                onValueChange={(v) => handleFrequencyChange(v as HabitFrequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specific days selection */}
            {formData.frequency === 'SPECIFIC_DAYS' && (
              <div className="space-y-2">
                <Label>Vilka dagar?</Label>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => handleDayToggle(day.value)}
                      className={cn(
                        "w-10 h-10 rounded-full text-sm font-medium transition-all",
                        formData.targetDays?.includes(day.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Target time */}
            <div className="space-y-2">
              <Label>Tid på dagen (valfritt)</Label>
              <Select
                value={formData.targetTime || 'anytime'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, targetTime: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3: Habit Loop (optional) */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger (vad påminner dig?)</Label>
              <Input
                id="trigger"
                value={formData.trigger || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                placeholder="T.ex. Efter frukost, När jag vaknar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="routine">Rutin (vad gör du exakt?)</Label>
              <Textarea
                id="routine"
                value={formData.routine || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, routine: e.target.value }))}
                placeholder="T.ex. Fyller upp vattenflaskan direkt"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward">Belöning (hur känns det?)</Label>
              <Input
                id="reward"
                value={formData.reward || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, reward: e.target.value }))}
                placeholder="T.ex. Mer energi, Kryssa av i appen"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Tillbaka
            </Button>
          )}
          {step === 2 && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep(3)}
                disabled={!formData.name}
              >
                Lägg till trigger
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || isLoading}
              >
                {isLoading ? 'Skapar...' : 'Skapa vana'}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Skapar...' : 'Skapa vana'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
