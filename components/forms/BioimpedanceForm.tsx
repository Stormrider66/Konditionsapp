'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
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
import { useLocale } from '@/i18n/client'

// Schema for form validation
const bioimpedanceSchema = z.object({
  date: z.string(),
  weight: z.number().min(20).max(300),
  bodyFatPercent: z.number().min(1).max(60).optional(),
  muscleMass: z.number().min(10).max(150).optional(),
  boneMass: z.number().min(1).max(10).optional(),
  waterPercent: z.number().min(30).max(80).optional(),
  bmr: z.number().min(500).max(5000).optional(),
  visceralFat: z.number().min(1).max(59).optional(),
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
  { value: 'other', label: { en: 'Other', sv: 'Annan' } },
]

type AppLocale = 'en' | 'sv'

const MEASUREMENT_TIMES = [
  { value: 'MORNING_FASTED', label: { en: 'Morning (fasted)', sv: 'Morgon (fastande)' } },
  { value: 'MORNING', label: { en: 'Morning', sv: 'Morgon' } },
  { value: 'AFTERNOON', label: { en: 'Afternoon', sv: 'Eftermiddag' } },
  { value: 'EVENING', label: { en: 'Evening', sv: 'Kväll' } },
  { value: 'POST_WORKOUT', label: { en: 'After training', sv: 'Efter träning' } },
]

const COPY: Record<AppLocale, {
  saveError: string;
  updatedTitle: string;
  savedTitle: string;
  savedDescription: string;
  errorTitle: string;
  savedAlertDescription: (name?: string) => string;
  results: string;
  recommendations: string;
  newMeasurement: string;
  bestResultsTips: string;
  tips: string[];
  measurementDate: string;
  timeOfDay: string;
  chooseTime: string;
  basicMeasurements: string;
  detailedMeasurements: string;
  waterMeasurements: string;
  weight: string;
  bodyFat: string;
  muscleMass: string;
  visceralFat: string;
  boneMass: string;
  totalWater: string;
  intracellularWater: string;
  extracellularWater: string;
  intracellularHelper: string;
  extracellularHelper: string;
  equipment: string;
  chooseBrand: string;
  notes: string;
  optionalNotes: string;
  bmrAutoHint: string;
  notesPlaceholder: string;
  cancel: string;
  saving: string;
  updateMeasurement: string;
  saveMeasurement: string;
}> = {
  en: {
    saveError: 'Could not save measurement',
    updatedTitle: 'Measurement updated!',
    savedTitle: 'Measurement saved!',
    savedDescription: 'Body composition has been recorded.',
    errorTitle: 'Error',
    savedAlertDescription: (name) => `The body composition measurement for ${name || 'the client'} has been recorded.`,
    results: 'Results',
    recommendations: 'Recommendations',
    newMeasurement: 'Register new measurement',
    bestResultsTips: 'Tips for best results',
    tips: [
      'Measure in the morning before breakfast for the most consistent results',
      'Avoid training and alcohol for 24 hours before measurement',
      'Make sure you are well hydrated, but not overhydrated',
      'Use the same scale/equipment for comparable results',
    ],
    measurementDate: 'Measurement date *',
    timeOfDay: 'Time of day',
    chooseTime: 'Choose time',
    basicMeasurements: 'Basic measurements',
    detailedMeasurements: 'Detailed measurements',
    waterMeasurements: 'Water measurements',
    weight: 'Weight',
    bodyFat: 'Body fat',
    muscleMass: 'Muscle mass',
    visceralFat: 'Visceral fat',
    boneMass: 'Bone mass',
    totalWater: 'Total water',
    intracellularWater: 'Intracellular (ICW)',
    extracellularWater: 'Extracellular (ECW)',
    intracellularHelper: 'Water inside the cells',
    extracellularHelper: 'Water outside the cells',
    equipment: 'Equipment',
    chooseBrand: 'Choose brand',
    notes: 'Notes',
    optionalNotes: 'Optional notes',
    bmrAutoHint: 'Leave empty for automatic calculation',
    notesPlaceholder: "e.g. 'Measured right after waking', 'Fluid intake the evening before was high'",
    cancel: 'Cancel',
    saving: 'Saving...',
    updateMeasurement: 'Update measurement',
    saveMeasurement: 'Save measurement',
  },
  sv: {
    saveError: 'Kunde inte spara mätning',
    updatedTitle: 'Mätning uppdaterad!',
    savedTitle: 'Mätning sparad!',
    savedDescription: 'Kroppssammansättningen har registrerats.',
    errorTitle: 'Fel',
    savedAlertDescription: (name) => `Kroppssammansättningsmätningen för ${name || 'klienten'} har registrerats.`,
    results: 'Resultat',
    recommendations: 'Rekommendationer',
    newMeasurement: 'Registrera ny mätning',
    bestResultsTips: 'Tips för bästa resultat',
    tips: [
      'Mät på morgonen före frukost för mest konsekventa resultat',
      'Undvik träning och alkohol 24 timmar före mätning',
      'Se till att vara väl hydrerad (men inte överhydrerad)',
      'Använd samma våg/utrustning för jämförbara resultat',
    ],
    measurementDate: 'Mätdatum *',
    timeOfDay: 'Tidpunkt',
    chooseTime: 'Välj tidpunkt',
    basicMeasurements: 'Grundmätningar',
    detailedMeasurements: 'Detaljerade mätningar',
    waterMeasurements: 'Vattenmätningar',
    weight: 'Vikt',
    bodyFat: 'Kroppsfett',
    muscleMass: 'Muskelmassa',
    visceralFat: 'Visceralt fett',
    boneMass: 'Benmassa',
    totalWater: 'Totalt vatten',
    intracellularWater: 'Intracellulärt (ICW)',
    extracellularWater: 'Extracellulärt (ECW)',
    intracellularHelper: 'Vatten inuti cellerna',
    extracellularHelper: 'Vatten utanför cellerna',
    equipment: 'Utrustning',
    chooseBrand: 'Välj märke',
    notes: 'Anteckningar',
    optionalNotes: 'Valfria anteckningar',
    bmrAutoHint: 'Lämna tomt för automatisk beräkning',
    notesPlaceholder: "T.ex. 'Mätte direkt efter uppvaknande', 'Vätskeintag kvällen före var högt'",
    cancel: 'Avbryt',
    saving: 'Sparar...',
    updateMeasurement: 'Uppdatera mätning',
    saveMeasurement: 'Spara mätning',
  },
}

export function BioimpedanceForm({ clientId, clientName, onSuccess, onCancel, initialData, isGlass }: BioimpedanceFormProps) {
  const { toast } = useToast()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
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
        throw new Error(result.error || copy.saveError)
      }

      setResult(result)
      toast({
        title: isEditing ? copy.updatedTitle : copy.savedTitle,
        description: copy.savedDescription,
      })
      window.dispatchEvent(new CustomEvent('body-composition-saved'))
      onSuccess?.()
    } catch (error) {
      console.error('Error saving measurement:', error)
      toast({
        title: copy.errorTitle,
        description: error instanceof Error ? error.message : copy.saveError,
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
          <AlertTitle className={cn(isGlass ? "text-green-300 font-bold uppercase tracking-tight" : "text-green-900")}>{copy.savedTitle}</AlertTitle>
          <AlertDescription className={isGlass ? "text-green-200/80" : "text-green-800"}>
            {copy.savedAlertDescription(clientName)}
          </AlertDescription>
        </Alert>

        <div className={cn(
          isGlass ? "space-y-6" : "space-y-4"
        )}>
          {isGlass ? (
            <GlassCard className="border-slate-200 bg-white dark:border-white/5 dark:bg-white/[0.02]">
              <GlassCardHeader>
                <GlassCardTitle className="text-lg font-black italic uppercase tracking-tight">{copy.results}</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: copy.weight, value: result.measurement.weightKg, unit: 'kg' },
                    { label: copy.bodyFat, value: result.measurement.bodyFatPercent, unit: '%', category: result.analysis?.bodyFatCategory },
                    { label: copy.muscleMass, value: result.measurement.muscleMassKg, unit: 'kg' },
                    { label: 'BMI', value: result.measurement.bmi, unit: '', category: result.analysis?.bmiCategory },
                    { label: copy.visceralFat, value: result.measurement.visceralFat, unit: '', category: result.analysis?.visceralFatCategory },
                    { label: copy.totalWater, value: result.measurement.waterPercent, unit: '%' },
                    { label: copy.intracellularWater, value: result.measurement.intracellularWaterPercent, unit: '%' },
                    { label: copy.extracellularWater, value: result.measurement.extracellularWaterPercent, unit: '%' },
                    { label: 'BMR', value: result.measurement.bmrKcal, unit: 'kcal' },
                    { label: 'FFMI', value: result.measurement.ffmi, unit: '', category: result.analysis?.ffmiCategory },
                  ].map((item, idx) => item.value ? (
                    <div key={idx} className="bg-slate-100 border border-slate-200 p-4 rounded-xl dark:bg-white/5 dark:border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{item.label}</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{item.value}{item.unit}</p>
                      {item.category && (
                        <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-tight">{item.category}</p>
                      )}
                    </div>
                  ) : null)}
                </div>

                {result.analysis?.recommendations?.length > 0 && (
                  <div className="pt-6 border-t border-slate-200 dark:border-white/5">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{copy.recommendations}</h4>
                    <ul className="space-y-3">
                      {result.analysis.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
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
                <CardTitle>{copy.results}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {result.measurement.weightKg && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{copy.weight}</p>
                      <p className="text-xl font-semibold">{result.measurement.weightKg} kg</p>
                    </div>
                  )}
                  {result.measurement.bodyFatPercent && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{copy.bodyFat}</p>
                      <p className="text-xl font-semibold">{result.measurement.bodyFatPercent}%</p>
                      {result.analysis?.bodyFatCategory && (
                        <p className="text-xs text-muted-foreground">{result.analysis.bodyFatCategory}</p>
                      )}
                    </div>
                  )}
                  {result.measurement.muscleMassKg && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{copy.muscleMass}</p>
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
                      <p className="text-sm text-muted-foreground">{copy.visceralFat}</p>
                      <p className="text-xl font-semibold">{result.measurement.visceralFat}</p>
                      {result.analysis?.visceralFatCategory && (
                        <p className="text-xs text-muted-foreground">{result.analysis.visceralFatCategory}</p>
                      )}
                    </div>
                  )}
                  {result.measurement.waterPercent && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{copy.totalWater}</p>
                      <p className="text-xl font-semibold">{result.measurement.waterPercent}%</p>
                    </div>
                  )}
                  {result.measurement.intracellularWaterPercent && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{copy.intracellularWater}</p>
                      <p className="text-xl font-semibold">{result.measurement.intracellularWaterPercent}%</p>
                    </div>
                  )}
                  {result.measurement.extracellularWaterPercent && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">{copy.extracellularWater}</p>
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
                    <h4 className="font-medium mb-2">{copy.recommendations}</h4>
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
            isGlass ? "text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5" : ""
          )}
        >
          {copy.newMeasurement}
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
        <AlertTitle className={cn(isGlass ? "text-blue-300 font-bold uppercase tracking-tight" : "text-blue-900")}>{copy.bestResultsTips}</AlertTitle>
        <AlertDescription className={cn("text-sm mt-2", isGlass ? "text-blue-200/80" : "text-blue-800")}>
          <ul className="list-disc list-inside space-y-1">
            {copy.tips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="date" className={cn(isGlass && "text-[10px] font-black uppercase tracking-widest text-slate-500")}>{copy.measurementDate}</Label>
          <Input
            id="date"
            type="date"
            {...register('date')}
            className={cn(isGlass && "bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white")}
          />
          {errors.date && (
            <p className="text-sm text-red-500 font-bold">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="measurementTime" className={cn(isGlass && "text-[10px] font-black uppercase tracking-widest text-slate-500")}>{copy.timeOfDay}</Label>
          <Select
            value={watch('measurementTime') ?? undefined}
            onValueChange={(value) => setValue('measurementTime', value)}
          >
            <SelectTrigger className={cn(isGlass && "bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white")}>
              <SelectValue placeholder={copy.chooseTime} />
            </SelectTrigger>
            <SelectContent className={cn(isGlass && "bg-white border-slate-200 text-slate-900 dark:bg-[#111] dark:border-white/10 dark:text-white")}>
              {MEASUREMENT_TIMES.map((time) => (
                <SelectItem key={time.value} value={time.value} className={cn(isGlass && "hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-white/5 dark:focus:bg-white/5")}>
                  {time.label[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isGlass ? (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl dark:bg-white/[0.02] dark:border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-6 dark:text-slate-400">{copy.basicMeasurements}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { id: 'weight', label: `${copy.weight} (kg)`, step: '0.1', placeholder: '72.5' },
                { id: 'bodyFatPercent', label: `${copy.bodyFat} (%)`, step: '0.1', placeholder: '18.5' },
                { id: 'muscleMass', label: `${copy.muscleMass} (kg)`, step: '0.1', placeholder: '55.0' },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">{field.label}</Label>
                  <Input
                    id={field.id}
                    type="number"
                    step={field.step}
                    placeholder={field.placeholder}
                    {...register(field.id as any, { valueAsNumber: true })}
                    className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white"
                  />
                  {errors[field.id as keyof BioimpedanceFormData] && (
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{(errors as any)[field.id].message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl dark:bg-white/[0.02] dark:border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-6 dark:text-slate-400">{copy.detailedMeasurements}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="visceralFat" className="text-[10px] font-black uppercase tracking-widest text-slate-500">{copy.visceralFat} (1-59)</Label>
                <Input
                  id="visceralFat"
                  type="number"
                  placeholder="8"
                  {...register('visceralFat', { valueAsNumber: true })}
                  className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boneMass" className="text-[10px] font-black uppercase tracking-widest text-slate-500">{copy.boneMass} (kg)</Label>
                <Input
                  id="boneMass"
                  type="number"
                  step="0.1"
                  placeholder="3.2"
                  {...register('boneMass', { valueAsNumber: true })}
                  className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bmr" className="text-[10px] font-black uppercase tracking-widest text-slate-500">BMR (kcal)</Label>
                <Input
                  id="bmr"
                  type="number"
                  placeholder="1800"
                  {...register('bmr', { valueAsNumber: true })}
                  className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-slate-500">{copy.notes}</Label>
                <Input
                  id="notes"
                  type="text"
                  placeholder={copy.optionalNotes}
                  {...register('notes')}
                  className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceBrand" className="text-[10px] font-black uppercase tracking-widest text-slate-500">{copy.equipment}</Label>
                <Select
                  value={watch('deviceBrand') ?? undefined}
                  onValueChange={(value) => setValue('deviceBrand', value)}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white">
                    <SelectValue placeholder={copy.chooseBrand} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900 dark:bg-[#111] dark:border-white/10 dark:text-white">
                    {DEVICE_BRANDS.map((brand) => (
                      <SelectItem key={brand.value} value={brand.value} className="hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-white/5 dark:focus:bg-white/5">
                        {typeof brand.label === 'string' ? brand.label : brand.label[locale]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl dark:bg-white/[0.02] dark:border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-6 dark:text-slate-400">{copy.waterMeasurements}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'waterPercent', label: `${copy.totalWater} (%)`, helper: '' },
                { id: 'intracellularWaterPercent', label: `${copy.intracellularWater} (%)`, helper: copy.intracellularHelper },
                { id: 'extracellularWaterPercent', label: `${copy.extracellularWater} (%)`, helper: copy.extracellularHelper },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">{field.label}</Label>
                  <Input
                    id={field.id}
                    type="number"
                    step="0.1"
                    placeholder="55.0"
                    {...register(field.id as any, { valueAsNumber: true })}
                    className="bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white"
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
              <CardTitle className="text-base">{copy.basicMeasurements}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">{copy.weight} (kg)</Label>
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
                  <Label htmlFor="bodyFatPercent">{copy.bodyFat} (%)</Label>
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
                  <Label htmlFor="muscleMass">{copy.muscleMass} (kg)</Label>
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
              <CardTitle className="text-base">{copy.detailedMeasurements}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visceralFat">{copy.visceralFat} (1-59)</Label>
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
                  <Label htmlFor="boneMass">{copy.boneMass} (kg)</Label>
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
                  <p className="text-xs text-muted-foreground">{copy.bmrAutoHint}</p>
                  {errors.bmr && (
                    <p className="text-sm text-red-600">{errors.bmr.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deviceBrand">{copy.equipment}</Label>
                  <Select
                    value={watch('deviceBrand') ?? undefined}
                    onValueChange={(value) => setValue('deviceBrand', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={copy.chooseBrand} />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_BRANDS.map((brand) => (
                        <SelectItem key={brand.value} value={brand.value}>
                          {typeof brand.label === 'string' ? brand.label : brand.label[locale]}
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
              <CardTitle className="text-base">{copy.waterMeasurements}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="waterPercent">{copy.totalWater} (%)</Label>
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
        <Label htmlFor="notes" className={cn(isGlass && "text-[10px] font-black uppercase tracking-widest text-slate-500")}>{copy.notes}</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          placeholder={copy.notesPlaceholder}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            isGlass
              ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-orange-500/20 dark:bg-black/40 dark:border-white/10 dark:text-white dark:placeholder:text-slate-600"
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
              isGlass ? "text-slate-600 hover:text-slate-950 hover:bg-slate-100 h-12 text-xs font-black uppercase tracking-widest dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5" : ""
            )}
            onClick={onCancel}
          >
            {copy.cancel}
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
          {isSubmitting ? copy.saving : isEditing ? copy.updateMeasurement : copy.saveMeasurement}
        </Button>
      </div>
    </form>
  )
}
