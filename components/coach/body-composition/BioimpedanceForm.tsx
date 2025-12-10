'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Scale,
  Percent,
  Activity,
  Droplets,
  Bone,
  Heart,
  Loader2,
  Save,
} from 'lucide-react'

const bioimpedanceSchema = z.object({
  measurementDate: z.string().min(1, 'Datum krävs'),
  weightKg: z.number().min(20).max(300).optional().nullable(),
  bodyFatPercent: z.number().min(1).max(70).optional().nullable(),
  muscleMassKg: z.number().min(10).max(150).optional().nullable(),
  visceralFat: z.number().int().min(1).max(59).optional().nullable(),
  boneMassKg: z.number().min(0.5).max(10).optional().nullable(),
  waterPercent: z.number().min(20).max(80).optional().nullable(),
  bmrKcal: z.number().int().min(500).max(5000).optional().nullable(),
  metabolicAge: z.number().int().min(10).max(100).optional().nullable(),
  deviceBrand: z.string().optional().nullable(),
  measurementTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type BioimpedanceFormData = z.infer<typeof bioimpedanceSchema>

interface BioimpedanceFormProps {
  clientId: string
  onSuccess?: () => void
  onCancel?: () => void
  initialData?: Partial<BioimpedanceFormData> & { id?: string }
}

const DEVICE_BRANDS = [
  'Tanita',
  'InBody',
  'Omron',
  'Withings',
  'Garmin',
  'Fitbit',
  'Renpho',
  'Eufy',
  'Annan',
]

const MEASUREMENT_TIMES = [
  { value: 'MORNING_FASTED', label: 'Morgon (fastande)' },
  { value: 'MORNING_AFTER_TOILET', label: 'Morgon (efter toalettbesök)' },
  { value: 'BEFORE_WORKOUT', label: 'Före träning' },
  { value: 'AFTER_WORKOUT', label: 'Efter träning' },
  { value: 'EVENING', label: 'Kväll' },
  { value: 'OTHER', label: 'Annat' },
]

export function BioimpedanceForm({
  clientId,
  onSuccess,
  onCancel,
  initialData,
}: BioimpedanceFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!initialData?.id

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BioimpedanceFormData>({
    resolver: zodResolver(bioimpedanceSchema),
    defaultValues: {
      measurementDate: initialData?.measurementDate || new Date().toISOString().split('T')[0],
      weightKg: initialData?.weightKg ?? null,
      bodyFatPercent: initialData?.bodyFatPercent ?? null,
      muscleMassKg: initialData?.muscleMassKg ?? null,
      visceralFat: initialData?.visceralFat ?? null,
      boneMassKg: initialData?.boneMassKg ?? null,
      waterPercent: initialData?.waterPercent ?? null,
      bmrKcal: initialData?.bmrKcal ?? null,
      metabolicAge: initialData?.metabolicAge ?? null,
      deviceBrand: initialData?.deviceBrand ?? null,
      measurementTime: initialData?.measurementTime ?? null,
      notes: initialData?.notes ?? null,
    },
  })

  const onSubmit = async (data: BioimpedanceFormData) => {
    setIsSubmitting(true)
    try {
      const url = isEditing
        ? `/api/body-composition/${initialData.id}`
        : '/api/body-composition'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          ...data,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte spara mätning')
      }

      toast({
        title: isEditing ? 'Mätning uppdaterad' : 'Mätning sparad',
        description: `Kroppssammansättning för ${data.measurementDate} har sparats.`,
      })

      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {isEditing ? 'Redigera mätning' : 'Ny kroppssammansättningsmätning'}
          </CardTitle>
          <CardDescription>
            Registrera data från bioimpedansmätning (våg med kroppsanalys)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and basic info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="measurementDate">Datum *</Label>
              <Input
                id="measurementDate"
                type="date"
                {...register('measurementDate')}
              />
              {errors.measurementDate && (
                <p className="text-sm text-red-500">{errors.measurementDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceBrand">Våg/Enhet</Label>
              <Select
                value={watch('deviceBrand') || ''}
                onValueChange={(value) => setValue('deviceBrand', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj enhet" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="measurementTime">Tidpunkt</Label>
              <Select
                value={watch('measurementTime') || ''}
                onValueChange={(value) => setValue('measurementTime', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj tidpunkt" />
                </SelectTrigger>
                <SelectContent>
                  {MEASUREMENT_TIMES.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Primary measurements */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Huvudmätningar
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weightKg">Vikt (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="75.5"
                  {...register('weightKg', { valueAsNumber: true })}
                />
                {errors.weightKg && (
                  <p className="text-sm text-red-500">{errors.weightKg.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodyFatPercent" className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Kroppsfett (%)
                </Label>
                <Input
                  id="bodyFatPercent"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="15.0"
                  {...register('bodyFatPercent', { valueAsNumber: true })}
                />
                {errors.bodyFatPercent && (
                  <p className="text-sm text-red-500">{errors.bodyFatPercent.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="muscleMassKg">Muskelmassa (kg)</Label>
                <Input
                  id="muscleMassKg"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="35.0"
                  {...register('muscleMassKg', { valueAsNumber: true })}
                />
                {errors.muscleMassKg && (
                  <p className="text-sm text-red-500">{errors.muscleMassKg.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Secondary measurements */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Detaljmätningar
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visceralFat">Visceralt fett (1-59)</Label>
                <Input
                  id="visceralFat"
                  type="number"
                  inputMode="numeric"
                  placeholder="8"
                  {...register('visceralFat', { valueAsNumber: true })}
                />
                {errors.visceralFat && (
                  <p className="text-sm text-red-500">{errors.visceralFat.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="boneMassKg" className="flex items-center gap-1">
                  <Bone className="h-3 w-3" />
                  Benmassa (kg)
                </Label>
                <Input
                  id="boneMassKg"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="3.2"
                  {...register('boneMassKg', { valueAsNumber: true })}
                />
                {errors.boneMassKg && (
                  <p className="text-sm text-red-500">{errors.boneMassKg.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="waterPercent">Vatten (%)</Label>
                <Input
                  id="waterPercent"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="55.0"
                  {...register('waterPercent', { valueAsNumber: true })}
                />
                {errors.waterPercent && (
                  <p className="text-sm text-red-500">{errors.waterPercent.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="metabolicAge">Metabolisk ålder</Label>
                <Input
                  id="metabolicAge"
                  type="number"
                  inputMode="numeric"
                  placeholder="35"
                  {...register('metabolicAge', { valueAsNumber: true })}
                />
                {errors.metabolicAge && (
                  <p className="text-sm text-red-500">{errors.metabolicAge.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Metabolic data */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Metabolisk data
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bmrKcal">BMR (kcal/dag)</Label>
                <Input
                  id="bmrKcal"
                  type="number"
                  inputMode="numeric"
                  placeholder="1800"
                  {...register('bmrKcal', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Lämna tomt för automatisk beräkning
                </p>
                {errors.bmrKcal && (
                  <p className="text-sm text-red-500">{errors.bmrKcal.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea
              id="notes"
              placeholder="T.ex. mätning efter sjukdom, vätskestatus, etc."
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Avbryt
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sparar...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Uppdatera' : 'Spara mätning'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
