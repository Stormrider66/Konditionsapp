'use client'

/**
 * Food Photo Scanner Component
 *
 * Multi-step flow for photographing food and getting AI-estimated
 * calories and macros, then saving as a MealLog.
 *
 * Steps: CAPTURE → ANALYZING → REVIEW → SAVING → DONE
 */

import React, { useState, useRef, useCallback, useEffect, useId } from 'react'
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
  Zap,
  ZapOff,
  Save,
} from 'lucide-react'

const SESSION_KEY = 'food-scanner-state'
const MAX_NORMALIZED_IMAGE_DIMENSION = 1600
import type { FoodPhotoAnalysisResult } from '@/lib/validations/gemini-schemas'
import {
  calculateFoodTotals,
  createEditableFoodItem,
  parsePortionGramsFromText,
  recalculateItemFromGrams,
  updateDensityFromManualValue,
  type EditableFoodItem,
  type NutrientDensity,
} from '@/lib/nutrition/food-scan-recalculation'
import { guessDefaultMealType } from '@/lib/nutrition/guess-meal-type'
import {
  type AiAllowanceExhaustedError,
  getAiAllowanceUpgradeMessage,
  isAiAllowanceExhaustedError,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors'
import { AiAllowanceBlockedAction, type AiAllowanceAction } from '@/components/athlete/ai/AiAllowanceBlockedAction'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'

type Step = 'CAPTURE' | 'ANALYZING' | 'REVIEW' | 'SAVING' | 'DONE'

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

const scannerLabelClass = 'text-xs font-medium text-slate-600 dark:text-slate-400'
const scannerMicroLabelClass = 'text-[10px] font-medium text-slate-600 dark:text-slate-400'
const scannerControlClass =
  'border-slate-200 bg-white text-slate-900 shadow-sm placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500'
const scannerIconButtonClass =
  'border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
const scannerPanelClass =
  'bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-0'

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const nutrientPer100g = (value: number, grams: number) => {
  if (!Number.isFinite(value) || grams <= 0) return 0
  return roundTo((value / grams) * 100, 1)
}

const makeSuggestedRecipeName = (mealDescription: string, items: EditableFoodItem[], fallbackName: string) => {
  const description = mealDescription.trim()
  if (description.length >= 2) return description.slice(0, 80)

  const names = items
    .map((item) => item.name.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ')

  return (names || fallbackName).slice(0, 80)
}

const foodItemsToRecipeItems = (items: EditableFoodItem[]) =>
  items
    .filter((item) => item.name.trim().length > 0 && item.estimatedGrams > 0)
    .map((item) => ({
      name: item.name.trim(),
      category: item.category,
      grams: roundTo(item.estimatedGrams, 1),
      caloriesPer100g: nutrientPer100g(item.calories, item.estimatedGrams),
      proteinPer100g: nutrientPer100g(item.proteinGrams, item.estimatedGrams),
      carbsPer100g: nutrientPer100g(item.carbsGrams, item.estimatedGrams),
      fatPer100g: nutrientPer100g(item.fatGrams, item.estimatedGrams),
      fiberPer100g: nutrientPer100g(item.fiberGrams, item.estimatedGrams),
    }))

interface FoodPhotoScannerProps {
  onMealSaved?: (meal: unknown) => void
  onClose?: () => void
  defaultMealType?: string
  defaultDate?: string
  redirectPathOnSave?: string
}

const readFileAsDataUrl = (file: File, timeoutMs: number | undefined, readErrorMessage: string) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    let timer: ReturnType<typeof setTimeout> | undefined

    if (timeoutMs) {
      timer = setTimeout(() => {
        reader.abort()
        reject(new Error(readErrorMessage))
      }, timeoutMs)
    }

    reader.onload = () => {
      if (timer) clearTimeout(timer)
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error(readErrorMessage))
    }
    reader.onerror = () => {
      if (timer) clearTimeout(timer)
      reject(new Error(readErrorMessage))
    }
    reader.onabort = () => {
      if (timer) clearTimeout(timer)
      reject(new Error('File read aborted'))
    }
    reader.readAsDataURL(file)
  })

const normalizeImageToJpeg = async (file: File, readErrorMessage: string) => {
  try {
    const dataUrl = await readFileAsDataUrl(file, undefined, readErrorMessage)

    return await new Promise<File | null>((resolve) => {
      const img = new Image()

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const maxDimension = Math.max(img.naturalWidth, img.naturalHeight)
          const scale = maxDimension > MAX_NORMALIZED_IMAGE_DIMENSION
            ? MAX_NORMALIZED_IMAGE_DIMENSION / maxDimension
            : 1
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(null)
            return
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(null)
                return
              }

              resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
            },
            'image/jpeg',
            0.92
          )
        } catch {
          resolve(null)
        }
      }

      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
  } catch {
    return null
  }
}

export function FoodPhotoScanner({
  onMealSaved,
  onClose,
  defaultMealType,
  defaultDate,
  redirectPathOnSave,
}: FoodPhotoScannerProps) {
  const t = useTranslations('components.foodPhotoScanner')
  const locale = useLocale()
  const router = useRouter()
  const fileInputId = useId()
  const cameraInputId = useId()
  const [step, setStep] = useState<Step>('CAPTURE')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiAllowanceAction, setAiAllowanceAction] = useState<AiAllowanceAction | null>(null)

  const clearError = useCallback(() => {
    setError(null)
    setAiAllowanceAction(null)
  }, [])

  const showError = useCallback((message: string) => {
    setError(message)
    setAiAllowanceAction(null)
  }, [])

  const showAiAllowanceError = useCallback((allowanceError: AiAllowanceExhaustedError) => {
    setError(`${allowanceError.message} ${getAiAllowanceUpgradeMessage(allowanceError)}`)
    setAiAllowanceAction({
      label: allowanceError.actionLabel,
      url: allowanceError.actionUrl,
    })
  }, [])

  // Review state
  const [items, setItems] = useState<EditableFoodItem[]>([])
  const [mealType, setMealType] = useState(defaultMealType || guessDefaultMealType())
  const [mealTime, setMealTime] = useState(
    new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  )
  const [mealDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [mealDescription, setMealDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [enhancedMode, setEnhancedMode] = useState(false)
  const [memoryUsed, setMemoryUsed] = useState(false)
  const [portionSnapCount, setPortionSnapCount] = useState(0)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [isSavingRecipe, setIsSavingRecipe] = useState(false)
  const [recipeSaveMessage, setRecipeSaveMessage] = useState<string | null>(null)
  const [recipeSaveError, setRecipeSaveError] = useState<string | null>(null)

  // Pre-analysis context (user-provided hints before scanning)
  const [userContext, setUserContext] = useState('')
  const [showContextInput, setShowContextInput] = useState(false)

  // Refinement state
  const [refinementText, setRefinementText] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Inline camera state
  const [showInlineCamera, setShowInlineCamera] = useState(false)
  const [showNativeCameraFallback, setShowNativeCameraFallback] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const previewUrlRef = useRef<string | null>(null)
  const selectionRequestIdRef = useRef(0)

  // Correction-capture refs: snapshot the API's first response so we can diff
  // against whatever the user ultimately saves, even through refinements.
  const initialAiItemsRef = useRef<unknown[] | null>(null)
  const initialAiConfidenceRef = useRef<number | null>(null)
  const refinedRef = useRef(false)

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = null
  }, [])

  const saveStateToSessionStorage = useCallback(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ mealType, mealTime, mealDate, ts: Date.now() })
      )
    } catch {
      // sessionStorage may be unavailable — non-critical
    }
  }, [mealType, mealTime, mealDate])

  const clearSessionStorage = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // non-critical
    }
  }, [])

  // Restore state from sessionStorage on mount (handles page reload during native camera)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { mealType?: string; mealTime?: string; mealDate?: string; ts?: number }
      if (!saved.ts || Date.now() - saved.ts > 5 * 60 * 1000) {
        sessionStorage.removeItem(SESSION_KEY)
        return
      }
      if (saved.mealType && !defaultMealType) setMealType(saved.mealType)
      if (saved.mealTime) setMealTime(saved.mealTime)
    } catch {
      // non-critical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      revokePreviewUrl()
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [revokePreviewUrl])

  const normalizeSelectedImage = useCallback(async (file: File, requestId: number) => {
    const normalizedFile = await normalizeImageToJpeg(file, t('errors.readImageFile'))
    if (!normalizedFile || selectionRequestIdRef.current !== requestId) {
      return
    }

    setImageFile(normalizedFile)
    if (previewUrlRef.current) {
      revokePreviewUrl()
      try {
        const previewUrl = URL.createObjectURL(normalizedFile)
        previewUrlRef.current = previewUrl
        setImagePreview(previewUrl)
      } catch {
        setImagePreview(null)
      }
    }
  }, [revokePreviewUrl, t])

  const setSelectedImage = useCallback((file: File) => {
    setImageFile(file)
    revokePreviewUrl()

    try {
      const previewUrl = URL.createObjectURL(file)
      previewUrlRef.current = previewUrl
      setImagePreview(previewUrl)
    } catch {
      setImagePreview(null)
    }
  }, [revokePreviewUrl])

  // Safety net: detect return from native camera when onChange may not fire.
  // On Android the browser may fully reload the page (not bfcache), so we
  // listen on visibilitychange (most reliable on mobile), pageshow (both
  // bfcache and fresh loads), and focus as a fallback. We also retry the
  // check a second time after a longer delay for slow devices.
  useEffect(() => {
    if (step !== 'CAPTURE') return

    let checkTimeoutId: ReturnType<typeof setTimeout> | null = null
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null

    const checkForFiles = () => {
      const cameraFile = cameraInputRef.current?.files?.[0]
      const galleryFile = fileInputRef.current?.files?.[0]
      const file = cameraFile || galleryFile
      if (!file || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return

      clearSessionStorage()
      setShowNativeCameraFallback(false)
      const requestId = selectionRequestIdRef.current + 1
      selectionRequestIdRef.current = requestId
      setSelectedImage(file)
      void normalizeSelectedImage(file, requestId)
      if (cameraInputRef.current && cameraFile) cameraInputRef.current.value = ''
      if (fileInputRef.current && galleryFile) fileInputRef.current.value = ''
    }

    const handleFocusReturn = () => {
      if (checkTimeoutId) clearTimeout(checkTimeoutId)
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
      // First check after a short delay
      checkTimeoutId = setTimeout(checkForFiles, 300)
      // Retry after a longer delay for slow Android devices where the file
      // input value is populated late
      retryTimeoutId = setTimeout(checkForFiles, 1500)
    }

    const handlePageShow = () => {
      handleFocusReturn()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocusReturn()
      }
    }

    window.addEventListener('focus', handleFocusReturn)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocusReturn)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (checkTimeoutId) clearTimeout(checkTimeoutId)
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
    }
  }, [step, clearSessionStorage, setSelectedImage, normalizeSelectedImage])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError(t('errors.selectImageFile'))
      event.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showError(t('errors.imageTooLarge'))
      event.target.value = ''
      return
    }

    clearError()
    setShowNativeCameraFallback(false)
    clearSessionStorage()
    const requestId = selectionRequestIdRef.current + 1
    selectionRequestIdRef.current = requestId
    setSelectedImage(file)
    void normalizeSelectedImage(file, requestId)
    event.target.value = ''
  }, [normalizeSelectedImage, setSelectedImage, clearSessionStorage, clearError, showError, t])

  const handleAnalyze = async () => {
    if (!imageFile) return

    setStep('ANALYZING')
    clearError()

    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      const now = new Date()
      formData.append('clientHour', String(now.getHours()))
      formData.append('clientDayOfWeek', String(now.getDay()))
      if (userContext.trim()) {
        formData.append('context', userContext.trim())
      }

      const response = await fetch('/api/ai/food-scan', {
        method: 'POST',
        body: formData,
      })

      if (response.status === 429) {
        showError(t('errors.tooManyRequests'))
        setStep('CAPTURE')
        return
      }

      if (response.status === 401) {
        showError(t('errors.athleteModeRequired'))
        setStep('CAPTURE')
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const allowanceError = parseAiAllowanceError(data)
        if (allowanceError) {
          showAiAllowanceError(allowanceError)
          setStep('CAPTURE')
          return
        }
        showError(data?.error || t('errors.analyzeFailed'))
        setStep('CAPTURE')
        return
      }

      const data = await response.json()
      const result: FoodPhotoAnalysisResult = data.result

      if (!result.success) {
        showError(t('errors.noFoodIdentified'))
        setStep('CAPTURE')
        return
      }

      // Populate review state
      setEnhancedMode(data.enhancedMode ?? false)
      setMemoryUsed(Boolean(data.memoryUsed))
      setPortionSnapCount(Array.isArray(data.portionSnaps) ? data.portionSnaps.length : 0)
      setRecipeSaveMessage(null)
      setRecipeSaveError(null)

      // Snapshot the AI's first response so we can capture corrections on save.
      initialAiItemsRef.current = result.items.map((i) => ({ ...i }))
      initialAiConfidenceRef.current =
        typeof result.confidence === 'number' ? result.confidence : null
      refinedRef.current = false

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
      showError(t('errors.network'))
      setStep('CAPTURE')
    }
  }

  const handleSave = async () => {
    if (items.length === 0) return

    setStep('SAVING')
    clearError()

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
          mergeRecent: true,
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
              proteinSource: item.proteinSource,
            } : {}),
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('errors.saveMeal'))
      }

      const data = await response.json()

      // Fire-and-forget: capture any delta between the AI's first response
      // and the user's saved meal so later phases can learn from it. Failure
      // must not block the happy path — meal is already persisted.
      const aiItemsSnapshot = initialAiItemsRef.current
      const savedMealId: string | null =
        typeof data?.data?.id === 'string' ? data.data.id : null
      if (aiItemsSnapshot && aiItemsSnapshot.length > 0) {
        const finalItemsPayload = items.map((item) => ({
          name: item.name,
          category: item.category,
          estimatedGrams: item.estimatedGrams,
          portionDescription: item.portionDescription,
          calories: item.calories,
          proteinGrams: item.proteinGrams,
          carbsGrams: item.carbsGrams,
          fatGrams: item.fatGrams,
          fiberGrams: item.fiberGrams,
        }))
        void fetch('/api/nutrition/food-scan/corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mealLogId: savedMealId,
            aiItems: aiItemsSnapshot,
            finalItems: finalItemsPayload,
            aiConfidence: initialAiConfidenceRef.current,
            wentThroughRefine: refinedRef.current,
          }),
        }).catch(() => {
          // Correction capture is best-effort. Swallow errors silently.
        })
      }

      onMealSaved?.(data.data)

      if (redirectPathOnSave) {
        onClose?.()
        router.push(redirectPathOnSave)
        return
      }

      setStep('DONE')
    } catch (err) {
      showError(err instanceof Error ? err.message : t('errors.saveMeal'))
      setStep('REVIEW')
    }
  }

  const handleSaveRecipe = async () => {
    const recipeItems = foodItemsToRecipeItems(items)
    if (recipeItems.length === 0) return

    setIsSavingRecipe(true)
    setRecipeSaveMessage(null)
    setRecipeSaveError(null)

    try {
      const response = await fetch('/api/nutrition/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: makeSuggestedRecipeName(mealDescription, items, t('recipe.scannedRecipeFallback')),
          description: notes.trim() || undefined,
          baseServings: 1,
          source: 'SCAN',
          items: recipeItems,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || t('errors.saveRecipe'))
      }

      const savedName = typeof data?.data?.name === 'string' ? data.data.name : t('recipe.defaultName')
      setRecipeSaveMessage(t('recipe.saved', { name: savedName }))
    } catch (err) {
      setRecipeSaveError(err instanceof Error ? err.message : t('errors.saveRecipe'))
    } finally {
      setIsSavingRecipe(false)
    }
  }

  const handleReset = () => {
    selectionRequestIdRef.current += 1
    revokePreviewUrl()
    clearSessionStorage()
    setStep('CAPTURE')
    setImagePreview(null)
    setImageFile(null)
    setItems([])
    clearError()
    setMealDescription('')
    setNotes('')
    setConfidence(0)
    setEnhancedMode(false)
    setMemoryUsed(false)
    setPortionSnapCount(0)
    setExpandedItems(new Set())
    setIsSavingRecipe(false)
    setRecipeSaveMessage(null)
    setRecipeSaveError(null)
    initialAiItemsRef.current = null
    initialAiConfidenceRef.current = null
    refinedRef.current = false
    setUserContext('')
    setShowContextInput(false)
    setRefinementText('')
    setIsRefining(false)
    setIsRecording(false)
    setIsTranscribing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    stopCameraStream()
    setShowInlineCamera(false)
    setShowNativeCameraFallback(false)
  }

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
    }
  }, [])

  const handleOpenCamera = async () => {
    clearError()
    setShowNativeCameraFallback(false)
    setTorchOn(false)
    setTorchSupported(false)
    saveStateToSessionStorage()

    if (!navigator.mediaDevices?.getUserMedia) {
      setShowNativeCameraFallback(true)
      cameraInputRef.current?.click()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      cameraStreamRef.current = stream
      setShowInlineCamera(true)

      // Check if torch/flash is supported on this device
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities?.()
          if (capabilities && 'torch' in capabilities) {
            setTorchSupported(true)
          }
        } catch {
          // getCapabilities not supported — torch unavailable
        }
      }

      // Wait for the video element to mount, then attach the stream
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
    } catch {
      setShowNativeCameraFallback(true)
      showError(t('errors.cameraOpenFailed'))
    }
  }

  const handleToggleTorch = async () => {
    const videoTrack = cameraStreamRef.current?.getVideoTracks()[0]
    if (!videoTrack) return
    const next = !torchOn
    try {
      await videoTrack.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {
      // Torch toggle failed — ignore
    }
  }

  const handleCaptureFromVideo = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1920
    canvas.height = video.videoHeight || 1080
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    stopCameraStream()
    setShowInlineCamera(false)
    setTorchOn(false)
    setShowNativeCameraFallback(false)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })
        const requestId = selectionRequestIdRef.current + 1
        selectionRequestIdRef.current = requestId
        setSelectedImage(file)
        void normalizeSelectedImage(file, requestId)
      },
      'image/jpeg',
      0.92
    )
  }

  const handleCloseCamera = () => {
    stopCameraStream()
    setShowInlineCamera(false)
    setShowNativeCameraFallback(false)
    setTorchOn(false)
  }

  const handleRefine = async () => {
    if (!refinementText.trim()) return

    setIsRefining(true)
    clearError()

    try {
      // Build original analysis from current items state.
      // Strip nutrientDensity (internal field) to avoid confusing the AI model.
      const originalAnalysis = {
        success: true,
        items: items.map(({ nutrientDensity: _nd, ...rest }) => rest),
        totals: calculateFoodTotals(items),
        mealDescription,
        confidence,
        notes: notes ? notes.split('\n') : [],
      }

      // Corrections are text-first: the current item list already contains the
      // image-derived context, and avoiding another multimodal pass keeps mobile
      // updates from sitting behind a long spinner.
      const postRefine = async (): Promise<Response> => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 40000)
        try {
          return await fetch('/api/ai/food-scan/refine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalAnalysis,
              refinementText: refinementText.trim(),
            }),
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timer)
        }
      }

      try {
        const response = await postRefine()

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          const allowanceError = parseAiAllowanceError(data)
          if (allowanceError) throw allowanceError
          throw new Error(data?.error || t('errors.updateAnalysis'))
        }

        const data = await response.json()
        const result: FoodPhotoAnalysisResult = data.result

        // For refinements, use the returned items even if success is false —
        // we already know food exists from the original analysis.
        if (!result.success && (!result.items || result.items.length === 0)) {
          showError(t('errors.refineSpecific'))
          return
        }

        if (data.enhancedMode != null) setEnhancedMode(data.enhancedMode)
        setItems(result.items.map(createEditableFoodItem))
        setMealDescription(result.mealDescription)
        setConfidence(result.confidence)
        setNotes(result.notes?.join('\n') ?? '')
        setRefinementText('')
        setRecipeSaveMessage(null)
        setRecipeSaveError(null)
        refinedRef.current = true
      } catch (err) {
        const isAbort =
          typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          err.name === 'AbortError'
        throw new Error(
          isAbort
            ? t('errors.refineTimeout')
            : err instanceof Error
              ? err.message
              : t('errors.serverUnreachable')
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.updateAnalysis')
      if (isAiAllowanceExhaustedError(err)) {
        showAiAllowanceError(err)
      } else {
        showError(message)
      }
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
      showError(t('errors.microphoneStart'))
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
        const data = await response.json().catch(() => null)
        const allowanceError = parseAiAllowanceError(data)
        if (allowanceError) throw allowanceError
        throw new Error(data?.error || t('errors.transcribe'))
      }

      const data = await response.json()
      if (data.text) {
        setRefinementText((prev) => (prev ? `${prev} ${data.text}` : data.text))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.transcribeAudio')
      if (isAiAllowanceExhaustedError(err)) {
        showAiAllowanceError(err)
      } else {
        showError(message)
      }
    } finally {
      setIsTranscribing(false)
    }
  }

  const updateItemText = (index: number, field: 'name' | 'portionDescription', value: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        if (field !== 'portionDescription') return { ...item, [field]: value }

        const grams = parsePortionGramsFromText(value)
        if (grams == null) return { ...item, portionDescription: value }

        return {
          ...recalculateItemFromGrams(item, grams),
          portionDescription: value,
        }
      })
    )
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
  const hasSelectedImage = Boolean(imageFile)
  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* CAPTURE step */}
      {step === 'CAPTURE' && (
        <>
          {hasSelectedImage ? (
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-transparent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt={t('image.previewAlt')}
                    className="w-full h-auto max-h-64 object-contain bg-slate-100 dark:bg-black/20"
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
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-white/10 dark:bg-black/20">
                  <Camera className="mx-auto h-7 w-7 text-slate-500 dark:text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{t('capture.imageSelected')}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {t('capture.previewUnavailable')}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    onClick={handleReset}
                  >
                    {t('capture.chooseDifferentImage')}
                  </Button>
                </div>
              )}
              {/* Pre-analysis context — user can provide hints */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowContextInput(!showContextInput)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                >
                  {showContextInput ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showContextInput ? t('capture.hideContext') : t('capture.addContext')}
                </button>
                {showContextInput && (
                  <Textarea
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder={t('capture.contextPlaceholder')}
                    className={cn(scannerControlClass, 'text-sm min-h-[60px]')}
                  />
                )}
                {userContext.trim() && !showContextInput && (
                  <p className="text-[11px] text-cyan-400 truncate">
                    {t('capture.contextPreview', { context: userContext.trim() })}
                  </p>
                )}
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleAnalyze}
              >
                {t('actions.analyzeMeal')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {showInlineCamera ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto max-h-80 object-contain"
                  />
                  <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/70">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30"
                      onClick={handleCloseCamera}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-16 w-16 rounded-full bg-white hover:bg-white/90 text-black shadow-lg"
                      onClick={handleCaptureFromVideo}
                    >
                      <Camera className="h-7 w-7" />
                    </Button>
                    {torchSupported ? (
                      <Button
                        variant="secondary"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${torchOn ? 'bg-yellow-400/80 hover:bg-yellow-400 text-black' : 'bg-white/20 hover:bg-white/30'}`}
                        onClick={handleToggleTorch}
                      >
                        {torchOn ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                      </Button>
                    ) : (
                      <div className="h-10 w-10" /> /* Spacer for centering */
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-28 flex-col gap-2 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white cursor-pointer"
                      onClick={handleOpenCamera}
                    >
                      <Camera className="h-7 w-7" />
                      <span className="text-sm">{t('capture.camera')}</span>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="h-28 flex-col gap-2 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white cursor-pointer"
                    >
                      <label htmlFor={fileInputId} role="button" tabIndex={0}>
                        <Upload className="h-7 w-7" />
                        <span className="text-sm">{t('capture.chooseImage')}</span>
                      </label>
                    </Button>
                  </div>
                  {showNativeCameraFallback && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full gap-2 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 cursor-pointer"
                    >
                      <label htmlFor={cameraInputId} role="button" tabIndex={0}>
                        <Camera className="h-4 w-4" />
                        <span>{t('capture.openCameraApp')}</span>
                      </label>
                    </Button>
                  )}
                  {/* Hidden native file input as fallback for camera + gallery picker */}
                  <input
                    id={cameraInputId}
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                  <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </>
              )}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                {t('capture.description')}
              </p>
            </div>
          )}
        </>
      )}

      {/* ANALYZING step */}
      {step === 'ANALYZING' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          {imagePreview && (
            <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 w-full max-h-40 dark:border-white/10 dark:bg-transparent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt={t('image.analyzingAlt')}
                className="w-full h-auto max-h-40 object-contain bg-slate-100 dark:bg-black/20"
              />
            </div>
          )}
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('analyzing')}</p>
        </div>
      )}

      {/* REVIEW step */}
      {step === 'REVIEW' && (
        <div className="space-y-4">
          {/* Compact photo preview */}
          {imagePreview && (
            <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-h-32 dark:border-white/10 dark:bg-transparent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt={t('image.mealAlt')}
                className="w-full h-auto max-h-32 object-contain bg-slate-100 dark:bg-black/20"
              />
            </div>
          )}

          {/* Confidence indicator */}
          {(confidence > 0 || enhancedMode || memoryUsed) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {confidence > 0 && (
                <>
              <div className={`h-2 w-2 rounded-full ${confidence >= 0.7 ? 'bg-green-400' : confidence >= 0.4 ? 'bg-yellow-400' : 'bg-red-400'}`} />
              <span className="text-slate-600 dark:text-slate-400">
                {t('review.confidence', { percent: Math.round(confidence * 100) })}
              </span>
                </>
              )}
              {memoryUsed && (
                <span
                  className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300"
                  title={t('review.personalizedTitle')}
                >
                  {t('review.personalized')}
                </span>
              )}
              {enhancedMode && (
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300">
                  {t('review.enhancedMode')}
                </span>
              )}
            </div>
          )}

          {/* Inline refinement */}
          <div className="space-y-2">
            <label className={scannerLabelClass}>{t('review.refineLabel')}</label>
            <div className="flex gap-2">
              <Textarea
                value={refinementText}
                onChange={(e) => setRefinementText(e.target.value)}
                placeholder={t('review.refinePlaceholder')}
                className={cn(scannerControlClass, 'text-sm min-h-[44px] max-h-[80px] flex-1')}
                disabled={isRefining || isTranscribing}
              />
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'h-[21px] w-10',
                    isRecording
                      ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-400'
                      : scannerIconButtonClass
                  )}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isRefining || isTranscribing}
                  title={isRecording ? t('actions.stopRecording') : t('actions.recordVoiceCorrection')}
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
                  className={cn('h-[21px] w-10', scannerIconButtonClass)}
                  onClick={handleRefine}
                  disabled={!refinementText.trim() || isRefining}
                  title={t('actions.updateAnalysis')}
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
                {t('actions.updateAnalysis')}
              </Button>
            )}

            {/* Show refinement errors inline so they're visible */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-500/20 dark:bg-red-950/30">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                  <AiAllowanceBlockedAction
                    action={aiAllowanceAction}
                    tone="red"
                    className="h-8 border-red-200 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Meal type and time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={scannerLabelClass}>{t('review.mealType')}</label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className={scannerControlClass}>
                  <SelectValue placeholder={t('review.mealTypePlaceholder')} />
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
            <div className="space-y-1">
              <label className={scannerLabelClass}>{t('review.time')}</label>
              <Input
                type="time"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                className={scannerControlClass}
              />
            </div>
          </div>

          {/* Food items list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className={scannerLabelClass}>
                {t('review.identifiedFoods', { count: items.length })}
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                onClick={handleSaveRecipe}
                disabled={isSavingRecipe || foodItemsToRecipeItems(items).length === 0}
              >
                {isSavingRecipe ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {t('actions.saveRecipe')}
              </Button>
            </div>
            {recipeSaveMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                {recipeSaveMessage}
              </div>
            )}
            {recipeSaveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {recipeSaveError}
              </div>
            )}
            {items.map((item, index) => (
              <GlassCard key={index}>
                <GlassCardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItemText(index, 'name', e.target.value)}
                          className={cn(scannerControlClass, 'h-7 text-sm font-medium')}
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
                          <label className={scannerMicroLabelClass}>Portion</label>
                          <Input
                            value={item.portionDescription}
                            onChange={(e) => updateItemText(index, 'portionDescription', e.target.value)}
                            className={cn(scannerControlClass, 'h-7 text-xs')}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className={scannerMicroLabelClass}>Gram</label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={item.estimatedGrams}
                            onChange={(e) => updateItemNumber(index, 'estimatedGrams', Number(e.target.value))}
                            className={cn(scannerControlClass, 'h-7 text-xs')}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        <div className="space-y-0.5">
                          <label className={scannerMicroLabelClass}>kcal</label>
                          <Input
                            type="number"
                            value={item.calories}
                            onChange={(e) => updateItemNumber(index, 'calories', Number(e.target.value))}
                            className={cn(scannerControlClass, 'h-7 text-xs')}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className={scannerMicroLabelClass}>{t('macros.protein')}</label>
                          <Input
                            type="number"
                            value={item.proteinGrams}
                            onChange={(e) => updateItemNumber(index, 'proteinGrams', Number(e.target.value))}
                            className={cn(scannerControlClass, 'h-7 text-xs')}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className={scannerMicroLabelClass}>{t('macros.carbsShort')}</label>
                          <Input
                            type="number"
                            value={item.carbsGrams}
                            onChange={(e) => updateItemNumber(index, 'carbsGrams', Number(e.target.value))}
                            className={cn(scannerControlClass, 'h-7 text-xs')}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className={scannerMicroLabelClass}>{t('macros.fat')}</label>
                          <Input
                            type="number"
                            value={item.fatGrams}
                            onChange={(e) => updateItemNumber(index, 'fatGrams', Number(e.target.value))}
                            className={cn(scannerControlClass, 'h-7 text-xs')}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className={scannerMicroLabelClass}>{t('macros.fiber')}</label>
                          <Input
                            type="number"
                            value={item.fiberGrams}
                            onChange={(e) => updateItemNumber(index, 'fiberGrams', Number(e.target.value))}
                            className={cn(scannerControlClass, 'h-7 text-xs')}
                          />
                        </div>
                      </div>
                      {/* Enhanced macro subcategories */}
                      {enhancedMode && (
                        <>
                          <button
                            type="button"
                            className="flex items-center gap-1 mt-2 text-[10px] font-medium text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300"
                            onClick={() => setExpandedItems(prev => {
                              const next = new Set(prev)
                              if (next.has(index)) next.delete(index)
                              else next.add(index)
                              return next
                            })}
                          >
                            {expandedItems.has(index) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {t('review.detailedAnalysis')}
                          </button>
                          {expandedItems.has(index) && (
                            <div className={cn('mt-1.5 p-2 rounded space-y-1.5', scannerPanelClass)}>
                              <div className="text-[10px]">
                                <span className="font-medium">{t('macros.fat')}:</span>{' '}
                                {item.saturatedFatGrams != null || item.monounsaturatedFatGrams != null || item.polyunsaturatedFatGrams != null
                                  ? t('review.fatBreakdown', {
                                    saturated: item.saturatedFatGrams?.toFixed(1) ?? '0.0',
                                    mono: item.monounsaturatedFatGrams?.toFixed(1) ?? '0.0',
                                    poly: item.polyunsaturatedFatGrams?.toFixed(1) ?? '0.0',
                                  })
                                  : t('review.noItemFatBreakdown')}
                              </div>
                              <div className="text-[10px]">
                                <span className="font-medium">{t('macros.carbs')}:</span>{' '}
                                {item.sugarGrams != null || item.complexCarbsGrams != null
                                  ? t('review.carbBreakdown', {
                                    sugar: item.sugarGrams?.toFixed(1) ?? '0.0',
                                    complex: item.complexCarbsGrams?.toFixed(1) ?? '0.0',
                                  })
                                  : t('review.noItemCarbBreakdown')}
                              </div>
                              <div className="text-[10px]">
                                <span className="font-medium">{t('macros.protein')}:</span>{' '}
                                {item.isCompleteProtein == null
                                  ? t('review.proteinQualityUnknown')
                                  : item.isCompleteProtein
                                    ? t('review.completeProtein')
                                    : t('review.incompleteProtein')}
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
                  <p className="text-lg font-bold text-slate-950 dark:text-white">{Math.round(totals.calories)}</p>
                  <p className={scannerMicroLabelClass}>kcal</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{Math.round(totals.proteinGrams)}g</p>
                  <p className={scannerMicroLabelClass}>{t('macros.protein')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{Math.round(totals.carbsGrams)}g</p>
                  <p className={scannerMicroLabelClass}>{t('macros.carbsShort')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{Math.round(totals.fatGrams)}g</p>
                  <p className={scannerMicroLabelClass}>{t('macros.fat')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{Math.round(totals.fiberGrams)}g</p>
                  <p className={scannerMicroLabelClass}>{t('macros.fiber')}</p>
                </div>
              </div>
              {enhancedMode && (
                <div className={cn('mt-3 rounded p-2 text-[10px] space-y-1.5', scannerPanelClass)}>
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{t('review.detailedTotals')}:</span>
                  </div>
                  <div>
                    <span className="font-medium">{t('macros.fat')}:</span>{' '}
                    {hasEnhancedTotals
                      ? t('review.fatBreakdown', {
                        saturated: totals.saturatedFatGrams?.toFixed(1) ?? '0.0',
                        mono: totals.monounsaturatedFatGrams?.toFixed(1) ?? '0.0',
                        poly: totals.polyunsaturatedFatGrams?.toFixed(1) ?? '0.0',
                      })
                      : t('review.noTotalFatBreakdown')}
                  </div>
                  <div>
                    <span className="font-medium">{t('macros.carbs')}:</span>{' '}
                    {hasEnhancedTotals
                      ? t('review.carbBreakdown', {
                        sugar: totals.sugarGrams?.toFixed(1) ?? '0.0',
                        complex: totals.complexCarbsGrams?.toFixed(1) ?? '0.0',
                      })
                      : t('review.noTotalCarbBreakdown')}
                  </div>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          {/* Portion calibration indicator */}
          {portionSnapCount > 0 && (
            <p
              className="text-center text-[11px] font-medium text-violet-700 dark:text-violet-300/80"
              title={t('review.portionCalibrationTitle')}
            >
              {portionSnapCount === 1
                ? t('review.portionCalibrationOne')
                : t('review.portionCalibrationMany', { count: portionSnapCount })}
            </p>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className={scannerLabelClass}>{t('review.notes')}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('review.notesPlaceholder')}
              className={cn(scannerControlClass, 'text-sm min-h-[60px]')}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              onClick={handleReset}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              {t('actions.newImage')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={items.length === 0}
            >
              {t('actions.saveMeal')}
            </Button>
          </div>
        </div>
      )}

      {/* SAVING step */}
      {step === 'SAVING' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('saving')}</p>
        </div>
      )}

      {/* DONE step */}
      {step === 'DONE' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="p-3 bg-green-500/20 rounded-full">
            <Check className="h-8 w-8 text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-slate-950 dark:text-white">{t('done.title')}</p>
            <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
              {t('done.caloriesRegistered', { calories: Math.round(totals.calories) })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              onClick={handleReset}
            >
              {t('actions.scanAnother')}
            </Button>
            <Button onClick={onClose}>
              {t('actions.done')}
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && step !== 'ANALYZING' && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-950/30">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <AiAllowanceBlockedAction
              action={aiAllowanceAction}
              tone="red"
              className="border-red-200 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20"
            />
          </div>
        </div>
      )}
    </div>
  )
}
