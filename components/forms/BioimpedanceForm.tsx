'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Info, CheckCircle2 } from 'lucide-react'

const bioimpedanceSchema = z.object({
  measurementDate: z.string().min(1, 'Datum krävs'),
  weightKg: z.number().min(20).max(300).optional(),
  bodyFatPercent: z.number().min(1).max(60).optional(),
  muscleMassKg: z.number().min(10).max(150).optional(),
  visceralFat: z.number().int().min(1).max(59).optional(),
  boneMassKg: z.number().min(0.5).max(10).optional(),
  waterPercent: z.number().min(20).max(80).optional(),
  intracellularWaterPercent: z.number().min(10).max(70).optional(),
  extracellularWaterPercent: z.number().min(10).max(50).optional(),
  bmrKcal: z.number().int().min(500).max(5000).optional(),
  metabolicAge: z.number().int().min(10).max(100).optional(),
  deviceBrand: z.string().optional(),
  measurementTime: z.string().optional(),
  notes: z.string().optional(),
})

type BioimpedanceFormData = z.infer<typeof bioimpedanceSchema>

interface BioimpedanceFormProps {
  clientId: string
  clientName?: string
  onSuccess?: () => void
}

const DEVICE_BRANDS = [
  { value: 'akern', label: 'Akern' },
  { value: 'tanita', label: 'Tanita' },
  { value: 'inbody', label: 'InBody' },
  { value: 'omron', label: 'Omron' },
  { value: 'withings', label: 'Withings' },
  { value: 'xiaomi', label: 'Xiaomi' },
  { value: 'renpho', label: 'Renpho' },
  { value: 'garmin', label: 'Garmin' },
  { value: 'other', label: 'Annan' },
]

const MEASUREMENT_TIMES = [
  { value: 'MORNING_FASTED', label: 'Morgon (fastande)' },
  { value: 'MORNING', label: 'Morgon' },
  { value: 'AFTERNOON', label: 'Eftermiddag' },
  { value: 'EVENING', label: 'Kväll' },
  { value: 'POST_WORKOUT', label: 'Efter träning' },
]

export function BioimpedanceForm({ clientId, clientName, onSuccess }: BioimpedanceFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    measurement: any
    analysis: any
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BioimpedanceFormData>({
    resolver: zodResolver(bioimpedanceSchema),
    defaultValues: {
      measurementDate: new Date().toISOString().split('T')[0],
      measurementTime: 'MORNING_FASTED',
    },
  })

  const onSubmit = async (data: BioimpedanceFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/body-composition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          ...data,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte spara mätning')
      }

      setResult(result)
      toast({
        title: 'Mätning sparad!',
        description: 'Kroppssammansättningen har registrerats.',
      })
      onSuccess?.()
    } catch (error) {
      console.error('Error saving measurement:', error)
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte spara mätning',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-900">Mätning sparad!</AlertTitle>
          <AlertDescription className="text-green-800">
            Kroppssammansättningsmätningen för {clientName || 'klienten'} har registrerats.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Resultat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {result.measurement.weightKg && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Vikt</p>
                  <p className="text-xl font-semibold">{result.measurement.weightKg} kg</p>
                </div>
              )}
              {result.measurement.bodyFatPercent && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Kroppsfett</p>
                  <p className="text-xl font-semibold">{result.measurement.bodyFatPercent}%</p>
                  {result.analysis?.bodyFatCategory && (
                    <p className="text-xs text-muted-foreground">{result.analysis.bodyFatCategory}</p>
                  )}
                </div>
              )}
              {result.measurement.muscleMassKg && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Muskelmassa</p>
                  <p className="text-xl font-semibold">{result.measurement.muscleMassKg} kg</p>
                </div>
              )}
              {result.measurement.bmi && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">BMI</p>
                  <p className="text-xl font-semibold">{result.measurement.bmi}</p>
                  {result.analysis?.bmiCategory && (
                    <p className="text-xs text-muted-foreground">{result.analysis.bmiCategory}</p>
                  )}
                </div>
              )}
              {result.measurement.visceralFat && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Visceralt fett</p>
                  <p className="text-xl font-semibold">{result.measurement.visceralFat}</p>
                  {result.analysis?.visceralFatCategory && (
                    <p className="text-xs text-muted-foreground">{result.analysis.visceralFatCategory}</p>
                  )}
                </div>
              )}
              {result.measurement.waterPercent && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Totalt vatten</p>
                  <p className="text-xl font-semibold">{result.measurement.waterPercent}%</p>
                </div>
              )}
              {result.measurement.intracellularWaterPercent && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Intracellulärt (ICW)</p>
                  <p className="text-xl font-semibold">{result.measurement.intracellularWaterPercent}%</p>
                </div>
              )}
              {result.measurement.extracellularWaterPercent && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Extracellulärt (ECW)</p>
                  <p className="text-xl font-semibold">{result.measurement.extracellularWaterPercent}%</p>
                </div>
              )}
              {result.measurement.bmrKcal && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">BMR</p>
                  <p className="text-xl font-semibold">{result.measurement.bmrKcal} kcal</p>
                </div>
              )}
              {result.measurement.ffmi && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">FFMI</p>
                  <p className="text-xl font-semibold">{result.measurement.ffmi}</p>
                  {result.analysis?.ffmiCategory && (
                    <p className="text-xs text-muted-foreground">{result.analysis.ffmiCategory}</p>
                  )}
                </div>
              )}
            </div>

            {result.analysis?.recommendations?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Rekommendationer</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {result.analysis.recommendations.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={() => setResult(null)}
          variant="outline"
          className="w-full"
        >
          Registrera ny mätning
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Tips för bästa resultat</AlertTitle>
        <AlertDescription className="text-blue-800 text-sm">
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Mät på morgonen före frukost för mest konsekventa resultat</li>
            <li>Undvik träning och alkohol 24 timmar före mätning</li>
            <li>Se till att vara väl hydrerad (men inte överhydrerad)</li>
            <li>Använd samma våg/utrustning för jämförbara resultat</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="measurementDate">Mätdatum *</Label>
          <Input
            id="measurementDate"
            type="date"
            {...register('measurementDate')}
          />
          {errors.measurementDate && (
            <p className="text-sm text-red-600">{errors.measurementDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="measurementTime">Tidpunkt</Label>
          <Select
            value={watch('measurementTime')}
            onValueChange={(value) => setValue('measurementTime', value)}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grundmätningar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weightKg">Vikt (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                step="0.1"
                placeholder="72.5"
                {...register('weightKg', { valueAsNumber: true })}
              />
              {errors.weightKg && (
                <p className="text-sm text-red-600">{errors.weightKg.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyFatPercent">Kroppsfett (%)</Label>
              <Input
                id="bodyFatPercent"
                type="number"
                step="0.1"
                placeholder="18.5"
                {...register('bodyFatPercent', { valueAsNumber: true })}
              />
              {errors.bodyFatPercent && (
                <p className="text-sm text-red-600">{errors.bodyFatPercent.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="muscleMassKg">Muskelmassa (kg)</Label>
              <Input
                id="muscleMassKg"
                type="number"
                step="0.1"
                placeholder="55.0"
                {...register('muscleMassKg', { valueAsNumber: true })}
              />
              {errors.muscleMassKg && (
                <p className="text-sm text-red-600">{errors.muscleMassKg.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detaljerade mätningar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="visceralFat">Visceralt fett (1-59)</Label>
              <Input
                id="visceralFat"
                type="number"
                placeholder="8"
                {...register('visceralFat', { valueAsNumber: true })}
              />
              {errors.visceralFat && (
                <p className="text-sm text-red-600">{errors.visceralFat.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="boneMassKg">Benmassa (kg)</Label>
              <Input
                id="boneMassKg"
                type="number"
                step="0.1"
                placeholder="3.2"
                {...register('boneMassKg', { valueAsNumber: true })}
              />
              {errors.boneMassKg && (
                <p className="text-sm text-red-600">{errors.boneMassKg.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bmrKcal">BMR (kcal)</Label>
              <Input
                id="bmrKcal"
                type="number"
                placeholder="1800"
                {...register('bmrKcal', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Lämna tomt för automatisk beräkning</p>
              {errors.bmrKcal && (
                <p className="text-sm text-red-600">{errors.bmrKcal.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="metabolicAge">Metabolisk ålder</Label>
              <Input
                id="metabolicAge"
                type="number"
                placeholder="32"
                {...register('metabolicAge', { valueAsNumber: true })}
              />
              {errors.metabolicAge && (
                <p className="text-sm text-red-600">{errors.metabolicAge.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceBrand">Utrustning</Label>
              <Select
                value={watch('deviceBrand')}
                onValueChange={(value) => setValue('deviceBrand', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj märke" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_BRANDS.map((brand) => (
                    <SelectItem key={brand.value} value={brand.value}>
                      {brand.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vattenmätningar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="waterPercent">Totalt vatten (%)</Label>
              <Input
                id="waterPercent"
                type="number"
                step="0.1"
                placeholder="55.0"
                {...register('waterPercent', { valueAsNumber: true })}
              />
              {errors.waterPercent && (
                <p className="text-sm text-red-600">{errors.waterPercent.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="intracellularWaterPercent">Intracellulärt vatten (%)</Label>
              <Input
                id="intracellularWaterPercent"
                type="number"
                step="0.1"
                placeholder="35.0"
                {...register('intracellularWaterPercent', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">ICW - vatten inuti cellerna</p>
              {errors.intracellularWaterPercent && (
                <p className="text-sm text-red-600">{errors.intracellularWaterPercent.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="extracellularWaterPercent">Extracellulärt vatten (%)</Label>
              <Input
                id="extracellularWaterPercent"
                type="number"
                step="0.1"
                placeholder="20.0"
                {...register('extracellularWaterPercent', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">ECW - vatten utanför cellerna</p>
              {errors.extracellularWaterPercent && (
                <p className="text-sm text-red-600">{errors.extracellularWaterPercent.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="notes">Anteckningar</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          placeholder="T.ex. 'Mätte direkt efter uppvaknande', 'Vätskeintag kvällen före var högt'"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sparar...' : 'Spara mätning'}
      </Button>
    </form>
  )
}
