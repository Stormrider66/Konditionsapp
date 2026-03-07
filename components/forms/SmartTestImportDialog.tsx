'use client'

import { useState, useRef, useCallback } from 'react'
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
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<TestImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const audioFileInputRef = useRef<HTMLInputElement | null>(null)

  const recorder = useAudioRecorder()

  const resetState = useCallback(() => {
    setResult(null)
    setError(null)
    setPreviewUrl(null)
    setFileName(null)
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetState()
      onOpenChange(open)
    },
    [onOpenChange, resetState]
  )

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true)
      setError(null)
      setResult(null)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('testType', testType)
        if (clientId) formData.append('clientId', clientId)

        const response = await fetch('/api/ai/test-import', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Kunde inte bearbeta filen')
          return
        }

        if (data.success && data.result) {
          setResult(data.result)
        } else {
          setError(data.error || 'Ingen data kunde extraheras')
        }
      } catch {
        setError('Kunde inte ansluta till servern')
      } finally {
        setIsProcessing(false)
      }
    },
    [testType, clientId]
  )

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      resetState()
      setPreviewUrl(URL.createObjectURL(file))
      processFile(file)
      e.target.value = ''
    },
    [processFile, resetState]
  )

  const handleDocSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      resetState()
      setFileName(file.name)
      processFile(file)
      e.target.value = ''
    },
    [processFile, resetState]
  )

  const handleAudioFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      resetState()
      setFileName(file.name)
      processFile(file)
      e.target.value = ''
    },
    [processFile, resetState]
  )

  const handleStartRecording = useCallback(async () => {
    resetState()
    try {
      const blob = await recorder.startRecording()
      const file = new File([blob], 'recording.webm', { type: blob.type })
      setFileName(`Inspelning (${formatDuration(recorder.duration)}s)`)
      processFile(file)
    } catch {
      // Error handled by recorder hook
    }
  }, [recorder, processFile, resetState])

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
          <DialogTitle>Smart Testimport</DialogTitle>
          <DialogDescription>
            Importera testdata från foto, dokument eller ljudinspelning
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="photo" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="photo" disabled={isProcessing}>
              <Camera className="w-4 h-4 mr-1.5" />
              Foto
            </TabsTrigger>
            <TabsTrigger value="document" disabled={isProcessing}>
              <FileText className="w-4 h-4 mr-1.5" />
              Dokument
            </TabsTrigger>
            <TabsTrigger value="audio" disabled={isProcessing}>
              <Mic className="w-4 h-4 mr-1.5" />
              Ljud
            </TabsTrigger>
          </TabsList>

          {/* Photo tab */}
          <TabsContent value="photo" className="space-y-3">
            <input
              type="file"
              accept="image/*"
              capture="environment"
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
                  Fotografera eller välj bild
                </span>
                <span className="text-xs text-muted-foreground">
                  Utskrifter, handskrivna tabeller, skärmfoton
                </span>
              </div>
            </Button>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Förhandsvisning"
                className="w-full max-h-40 object-contain rounded border"
              />
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
                  Välj PDF eller CSV
                </span>
                <span className="text-xs text-muted-foreground">
                  Cosmed-rapport, Kvark-export, CSV-fil
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
                          Spelar in... {formatDuration(recorder.duration)}
                        </span>
                        <span className="text-xs opacity-80">
                          Tryck för att stoppa (max 60s)
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Diktera testresultat
                        </span>
                        <span className="text-xs text-muted-foreground">
                          &quot;Steg 1, hastighet 8, puls 120, laktat 1.2&quot;
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
                      eller
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
                  Ladda upp ljudfil
                </Button>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  Ljudinspelning stöds inte i denna webbläsare. Ladda upp en
                  ljudfil istället.
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
              Extraherar testdata med AI...
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
                  {result.stages.length} steg extraherade
                </span>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${confidenceColor}`}>
                {Math.round(result.confidence * 100)}% säkerhet
              </span>
            </div>

            {result.detectedEquipment && (
              <p className="text-xs text-muted-foreground">
                Utrustning: {result.detectedEquipment}
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
              Fyll i formuläret
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
