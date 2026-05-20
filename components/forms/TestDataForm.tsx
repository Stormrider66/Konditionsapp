'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Save, Download, Info, Camera, Loader2, CalendarDays, AlertTriangle, Sparkles, ChevronDown, ChevronRight, Activity } from 'lucide-react'
import { createTestSchema, CreateTestFormData, detectLactateDecreases } from '@/lib/validations/schemas'
import { TestType, TestTemplate } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { SmartTestImportDialog } from '@/components/forms/SmartTestImportDialog'
import type { TestImportResult } from '@/lib/validations/test-import-schema'

interface TestDataFormProps {
  testType: TestType
  onSubmit: (data: CreateTestFormData) => void
  clientId?: string
}

export function TestDataForm({ testType, onSubmit, clientId }: TestDataFormProps) {
  const locale = useLocale()
  const t = useCallback((sv: string, en: string) => locale === 'sv' ? sv : en, [locale])
  const { toast } = useToast()
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTestFormData>({
    resolver: zodResolver(createTestSchema),
    defaultValues: {
      testType,
      testDate: new Date().toISOString().split('T')[0],
      inclineUnit: 'PERCENT',
      restingLactate: undefined,
      postTestMeasurements: [
        { timeMinutes: 1, timeSeconds: 0, lactate: undefined as unknown as number },
        { timeMinutes: 3, timeSeconds: 0, lactate: undefined as unknown as number },
        { timeMinutes: 5, timeSeconds: 0, lactate: undefined as unknown as number },
      ],
      recommendedNextTestDate: undefined,
      stages: [
        {
          durationMinutes: 4,
          durationSeconds: 0,
          heartRate: 120,
          lactate: 1.0,
          vo2: undefined,
          speed: testType === 'RUNNING' ? 8 : undefined,
          power: testType === 'CYCLING' ? 100 : undefined,
          pace: testType === 'SKIING' ? 7.5 : undefined,
        },
        {
          durationMinutes: 4,
          durationSeconds: 0,
          heartRate: 130,
          lactate: 1.3,
          vo2: undefined,
          speed: testType === 'RUNNING' ? 9 : undefined,
          power: testType === 'CYCLING' ? 125 : undefined,
          pace: testType === 'SKIING' ? 6.5 : undefined,
        },
        {
          durationMinutes: 4,
          durationSeconds: 0,
          heartRate: 140,
          lactate: 1.8,
          vo2: undefined,
          speed: testType === 'RUNNING' ? 10 : undefined,
          power: testType === 'CYCLING' ? 150 : undefined,
          pace: testType === 'SKIING' ? 5.5 : undefined,
        },
        {
          durationMinutes: 4,
          durationSeconds: 0,
          heartRate: 150,
          lactate: 2.5,
          vo2: undefined,
          speed: testType === 'RUNNING' ? 11 : undefined,
          power: testType === 'CYCLING' ? 175 : undefined,
          pace: testType === 'SKIING' ? 5.0 : undefined,
        },
        {
          durationMinutes: 4,
          durationSeconds: 0,
          heartRate: 160,
          lactate: 3.5,
          vo2: undefined,
          speed: testType === 'RUNNING' ? 12 : undefined,
          power: testType === 'CYCLING' ? 200 : undefined,
          pace: testType === 'SKIING' ? 4.5 : undefined,
        },
        {
          durationMinutes: 4,
          durationSeconds: 0,
          heartRate: 170,
          lactate: 5.0,
          vo2: undefined,
          speed: testType === 'RUNNING' ? 13 : undefined,
          power: testType === 'CYCLING' ? 225 : undefined,
          pace: testType === 'SKIING' ? 4.0 : undefined,
        },
      ],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'stages',
  })

  const {
    fields: postMeasurementFields,
    append: appendPostMeasurement,
    remove: removePostMeasurement
  } = useFieldArray({
    control,
    name: 'postTestMeasurements',
  })

  const inclineUnit = watch('inclineUnit') || 'PERCENT'
  const inclineLabel = inclineUnit === 'DEGREES' ? t('Lutning (°)', 'Incline (°)') : t('Lutning (%)', 'Incline (%)')

  const watchedStages = watch('stages')
  const lactateWarnings = useMemo(
    () => detectLactateDecreases(watchedStages || []),
    [watchedStages]
  )

  const [templates, setTemplates] = useState<TestTemplate[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [ocrLoading, setOcrLoading] = useState<number | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showMetabolicData, setShowMetabolicData] = useState(false)
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  // OCR handler for lactate meter photo
  const handleLactateOCR = async (stageIndex: number, file: File) => {
    setOcrLoading(stageIndex)
    try {
      const formData = new FormData()
      formData.append('image', file)
      if (clientId) formData.append('clientId', clientId)
      formData.append('testStageContext', `Steg ${stageIndex + 1}`)

      const response = await fetch('/api/ai/lactate-ocr', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.result?.reading?.lactateValue) {
        const lactateValue = data.result.reading.lactateValue
        const stages = getValues('stages')
        stages[stageIndex].lactate = lactateValue
        replace(stages)

        toast({
          title: t('Laktat avläst!', 'Lactate read!'),
          description: locale === 'sv'
            ? `Värde: ${lactateValue} mmol/L (${data.result.reading.confidence}% säkerhet)`
            : `Value: ${lactateValue} mmol/L (${data.result.reading.confidence}% confidence)`,
        })

        if (data.result.reading.warnings?.length > 0) {
          toast({
            title: t('Varning', 'Warning'),
            description: data.result.reading.warnings.join(', '),
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: t('Kunde inte läsa av', 'Could not read value'),
          description: data.error || t('Försök ta en tydligare bild', 'Try taking a clearer photo'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: t('Fel', 'Error'),
        description: t('Kunde inte ansluta till OCR-tjänsten', 'Could not connect to the OCR service'),
        variant: 'destructive',
      })
    } finally {
      setOcrLoading(null)
    }
  }

  const handleSmartImport = useCallback((data: TestImportResult) => {
    if (data.stages.length > 0) {
      replace(data.stages as any)
      // Auto-expand metabolic section if import contains metabolic data
      if (data.stages.some(s => s.rer != null || s.ve != null || s.fatPercent != null)) {
        setShowMetabolicData(true)
      }
    }
    if (data.restingLactate !== undefined) {
      setValue('restingLactate', data.restingLactate)
    }
    if (data.testDate) {
      setValue('testDate', data.testDate)
    }
    if (data.notes) {
      setValue('notes', data.notes)
    }
    if (data.postTestMeasurements && data.postTestMeasurements.length > 0) {
      // Replace post-test measurements using the existing field array
      // We need to set each one via setValue since we don't have a replace for postTestMeasurements
      data.postTestMeasurements.forEach((m, i) => {
        setValue(`postTestMeasurements.${i}.timeMinutes`, m.timeMinutes)
        setValue(`postTestMeasurements.${i}.timeSeconds`, m.timeSeconds)
        setValue(`postTestMeasurements.${i}.lactate`, m.lactate)
      })
    }

    toast({
      title: t('Testdata importerad!', 'Test data imported!'),
      description: locale === 'sv'
        ? `${data.stages.length} steg extraherade (${Math.round(data.confidence * 100)}% säkerhet)`
        : `${data.stages.length} stages extracted (${Math.round(data.confidence * 100)}% confidence)`,
    })
    if (data.warnings.length > 0) {
      toast({
        title: t('Varningar', 'Warnings'),
        description: data.warnings.join('. '),
        variant: 'destructive',
      })
    }
  }, [locale, replace, setValue, t, toast])

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`/api/templates?testType=${testType}`)
      const data = await response.json()
      if (data.success) {
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }, [testType])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Detect the increment pattern from existing stage values
  const detectIncrement = (values: (number | undefined | null)[]): number | null => {
    const nums = values.filter((v): v is number => v != null && !isNaN(v))
    if (nums.length < 2) return null
    const diffs: number[] = []
    for (let i = 1; i < nums.length; i++) {
      diffs.push(nums[i] - nums[i - 1])
    }
    // Use the median diff to be robust against outliers
    diffs.sort((a, b) => a - b)
    const median = diffs[Math.floor(diffs.length / 2)]
    // Round to 1 decimal to avoid floating point noise
    return Math.round(median * 10) / 10
  }

  const addStage = () => {
    const stages = getValues('stages')
    const lastStage = stages[stages.length - 1]

    // Detect increment patterns from entered data, fall back to defaults
    const speedIncrement = detectIncrement(stages.map(s => s.speed)) ?? 1
    const powerIncrement = detectIncrement(stages.map(s => s.power)) ?? 25
    const paceIncrement = detectIncrement(stages.map(s => s.pace)) ?? -0.5

    const newSpeed = testType === 'RUNNING' && lastStage?.speed ? Math.round((lastStage.speed + speedIncrement) * 10) / 10 : (testType === 'RUNNING' ? 8 : undefined)
    const newPower = testType === 'CYCLING' && lastStage?.power ? lastStage.power + powerIncrement : (testType === 'CYCLING' ? 100 : undefined)
    const newPace = testType === 'SKIING' && lastStage?.pace ? Math.max(Math.round((lastStage.pace + paceIncrement) * 10) / 10, 2.5) : (testType === 'SKIING' ? 7.5 : undefined)
    const newHeartRate = lastStage?.heartRate ? lastStage.heartRate + (detectIncrement(stages.map(s => s.heartRate)) ?? 10) : 120
    // Estimate lactate based on exponential growth pattern (roughly doubles every 2-3 stages at higher intensities)
    const newLactate = lastStage?.lactate ? Math.round((lastStage.lactate * 1.4) * 10) / 10 : 1.0

    append({
      durationMinutes: 4,
      durationSeconds: 0,
      heartRate: newHeartRate,
      lactate: newLactate,
      vo2: undefined,
      speed: newSpeed,
      power: newPower,
      pace: newPace,
    })
  }

  const addPostMeasurement = () => {
    const measurements = getValues('postTestMeasurements') || []
    const lastMeasurement = measurements[measurements.length - 1]
    const nextTime = lastMeasurement ? lastMeasurement.timeMinutes + 2 : 1
    appendPostMeasurement({
      timeMinutes: nextTime,
      timeSeconds: 0,
      lactate: undefined as unknown as number,
    })
  }

  const handleSaveTemplate = async () => {
    if (!templateName) {
      toast({
        title: t('Fel', 'Error'),
        description: t('Ange ett namn för mallen', 'Enter a name for the template'),
        variant: 'destructive',
      })
      return
    }

    try {
      const stages = getValues('stages')
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          testType,
          description: templateDescription,
          stages,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: t('Mall sparad!', 'Template saved!'),
          description: t('Testmallen har sparats.', 'The test template has been saved.'),
        })
        setShowSaveDialog(false)
        setTemplateName('')
        setTemplateDescription('')
        fetchTemplates()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: t('Fel', 'Error'),
        description: t('Kunde inte spara mall', 'Could not save template'),
        variant: 'destructive',
      })
    }
  }

  const handleLoadTemplate = (template: TestTemplate) => {
    replace(template.stages as any)
    setShowLoadDialog(false)
    toast({
      title: t('Mall laddad!', 'Template loaded!'),
      description: locale === 'sv'
        ? `Mall "${template.name}" har laddats.`
        : `Template "${template.name}" has been loaded.`,
    })
  }

  const onSubmitHandler = async (data: CreateTestFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Error in form submission:', error)
    }
  }


  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="testDate">{t('Testdatum', 'Test date')}</Label>
        <Input
          id="testDate"
          type="date"
          {...register('testDate')}
        />
        {errors.testDate && <p className="text-sm text-red-600">{errors.testDate.message}</p>}
      </div>

      {/* Resting Lactate */}
      <div className="space-y-2">
        <Label htmlFor="restingLactate">{t('Vilolaktat (mmol/L)', 'Resting lactate (mmol/L)')}</Label>
        <Input
          id="restingLactate"
          type="number"
          step="0.1"
          placeholder={t('T.ex. 0.8', 'e.g. 0.8')}
          className="max-w-[200px]"
          {...register('restingLactate', { valueAsNumber: true })}
        />
        <p className="text-xs text-gray-500">{t('Laktatvärde före testet (valfritt)', 'Lactate value before the test (optional)')}</p>
      </div>

      {/* Incline Unit Selector (only for running tests) */}
      {testType === 'RUNNING' && (
        <div className="space-y-2">
          <Label htmlFor="inclineUnit">{t('Lutningsenhet', 'Incline unit')}</Label>
          <select
            id="inclineUnit"
            {...register('inclineUnit')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="PERCENT">{t('Procent (%)', 'Percent (%)')}</option>
            <option value="DEGREES">{t('Grader (°)', 'Degrees (°)')}</option>
          </select>
          <p className="text-xs text-gray-500">
            {t('Välj om lutning mäts i procent eller grader', 'Choose whether incline is measured in percent or degrees')}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold">{t('Teststeg', 'Test stages')}</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Smart Import
            </Button>
            <Button
              type="button"
              onClick={() => setShowLoadDialog(true)}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('Ladda mall', 'Load template')}
            </Button>
            <Button
              type="button"
              onClick={() => setShowSaveDialog(true)}
              variant="outline"
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {t('Spara som mall', 'Save as template')}
            </Button>
          </div>
        </div>
        {errors.stages && <p className="text-sm text-red-600">{errors.stages.message}</p>}

        {/* D-max Guidelines */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 font-semibold">
            {t('Krav för D-max laktattröskelberäkning', 'Requirements for D-max lactate threshold calculation')}
          </AlertTitle>
          <AlertDescription className="text-blue-800 text-sm space-y-2 mt-2">
            <p className="font-medium">{t('För optimal tröskelberäkning behövs:', 'For optimal threshold calculation you need:')}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>{t('Minst 4 teststeg', 'At least 4 test stages')}</strong> - {t('fler steg ger bättre precision (5-7 steg rekommenderas)', 'more stages improve precision (5-7 stages recommended)')}
              </li>
              <li>
                <strong>{t('Stigande laktatvärden', 'Increasing lactate values')}</strong> - {t('laktat ska öka mellan stegen (undvik större minskningar)', 'lactate should increase between stages (avoid larger decreases)')}
              </li>
              <li>
                <strong>{t('Brett intensitetsområde', 'Broad intensity range')}</strong> - {t('från lätt aerob (1-2 mmol/L) till anaerob (4-6 mmol/L)', 'from easy aerobic (1-2 mmol/L) to anaerobic (4-6 mmol/L)')}
              </li>
              <li>
                <strong>{t('Jämna stegökningar', 'Even stage increments')}</strong> - {t('helst lika stor ökning mellan varje steg (hastighet/watt)', 'ideally the same increase between each stage (speed/watts)')}
              </li>
              <li>
                <strong>{t('Komplett data', 'Complete data')}</strong> - {t('fyll i hastighet/watt, puls och laktat för varje steg', 'enter speed/watts, heart rate, and lactate for each stage')}
              </li>
              <li className="text-xs text-blue-700">
                <strong>{t('VO₂ är valfritt', 'VO₂ is optional')}</strong> - {t('trösklar kan beräknas utan VO₂-mätning', 'thresholds can be calculated without VO₂ measurement')}
              </li>
            </ul>
            <div className="mt-3 pt-2 border-t border-blue-200">
              <p className="font-medium mb-1">{t('Konfidensgrad baseras på:', 'Confidence level is based on:')}</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                <li>{t('Hög konfidens: R² ≥ 0.95 och tröskel 2-4 mmol/L', 'High confidence: R² ≥ 0.95 and threshold 2-4 mmol/L')}</li>
                <li>{t('Medel konfidens: R² ≥ 0.90 eller tröskel 1.5-4.5 mmol/L', 'Medium confidence: R² ≥ 0.90 or threshold 1.5-4.5 mmol/L')}</li>
                <li>{t('Låg konfidens: R² < 0.90 - faller tillbaka på 4.0 mmol/L-metoden', 'Low confidence: R² < 0.90 - falls back to the 4.0 mmol/L method')}</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* Toggle metabolic data fields */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMetabolicData(!showMetabolicData)}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          {t('Metabol data (spirometri)', 'Metabolic data (spirometry)')}
          {showMetabolicData ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>

        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">{t('Steg', 'Stage')} {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {testType === 'RUNNING' ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.speed`} className="text-xs">
                        {t('Hastighet (km/h)', 'Speed (km/h)')}
                      </Label>
                      <Input
                        id={`stages.${index}.speed`}
                        type="number"
                        step="0.1"
                        {...register(`stages.${index}.speed`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.incline`} className="text-xs">
                        {inclineLabel}
                      </Label>
                      <Input
                        id={`stages.${index}.incline`}
                        type="number"
                        step="0.5"
                        {...register(`stages.${index}.incline`, { valueAsNumber: true })}
                      />
                    </div>
                  </>
                ) : testType === 'CYCLING' ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.power`} className="text-xs">
                        {t('Effekt (watt)', 'Power (watts)')}
                      </Label>
                      <Input
                        id={`stages.${index}.power`}
                        type="number"
                        {...register(`stages.${index}.power`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.cadence`} className="text-xs">
                        Kadens (rpm)
                      </Label>
                      <Input
                        id={`stages.${index}.cadence`}
                        type="number"
                        {...register(`stages.${index}.cadence`, { valueAsNumber: true })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.pace`} className="text-xs">
                      Tempo (min/km)
                    </Label>
                    <Input
                      id={`stages.${index}.pace`}
                      type="number"
                      step="0.1"
                      {...register(`stages.${index}.pace`, { valueAsNumber: true })}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.heartRate`} className="text-xs">
                    {t('Puls (slag/min)', 'Heart rate (beats/min)')}
                  </Label>
                  <Input
                    id={`stages.${index}.heartRate`}
                    type="number"
                    {...register(`stages.${index}.heartRate`, { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.lactate`} className="text-xs">
                    Laktat (mmol/L)
                  </Label>
                  <div className="flex gap-1">
                    <Input
                      id={`stages.${index}.lactate`}
                      type="number"
                      step="0.1"
                      className="flex-1"
                      {...register(`stages.${index}.lactate`, { valueAsNumber: true })}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[index] = el }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLactateOCR(index, file)
                        e.target.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-10 w-10"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      disabled={ocrLoading !== null}
                      title={t('Fotografera laktatmätare', 'Photograph lactate meter')}
                    >
                      {ocrLoading === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.vo2`} className="text-xs">
                    VO₂ (ml/kg/min) <span className="text-gray-400 font-normal">{t('(valfritt)', '(optional)')}</span>
                  </Label>
                  <Input
                    id={`stages.${index}.vo2`}
                    type="number"
                    step="0.1"
                    placeholder={t('Valfritt', 'Optional')}
                    {...register(`stages.${index}.vo2`, { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t('Tid (min:sek)', 'Time (min:sec)')}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id={`stages.${index}.durationMinutes`}
                      type="number"
                      min="0"
                      max="60"
                      className="w-16 text-center"
                      placeholder="min"
                      {...register(`stages.${index}.durationMinutes`, { valueAsNumber: true })}
                    />
                    <span className="text-muted-foreground font-medium">:</span>
                    <Input
                      id={`stages.${index}.durationSeconds`}
                      type="number"
                      min="0"
                      max="59"
                      className="w-16 text-center"
                      placeholder={t('sek', 'sec')}
                      {...register(`stages.${index}.durationSeconds`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Metabol data (collapsible) */}
              {showMetabolicData && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-3 pt-3 border-t border-dashed">
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.rer`} className="text-xs">
                      RER
                    </Label>
                    <Input
                      id={`stages.${index}.rer`}
                      type="number"
                      step="0.01"
                      placeholder="0.85"
                      {...register(`stages.${index}.rer`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.ve`} className="text-xs">
                      VE (L/min)
                    </Label>
                    <Input
                      id={`stages.${index}.ve`}
                      type="number"
                      step="0.1"
                      placeholder=""
                      {...register(`stages.${index}.ve`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.vco2`} className="text-xs">
                      VCO₂ (ml/min)
                    </Label>
                    <Input
                      id={`stages.${index}.vco2`}
                      type="number"
                      step="1"
                      placeholder=""
                      {...register(`stages.${index}.vco2`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.fatPercent`} className="text-xs">
                      {t('Fett (%)', 'Fat (%)')}
                    </Label>
                    <Input
                      id={`stages.${index}.fatPercent`}
                      type="number"
                      step="0.1"
                      placeholder=""
                      {...register(`stages.${index}.fatPercent`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.choPercent`} className="text-xs">
                      {t('Kolhydrat (%)', 'Carbohydrate (%)')}
                    </Label>
                    <Input
                      id={`stages.${index}.choPercent`}
                      type="number"
                      step="0.1"
                      placeholder=""
                      {...register(`stages.${index}.choPercent`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.respiratoryRate`} className="text-xs">
                      {t('Andningsfrekvens', 'Respiratory rate')}
                    </Label>
                    <Input
                      id={`stages.${index}.respiratoryRate`}
                      type="number"
                      step="0.1"
                      placeholder=""
                      {...register(`stages.${index}.respiratoryRate`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Lactate decrease warnings */}
        {lactateWarnings.length > 0 && (
          <Alert className="bg-yellow-50 border-yellow-300">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 text-sm">
              <strong>{t('Varning: Sjunkande laktatvärden', 'Warning: Decreasing lactate values')}</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {lactateWarnings.map((w, i) => (
                  <li key={i}>
                    {locale === 'sv'
                      ? `Laktat sjönk med ${w.drop} mmol/L från steg ${w.fromStage} till steg ${w.toStage}. Små variationer kan vara normala, men kontrollera att värdena stämmer.`
                      : `Lactate dropped by ${w.drop} mmol/L from stage ${w.fromStage} to stage ${w.toStage}. Small variations can be normal, but check that the values are correct.`}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Add stage button at bottom right */}
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={addStage}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('Lägg till steg', 'Add stage')}
          </Button>
        </div>
      </div>

      {/* Post-Max Lactate Measurements Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold">{t('Eftermätningar (post-max laktat)', 'Post-test measurements (post-max lactate)')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('Mätningar efter maxbelastning för att fånga topp-laktat', 'Measurements after max load to capture peak lactate')}
            </p>
          </div>
          <Button
            type="button"
            onClick={addPostMeasurement}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('Lägg till mätning', 'Add measurement')}
          </Button>
        </div>

        <div className="grid gap-3">
          {postMeasurementFields.map((field, index) => (
            <Card key={field.id} className="bg-orange-50/50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">{t('Tid efter max:', 'Time after max:')}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        className="w-14 text-center"
                        placeholder="min"
                        {...register(`postTestMeasurements.${index}.timeMinutes`, { valueAsNumber: true })}
                      />
                      <span className="text-muted-foreground font-medium">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        className="w-14 text-center"
                        placeholder={t('sek', 'sec')}
                        {...register(`postTestMeasurements.${index}.timeSeconds`, { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Laktat:</Label>
                    <Input
                      type="number"
                      step="0.1"
                      className="w-20"
                      placeholder="mmol/L"
                      {...register(`postTestMeasurements.${index}.lactate`, { valueAsNumber: true })}
                    />
                  </div>
                  {postMeasurementFields.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removePostMeasurement(index)}
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommended Next Test Date */}
      <div className="space-y-2">
        <Label htmlFor="recommendedNextTestDate" className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          {t('Rekommenderat nästa testdatum', 'Recommended next test date')}
        </Label>
        <Input
          id="recommendedNextTestDate"
          type="date"
          className="max-w-[250px]"
          {...register('recommendedNextTestDate')}
        />
        <p className="text-xs text-gray-500">
          {t('Föreslå ett datum för nästa laktattest (valfritt)', 'Suggest a date for the next lactate test (optional)')}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('Anteckningar', 'Notes')}</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Show validation errors summary */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>{t('Formuläret innehåller fel', 'The form contains errors')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              {errors.testDate && <li>{t('Testdatum', 'Test date')}: {errors.testDate.message}</li>}
              {errors.stages?.message && <li>{t('Teststeg', 'Test stages')}: {errors.stages.message}</li>}
              {errors.stages?.root?.message && <li>{t('Teststeg', 'Test stages')}: {errors.stages.root.message}</li>}
              {Array.isArray(errors.stages) && errors.stages.map((stageError, idx) =>
                stageError && (
                  <li key={idx}>
                    {t('Steg', 'Stage')} {idx + 1}: {Object.entries(stageError).map(([field, err]) =>
                      `${field === 'heartRate' ? t('Puls', 'Heart rate') : field === 'lactate' ? t('Laktat', 'Lactate') : field === 'speed' ? t('Hastighet', 'Speed') : field === 'power' ? t('Effekt', 'Power') : field === 'duration' ? t('Tid', 'Time') : field}: ${(err as { message?: string })?.message || t('ogiltigt värde', 'invalid value')}`
                    ).join(', ')}
                  </li>
                )
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
      >
        {t('Generera Rapport', 'Generate Report')}
      </Button>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Spara testmall', 'Save test template')}</DialogTitle>
            <DialogDescription>
              {t('Spara de nuvarande teststegen som en mall för framtida tester', 'Save the current test stages as a template for future tests')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">{t('Namn', 'Name')}</Label>
              <Input
                id="template-name"
                placeholder={t('T.ex. Lag Cykelmall 2025', 'e.g. Team cycling template 2025')}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">{t('Beskrivning (valfritt)', 'Description (optional)')}</Label>
              <textarea
                id="template-description"
                placeholder={t('Beskriv denna mall...', 'Describe this template...')}
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t('Avbryt', 'Cancel')}
            </Button>
            <Button onClick={handleSaveTemplate}>{t('Spara mall', 'Save template')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart Import Dialog */}
      <SmartTestImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        testType={testType}
        clientId={clientId}
        onImport={handleSmartImport}
      />

      {/* Load Template Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Ladda testmall', 'Load test template')}</DialogTitle>
            <DialogDescription>
              {t('Välj en sparad mall för att ladda teststeg', 'Select a saved template to load test stages')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('Inga mallar sparade för', 'No templates saved for')} {testType === 'RUNNING' ? t('löpning', 'running') : testType === 'CYCLING' ? t('cykling', 'cycling') : t('skidåkning', 'skiing')}
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:bg-accent" onClick={() => handleLoadTemplate(template)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {template.stages.length} {t('steg', 'stages')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              {t('Stäng', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
