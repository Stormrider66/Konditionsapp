'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Save, Download, Info, Camera, Loader2, CalendarDays, AlertTriangle, Sparkles, ChevronDown, ChevronRight, Activity, Video, Square, CheckCircle2, ExternalLink } from 'lucide-react'
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
import { cn } from '@/lib/utils'

interface TestDataFormProps {
  testType: TestType
  onSubmit: (data: CreateTestFormData) => Promise<TestSubmitResult | void> | TestSubmitResult | void
  clientId?: string
  videoAnalysisBasePath?: string
  onStageVideosChange?: (videos: StageVideoSummary[]) => void
}

type StageVideoStatus = 'uploading' | 'analyzing' | 'completed' | 'failed'
type RunningCameraAngle = 'SIDE' | 'FRONT' | 'BACK'

interface StageVideoState {
  status: StageVideoStatus
  analysisId?: string
  error?: string
  cameraAngle?: RunningCameraAngle
  formScore?: number | null
  testId?: string
}

export interface StageVideoSummary {
  stageIndex: number
  stageSequence: number
  status: StageVideoStatus
  analysisId?: string
  cameraAngle?: RunningCameraAngle
  speed?: number
  formScore?: number | null
  testId?: string
  error?: string
}

interface TestSubmitResult {
  testId: string
}

const CAMERA_ANGLE_OPTIONS: Array<{
  value: RunningCameraAngle
  labelSv: string
  labelEn: string
  descriptionSv: string
  descriptionEn: string
}> = [
  {
    value: 'SIDE',
    labelSv: 'Sida',
    labelEn: 'Side',
    descriptionSv: 'Fotisättning, lutning, steglängd',
    descriptionEn: 'Foot strike, lean, stride length',
  },
  {
    value: 'FRONT',
    labelSv: 'Fram',
    labelEn: 'Front',
    descriptionSv: 'Knäspårning, armsving, symmetri',
    descriptionEn: 'Knee tracking, arm swing, symmetry',
  },
  {
    value: 'BACK',
    labelSv: 'Bak',
    labelEn: 'Back',
    descriptionSv: 'Höftfall, hälpiska, sidobalans',
    descriptionEn: 'Hip drop, heel whip, lateral balance',
  },
]

export function TestDataForm({
  testType,
  onSubmit,
  clientId,
  videoAnalysisBasePath,
  onStageVideosChange,
}: TestDataFormProps) {
  const locale = useLocale()
  const t = useCallback((sv: string, en: string) => locale === 'sv' ? sv : en, [locale])
  const { toast } = useToast()
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
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

  const inclineUnit = useWatch({ control, name: 'inclineUnit' }) || 'PERCENT'
  const inclineLabel = inclineUnit === 'DEGREES' ? t('Lutning (°)', 'Incline (°)') : t('Lutning (%)', 'Incline (%)')
  const stageLabelClassName = 'text-xs text-foreground dark:text-slate-100'
  const stageInputClassName = 'text-foreground placeholder:text-muted-foreground dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:[color-scheme:dark]'

  const watchedStages = useWatch({ control, name: 'stages' })
  const lactateWarnings = detectLactateDecreases(watchedStages || [])

  const [templates, setTemplates] = useState<TestTemplate[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [ocrLoading, setOcrLoading] = useState<number | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showMetabolicData, setShowMetabolicData] = useState(false)
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const recordingPreviewRef = useRef<HTMLVideoElement | null>(null)
  const videoFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})
  const [recordingStageIndex, setRecordingStageIndex] = useState<number | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [stageVideoStates, setStageVideoStates] = useState<Record<number, StageVideoState>>({})
  const [runningCameraAngle, setRunningCameraAngle] = useState<RunningCameraAngle>('SIDE')
  const runningCameraAngleRef = useRef<RunningCameraAngle>('SIDE')

  useEffect(() => {
    runningCameraAngleRef.current = runningCameraAngle
  }, [runningCameraAngle])

  useEffect(() => {
    if (!onStageVideosChange) return
    const stages = getValues('stages')
    const videos = Object.entries(stageVideoStates)
      .map(([stageIndex, state]) => {
        const numericStageIndex = Number(stageIndex)
        return {
          stageIndex: numericStageIndex,
          stageSequence: numericStageIndex + 1,
          status: state.status,
          analysisId: state.analysisId,
          cameraAngle: state.cameraAngle,
          speed: stages[numericStageIndex]?.speed,
          formScore: state.formScore,
          testId: state.testId,
          error: state.error,
        } satisfies StageVideoSummary
      })
      .sort((a, b) => a.stageIndex - b.stageIndex)
    onStageVideosChange(videos)
  }, [getValues, onStageVideosChange, stageVideoStates])

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
    } catch (_error) {
      toast({
        title: t('Fel', 'Error'),
        description: t('Kunde inte ansluta till OCR-tjänsten', 'Could not connect to the OCR service'),
        variant: 'destructive',
      })
    } finally {
      setOcrLoading(null)
    }
  }

  const getRecordingMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return ''
    const supportedTypes = [
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    return supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || ''
  }

  const stopRecordingStream = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    recordingStreamRef.current = null
    if (recordingPreviewRef.current) {
      recordingPreviewRef.current.srcObject = null
    }
  }, [])

  const uploadAndAnalyzeStageVideo = useCallback(async (stageIndex: number, video: Blob | File, recordedMimeType: string) => {
    if (!clientId) return

    const cameraAngle = runningCameraAngleRef.current
    const uploadMimeType = (recordedMimeType || video.type || 'video/webm').split(';')[0]
    const extension = uploadMimeType.includes('mp4')
      ? 'mp4'
      : uploadMimeType.includes('quicktime')
        ? 'mov'
        : 'webm'
    const stages = getValues('stages')
    const stage = stages[stageIndex]
    const speed = stage?.speed
    const safeSpeed = typeof speed === 'number' ? `${speed.toString().replace('.', '-')}kmh` : 'speed'
    const file = video instanceof File
      ? video
      : new File([video], `running-stage-${stageIndex + 1}-${safeSpeed}.${extension}`, {
          type: uploadMimeType,
        })

    setStageVideoStates((prev) => ({
      ...prev,
      [stageIndex]: { status: 'uploading', cameraAngle },
    }))

    try {
      const urlResponse = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-upload-url',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          videoType: 'RUNNING_GAIT',
          cameraAngle,
          athleteId: clientId,
        }),
      })

      const urlData = await urlResponse.json()
      if (!urlResponse.ok) {
        throw new Error(urlData.error || t('Kunde inte skapa uppladdning', 'Could not prepare upload'))
      }

      const uploadResponse = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': urlData.contentType },
        body: file,
      })

      if (!uploadResponse.ok) {
        const uploadErrorText = await uploadResponse.text().catch(() => '')
        throw new Error(uploadErrorText || t('Videouppladdning misslyckades', 'Video upload failed'))
      }

      const confirmResponse = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-upload',
          uploadPath: urlData.path,
          videoType: 'RUNNING_GAIT',
          cameraAngle,
          athleteId: clientId,
          sourceContext: {
            testType,
            captureFlow: 'test_stage_video',
            testDate: getValues('testDate'),
            stageSequence: stageIndex + 1,
            cameraAngle,
            speed,
            incline: stage?.incline,
            heartRate: stage?.heartRate,
            lactate: stage?.lactate,
            vo2: stage?.vo2,
          },
        }),
      })

      const confirmData = await confirmResponse.json()
      if (!confirmResponse.ok) {
        throw new Error(confirmData.error || t('Kunde inte spara videoanalysen', 'Could not save video analysis'))
      }

      const analysisId = confirmData.analysis?.id as string | undefined
      if (!analysisId) {
        throw new Error(t('Video sparades utan analys-id', 'Video was saved without an analysis id'))
      }

      setStageVideoStates((prev) => ({
        ...prev,
        [stageIndex]: { status: 'analyzing', analysisId, cameraAngle },
      }))

      const analyzeResponse = await fetch(`/api/video-analysis/${analysisId}/analyze`, {
        method: 'POST',
      })
      const analyzeData = await analyzeResponse.json().catch(() => null)
      if (!analyzeResponse.ok) {
        throw new Error(analyzeData?.error || t('Gemini-analysen misslyckades', 'Gemini analysis failed'))
      }

      setStageVideoStates((prev) => ({
        ...prev,
        [stageIndex]: {
          status: 'completed',
          analysisId,
          cameraAngle,
          formScore: typeof analyzeData?.result?.formScore === 'number' ? analyzeData.result.formScore : null,
        },
      }))
      toast({
        title: t('Löpvideo analyserad', 'Running video analyzed'),
        description: t('Videon har sparats på atletens profil.', 'The video has been saved to the athlete profile.'),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Okänt fel', 'Unknown error')
      setStageVideoStates((prev) => ({
        ...prev,
        [stageIndex]: { status: 'failed', error: message, cameraAngle },
      }))
      toast({
        title: t('Video kunde inte analyseras', 'Video could not be analyzed'),
        description: message,
        variant: 'destructive',
      })
    }
  }, [clientId, getValues, t, testType, toast])

  const linkStageVideosToTest = useCallback(async (testId: string) => {
    const entries = Object.entries(stageVideoStates)
      .map(([stageIndex, state]) => ({ stageIndex: Number(stageIndex), state }))
      .filter(({ state }) => state.analysisId && state.status !== 'failed')

    if (entries.length === 0) return

    await Promise.all(entries.map(async ({ stageIndex, state }) => {
      const response = await fetch(`/api/video-analysis/${state.analysisId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceContext: {
            testId,
            stageSequence: stageIndex + 1,
            linkedAt: new Date().toISOString(),
          },
        }),
      })
      if (!response.ok) return
      setStageVideoStates((prev) => ({
        ...prev,
        [stageIndex]: {
          ...prev[stageIndex],
          testId,
        },
      }))
    }))
  }, [stageVideoStates])

  const startStageVideoRecording = async (stageIndex: number) => {
    if (testType !== 'RUNNING') return
    if (!clientId) {
      toast({
        title: t('Välj atlet först', 'Select athlete first'),
        description: t('Videon behöver kopplas till en atletprofil.', 'The video needs to be linked to an athlete profile.'),
        variant: 'destructive',
      })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast({
        title: t('Öppnar videoinspelning', 'Opening video recording'),
        description: t('Direktkamera stöds inte här, så vi använder en vanlig videouppladdning.', 'Direct camera is not supported here, so we are using a normal video upload.'),
      })
      videoFileInputRefs.current[stageIndex]?.click()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      const mimeType = getRecordingMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      recordedChunksRef.current = []
      recordingStreamRef.current = stream
      mediaRecorderRef.current = recorder
      setRecordingStageIndex(stageIndex)
      setRecordingSeconds(0)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const chunks = recordedChunksRef.current
        recordedChunksRef.current = []
        mediaRecorderRef.current = null
        stopRecordingStream()
        setRecordingStageIndex(null)
        setRecordingSeconds(0)

        const blobType = mimeType || 'video/webm'
        const blob = new Blob(chunks, { type: blobType })
        if (blob.size > 0) {
          void uploadAndAnalyzeStageVideo(stageIndex, blob, blobType)
        }
      }

      recorder.start()
    } catch (_error) {
      stopRecordingStream()
      setRecordingStageIndex(null)
      videoFileInputRefs.current[stageIndex]?.click()
      toast({
        title: t('Kamerabehörighet saknas', 'Camera permission is missing'),
        description: t('Vi öppnar videoväljaren istället. Tillåt kamera för webbplatsen om du vill spela in direkt i formuläret.', 'We are opening the video picker instead. Allow camera for the site if you want to record directly in the form.'),
      })
    }
  }

  const stopStageVideoRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  useEffect(() => {
    if (recordingPreviewRef.current && recordingStreamRef.current) {
      recordingPreviewRef.current.srcObject = recordingStreamRef.current
    }
  }, [recordingStageIndex])

  useEffect(() => {
    if (recordingStageIndex === null) return
    const interval = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [recordingStageIndex])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      } else {
        stopRecordingStream()
      }
    }
  }, [stopRecordingStream])

  const handleSmartImport = useCallback((data: TestImportResult) => {
    if (data.stages.length > 0) {
      replace(data.stages as CreateTestFormData['stages'])
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
    void fetchTemplates()
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
        void fetchTemplates()
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
    replace(template.stages as unknown as CreateTestFormData['stages'])
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
      const result = await onSubmit(data)
      if (result?.testId) {
        await linkStageVideosToTest(result.testId)
      }
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
        <p className="text-xs text-muted-foreground">{t('Laktatvärde före testet (valfritt)', 'Lactate value before the test (optional)')}</p>
      </div>

      {/* Incline Unit Selector (only for running tests) */}
      {testType === 'RUNNING' && (
        <div className="space-y-2">
          <Label htmlFor="inclineUnit">{t('Lutningsenhet', 'Incline unit')}</Label>
          <select
            id="inclineUnit"
            {...register('inclineUnit')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="PERCENT">{t('Procent (%)', 'Percent (%)')}</option>
            <option value="DEGREES">{t('Grader (°)', 'Degrees (°)')}</option>
          </select>
          <p className="text-xs text-muted-foreground">
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
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800/60 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          <AlertTitle className="font-semibold text-blue-900 dark:text-blue-100">
            {t('Krav för D-max laktattröskelberäkning', 'Requirements for D-max lactate threshold calculation')}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2 text-sm text-blue-800 dark:text-blue-200">
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
              <li className="text-xs text-blue-700 dark:text-blue-300">
                <strong>{t('VO₂ är valfritt', 'VO₂ is optional')}</strong> - {t('trösklar kan beräknas utan VO₂-mätning', 'thresholds can be calculated without VO₂ measurement')}
              </li>
            </ul>
            <div className="mt-3 border-t border-blue-200 pt-2 dark:border-blue-800/60">
              <p className="font-medium mb-1">{t('Konfidensgrad baseras på:', 'Confidence level is based on:')}</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                <li>{t('Hög konfidens: R² ≥ 0.95 och tröskel 2-4 mmol/L', 'High confidence: R² ≥ 0.95 and threshold 2-4 mmol/L')}</li>
                <li>{t('Medel konfidens: R² ≥ 0.90 eller tröskel 1.5-4.5 mmol/L', 'Medium confidence: R² ≥ 0.90 or threshold 1.5-4.5 mmol/L')}</li>
                <li>{t('Låg konfidens: R² < 0.90 - faller tillbaka på 4.0 mmol/L-metoden', 'Low confidence: R² < 0.90 - falls back to the 4.0 mmol/L method')}</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMetabolicData(!showMetabolicData)}
            className="gap-2 self-start"
          >
            <Activity className="w-4 h-4" />
            {t('Metabol data (spirometri)', 'Metabolic data (spirometry)')}
            {showMetabolicData ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>

          {testType === 'RUNNING' && (
            <div className="space-y-1">
              <Label className="text-xs">{t('Kameravinkel för löpvideo', 'Camera angle for running video')}</Label>
              <div className="grid grid-cols-3 gap-1 rounded-md border bg-muted/30 p-1">
                {CAMERA_ANGLE_OPTIONS.map((angle) => (
                  <button
                    key={angle.value}
                    type="button"
                    onClick={() => setRunningCameraAngle(angle.value)}
                    className={`rounded px-3 py-2 text-left text-xs transition-colors ${
                      runningCameraAngle === angle.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="block font-medium">{t(angle.labelSv, angle.labelEn)}</span>
                    <span className="hidden text-[11px] sm:block">{t(angle.descriptionSv, angle.descriptionEn)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
                      <Label htmlFor={`stages.${index}.speed`} className={stageLabelClassName}>
                        {t('Hastighet (km/h)', 'Speed (km/h)')}
                      </Label>
                      <div className="flex gap-1">
                        <Input
                          id={`stages.${index}.speed`}
                          type="number"
                          step="0.1"
                          className={cn('flex-1', stageInputClassName)}
                          {...register(`stages.${index}.speed`, { valueAsNumber: true })}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900"
                          onClick={() => void startStageVideoRecording(index)}
                          disabled={recordingStageIndex !== null || stageVideoStates[index]?.status === 'uploading' || stageVideoStates[index]?.status === 'analyzing'}
                          title={t('Filma löpteknik vid denna hastighet', 'Record running technique at this speed')}
                        >
                          {stageVideoStates[index]?.status === 'uploading' || stageVideoStates[index]?.status === 'analyzing' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : stageVideoStates[index]?.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Video className="h-4 w-4" />
                          )}
                        </Button>
                        <input
                          type="file"
                          accept="video/*"
                          capture="environment"
                          className="hidden"
                          ref={(el) => { videoFileInputRefs.current[index] = el }}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void uploadAndAnalyzeStageVideo(index, file, file.type)
                            event.target.value = ''
                          }}
                        />
                      </div>
                      {stageVideoStates[index] && (
                        <div className={`text-xs ${stageVideoStates[index].status === 'failed' ? 'text-red-600' : 'text-muted-foreground'}`}>
                          <p>
                            {stageVideoStates[index].status === 'uploading' && t('Sparar video...', 'Saving video...')}
                            {stageVideoStates[index].status === 'analyzing' && t('Gemini analyserar...', 'Gemini is analyzing...')}
                            {stageVideoStates[index].status === 'completed' && (
                              <>
                                {stageVideoStates[index].formScore != null
                                  ? t(`Video klar (${stageVideoStates[index].formScore}/100)`, `Video done (${stageVideoStates[index].formScore}/100)`)
                                  : t('Video sparad på atletprofilen', 'Video saved to athlete profile')}
                              </>
                            )}
                            {stageVideoStates[index].status === 'failed' && (stageVideoStates[index].error || t('Video misslyckades', 'Video failed'))}
                          </p>
                          {stageVideoStates[index].analysisId && videoAnalysisBasePath && (
                            <a
                              href={`${videoAnalysisBasePath}?analysisId=${stageVideoStates[index].analysisId}`}
                              className="mt-1 inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              {t('Visa analys', 'View analysis')}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.incline`} className={stageLabelClassName}>
                        {inclineLabel}
                      </Label>
                      <Input
                        id={`stages.${index}.incline`}
                        type="number"
                        step="0.5"
                        className={stageInputClassName}
                        {...register(`stages.${index}.incline`, { valueAsNumber: true })}
                      />
                    </div>
                  </>
                ) : testType === 'CYCLING' ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.power`} className={stageLabelClassName}>
                        {t('Effekt (watt)', 'Power (watts)')}
                      </Label>
                      <Input
                        id={`stages.${index}.power`}
                        type="number"
                        className={stageInputClassName}
                        {...register(`stages.${index}.power`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.cadence`} className={stageLabelClassName}>
                        {t('Kadens (rpm)', 'Cadence (rpm)')}
                      </Label>
                      <Input
                        id={`stages.${index}.cadence`}
                        type="number"
                        className={stageInputClassName}
                        {...register(`stages.${index}.cadence`, { valueAsNumber: true })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.pace`} className={stageLabelClassName}>
                      {t('Tempo (min/km)', 'Pace (min/km)')}
                    </Label>
                    <Input
                      id={`stages.${index}.pace`}
                      type="number"
                      step="0.1"
                      className={stageInputClassName}
                      {...register(`stages.${index}.pace`, { valueAsNumber: true })}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.heartRate`} className={stageLabelClassName}>
                    {t('Puls (slag/min)', 'Heart rate (beats/min)')}
                  </Label>
                  <Input
                    id={`stages.${index}.heartRate`}
                    type="number"
                    className={stageInputClassName}
                    {...register(`stages.${index}.heartRate`, { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.lactate`} className={stageLabelClassName}>
                    {t('Laktat (mmol/L)', 'Lactate (mmol/L)')}
                  </Label>
                  <div className="flex gap-1">
                    <Input
                      id={`stages.${index}.lactate`}
                      type="number"
                      step="0.1"
                      className={cn('flex-1', stageInputClassName)}
                      {...register(`stages.${index}.lactate`, { valueAsNumber: true })}
                    />
                    {testType !== 'RUNNING' && (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[index] = el }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) void handleLactateOCR(index, file)
                            e.target.value = ''
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900"
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
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.vo2`} className={stageLabelClassName}>
                    VO₂ (ml/kg/min) <span className="font-normal text-muted-foreground">{t('(valfritt)', '(optional)')}</span>
                  </Label>
                  <Input
                    id={`stages.${index}.vo2`}
                    type="number"
                    step="0.1"
                    placeholder={t('Valfritt', 'Optional')}
                    className={stageInputClassName}
                    {...register(`stages.${index}.vo2`, { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className={stageLabelClassName}>{t('Tid (min:sek)', 'Time (min:sec)')}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id={`stages.${index}.durationMinutes`}
                      type="number"
                      min="0"
                      max="60"
                      className={cn('w-16 text-center', stageInputClassName)}
                      placeholder="min"
                      {...register(`stages.${index}.durationMinutes`, { valueAsNumber: true })}
                    />
                    <span className="font-medium text-muted-foreground dark:text-slate-300">:</span>
                    <Input
                      id={`stages.${index}.durationSeconds`}
                      type="number"
                      min="0"
                      max="59"
                      className={cn('w-16 text-center', stageInputClassName)}
                      placeholder={t('sek', 'sec')}
                      {...register(`stages.${index}.durationSeconds`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Metabol data (collapsible) */}
              {showMetabolicData && (
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-dashed pt-3 dark:border-slate-700 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.rer`} className={stageLabelClassName}>
                      RER
                    </Label>
                    <Input
                      id={`stages.${index}.rer`}
                      type="number"
                      step="0.01"
                      placeholder="0.85"
                      className={stageInputClassName}
                      {...register(`stages.${index}.rer`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.ve`} className={stageLabelClassName}>
                      VE (L/min)
                    </Label>
                    <Input
                      id={`stages.${index}.ve`}
                      type="number"
                      step="0.1"
                      placeholder=""
                      className={stageInputClassName}
                      {...register(`stages.${index}.ve`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.vco2`} className={stageLabelClassName}>
                      VCO₂ (ml/min)
                    </Label>
                    <Input
                      id={`stages.${index}.vco2`}
                      type="number"
                      step="1"
                      placeholder=""
                      className={stageInputClassName}
                      {...register(`stages.${index}.vco2`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.fatPercent`} className={stageLabelClassName}>
                      {t('Fett (%)', 'Fat (%)')}
                    </Label>
                    <Input
                      id={`stages.${index}.fatPercent`}
                      type="number"
                      step="0.1"
                      placeholder=""
                      className={stageInputClassName}
                      {...register(`stages.${index}.fatPercent`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.choPercent`} className={stageLabelClassName}>
                      {t('Kolhydrat (%)', 'Carbohydrate (%)')}
                    </Label>
                    <Input
                      id={`stages.${index}.choPercent`}
                      type="number"
                      step="0.1"
                      placeholder=""
                      className={stageInputClassName}
                      {...register(`stages.${index}.choPercent`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.respiratoryRate`} className={stageLabelClassName}>
                      {t('Andningsfrekvens', 'Respiratory rate')}
                    </Label>
                    <Input
                      id={`stages.${index}.respiratoryRate`}
                      type="number"
                      step="0.1"
                      placeholder=""
                      className={stageInputClassName}
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
          <Alert className="border-yellow-300 bg-yellow-50 dark:border-yellow-800/60 dark:bg-yellow-950/30">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-300" />
            <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
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
            <Card key={field.id} className="border-orange-200 bg-orange-50/50 dark:border-orange-800/60 dark:bg-orange-950/20">
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
                    <Label className="text-xs whitespace-nowrap">{t('Laktat:', 'Lactate:')}</Label>
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
        <p className="text-xs text-muted-foreground">
          {t('Föreslå ett datum för nästa laktattest (valfritt)', 'Suggest a date for the next lactate test (optional)')}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('Anteckningar', 'Notes')}</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
        disabled={recordingStageIndex !== null}
      >
        {t('Generera Rapport', 'Generate Report')}
      </Button>

      {/* Running Video Recording Dialog */}
      <Dialog
        open={recordingStageIndex !== null}
        onOpenChange={(open) => {
          if (!open) stopStageVideoRecording()
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {recordingStageIndex !== null
                ? t(`Filmar steg ${recordingStageIndex + 1}`, `Recording stage ${recordingStageIndex + 1}`)
                : t('Filmar löpteknik', 'Recording running technique')}
            </DialogTitle>
            <DialogDescription>
              {t('Filma 8-15 sekunder från vald vinkel. Videon sparas automatiskt på atletprofilen och skickas till Gemini.', 'Record 8-15 seconds from the selected angle. The video is saved to the athlete profile and sent to Gemini automatically.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg bg-black aspect-video">
              <video
                ref={recordingPreviewRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {recordingStageIndex !== null && (() => {
                  const stage = getValues('stages')[recordingStageIndex]
                  return stage?.speed
                    ? t(`Hastighet: ${stage.speed} km/h`, `Speed: ${stage.speed} km/h`)
                    : t('Hastighet saknas', 'Speed missing')
                })()}
              </span>
              <span>{recordingSeconds}s</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {CAMERA_ANGLE_OPTIONS.map((angle) => (
                <span
                  key={angle.value}
                  className={`rounded-full border px-2 py-1 ${
                    runningCameraAngle === angle.value
                      ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-muted text-muted-foreground'
                  }`}
                >
                  {t(angle.labelSv, angle.labelEn)}
                </span>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={stopStageVideoRecording}>
              <Square className="h-4 w-4 mr-2" />
              {t('Stoppa och analysera', 'Stop and analyze')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
