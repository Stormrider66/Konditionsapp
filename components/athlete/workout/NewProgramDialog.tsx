'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

interface NewProgramDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAICoached: boolean
  primarySport: string | null
  basePath: string
  completedProgramId?: string
}

const GOAL_OPTIONS = [
  { value: 'endurance', labelKey: 'goals.endurance' },
  { value: 'stamina', labelKey: 'goals.stamina' },
  { value: 'speed', labelKey: 'goals.speed' },
  { value: 'race-prep', labelKey: 'goals.racePrep' },
  { value: 'strength', labelKey: 'goals.strength' },
  { value: 'general-fitness', labelKey: 'goals.generalFitness' },
]

export function NewProgramDialog({
  open,
  onOpenChange,
  isAICoached,
  primarySport,
  basePath,
  completedProgramId: _completedProgramId,
}: NewProgramDialogProps) {
  const t = useTranslations('components.newProgramDialog')
  const router = useRouter()
  const [goal, setGoal] = useState('endurance')
  const [raceName, setRaceName] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [weeklyDays, setWeeklyDays] = useState('4')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (isAICoached) {
        // AI-coached: update goal then trigger agent generation
        const res = await fetch('/api/agent/program/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal,
            targetRace: goal === 'race-prep' ? raceName : undefined,
            targetDate: goal === 'race-prep' ? raceDate : undefined,
            weeklyAvailability: parseInt(weeklyDays),
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || t('errors.generation'))
        }

        const data = await res.json()
        // Navigate to the new program or programs list
        if (data.programId) {
          router.push(`${basePath}/athlete/programs/${data.programId}`)
        } else {
          router.push(`${basePath}/athlete/programs`)
        }
      } else {
        // Self-coached: use athlete generate-program endpoint
        const res = await fetch('/api/athlete/generate-program', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sport: primarySport || 'RUNNING',
            experience: 'INTERMEDIATE',
            goal,
            targetDate: goal === 'race-prep' ? raceDate : undefined,
            weeklyAvailability: parseInt(weeklyDays),
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || t('errors.generation'))
        }

        const data = await res.json()
        if (data.programId) {
          router.push(`${basePath}/athlete/programs/${data.programId}`)
        } else {
          router.push(`${basePath}/athlete/programs`)
        }
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Goal selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('goalLabel')}</Label>
            <RadioGroup value={goal} onValueChange={setGoal} className="grid gap-2">
              {GOAL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem value={option.value} />
                  <span className="text-sm">{t(option.labelKey)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Race details (only for race-prep) */}
          {goal === 'race-prep' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <Label htmlFor="race-name" className="text-sm">{t('raceNameLabel')}</Label>
                <Input
                  id="race-name"
                  placeholder={t('raceNamePlaceholder')}
                  value={raceName}
                  onChange={(e) => setRaceName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="race-date" className="text-sm">{t('raceDateLabel')}</Label>
                <Input
                  id="race-date"
                  type="date"
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Weekly days */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('weeklyDaysLabel')}</Label>
            <Select value={weeklyDays} onValueChange={setWeeklyDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {t('daysPerWeek', { count: n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('actions.creating')}
              </>
            ) : (
              t('actions.create')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
