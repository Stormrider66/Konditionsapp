'use client'

/**
 * Food Photo Scanner Component
 *
 * Multi-step flow for photographing food and getting AI-estimated
 * calories and macros, then saving as a MealLog.
 *
 * Steps: CAPTURE → ANALYZING → REVIEW → SAVING → DONE
 */

import React, { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import {
  Camera,
  Upload,
  X,
  Loader2,
  Check,
  Trash2,
  RotateCw,
  AlertCircle,
  Mic,
  MicOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { FoodPhotoAnalysisResult } from '@/lib/validations/gemini-schemas'
import {
  calculateFoodTotals,
  createEditableFoodItem,
  recalculateItemFromGrams,
  updateDensityFromManualValue,
  type EditableFoodItem,
  type NutrientDensity,
} from '@/lib/nutrition/food-scan-recalculation'
import { guessDefaultMealType } from '@/lib/nutrition/guess-meal-type'

type Step = 'CAPTURE' | 'ANALYZING' | 'REVIEW' | 'SAVING' | 'DONE'

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'Frukost',
  MORNING_SNACK: 'Förmiddagsmellanmål',
  LUNCH: 'Lunch',
  AFTERNOON_SNACK: 'Eftermiddagsmellanmål',
  PRE_WORKOUT: 'Före träning',
  POST_WORKOUT: 'Efter träning',
  DINNER: 'Middag',
  EVENING_SNACK: 'Kvällsmellanmål',
}

interface FoodPhotoScannerProps {
  onMealSaved?: (meal: unknown) => void
  onClose?: () => void
  defaultMealType?: string
  defaultDate?: string
  redirectPathOnSave?: string
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Kunde inte läsa bildfilen'))
    }
    reader.onerror = () => reject(new Error('Kunde inte läsa bildfilen'))
    reader.readAsDataURL(file)
  })

export function FoodPhotoScanner({
  onMealSaved,
  onClose,
  defaultMealType,
  defaultDate,
  redirectPathOnSave,
}: FoodPhotoScannerProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('CAPTURE')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Review state
  const [items, setItems] = useState<EditableFoodItem[]>([])
  const [mealType, setMealType] = useState(defaultMealType || guessDefaultMealType())
  const [mealTime, setMealTime] = useState(
    new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  )
  const [mealDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [mealDescription, setMealDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [enhancedMode, setEnhancedMode] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  // Refinement state
  const [refinementText, setRefinementText] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Vänligen välj en bildfil')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Bilden får inte vara större än 10MB')
      return
    }

    setError(null)

    // Convert to JPEG via canvas to normalize format across all devices
    // (some Android phones send image/jpg, HEIC, or other non-standard types)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const jpegFile = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
                  setImageFile(jpegFile)
                  setImagePreview(URL.createObjectURL(blob))
                } else {
                  // Fallback: use original file
                  setImageFile(file)
                  setImagePreview(dataUrl)
                }
              },
              'image/jpeg',
              0.92
            )
          } else {
            setImageFile(file)
            setImagePreview(dataUrl)
          }
        } catch {
          setImageFile(file)
          setImagePreview(dataUrl)
        }
      }
      img.onerror = () => {
        // Fallback: use original file if canvas conversion fails
        setImageFile(file)
        setImagePreview(dataUrl)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [])

  const handleAnalyze = async () => {
    if (!imageFile) return

    setStep('ANALYZING')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', imageFile)

      const response = await fetch('/api/ai/food-scan', {
        method: 'POST',
        body: formData,
      })

      if (response.status === 429) {
        setError('För många förfrågningar. Försök igen om en stund.')
        setStep('CAPTURE')
        return
      }

      if (response.status === 401) {
        setError('Du behöver aktivera atletläge för att skanna mat. Gå till inställningar och aktivera atletläge.')
        setStep('CAPTURE')
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error || 'Kunde inte analysera bilden. Försök igen.')
        setStep('CAPTURE')
        return
      }

      const data = await response.json()
      const result: FoodPhotoAnalysisResult = data.result

      if (!result.success) {
        setError('Kunde inte identifiera mat. Försök ta en ny bild.')
        setStep('CAPTURE')
        return
      }

      // Populate review state
      setEnhancedMode(data.enhancedMode ?? false)
      setItems(result.items.map(createEditableFoodItem))
      setMealDescription(result.mealDescription)
      setConfidence(result.confidence)
      if (result.suggestedMealType && !defaultMealType) {
        setMealType(result.suggestedMealType)
      }
      if (result.notes?.length) {
        setNotes(result.notes.join('\n'))
      }

      setStep('REVIEW')
    } catch {
      setError('Ett nätverksfel uppstod. Kontrollera din anslutning och försök igen.')
      setStep('CAPTURE')
    }
  }

  const handleSave = async () => {
    if (items.length === 0) return

    setStep('SAVING')
    setError(null)

    const totals = calculateFoodTotals(items)

    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: mealDate,
          mealType: mealType || 'LUNCH',
          time: mealTime,
          description: mealDescription || items.map((i) => i.name).join(', '),
          calories: Math.round(totals.calories),
          proteinGrams: Math.round(totals.proteinGrams * 10) / 10,
          carbsGrams: Math.round(totals.carbsGrams * 10) / 10,
          fatGrams: Math.round(totals.fatGrams * 10) / 10,
          fiberGrams: Math.round(totals.fiberGrams * 10) / 10,
          ...(enhancedMode && totals.saturatedFatGrams != null ? {
            saturatedFatGrams: Math.round(totals.saturatedFatGrams * 10) / 10,
            monounsaturatedFatGrams: Math.round((totals.monounsaturatedFatGrams ?? 0) * 10) / 10,
            polyunsaturatedFatGrams: Math.round((totals.polyunsaturatedFatGrams ?? 0) * 10) / 10,
            sugarGrams: Math.round((totals.sugarGrams ?? 0) * 10) / 10,
            complexCarbsGrams: Math.round((totals.complexCarbsGrams ?? 0) * 10) / 10,
          } : {}),
          notes: notes || undefined,
          items: items.map((item) => ({
            name: item.name,
            category: item.category,
            estimatedGrams: item.estimatedGrams,
            portionDescription: item.portionDescription,
            calories: item.calories,
            proteinGrams: item.proteinGrams,
            carbsGrams: item.carbsGrams,
            fatGrams: item.fatGrams,
            fiberGrams: item.fiberGrams,
            ...(enhancedMode && item.saturatedFatGrams != null ? {
              saturatedFatGrams: item.saturatedFatGrams,
              monounsaturatedFatGrams: item.monounsaturatedFatGrams,
              polyunsaturatedFatGrams: item.polyunsaturatedFatGrams,
              sugarGrams: item.sugarGrams,
              complexCarbsGrams: item.complexCarbsGrams,
              isCompleteProtein: item.isCompleteProtein,
            } : {}),
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte spara måltiden')
      }

      const data = await response.json()
      onMealSaved?.(data.data)

      if (redirectPathOnSave) {
        onClose?.()
        router.push(redirectPathOnSave)
        return
      }

      setStep('DONE')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara måltiden')
      setStep('REVIEW')
    }
  }

  const handleReset = () => {
    setStep('CAPTURE')
    setImagePreview(null)
    setImageFile(null)
    setItems([])
    setError(null)
    setMealDescription('')
    setNotes('')
    setConfidence(0)
    setEnhancedMode(false)
    setExpandedItems(new Set())
    setRefinementText('')
    setIsRefining(false)
    setIsRecording(false)
    setIsTranscribing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleRefine = async () => {
    if (!refinementText.trim()) return

    setIsRefining(true)
    setError(null)

    try {
      // Build original analysis from current items state
      const originalAnalysis = {
        success: true,
        items,
        totals: calculateFoodTotals(items),
        mealDescription,
        confidence,
        notes: notes ? notes.split('\n') : [],
      }

      // Re-read the uploaded file instead of using the preview URL.
      // The preview is usually a blob: URL after canvas normalization.
      let imageBase64: string | undefined
      let imageMimeType: string | undefined
      if (imageFile) {
        try {
          const dataUrl = await readFileAsDataUrl(imageFile)
          const base64Part = dataUrl.split(',')[1]
          if (base64Part) {
            imageBase64 = base64Part
            imageMimeType = imageFile.type
          }
        } catch {
          // Fall back to text-only refine if the image cannot be re-read.
        }
      }

      const response = await fetch('/api/ai/food-scan/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalAnalysis,
          refinementText: refinementText.trim(),
          imageBase64,
          imageMimeType,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte uppdatera analysen')
      }

      const data = await response.json()
      const result: FoodPhotoAnalysisResult = data.result

      if (!result.success) {
        setError('Kunde inte uppdatera analysen utifrån korrigeringen. Försök beskriva ändringen mer exakt.')
        return
      }

      if (data.enhancedMode != null) setEnhancedMode(data.enhancedMode)
      setItems(result.items.map(createEditableFoodItem))
      setMealDescription(result.mealDescription)
      setConfidence(result.confidence)
      setNotes(result.notes?.join('\n') ?? '')
      setRefinementText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte uppdatera analysen')
    } finally {
      setIsRefining(false)
    }
  }

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferredTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav']
      const supportedType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t))
      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      setError('Kunde inte starta mikrofonen. Kontrollera behörigheter.')
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      const mimeType = audioBlob.type || 'audio/webm'
      const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'mp4'
      formData.append('audio', audioBlob, `recording.${ext}`)

      const response = await fetch('/api/ai/food-scan/transcribe-audio', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte transkribera')
      }

      const data = await response.json()
      if (data.text) {
        setRefinementText((prev) => (prev ? `${prev} ${data.text}` : data.text))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte transkribera ljudet')
    } finally {
      setIsTranscribing(false)
    }
  }

  const updateItemText = (index: number, field: 'name' | 'portionDescription', value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const updateItemNumber = (
    index: number,
    field: 'estimatedGrams' | 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams' | 'fiberGrams',
    value: number
  ) => {
    const nextValue = Number.isFinite(value) ? Math.max(0, value) : 0

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item

        if (field === 'estimatedGrams') {
          return recalculateItemFromGrams(item, nextValue)
        }

        const densityField = field as keyof NutrientDensity
        return {
          ...updateDensityFromManualValue(item, densityField, nextValue),
          [field]: nextValue,
        }
      })
    )
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totals = calculateFoodTotals(items)
  const hasEnhancedTotals =
    totals.saturatedFatGrams != null ||
    totals.monounsaturatedFatGrams != null ||
    totals.polyunsaturatedFatGrams != null ||
    totals.sugarGrams != null ||
    totals.complexCarbsGrams != null

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* CAPTURE step */}
      {step === 'CAPTURE' && (
        <>
          {imagePreview ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Förhandsgranskning"
                  className="w-full h-auto max-h-64 object-contain bg-black/20"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleAnalyze}
              >
                <Loader2 className="h-4 w-4 hidden" />
                Analysera måltid
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-28 flex-col gap-2 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-7 w-7" />
                  <span className="text-sm">Kamera</span>
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <Button
                  variant="outline"
                  className="h-28 flex-col gap-2 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-7 w-7" />
                  <span className="text-sm">Välj bild</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Ta en bild av din måltid för att automatiskt uppskatta kalorier och makros
              </p>
            </div>
          )}
        </>
      )}

      {/* ANALYZING step */}
      {step === 'ANALYZING' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          {imagePreview && (
            <div className="rounded-lg overflow-hidden border border-white/10 w-full max-h-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Analyserar"
                className="w-full h-auto max-h-40 object-contain bg-black/20"
              />
            </div>
          )}
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-300">Analyserar din måltid...</p>
        </div>
      )}

      {/* REVIEW step */}
      {step === 'REVIEW' && (
        <div className="space-y-4">
          {/* Compact photo preview */}
          {imagePreview && (
            <div className="rounded-lg overflow-hidden border border-white/10 max-h-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Måltid"
                className="w-full h-auto max-h-32 object-contain bg-black/20"
              />
            </div>
          )}

          {/* Confidence indicator */}
          {(confidence > 0 || enhancedMode) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {confidence > 0 && (
                <>
              <div className={`h-2 w-2 rounded-full ${confidence >= 0.7 ? 'bg-green-400' : confidence >= 0.4 ? 'bg-yellow-400' : 'bg-red-400'}`} />
              <span className="text-slate-400">
                Konfidensgrad: {Math.round(confidence * 100)}%
              </span>
                </>
              )}
              {enhancedMode && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-300">
                  Detaljerad makroanalys aktiv
                </span>
              )}
            </div>
          )}

          {/* Inline refinement */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Korrigera eller lägg till</label>
            <div className="flex gap-2">
              <Textarea
                value={refinementText}
                onChange={(e) => setRefinementText(e.target.value)}
                placeholder="T.ex. &quot;det finns också smör på brödet&quot; eller &quot;portionen var större&quot;"
                className="bg-white/5 border-white/10 text-white text-sm min-h-[44px] max-h-[80px] flex-1"
                disabled={isRefining || isTranscribing}
              />
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-[21px] w-10 ${isRecording ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isRefining || isTranscribing}
                  title={isRecording ? 'Stoppa inspelning' : 'Spela in röstkorrigering'}
                >
                  {isTranscribing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-[21px] w-10 bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                  onClick={handleRefine}
                  disabled={!refinementText.trim() || isRefining}
                  title="Uppdatera analys"
                >
                  {isRefining ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            {refinementText.trim() && (
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={handleRefine}
                disabled={isRefining || isTranscribing}
              >
                {isRefining && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Uppdatera analys
              </Button>
            )}
          </div>

          {/* Meal type and time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Måltidstyp</label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Tid</label>
              <Input
                type="time"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          {/* Food items list */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">
              Identifierade livsmedel ({items.length})
            </label>
            {items.map((item, index) => (
              <GlassCard key={index}>
                <GlassCardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItemText(index, 'name', e.target.value)}
                          className="h-7 text-sm bg-white/5 border-white/10 text-white font-medium"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500">Portion</label>
                          <Input
                            value={item.portionDescription}
                            onChange={(e) => updateItemText(index, 'portionDescription', e.target.value)}
                            className="h-7 text-xs bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500">Gram</label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={item.estimatedGrams}
                            onChange={(e) => updateItemNumber(index, 'estimatedGrams', Number(e.target.value))}
                            className="h-7 text-xs bg-white/5 border-white/10 text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500">kcal</label>
                          <Input
                            type="number"
                            value={item.calories}
                            onChange={(e) => updateItemNumber(index, 'calories', Number(e.target.value))}
                            className="h-7 text-xs bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500">Protein</label>
                          <Input
                            type="number"
                            value={item.proteinGrams}
                            onChange={(e) => updateItemNumber(index, 'proteinGrams', Number(e.target.value))}
                            className="h-7 text-xs bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500">Kolhydr.</label>
                          <Input
                            type="number"
                            value={item.carbsGrams}
                            onChange={(e) => updateItemNumber(index, 'carbsGrams', Number(e.target.value))}
                            className="h-7 text-xs bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500">Fett</label>
                          <Input
                            type="number"
                            value={item.fatGrams}
                            onChange={(e) => updateItemNumber(index, 'fatGrams', Number(e.target.value))}
                            className="h-7 text-xs bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-500">Fiber</label>
                          <Input
                            type="number"
                            value={item.fiberGrams}
                            onChange={(e) => updateItemNumber(index, 'fiberGrams', Number(e.target.value))}
                            className="h-7 text-xs bg-white/5 border-white/10 text-white"
                          />
                        </div>
                      </div>
                      {/* Enhanced macro subcategories */}
                      {enhancedMode && (
                        <>
                          <button
                            type="button"
                            className="flex items-center gap-1 mt-2 text-[10px] text-cyan-400 hover:text-cyan-300"
                            onClick={() => setExpandedItems(prev => {
                              const next = new Set(prev)
                              if (next.has(index)) next.delete(index)
                              else next.add(index)
                              return next
                            })}
                          >
                            {expandedItems.has(index) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            Detaljerad analys
                          </button>
                          {expandedItems.has(index) && (
                            <div className="mt-1.5 p-2 rounded bg-white/5 space-y-1.5">
                              <div className="text-[10px] text-slate-400">
                                <span className="font-medium">Fett:</span>{' '}
                                {item.saturatedFatGrams != null || item.monounsaturatedFatGrams != null || item.polyunsaturatedFatGrams != null
                                  ? `${item.saturatedFatGrams?.toFixed(1) ?? '0.0'}g mättat, ${item.monounsaturatedFatGrams?.toFixed(1) ?? '0.0'}g enkelomättat, ${item.polyunsaturatedFatGrams?.toFixed(1) ?? '0.0'}g fleromättat`
                                  : 'Ingen detaljerad fettfördelning returnerades för denna matvara.'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                <span className="font-medium">Kolhydrater:</span>{' '}
                                {item.sugarGrams != null || item.complexCarbsGrams != null
                                  ? `${item.sugarGrams?.toFixed(1) ?? '0.0'}g socker, ${item.complexCarbsGrams?.toFixed(1) ?? '0.0'}g komplexa`
                                  : 'Ingen detaljerad kolhydratfördelning returnerades för denna matvara.'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                <span className="font-medium">Protein:</span>{' '}
                                {item.isCompleteProtein == null
                                  ? 'Proteinkvalitet ej specificerad av analysen.'
                                  : item.isCompleteProtein
                                    ? 'Komplett proteinkälla'
                                    : 'Ej komplett protein'}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>

          {/* Totals bar */}
          <GlassCard>
            <GlassCardContent className="p-3">
              <div className="grid grid-cols-5 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-white">{Math.round(totals.calories)}</p>
                  <p className="text-[10px] text-slate-400">kcal</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-400">{Math.round(totals.proteinGrams)}g</p>
                  <p className="text-[10px] text-slate-400">Protein</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-400">{Math.round(totals.carbsGrams)}g</p>
                  <p className="text-[10px] text-slate-400">Kolhydr.</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-rose-400">{Math.round(totals.fatGrams)}g</p>
                  <p className="text-[10px] text-slate-400">Fett</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-400">{Math.round(totals.fiberGrams)}g</p>
                  <p className="text-[10px] text-slate-400">Fiber</p>
                </div>
              </div>
              {enhancedMode && (
                <div className="mt-3 rounded bg-white/5 p-2 text-[10px] text-slate-400 space-y-1.5">
                  <div>
                    <span className="font-medium text-slate-300">Detaljerad totalsammanfattning:</span>
                  </div>
                  <div>
                    <span className="font-medium">Fett:</span>{' '}
                    {hasEnhancedTotals
                      ? `${totals.saturatedFatGrams?.toFixed(1) ?? '0.0'}g mättat, ${totals.monounsaturatedFatGrams?.toFixed(1) ?? '0.0'}g enkelomättat, ${totals.polyunsaturatedFatGrams?.toFixed(1) ?? '0.0'}g fleromättat`
                      : 'Ingen detaljerad fettfördelning returnerades i denna analys.'}
                  </div>
                  <div>
                    <span className="font-medium">Kolhydrater:</span>{' '}
                    {hasEnhancedTotals
                      ? `${totals.sugarGrams?.toFixed(1) ?? '0.0'}g socker, ${totals.complexCarbsGrams?.toFixed(1) ?? '0.0'}g komplexa`
                      : 'Ingen detaljerad kolhydratfördelning returnerades i denna analys.'}
                  </div>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Anteckningar</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Valfria anteckningar..."
              className="bg-white/5 border-white/10 text-white text-sm min-h-[60px]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white"
              onClick={handleReset}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Ny bild
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={items.length === 0}
            >
              Spara måltid
            </Button>
          </div>
        </div>
      )}

      {/* SAVING step */}
      {step === 'SAVING' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-300">Sparar måltid...</p>
        </div>
      )}

      {/* DONE step */}
      {step === 'DONE' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="p-3 bg-green-500/20 rounded-full">
            <Check className="h-8 w-8 text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-white">Måltid sparad!</p>
            <p className="text-sm text-slate-400 mt-1">
              {Math.round(totals.calories)} kcal registrerade
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
              onClick={handleReset}
            >
              Skanna en till
            </Button>
            <Button onClick={onClose}>
              Klar
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && step !== 'ANALYZING' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  )
}
