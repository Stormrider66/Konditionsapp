'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Info } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// Schema for form validation
const bioimpedanceSchema = z.object({
  date: z.string(),
  weight: z.number().min(20).max(300),
  bodyFatPercent: z.number().min(1).max(60).optional(),
  muscleMass: z.number().min(10).max(150).optional(),
  boneMass: z.number().min(1).max(10).optional(),
  waterPercent: z.number().min(30).max(80).optional(),
  bmr: z.number().min(500).max(5000).optional(),
  visceralFat: z.number().min(1).max(30).optional(),
  deviceBrand: z.string().optional(),
  measurementTime: z.string().optional(),
  notes: z.string().optional(),
})

type BioimpedanceFormData = z.infer<typeof bioimpedanceSchema>

interface InitialDataType {
  id?: string
  date?: string
  weight?: number
  bodyFatPercent?: number
  muscleMass?: number
  boneMass?: number
  waterPercent?: number
  bmr?: number
  visceralFat?: number
  deviceBrand?: string
  measurementTime?: string
  notes?: string
}

interface BioimpedanceFormProps {
  clientId: string
  clientName?: string
  onSuccess?: () => void
  onCancel?: () => void
  initialData?: InitialDataType
  isGlass?: boolean
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

export function BioimpedanceForm({ clientId, clientName, onSuccess, onCancel, initialData, isGlass }: BioimpedanceFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    measurement: any
    analysis: any
  } | null>(null)
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
      date: initialData?.date || new Date().toISOString().split('T')[0],
      measurementTime: initialData?.measurementTime || 'MORNING_FASTED',
      weight: initialData?.weight,
      bodyFatPercent: initialData?.bodyFatPercent,
      muscleMass: initialData?.muscleMass,
      visceralFat: initialData?.visceralFat,
      boneMass: initialData?.boneMass,
      waterPercent: initialData?.waterPercent,
      bmr: initialData?.bmr,
      deviceBrand: initialData?.deviceBrand,
      notes: initialData?.notes,
    },
  })

  const onSubmit = async (data: BioimpedanceFormData) => {
    setIsSubmitting(true)
    try {
      const url = isEditing
        ? `/api/body-composition/${initialData!.id}`
        : '/api/body-composition'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
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
        title: isEditing ? 'Mätning uppdaterad!' : 'Mätning sparad!',
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
        <Alert className={cn(
          isGlass
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-green-50 border-green-200"
        )}>
          <CheckCircle2 className={cn("h-5 w-5", isGlass ? "text-green-400" : "text-green-600")} />
          <AlertTitle className={cn(isGlass ? "text-green-300 font-bold uppercase tracking-tight" : "text-green-900")}>Mätning sparad!</AlertTitle>
          <AlertDescription className={isGlass ? "text-green-200/80" : "text-green-800"}>
            Kroppssammansättningsmätningen för {clientName || 'klienten'} har registrerats.
          </AlertDescription>
        </Alert>

        <div className={cn(
          isGlass ? "space-y-6" : "space-y-4"
        )}>
          {isGlass ? (
            <GlassCard className="border-white/5 bg-white/[0.02]">
              <GlassCardHeader>
                <GlassCardTitle className="text-lg font-black italic uppercase tracking-tight">Resultat</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Vikt', value: result.measurement.weightKg, unit: 'kg' },
                    { label: 'Kroppsfett', value: result.measurement.bodyFatPercent, unit: '%', category: result.analysis?.bodyFatCategory },
                    { label: 'Muskelmassa', value: result.measurement.muscleMassKg, unit: 'kg' },
                    { label: 'BMI', value: result.measurement.bmi, unit: '', category: result.analysis?.bmiCategory },
                    { label: 'Visceralt fett', value: result.measurement.visceralFat, unit: '', category: result.analysis?.visceralFatCategory },
                    { label: 'Totalt vatten', value: result.measurement.waterPercent, unit: '%' },
                    { label: 'Intracellulärt (ICW)', value: result.measurement.intracellularWaterPercent, unit: '%' },
                    { label: 'Extracellulärt (ECW)', value: result.measurement.extracellularWaterPercent, unit: '%' },
                    { label: 'BMR', value: result.measurement.bmrKcal, unit: 'kcal' },
                    { label: 'FFMI', value: result.measurement.ffmi, unit: '', category: result.analysis?.ffmiCategory },
                  ].map((item, idx) => item.value ? (
                    <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{item.label}</p>
                      <p className="text-xl font-black text-white">{item.value}{item.unit}</p>
                      {item.category && (
                        <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-tight">{item.category}</p>
                      )}
                    </div>
                  ) : null)}
                </div>

                {result.analysis?.recommendations?.length > 0 && (
                  <div className="pt-6 border-t border-white/5">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Rekommendationer</h4>
                    <ul className="space-y-3">
                      {result.analysis.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          ) : (
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
          )}
        </div>

        <Button
          onClick={() => setResult(null)}
          variant={isGlass ? "ghost" : "outline"}
          className={cn(
            "w-full rounded-xl",
            isGlass ? "text-slate-400 hover:text-white hover:bg-white/5" : ""
          )}
        >
          Registrera ny mätning
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Alert className={cn(
        isGlass
          ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
          : "bg-blue-50 border-blue-200"
      )}>
        <Info className={cn("h-4 w-4", isGlass ? "text-blue-400" : "text-blue-600")} />
        <AlertTitle className={cn(isGlass ? "text-blue-300 font-bold uppercase tracking-tight" : "text-blue-900")}>Tips för bästa resultat</AlertTitle>
        <AlertDescription className={cn("text-sm mt-2", isGlass ? "text-blue-200/80" : "text-blue-800")}>
          <ul className="list-disc list-inside space-y-1">
            <li>Mät på morgonen före frukost för mest konsekventa resultat</li>
            <li>Undvik träning och alkohol 24 timmar före mätning</li>
            <li>Se till att vara väl hydrerad (men inte överhydrerad)</li>
            <li>Använd samma våg/utrustning för jämförbara resultat</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="date" className={cn(isGlass && "text-[10px] font-black uppercase tracking-widest text-slate-500")}>Mätdatum *</Label>
          <Input
            id="date"
            type="date"
            {...register('date')}
            className={cn(isGlass && "bg-black/40 border-white/10 text-white rounded-xl focus:ring-orange-500/20")}
          />
          {errors.date && (
            <p className="text-sm text-red-500 font-bold">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="measurementTime" className={cn(isGlass && "text-[10px] font-black uppercase tracking-widest text-slate-500")}>Tidpunkt</Label>
          <Select
            value={watch('measurementTime') ?? undefined}
            onValueChange={(value) => setValue('measurementTime', value)}
          >
            <SelectTrigger className={cn(isGlass && "bg-black/40 border-white/10 text-white rounded-xl focus:ring-orange-500/20")}>
              <SelectValue placeholder="Välj tidpunkt" />
            </SelectTrigger>
            <SelectContent className={cn(isGlass && "bg-[#111] border-white/10 text-white")}>
              {MEASUREMENT_TIMES.map((time) => (
                <SelectItem key={time.value} value={time.value} className={cn(isGlass && "hover:bg-white/5 focus:bg-white/5")}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isGlass ? (
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Grundmätningar</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { id: 'weight', label: 'Vikt (kg)', step: '0.1', placeholder: '72.5' },
                { id: 'bodyFatPercent', label: 'Kroppsfett (%)', step: '0.1', placeholder: '18.5' },
                { id: 'muscleMass', label: 'Muskelmassa (kg)', step: '0.1', placeholder: '55.0' },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">{field.label}</Label>
                  <Input
                    id={field.id}
                    type="number"
                    step={field.step}
                    placeholder={field.placeholder}
                    {...register(field.id as any, { valueAsNumber: true })}
                    className="bg-black/40 border-white/10 text-white rounded-xl focus:ring-orange-500/20"
                  />
                  {errors[field.id as keyof BioimpedanceFormData] && (
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{(errors as any)[field.id].message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Detaljerade mätningar</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="visceralFat" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Visceralt fett (1-59)</Label>
                <Input
                  id="visceralFat"
                  type="number"
                  placeholder="8"
                  {...register('visceralFat', { valueAsNumber: true })}
                  className="bg-black/40 border-white/10 text-white rounded-xl focus:ring-orange-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boneMass" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Benmassa (kg)</Label>
                <Input
                  id="boneMass"
                  type="number"
                  step="0.1"
                  placeholder="3.2"
                  {...register('boneMass', { valueAsNumber: true })}
                  className="bg-black/40 border-white/10 text-white rounded-xl focus:ring-orange-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bmr" className="text-[10px] font-black uppercase tracking-widest text-slate-500">BMR (kcal)</Label>
                <Input
                  id="bmr"
                  type="number"
                  placeholder="1800"
                  {...register('bmr', { valueAsNumber: true })}
                  className="bg-black/40 border-white/10 text-white rounded-xl focus:ring-orange-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Anteckningar</Label>
                <Input
                  id="notes"
                  type="text"
                  placeholder="Valfria anteckningar"
                  {...register('notes')}
                  className="bg-black/40 border-white/10 text-white rounded-xl focus:ring-orange-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceBrand" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Utrustning</Label>
                <Select
                  value={watch('deviceBrand') ?? undefined}
                  onValueChange={(value) => setValue('deviceBrand', value)}
                >
                  <SelectTrigger className="bg-black/40 border-white/10 text-white rounded-xl focus:ring-orange-500/20">
                    <SelectValue placeholder="Välj märke" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    {DEVICE_BRANDS.map((brand) => (
                      <SelectItem key={brand.value} value={brand.value} className="hover:bg-white/5 focus:bg-white/5">
                        {brand.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Vattenmätningar</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'waterPercent', label: 'Totalt vatten (%)', helper: '' },
                { id: 'intracellularWaterPercent', label: 'Intracellulärt (ICW) (%)', helper: 'Vatten inuti cellerna' },
                { id: 'extracellularWaterPercent', label: 'Extracellulärt (ECW) (%)', helper: 'Vatten utanför cellerna' },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">{field.label}</Label>
                  <Input
                    id={field.id}
                    type="number"
                    step="0.1"
                    placeholder="55.0"
                    {...register(field.id as any, { valueAsNumber: true })}
                    className="bg-black/40 border-white/10 text-white rounded-xl focus:ring-orange-500/20"
                  />
                  {field.helper && <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">{field.helper}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grundmätningar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Vikt (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="72.5"
                    {...register('weight', { valueAsNumber: true })}
                  />
                  {errors.weight && (
                    <p className="text-sm text-red-600">{errors.weight.message}</p>
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
                  <Label htmlFor="muscleMass">Muskelmassa (kg)</Label>
                  <Input
                    id="muscleMass"
                    type="number"
                    step="0.1"
                    placeholder="55.0"
                    {...register('muscleMass', { valueAsNumber: true })}
                  />
                  {errors.muscleMass && (
                    <p className="text-sm text-red-600">{errors.muscleMass.message}</p>
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
                  <Label htmlFor="boneMass">Benmassa (kg)</Label>
                  <Input
                    id="boneMass"
                    type="number"
                    step="0.1"
                    placeholder="3.2"
                    {...register('boneMass', { valueAsNumber: true })}
                  />
                  {errors.boneMass && (
                    <p className="text-sm text-red-600">{errors.boneMass.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bmr">BMR (kcal)</Label>
                  <Input
                    id="bmr"
                    type="number"
                    placeholder="1800"
                    {...register('bmr', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">Lämna tomt för automatisk beräkning</p>
                  {errors.bmr && (
                    <p className="text-sm text-red-600">{errors.bmr.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deviceBrand">Utrustning</Label>
                  <Select
                    value={watch('deviceBrand') ?? undefined}
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

              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes" className={cn(isGlass && "text-[10px] font-black uppercase tracking-widest text-slate-500")}>Anteckningar</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          placeholder="T.ex. 'Mätte direkt efter uppvaknande', 'Vätskeintag kvällen före var högt'"
          className={cn(
            "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            isGlass
              ? "bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:ring-orange-500/20"
              : "border-input bg-background"
          )}
        />
      </div>

      <div className="flex gap-4">
        {onCancel && (
          <Button
            type="button"
            variant={isGlass ? "ghost" : "outline"}
            size="lg"
            className={cn(
              "flex-1 rounded-xl",
              isGlass ? "text-slate-400 hover:text-white hover:bg-white/5 h-12 text-xs font-black uppercase tracking-widest" : ""
            )}
            onClick={onCancel}
          >
            Avbryt
          </Button>
        )}
        <Button
          type="submit"
          size="lg"
          className={cn(
            onCancel ? 'flex-1' : 'w-full',
            "rounded-xl h-12 text-xs font-black uppercase tracking-widest transition-all",
            isGlass
              ? "bg-orange-600 hover:bg-orange-500 text-white shadow-xl shadow-orange-600/20"
              : ""
          )}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sparar...' : isEditing ? 'Uppdatera mätning' : 'Spara mätning'}
        </Button>
      </div>
    </form>
  )
}
