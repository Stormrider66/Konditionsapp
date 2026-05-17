'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Scale,
  Percent,
  Dumbbell,
  Droplet,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { useTranslations } from '@/i18n/client'

interface WeeklyCheckInProps {
  onSubmit: (data: CheckInData) => Promise<void>
  lastMeasurementDate?: Date
  className?: string
}

interface CheckInData {
  measurementDate: string
  weightKg?: number
  bodyFatPercent?: number
  muscleMassKg?: number
  waterPercent?: number
  measurementTime?: string
  notes?: string
}

const MEASUREMENT_TIMES = [
  { value: 'MORNING_FASTED', labelKey: 'measurementTimes.morningFasted' },
  { value: 'MORNING_AFTER_BATHROOM', labelKey: 'measurementTimes.morningAfterBathroom' },
  { value: 'EVENING', labelKey: 'measurementTimes.evening' },
  { value: 'POST_WORKOUT', labelKey: 'measurementTimes.postWorkout' },
  { value: 'OTHER', labelKey: 'measurementTimes.other' },
]

function InputWithIcon({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  unit,
  step = '0.1',
}: {
  icon: typeof Scale
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  unit?: string
  step?: string
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-12"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

export function WeeklyCheckIn({ onSubmit, lastMeasurementDate, className }: WeeklyCheckInProps) {
  const t = useTranslations('components.weeklyCheckIn')
  const [now] = useState(() => Date.now())
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState({
    measurementDate: new Date().toISOString().split('T')[0],
    weightKg: '',
    bodyFatPercent: '',
    muscleMassKg: '',
    waterPercent: '',
    measurementTime: 'MORNING_FASTED',
    notes: '',
  })

  const daysSinceLastMeasurement = lastMeasurementDate
    ? Math.floor((now - lastMeasurementDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const data: CheckInData = {
        measurementDate: formData.measurementDate,
        measurementTime: formData.measurementTime,
        notes: formData.notes || undefined,
      }

      if (formData.weightKg) data.weightKg = parseFloat(formData.weightKg)
      if (formData.bodyFatPercent) data.bodyFatPercent = parseFloat(formData.bodyFatPercent)
      if (formData.muscleMassKg) data.muscleMassKg = parseFloat(formData.muscleMassKg)
      if (formData.waterPercent) data.waterPercent = parseFloat(formData.waterPercent)

      await onSubmit(data)
      setIsSuccess(true)

      // Reset form after short delay
      setTimeout(() => {
        setIsSuccess(false)
        setFormData(prev => ({
          ...prev,
          measurementDate: new Date().toISOString().split('T')[0],
          weightKg: '',
          bodyFatPercent: '',
          muscleMassKg: '',
          waterPercent: '',
          notes: '',
        }))
      }, 2000)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg mb-1">{t('successTitle')}</h3>
            <p className="text-muted-foreground">
              {t('successDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {daysSinceLastMeasurement !== null ? (
            daysSinceLastMeasurement === 0 ? (
              t('lastMeasurement.today')
            ) : daysSinceLastMeasurement === 1 ? (
              t('lastMeasurement.yesterday')
            ) : (
              t('lastMeasurement.daysAgo', { count: daysSinceLastMeasurement })
            )
          ) : (
            t('lastMeasurement.first')
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">{t('date')}</Label>
            <Input
              id="date"
              type="date"
              value={formData.measurementDate}
              onChange={(e) => setFormData(prev => ({ ...prev, measurementDate: e.target.value }))}
            />
          </div>

          {/* Measurement Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t('measurementTime')}
            </Label>
            <Select
              value={formData.measurementTime}
              onValueChange={(v) => setFormData(prev => ({ ...prev, measurementTime: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEASUREMENT_TIMES.map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {t(time.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Core Measurements */}
          <div className="grid gap-4 sm:grid-cols-2">
            <InputWithIcon
              icon={Scale}
              label={t('fields.weight')}
              value={formData.weightKg}
              onChange={(v) => setFormData(prev => ({ ...prev, weightKg: v }))}
              placeholder="82.5"
              unit="kg"
            />

            <InputWithIcon
              icon={Percent}
              label={t('fields.bodyFat')}
              value={formData.bodyFatPercent}
              onChange={(v) => setFormData(prev => ({ ...prev, bodyFatPercent: v }))}
              placeholder="18.5"
              unit="%"
            />

            <InputWithIcon
              icon={Dumbbell}
              label={t('fields.muscleMass')}
              value={formData.muscleMassKg}
              onChange={(v) => setFormData(prev => ({ ...prev, muscleMassKg: v }))}
              placeholder="35.0"
              unit="kg"
            />

            <InputWithIcon
              icon={Droplet}
              label={t('fields.water')}
              value={formData.waterPercent}
              onChange={(v) => setFormData(prev => ({ ...prev, waterPercent: v }))}
              placeholder="55.0"
              unit="%"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('notesLabel')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t('notesPlaceholder')}
              rows={2}
            />
          </div>

          {/* Tips */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>{t('tips.title')}</strong>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li>{t('tips.sameTime')}</li>
              <li>{t('tips.morning')}</li>
              <li>{t('tips.avoidPostWorkout')}</li>
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('saving') : t('save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
