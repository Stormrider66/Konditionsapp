'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useTranslations } from '@/i18n/client'
import {
  detectManualThresholdChange,
  manualThresholdSnapshot,
  type ManualThresholdSnapshot,
  type ThresholdDecisionReasonCategory,
} from '@/lib/coach/manual-threshold-decision'

interface StageData {
  duration: number
  heartRate: number
  lactate: number
  vo2?: number | null
  speed?: number | null
  incline?: number | null
  power?: number | null
  cadence?: number | null
  pace?: number | null
}

interface EditTestFormData {
  testDate: string
  notes?: string
  restingLactate?: number | null
  restingHeartRate?: number | null
  manualLT1Lactate?: number | null
  manualLT1Intensity?: number | null
  manualLT2Lactate?: number | null
  manualLT2Intensity?: number | null
  thresholdDecisionReasonCategory: ThresholdDecisionReasonCategory
  thresholdDecisionReason?: string
  stages: StageData[]
}

export default function EditTestPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('coach.pages.editTest')
  const testId = params.testId as string
  const businessSlug = params.businessSlug as string | undefined
  const basePath = businessSlug ? `/${businessSlug}` : ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testType, setTestType] = useState<string>('RUNNING')
  const [clientName, setClientName] = useState('')
  const [originalManualThresholds, setOriginalManualThresholds] = useState<ManualThresholdSnapshot | null>(null)

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EditTestFormData>({
    defaultValues: {
      thresholdDecisionReasonCategory: 'COACH_INTUITION',
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'stages' })
  const watchedManualThresholds = {
    manualLT1Lactate: watch('manualLT1Lactate'),
    manualLT1Intensity: watch('manualLT1Intensity'),
    manualLT2Lactate: watch('manualLT2Lactate'),
    manualLT2Intensity: watch('manualLT2Intensity'),
  }
  const thresholdReasonCategory = watch('thresholdDecisionReasonCategory') ?? 'COACH_INTUITION'
  const manualThresholdChange = originalManualThresholds
    ? detectManualThresholdChange(originalManualThresholds, manualThresholdSnapshot(watchedManualThresholds))
    : null

  const thresholdReasonOptions: Array<{ value: ThresholdDecisionReasonCategory; label: string }> = [
    { value: 'COACH_INTUITION', label: t('thresholdReasons.coachIntuition') },
    { value: 'ATHLETE_FEEDBACK', label: t('thresholdReasons.athleteFeedback') },
    { value: 'FATIGUE_OBSERVED', label: t('thresholdReasons.fatigueObserved') },
    { value: 'INJURY_CONCERN', label: t('thresholdReasons.injuryConcern') },
    { value: 'PROGRESSION_ADJUSTMENT', label: t('thresholdReasons.progressionAdjustment') },
    { value: 'ATHLETE_PREFERENCE', label: t('thresholdReasons.athletePreference') },
    { value: 'OTHER', label: t('thresholdReasons.other') },
  ]

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(`/api/tests/${testId}`)
        const result = await response.json()

        if (!result.success) {
          toast({ title: t('toasts.errorTitle'), description: t('toasts.fetchFailed'), variant: 'destructive' })
          return
        }

        const test = result.data
        setTestType(test.testType)
        setClientName(test.client?.name || '')
        const manualThresholds = manualThresholdSnapshot({
          manualLT1Lactate: test.manualLT1Lactate,
          manualLT1Intensity: test.manualLT1Intensity,
          manualLT2Lactate: test.manualLT2Lactate,
          manualLT2Intensity: test.manualLT2Intensity,
        })
        setOriginalManualThresholds(manualThresholds)

        reset({
          testDate: new Date(test.testDate).toISOString().split('T')[0],
          notes: test.notes || '',
          restingLactate: test.restingLactate,
          restingHeartRate: test.restingHeartRate,
          manualLT1Lactate: manualThresholds.manualLT1Lactate,
          manualLT1Intensity: manualThresholds.manualLT1Intensity,
          manualLT2Lactate: manualThresholds.manualLT2Lactate,
          manualLT2Intensity: manualThresholds.manualLT2Intensity,
          thresholdDecisionReasonCategory: 'COACH_INTUITION',
          thresholdDecisionReason: '',
          stages: test.testStages.map((s: any) => ({
            duration: s.duration,
            heartRate: s.heartRate,
            lactate: s.lactate,
            vo2: s.vo2,
            speed: s.speed,
            incline: s.incline,
            power: s.power,
            cadence: s.cadence,
            pace: s.pace,
          })),
        })
      } catch {
        toast({ title: t('toasts.errorTitle'), description: t('toasts.fetchFailed'), variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    fetchTest()
  }, [testId, reset, toast])

  const onSubmit = async (data: EditTestFormData) => {
    setSaving(true)
    try {
      const nextManualThresholds = manualThresholdSnapshot(data)
      const thresholdChange = originalManualThresholds
        ? detectManualThresholdChange(originalManualThresholds, nextManualThresholds)
        : null
      const thresholdReason = data.thresholdDecisionReason?.trim()

      if (thresholdChange && !thresholdReason) {
        toast({
          title: t('toasts.errorTitle'),
          description: t('toasts.thresholdReasonRequired'),
          variant: 'destructive',
        })
        return
      }

      const response = await fetch(`/api/tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testDate: data.testDate,
          notes: data.notes,
          restingLactate: data.restingLactate ? Number(data.restingLactate) : null,
          restingHeartRate: data.restingHeartRate ? Number(data.restingHeartRate) : null,
          manualLT1Lactate: nextManualThresholds.manualLT1Lactate,
          manualLT1Intensity: nextManualThresholds.manualLT1Intensity,
          manualLT2Lactate: nextManualThresholds.manualLT2Lactate,
          manualLT2Intensity: nextManualThresholds.manualLT2Intensity,
          thresholdDecisionReasonCategory: data.thresholdDecisionReasonCategory,
          thresholdDecisionReason: thresholdReason,
          stages: data.stages.map((s) => ({
            duration: Number(s.duration),
            heartRate: Number(s.heartRate),
            lactate: Number(s.lactate),
            vo2: s.vo2 ? Number(s.vo2) : null,
            speed: s.speed ? Number(s.speed) : null,
            incline: s.incline ? Number(s.incline) : null,
            power: s.power ? Number(s.power) : null,
            cadence: s.cadence ? Number(s.cadence) : null,
            pace: s.pace ? Number(s.pace) : null,
          })),
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || t('toasts.updateFailed'))
      }

      toast({ title: t('toasts.updatedTitle'), description: t('toasts.updatedDescription') })
      router.push(`${basePath}/coach/tests/${testId}`)
    } catch (error) {
      toast({
        title: t('toasts.errorTitle'),
        description: error instanceof Error ? error.message : t('toasts.saveFailed'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const intensityLabel = testType === 'RUNNING' ? t('labels.intensity.running') :
    testType === 'CYCLING' ? t('labels.intensity.cycling') : t('labels.intensity.skiing')
  const intensityField = testType === 'RUNNING' ? 'speed' :
    testType === 'CYCLING' ? 'power' : 'pace'
  const testTypeLabel =
    testType === 'RUNNING' ? t('labels.testTypes.running') :
      testType === 'CYCLING' ? t('labels.testTypes.cycling') :
        t('labels.testTypes.skiing')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`${basePath}/coach/tests/${testId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('actions.back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          {clientName && <p className="text-sm text-muted-foreground">{clientName}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Test metadata */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.metadata')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('labels.testDate')}</Label>
                <Input type="date" {...register('testDate')} />
              </div>
              <div className="space-y-2">
                <Label>{t('labels.testType')}</Label>
                <Input value={testTypeLabel} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('labels.restingLactate')}</Label>
                <Input type="number" step="0.1" {...register('restingLactate')} />
              </div>
              <div className="space-y-2">
                <Label>{t('labels.restingHeartRate')}</Label>
                <Input type="number" {...register('restingHeartRate')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('labels.notes')}</Label>
              <Input {...register('notes')} placeholder={t('placeholders.notes')} />
            </div>
          </CardContent>
        </Card>

        {/* Test stages */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.stages')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left">{t('table.headers.step')}</th>
                    <th className="px-2 py-2 text-left">{t('table.headers.duration')}</th>
                    <th className="px-2 py-2 text-left">{t('table.headers.heartRate')}</th>
                    <th className="px-2 py-2 text-left">{t('table.headers.lactate')}</th>
                    <th className="px-2 py-2 text-left">{t('table.headers.vo2')}</th>
                    <th className="px-2 py-2 text-left">{intensityLabel}</th>
                    {testType === 'RUNNING' && <th className="px-2 py-2 text-left">{t('table.headers.incline')}</th>}
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-b">
                      <td className="px-2 py-2 font-medium">{index + 1}</td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20"
                          {...register(`stages.${index}.duration`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          className="w-20"
                          {...register(`stages.${index}.heartRate`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20"
                          {...register(`stages.${index}.lactate`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20"
                          placeholder="-"
                          {...register(`stages.${index}.vo2`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20"
                          {...register(`stages.${index}.${intensityField}` as any, { valueAsNumber: true })}
                        />
                      </td>
                      {testType === 'RUNNING' && (
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.1"
                            className="w-20"
                            placeholder="0"
                            {...register(`stages.${index}.incline`, { valueAsNumber: true })}
                          />
                        </td>
                      )}
                      <td className="px-2 py-2">
                        {fields.length > 3 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() =>
                append({
                  duration: 4,
                  heartRate: 0,
                  lactate: 0,
                  vo2: null,
                  speed: testType === 'RUNNING' ? 0 : null,
                  power: testType === 'CYCLING' ? 0 : null,
                  pace: testType === 'SKIING' ? 0 : null,
                  incline: null,
                  cadence: null,
                })
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('actions.addStage')}
            </Button>
          </CardContent>
        </Card>

        {/* Manual thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.manualThresholds')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('labels.manualLT1Lactate')}</Label>
                <Input type="number" step="0.1" placeholder="-" {...register('manualLT1Lactate', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>{t('labels.manualLT1Intensity')}</Label>
                <Input type="number" step="0.1" placeholder="-" {...register('manualLT1Intensity', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>{t('labels.manualLT2Lactate')}</Label>
                <Input type="number" step="0.1" placeholder="-" {...register('manualLT2Lactate', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>{t('labels.manualLT2Intensity')}</Label>
                <Input type="number" step="0.1" placeholder="-" {...register('manualLT2Intensity', { valueAsNumber: true })} />
              </div>
            </div>

            {manualThresholdChange && (
              <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('labels.thresholdReasonCategory')}</Label>
                  <Select
                    value={thresholdReasonCategory}
                    onValueChange={(value) =>
                      setValue('thresholdDecisionReasonCategory', value as ThresholdDecisionReasonCategory, {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {thresholdReasonOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('labels.thresholdDecisionReason')}</Label>
                  <Textarea
                    rows={3}
                    placeholder={t('placeholders.thresholdDecisionReason')}
                    {...register('thresholdDecisionReason')}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="min-w-[140px]">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('actions.saving')}</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />{t('actions.save')}</>
            )}
          </Button>
          <Link href={`${basePath}/coach/tests/${testId}`}>
            <Button type="button" variant="outline">{t('actions.cancel')}</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
