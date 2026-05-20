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
import { useLocale } from '@/i18n/client'

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

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

const CATEGORY_OPTIONS = [
  { value: 'NUTRITION', label: { sv: 'Kost & Näring', en: 'Nutrition' }, icon: Droplet, color: 'bg-blue-500' },
  { value: 'SLEEP', label: { sv: 'Sömn', en: 'Sleep' }, icon: Moon, color: 'bg-purple-500' },
  { value: 'MOVEMENT', label: { sv: 'Rörelse', en: 'Movement' }, icon: Footprints, color: 'bg-green-500' },
  { value: 'MINDFULNESS', label: { sv: 'Mental hälsa', en: 'Mindfulness' }, icon: Brain, color: 'bg-yellow-500' },
  { value: 'TRAINING', label: { sv: 'Träning', en: 'Training' }, icon: Dumbbell, color: 'bg-orange-500' },
  { value: 'RECOVERY', label: { sv: 'Återhämtning', en: 'Recovery' }, icon: Heart, color: 'bg-pink-500' },
]

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: { sv: 'Dagligen', en: 'Daily' } },
  { value: 'WEEKDAYS', label: { sv: 'Vardagar (mån-fre)', en: 'Weekdays (Mon-Fri)' } },
  { value: 'SPECIFIC_DAYS', label: { sv: 'Specifika dagar', en: 'Specific days' } },
  { value: 'X_TIMES_WEEK', label: { sv: 'X gånger per vecka', en: 'X times per week' } },
]

const DAYS_OF_WEEK = [
  { value: 1, label: { sv: 'Mån', en: 'Mon' } },
  { value: 2, label: { sv: 'Tis', en: 'Tue' } },
  { value: 3, label: { sv: 'Ons', en: 'Wed' } },
  { value: 4, label: { sv: 'Tor', en: 'Thu' } },
  { value: 5, label: { sv: 'Fre', en: 'Fri' } },
  { value: 6, label: { sv: 'Lör', en: 'Sat' } },
  { value: 0, label: { sv: 'Sön', en: 'Sun' } },
]

const TIME_OPTIONS = [
  { value: 'morning', label: { sv: 'Morgon', en: 'Morning' } },
  { value: 'afternoon', label: { sv: 'Eftermiddag', en: 'Afternoon' } },
  { value: 'evening', label: { sv: 'Kväll', en: 'Evening' } },
  { value: 'anytime', label: { sv: 'Hela dagen', en: 'Any time' } },
]

const HABIT_SUGGESTIONS: Record<HabitCategory, Record<AppLocale, string[]>> = {
  NUTRITION: {
    sv: ['Drick 2 liter vatten', 'Ät protein till frukost', 'Ät 5 portioner grönsaker', 'Ta vitaminer'],
    en: ['Drink 2 liters of water', 'Eat protein with breakfast', 'Eat 5 servings of vegetables', 'Take vitamins'],
  },
  SLEEP: {
    sv: ['Lägg mig före 23:00', 'Ingen skärm efter 22:00', 'Sov minst 7 timmar', 'Kvällsrutin 15 min'],
    en: ['Go to bed before 11 PM', 'No screens after 10 PM', 'Sleep at least 7 hours', '15 min evening routine'],
  },
  MOVEMENT: {
    sv: ['10 min morgonsträck', 'Kvällspromenad', '10 000 steg', 'Ta trapporna'],
    en: ['10 min morning stretch', 'Evening walk', '10,000 steps', 'Take the stairs'],
  },
  MINDFULNESS: {
    sv: ['5 min meditation', 'Tacksamhetsdagbok', 'Djupandning', 'Digital detox 1h'],
    en: ['5 min meditation', 'Gratitude journal', 'Deep breathing', '1h digital detox'],
  },
  TRAINING: {
    sv: ['Gå till gymmet', 'Hemmaträning', 'Löptur', 'Mobility-pass'],
    en: ['Go to the gym', 'Home workout', 'Run', 'Mobility session'],
  },
  RECOVERY: {
    sv: ['Foam rolling', 'Kall dusch', 'Stretching 10 min', 'Massera stela muskler'],
    en: ['Foam rolling', 'Cold shower', '10 min stretching', 'Massage tight muscles'],
  },
}

export function AddHabitModal({ open, onClose, onAdd }: AddHabitModalProps) {
  const locale = getAppLocale(useLocale())
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
            {step === 1 && text(locale, 'Välj kategori', 'Choose category')}
            {step === 2 && text(locale, 'Beskriv din vana', 'Describe your habit')}
            {step === 3 && text(locale, 'Vanans trigger (valfritt)', 'Habit trigger (optional)')}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && text(locale, 'Vilken typ av vana vill du skapa?', 'What type of habit do you want to create?')}
            {step === 2 && text(locale, 'Vad vill du göra varje dag?', 'What do you want to do regularly?')}
            {step === 3 && text(locale, 'Vad triggar din vana? Detta hjälper dig att komma ihåg.', 'What triggers your habit? This helps you remember.')}
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
                  <span className="font-medium text-sm">{category.label[locale]}</span>
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
              <Label className="text-sm text-muted-foreground">{text(locale, 'Förslag', 'Suggestions')}</Label>
              <div className="flex flex-wrap gap-2">
                {HABIT_SUGGESTIONS[formData.category][locale].map((suggestion) => (
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
              <Label htmlFor="name">{text(locale, 'Vananamn', 'Habit name')}</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={text(locale, 'T.ex. Drick 2 liter vatten', 'E.g. Drink 2 liters of water')}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>{text(locale, 'Frekvens', 'Frequency')}</Label>
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
                      {option.label[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specific days selection */}
            {formData.frequency === 'SPECIFIC_DAYS' && (
              <div className="space-y-2">
                <Label>{text(locale, 'Vilka dagar?', 'Which days?')}</Label>
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
                      {day.label[locale]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Target time */}
            <div className="space-y-2">
              <Label>{text(locale, 'Tid på dagen (valfritt)', 'Time of day (optional)')}</Label>
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
                      {option.label[locale]}
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
              <Label htmlFor="trigger">{text(locale, 'Trigger (vad påminner dig?)', 'Trigger (what reminds you?)')}</Label>
              <Input
                id="trigger"
                value={formData.trigger || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                placeholder={text(locale, 'T.ex. Efter frukost, När jag vaknar', 'E.g. After breakfast, when I wake up')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="routine">{text(locale, 'Rutin (vad gör du exakt?)', 'Routine (what exactly do you do?)')}</Label>
              <Textarea
                id="routine"
                value={formData.routine || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, routine: e.target.value }))}
                placeholder={text(locale, 'T.ex. Fyller upp vattenflaskan direkt', 'E.g. Fill my water bottle right away')}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward">{text(locale, 'Belöning (hur känns det?)', 'Reward (how does it feel?)')}</Label>
              <Input
                id="reward"
                value={formData.reward || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, reward: e.target.value }))}
                placeholder={text(locale, 'T.ex. Mer energi, Kryssa av i appen', 'E.g. More energy, check it off in the app')}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              {text(locale, 'Tillbaka', 'Back')}
            </Button>
          )}
          {step === 2 && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep(3)}
                disabled={!formData.name}
              >
                {text(locale, 'Lägg till trigger', 'Add trigger')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || isLoading}
              >
                {isLoading ? text(locale, 'Skapar...', 'Creating...') : text(locale, 'Skapa vana', 'Create habit')}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? text(locale, 'Skapar...', 'Creating...') : text(locale, 'Skapa vana', 'Create habit')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
