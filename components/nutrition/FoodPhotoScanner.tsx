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
} from 'lucide-react'

const SESSION_KEY = 'food-scanner-state'
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

const readFileAsDataUrl = (file: File, timeoutMs?: number) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    let timer: ReturnType<typeof setTimeout> | undefined

    if (timeoutMs) {
      timer = setTimeout(() => {
        reader.abort()
        reject(new Error('Timeout reading file'))
      }, timeoutMs)
    }

    reader.onload = () => {
      if (timer) clearTimeout(timer)
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Kunde inte läsa bildfilen'))
    }
    reader.onerror = () => {
      if (timer) clearTimeout(timer)
      reject(new Error('Kunde inte läsa bildfilen'))
    }
    reader.onabort = () => {
      if (timer) clearTimeout(timer)
      reject(new Error('File read aborted'))
    }
    reader.readAsDataURL(file)
  })

const normalizeImageToJpeg = async (file: File) => {
  try {
    const dataUrl = await readFileAsDataUrl(file)

    return await new Promise<File | null>((resolve) => {
      const img = new Image()

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(null)
            return
          }

          ctx.drawImage(img, 0, 0)
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

/**
 * Compress an image file to a base64 data URL suitable for JSON payloads.
 * Resizes to max 1024px on the longest side and uses 0.75 JPEG quality
 * to keep the base64 payload under ~1MB (avoiding Vercel body size limits).
 */
const compressImageForRefine = (file: File, timeoutMs = 15000): Promise<string | null> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)

    const reader = new FileReader()
    reader.onerror = () => { clearTimeout(timer); resolve(null) }
    reader.onabort = () => { clearTimeout(timer); resolve(null) }
    reader.onload = () => {
      if (typeof reader.result !== 'string') { clearTimeout(timer); resolve(null); return }

      const img = new Image()
      img.onerror = () => { clearTimeout(timer); resolve(null) }
      img.onload = () => {
        try {
          const MAX_DIM = 1024
          let { naturalWidth: w, naturalHeight: h } = img
          if (w > MAX_DIM || h > MAX_DIM) {
            const scale = MAX_DIM / Math.max(w, h)
            w = Math.round(w * scale)
            h = Math.round(h * scale)
          }
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) { clearTimeout(timer); resolve(null); return }
          ctx.drawImage(img, 0, 0, w, h)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
          clearTimeout(timer)
          resolve(dataUrl)
        } catch {
          clearTimeout(timer)
          resolve(null)
        }
      }
      img.src = reader.result
    }
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
  const fileInputId = useId()
  const cameraInputId = useId()
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
  const [memoryUsed, setMemoryUsed] = useState(false)
  const [portionSnapCount, setPortionSnapCount] = useState(0)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [revokePreviewUrl])

  const normalizeSelectedImage = useCallback(async (file: File, requestId: number) => {
    const normalizedFile = await normalizeImageToJpeg(file)
    if (!normalizedFile || selectionRequestIdRef.current !== requestId) {
      return
    }

    setImageFile(normalizedFile)
  }, [])

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
      setError('Vänligen välj en bildfil')
      event.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Bilden får inte vara större än 10MB')
      event.target.value = ''
      return
    }

    setError(null)
    clearSessionStorage()
    const requestId = selectionRequestIdRef.current + 1
    selectionRequestIdRef.current = requestId
    setSelectedImage(file)
    void normalizeSelectedImage(file, requestId)
    event.target.value = ''
  }, [normalizeSelectedImage, setSelectedImage, clearSessionStorage])

  const handleAnalyze = async () => {
    if (!imageFile) return

    setStep('ANALYZING')
    setError(null)

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
      setMemoryUsed(Boolean(data.memoryUsed))
      setPortionSnapCount(Array.isArray(data.portionSnaps) ? data.portionSnaps.length : 0)

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
            } : {}),
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte spara måltiden')
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
      setError(err instanceof Error ? err.message : 'Kunde inte spara måltiden')
      setStep('REVIEW')
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
    setError(null)
    setMealDescription('')
    setNotes('')
    setConfidence(0)
    setEnhancedMode(false)
    setMemoryUsed(false)
    setPortionSnapCount(0)
    setExpandedItems(new Set())
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
  }

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
    }
  }, [])

  const handleOpenCamera = async () => {
    setError(null)
    setTorchOn(false)
    setTorchSupported(false)
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
      // Camera not available (denied or desktop) — fall back to native file input
      cameraInputRef.current?.click()
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
    setTorchOn(false)
  }

  const handleRefine = async () => {
    if (!refinementText.trim()) return

    setIsRefining(true)
    setError(null)

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

      // Compress the image for the JSON payload to avoid exceeding Vercel's
      // body size limit (~4.5MB). The original file can be 3-8MB, which becomes
      // 4-10MB as base64 in JSON. We resize to 1024px and use lower quality.
      let imageBase64: string | undefined
      let imageMimeType: string | undefined
      if (imageFile) {
        try {
          const compressedDataUrl = await compressImageForRefine(imageFile)
          if (compressedDataUrl) {
            const base64Part = compressedDataUrl.split(',')[1]
            if (base64Part) {
              imageBase64 = base64Part
              imageMimeType = 'image/jpeg'
            }
          }
        } catch {
          // Fall back to text-only refine if the image cannot be compressed.
        }
      }

      // Wrap fetch so we can retry without the image on *either* a network
      // error (TypeError: "Failed to fetch" on flaky mobile connections) or a
      // non-ok response. The first attempt uses a 90s timeout; the text-only
      // retry gets a fresh timeout.
      const postRefine = async (includeImage: boolean): Promise<Response> => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 90000)
        try {
          return await fetch('/api/ai/food-scan/refine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalAnalysis,
              refinementText: refinementText.trim(),
              ...(includeImage && imageBase64
                ? { imageBase64, imageMimeType }
                : {}),
            }),
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timer)
        }
      }

      let response: Response | null = null
      let networkError: unknown = null
      try {
        response = await postRefine(Boolean(imageBase64))
      } catch (err) {
        networkError = err
      }

      // Retry without the image on network failure or non-ok response when
      // the first attempt carried an image.
      if (imageBase64 && (networkError || !response?.ok)) {
        try {
          response = await postRefine(false)
          networkError = null
        } catch (err) {
          networkError = err
        }
      }

      if (networkError || !response) {
        const isAbort = networkError instanceof DOMException && networkError.name === 'AbortError'
        throw new Error(
          isAbort
            ? 'Uppdateringen tog för lång tid. Kontrollera din anslutning och försök igen.'
            : 'Kunde inte nå servern. Kontrollera din anslutning och försök igen.'
        )
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Kunde inte uppdatera analysen')
      }

      const data = await response.json()
      const result: FoodPhotoAnalysisResult = data.result

      // For refinements, use the returned items even if success is false —
      // we already know food exists from the original analysis.
      if (!result.success && (!result.items || result.items.length === 0)) {
        setError('Kunde inte uppdatera analysen utifrån korrigeringen. Försök beskriva ändringen mer exakt.')
        return
      }

      if (data.enhancedMode != null) setEnhancedMode(data.enhancedMode)
      setItems(result.items.map(createEditableFoodItem))
      setMealDescription(result.mealDescription)
      setConfidence(result.confidence)
      setNotes(result.notes?.join('\n') ?? '')
      setRefinementText('')
      refinedRef.current = true
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
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
                  <Camera className="mx-auto h-7 w-7 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-white">Bild vald</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Förhandsgranskningen kunde inte visas, men du kan fortfarande analysera bilden.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    onClick={handleReset}
                  >
                    Välj annan bild
                  </Button>
                </div>
              )}
              {/* Pre-analysis context — user can provide hints */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowContextInput(!showContextInput)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {showContextInput ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showContextInput ? 'Dölj kontext' : 'Lägg till kontext (valfritt)'}
                </button>
                {showContextInput && (
                  <Textarea
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="T.ex. &quot;Köttet är 200g älgfärs&quot;, &quot;Riset är 150g kokt&quot;, &quot;Tillagat i olivolja&quot;"
                    className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] placeholder:text-slate-500"
                  />
                )}
                {userContext.trim() && !showContextInput && (
                  <p className="text-[11px] text-cyan-400 truncate">
                    Kontext: {userContext.trim()}
                  </p>
                )}
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleAnalyze}
              >
                Analysera måltid
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {showInlineCamera ? (
                <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto max-h-80 object-cover"
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
                      <span className="text-sm">Kamera</span>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="h-28 flex-col gap-2 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white cursor-pointer"
                    >
                      <label htmlFor={fileInputId} role="button" tabIndex={0}>
                        <Upload className="h-7 w-7" />
                        <span className="text-sm">Välj bild</span>
                      </label>
                    </Button>
                  </div>
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
          {(confidence > 0 || enhancedMode || memoryUsed) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {confidence > 0 && (
                <>
              <div className={`h-2 w-2 rounded-full ${confidence >= 0.7 ? 'bg-green-400' : confidence >= 0.4 ? 'bg-yellow-400' : 'bg-red-400'}`} />
              <span className="text-slate-400">
                Konfidensgrad: {Math.round(confidence * 100)}%
              </span>
                </>
              )}
              {memoryUsed && (
                <span
                  className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-violet-300"
                  title="Analysen använde din mathistorik för att förbättra träffsäkerheten"
                >
                  Personaliserad
                </span>
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

            {/* Show refinement errors inline so they're visible */}
            {error && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-red-950/30 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
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

          {/* Portion calibration indicator */}
          {portionSnapCount > 0 && (
            <p
              className="text-[11px] text-violet-300/80 text-center"
              title="Gemini och din tidigare mathistorik vägdes samman för att ge mer realistiska portionsstorlekar."
            >
              {portionSnapCount === 1
                ? '1 portionsstorlek justerad efter din historik'
                : `${portionSnapCount} portionsstorlekar justerade efter din historik`}
            </p>
          )}

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
