'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Mic, MicOff, Loader2, Check, AlertCircle, Sparkles } from 'lucide-react'
import { MealType } from '@prisma/client'
import { cn } from '@/lib/utils'
import { guessDefaultMealType } from '@/lib/nutrition/guess-meal-type'
import { useTranslations } from '@/i18n/client'

interface VoiceMealCaptureProps {
  onMealSaved?: () => void
  onClose?: () => void
}

type Step = 'RECORD' | 'TRANSCRIBING' | 'ANALYZING' | 'REVIEW' | 'SAVING' | 'DONE'

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'mealTypes.breakfast',
  MORNING_SNACK: 'mealTypes.morningSnack',
  LUNCH: 'mealTypes.lunch',
  AFTERNOON_SNACK: 'mealTypes.afternoonSnack',
  PRE_WORKOUT: 'mealTypes.preWorkout',
  POST_WORKOUT: 'mealTypes.postWorkout',
  DINNER: 'mealTypes.dinner',
  EVENING_SNACK: 'mealTypes.eveningSnack',
}

export function VoiceMealCapture({ onMealSaved, onClose }: VoiceMealCaptureProps) {
  const t = useTranslations('components.voiceMealCapture')
  const [step, setStep] = useState<Step>('RECORD')
  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [mealType, setMealType] = useState<MealType>(guessDefaultMealType())
  const [error, setError] = useState<string | null>(null)
  const [macros, setMacros] = useState<{
    calories?: number
    proteinGrams?: number
    carbsGrams?: number
    fatGrams?: number
    fiberGrams?: number
    saturatedFatGrams?: number
    monounsaturatedFatGrams?: number
    polyunsaturatedFatGrams?: number
    sugarGrams?: number
    complexCarbsGrams?: number
    isCompleteProtein?: boolean
  }>({})
  const [enhancedMode, setEnhancedMode] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const transcribeAudio = useCallback(async (blob: Blob, mimeType: string) => {
    try {
      const formData = new FormData()
      const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'mp4'
      formData.append('audio', blob, `meal-recording.${ext}`)

      const res = await fetch('/api/ai/food-scan/transcribe-audio', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errors.transcribe'))
      }

      const data = await res.json()
      const text = data.transcription || data.text || ''
      setTranscribedText(text)

      // Auto-analyze with AI
      if (text.trim()) {
        setStep('ANALYZING')
        try {
          const analyzeRes = await fetch('/api/ai/food-scan/analyze-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: text, clientHour: new Date().getHours() }),
          })
          if (analyzeRes.ok) {
            const analyzeData = await analyzeRes.json()
            const result = analyzeData.result
            if (result?.totals) {
              setMacros({
                calories: Math.round(result.totals.calories),
                proteinGrams: result.totals.proteinGrams,
                carbsGrams: result.totals.carbsGrams,
                fatGrams: result.totals.fatGrams,
                fiberGrams: result.totals.fiberGrams,
                ...(analyzeData.enhancedMode && result.totals.saturatedFatGrams != null ? {
                  saturatedFatGrams: result.totals.saturatedFatGrams,
                  monounsaturatedFatGrams: result.totals.monounsaturatedFatGrams,
                  polyunsaturatedFatGrams: result.totals.polyunsaturatedFatGrams,
                  sugarGrams: result.totals.sugarGrams,
                  complexCarbsGrams: result.totals.complexCarbsGrams,
                } : {}),
              })
              setEnhancedMode(analyzeData.enhancedMode ?? false)
            }
            if (result?.suggestedMealType) {
              setMealType(result.suggestedMealType as MealType)
            }
          }
        } catch {
          // AI analysis is best-effort, continue to review even if it fails
        }
      }

      setStep('REVIEW')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.transcribe'))
      setStep('RECORD')
    }
  }, [t])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferredTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav']
      const supportedType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t))
      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined)

      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        await transcribeAudio(blob, mediaRecorder.mimeType)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      setError(t('errors.microphoneStart'))
    }
  }, [t, transcribeAudio])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setStep('TRANSCRIBING')
    }
  }, [])

  const handleSave = async () => {
    if (!transcribedText.trim()) return
    setStep('SAVING')
    setError(null)

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          mealType,
          description: transcribedText.trim(),
          mergeRecent: true,
          ...(macros.calories != null ? {
            calories: macros.calories,
            proteinGrams: macros.proteinGrams,
            carbsGrams: macros.carbsGrams,
            fatGrams: macros.fatGrams,
            fiberGrams: macros.fiberGrams,
            saturatedFatGrams: macros.saturatedFatGrams,
            monounsaturatedFatGrams: macros.monounsaturatedFatGrams,
            polyunsaturatedFatGrams: macros.polyunsaturatedFatGrams,
            sugarGrams: macros.sugarGrams,
            complexCarbsGrams: macros.complexCarbsGrams,
            isCompleteProtein: macros.isCompleteProtein,
          } : {}),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errors.saveMeal'))
      }

      setStep('DONE')
      onMealSaved?.()
      setTimeout(() => onClose?.(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveMeal'))
      setStep('REVIEW')
    }
  }

  if (step === 'DONE') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <p className="text-lg font-semibold">{t('done.title')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {step === 'RECORD' && (
        <div className="flex flex-col items-center gap-6 py-8">
          <p className="text-sm text-muted-foreground text-center">
            {t('record.description')}
          </p>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center transition-all',
              isRecording
                ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30'
                : 'bg-purple-500/10 hover:bg-purple-500/20 border-2 border-purple-500/30'
            )}
          >
            {isRecording ? (
              <MicOff className="h-10 w-10 text-white" />
            ) : (
              <Mic className="h-10 w-10 text-purple-500" />
            )}
          </button>
          <p className="text-sm text-muted-foreground">
            {isRecording ? t('record.stop') : t('record.start')}
          </p>
        </div>
      )}

      {step === 'TRANSCRIBING' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm text-muted-foreground">{t('transcribing')}</p>
        </div>
      )}

      {step === 'ANALYZING' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Sparkles className="h-8 w-8 text-cyan-500 animate-pulse" />
          <p className="text-sm text-muted-foreground">{t('analyzing')}</p>
        </div>
      )}

      {step === 'REVIEW' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('review.mealType')}</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEAL_TYPE_LABELS).map(([value, labelKey]) => (
                  <SelectItem key={value} value={value}>
                    {t(labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('review.description')}</Label>
            <Textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              rows={3}
              placeholder={t('review.descriptionPlaceholder')}
            />
          </div>

          {/* Estimated macros */}
          {macros.calories != null && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {t('review.estimatedMacros')}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('macros.calories')}</label>
                  <Input
                    type="number"
                    value={macros.calories ?? ''}
                    onChange={(e) => setMacros(prev => ({ ...prev, calories: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('macros.proteinGrams')}</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={macros.proteinGrams?.toFixed(1) ?? ''}
                    onChange={(e) => setMacros(prev => ({ ...prev, proteinGrams: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('macros.carbsGrams')}</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={macros.carbsGrams?.toFixed(1) ?? ''}
                    onChange={(e) => setMacros(prev => ({ ...prev, carbsGrams: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('macros.fatGrams')}</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={macros.fatGrams?.toFixed(1) ?? ''}
                    onChange={(e) => setMacros(prev => ({ ...prev, fatGrams: Number(e.target.value) }))}
                  />
                </div>
              </div>
              {enhancedMode && (
                <div className="p-2 rounded bg-muted text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">{t('review.enhancedMode')}</p>
                  <p>
                    <span className="font-medium">{t('macros.fat')}:</span>{' '}
                    {macros.saturatedFatGrams != null || macros.monounsaturatedFatGrams != null || macros.polyunsaturatedFatGrams != null
                      ? t('review.fatBreakdown', {
                        saturated: macros.saturatedFatGrams?.toFixed(1) ?? '0.0',
                        mono: macros.monounsaturatedFatGrams?.toFixed(1) ?? '0.0',
                        poly: macros.polyunsaturatedFatGrams?.toFixed(1) ?? '0.0',
                      })
                      : t('review.noFatBreakdown')}
                  </p>
                  <p>
                    <span className="font-medium">{t('macros.carbs')}:</span>{' '}
                    {macros.sugarGrams != null || macros.complexCarbsGrams != null
                      ? t('review.carbBreakdown', {
                        sugar: macros.sugarGrams?.toFixed(1) ?? '0.0',
                        complex: macros.complexCarbsGrams?.toFixed(1) ?? '0.0',
                      })
                      : t('review.noCarbBreakdown')}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setTranscribedText('')
                setStep('RECORD')
              }}
            >
              {t('actions.recordAgain')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!transcribedText.trim()}
            >
              {t('actions.saveMeal')}
            </Button>
          </div>
        </div>
      )}

      {step === 'SAVING' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">{t('saving')}</p>
        </div>
      )}
    </div>
  )
}
