'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, FileText, Mic, Loader2, Upload, CheckCircle, AlertTriangle, Square } from 'lucide-react'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import type { TestType } from '@/types'
import type { TestImportResult } from '@/lib/validations/test-import-schema'
import { useTranslations } from '@/i18n/client'

interface SmartTestImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  testType: TestType
  clientId?: string
  onImport: (data: TestImportResult) => void
}

export function SmartTestImportDialog({
  open,
  onOpenChange,
  testType,
  clientId,
  onImport,
}: SmartTestImportDialogProps) {
  const t = useTranslations('components.smartTestImportDialog')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<TestImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const audioFileInputRef = useRef<HTMLInputElement | null>(null)

  const recorder = useAudioRecorder()

  const resetState = useCallback(() => {
    setResult(null)
    setError(null)
    setPreviewUrls([])
    setFileName(null)
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetState()
      onOpenChange(open)
    },
    [onOpenChange, resetState]
  )

  const resizeImageIfNeeded = useCallback(async (file: File, maxDim = 2048, quality = 0.85): Promise<File> => {
    if (!file.type.startsWith('image/')) return file

    // Always resize images through canvas to ensure consistent size
    return new Promise((resolve) => {
      const img = document.createElement('img')
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const processFiles = useCallback(
    async (files: File[]) => {
      setIsProcessing(true)
      setError(null)
      setResult(null)

      try {
        // Keep small text on Cosmed/Jaeger printouts legible — 2048px/0.85
        // fits 3 photos under the body limit (~700KB-1MB each after resize).
        const processed = await Promise.all(
          files.map((f) => resizeImageIfNeeded(f, 2048, 0.85))
        )

        const formData = new FormData()
        if (processed.length === 1) {
          formData.append('file', processed[0])
        } else {
          for (const f of processed) formData.append('files', f)
        }
        formData.append('testType', testType)
        if (clientId) formData.append('clientId', clientId)

        const response = await fetch('/api/ai/test-import', {
          method: 'POST',
          body: formData,
        })

        let data
        try {
          data = await response.json()
        } catch {
          throw new Error(
            response.status === 413
              ? t('errors.tooLarge')
              : t('errors.parseError', { status: response.status })
          )
        }

        if (!response.ok) throw new Error(data.error || t('errors.processingFailed'))
        if (data.success && data.result) {
          setResult(data.result as TestImportResult)
        } else {
          throw new Error(data.error || t('errors.noDataExtracted'))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.network'))
      } finally {
        setIsProcessing(false)
      }
    },
    [testType, clientId, resizeImageIfNeeded, t]
  )

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return
      resetState()
      setPreviewUrls(files.map(f => URL.createObjectURL(f)))
      void processFiles(files)
      e.target.value = ''
    },
    [processFiles, resetState]
  )

  const handleDocSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      resetState()
      setFileName(file.name)
      void processFiles([file])
      e.target.value = ''
    },
    [processFiles, resetState]
  )

  const handleAudioFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      resetState()
      setFileName(file.name)
      void processFiles([file])
      e.target.value = ''
    },
    [processFiles, resetState]
  )

  const handleStartRecording = useCallback(async () => {
    resetState()
    try {
      const blob = await recorder.startRecording()
      const file = new File([blob], 'recording.webm', { type: blob.type })
      setFileName(t('audio.recordingLabel', { duration: formatDuration(recorder.duration) }))
      void processFiles([file])
    } catch {
      // Error handled by recorder hook
    }
  }, [recorder, processFiles, resetState, t])

  const handleApply = useCallback(() => {
    if (result) {
      onImport(result)
      handleOpenChange(false)
    }
  }, [result, onImport, handleOpenChange])

  const confidenceColor =
    result && result.confidence >= 0.8
      ? 'bg-green-100 text-green-800'
      : result && result.confidence >= 0.5
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="photo" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="photo" disabled={isProcessing}>
              <Camera className="w-4 h-4 mr-1.5" />
              {t('tabs.photo')}
            </TabsTrigger>
            <TabsTrigger value="document" disabled={isProcessing}>
              <FileText className="w-4 h-4 mr-1.5" />
              {t('tabs.document')}
            </TabsTrigger>
            <TabsTrigger value="audio" disabled={isProcessing}>
              <Mic className="w-4 h-4 mr-1.5" />
              {t('tabs.audio')}
            </TabsTrigger>
          </TabsList>

          {/* Photo tab */}
          <TabsContent value="photo" className="space-y-3">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={imageInputRef}
              onChange={handleImageSelect}
            />
            <Button
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => imageInputRef.current?.click()}
              disabled={isProcessing}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('photo.primaryAction')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('photo.multiSelectHint')}
                </span>
              </div>
            </Button>
            {previewUrls.length > 0 && (
              <div className={`grid gap-2 ${previewUrls.length === 1 ? 'grid-cols-1' : previewUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative h-28 rounded border overflow-hidden">
                    <Image
                      src={url}
                      alt={t('photo.imageAlt', { index: i + 1 })}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
            )}
            {previewUrls.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {t('photo.multiImageSummary', { count: previewUrls.length })}
              </p>
            )}
          </TabsContent>

          {/* Document tab */}
          <TabsContent value="document" className="space-y-3">
            <input
              type="file"
              accept=".pdf,.csv"
              className="hidden"
              ref={docInputRef}
              onChange={handleDocSelect}
            />
            <Button
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => docInputRef.current?.click()}
              disabled={isProcessing}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('document.selectLabel')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('document.supportedFormats')}
                </span>
              </div>
            </Button>
            {fileName && !result && !isProcessing && (
              <p className="text-sm text-muted-foreground truncate">{fileName}</p>
            )}
          </TabsContent>

          {/* Audio tab */}
          <TabsContent value="audio" className="space-y-3">
            {recorder.isSupported ? (
              <div className="space-y-3">
                <Button
                  variant={recorder.isRecording ? 'destructive' : 'outline'}
                  className="w-full h-24"
                  onClick={
                    recorder.isRecording
                      ? recorder.stopRecording
                      : handleStartRecording
                  }
                  disabled={isProcessing}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    {recorder.isRecording ? (
                      <>
                        <Square className="w-6 h-6" />
                        <span className="text-sm">
                          {t('audio.recordingInProgress', { duration: formatDuration(recorder.duration) })}
                        </span>
                        <span className="text-xs opacity-80">
                          {t('audio.stopHint')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {t('audio.transcribeLabel')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t('audio.transcribeHint')}
                        </span>
                      </>
                    )}
                  </div>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('audio.or')}
                    </span>
                  </div>
                </div>

                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  ref={audioFileInputRef}
                  onChange={handleAudioFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => audioFileInputRef.current?.click()}
                  disabled={isProcessing || recorder.isRecording}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  {t('audio.uploadFile')}
                </Button>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  {t('audio.unsupported')}
                </AlertDescription>
              </Alert>
            )}
            {recorder.error && (
              <p className="text-sm text-destructive">{recorder.error}</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Processing spinner */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {t('processing')}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-sm">
                  {t('result.stagesExtracted', { count: result.stages.length })}
                </span>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${confidenceColor}`}>
                {t('result.confidence', { confidence: Math.round(result.confidence * 100) })}
              </span>
            </div>

            {result.detectedEquipment && (
              <p className="text-xs text-muted-foreground">
                {t('result.equipmentLabel')}: {result.detectedEquipment}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {result.sourceDescription}
            </p>

            {result.warnings.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-300">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-xs">
                  <ul className="list-disc list-inside space-y-0.5">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleApply} className="w-full">
              {t('result.apply')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
